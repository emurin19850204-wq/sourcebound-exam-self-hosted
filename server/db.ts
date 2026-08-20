import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, materials, questions, tests } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listMaterials() { const db = await getDb(); return db ? db.select().from(materials).orderBy(desc(materials.createdAt)) : []; }
export async function listQuestions() { const db = await getDb(); return db ? db.select().from(questions).orderBy(desc(questions.createdAt)) : []; }
export async function listTests() { const db = await getDb(); return db ? db.select().from(tests).orderBy(desc(tests.createdAt)) : []; }
export async function createMaterial(input: typeof materials.$inferInsert) { const db = await getDb(); if (!db) return null; const result = await db.insert(materials).values(input); return result[0]?.insertId ?? null; }
export async function createQuestion(input: typeof questions.$inferInsert) { const db = await getDb(); if (!db) return null; const result = await db.insert(questions).values(input); return result[0]?.insertId ?? null; }
export async function createQuestionsDraft(inputs: Array<typeof questions.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("データベースに接続できません"); return db.transaction(async (tx) => { const ids: number[] = []; for (const input of inputs) { const result = await tx.insert(questions).values(input); const id = result[0]?.insertId; if (!id) throw new Error("問題案の保存に失敗しました"); ids.push(id); } return ids; }); }
export async function updateQuestionStatus(id: number, status: "draft" | "approved" | "rejected" | "archived", approvedBy?: number) { const db = await getDb(); if (!db) return false; await db.update(questions).set({ status, approvedBy }).where(eq(questions.id, id)); return true; }
