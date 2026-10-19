// src/app/dashboard/dev/layout.tsx
// Server-side shell guard. A layout is NOT a sufficient boundary on its own
// (Next does not re-render layouts on every client navigation), so every
// page under /dashboard/dev must also call requireDevPanelUser() itself.
import { requireDevPanelUser } from "@/lib/devAccess";

export const dynamic = "force-dynamic";

export default async function DevPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDevPanelUser("dashboard/dev/layout");
  return <>{children}</>;
}
