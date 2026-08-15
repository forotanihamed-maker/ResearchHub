/*src\components\projects\chatpanel.tsx */
"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Send, MessageSquare } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
}

export function ChatPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/messages`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ messages: Message[] }>;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onMutate: async (content) => {
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
              type: "text",
              createdAt: new Date().toISOString(),
              senderName: user?.name ?? "You",
              senderAvatar: user?.avatar,
              senderRole: user?.role ?? "student",
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
    sendMutation.mutate(message.trim());
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
        <h3 className="font-semibold text-slate-900">Team Chat</h3>
        <span className="text-xs text-slate-400 ml-1">
          · {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare size={40} className="mb-3 text-slate-200" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Be the first to say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.senderId === user?.id;
            const prevMsg = messages[idx - 1];
            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

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
                        {isOwn ? "You" : msg.senderName}
                      </span>
                      <span className="capitalize text-slate-400">
                        {msg.senderRole}
                      </span>
                      <span>{formatTimeAgo(msg.createdAt)}</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isOwn
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-900 rounded-tl-sm"
                    )}
                  >
                    {msg.content}
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
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
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
        </div>
      </div>
    </div>
  );
}
