// src/lib/auditLog.ts

export type AuditEvent =
  | "login_success"
  | "login_failed"
  | "login_rate_limited"
  | "professor_pending_login"
  | "professor_rejected_login"
  | "register_success"
  | "register_rate_limited"
  | "seed_denied"
  | "seed_executed"
  | "project_deleted"
  | "application_approved"
  | "application_rejected"
  | "professor_created"
  | "professor_status_changed"
  | "project_file_uploaded"
  | "project_file_deleted"
  | "password_change_rate_limited"
  | "password_change_failed"
  | "password_changed"
  | "file_upload_rate_limited"
  | "project_create_rate_limited"
  | "application_rate_limited"
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "milestone_created"
  | "milestone_updated"
  | "milestone_deleted"
  | "message_edited"
  | "message_deleted"
  | "dev_panel_access"
  | "dev_panel_denied"
  | "issue_report_rate_limited"
  | "browser_error_rate_limited"
  | "ai_cron_denied"
  | "ai_triage_run"
  | "dev_task_status_changed"
  | "dev_task_deleted"
  | "dev_task_code_analysis"
  | "ai_kill_switch_changed";

interface AuditDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export function auditLog(event: AuditEvent, details: AuditDetails = {}): void {
  console.log(
    JSON.stringify({
      type: "audit",
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  );
}
