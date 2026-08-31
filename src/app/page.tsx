/* src/app/page.tsx */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FlaskConical, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-900 flex items-center justify-center"
      >
        <div className="text-center">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <FlaskConical size={24} className="text-white" />
          </div>
          <p className="text-slate-400 text-sm">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 translate-x-1/3" />
      </div>

      <div className="relative">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <FlaskConical size={18} className="text-white" />
            </div>

            <span className="font-bold text-white text-lg">ResearchHub</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-white/10"
              >
                ورود
              </Button>
            </Link>

            <Link href="/auth/register">
              <Button>ثبت‌نام</Button>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <main>
          <section className="max-w-5xl mx-auto px-6 sm:px-8 py-20 sm:py-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8">
              <FlaskConical size={14} />
              سامانه مدیریت فعالیت‌های پژوهشی دانشگاه
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              پژوهش دانشگاهی را
              <span className="text-indigo-400"> منظم‌تر </span>و
              <span className="text-purple-400"> قابل دسترس‌تر </span>
              کنیم
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-8">
              ResearchHub با هدف ایجاد یک فضای یکپارچه برای ارتباط استادان و
              دانشجویان، معرفی پروژه‌های پژوهشی، مدیریت درخواست‌ها و همکاری
              اعضای تیم طراحی شده است.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="px-8">
                  شروع کار با ResearchHub
                  <ArrowLeft size={17} className="mr-2" />
                </Button>
              </Link>

              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 border-white/20 text-white hover:bg-white/10"
                >
                  ورود به نسخه Demo
                </Button>
              </Link>
            </div>
          </section>

          {/* Problem */}
          <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-7 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300 mb-3">
                  مسئله
                </p>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5">
                  فرآیند پژوهش می‌تواند پراکنده و غیرشفاف باشد
                </h2>

                <div className="space-y-4 text-sm sm:text-base text-slate-400 leading-7">
                  <p>
                    در بسیاری از محیط‌های دانشگاهی، معرفی پروژه‌های پژوهشی، پیدا
                    کردن دانشجوی مناسب و پیگیری درخواست‌ها در ابزارهای مختلف
                    انجام می‌شود.
                  </p>

                  <p>
                    دانشجو ممکن است از فرصت‌های پژوهشی موجود اطلاع نداشته باشد و
                    استاد نیز برای پیدا کردن دانشجوی علاقه‌مند و مدیریت
                    درخواست‌ها با فرآیندی پراکنده مواجه شود.
                  </p>

                  <p>
                    پس از تشکیل تیم نیز اطلاعات و ارتباطات پروژه ممکن است در
                    پیام‌رسان‌ها، ایمیل و ابزارهای مختلف پراکنده شود.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-7 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300 mb-3">
                  راه‌حل ResearchHub
                </p>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5">
                  یک فضای متمرکز برای مدیریت این فرآیند
                </h2>

                <div className="space-y-4">
                  {[
                    "استاد پروژه پژوهشی خود را تعریف می‌کند.",
                    "دانشجویان پروژه‌های متناسب با علاقه و حوزه خود را پیدا می‌کنند.",
                    "دانشجو درخواست مشارکت ارسال می‌کند.",
                    "استاد درخواست‌ها را بررسی و اعضای مناسب را انتخاب می‌کند.",
                    "اعضای تأییدشده در محیط پروژه با یکدیگر همکاری می‌کنند.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2
                        size={18}
                        className="text-indigo-400 mt-1 shrink-0"
                      />
                      <p className="text-sm sm:text-base text-slate-300 leading-6">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-20">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300 mb-3">
                نحوه کار
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                مسیر فعالیت پژوهشی در ResearchHub
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  number: "۱",
                  title: "معرفی پروژه",
                  description:
                    "استاد پروژه، موضوع، توضیحات، ظرفیت تیم و اطلاعات موردنیاز را در سامانه ثبت می‌کند.",
                },
                {
                  number: "۲",
                  title: "پیدا کردن فرصت",
                  description:
                    "دانشجویان می‌توانند پروژه‌های موجود را مشاهده کنند و فرصت مناسب خود را پیدا کنند.",
                },
                {
                  number: "۳",
                  title: "تشکیل و همکاری تیم",
                  description:
                    "پس از تأیید درخواست، اعضای پروژه در یک محیط مشخص برای ادامه فعالیت و ارتباط تیمی قرار می‌گیرند.",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold mb-5">
                    {item.number}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-3">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-400 leading-7">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Main capabilities */}
          <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-24">
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-7 sm:p-10">
              <div className="max-w-2xl mb-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300 mb-3">
                  امکانات اصلی
                </p>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  ابزارهایی برای ساده‌تر شدن مدیریت پژوهش
                </h2>

                <p className="text-slate-400 leading-7">
                  سامانه برای نقش‌های مختلف دانشگاه طراحی شده و هر کاربر متناسب
                  با نقش خود به امکانات مربوط دسترسی دارد.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  {
                    icon: "🔬",
                    title: "مدیریت پروژه",
                    description:
                      "ایجاد، مشاهده و مدیریت پروژه‌های پژوهشی در یک محیط متمرکز.",
                  },
                  {
                    icon: "🎯",
                    title: "پیدا کردن فرصت پژوهشی",
                    description:
                      "دانشجویان می‌توانند پروژه‌های مناسب خود را پیدا و برای آنها درخواست ارسال کنند.",
                  },
                  {
                    icon: "👥",
                    title: "مدیریت تیم",
                    description:
                      "مدیریت اعضای پروژه و ایجاد یک فضای مشخص برای فعالیت تیم پژوهشی.",
                  },
                  {
                    icon: "💬",
                    title: "ارتباط تیمی",
                    description:
                      "اعضای تأییدشده پروژه می‌توانند در محیط گروهی با یکدیگر ارتباط داشته باشند.",
                  },
                  {
                    icon: "👤",
                    title: "پروفایل پژوهشی",
                    description:
                      "ثبت اطلاعات، علایق و مهارت‌های مرتبط با فعالیت پژوهشی کاربران.",
                  },
                  {
                    icon: "🛡️",
                    title: "مدیریت و نظارت",
                    description:
                      "مدیر سامانه می‌تواند اطلاعات کلی کاربران، استادان و پروژه‌ها را در محدوده تحت مدیریت مشاهده کند.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
                  >
                    <div className="text-3xl mb-4">{feature.icon}</div>

                    <h3 className="font-semibold text-white mb-2">
                      {feature.title}
                    </h3>

                    <p className="text-sm text-slate-400 leading-6">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="max-w-4xl mx-auto px-6 sm:px-8 pb-24 text-center">
            <div className="rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-8 sm:p-12">
              <FlaskConical
                size={32}
                className="text-indigo-400 mx-auto mb-5"
              />

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                یک تجربه ساختاریافته‌تر برای فعالیت پژوهشی
              </h2>

              <p className="text-slate-400 leading-7 max-w-2xl mx-auto mb-7">
                ResearchHub در حال توسعه است تا نیازهای واقعی استادان و
                دانشجویان را بهتر پوشش دهد. نسخه Demo برای بررسی و دریافت
                بازخورد آماده است.
              </p>

              <Link href="/auth/login">
                <Button size="lg" className="px-8">
                  مشاهده نسخه Demo
                  <ArrowLeft size={17} className="mr-2" />
                </Button>
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 px-6 sm:px-8 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <FlaskConical size={16} className="text-indigo-400" />
              ResearchHub
            </div>

            <p className="text-xs text-slate-500">
              سامانه مدیریت فعالیت‌های پژوهشی دانشگاه
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
