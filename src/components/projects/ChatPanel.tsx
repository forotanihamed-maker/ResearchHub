/*src\components\projects\chatpanel.tsx */
"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Send,
  MessageSquare,
  Paperclip,
  Download,
  CheckCircle2,
} from "lucide-react";
import { formatTimeAgo, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { messages as faMessages } from "@/lib/messages.fa";

interface Attachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

interface Message {
  id: number;
  projectId: number;
  senderId: number;
  content: string;
  type: string;
  createdAt: string;
  senderName: string;
  senderAvatar?: string | null;
  senderRole: string;
  attachment: Attachment | null;
}

export function ChatPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [attachError, setAttachError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/messages`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ messages: Message[] }>;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // ج.۸ — پیوست‌های چت حالا مستقیم داخل همان پیام (از طریق chatMessageId)
  // برمی‌گردند؛ دیگر نیازی به کوئری/نوار جدا نیست.

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      type = "text",
    }: {
      content: string;
      type?: "text" | "progress_update";
    }) => {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onMutate: async ({ content, type = "text" }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["messages", projectId] });
      const prev = queryClient.getQueryData<{ messages: Message[] }>([
        "messages",
        projectId,
      ]);
      queryClient.setQueryData(
        ["messages", projectId],
        (old: { messages: Message[] } | undefined) => ({
          messages: [
            ...(old?.messages ?? []),
            {
              id: Date.now(),
              projectId,
              senderId: user?.id ?? 0,
              content,
              type,
              createdAt: new Date().toISOString(),
              senderName: user?.name ?? "شما",
              senderAvatar: user?.avatar,
              senderRole: user?.role ?? "student",
              attachment: null,
            },
          ],
        })
      );
      setMessage("");
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["messages", projectId], ctx?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", projectId] });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ content: message.trim() });
  };

  // د.۲ — همان پیام، فقط با نوع «به‌روزرسانی پیشرفت» تا در چت متمایز نمایش
  // داده شود (شبیه یک خلاصه‌ی کوچک از پیشرفت کار، نه یک پیام گفتگوی معمولی).
  const handleSendProgress = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ content: message.trim(), type: "progress_update" });
  };

  const attachMutation = useMutation({
    mutationFn: async (file: File) => {
      // ۱. اول خودِ پیام را می‌سازیم (متنش نام فایل است، برای حالتی که
      // نمایش پیوست به هر دلیلی ممکن نشود، یک fallback متنی معقول بماند).
      const msgRes = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `📎 ${file.name}` }),
      });
      const msgData = await msgRes.json();
      if (!msgRes.ok) {
        throw new Error(msgData?.error || "ارسال پیام ناموفق بود");
      }
      const messageId = msgData.message.id as number;

      // ۲. فایل را با اشاره به همان پیام آپلود می‌کنیم تا در چت به آن
      // پیام لینک شود و مستقیم از داخل حباب قابل دانلود باشد.
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "chat");
      formData.append("chatMessageId", String(messageId));

      const fileRes = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });
      const fileData = await fileRes.json().catch(() => null);
      if (!fileRes.ok) {
        throw new Error(fileData?.error || "پیوست کردن فایل ناموفق بود");
      }
      return fileData.file as Attachment;
    },
    onSuccess: () => {
      setAttachError("");
      queryClient.invalidateQueries({ queryKey: ["messages", projectId] });
    },
    onError: (err: Error) => setAttachError(err.message),
  });

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) attachMutation.mutate(file);
    e.target.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = data?.messages ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <MessageSquare size={18} className="text-indigo-600" />
        <h3 className="font-semibold text-slate-900">گفتگوی تیم</h3>
        <span className="text-xs text-slate-400 ms-1">
          · {messages.length} پیام
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            در حال بارگذاری پیام‌ها...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare size={40} className="mb-3 text-slate-200" />
            <p className="text-sm font-medium">هنوز پیامی ارسال نشده</p>
            <p className="text-xs">اولین نفری باشید که سلام می‌کند! 👋</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.senderId === user?.id;
            const prevMsg = messages[idx - 1];
            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

            // د.۲ — پیام‌های «به‌روزرسانی پیشرفت» شبیه یک رویداد کوتاه در
            // وسط گفتگو نمایش داده می‌شوند، نه یک حباب چت معمولی — همان
            // حسی که یک تاریخچه‌ی commit به آدم می‌دهد.
            if (msg.type === "progress_update") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="max-w-[85%] bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-600 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-emerald-700 font-medium">
                        {isOwn ? "شما" : msg.senderName} پیشرفت ثبت کرد ·{" "}
                        {formatTimeAgo(msg.createdAt)}
                      </p>
                      <p className="text-sm text-emerald-900 mt-0.5">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn("flex gap-3", isOwn && "flex-row-reverse")}
              >
                {!isOwn && (
                  <div className="flex-shrink-0 w-8">
                    {showAvatar && (
                      <Avatar
                        name={msg.senderName}
                        src={msg.senderAvatar}
                        size="sm"
                      />
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[70%] space-y-1",
                    isOwn && "items-end flex flex-col"
                  )}
                >
                  {showAvatar && (
                    <div
                      className={cn(
                        "flex items-center gap-2 text-xs text-slate-500",
                        isOwn && "flex-row-reverse"
                      )}
                    >
                      <span className="font-medium text-slate-700">
                        {isOwn ? "شما" : msg.senderName}
                      </span>
                      <span className="text-slate-400">
                        {faMessages.roles[
                          msg.senderRole as "professor" | "student" | "admin"
                        ] ?? msg.senderRole}
                      </span>
                      <span>{formatTimeAgo(msg.createdAt)}</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl text-sm leading-relaxed",
                      msg.attachment ? "p-1.5" : "px-4 py-2.5",
                      isOwn
                        ? "bg-indigo-600 text-white rounded-e-sm"
                        : "bg-slate-100 text-slate-900 rounded-s-sm"
                    )}
                  >
                    {msg.attachment ? (
                      <a
                        href={msg.attachment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={msg.attachment.fileName}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
                          isOwn
                            ? "bg-indigo-700/60 hover:bg-indigo-700"
                            : "bg-white hover:bg-slate-50 border border-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            isOwn
                              ? "bg-white/15 text-white"
                              : "bg-indigo-50 text-indigo-600"
                          )}
                        >
                          <Paperclip size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {msg.attachment.fileName}
                          </span>
                          <span
                            className={cn(
                              "block text-xs",
                              isOwn ? "text-indigo-100" : "text-slate-500"
                            )}
                          >
                            {formatFileSize(msg.attachment.fileSize)}
                          </span>
                        </span>
                        <Download
                          size={16}
                          className={cn(
                            "shrink-0",
                            isOwn ? "text-indigo-100" : "text-slate-400"
                          )}
                        />
                      </a>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100">
        {attachError && (
          <p className="text-xs text-red-600 mb-2">{attachError}</p>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAttachClick}
            loading={attachMutation.isPending}
            className="self-end"
            title="پیوست فایل"
          >
            <Paperclip size={16} />
          </Button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="پیامی بنویسید... (Enter برای ارسال)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="self-end"
          >
            <Send size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendProgress}
            disabled={!message.trim() || sendMutation.isPending}
            className="self-end"
            title="ثبت پیشرفت"
          >
            <CheckCircle2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
