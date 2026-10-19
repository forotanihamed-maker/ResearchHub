"use client";

import { useState } from "react";
import { Bug, X } from "lucide-react";
import { usePathname } from "next/navigation";

const CATEGORIES = ["فنی", "رابط کاربری", "محتوا", "پیشنهاد", "سایر"];

export function ReportIssueButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (description.trim().length < 10) {
      setStatus("توضیح باید حداقل ۱۰ کاراکتر باشد.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagePath: pathname, description, category: category || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(data.error ?? "ارسال گزارش ناموفق بود.");
        return;
      }
      setStatus("گزارش شما با موفقیت ثبت شد.");
      setDescription("");
      setCategory("");
    } catch {
      setStatus("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setStatus(null); }}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <Bug size={16} />
        گزارش مشکل
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-slate-900">گزارش مشکل</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="بستن">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">صفحه فعلی: {pathname}</p>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="مشکل را با جزئیات توضیح دهید..."
              maxLength={2000}
              rows={6}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
              disabled={busy}
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
              disabled={busy}
            >
              <option value="">دسته‌بندی اختیاری</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            {status && <p className="mt-3 text-sm text-slate-700">{status}</p>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700" disabled={busy}>انصراف</button>
              <button type="button" onClick={submit} className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50" disabled={busy}>ارسال گزارش</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
