import { db } from "@/db";
import { aiBudget } from "@/db/schema";
import { sql } from "drizzle-orm";

export const DEFAULT_MONTHLY_CAP_USD = 5;

function configuredCap(): string {
  const value = process.env.AI_MONTHLY_CAP_USD?.trim();
  if (!value) return DEFAULT_MONTHLY_CAP_USD.toFixed(6);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_MONTHLY_CAP_USD.toFixed(6);
  return parsed.toFixed(6);
}

export async function reserveBudget(estimateUsd: string): Promise<{ allowed: boolean; month: string; reservedUsd: string }> {
  const cap = configuredCap();
  const rows = await db.execute(sql`
    INSERT INTO ai_budget (month, monthly_cap_usd, used_usd, kill_switch)
    VALUES (to_char(current_timestamp AT TIME ZONE 'UTC', 'YYYY-MM'), ${cap}, 0, false)
    ON CONFLICT (month) DO NOTHING
  `);
  void rows;

  const result = await db.execute(sql`
    UPDATE ai_budget
    SET used_usd = used_usd + ${estimateUsd}::numeric
    WHERE month = to_char(current_timestamp AT TIME ZONE 'UTC', 'YYYY-MM')
      AND kill_switch = false
      AND used_usd + ${estimateUsd}::numeric <= monthly_cap_usd
    RETURNING month, used_usd - ${estimateUsd}::numeric AS previous_used
  `);
  const row = result.rows[0] as { month?: string } | undefined;
  return row?.month ? { allowed: true, month: row.month, reservedUsd: estimateUsd } : {
    allowed: false,
    month: new Date().toISOString().slice(0, 7),
    reservedUsd: "0.000000",
  };
}

export async function adjustBudget(month: string, reservedUsd: string, actualUsd: string): Promise<void> {
  const delta = (Number(actualUsd) - Number(reservedUsd)).toFixed(6);
  await db.execute(sql`
    UPDATE ai_budget
    SET used_usd = GREATEST(0, used_usd + ${delta}::numeric)
    WHERE month = ${month}
  `);
}

export async function releaseBudget(month: string, reservedUsd: string): Promise<void> {
  await db.execute(sql`
    UPDATE ai_budget
    SET used_usd = GREATEST(0, used_usd - ${reservedUsd}::numeric)
    WHERE month = ${month}
  `);
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): string {
  const peak = isPeakUtc();
  const rates = model === "deepseek-v4-pro"
    ? { input: peak ? 1.32 : 0.66, output: peak ? 3.96 : 1.98 }
    : { input: peak ? 0.30 : 0.15, output: peak ? 1.20 : 0.60 };
  const cost = (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
  return cost.toFixed(6);
}

export function estimateWorstCaseUsd(model: string, inputTokens: number, maxOutputTokens = 2000): string {
  const rates = model === "deepseek-v4-pro" ? { input: 1.32, output: 3.96 } : { input: 0.30, output: 1.20 };
  return ((inputTokens / 1_000_000) * rates.input + (maxOutputTokens / 1_000_000) * rates.output).toFixed(6);
}

function isPeakUtc(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const hour = now.getUTCHours();
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10);
}
