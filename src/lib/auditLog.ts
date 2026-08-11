/**
 * Lightweight audit logging.
 *
 * This writes a single structured JSON line to stdout for each
 * security-relevant event. On Vercel, stdout from serverless functions
 * is automatically captured and searchable in the project's Logs /
 * Observability dashboard — so this gives you a real, queryable audit
 * trail without standing up a separate logging service or DB table.
 *
 * ⚠️ Honest limitation: this is NOT a tamper-proof or long-term-retained
 * audit log — it's only as durable as your log retention settings on
 * whatever platform you deploy to. For a pilot, that's a reasonable
 * trade-off. If/when this needs to be a compliance-grade audit trail,
 * these events should be written to a dedicated `audit_logs` table
 * instead.
 */

export type AuditEvent =
  | "login_success"
  | "login_failed"
  | "login_rate_limited"
  | "register_success"
  | "seed_denied"
  | "seed_executed"
  | "project_deleted"
  | "application_approved"
  | "application_rejected";

interface AuditDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export function auditLog(event: AuditEvent, details: AuditDetails = {}): void {
  const entry = {
    type: "audit",
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log(JSON.stringify(entry));
}
