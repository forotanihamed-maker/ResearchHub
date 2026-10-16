/*src\app\api\auth\logout\route.ts*/
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });
  // Same attributes as the cookie set in login/register (everything except
  // the value and lifetime), so the browser unambiguously clears that cookie.
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  });
  return response;
}
