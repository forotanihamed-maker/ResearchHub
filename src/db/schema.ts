/*src\db\shema.ts */
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  primaryKey,
  index,
  uniqueIndex,
  check,
  boolean,
  numeric,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const departmentEnum = pgEnum("department", [
  "مهندسی نرم‌افزار",
  "هوش مصنوعی",
  "شبکه‌های کامپیوتری",
  "معماری سیستم‌های کامپیوتری",
  "امنیت اطلاعات",
  "علوم داده",
]);
export const roleEnum = pgEnum("role", ["professor", "student", "admin"]);
export const professorStatusEnum = pgEnum("professor_status", [
  "pending",
  "approved",
  "rejected",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "open",
  "in_progress",
  "completed",
]);
export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "progress_update",
]);
export const projectCreatorRoleEnum = pgEnum("project_creator_role", [
  "professor",
  "student",
]);
export const projectVisibilityEnum = pgEnum("project_visibility", [
  "public",
  "private",
]);
export const applicationSourceEnum = pgEnum("application_source", [
  "student_application",
  "owner_invite",
]);
// د.۱ — what kind of project this is (thesis / internship / coursework /
// open research). Defaults to "research" to match all pre-existing rows.
export const projectTypeEnum = pgEnum("project_type", [
  "thesis",
  "internship",
  "course",
  "research",
]);
// ج.۲ — file infrastructure: which part of the product a file belongs to.
export const fileContextEnum = pgEnum("file_context", [
  "chat",
  "document",
  "deliverable",
]);
// Tasks — فضای اجرای پروژه، فاز ۱ (ه.۱).
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);
// Milestones — فضای اجرای پروژه، فاز ۲ (ه.۲).
export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "reached",
]);
// Activity — فضای اجرای پروژه، فاز ۳ (ه.۳).
export const activityEntityTypeEnum = pgEnum("activity_entity_type", [
  "task",
  "milestone",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "task_created",
  "task_status_changed",
  "task_deleted",
  "task_reassigned",
  "milestone_created",
  "milestone_reached",
  "milestone_reverted",
  "milestone_deleted",
]);

// AI assistant — مرحله ۱ (مدل داده).
export const issueReportStatusEnum = pgEnum("issue_report_status", [
  "new",
  "triaged",
  "dismissed",
]);
export const errorSourceEnum = pgEnum("error_source", ["server", "client"]);
export const aiTaskSeverityEnum = pgEnum("ai_task_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const aiTaskStatusEnum = pgEnum("ai_task_status", [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
]);
export const aiSourceTypeEnum = pgEnum("ai_source_type", ["report", "error"]);
export const aiActionStatusEnum = pgEnum("ai_action_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
  "executed",
]);

// Users
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: roleEnum("role").notNull(),
    professorStatus: professorStatusEnum("professor_status")
      .notNull()
      .default("approved"),
    avatar: varchar("avatar", { length: 512 }),
    bio: text("bio"),
    department: departmentEnum("department").notNull(),
    university: varchar("university", { length: 255 }),
    // Replaces the old Skills system. Validated array of short interest
    // labels (e.g. "Machine Learning", "Web Security").
    interests: text("interests").array().notNull().default([]),
    // Validated against a fixed list of language names in
    // src/lib/validation.ts — never accepted as free text.
    programmingLanguages: text("programming_languages")
      .array()
      .notNull()
      .default([]),
    username: varchar("username", { length: 30 }).unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

// Departments managed by each admin. An admin only sees/manages users,
// projects and professors belonging to departments assigned here.
export const adminDepartments = pgTable(
  "admin_departments",
  {
    adminId: integer("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    department: departmentEnum("department").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.adminId, table.department] }),
    index("admin_departments_admin_id_idx").on(table.adminId),
  ]
);

// Direct admin <-> professor messages. Project chat remains separate and
// continues to be available to project members.
export const directMessages = pgTable(
  "direct_messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("direct_messages_sender_id_idx").on(table.senderId),
    index("direct_messages_recipient_id_idx").on(table.recipientId),
    index("direct_messages_created_at_idx").on(table.createdAt),
  ]
);

