"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { TopBar } from "@/components/layout/TopBar";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "پذیرش دعوت ناموفق بود");
      router.push(`/dashboard/projects/${data.projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "پذیرش دعوت ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="دعوت به پروژه" subtitle="پیوستن به یک پروژه خصوصی" />
      <div className="p-6 max-w-lg">
        <Card>
          <CardBody className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">دعوت خصوصی پروژه</h2>
            <p className="text-sm text-slate-600">
              {user ? "اگر دعوت برای شماست، با قبول آن به پروژه اضافه می‌شوید." : "برای استفاده از لینک دعوت ابتدا وارد حساب کاربری دانشجویی خود شوید."}
            </p>
            {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>}
            {user?.role === "student" ? (
              <Button onClick={accept} loading={loading}>پیوستن به پروژه</Button>
            ) : user ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">فقط حساب دانشجویی می‌تواند از این لینک استفاده کند.</p>
            ) : (
              <Button onClick={() => router.push(`/auth/login?next=/invite/${encodeURIComponent(token)}`)}>ورود به حساب</Button>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
