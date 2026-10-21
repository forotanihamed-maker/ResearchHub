// src/lib/ai/budget.ts
//
// Monthly spend control. All month and arithmetic logic lives in SQL so the
// reservation is atomic: two concurrent runs can never overspend the cap.
// The month is UTC 'YYYY-MM'.
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { Env } from "@/lib/ai/provider";

// USD per 1M tokens. Source: api-docs.deepseek.com pricing, checked 2026-10-20.
// Cost is estimated at the highest rate (cache MISS, PEAK hours) on purpose:
// the real bill can only be lower. Unknown models use the pro rates.
const PRICES: Record<string, { input: number; output: number }> = {
  "deepseek-flash": { input: 0.3, output: 1.2 },
  "deepseek-v4-flash": { input: 0.3, output: 1.2 },
  "deepseek-v4-pro": { input: 1.32, output: 3.96 },
  "fake-triage": { input: 0, output: 0 },
  "fake-deep": { input: 0, output: 0 },
};
const FALLBACK = PRICES["deepseek-v4-pro"];

export function costUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  env: Env = process.env
): number {
  const overrideIn = Number(env.AI_PRICE_INPUT_USD_PER_M);
  const overrideOut = Number(env.AI_PRICE_OUTPUT_USD_PER_M);
  const base = PRICES[model] ?? FALLBACK;
  const input = Number.isFinite(overrideIn) && overrideIn > 0 ? overrideIn : base.input;
  const output = Number.isFinite(overrideOut) && overrideOut > 0 ? overrideOut : base.output;
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}

/** Upper-bound token estimate: 1 token per 2 characters is safe for Persian. */
export function estimateInputTokens(...texts: string[]): number {
  return Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 2) + 300;
}

const usd = (n: number) => n.toFixed(6);

export async function ensureBudgetRow(capUsd: number): Promise<void> {
  await db.execute(sql`
    INSERT INTO ai_budget (month, monthly_cap_usd, used_usd, kill_switch)
    VALUES (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM'), ${usd(capUsd)}::numeric, 0, false)
    ON CONFLICT (month) DO NOTHING`);
}

/** Atomically adds `estUsd` to used_usd if it fits under the cap and the kill switch is off. */
export async function reserve(estUsd: number): Promise<boolean> {
  const res = await db.execute(sql`
    UPDATE ai_budget
       SET used_usd = used_usd + ${usd(estUsd)}::numeric
     WHERE month = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')
       AND kill_switch = false
       AND used_usd + ${usd(estUsd)}::numeric <= monthly_cap_usd
    RETURNING id`);
  return res.rows.length === 1;
}

/** Replaces a reservation by the real cost (reservation 0 = refund). */
export async function settle(reservedUsd: number, actualUsd: number): Promise<void> {
  await db.execute(sql`
    UPDATE ai_budget
       SET used_usd = greatest(used_usd - ${usd(reservedUsd)}::numeric + ${usd(actualUsd)}::numeric, 0)
     WHERE month = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')`);
}

export interface BudgetStatus {
  month: string;
  capUsd: number;
  usedUsd: number;
  killSwitch: boolean;
}

export async function getBudgetStatus(): Promise<BudgetStatus | null> {
  const res = await db.execute(sql`
    SELECT month, monthly_cap_usd::float8 AS cap, used_usd::float8 AS used, kill_switch
      FROM ai_budget WHERE month = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')`);
  const row = res.rows[0] as
    | { month: string; cap: number; used: number; kill_switch: boolean }
    | undefined;
  return row
    ? { month: row.month, capUsd: row.cap, usedUsd: row.used, killSwitch: row.kill_switch }
    : null;
}

/** Turns the kill switch on/off for the current month (row is created if missing). */
export async function setKillSwitch(on: boolean, capUsdIfNew: number): Promise<void> {
  await ensureBudgetRow(capUsdIfNew);
  await db.execute(sql`
    UPDATE ai_budget SET kill_switch = ${on}
     WHERE month = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')`);
}
