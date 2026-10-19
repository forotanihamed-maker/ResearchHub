import { db } from "@/db";
import { issueReports } from "@/db/schema";
import { sql } from "drizzle-orm";

const REPORT_WINDOW_MS = 60 * 60 * 1000;
const REPORT_MAX_PER_HOUR = 5;

export async function createIssueReportWithRateLimit(input: {
  userId: number;
  pagePath: string;
  description: string;
  category?: string;
}): Promise<
  | { allowed: true; id: number }
  | { allowed: false; retryAfterSeconds: number }
> {
  return db.transaction(async (tx) => {
    // Serialize concurrent report requests for the same user. This closes the
    // race where two simultaneous requests could both observe count < 5.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`issue_reports:${input.userId}`}))`
    );

    const cutoff = new Date(Date.now() - REPORT_WINDOW_MS);
    const result = await tx.execute(sql`
      SELECT count(*)::int AS count
      FROM issue_reports
      WHERE user_id = ${input.userId}
        AND created_at >= ${cutoff}
    `);
    const count = Number(result.rows[0]?.count ?? 0);

    if (count >= REPORT_MAX_PER_HOUR) {
      return {
        allowed: false,
        retryAfterSeconds: REPORT_WINDOW_MS / 1000,
      };
    }

    const [row] = await tx
      .insert(issueReports)
      .values({
        userId: input.userId,
        pagePath: input.pagePath,
        description: input.description,
        category: input.category ?? null,
      })
      .returning({ id: issueReports.id });

    return { allowed: true, id: row.id };
  });
}

const clientErrorHits = new Map<number, number[]>();
const CLIENT_ERROR_WINDOW_MS = 60 * 60 * 1000;
const CLIENT_ERROR_MAX_PER_HOUR = 30;

export function consumeClientErrorRateLimit(userId: number):
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - CLIENT_ERROR_WINDOW_MS;
  const previous = clientErrorHits.get(userId) ?? [];
  const recent = previous.filter((time) => time >= cutoff);

  if (recent.length >= CLIENT_ERROR_MAX_PER_HOUR) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + CLIENT_ERROR_WINDOW_MS - now) / 1000)),
    };
  }

  recent.push(now);
  clientErrorHits.set(userId, recent);
  return { allowed: true };
}

export function resetClientErrorRateLimitForTests(): void {
  clientErrorHits.clear();
}
