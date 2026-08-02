import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, projects, projectMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; appId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, appId } = await params;
    const projectId = parseInt(id);
    const applicationId = parseInt(appId);
    const body = await req.json();
    const { status } = body;

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));

    if (!app || app.projectId !== projectId) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Professor can approve/reject
    if (authUser.role === "professor") {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.professorId, authUser.userId)
          )
        );

      if (!project) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!["approved", "rejected"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status for professor" },
          { status: 400 }
        );
      }

      await db
        .update(applications)
        .set({ status, updatedAt: new Date() })
        .where(eq(applications.id, applicationId));

      // If approved, add to project members and update project status
      if (status === "approved") {
        // Check if already a member (idempotent)
        const [existingMember] = await db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, app.studentId)
            )
          );

        if (!existingMember) {
          await db.insert(projectMembers).values({
            projectId,
            userId: app.studentId,
          });
        }

        // Update project status to in_progress if it's still open
        if (project.status === "open") {
          await db
            .update(projects)
            .set({ status: "in_progress", updatedAt: new Date() })
            .where(eq(projects.id, projectId));
        }
      }

      return NextResponse.json({ message: "Application updated" });
    }

    // Student can cancel their own pending application
    if (authUser.role === "student" && app.studentId === authUser.userId) {
      if (status !== "cancelled") {
        return NextResponse.json(
          { error: "Students can only cancel applications" },
          { status: 400 }
        );
      }

      if (app.status !== "pending") {
        return NextResponse.json(
          { error: "Can only cancel pending applications" },
          { status: 400 }
        );
      }

      await db
        .update(applications)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(applications.id, applicationId));

      return NextResponse.json({ message: "Application cancelled" });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Application PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