// Projects
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    status: projectStatusEnum("status").notNull().default("open"),
    // د.۱ — project category (thesis/internship/course/research).
    type: projectTypeEnum("type").notNull().default("research"),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creatorRole: projectCreatorRoleEnum("creator_role").notNull(),
    visibility: projectVisibilityEnum("visibility").notNull().default("public"),
    inviteToken: varchar("invite_token", { length: 128 }).unique(),
    // Kept temporarily for backward compatibility with legacy queries/data.
    // New projects use creatorId/creatorRole as the source of truth.
    professorId: integer("professor_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    maxMembers: integer("max_members").notNull().default(5),
    deadline: timestamp("deadline"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("projects_creator_id_idx").on(table.creatorId),
    index("projects_professor_id_idx").on(table.professorId),
    index("projects_status_idx").on(table.status),
    index("projects_visibility_idx").on(table.visibility),
  ]
);

// Applications
export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("pending"),
    source: applicationSourceEnum("source")
      .notNull()
      .default("student_application"),
    message: text("message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("applications_project_id_idx").on(table.projectId),
    index("applications_student_id_idx").on(table.studentId),
  ]
);

// Project Members (approved members)
export const projectMembers = pgTable(
  "project_members",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("project_members_project_id_idx").on(table.projectId),
    index("project_members_user_id_idx").on(table.userId),
  ]
);

// Chat Messages
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    type: messageTypeEnum("type").notNull().default("text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_project_id_idx").on(table.projectId),
    index("chat_messages_created_at_idx").on(table.createdAt),
  ]
);

// Project Files (ج.۲) — documents, chat attachments and final
// deliverables all share this one table, distinguished by `context`.
// Physical bytes live in Vercel Blob (ج.۱); this row only stores the
// resulting URL + metadata.
export const projectFiles = pgTable(
  "project_files",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    uploaderId: integer("uploader_id")
      .notNull()
      .references(() => users.id),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 1024 }).notNull(),
    fileSize: integer("file_size").notNull(),
    context: fileContextEnum("context").notNull(),
    // Only set when context = "chat": links the file to the chat message
    // that shared it, so it can be shown inline in the conversation.
    chatMessageId: integer("chat_message_id").references(
      () => chatMessages.id,
      { onDelete: "cascade" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_files_project_id_idx").on(table.projectId),
    index("project_files_context_idx").on(table.context),
    index("project_files_chat_message_id_idx").on(table.chatMessageId),
  ]
);

// Tasks — فضای اجرای پروژه، فاز ۱ (ه.۱). هسته‌ی اجرای واقعی پروژه؛ هر عضو
// پروژه می‌تواند Task بسازد، فقط مسئول یا مالک پروژه می‌تواند آن را ویرایش
// کند، فقط مالک می‌تواند مسئول را عوض یا Task را حذف کند (Hard Delete).
// «عقب‌افتاده» یک وضعیت ذخیره‌شده نیست — در لحظه‌ی خواندن از روی dueDate و
// status محاسبه می‌شود (همان الگوی overdue در Faculty Overview).
// milestoneId عمداً در این فاز اضافه نشده — در فاز ۲ (نقاط پیشرفت) اضافه
// می‌شود.
export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => users.id),
    // Nullable: a task can exist unassigned. When set, the API layer (not
    // a DB constraint) enforces that it is a current member of the same
    // project.
    assigneeId: integer("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    startDate: timestamp("start_date"),
    dueDate: timestamp("due_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_assignee_id_idx").on(table.assigneeId),
    index("tasks_status_idx").on(table.status),
    index("tasks_due_date_idx").on(table.dueDate),
  ]
);

