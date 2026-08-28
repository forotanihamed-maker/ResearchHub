/*src/app/dashboard/admin/messages/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { MessageSquare, Send, UserRound } from "lucide-react";

interface Professor {
  id: number;
  name: string;
  email: string;
  department: string;
  professorStatus: string;
}
interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async (professorId?: number) => {
    const url = professorId
      ? `/api/admin/messages?professorId=${professorId}`
      : "/api/admin/messages";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setProfessors(data.professors ?? []);
    if (professorId) setMessages(data.messages ?? []);
    else if (data.professors?.length) {
      setSelected(data.professors[0].id);
      load(data.professors[0].id);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const selectProfessor = async (id: number) => {
    setSelected(id);
    await load(id);
  };

  const send = async () => {
    if (!selected || !content.trim()) return;
    setSending(true);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: selected, content }),
    });
    if (res.ok) {
      setContent("");
      await load(selected);
    }
    setSending(false);
  };

  const current = professors.find((p) => p.id === selected);

  return (
    <div>
      <TopBar
        title="Professor Messages"
        subtitle="Direct communication with professors in your managed departments"
      />
      <main className="p-6 lg:p-8">
        <div className="grid h-[calc(100vh-180px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-4">
          {" "}
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-100 p-4">
              <p className="font-semibold text-slate-900">Professors</p>
              <p className="text-xs text-slate-500">Only your departments</p>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-sm text-slate-500">Loading...</p>
              ) : (
                professors.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProfessor(p.id)}
                    className={`w-full p-4 text-left hover:bg-slate-50 ${
                      selected === p.id ? "bg-indigo-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        <UserRound size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {p.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {p.department}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
          <section className="flex min-h-0 flex-col lg:col-span-3">
            {current ? (
              <>
                <div className="border-b border-slate-100 p-4">
                  <p className="font-semibold text-slate-900">{current.name}</p>
                  <p className="text-xs text-slate-500">
                    {current.email} · {current.department}
                  </p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-slate-400">
                      <div>
                        <MessageSquare size={34} className="mx-auto mb-2" />
                        <p className="text-sm">No messages yet</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                          m.senderId !== current.id
                            ? "ml-auto bg-indigo-600 text-white"
                            : "bg-white text-slate-700 border border-slate-200"
                        }`}
                      >
                        <p>{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-100 p-4">
                  <div className="flex gap-2">
                    <input
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      placeholder="Write a message..."
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={send}
                      disabled={sending || !content.trim()}
                      className="rounded-xl bg-indigo-600 px-4 text-white disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Select a professor to start a conversation.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
