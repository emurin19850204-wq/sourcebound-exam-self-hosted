import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const fakeDb = { insert: () => ({ values: async () => [{ insertId: 42 }] }) };
vi.mock("./db", async () => { const actual = await vi.importActual<typeof import("./db")>("./db"); return { ...actual, getDb: vi.fn(async () => fakeDb) }; });

function context(role: "admin" | "user"): TrpcContext {
  const now = new Date();
  return {
    user: { id: role === "admin" ? 1 : 2, openId: `${role}-test`, name: role, email: `${role}@example.com`, loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("admin authorization", () => {
  it("allows an admin role to create a protected test", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.tests.create({ name: "認可テスト", questionCount: 1, passScore: 60, timeLimitMinutes: 10, attemptLimit: 1, accessMode: "closed", revealMode: "after_submit", targetMaterialIds: [], targetQuestionIds: [], formatDistribution: {}, difficultyDistribution: {} })).resolves.toEqual({ id: 42 });
  });

  it("rejects material creation for a user role before touching the database", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.materials.create({ title: "権限テスト", fileName: "test.txt", fileType: "txt", category: "教材", importance: "medium", pageCount: 1, headings: [], keywords: [], figureDescriptions: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});


it("rejects the main admin-only procedures for a user role", async () => {
  const caller = appRouter.createCaller(context("user"));
  await expect(caller.materials.setUsageStatus({ id: 1, usageStatus: "paused" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.questions.review({ id: 1, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.tests.create({ name: "権限テスト", questionCount: 1, passScore: 60, timeLimitMinutes: 10, attemptLimit: 1, accessMode: "closed", revealMode: "after_submit", targetMaterialIds: [], targetQuestionIds: [], formatDistribution: {}, difficultyDistribution: {} })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.analytics.summary({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.attempts.pendingShortAnswers()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.attempts.gradeShortAnswer({ attemptId: 1, questionId: 1, conclusion: 0, evidence: 0, logic: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
