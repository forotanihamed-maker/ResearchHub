import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userSkills, skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        bio: users.bio,
        department: users.department,
        university: users.university,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authUser.userId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user skills
    const userSkillRows = await db
      .select({ id: skills.id, name: skills.name })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, authUser.userId));

    return NextResponse.json({ user: { ...user, skills: userSkillRows } });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, bio, department, university, skillIds } = body;

    await db
      .update(users)
      .set({
        name: name || undefined,
        bio: bio !== undefined ? bio : undefined,
        department: department !== undefined ? department : undefined,
        university: university !== undefined ? university : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUser.userId));

    // Update skills if provided
    if (skillIds !== undefined) {
      await db.delete(userSkills).where(eq(userSkills.userId, authUser.userId));
      if (skillIds.length > 0) {
        await db.insert(userSkills).values(
          skillIds.map((skillId: number) => ({
            userId: authUser.userId,
            skillId,
          }))
        );
      }
    }

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Update me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
