/**src\app\admin\page.tsx */
// Legacy route — superseded by /dashboard/admin (same treatment as
// /admin/professors below). Kept as a redirect so old bookmarks/links
// still land somewhere useful instead of showing a stale, half-migrated
// dashboard.
import { redirect } from "next/navigation";

export default function LegacyAdminDashboardPage() {
  redirect("/dashboard/admin");
}
