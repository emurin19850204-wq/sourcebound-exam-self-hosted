import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

let storedTest: Record<string, unknown> | null = null;
const fakeDb = {
  insert: () => ({ values: async (value: Record<string, unknown>) => { storedTest = { id: 1, ...value }; return [{ insertId: 1 }]; } }),
  select: () => ({ from: async () => storedTest ? [storedTest] : [] }),
};
vi.mock("./db", async () => { const actual = await vi.importActual<typeof import("./db")>("./db"); return { ...actual, getDb: vi.fn(async () => fakeDb), listTests: vi.fn(async () => storedTest ? [storedTest] : []) }; });

function adminContext(): TrpcContext {
  const now = new Date();
  return { user: { id: 1, openId: "admin-config-test", name: "Admin", email: "admin@example.com", loginMethod: "test", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("tests.create → tests.list", () => {
  it("preserves scope, distributions, and availability dates", async () => {
    storedTest = null;
    const caller = appRouter.createCaller(adminContext());
    await caller.tests.create({ name: "設定保持テスト", questionCount: 5, passScore: 70, timeLimitMinutes: 30, attemptLimit: 2, accessMode: "specified", revealMode: "after_submit", targetMaterialIds: [4, 7], targetQuestionIds: [10, 11], formatDistribution: { comparison: 2, short_answer: 1 }, difficultyDistribution: { standard: 3 }, availableFrom: new Date("2026-08-20T00:00:00Z"), availableUntil: new Date("2026-08-30T00:00:00Z") });
    const rows = await caller.tests.list();
    expect(rows[0]?.targetMaterialIds).toEqual([4, 7]);
    expect(rows[0]?.targetQuestionIds).toEqual([10, 11]);
    expect(rows[0]?.formatDistribution).toEqual({ comparison: 2, short_answer: 1 });
    expect(rows[0]?.difficultyDistribution).toEqual({ standard: 3 });
    expect(rows[0]?.availableFrom?.toISOString()).toBe("2026-08-20T00:00:00.000Z");
    expect(rows[0]?.availableUntil?.toISOString()).toBe("2026-08-30T00:00:00.000Z");
  });
});
