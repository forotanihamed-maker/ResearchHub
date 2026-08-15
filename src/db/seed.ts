/*src\db\seed.ts */
import "dotenv/config";
import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 شروع مقداردهی اولیه دیتابیس...");

  const professorPassword = await bcrypt.hash("professor123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  console.log("👨‍🏫 ایجاد اساتید...");
  await db.insert(users).values([
    {
      name: "دکتر علی محمدی",
      email: "ali.mohammadi@university.edu",
      password: professorPassword,
      role: "professor",
      department: "مهندسی نرم‌افزار",
      university: "دانشگاه علم و صنعت ایران",
      bio: "عضو هیئت علمی دانشکده مهندسی کامپیوتر دانشگاه علم و صنعت",
      interests: ["Software Architecture", "Cloud Systems"],
      programmingLanguages: ["JavaScript", "TypeScript", "Go"],
    },
    {
      name: "دکتر سارا احمدی",
      email: "sara.ahmadi@university.edu",
      password: professorPassword,
      role: "professor",
      department: "هوش مصنوعی",
      university: "دانشگاه علم و صنعت ایران",
      bio: "متخصص یادگیری ماشین و هوش مصنوعی",
      interests: ["Machine Learning", "Computer Vision"],
      programmingLanguages: ["Python", "C++"],
    },
  ]);

  console.log("👨‍🎓 ایجاد دانشجویان...");
  await db.insert(users).values([
    {
      name: "رضا کریمی",
      email: "reza.karimi@student.edu",
      password: studentPassword,
      role: "student",
      department: "مهندسی نرم‌افزار",
      university: "دانشگاه علم و صنعت ایران",
      bio: "دانشجوی کارشناسی ارشد مهندسی نرم‌افزار",
      interests: ["Web Development", "Distributed Systems"],
      programmingLanguages: ["JavaScript", "TypeScript"],
    },
    {
      name: "مریم حسینی",
      email: "maryam.hosseini@student.edu",
      password: studentPassword,
      role: "student",
      department: "شبکه‌های کامپیوتری",
      university: "دانشگاه علم و صنعت ایران",
      bio: "دانشجوی کارشناسی شبکه‌های کامپیوتری",
      interests: ["Network Security"],
      programmingLanguages: ["Python", "C"],
    },
    {
      name: "امیر رضایی",
      email: "amir.rezaei@student.edu",
      password: studentPassword,
      role: "student",
      department: "امنیت اطلاعات",
      university: "دانشگاه علم و صنعت ایران",
      bio: "دانشجوی دکتری امنیت اطلاعات",
      interests: ["Cybersecurity", "Cryptography"],
      programmingLanguages: ["Python", "Rust"],
    },
  ]);

  console.log("✅ مقداردهی اولیه با موفقیت انجام شد!");
  console.log("");
  console.log("🔐 اطلاعات ورود:");
  console.log("👨‍🏫 ali.mohammadi@university.edu / professor123");
  console.log("👨‍🎓 reza.karimi@student.edu / student123");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ خطا:", err);
  process.exit(1);
});
