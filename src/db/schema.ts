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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const departmentEnum = pgEnum("department", [
  "مهندسی نرم‌افزار",
  "هوش مصنوعی",
  "شبکه‌های کامپیوتری",
  "معماری سیستم‌های کامپیوتری",
  "امنیت اطلاعات",
  "علوم داده",
]);
export const roleEnum = pgEnum("role", ["professor", "student"]);
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
export const messageTypeEnum = pgEnum("message_type", ["text"]);

// Users
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: roleEnum("role").notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

// Projects
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    status: projectStatusEnum("status").notNull().default("open"),
    professorId: integer("professor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    maxMembers: integer("max_members").notNull().default(5),
    deadline: timestamp("deadline"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("projects_professor_id_idx").on(table.professorId),
    index("projects_status_idx").on(table.status),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  applications: many(applications),
  projectMembers: many(projectMembers),
  chatMessages: many(chatMessages),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  professor: one(users, {
    fields: [projects.professorId],
    references: [users.id],
  }),
  applications: many(applications),
  members: many(projectMembers),
  chatMessages: many(chatMessages),
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

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  project: one(projects, {
    fields: [chatMessages.projectId],
    references: [projects.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
}));