// Milestones — فضای اجرای پروژه، فاز ۲ (ه.۲). یک وضعیت رسمی از پروژه؛ فقط
// مالک پروژه می‌تواند ایجاد/ویرایش/حذف کند یا وضعیت را به reached تغییر
// دهد (تصمیم محصول — برخلاف Task که هر عضو می‌سازد). بدون milestoneId روی
// tasks و بدون relatedOutput، طبق تصمیم صریح این فاز. بدون فیلد ترتیب
// جداگانه — ترتیب نمایش از createdAt گرفته می‌شود (ساده‌ترین گزینه‌ی
// سازگار با Minimum Change؛ اگر بعداً امکان جابه‌جایی دستی لازم شد، یک
// فیلد order در یک Migration کوچک اضافه می‌شود).
export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: milestoneStatusEnum("status").notNull().default("pending"),
    reachedAt: timestamp("reached_at"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_milestones_project_id_idx").on(table.projectId),
    index("project_milestones_status_idx").on(table.status),
  ]
);

// Activity — فضای اجرای پروژه، فاز ۳ (ه.۳). فقط Task و Milestone (Scope A
// تأییدشده) — چون این دو چیزی هستند که هیچ تاریخچه‌ای ندارند؛ چت/فایل/عضویت
// از قبل timestamp خودشان را دارند. entityId عمداً بدون FK است تا حذف
// Task/Milestone باعث خطا یا یتیم‌شدن این ردیف‌ها نشود؛ entityTitle یک
// Snapshot مستقل از وضعیت فعلی موجودیت است. detail یک رشته‌ی نمایشی کوچک
// است (وضعیت جدید یا نام مسئول جدید)، نه metadata/JSON عمومی. فقط سرور
// می‌نویسد؛ هیچ Endpoint مستقلی برای نوشتن مستقیم توسط کاربر وجود ندارد.
export const projectActivity = pgTable(
  "project_activity",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: integer("actor_id")
      .notNull()
      .references(() => users.id),
    entityType: activityEntityTypeEnum("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    entityTitle: varchar("entity_title", { length: 200 }).notNull(),
    type: activityTypeEnum("type").notNull(),
    detail: varchar("detail", { length: 200 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_activity_project_id_idx").on(table.projectId),
    index("project_activity_created_at_idx").on(table.createdAt),
  ]
);

// AI assistant — مرحله ۱ (مدل داده). فقط ساختار؛ هیچ منطق یا Endpointی به
// این جدول‌ها وصل نیست (مراحل ۲ تا ۶ جداگانه‌اند).
// issue_reports: متن آزاد کاربر؛ هرگز مستقیم به مدل داده نمی‌شود (مرحله ۴).
export const issueReports = pgTable(
  "issue_reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    pagePath: varchar("page_path", { length: 500 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 50 }),
    status: issueReportStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // پشتیبان سقف نرخ مبتنی بر دیتابیس (مرحله ۳): گزارش‌های اخیر هر کاربر.
    index("issue_reports_user_created_idx").on(table.userId, table.createdAt),
    index("issue_reports_status_idx").on(table.status),
  ]
);

// error_events: بدون بدنه‌ی درخواست و کوکی. fingerprint یکتاست تا ادغام
// رکوردهای تکراری (count++) با upsert ممکن باشد.
export const errorEvents = pgTable(
  "error_events",
  {
    id: serial("id").primaryKey(),
    source: errorSourceEnum("source").notNull(),
    route: varchar("route", { length: 255 }).notNull(),
    message: text("message").notNull(),
    stackHash: varchar("stack_hash", { length: 64 }),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    count: integer("count").notNull().default(1),
    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("error_events_fingerprint_uidx").on(table.fingerprint),
    // حذف قدیمی‌ترین‌ها هنگام رسیدن به سقف ردیف (مرحله ۳).
    index("error_events_last_seen_idx").on(table.lastSeenAt),
  ]
);

export const aiTasks = pgTable(
  "ai_tasks",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    severity: aiTaskSeverityEnum("severity").notNull(),
    category: varchar("category", { length: 50 }),
    status: aiTaskStatusEnum("status").notNull().default("open"),
    suggestedFix: text("suggested_fix"),
    // مقیاس ۰ تا ۱ (فرض این مرحله؛ اعتبارسنجی در لایه‌ی برنامه، مرحله ۴).
    confidence: real("confidence"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_tasks_status_severity_idx").on(table.status, table.severity),
    // confidence is a 0..1 score (or NULL); enforced in the DB, not only in zod.
    check(
      "ai_tasks_confidence_range",
      sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 1)`
    ),
  ]
);

// منبع یک تسک: گزارش یا خطا. sourceId عمداً بدون FK است (چندریخت: بسته به
// sourceType به issue_reports یا error_events اشاره می‌کند).
export const aiTaskSources = pgTable(
  "ai_task_sources",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => aiTasks.id, { onDelete: "cascade" }),
    sourceType: aiSourceTypeEnum("source_type").notNull(),
    sourceId: integer("source_id").notNull(),
  },
  (table) => [
    // هر منبع (گزارش یا خطا) حداکثر به یک تسک وصل می‌شود؛ این یکتایی همان
    // تضمین idempotency مرحله ۴ است و جست‌وجوی «آیا قبلاً تسک شده؟» را هم پوشش می‌دهد.
    uniqueIndex("ai_task_sources_source_uidx").on(
      table.sourceType,
      table.sourceId
    ),
    index("ai_task_sources_task_id_idx").on(table.taskId),
  ]
);

// taskId اختیاری و set null: هزینه‌ی مصرف‌شده باید حتی با حذف تسک در سابقه
// بماند، و یک اجرا ممکن است پیش از ساخته‌شدن تسک ثبت شود.
export const aiAnalysisRuns = pgTable(
  "ai_analysis_runs",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").references(() => aiTasks.id, {
      onDelete: "set null",
    }),
    model: varchar("model", { length: 100 }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    // numeric برای پول (نه float). در TypeScript به‌صورت string برمی‌گردد.
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ai_analysis_runs_task_id_idx").on(table.taskId)]
);

// month با قالب YYYY-MM (یک ردیف برای هر ماه). واحد پول: دلار آمریکا، هم‌راستا
// با costUsd.
export const aiBudget = pgTable("ai_budget", {
  id: serial("id").primaryKey(),
  month: varchar("month", { length: 7 }).notNull().unique(),
  monthlyCapUsd: numeric("monthly_cap_usd", { precision: 12, scale: 6 }).notNull(),
  usedUsd: numeric("used_usd", { precision: 12, scale: 6 })
    .notNull()
    .default("0"),
  killSwitch: boolean("kill_switch").notNull().default(false),
});

// هر فراخوانی ابزار، چه مجاز چه ردشده، ثبت می‌شود.
export const aiToolCalls = pgTable(
  "ai_tool_calls",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => aiAnalysisRuns.id, { onDelete: "cascade" }),
    toolName: varchar("tool_name", { length: 100 }).notNull(),
    argsHash: varchar("args_hash", { length: 64 }).notNull(),
    allowed: boolean("allowed").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ai_tool_calls_run_id_idx").on(table.runId)]
);

// فقط جدول (مرحله ۷)؛ هیچ منطقی به آن وصل نیست.
export const aiPendingActions = pgTable(
  "ai_pending_actions",
  {
    id: serial("id").primaryKey(),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    paramsJson: jsonb("params_json").$type<Record<string, unknown>>().notNull(),
    paramsHash: varchar("params_hash", { length: 64 }).notNull(),
    status: aiActionStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    approvedBy: integer("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_pending_actions_status_expires_idx").on(
      table.status,
      table.expiresAt
    ),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects, { relationName: "projectCreator" }),
  legacyProfessorProjects: many(projects, { relationName: "legacyProfessor" }),
  applications: many(applications),
  projectMembers: many(projectMembers),
  chatMessages: many(chatMessages),
  adminDepartments: many(adminDepartments),
  sentDirectMessages: many(directMessages, { relationName: "sender" }),
  receivedDirectMessages: many(directMessages, { relationName: "recipient" }),
  uploadedFiles: many(projectFiles),
  createdTasks: many(tasks, { relationName: "taskCreator" }),
  assignedTasks: many(tasks, { relationName: "taskAssignee" }),
  createdMilestones: many(projectMilestones),
  projectActivity: many(projectActivity),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.creatorId],
    references: [users.id],
    relationName: "projectCreator",
  }),
  professor: one(users, {
    fields: [projects.professorId],
    references: [users.id],
    relationName: "legacyProfessor",
  }),
  applications: many(applications),
  members: many(projectMembers),
  chatMessages: many(chatMessages),
  files: many(projectFiles),
  tasks: many(tasks),
  milestones: many(projectMilestones),
  activity: many(projectActivity),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  project: one(projects, {
    fields: [applications.projectId],
    references: [projects.id],
  }),
  student: one(users, {
    fields: [applications.studentId],
    references: [users.id],
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(
  chatMessages,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [chatMessages.projectId],
      references: [projects.id],
    }),
    sender: one(users, {
      fields: [chatMessages.senderId],
      references: [users.id],
    }),
    attachments: many(projectFiles),
  })
);

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [projectFiles.uploaderId],
    references: [users.id],
  }),
  chatMessage: one(chatMessages, {
    fields: [projectFiles.chatMessageId],
    references: [chatMessages.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [tasks.creatorId],
    references: [users.id],
    relationName: "taskCreator",
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "taskAssignee",
  }),
}));

export const projectMilestonesRelations = relations(
  projectMilestones,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectMilestones.projectId],
      references: [projects.id],
    }),
    creator: one(users, {
      fields: [projectMilestones.createdBy],
      references: [users.id],
    }),
  })
);

export const projectActivityRelations = relations(
  projectActivity,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectActivity.projectId],
      references: [projects.id],
    }),
    actor: one(users, {
      fields: [projectActivity.actorId],
      references: [users.id],
    }),
  })
);

export const adminDepartmentsRelations = relations(
  adminDepartments,
  ({ one }) => ({
    admin: one(users, {
      fields: [adminDepartments.adminId],
      references: [users.id],
    }),
  })
);

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [directMessages.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
}));

// AI assistant — مرحله ۱ (مدل داده).
export const issueReportsRelations = relations(issueReports, ({ one }) => ({
  user: one(users, {
    fields: [issueReports.userId],
    references: [users.id],
  }),
}));

export const aiTasksRelations = relations(aiTasks, ({ many }) => ({
  sources: many(aiTaskSources),
  runs: many(aiAnalysisRuns),
}));

export const aiTaskSourcesRelations = relations(aiTaskSources, ({ one }) => ({
  task: one(aiTasks, {
    fields: [aiTaskSources.taskId],
    references: [aiTasks.id],
  }),
}));

export const aiAnalysisRunsRelations = relations(
  aiAnalysisRuns,
  ({ one, many }) => ({
    task: one(aiTasks, {
      fields: [aiAnalysisRuns.taskId],
      references: [aiTasks.id],
    }),
    toolCalls: many(aiToolCalls),
  })
);

export const aiToolCallsRelations = relations(aiToolCalls, ({ one }) => ({
  run: one(aiAnalysisRuns, {
    fields: [aiToolCalls.runId],
    references: [aiAnalysisRuns.id],
  }),
}));

export const aiPendingActionsRelations = relations(
  aiPendingActions,
  ({ one }) => ({
    approver: one(users, {
      fields: [aiPendingActions.approvedBy],
      references: [users.id],
    }),
  })
);
