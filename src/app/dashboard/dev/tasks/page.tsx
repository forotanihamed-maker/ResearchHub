// src/app/dashboard/dev/tasks/page.tsx
// The page itself re-checks access (a layout alone is not a boundary).
import { requireDevPanelUser } from "@/lib/devAccess";
import { DevTasksClient } from "./DevTasksClient";

export const dynamic = "force-dynamic";

export default async function DevTasksPage() {
  await requireDevPanelUser("dashboard/dev/tasks");
  return <DevTasksClient />;
}
