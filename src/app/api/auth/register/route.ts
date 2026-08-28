/*src\app\api\auth\register\route.ts*/
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, signToken } from "@/lib/auth";
import {
  sanitizeName,
  sanitizeEmail,
  isValidPassword,
  isValidDepartment,
  parseOptionalText,
  validateInterests,
  validateProgrammingLanguages,
  PASSWORD_MIN,
} from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      department,
      university,
      bio,
      interests,
      programmingLanguages,
    } = body;

    const requestedRole = body.role;
    const role: "student" | "professor" =
      requestedRole === "professor" ? "professor" : "student";

    const cleanName = sanitizeName(name);
    if (!cleanName) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN} characters` },
        { status: 400 }
      );
    }

    if (!isValidDepartment(department)) {
      return NextResponse.json(
        { error: "Please select a valid department" },
        { status: 400 }
      );
    }

    const universityResult = parseOptionalText(university, 255);
    if (!universityResult.ok) {
      return NextResponse.json(
        { error: "University name is too long" },
        { status: 400 }
      );
    }

    const bioResult = parseOptionalText(bio, 1000);
    if (!bioResult.ok) {
      return NextResponse.json({ error: "Bio is too long" }, { status: 400 });
    }

    const cleanInterests = validateInterests(interests ?? []);
    if (cleanInterests === null) {
      return NextResponse.json(
        { error: "Interests must be a list of short, valid labels" },
        { status: 400 }
      );
    }

    const cleanLanguages = validateProgrammingLanguages(
      programmingLanguages ?? []
    );
    if (cleanLanguages === null) {
      return NextResponse.json(
        { error: "One or more programming languages are invalid" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        name: cleanName,
        email: cleanEmail,
        password: hashed,
        role,
        professorStatus: role === "professor" ? "pending" : "approved",
        department,
        university: universityResult.value,
        bio: bioResult.value,
        interests: cleanInterests,
        programmingLanguages: cleanLanguages,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        professorStatus: users.professorStatus,
        department: users.department,
        university: users.university,
        bio: users.bio,
        interests: users.interests,
        programmingLanguages: users.programmingLanguages,
        createdAt: users.createdAt,
      });

    auditLog("register_success", { userId: user.id, email: user.email });

    if (role === "professor") {
      return NextResponse.json(
        {
          user,
          pendingApproval: true,
          message:
            "Professor account created. Wait for admin approval before signing in.",
        },
        { status: 201 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({ user, token }, { status: 201 });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
