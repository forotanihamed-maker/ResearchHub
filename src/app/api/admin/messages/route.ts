/*src\app\api\admin\mssages\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminDepartments, directMessages, users } from "@/db/schema";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

async function getScope(adminId: number) {
  const rows = await db
    .select({ department: adminDepartments.department })
    .from(adminDepartments)
    .where(eq(adminDepartments.adminId, adminId));
  return rows.map((r) => r.department);
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "professor")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const professorIdParam = searchParams.get("professorId");
  const professorId = professorIdParam ? Number(professorIdParam) : null;

  if (user.role === "admin") {
    const scope = await getScope(user.userId);
    const professors = scope.length
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            department: users.department,
            professorStatus: users.professorStatus,
          })
          .from(users)
          .where(
            and(eq(users.role, "professor"), inArray(users.department, scope))
          )
          .orderBy(asc(users.name))
      : [];
    if (!professorId) return NextResponse.json({ professors, messages: [] });
    const allowed = professors.some((p) => p.id === professorId);
    if (!allowed)
      return NextResponse.json(
        { error: "Professor is outside your department scope" },
        { status: 403 }
      );
    const messages = await db
      .select({
        id: directMessages.id,
        senderId: directMessages.senderId,
        recipientId: directMessages.recipientId,
        content: directMessages.content,
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(
        or(
          and(
            eq(directMessages.senderId, user.userId),
            eq(directMessages.recipientId, professorId)
          ),
          and(
            eq(directMessages.senderId, professorId),
            eq(directMessages.recipientId, user.userId)
          )
        )
      )
      .orderBy(asc(directMessages.createdAt));
    return NextResponse.json({ professors, messages });
  }

  const [professor] = await db
    .select({ department: users.department })
    .from(users)
    .where(eq(users.id, user.userId));
  const admins = professor
    ? await db
        .select({
          id: users.id,
          name: users.name,
          department: adminDepartments.department,
        })
        .from(users)
        .innerJoin(adminDepartments, eq(adminDepartments.adminId, users.id))
        .where(
          and(
            eq(users.role, "admin"),
            eq(adminDepartments.department, professor.department)
          )
        )
    : [];
  const selectedAdminId = professorId;
  const messages = selectedAdminId
    ? await db
        .select({
          id: directMessages.id,
          senderId: directMessages.senderId,
          recipientId: directMessages.recipientId,
          content: directMessages.content,
          createdAt: directMessages.createdAt,
        })
        .from(directMessages)
        .where(
          or(
            and(
              eq(directMessages.senderId, user.userId),
              eq(directMessages.recipientId, selectedAdminId)
            ),
            and(
              eq(directMessages.senderId, selectedAdminId),
              eq(directMessages.recipientId, user.userId)
            )
          )
        )
        .orderBy(asc(directMessages.createdAt))
    : [];
  return NextResponse.json({ admins, messages });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "professor")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const recipientId = Number(body.recipientId);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (
      !Number.isInteger(recipientId) ||
      recipientId <= 0 ||
      !content ||
      content.length > 2000
    )
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });

    const [recipient] = await db
      .select({ id: users.id, role: users.role, department: users.department })
      .from(users)
      .where(eq(users.id, recipientId));
    if (!recipient)
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );

    if (user.role === "admin") {
      const scope = await getScope(user.userId);
      if (
        recipient.role !== "professor" ||
        !scope.includes(recipient.department)
      )
        return NextResponse.json(
          { error: "You can only message professors in your departments" },
          { status: 403 }
        );
    } else {
      if (recipient.role !== "admin") {
        return NextResponse.json(
          { error: "Professors can only message admins" },
          { status: 403 }
        );
      }
      const [professor] = await db
        .select({ department: users.department })
        .from(users)
        .where(eq(users.id, user.userId));
      if (!professor)
        return NextResponse.json(
          { error: "Professor not found" },
          { status: 404 }
        );
      const sharedScope = await db
        .select({ adminId: adminDepartments.adminId })
        .from(adminDepartments)
        .where(
          and(
            eq(adminDepartments.adminId, recipientId),
            eq(adminDepartments.department, professor.department)
          )
        );
      if (sharedScope.length === 0) {
        return NextResponse.json(
          { error: "You can only message your department admin" },
          { status: 403 }
        );
      }
    }

    const [message] = await db
      .insert(directMessages)
      .values({ senderId: user.userId, recipientId, content })
      .returning();
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Direct messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
