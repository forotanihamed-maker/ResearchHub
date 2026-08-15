/*src\app\api\auth\me\route.ts*/
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import {
  sanitizeName,
  isValidDepartment,
  parseOptionalText,
  validateInterests,
  validateProgrammingLanguages,
  type Department,
} from "@/lib/validation";

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
        interests: users.interests,
        programmingLanguages: users.programmingLanguages,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authUser.userId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
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
    const {
      name,
      bio,
      department,
      university,
      interests,
      programmingLanguages,
    } = body;

    let cleanName: string | undefined;
    if (name !== undefined) {
      const n = sanitizeName(name);
      if (!n) {
        return NextResponse.json(
          { error: "Name must be between 2 and 100 characters" },
          { status: 400 }
        );
      }
      cleanName = n;
    }

    let cleanDepartment: Department | undefined;
    if (department !== undefined) {
      if (!isValidDepartment(department)) {
        return NextResponse.json(
          { error: "Please select a valid department" },
          { status: 400 }
        );
      }
      cleanDepartment = department;
    }

    let cleanBio: string | null | undefined;
    if (bio !== undefined) {
      const result = parseOptionalText(bio, 1000);
      if (!result.ok) {
        return NextResponse.json({ error: "Bio is too long" }, { status: 400 });
      }
      cleanBio = result.value;
    }

    let cleanUniversity: string | null | undefined;
    if (university !== undefined) {
      const result = parseOptionalText(university, 255);
      if (!result.ok) {
        return NextResponse.json(
          { error: "University name is too long" },
          { status: 400 }
        );
      }
      cleanUniversity = result.value;
    }

    let cleanInterests: string[] | undefined;
    if (interests !== undefined) {
      const validated = validateInterests(interests);
      if (validated === null) {
        return NextResponse.json(
          { error: "Interests must be a list of short, valid labels" },
          { status: 400 }
        );
      }
      cleanInterests = validated;
    }

    let cleanLanguages: string[] | undefined;
    if (programmingLanguages !== undefined) {
      const validated = validateProgrammingLanguages(programmingLanguages);
      if (validated === null) {
        return NextResponse.json(
          { error: "One or more programming languages are invalid" },
          { status: 400 }
        );
      }
      cleanLanguages = validated;
    }

    await db
      .update(users)
      .set({
        name: cleanName,
        bio: cleanBio,
        department: cleanDepartment,
        university: cleanUniversity,
        interests: cleanInterests,
        programmingLanguages: cleanLanguages,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUser.userId));

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Update me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
