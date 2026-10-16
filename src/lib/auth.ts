/*src\lib\auth.ts  */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Used by BOTH signToken and verifyToken so the two can never drift apart.
// jsonwebtoken's default for sign() with a string secret is already HS256,
// so tokens issued before this was pinned explicitly remain valid.
const JWT_ALGORITHM = "HS256" as const;

const VALID_ROLES = ["professor", "student", "admin"] as const;

export interface JWTPayload {
  userId: number;
  email: string;
  role: "professor" | "student" | "admin";
  name: string;
}

// Runtime check of the decoded token body. jwt.verify() proves the token was
// signed with our secret, but not that its contents have the shape we expect.
function isValidPayload(value: unknown): value is JWTPayload {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.userId === "number" &&
    Number.isInteger(p.userId) &&
    p.userId > 0 &&
    typeof p.email === "string" &&
    typeof p.name === "string" &&
    typeof p.role === "string" &&
    (VALID_ROLES as readonly string[]).includes(p.role)
  );
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: JWT_ALGORITHM,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });
    if (!isValidPayload(decoded)) return null;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Every protected API route (and requireAdmin in lib/permissions.ts) gets its
// user through this function, so the checks below apply to all of them.
export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // The token only proves who the user was at login time (up to
  // JWT_EXPIRES_IN ago). Re-read the current account state so that a deleted
  // user, a changed role, or a professor whose approval was withdrawn no
  // longer keeps working until the token expires. role/email/name returned
  // here come from the database, not from the token.
  const [current] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      professorStatus: users.professorStatus,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!current) return null;

  // Same rule login enforces: a professor must be "approved".
  if (current.role === "professor" && current.professorStatus !== "approved") {
    return null;
  }

  return {
    userId: current.id,
    email: current.email,
    role: current.role,
    name: current.name,
  };
}

export function setAuthCookie(token: string): void {
  // Used in route handlers
}
