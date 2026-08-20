export type QuestionStatus = "draft" | "approved" | "rejected" | "archived";

export function filterApprovedQuestionIds(
  requestedIds: number[],
  rows: Array<{ id: number; status: QuestionStatus }>,
): number[] {
  const approved = new Set(rows.filter((row) => row.status === "approved").map((row) => row.id));
  return requestedIds.filter((id) => approved.has(id));
}

export function isQuestionPublic(status: QuestionStatus): boolean {
  return status === "approved";
}

export function mergeQuestionType<T extends { type: string }>(row: T, nextType: T["type"]): T {
  return { ...row, type: nextType };
}


export function selectRandomizedQuestionIds(rows: Array<{ id: number; evidence?: unknown; type?: string }>, requestedIds: number[], recentIds: number[], count: number) {
  const approved = rows.filter((row) => requestedIds.includes(row.id));
  const fresh = approved.filter((row) => !recentIds.includes(row.id));
  const pool = fresh.length >= Math.min(count, approved.length) ? fresh : approved;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const materialKey = (row: typeof approved[number]) => Array.isArray(row.evidence) ? (row.evidence as Array<{ material?: string }>).map((item) => item.material ?? "").sort().join("|") : "";
  const diversified = [...shuffled].sort((a, b) => materialKey(a).localeCompare(materialKey(b)) || Math.random() - 0.5);
  return diversified.slice(0, count).map((row) => row.id);
}
