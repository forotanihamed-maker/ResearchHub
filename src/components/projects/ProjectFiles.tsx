/*src\components\projects\ProjectFiles.tsx */
"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/ErrorState";
import { formatFileSize, formatTimeAgo } from "@/lib/utils";
import { FileText, Upload, Download, Trash2, Paperclip } from "lucide-react";

interface ProjectFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  context: "chat" | "document" | "deliverable";
  uploaderId: number;
  uploaderName: string;
  createdAt: string;
}

interface ProjectFilesProps {
  projectId: number;
  context: "document" | "deliverable";
  title: string;
  description?: string;
  currentUserId?: number;
  isOwner: boolean;
  /** Whether the current user is allowed to upload into this context. */
  canUpload: boolean;
}

// ج.۴ — kept in sync with the server-side allow-list in lib/validation.ts.
const ACCEPTED = ".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg";

export function ProjectFiles({
  projectId,
  context,
  title,
  description,
  currentUserId,
  isOwner,
  canUpload,
}: ProjectFilesProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");

  const queryKey = ["project-files", projectId, context];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/files?context=${context}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ files: ProjectFile[] }>;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", context);
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "آپلود فایل ناموفق بود");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setUploadError("");
    },
    onError: (err: Error) => setUploadError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("حذف فایل ناموفق بود");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  const files = data?.files ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadMutation.isPending}
            >
              <Upload size={14} /> بارگذاری فایل
            </Button>
          </>
        )}
      </div>

      {uploadError && <InlineError message={uploadError} />}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-slate-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          <FileText size={24} className="mx-auto mb-2 text-slate-300" />
          هنوز فایلی بارگذاری نشده
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Paperclip size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {file.fileName}
                </p>
                <p className="text-xs text-slate-400">
                  {formatFileSize(file.fileSize)} · {file.uploaderName} ·{" "}
                  {formatTimeAgo(file.createdAt)}
                </p>
              </div>
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                title="دانلود"
              >
                <Download size={16} />
              </a>
              {(isOwner || file.uploaderId === currentUserId) && (
                <button
                  onClick={() => deleteMutation.mutate(file.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
