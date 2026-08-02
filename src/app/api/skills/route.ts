import { NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const allSkills = await db
      .select()
      .from(skills)
      .orderBy(asc(skills.name));

    return NextResponse.json({ skills: allSkills });
  } catch (error) {
    console.error("Skills error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
