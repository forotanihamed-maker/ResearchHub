/**src\app\admin\page.tsx */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AdminStats from "./AdminStats";

export default async function AdminPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <p className="mt-4">Welcome {user.name}</p>

      <AdminStats />
      <Link
        href="/admin/professors"
        className="inline-block mt-8 rounded bg-blue-600 px-5 py-3 text-white"
      >
        Manage Professors
      </Link>
    </main>
  );
}
