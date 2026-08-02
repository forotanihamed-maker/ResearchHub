import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectSkills,
  skills,
  users,
  applications,
  projectMembers,
} from "@/db/schema";
import { eq, inArray, desc, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const skillFilter = searchParams.get("skills");
    const search = searchParams.get("search");
    const myProjects = searchParams.get("my");

    // Build where conditions
    const conditions = [];

    if (myProjects === "true" && authUser.role === "professor") {
      conditions.push(eq(projects.professorId, authUser.userId));
    }

    if (status && status !== "all") {
      const validStatuses = ["open", "in_progress", "completed"];
      if (validStatuses.includes(status)) {
        conditions.push(
          eq(
            projects.status,
            status as "open" | "in_progress" | "completed"
          )
        );
      }
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const allProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        professorId: projects.professorId,
        maxMembers: projects.maxMembers,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        professorName: users.name,
        professorDepartment: users.department,
        professorUniversity: users.university,
      })
      .from(projects)
      .innerJoin(users, eq(projects.professorId, users.id))
      .where(whereClause)
      .orderBy(desc(projects.createdAt));

    // Get skills for each project
    const projectIds = allProjects.map((p) => p.id);

    let projectSkillsData: { projectId: number; skillId: number; skillName: string }[] = [];
    if (projectIds.length > 0) {
      projectSkillsData = await db
        .select({
          projectId: projectSkills.projectId,
          skillId: skills.id,
          skillName: skills.name,
        })
        .from(projectSkills)
        .innerJoin(skills, eq(projectSkills.skillId, skills.id))
        .where(inArray(projectSkills.projectId, projectIds));
    }

    // Get member counts
    let memberCounts: { projectId: number; count: number }[] = [];
    if (projectIds.length > 0) {
      const rawCounts = await db
        .select({
          projectId: projectMembers.projectId,
          count: sql<number>`count(*)::int`,
        })
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds))
        .groupBy(projectMembers.projectId);
      memberCounts = rawCounts;
    }

    // Get application counts for professor view
    let appCounts: { projectId: number; count: number }[] = [];
    if (projectIds.length > 0) {
      const rawAppCounts = await db
        .select({
          projectId: applications.projectId,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .where(
          and(
            inArray(applications.projectId, projectIds),
            eq(applications.status, "pending")
          )
        )
        .groupBy(applications.projectId);
      appCounts = rawAppCounts;
    }

    // Assemble projects with skills
    let result = allProjects.map((p) => {
      const pSkills = projectSkillsData
        .filter((ps) => ps.projectId === p.id)
        .map((ps) => ({ id: ps.skillId, name: ps.skillName }));
      const memberCount =
        memberCounts.find((mc) => mc.projectId === p.id)?.count ?? 0;
      const pendingApps =
        appCounts.find((ac) => ac.projectId === p.id)?.count ?? 0;
      return {
        ...p,
        skills: pSkills,
        memberCount,
        pendingApplications: pendingApps,
      };
    });

    // Filter by skill if requested
    if (skillFilter) {
      const skillIds = skillFilter.split(",").map(Number).filter(Boolean);
      if (skillIds.length > 0) {
        result = result.filter((p) =>
          skillIds.some((sid) => p.skills.some((s) => s.id === sid))
        );
      }
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.professorName.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("Projects GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "professor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, maxMembers, deadline, skillIds } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const [project] = await db
      .insert(projects)
      .values({
        title,
        description,
        professorId: authUser.userId,
        maxMembers: maxMembers || 5,
        deadline: deadline ? new Date(deadline) : null,
        status: "open",
      })
      .returning();

    // Add professor as member
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: authUser.userId,
    });

    if (skillIds && skillIds.length > 0) {
      await db.insert(projectSkills).values(
        skillIds.map((sid: number) => ({
          projectId: project.id,
          skillId: sid,
        }))
      );
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Projects POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
