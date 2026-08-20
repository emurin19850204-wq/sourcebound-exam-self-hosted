import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { SELFHOST } from "./adapters";
import * as db from "../db";

const COOKIE = "sb_session";
const secret = () => new TextEncoder().encode(SELFHOST.jwtSecret);
const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
};
const verifyPassword = (password: string, stored: string) => {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
};
export const sessionCookieName = COOKIE;
export async function createSession(userId: number) {
  return new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}
export async function userFromRequest(req: Request) {
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  const token = bearer ?? parseCookieHeader(req.headers.cookie ?? "")[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId)) return null;
    const database = await db.getDb();
    if (!database) return null;
    const { users } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    return (await database.select().from(users).where(eq(users.id, userId)).limit(1))[0] ?? null;
  } catch { return null; }
}
export async function registerLocalUser(input: { name: string; email: string; password: string }) {
  if (input.password.length < 10) throw new Error("パスワードは10文字以上にしてください");
  const database = await db.getDb(); if (!database) throw new Error("データベースに接続できません");
  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const existing = await database.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing[0]) throw new Error("このメールアドレスは既に登録されています");
  const result = await database.insert(users).values({ openId: `local_${createHash("sha256").update(input.email).digest("hex").slice(0, 48)}`, name: input.name, email: input.email, loginMethod: "local", passwordHash: hashPassword(input.password), role: "user" });
  return Number(result[0]?.insertId);
}
export async function loginLocalUser(email: string, password: string) {
  const database = await db.getDb(); if (!database) throw new Error("データベースに接続できません");
  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const user = (await database.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) throw new Error("メールアドレスまたはパスワードが正しくありません");
  return user;
}
export function setSession(res: Response, token: string) { res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: SELFHOST.publicBaseUrl.startsWith("https://"), maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" }); }
export function clearSession(res: Response) { res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure: SELFHOST.publicBaseUrl.startsWith("https://"), path: "/" }); }
