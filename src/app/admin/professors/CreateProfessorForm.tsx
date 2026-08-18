/*src/app/admin/professors/CreateProfessorForm.tsx */
"use client";

import { useState } from "react";

export default function CreateProfessorForm() {
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;

    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      department: (form.elements.namedItem("department") as HTMLInputElement)
        .value,
    };

    const res = await fetch("/api/admin/professors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setMessage("Professor created successfully");
      form.reset();
    } else {
      const error = await res.json();
      setMessage(error.error ?? "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4 max-w-md">
      <input
        name="name"
        placeholder="Professor name"
        className="w-full border p-3 rounded"
        required
      />

      <input
        name="email"
        placeholder="Email"
        type="email"
        className="w-full border p-3 rounded"
        required
      />

      <input
        name="password"
        placeholder="Temporary password"
        type="password"
        className="w-full border p-3 rounded"
        required
      />

      <input
        name="department"
        placeholder="Department"
        className="w-full border p-3 rounded"
        required
      />

      <button className="rounded bg-black px-5 py-3 text-white">
        Create Professor
      </button>

      {message && (
        <p
          className={
            message.includes("successfully")
              ? "text-green-600 text-sm"
              : "text-red-600 text-sm"
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
