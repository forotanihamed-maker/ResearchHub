import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  skills,
  projects,
  projectSkills,
  applications,
  projectMembers,
  chatMessages,
  userSkills,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { auditLog } from "@/lib/auditLog";
import { getClientIp } from "@/lib/rateLimit";

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
// 📌 نگاشت گرایش‌ها به مهارت‌های مرتبط
// ============================================================
const DEPARTMENT_SKILLS_MAP: Record<string, string[]> = {
  "مهندسی نرم‌افزار": [
    "React.js",
    "Next.js",
    "Node.js",
    "Express.js",
    "TypeScript",
    "JavaScript",
    "Python",
    "Django",
    "Spring Boot",
    "Java",
    "Docker",
    "Kubernetes",
    "CI/CD",
    "Git",
    "Microservices",
    "REST API",
    "GraphQL",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "AWS",
  ],
  "هوش مصنوعی": [
    "Python",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "Scikit-learn",
    "Pandas",
    "NumPy",
    "OpenCV",
    "NLP",
    "Computer Vision",
    "Deep Learning",
    "Machine Learning",
    "Reinforcement Learning",
    "Transformers",
    "BERT",
    "LLM",
    "LangChain",
    "Hugging Face",
    "Data Science",
    "Statistics",
  ],
  "شبکه‌های کامپیوتری": [
    "Cisco",
    "CCNA",
    "TCP/IP",
    "OSPF",
    "BGP",
    "VLAN",
    "Network Security",
    "Firewall",
    "VPN",
    "SDN",
    "Wireshark",
    "Routing Protocols",
    "IPv6",
    "DNS",
    "DHCP",
    "Load Balancing",
    "Network Automation",
    "Ansible",
  ],
  "معماری سیستم‌های کامپیوتری": [
    "Verilog",
    "VHDL",
    "FPGA",
    "Computer Architecture",
    "Digital Design",
    "RISC-V",
    "ARM",
    "Assembly",
    "C",
    "C++",
    "Embedded Systems",
    "RTOS",
    "Arduino",
    "Raspberry Pi",
    "IoT",
    "SPI",
    "I2C",
    "UART",
  ],
  "امنیت اطلاعات": [
    "Cybersecurity",
    "Penetration Testing",
    "Kali Linux",
    "Metasploit",
    "Burp Suite",
    "OWASP",
    "Cryptography",
    "RSA",
    "AES",
    "SSL/TLS",
    "Network Security",
    "SIEM",
    "Incident Response",
    "Malware Analysis",
    "Reverse Engineering",
    "Risk Assessment",
    "ISO 27001",
  ],
  "علوم داده": [
    "Python",
    "R",
    "SQL",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Seaborn",
    "Plotly",
    "Tableau",
    "Power BI",
    "Machine Learning",
    "Scikit-learn",
    "TensorFlow",
    "Data Visualization",
    "Statistics",
    "Probability",
    "Big Data",
    "Apache Spark",
    "PySpark",
    "Data Warehousing",
    "ETL",
    "Airflow",
    "Kafka",
  ],
};

// ============================================================
// 📌 کاربران تستی جدید
// ============================================================
const DEMO_USERS = [
  {
    name: "دکتر علی محمدی",
    email: "ali.mohammadi@university.edu",
    password: "professor123",
    role: "professor" as const,
    department: "هوش مصنوعی",
    university: "دانشگاه علم و صنعت ایران",
    bio: "استاد گروه هوش مصنوعی، علاقه‌مند به یادگیری عمیق و بینایی ماشین",
  },
  {
    name: "دکتر سارا حسینی",
    email: "sara.hosseini@university.edu",
    password: "professor123",
    role: "professor" as const,
    department: "مهندسی نرم‌افزار",
    university: "دانشگاه علم و صنعت ایران",
    bio: "استاد گروه مهندسی نرم‌افزار، تخصص در معماری سیستم‌های توزیع شده",
  },
  {
    name: "رضا کریمی",
    email: "reza.karimi@student.edu",
    password: "student123",
    role: "student" as const,
    department: "هوش مصنوعی",
    university: "دانشگاه علم و صنعت ایران",
    bio: "دانشجوی کارشناسی ارشد هوش مصنوعی، علاقه‌مند به پردازش زبان طبیعی",
  },
  {
    name: "مریم رضایی",
    email: "maryam.rezaei@student.edu",
    password: "student123",
    role: "student" as const,
    department: "مهندسی نرم‌افزار",
    university: "دانشگاه علم و صنعت ایران",
    bio: "دانشجوی کارشناسی ارشد مهندسی نرم‌افزار، علاقه‌مند به توسعه وب و اپلیکیشن",
  },
  {
    name: "امیرحسین موسوی",
    email: "amir.mousavi@student.edu",
    password: "student123",
    role: "student" as const,
    department: "شبکه‌های کامپیوتری",
    university: "دانشگاه علم و صنعت ایران",
    bio: "دانشجوی کارشناسی ارشد شبکه، علاقه‌مند به امنیت شبکه و SDN",
  },
];

