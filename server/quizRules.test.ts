import { describe, expect, it } from "vitest";
import { filterApprovedQuestionIds, isQuestionPublic, mergeQuestionType } from "./quizRules";

describe("question review visibility", () => {
  it("excludes draft and rejected questions from candidate delivery", () => {
    const rows = [
      { id: 1, status: "approved" as const },
      { id: 2, status: "draft" as const },
      { id: 3, status: "rejected" as const },
    ];
    expect(filterApprovedQuestionIds([1, 2, 3], rows)).toEqual([1]);
    expect(isQuestionPublic("approved")).toBe(true);
    expect(isQuestionPublic("draft")).toBe(false);
    expect(isQuestionPublic("rejected")).toBe(false);
  });

  it("keeps an edited question type after the list is reloaded", () => {
    const before = { id: 12, type: "single" as const };
    const updated = mergeQuestionType(before, "comparison");
    const reloaded = { ...updated };
    expect(reloaded.type).toBe("comparison");
  });
});
