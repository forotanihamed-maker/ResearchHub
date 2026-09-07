/*src\lib\utils.ts  */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("fa-IR", {
    month: "long",
    day: "numeric",
    year: "numeric",
    calendar: "gregory",
    numberingSystem: "latn",
  });
}

export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(date);
  if (days > 0) return `${days} روز پیش`;
  if (hours > 0) return `${hours} ساعت پیش`;
  if (minutes > 0) return `${minutes} دقیقه پیش`;
  return "لحظاتی پیش";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function statusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "completed":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "approved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "cancelled":
      return "bg-slate-100 text-slate-500 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "open":
      return "باز";
    case "in_progress":
      return "در حال انجام";
    case "completed":
      return "تکمیل‌شده";
    case "pending":
      return "در انتظار بررسی";
    case "approved":
      return "پذیرفته‌شده";
    case "rejected":
      return "رد شده";
    case "cancelled":
      return "لغو شده";
    default:
      return status;
  }
}
