/*demoo7\src\lib\permissions.ts */
import { getAuthUser } from "@/lib/auth";

export async function requireAdmin() {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return user;
}
