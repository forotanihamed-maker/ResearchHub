# پایگاه داده
فناوری: PostgreSQL + Drizzle ORM.
جداول پایه مستندشده: users، projects، applications، projectMembers، chatMessages، projectFiles، adminDepartments، directMessages.
موجودیت‌های اجرای پروژه: tasks، project_milestones، project_activity.
Activity برای Task/Milestone به‌صورت Snapshot طراحی شده و `entityId` آن FK مستقیم نیست.
Migration باید طراحی، بررسی، تأیید، اعمال و سپس Verify شود. تغییر مخرب Production بدون تأیید انسانی مجاز نیست.