// ============================================================
// 📌 پروژه‌های نمونه جدید
// ============================================================
const DEMO_PROJECTS = [
  {
    title: "سیستم تشخیص چهره با یادگیری عمیق",
    description:
      "طراحی و پیاده‌سازی یک سیستم تشخیص چهره با استفاده از شبکه‌های عصبی کانولوشنی. این پروژه شامل جمع‌آوری داده، آموزش مدل و پیاده‌سازی روی وب‌کم است.",
    status: "open" as const,
    maxMembers: 4,
    deadline: new Date("2026-10-15"),
    skills: ["Python", "TensorFlow", "OpenCV", "Deep Learning"],
  },
  {
    title: "پلتفرم مدیریت پروژه‌های دانشجویی",
    description:
      "ساخت یک پلتفرم وب کامل برای مدیریت پروژه‌های دانشجویی با قابلیت‌های: ثبت پروژه، ارسال درخواست، چت گروهی و داشبورد پیشرفته.",
    status: "open" as const,
    maxMembers: 5,
    deadline: new Date("2026-08-30"),
    skills: ["React.js", "Next.js", "PostgreSQL", "Tailwind CSS"],
  },
  {
    title: "تحلیل احساسات در متون فارسی با BERT",
    description:
      "پیاده‌سازی یک مدل تحلیل احساسات برای متون فارسی با استفاده از مدل BERT فارسی. نیاز به جمع‌آوری داده، آموزش و ارزیابی مدل.",
    status: "open" as const,
    maxMembers: 3,
    deadline: new Date("2026-09-20"),
    skills: ["Python", "Transformers", "NLP", "PyTorch"],
  },
  {
    title: "سیستم تشخیص نفوذ در شبکه با یادگیری ماشین",
    description:
      "طراحی یک سیستم تشخیص نفوذ با استفاده از الگوریتم‌های یادگیری ماشین برای شناسایی حملات شبکه‌ای. نیاز به تحلیل داده‌های ترافیک شبکه.",
    status: "open" as const,
    maxMembers: 4,
    deadline: new Date("2026-11-01"),
    skills: ["Python", "Machine Learning", "Network Security", "Scikit-learn"],
  },
  {
    title: "طراحی و شبیه‌سازی پردازنده RISC-V",
    description:
      "طراحی یک پردازنده ساده RISC-V با استفاده از Verilog و شبیه‌سازی آن. شامل پیاده‌سازی pipeline و حافظه کش.",
    status: "open" as const,
    maxMembers: 3,
    deadline: new Date("2026-10-01"),
    skills: ["Verilog", "Computer Architecture", "RISC-V", "FPGA"],
  },
];

