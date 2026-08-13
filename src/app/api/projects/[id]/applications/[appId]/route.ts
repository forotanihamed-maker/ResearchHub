import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, projects, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";

type Params = { params: Promise<{ id: string; appId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, appId } = await params;
    const projectId = Number(id);
    const applicationId = Number(appId);

    if (
      !Number.isInteger(projectId) ||
      projectId <= 0 ||
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid project or application ID" },
        { status: 400 }
      );
    }
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
      if (app.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending applications can be updated" },
          { status: 409 }
        );
      }

      if (status === "approved") {
        await db.transaction(async (tx) => {
          // Lock the project row so concurrent approval requests for the
          // same project serialize instead of racing on the member-count
          // check below (without this, two simultaneous approvals could
          // both read "4 of 5 members" and both insert, overshooting
          // maxMembers).
          const [lockedProject] = await tx
            .select()
            .from(projects)
            .where(eq(projects.id, projectId))
            .for("update");

          const members = await tx
            .select({
              userId: projectMembers.userId,
            })
            .from(projectMembers)
            .where(eq(projectMembers.projectId, projectId));

          const alreadyMember = members.some(
            (member) => member.userId === app.studentId
          );

          if (!alreadyMember && members.length >= lockedProject.maxMembers) {
            throw new Error("PROJECT_FULL");
          }
          await tx
            .update(applications)
            .set({
              status: "approved",
              updatedAt: new Date(),
            })
            .where(eq(applications.id, applicationId));

          const [existingMember] = await tx
            .select()
            .from(projectMembers)
            .where(
              and(
                eq(projectMembers.projectId, projectId),
                eq(projectMembers.userId, app.studentId)
              )
            );

          if (!existingMember) {
            await tx.insert(projectMembers).values({
              projectId,
              userId: app.studentId,
            });
          }

          if (lockedProject.status === "open") {
            await tx
              .update(projects)
              .set({
                status: "in_progress",
                updatedAt: new Date(),
              })
              .where(eq(projects.id, projectId));
          }
        });
        auditLog("application_approved", {
          applicationId,
          projectId,
          studentId: app.studentId,
          professorId: authUser.userId,
        });
      } else {
        await db
          .update(applications)
          .set({
            status: "rejected",
            updatedAt: new Date(),
          })
          .where(eq(applications.id, applicationId));

        auditLog("application_rejected", {
          applicationId,
          projectId,
          studentId: app.studentId,
          professorId: authUser.userId,
        });
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
    if (error instanceof Error && error.message === "PROJECT_FULL") {
      return NextResponse.json({ error: "Project is full" }, { status: 409 });
    }
    console.error("Application PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
