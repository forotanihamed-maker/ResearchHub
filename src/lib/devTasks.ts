// src/lib/devTasks.ts
// Pure helpers for the developer task panel API (no DB access here).
export const TASK_STATUSES = ["open", "in_progress", "resolved", "dismissed"] as const;
export const TASK_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskSeverity = (typeof TASK_SEVERITIES)[number];

export const PAGE_SIZE = 20;

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && (TASK_STATUSES as readonly string[]).includes(v);
}
export function isTaskSeverity(v: unknown): v is TaskSeverity {
  return typeof v === "string" && (TASK_SEVERITIES as readonly string[]).includes(v);
}

export interface TaskListQuery {
  status: TaskStatus | null;
  severity: TaskSeverity | null;
  page: number;
}

/** Unknown filter values are ignored (never passed to SQL); page is clamped to 1..1000. */
export function parseTaskListQuery(params: URLSearchParams): TaskListQuery {
  const status = params.get("status");
  const severity = params.get("severity");
  const rawPage = Number(params.get("page") ?? "1");
  const page = Number.isInteger(rawPage) ? Math.min(Math.max(rawPage, 1), 1000) : 1;
  return {
    status: isTaskStatus(status) ? status : null,
    severity: isTaskSeverity(severity) ? severity : null,
    page,
  };
}
