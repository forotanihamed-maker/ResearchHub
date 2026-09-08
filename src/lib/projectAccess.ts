import { db } from "@/db";
import { projectMembers, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getProjectAccess(projectId: number, userId: number) {
  const [project] = await db
    .select({
      id: projects.id,
      creatorId: projects.creatorId,
      creatorRole: projects.creatorRole,
      professorId: projects.professorId,
      status: projects.status,
      visibility: projects.visibility,
      maxMembers: projects.maxMembers,
      inviteToken: projects.inviteToken,
    })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) return { project: null, isOwner: false, isMember: false };

  const isOwner = project.creatorId === userId;
  const [membership] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

  return { project, isOwner, isMember: isOwner || Boolean(membership) };
}
