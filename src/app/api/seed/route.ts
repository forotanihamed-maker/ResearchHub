/*src\app\api\seed\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  projects,
  applications,
  projectMembers,
  chatMessages,
  adminDepartments,
  directMessages,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";
import { getClientIp } from "@/lib/rateLimit";
import type { Department } from "@/lib/validation";
import { eq } from "drizzle-orm";

// ============================================================
// 🔒 Seed access guard
// This route can wipe/reseed the entire database, so it must
// never be reachable without a secret — in ANY environment.
// If SEED_SECRET is not set, the route is disabled entirely.
// Pass the secret via header `x-seed-secret` or `?secret=`.
// ============================================================
function assertSeedAccess(req: NextRequest): NextResponse | null {
  const expected = process.env.SEED_SECRET;
  const ip = getClientIp(req);

  if (!expected) {
    auditLog("seed_denied", { ip, reason: "no_secret_configured" });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const provided =
    req.headers.get("x-seed-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (provided !== expected) {
    auditLog("seed_denied", { ip, reason: "bad_secret" });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  auditLog("seed_executed", { ip, method: req.method });
  return null;
}

// ============================================================
// 📌 کاربران تستی (Skills حذف شد؛ به‌جایش interests + programmingLanguages)
// ============================================================
const DEMO_USERS: {
  name: string;
  email: string;
  password: string;
  role: "professor" | "student" | "admin";
  department: Department;
  university: string;
  bio: string;
  interests: string[];
  programmingLanguages: string[];
}[] = [
  {
    name: "مدیر سامانه",
    email: "admin@researchhub.ir",
    password: "admin123",
    role: "admin" as const,
    department: "مهندسی نرم‌افزار",
    university: "دانشگاه علم و صنعت ایران",
    bio: "مدیر سامانه ResearchHub",
    interests: [],
    programmingLanguages: [],
  },
  {
    name: "دکتر علی محمدی",
    email: "ali.mohammadi@university.edu",
    password: "professor123",
    role: "professor" as const,
    department: "هوش مصنوعی",
    university: "دانشگاه علم و صنعت ایران",
    bio: "استاد گروه هوش مصنوعی، علاقه‌مند به یادگیری عمیق و بینایی ماشین",
    interests: ["Deep Learning", "Computer Vision"],
    programmingLanguages: ["Python", "C++"],
  },
  {
    name: "دکتر سارا احمدی",
    email: "sara.ahmadi@university.edu",
    password: "professor123",
    role: "professor" as const,
    department: "مهندسی نرم‌افزار",
    university: "دانشگاه علم و صنعت ایران",
    bio: "استاد گروه مهندسی نرم‌افزار، تخصص در معماری سیستم‌های توزیع شده",
    interests: ["Distributed Systems", "Software Architecture"],
    programmingLanguages: ["TypeScript", "Go", "Java"],
  },
  {
    name: "رضا کریمی",
    email: "reza.karimi@student.edu",
    password: "student123",
    role: "student" as const,
    department: "هوش مصنوعی",
    university: "دانشگاه علم و صنعت ایران",
    bio: "دانشجوی کارشناسی ارشد هوش مصنوعی، علاقه‌مند به پردازش زبان طبیعی",
    interests: ["NLP", "Machine Learning"],
    programmingLanguages: ["Python"],
  },
  {
    name: "مریم حسینی",
    email: "maryam.hosseini@student.edu",
    password: "student123",
    role: "student" as const,
    department: "مهندسی نرم‌افزار",
    university: "دانشگاه علم و صنعت ایران",
    bio: "دانشجوی کارشناسی ارشد مهندسی نرم‌افزار، علاقه‌مند به توسعه وب و اپلیکیشن",
    interests: ["Web Development"],
    programmingLanguages: ["TypeScript", "JavaScript"],
  },
  {
    name: "امیر رضایی",
    email: "amir.rezaei@student.edu",
    password: "student123",
    role: "student" as const,
    department: "شبکه‌های کامپیوتری",
    university: "دانشگاه علم و صنعت ایران",
    bio: "دانشجوی کارشناسی ارشد شبکه، علاقه‌مند به امنیت شبکه و SDN",
    interests: ["Network Security", "SDN"],
    programmingLanguages: ["Python", "C"],
  },
];

// ============================================================
// 📌 پروژه‌های نمونه (بدون Skills)
// ============================================================
const DEMO_PROJECTS = [
  {
    title: "سیستم تشخیص چهره با یادگیری عمیق",
    description:
      "طراحی و پیاده‌سازی یک سیستم تشخیص چهره با استفاده از شبکه‌های عصبی کانولوشنی. این پروژه شامل جمع‌آوری داده، آموزش مدل و پیاده‌سازی روی وب‌کم است.",
    status: "open" as const,
    maxMembers: 4,
    deadline: new Date("2026-10-15"),
  },
  {
    title: "پلتفرم مدیریت پروژه‌های دانشجویی",
    description:
      "ساخت یک پلتفرم وب کامل برای مدیریت پروژه‌های دانشجویی با قابلیت‌های: ثبت پروژه، ارسال درخواست، چت گروهی و داشبورد پیشرفته.",
    status: "in_progress" as const,
    maxMembers: 5,
    deadline: new Date("2026-08-30"),
  },
  {
    title: "تحلیل احساسات در متون فارسی با BERT",
    description:
      "پیاده‌سازی یک مدل تحلیل احساسات برای متون فارسی با استفاده از مدل BERT فارسی. نیاز به جمع‌آوری داده، آموزش و ارزیابی مدل.",
    status: "open" as const,
    maxMembers: 3,
    deadline: new Date("2026-09-20"),
  },
  {
    title: "سیستم تشخیص نفوذ در شبکه با یادگیری ماشین",
    description:
      "طراحی یک سیستم تشخیص نفوذ با استفاده از الگوریتم‌های یادگیری ماشین برای شناسایی حملات شبکه‌ای. نیاز به تحلیل داده‌های ترافیک شبکه.",
    status: "completed" as const,
    maxMembers: 4,
    deadline: new Date("2026-05-01"),
  },
  {
    title: "طراحی و شبیه‌سازی پردازنده RISC-V",
    description:
      "طراحی یک پردازنده ساده RISC-V با استفاده از Verilog و شبیه‌سازی آن. شامل پیاده‌سازی pipeline و حافظه کش.",
    status: "open" as const,
    maxMembers: 3,
    deadline: new Date("2026-10-01"),
  },
];

// ============================================================
// 🚀 Shared seeding logic, used by both GET (with ?action=) and POST
// ============================================================
async function runFullSeed() {
  // 1. ساخت کاربران
  const userMap: Record<string, number> = {};
  for (const userData of DEMO_USERS) {
    const hashedPassword = await hashPassword(userData.password);
    const [user] = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        professorStatus:
          userData.role === "professor" ? "approved" : "approved",
        department: userData.department,
        university: userData.university,
        bio: userData.bio,
        interests: userData.interests,
        programmingLanguages: userData.programmingLanguages,
      })
      .returning({ id: users.id });
    userMap[userData.email] = user.id;
  }

  const adminId = userMap["admin@researchhub.ir"];
  if (adminId) {
    const departments: Department[] = [
      "مهندسی نرم‌افزار",
      "هوش مصنوعی",
      "شبکه‌های کامپیوتری",
      "معماری سیستم‌های کامپیوتری",
      "امنیت اطلاعات",
      "علوم داده",
    ];
    await db
      .insert(adminDepartments)
      .values(departments.map((department) => ({ adminId, department })));
  }

  // 2. ساخت پروژه‌ها (همه متعلق به دکتر علی محمدی)
  const professorId = userMap["ali.mohammadi@university.edu"];
  const projectMap: Record<string, number> = {};

  for (const projectData of DEMO_PROJECTS) {
    const [project] = await db
      .insert(projects)
      .values({
        title: projectData.title,
        description: projectData.description,
        status: projectData.status,
        professorId,
        maxMembers: projectData.maxMembers,
        deadline: projectData.deadline,
      })
      .returning({ id: projects.id });

    projectMap[projectData.title] = project.id;

    await db
      .insert(projectMembers)
      .values({ projectId: project.id, userId: professorId })
      .onConflictDoNothing();
  }

  // 3. درخواست‌های نمونه (pending / approved / rejected)
  const student1Id = userMap["reza.karimi@student.edu"];
  const student2Id = userMap["maryam.hosseini@student.edu"];
  const student3Id = userMap["amir.rezaei@student.edu"];

  const faceProjectId = projectMap["سیستم تشخیص چهره با یادگیری عمیق"];
  const platformProjectId = projectMap["پلتفرم مدیریت پروژه‌های دانشجویی"];
  const sentimentProjectId = projectMap["تحلیل احساسات در متون فارسی با BERT"];

  // pending
  if (faceProjectId && student1Id) {
    await db.insert(applications).values({
      projectId: faceProjectId,
      studentId: student1Id,
      status: "pending",
      message:
        "سلام استاد، من قبلاً روی پروژه‌های تشخیص چهره کار کرده‌ام و علاقه‌مند به همکاری هستم.",
    });
  }

  // approved -> becomes a project member
  if (platformProjectId && student2Id) {
    await db.insert(applications).values({
      projectId: platformProjectId,
      studentId: student2Id,
      status: "approved",
      message:
        "سلام استاد، من تجربه کار با Next.js و Tailwind دارم و می‌توانم کمک کنم.",
    });
    await db
      .insert(projectMembers)
      .values({ projectId: platformProjectId, userId: student2Id })
      .onConflictDoNothing();
  }

  // rejected
  if (sentimentProjectId && student3Id) {
    await db.insert(applications).values({
      projectId: sentimentProjectId,
      studentId: student3Id,
      status: "rejected",
      message: "سلام استاد، من به حوزه NLP علاقه‌مند هستم.",
    });
  }

  // another pending, on the same project as above
  if (sentimentProjectId && student1Id) {
    await db.insert(applications).values({
      projectId: sentimentProjectId,
      studentId: student1Id,
      status: "pending",
      message:
        "سلام استاد، من به حوزه NLP علاقه‌مند هستم و با PyTorch کار کرده‌ام.",
    });
  }

  // 4. چند پیام نمونه در چت پروژه‌ای که دانشجو واقعاً عضو آن است
  if (platformProjectId && professorId && student2Id) {
    await db.insert(chatMessages).values([
      {
        projectId: platformProjectId,
        senderId: professorId,
        content:
          "سلام مریم جان، خوش اومدی به تیم! بریم یه نگاه به backlog بندازیم.",
      },
      {
        projectId: platformProjectId,
        senderId: student2Id,
        content: "سلام استاد، ممنون! آماده‌ام شروع کنم.",
      },
      {
        projectId: platformProjectId,
        senderId: professorId,
        content: "عالیه، بخش داشبورد رو اول شروع کن.",
      },
    ]);
  }

  const finalUsers = await db.select().from(users);
  const finalProjects = await db.select().from(projects);
  const finalApplications = await db.select().from(applications);
  const finalMessages = await db.select().from(chatMessages);

  return {
    users: {
      total: finalUsers.length,
      list: finalUsers.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    },
    projects: {
      total: finalProjects.length,
      list: finalProjects.map((p) => ({ title: p.title, status: p.status })),
    },
    applications: { total: finalApplications.length },
    messages: { total: finalMessages.length },
  };
}

async function clearAllData() {
  await db.delete(chatMessages);
  await db.delete(directMessages);
  await db.delete(adminDepartments);
  await db.delete(projectMembers);
  await db.delete(applications);
  await db.delete(projects);
  await db.delete(users);
}

// ============================================================
// 🚀 GET: supports ?action=clear and ?action=force, otherwise
// refuses to overwrite existing data.
// ============================================================
export async function GET(req: NextRequest) {
  const denied = assertSeedAccess(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Read-only diagnostic: list existing users without touching any data.
    if (action === "list") {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          professorStatus: users.professorStatus,
          department: users.department,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.id);
      return NextResponse.json({ count: rows.length, users: rows });
    }

    // Read-only diagnostic: checks whether the admin-panel migration
    // (admin_departments / direct_messages tables) has actually been
    // applied to this database. Touches nothing.
    if (action === "check-schema") {
      const result: Record<string, string> = {};

      try {
        await db.select().from(adminDepartments).limit(1);
        result.adminDepartments = "OK - table exists";
      } catch (e) {
        result.adminDepartments = `MISSING or ERROR - ${
          e instanceof Error ? e.message : String(e)
        }`;
      }

      try {
        await db.select().from(directMessages).limit(1);
        result.directMessages = "OK - table exists";
      } catch (e) {
        result.directMessages = `MISSING or ERROR - ${
          e instanceof Error ? e.message : String(e)
        }`;
      }

      const adminRows = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.role, "admin"));

      let assignedDepartments: Record<string, string[]> = {};
      try {
        for (const admin of adminRows) {
          const rows = await db
            .select({ department: adminDepartments.department })
            .from(adminDepartments)
            .where(eq(adminDepartments.adminId, admin.id));
          assignedDepartments[admin.email] = rows.map((r) => r.department);
        }
      } catch {
        assignedDepartments = {};
      }

      return NextResponse.json({
        schema: result,
        admins: adminRows,
        assignedDepartments,
      });
    }

    if (action === "clear") {
      await clearAllData();
      return NextResponse.json({
        message:
          "✅ All data cleared successfully (users, projects, applications, chat, members)",
      });
    }

    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0 && action !== "force") {
      return NextResponse.json({
        message:
          "⚠️ Database already has data. Use ?action=clear to reset first, or ?action=force to overwrite.",
        existingUsers: existingUsers.length,
        existingProjects: await db
          .select()
          .from(projects)
          .then((p) => p.length),
      });
    }

    if (action === "force") {
      await clearAllData();
    }

    const summary = await runFullSeed();

    return NextResponse.json({
      message: "✅ All data reset and seeded successfully!",
      ...summary,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        error: "❌ Failed to seed data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// 🧪 POST: unconditional clear + reseed (one-shot reset)
// ============================================================
export async function POST(req: NextRequest) {
  const denied = assertSeedAccess(req);
  if (denied) return denied;

  try {
    await clearAllData();
    const summary = await runFullSeed();

    return NextResponse.json({
      message: "✅ All data reset and seeded successfully via POST!",
      ...summary,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        error: "❌ Failed to seed data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
