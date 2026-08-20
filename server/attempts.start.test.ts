import { describe, expect, it, vi } from "vitest";

const { fakeDb, questionRows } = vi.hoisted(() => {
  const rows = [
    { id: 1, status: "approved", options: ["A", "B"] },
    { id: 2, status: "draft", options: ["A", "B"] },
    { id: 3, status: "rejected", options: ["A", "B"] },
  ];
  const db = {
    select: () => ({ from: async () => rows }),
    insert: () => ({ values: async () => [{ insertId: 77 }] }),
    update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { Object.assign(rows[0], values); } }) }),
  };
  return { fakeDb: db, questionRows: rows };
});

vi.mock("./db", () => ({
  getDb: vi.fn(async () => fakeDb),
  createMaterial: vi.fn(),
  createQuestion: vi.fn(),
  createQuestionsDraft: vi.fn(),
  listMaterials: vi.fn(),
  listQuestions: vi.fn(async () => questionRows),
  listTests: vi.fn(),
  updateQuestionStatus: vi.fn(),
}));

describe("attempts.start approved-only delivery", () => {
  it("does not return draft or rejected question IDs", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 9, openId: "candidate", role: "user", name: "Candidate", email: null, loginMethod: "test", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as any,
      res: {} as any,
    });
    const result = await caller.attempts.start({ testId: 1, questionIds: questionRows.map((row) => row.id), recentQuestionIds: [] });
    expect(result.questionIds).toEqual([1]);
  });

  it("persists an edited type and exposes it on list reload", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", email: null, loginMethod: "test", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as any, res: {} as any });
    await caller.questions.edit({ id: 1, type: "comparison", difficulty: "advanced", prompt: "edited", options: [], answer: "A", explanation: "why", evidence: [{ material: "manual", page: 2, heading: "rule" }], tags: ["edited"], points: 12 });
    const reloaded = await caller.questions.list();
    expect(reloaded[0]?.type).toBe("comparison");
    expect(reloaded[0]?.difficulty).toBe("advanced");
  });
});
