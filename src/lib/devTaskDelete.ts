// Deletes a finished task together with the data that would otherwise bring it back.
//  - ai_task_sources and the task go (FK cascade keeps ai_analysis_runs for cost history).
//  - A source ERROR event is deleted too: the triage job picks up any error seen in the
//    last 7 days that has no task, so without this it would be re-triaged next run.
//    (If the error happens again it is a new event and a new task, which is the right thing.)
//  - A source user REPORT is kept: its status stays 'triaged', so it is never picked again.
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const DELETABLE_STATUSES = ["resolved", "dismissed"] as const;

export type DeleteResult = "deleted" | "not_found" | "not_finished";

export async function deleteFinishedTask(id: number): Promise<DeleteResult> {
  return db.transaction(async (tx) => {
    // FOR UPDATE: a status change racing with the delete cannot slip through.
    const rows = (await tx.execute(sql`SELECT status FROM ai_tasks WHERE id = ${id} FOR UPDATE`)).rows as Array<{ status: string }>;
    if (rows.length === 0) return "not_found";
    if (!(DELETABLE_STATUSES as readonly string[]).includes(rows[0].status)) return "not_finished";
    await tx.execute(sql`
      DELETE FROM error_events
       WHERE id IN (SELECT source_id FROM ai_task_sources WHERE task_id = ${id} AND source_type = 'error')`);
    await tx.execute(sql`DELETE FROM ai_tasks WHERE id = ${id}`);
    return "deleted";
  });
}
