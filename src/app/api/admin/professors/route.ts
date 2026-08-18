import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";
import {
  sanitizeName,
  sanitizeEmail,
  isValidDepartment,
  isValidPassword,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthUser();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const { name, email, password, department } = body;

    const cleanName = sanitizeName(name);

    if (!cleanName) {
      return NextResponse.json(
        { error: "Invalid professor name" },
        { status: 400 }
      );
    }

    const cleanEmail = sanitizeEmail(email);

    if (!cleanEmail) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Password is too weak" },
        { status: 400 }
      );
    }

    if (!isValidDepartment(department)) {
      return NextResponse.json(
        { error: "Invalid department" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);

    const [professor] = await db
      .insert(users)
      .values({
        name: cleanName,
        email: cleanEmail,
        password: hashed,
        role: "professor",
        department,
        interests: [],
        programmingLanguages: [],
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        createdAt: users.createdAt,
      });

    auditLog("professor_created", {
      adminId: admin.userId,
      professorId: professor.id,
      email: professor.email,
    });

    return NextResponse.json({ professor }, { status: 201 });
  } catch (error) {
    console.error("Create professor error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
