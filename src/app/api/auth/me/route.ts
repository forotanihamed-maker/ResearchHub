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
  isValidUsername,
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
      return jsonResponse({ error: "احراز هویت نشده‌اید" }, 401);
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
        username: users.username,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    if (!user) {
      return jsonResponse({ error: "کاربر یافت نشد" }, 404);
    }

    return jsonResponse({ user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);

    return jsonResponse(
      {
        error: "خطای داخلی سرور",
      },
      500
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return jsonResponse({ error: "احراز هویت نشده‌اید" }, 401);
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "بدنه درخواست JSON نامعتبر است" }, 400);
    }

    const {
      name,
      bio,
      department,
      university,
      interests,
      programmingLanguages,
      username,
    } = body;

    const updateData: {
      name?: string;
      bio?: string | null;
      department?: Department;
      university?: string | null;
      interests?: string[];
      programmingLanguages?: string[];
      username?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // -----------------------------
    // Name
    // -----------------------------

    if (name !== undefined) {
      if (typeof name !== "string") {
        return jsonResponse({ error: "نام باید متن باشد" }, 400);
      }

      const cleanName = sanitizeName(name);

      if (!cleanName) {
        return jsonResponse(
          {
            error: "نام باید بین ۲ تا ۱۰۰ کاراکتر باشد",
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
            error: "لطفاً یک گروه آموزشی معتبر انتخاب کنید",
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
        return jsonResponse({ error: "بیوگرافی باید متن باشد" }, 400);
      }

      const result = parseOptionalText(bio, 1000);

      if (!result.ok) {
        return jsonResponse({ error: "بیوگرافی بیش از حد طولانی است" }, 400);
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
            error: "نام دانشگاه باید متن باشد",
          },
          400
        );
      }

      const result = parseOptionalText(university, 255);

      if (!result.ok) {
        return jsonResponse(
          {
            error: "نام دانشگاه بیش از حد طولانی است",
          },
          400
        );
      }

      updateData.university = result.value;
    }

    // -----------------------------
    // Username
    // -----------------------------
    if (username !== undefined) {
      if (username !== null && !isValidUsername(username)) {
        return jsonResponse({ error: "نام کاربری باید فقط شامل حروف انگلیسی، عدد و _ و بین ۳ تا ۳۰ کاراکتر باشد" }, 400);
      }
      if (username) {
        const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
        if (existingUsername && existingUsername.id !== authUser.userId) return jsonResponse({ error: "این نام کاربری قبلاً استفاده شده است" }, 409);
      }
      updateData.username = username || null;
    }

    // -----------------------------
    // Interests
    // -----------------------------

    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return jsonResponse(
          {
            error: "علایق باید فهرستی از برچسب‌های کوتاه و معتبر باشند",
          },
          400
        );
      }

      const validated = validateInterests(interests);

      if (validated === null) {
        return jsonResponse(
          {
            error: "علایق باید فهرستی از برچسب‌های کوتاه و معتبر باشند",
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
            error: "زبان‌های برنامه‌نویسی باید به‌صورت فهرست باشند",
          },
          400
        );
      }

      const validated = validateProgrammingLanguages(programmingLanguages);

      if (validated === null) {
        return jsonResponse(
          {
            error: "یک یا چند زبان برنامه‌نویسی نامعتبر است",
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
        username: users.username,
        createdAt: users.createdAt,
      });

    if (!updatedUser) {
      return jsonResponse({ error: "کاربر یافت نشد" }, 404);
    }

    return jsonResponse({
      message: "Updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);

    return jsonResponse(
      {
        error: "خطای داخلی سرور",
      },
      500
    );
  }
}
