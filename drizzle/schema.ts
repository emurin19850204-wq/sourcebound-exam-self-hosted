import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 32 }).notNull(),
  category: mysqlEnum("category", ["教材", "マニュアル", "規程", "ケース記録", "参考資料"]).default("教材").notNull(),
  importance: mysqlEnum("importance", ["high", "medium", "low"]).default("medium").notNull(),
  usageStatus: mysqlEnum("usageStatus", ["active", "paused"]).default("active").notNull(),
  pageCount: int("pageCount").default(1).notNull(),
  sourceUrl: text("sourceUrl"),
  extractedText: text("extractedText"),
  headings: json("headings"),
  keywords: json("keywords"),
  figureDescriptions: json("figureDescriptions"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  prompt: text("prompt").notNull(),
  type: mysqlEnum("type", ["single", "multi", "true_false", "ordering", "numeric", "comparison", "short_answer"]).notNull(),
  options: json("options"),
  answer: json("answer").notNull(),
  explanation: text("explanation").notNull(),
  evidence: json("evidence").notNull(),
  difficulty: mysqlEnum("difficulty", ["basic", "standard", "advanced"]).default("standard").notNull(),
  points: int("points").default(10).notNull(),
  tags: json("tags"),
  status: mysqlEnum("status", ["draft", "approved", "rejected", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy").notNull(),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tests = mysqlTable("tests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  questionCount: int("questionCount").default(10).notNull(),
  passScore: int("passScore").default(70).notNull(),
  timeLimitMinutes: int("timeLimitMinutes").default(30).notNull(),
  attemptLimit: int("attemptLimit").default(1).notNull(),
  accessMode: mysqlEnum("accessMode", ["closed", "specified", "timed"]).default("closed").notNull(),
  revealMode: mysqlEnum("revealMode", ["immediate", "after_submit", "after_period"]).default("after_submit").notNull(),
  targetMaterialIds: json("targetMaterialIds").default([]),
  targetQuestionIds: json("targetQuestionIds").default([]),
  formatDistribution: json("formatDistribution").default({}),
  difficultyDistribution: json("difficultyDistribution").default({}),
  availableFrom: timestamp("availableFrom"),
  availableUntil: timestamp("availableUntil"),
  status: mysqlEnum("status", ["draft", "published", "closed"]).default("draft").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const testQuestions = mysqlTable("testQuestions", {
  id: int("id").autoincrement().primaryKey(),
  testId: int("testId").notNull(),
  questionId: int("questionId").notNull(),
  sortOrder: int("sortOrder").notNull(),
});

export const attempts = mysqlTable("attempts", {
  id: int("id").autoincrement().primaryKey(),
  testId: int("testId").notNull(),
  userId: int("userId").notNull(),
  score: int("score"),
  status: mysqlEnum("status", ["in_progress", "submitted", "graded"]).default("in_progress").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
});

export const attemptAnswers = mysqlTable("attemptAnswers", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull(),
  questionId: int("questionId").notNull(),
  answer: json("answer"),
  points: int("points"),
  graderComment: text("graderComment"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const activityEvents = mysqlTable("activityEvents", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull(),
  questionId: int("questionId"),
  eventType: varchar("eventType", { length: 40 }).notNull(),
  durationMs: int("durationMs"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Test = typeof tests.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
