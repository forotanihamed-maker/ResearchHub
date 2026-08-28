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

export const dynamic = "force-dynamic";

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        professorStatus: users.professorStatus,
        avatar: users.avatar,
        bio: users.bio,
        department: users.department,
        university: users.university,
        interests: users.interests,
        programmingLanguages: users.programmingLanguages,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    if (!user) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    return jsonResponse({ user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);

    return jsonResponse(
      {
        error: "Internal server error",
      },
      500
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const {
      name,
      bio,
      department,
      university,
      interests,
      programmingLanguages,
    } = body;

    const updateData: {
      name?: string;
      bio?: string | null;
      department?: Department;
      university?: string | null;
      interests?: string[];
      programmingLanguages?: string[];
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // -----------------------------
    // Name
    // -----------------------------

    if (name !== undefined) {
      if (typeof name !== "string") {
        return jsonResponse({ error: "Name must be a string" }, 400);
      }

      const cleanName = sanitizeName(name);

      if (!cleanName) {
        return jsonResponse(
          {
            error: "Name must be between 2 and 100 characters",
          },
          400
        );
      }

      updateData.name = cleanName;
    }

    // -----------------------------
    // Department
    // -----------------------------

    if (department !== undefined) {
      if (typeof department !== "string" || !isValidDepartment(department)) {
        return jsonResponse(
          {
            error: "Please select a valid department",
          },
          400
        );
      }

      updateData.department = department;
    }

    // -----------------------------
    // Bio
    // -----------------------------

    if (bio !== undefined) {
      if (bio !== null && typeof bio !== "string") {
        return jsonResponse({ error: "Bio must be a string" }, 400);
      }

      const result = parseOptionalText(bio, 1000);

      if (!result.ok) {
        return jsonResponse({ error: "Bio is too long" }, 400);
      }

      updateData.bio = result.value;
    }

    // -----------------------------
    // University
    // -----------------------------

    if (university !== undefined) {
      if (university !== null && typeof university !== "string") {
        return jsonResponse(
          {
            error: "University must be a string",
          },
          400
        );
      }

      const result = parseOptionalText(university, 255);

      if (!result.ok) {
        return jsonResponse(
          {
            error: "University name is too long",
          },
          400
        );
      }

      updateData.university = result.value;
    }

    // -----------------------------
    // Interests
    // -----------------------------

    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return jsonResponse(
          {
            error: "Interests must be a list of short, valid labels",
          },
          400
        );
      }

      const validated = validateInterests(interests);

      if (validated === null) {
        return jsonResponse(
          {
            error: "Interests must be a list of short, valid labels",
          },
          400
        );
      }

      updateData.interests = validated;
    }

    // -----------------------------
    // Programming languages
    // -----------------------------

    if (programmingLanguages !== undefined) {
      if (!Array.isArray(programmingLanguages)) {
        return jsonResponse(
          {
            error: "Programming languages must be a list",
          },
          400
        );
      }

      const validated = validateProgrammingLanguages(programmingLanguages);

      if (validated === null) {
        return jsonResponse(
          {
            error: "One or more programming languages are invalid",
          },
          400
        );
      }

      updateData.programmingLanguages = validated;
    }

    // -----------------------------
    // Update
    // -----------------------------

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, authUser.userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        professorStatus: users.professorStatus,
        avatar: users.avatar,
        bio: users.bio,
        department: users.department,
        university: users.university,
        interests: users.interests,
        programmingLanguages: users.programmingLanguages,
        createdAt: users.createdAt,
      });

    if (!updatedUser) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    return jsonResponse({
      message: "Updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);

    return jsonResponse(
      {
        error: "Internal server error",
      },
      500
    );
  }
}
