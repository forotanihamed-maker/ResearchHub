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

    // The window is evaluated by the database, against the same clock that
    // stamps created_at (DEFAULT now() into a timestamp-without-time-zone
    // column => the session's local wall time => localtimestamp). Passing a
    // JavaScript Date would shift the window by any Node/DB time-zone gap.
    const result = await tx.execute(sql`
      SELECT
        count(*)::int AS count,
        ceil(extract(epoch from (
          (array_agg(created_at ORDER BY created_at ASC))[greatest(count(*) - ${REPORT_MAX_PER_HOUR - 1}, 1)]
          + make_interval(secs => ${REPORT_WINDOW_MS / 1000}) - localtimestamp
        )))::int AS retry_after
      FROM issue_reports
      WHERE user_id = ${input.userId}
        AND created_at >= localtimestamp - make_interval(secs => ${REPORT_WINDOW_MS / 1000})
    `);
    const count = Number(result.rows[0]?.count ?? 0);

    if (count >= REPORT_MAX_PER_HOUR) {
      const wait = Number(result.rows[0]?.retry_after ?? REPORT_WINDOW_MS / 1000);
      return {
        allowed: false,
        retryAfterSeconds: Math.min(REPORT_WINDOW_MS / 1000, Math.max(1, wait)),
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