// ============================================================
// 🚀 GET: Reset and Seed Everything
// ============================================================
export async function GET(req: NextRequest) {
  const denied = assertSeedAccess(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ============================================================
    // 1. پاک کردن همه داده‌ها
    // ============================================================
    if (action === "clear") {
      await db.delete(chatMessages);
      await db.delete(projectMembers);
      await db.delete(applications);
      await db.delete(projectSkills);
      await db.delete(projects);
      await db.delete(userSkills);
      await db.delete(users);
      await db.delete(skills);

      return NextResponse.json({
        message:
          "✅ All data cleared successfully (users, projects, skills, applications, chat, members)",
      });
    }

    // ============================================================
    // 2. بررسی اینکه آیا قبلاً داده‌هایی وجود دارد
    // ============================================================
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

    // ============================================================
    // 3. جمع‌آوری همه مهارت‌ها و درج در دیتابیس
    // ============================================================
    const allSkillNames = new Set<string>();
    for (const skillsList of Object.values(DEPARTMENT_SKILLS_MAP)) {
      for (const skill of skillsList) {
        allSkillNames.add(skill);
      }
    }

    // درج مهارت‌ها
    const skillMap: Record<string, number> = {};
    for (const name of allSkillNames) {
      const [result] = await db
        .insert(skills)
        .values({ name })
        .onConflictDoNothing()
        .returning({ id: skills.id });
      if (result) {
        skillMap[name] = result.id;
      } else {
        // اگر مهارت قبلاً وجود داشت، آن را پیدا کن
        const [existing] = await db
          .select({ id: skills.id })
          .from(skills)
          .where(sql`${skills.name} = ${name}`);
        if (existing) {
          skillMap[name] = existing.id;
        }
      }
    }

    // ============================================================
    // 4. ساخت کاربران تستی جدید (با رفع خطای Enum)
    // ============================================================
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
          department: sql`${userData.department}`,
          university: userData.university,
          bio: userData.bio,
        })
        .returning({ id: users.id });
      userMap[userData.email] = user.id;
    }

    // ============================================================
    // 5. اضافه کردن مهارت‌ها به کاربران (userSkills)
    // ============================================================
    for (const userData of DEMO_USERS) {
      const userId = userMap[userData.email];
      const departmentSkills = DEPARTMENT_SKILLS_MAP[userData.department] || [];
      for (const skillName of departmentSkills) {
        const skillId = skillMap[skillName];
        if (skillId) {
          await db
            .insert(userSkills)
            .values({ userId, skillId })
            .onConflictDoNothing();
        }
      }
    }

    // ============================================================
    // 6. ساخت پروژه‌های نمونه جدید
    // ============================================================
    const projectMap: Record<string, number> = {};
    for (const projectData of DEMO_PROJECTS) {
      // استاد اول (دکتر علی محمدی) را به عنوان استاد پروژه انتخاب کن
      const professorId = userMap["ali.mohammadi@university.edu"];

      const [project] = await db
        .insert(projects)
        .values({
          title: projectData.title,
          description: projectData.description,
          status: projectData.status,
          professorId: professorId,
          maxMembers: projectData.maxMembers,
          deadline: projectData.deadline,
        })
        .returning({ id: projects.id });

      projectMap[projectData.title] = project.id;

      // اضافه کردن مهارت‌های پروژه
      for (const skillName of projectData.skills) {
        const skillId = skillMap[skillName];
        if (skillId) {
          await db
            .insert(projectSkills)
            .values({ projectId: project.id, skillId })
            .onConflictDoNothing();
        }
      }

      // اضافه کردن استاد به عنوان عضو پروژه
      await db
        .insert(projectMembers)
        .values({ projectId: project.id, userId: professorId })
        .onConflictDoNothing();
    }

    // ============================================================
    // 7. ساخت برخی درخواست‌های نمونه
    // ============================================================
    const student1Id = userMap["reza.karimi@student.edu"];
    const student2Id = userMap["maryam.rezaei@student.edu"];
    const student3Id = userMap["amir.mousavi@student.edu"];

    // درخواست اول: رضا کریمی برای پروژه هوش مصنوعی
    if (projectMap["سیستم تشخیص چهره با یادگیری عمیق"] && student1Id) {
      await db.insert(applications).values({
        projectId: projectMap["سیستم تشخیص چهره با یادگیری عمیق"],
        studentId: student1Id,
        status: "pending",
        message:
          "سلام استاد، من قبلاً روی پروژه‌های تشخیص چهره کار کرده‌ام و علاقه‌مند به همکاری هستم.",
      });
    }

    // درخواست دوم: مریم رضایی برای پروژه پلتفرم
    if (projectMap["پلتفرم مدیریت پروژه‌های دانشجویی"] && student2Id) {
      await db.insert(applications).values({
        projectId: projectMap["پلتفرم مدیریت پروژه‌های دانشجویی"],
        studentId: student2Id,
        status: "approved",
        message:
          "سلام استاد، من تجربه کار با Next.js و Tailwind دارم و می‌توانم کمک کنم.",
      });
      // اضافه کردن به اعضای پروژه
      await db.insert(projectMembers).values({
        projectId: projectMap["پلتفرم مدیریت پروژه‌های دانشجویی"],
        userId: student2Id,
      });
    }

    // درخواست سوم: امیرحسین موسوی برای پروژه تحلیل احساسات
    if (projectMap["تحلیل احساسات در متون فارسی با BERT"] && student3Id) {
      await db.insert(applications).values({
        projectId: projectMap["تحلیل احساسات در متون فارسی با BERT"],
        studentId: student3Id,
        status: "pending",
        message:
          "سلام استاد، من پایان‌نامه کارشناسی‌ارشد خود را در حوزه NLP انجام داده‌ام.",
      });
    }

    // درخواست چهارم: رضا کریمی برای پروژه تحلیل احساسات
    if (projectMap["تحلیل احساسات در متون فارسی با BERT"] && student1Id) {
      await db.insert(applications).values({
        projectId: projectMap["تحلیل احساسات در متون فارسی با BERT"],
        studentId: student1Id,
        status: "pending",
        message:
          "سلام استاد، من به حوزه NLP علاقه‌مند هستم و با PyTorch کار کرده‌ام.",
      });
    }

    // ============================================================
    // 8. خروجی نهایی
    // ============================================================
    const finalUsers = await db.select().from(users);
    const finalProjects = await db.select().from(projects);
    const finalSkills = await db.select().from(skills);
    const finalApplications = await db.select().from(applications);

    return NextResponse.json({
      message: "✅ All data reset and seeded successfully!",
      users: {
        total: finalUsers.length,
        list: finalUsers.map((u) => ({
          name: u.name,
          email: u.email,
          role: u.role,
        })),
      },
      skills: {
        total: finalSkills.length,
        count: finalSkills.length,
      },
      projects: {
        total: finalProjects.length,
        list: finalProjects.map((p) => ({ title: p.title, status: p.status })),
      },
      applications: {
        total: finalApplications.length,
      },
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
// 🧪 POST: Reset and Seed (یک‌جا)
// ============================================================
export async function POST(req: NextRequest) {
  const denied = assertSeedAccess(req);
  if (denied) return denied;

  try {
    // 1. پاک کردن همه داده‌ها
    await db.delete(chatMessages);
    await db.delete(projectMembers);
    await db.delete(applications);
    await db.delete(projectSkills);
    await db.delete(projects);
    await db.delete(userSkills);
    await db.delete(users);
    await db.delete(skills);

    // 2. جمع‌آوری همه مهارت‌ها
    const allSkillNames = new Set<string>();
    for (const skillsList of Object.values(DEPARTMENT_SKILLS_MAP)) {
      for (const skill of skillsList) {
        allSkillNames.add(skill);
      }
    }

    // 3. درج مهارت‌ها
    const skillMap: Record<string, number> = {};
    for (const name of allSkillNames) {
      const [result] = await db
        .insert(skills)
        .values({ name })
        .onConflictDoNothing()
        .returning({ id: skills.id });
      if (result) {
        skillMap[name] = result.id;
      }
    }

    // 4. ساخت کاربران
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
          department: sql`${userData.department}`,
          university: userData.university,
          bio: userData.bio,
        })
        .returning({ id: users.id });
      userMap[userData.email] = user.id;
    }

    // 5. اضافه کردن مهارت‌های کاربران
    for (const userData of DEMO_USERS) {
      const userId = userMap[userData.email];
      const departmentSkills = DEPARTMENT_SKILLS_MAP[userData.department] || [];
      for (const skillName of departmentSkills) {
        const skillId = skillMap[skillName];
        if (skillId) {
          await db
            .insert(userSkills)
            .values({ userId, skillId })
            .onConflictDoNothing();
        }
      }
    }

    // 6. ساخت پروژه‌ها
    const professorId = userMap["ali.mohammadi@university.edu"];
    for (const projectData of DEMO_PROJECTS) {
      const [project] = await db
        .insert(projects)
        .values({
          title: projectData.title,
          description: projectData.description,
          status: projectData.status,
          professorId: professorId,
          maxMembers: projectData.maxMembers,
          deadline: projectData.deadline,
        })
        .returning({ id: projects.id });

      for (const skillName of projectData.skills) {
        const skillId = skillMap[skillName];
        if (skillId) {
          await db
            .insert(projectSkills)
            .values({ projectId: project.id, skillId })
            .onConflictDoNothing();
        }
      }

      await db
        .insert(projectMembers)
        .values({ projectId: project.id, userId: professorId })
        .onConflictDoNothing();
    }

    return NextResponse.json({
      message: "✅ All data reset and seeded successfully via POST!",
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
