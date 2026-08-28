// src\lib\auditLog.ts
export type AuditEvent =
  | "login_success"
  | "login_failed"
  | "login_rate_limited"
  | "professor_pending_login"
  | "professor_rejected_login"
  | "register_success"
  | "seed_denied"
  | "seed_executed"
  | "project_deleted"
  | "application_approved"
  | "application_rejected"
  | "professor_created"
  | "professor_status_changed";

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
