/*src/app/admin/professors/page.tsx */
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import CreateProfessorForm from "./CreateProfessorForm";

export default async function ProfessorsPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Manage Professors</h1>

      <p className="mt-2 text-gray-600">
        Create professor accounts for your faculty.
      </p>

      <CreateProfessorForm />
    </main>
  );
}
