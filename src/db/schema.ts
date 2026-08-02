import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  primaryKey,
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
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
  avatar: varchar("avatar", { length: 512 }),
  bio: text("bio"),
  department: departmentEnum("department").notNull(),
  university: varchar("university", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Skills
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

// User Skills (junction)
export const userSkills = pgTable(
  "user_skills",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })]
);

// Projects
export const projects = pgTable("projects", {
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
});

// Project Required Skills (junction)
export const projectSkills = pgTable(
  "project_skills",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.skillId] })]
);

// Applications
export const applications = pgTable("applications", {
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
});

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
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })]
);

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
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
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userSkills: many(userSkills),
  ownedProjects: many(projects),
  applications: many(applications),
  projectMembers: many(projectMembers),
  chatMessages: many(chatMessages),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  userSkills: many(userSkills),
  projectSkills: many(projectSkills),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, { fields: [userSkills.userId], references: [users.id] }),
  skill: one(skills, { fields: [userSkills.skillId], references: [skills.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  professor: one(users, {
    fields: [projects.professorId],
    references: [users.id],
  }),
  projectSkills: many(projectSkills),
  applications: many(applications),
  members: many(projectMembers),
  chatMessages: many(chatMessages),
}));

export const projectSkillsRelations = relations(projectSkills, ({ one }) => ({
  project: one(projects, {
    fields: [projectSkills.projectId],
    references: [projects.id],
  }),
  skill: one(skills, {
    fields: [projectSkills.skillId],
    references: [skills.id],
  }),
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
