export const SUPPORTED_MATERIAL_EXTENSIONS = new Set(["pdf", "docx", "pptx", "txt", "md", "csv", "png", "jpg", "jpeg"]);

export function classifyExtractionFailure(error: unknown) { return { reason: "extract" as const, message: error instanceof Error && error.message ? error.message : "資料の抽出に失敗しました" }; }

export function validateMaterialUpload(fileName: string, sizeBytes: number, maxBytes = 50 * 1024 * 1024) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_MATERIAL_EXTENSIONS.has(extension)) return { ok: false as const, reason: "unsupported" as const };
  if (sizeBytes > maxBytes) return { ok: false as const, reason: "size" as const };
  return { ok: true as const, extension };
}

export function normalizeTestConfig(input: {
  targetMaterialIds?: number[]; targetQuestionIds?: number[]; formatDistribution?: Record<string, number>; difficultyDistribution?: Record<string, number>; availableFrom?: Date | null; availableUntil?: Date | null;
}) {
  return {
    targetMaterialIds: input.targetMaterialIds ?? [],
    targetQuestionIds: input.targetQuestionIds ?? [],
    formatDistribution: input.formatDistribution ?? {},
    difficultyDistribution: input.difficultyDistribution ?? {},
    availableFrom: input.availableFrom ?? null,
    availableUntil: input.availableUntil ?? null,
  };
}

export function canManageRole(role: "admin" | "user") { return role === "admin"; }

export function isUnscored(points: number | null) { return points === null; }

export function isPendingShortAnswer(points: number | null, questionType: string, attemptStatus: string) { return points === null && questionType === "short_answer" && attemptStatus === "submitted"; }

export function autoGradePoints(type: string, expected: unknown, actual: unknown, maxPoints: number) {
  if (type === "short_answer") return null;
  return JSON.stringify(expected) === JSON.stringify(actual) ? maxPoints : 0;
}

export function emptyStateCopy(kind: "materials" | "questions" | "tests") {
  if (kind === "materials") return { title: "資料はまだありません", body: "資料を追加すると、AI問題生成に利用できます。" };
  if (kind === "questions") return { title: "承認済み問題はまだありません", body: "資料を登録して問題案を生成し、承認してください。" };
  return { title: "テストはまだありません", body: "承認済み問題を登録してから、テストを作成してください。" };
}


export function validateQuestionShape(type: string, options: unknown, answer: unknown) {
  const list = Array.isArray(options) ? options.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
  if (type === "single") return list.length === 4 && typeof answer === "string" && list.includes(answer);
  if (type === "multi") return list.length >= 2 && Array.isArray(answer) && answer.length > 0 && answer.every((value) => typeof value === "string" && list.includes(value));
  if (type === "true_false") return answer === true || answer === false || answer === "true" || answer === "false";
  if (type === "ordering") return list.length >= 2 && Array.isArray(answer) && answer.length === list.length && answer.every((value) => typeof value === "string" && list.includes(value));
  if (type === "numeric") return typeof answer === "number" || (typeof answer === "string" && answer.trim().length > 0 && Number.isFinite(Number(answer)));
  if (type === "comparison") return typeof answer === "string" && answer.trim().length > 0;
  if (type === "short_answer") return typeof answer === "string" && answer.trim().length > 0;
  return false;
}
