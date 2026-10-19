// src/lib/adminScope.ts
//
// Department scope for admins. An admin may only see/manage data belonging to
// the departments assigned to them in the admin_departments table.
//
// A project's department is its CREATOR's department:
//   projects.creator_id -> users.id -> users.department
// (projects has no department column of its own.)
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminDepartments } from "@/db/schema";

/**
 * Departments assigned to the given admin. Same logic the admin routes already
 * use locally. An empty array means "no access to any department": callers
 * must return empty results WITHOUT querying for the scoped data.
 */
export async function getAdminDepartments(adminId: number) {
  const rows = await db
    .select({ department: adminDepartments.department })
    .from(adminDepartments)
    .where(eq(adminDepartments.adminId, adminId));
  return rows.map((row) => row.department);
}
