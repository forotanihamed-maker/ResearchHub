/*src\lib\projectAccess.ts */
import { db } from "@/db";
import { projectMembers, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Shared membership check used by the project files API (ج.۳/ج.۵/ج.۶):
 * a user has access to a project's files if they are either the owning
 * professor, or an approved member.
 */
export async function getProjectAccess(projectId: number, userId: number) {
  const [project] = await db
    .select({
      id: projects.id,
      professorId: projects.professorId,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) return { project: null, isOwner: false, isMember: false };

  const isOwner = project.professorId === userId;

  const [membership] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    );

  return { project, isOwner, isMember: isOwner || Boolean(membership) };
}
