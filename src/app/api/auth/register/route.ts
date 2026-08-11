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
  PASSWORD_MIN,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, department, university, bio } = body;

    const role = "student";

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
        department,
        university: universityResult.value,
        bio: bioResult.value,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        university: users.university,
        bio: users.bio,
        createdAt: users.createdAt,
      });

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
