// Smallest possible dev-panel endpoint: proves the guard works end to end.
// 200 for an allowed user, 404 for everyone else. Every later /api/dev/*
// route must start with the same getDevApiUser() check.
import { NextResponse } from "next/server";
import { getDevApiUser, devNotFoundResponse } from "@/lib/devAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getDevApiUser("api/dev/me");
  if (!user) return devNotFoundResponse();
  return NextResponse.json(
    { ok: true, userId: user.userId },
    { headers: { "Cache-Control": "no-store" } }
  );
}
