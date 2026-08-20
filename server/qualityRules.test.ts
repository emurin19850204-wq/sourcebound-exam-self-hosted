import { describe, expect, it } from "vitest";
import { autoGradePoints, canManageRole, classifyExtractionFailure, emptyStateCopy, isPendingShortAnswer, isUnscored, normalizeTestConfig, validateMaterialUpload, validateQuestionShape } from "./qualityRules";

describe("90-point quality rules", () => {
  it("classifies unsupported, oversized, and extraction failures", () => {
    expect(classifyExtractionFailure(new Error("PDFが壊れています"))).toEqual({ reason: "extract", message: "PDFが壊れています" });
    expect(classifyExtractionFailure("unknown").reason).toBe("extract");
    expect(validateMaterialUpload("handout.exe", 100)).toEqual({ ok: false, reason: "unsupported" });
    expect(validateMaterialUpload("handout.pdf", 50 * 1024 * 1024 + 1)).toEqual({ ok: false, reason: "size" });
    expect(validateMaterialUpload("handout.pdf", 1024)).toEqual({ ok: true, extension: "pdf" });
  });

  it("normalizes all test scope fields for create/list persistence", () => {
    const fromCreate = normalizeTestConfig({ targetMaterialIds: [4, 7], targetQuestionIds: [10], formatDistribution: { comparison: 2 }, difficultyDistribution: { advanced: 1 }, availableFrom: new Date("2026-08-20T00:00:00Z"), availableUntil: new Date("2026-08-21T00:00:00Z") });
    const fromList = normalizeTestConfig(fromCreate);
    expect(fromList.targetMaterialIds).toEqual([4, 7]);
    expect(fromList.targetQuestionIds).toEqual([10]);
    expect(fromList.formatDistribution).toEqual({ comparison: 2 });
    expect(fromList.difficultyDistribution).toEqual({ advanced: 1 });
    expect(fromList.availableFrom?.toISOString()).toBe("2026-08-20T00:00:00.000Z");
    expect(fromList.availableUntil?.toISOString()).toBe("2026-08-21T00:00:00.000Z");
  });

  it("keeps short answers pending after submit and removes them after grading", () => {
    expect(isPendingShortAnswer(null, "short_answer", "submitted")).toBe(true);
    expect(isPendingShortAnswer(0, "short_answer", "submitted")).toBe(false);
    expect(isPendingShortAnswer(12, "short_answer", "submitted")).toBe(false);
    expect(isPendingShortAnswer(null, "short_answer", "in_progress")).toBe(false);
  });

  it("keeps short answers ungraded while auto-grading selected answers", () => {
    expect(autoGradePoints("short_answer", "根拠", "説明", 5)).toBeNull();
    expect(autoGradePoints("single", "A", "A", 5)).toBe(5);
    expect(autoGradePoints("single", "A", "B", 5)).toBe(0);
  });

  it("distinguishes ungraded, zero-point, and full-point answers", () => {
    expect(isUnscored(null)).toBe(true);
    expect(isUnscored(0)).toBe(false);
    expect(isUnscored(12)).toBe(false);
  });

  it("covers empty state copy for materials, questions, and tests", () => {
    expect(emptyStateCopy("materials").title).toContain("資料");
    expect(emptyStateCopy("questions").title).toContain("問題");
    expect(emptyStateCopy("tests").title).toContain("テスト");
  });

  it("validates answer and options according to all seven question formats", () => {
    expect(validateQuestionShape("single", ["A", "B", "C", "D"], "A")).toBe(true);
    expect(validateQuestionShape("single", ["A", "B"], "A")).toBe(false);
    expect(validateQuestionShape("multi", ["A", "B", "C"], ["A", "C"])).toBe(true);
    expect(validateQuestionShape("true_false", [], false)).toBe(true);
    expect(validateQuestionShape("ordering", ["A", "B"], ["B", "A"])).toBe(true);
    expect(validateQuestionShape("numeric", [], "12.5")).toBe(true);
    expect(validateQuestionShape("comparison", ["ケースA", "ケースB"], "相違点")).toBe(true);
    expect(validateQuestionShape("short_answer", [], "資料の条件に基づく判断理由を説明する")).toBe(true);
  });

  it("allows only administrators to manage protected operations", () => {
    expect(canManageRole("admin")).toBe(true);
    expect(canManageRole("user")).toBe(false);
  });
});
