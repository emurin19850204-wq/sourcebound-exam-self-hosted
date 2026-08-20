import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./selfhost/adapters";
import { storagePut } from "./selfhost/adapters";
import { clearSession } from "./selfhost/auth";
import { createMaterial, createQuestion, createQuestionsDraft, listMaterials, listQuestions, listTests, updateQuestionStatus } from "./db";
import { filterApprovedQuestionIds, selectRandomizedQuestionIds } from "./quizRules";
import { extractDocument } from "./materialExtraction";
import { validateMaterialUpload, normalizeTestConfig, isUnscored, isPendingShortAnswer, autoGradePoints, validateQuestionShape } from "./qualityRules";

const evidenceSchema = z.array(z.object({ material: z.string(), page: z.number(), heading: z.string() }));
const questionTypeSchema = z.enum(["single", "multi", "true_false", "ordering", "numeric", "comparison", "short_answer"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { clearSession(ctx.res); return { success: true } as const; }),
  }),
  materials: router({
    list: protectedProcedure.query(() => listMaterials()),
    setUsageStatus: adminProcedure.input(z.object({ id: z.number(), usageStatus: z.enum(["active", "paused"]) })).mutation(async ({ input }) => { const { getDb } = await import("./db"); const { materials } = await import("../drizzle/schema"); const { eq } = await import("drizzle-orm"); const db = await getDb(); if (!db) throw new Error("データベースに接続できません"); await db.update(materials).set({ usageStatus: input.usageStatus }).where(eq(materials.id, input.id)); return { success: true } as const; }),
    create: adminProcedure.input(z.object({ title: z.string().min(1), fileName: z.string(), fileType: z.string(), category: z.enum(["教材", "マニュアル", "規程", "ケース記録", "参考資料"]), importance: z.enum(["high", "medium", "low"]), pageCount: z.number().int().positive().default(1), sourceUrl: z.string().optional(), extractedText: z.string().optional(), headings: z.array(z.string()).default([]), keywords: z.array(z.string()).default([]), figureDescriptions: z.array(z.string()).default([]) })).mutation(({ input, ctx }) => createMaterial({ ...input, createdBy: ctx.user.id })),
    uploadAndExtract: adminProcedure.input(z.object({ fileName: z.string().min(1), mimeType: z.string().min(1), base64: z.string().min(1), category: z.enum(["教材", "マニュアル", "規程", "ケース記録", "参考資料"]), importance: z.enum(["high", "medium", "low"]) })).mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const validation = validateMaterialUpload(input.fileName, buffer.byteLength);
      if (!validation.ok) throw new Error(validation.reason === "unsupported" ? "対応していないファイル形式です" : "ファイルサイズは50MB以下にしてください");
      const stored = await storagePut(`materials/${ctx.user.id}/${Date.now()}-${input.fileName}`, buffer, input.mimeType);
      const extractedDocument = input.mimeType.startsWith("image/") ? { text: "", pageCount: 1 } : await extractDocument(buffer, input.mimeType, input.fileName);
      const content = input.mimeType.startsWith("image/") ? [{ type: "text" as const, text: "画像内の見出し、本文、図表、数値、重要キーワードを日本語で抽出してください。" }, { type: "image_url" as const, image_url: { url: `data:${input.mimeType};base64,${input.base64}`, detail: "auto" as const } }] : `ファイル名:${input.fileName}\n本文:${extractedDocument.text.slice(0, 80000)}\nページ数:${extractedDocument.pageCount}\n見出し、重要キーワード、本文、図表説明、ページ内根拠をJSONで抽出してください。`;
      const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "資料解析専門家として、入力資料の内容だけを根拠に抽出してください。" }, { role: "user", content }], response_format: { type: "json_schema", json_schema: { name: "material_extract", strict: true, schema: { type: "object", properties: { title: { type: "string" }, headings: { type: "array", items: { type: "string" } }, keywords: { type: "array", items: { type: "string" } }, body: { type: "string" }, figureDescriptions: { type: "array", items: { type: "string" } }, pageCount: { type: "number" } }, required: ["title", "headings", "keywords", "body", "figureDescriptions", "pageCount"], additionalProperties: false } } } });
      const raw = response.choices[0]?.message?.content; if (!raw || typeof raw !== "string") throw new Error("資料抽出に失敗しました");
      const extracted = JSON.parse(raw) as { title: string; headings: string[]; keywords: string[]; body: string; figureDescriptions: string[]; pageCount: number };
      const id = await createMaterial({ title: extracted.title || input.fileName, fileName: input.fileName, fileType: input.mimeType, category: input.category, importance: input.importance, pageCount: Math.max(1, Math.round(extracted.pageCount || 1)), sourceUrl: stored.url, extractedText: extracted.body, headings: extracted.headings, keywords: extracted.keywords, figureDescriptions: extracted.figureDescriptions, createdBy: ctx.user.id });
      if (id === null) throw new Error("資料の保存に失敗しました");
      return { id, url: stored.url, extracted };
    }),
  }),
  questions: router({
    list: protectedProcedure.query(() => listQuestions()),
    generateDraft: adminProcedure.input(z.object({ materials: z.array(z.object({ title: z.string(), text: z.string(), page: z.number() })), count: z.number().int().min(1).max(20), difficulty: z.enum(["basic", "standard", "advanced"]), types: z.array(questionTypeSchema).min(1) })).mutation(async ({ input, ctx }) => {
      const source = input.materials.map(m => `資料名: ${m.title}\nページ: ${m.page}\n本文: ${m.text}`).join("\n---\n");
      const response = await invokeLLM({ model: "gpt-5-mini", reasoning: { effort: "low" }, messages: [{ role: "system", content: "あなたは資料根拠型試験の問題設計者です。必ず与えられた資料だけを根拠にし、根拠ページと見出しを返してください。一般知識で答えられる問題は禁止です。" }, { role: "user", content: `次の資料から${input.count}問を作成してください。難易度:${input.difficulty}。形式候補:${input.types.join(",")}。全体の70%以上は複数情報の比較、条件適用、数値解釈、または根拠付き短文記述にしてください。\n${source}` }], response_format: { type: "json_schema", json_schema: { name: "question_drafts", strict: true, schema: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { prompt: { type: "string" }, type: { type: "string" }, options: { type: "array", items: { type: "string" } }, answer: { type: "string" }, explanation: { type: "string" }, evidence: { type: "array", items: { type: "object", properties: { material: { type: "string" }, page: { type: "number" }, heading: { type: "string" } }, required: ["material", "page", "heading"], additionalProperties: false } }, tags: { type: "array", items: { type: "string" } }, points: { type: "number" } }, required: ["prompt", "type", "options", "answer", "explanation", "evidence", "tags", "points"], additionalProperties: false } } }, required: ["questions"], additionalProperties: false } } } });
      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") throw new Error("問題案の生成結果を取得できませんでした");
      const parsed = JSON.parse(content) as { questions: Array<{ prompt: string; type: string; options: string[]; answer: string; explanation: string; evidence: z.infer<typeof evidenceSchema>; tags: string[]; points: number }> };
      const ids = await createQuestionsDraft(parsed.questions.map((item) => ({ prompt: item.prompt, type: item.type as any, options: item.options, answer: item.answer, explanation: item.explanation, evidence: item.evidence, difficulty: input.difficulty, points: item.points, tags: item.tags, status: "draft", createdBy: ctx.user.id })));
      return { count: parsed.questions.length, ids, questions: parsed.questions };
    }),
    edit: adminProcedure.input(z.object({ id: z.number(), type: questionTypeSchema, difficulty: z.enum(["basic", "standard", "advanced"]), prompt: z.string().min(1), options: z.array(z.string()).default([]), answer: z.unknown(), explanation: z.string().min(1), evidence: evidenceSchema, tags: z.array(z.string()).default([]), points: z.number().int().positive() })).mutation(async ({ input }) => {
      if (!validateQuestionShape(input.type, input.options, input.answer)) throw new Error("問題形式に対して正答・選択肢の形式が不正です");
      const { getDb } = await import("./db");
      const { questions } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb(); if (!db) throw new Error("データベースに接続できません");
      await db.update(questions).set({ type: input.type, difficulty: input.difficulty, prompt: input.prompt, options: input.options, answer: input.answer, explanation: input.explanation, evidence: input.evidence, tags: input.tags, points: input.points }).where(eq(questions.id, input.id));
      return { success: true } as const;
    }),
    review: adminProcedure.input(z.object({ id: z.number(), status: z.enum(["draft", "approved", "rejected", "archived"]) })).mutation(({ input, ctx }) => updateQuestionStatus(input.id, input.status, input.status === "approved" ? ctx.user.id : undefined)),
  }),
  attempts: router({
    start: protectedProcedure.input(z.object({ testId: z.number(), questionIds: z.array(z.number()).min(1), recentQuestionIds: z.array(z.number()).default([]) })).mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db"); const { attempts, questions } = await import("../drizzle/schema"); const db = await getDb(); if (!db) throw new Error("データベースに接続できません");
      const questionRows = await db.select().from(questions); const approvedQuestionIds = filterApprovedQuestionIds(input.questionIds, questionRows); if (!approvedQuestionIds.length) throw new Error("承認済みの問題がありません"); const shuffled = selectRandomizedQuestionIds(questionRows, approvedQuestionIds, input.recentQuestionIds, approvedQuestionIds.length);
      const optionOrders: Record<string, number[]> = {}; for (const question of questionRows) { if (shuffled.includes(question.id) && Array.isArray(question.options)) optionOrders[String(question.id)] = question.options.map((_, i) => i).sort(() => Math.random() - 0.5); }
      const result = await db.insert(attempts).values({ testId: input.testId, userId: ctx.user.id, status: "in_progress" });
      return { attemptId: result[0]?.insertId ?? null, questionIds: shuffled, optionOrders };
    }),
    saveAnswer: protectedProcedure.input(z.object({ attemptId: z.number(), questionId: z.number(), answer: z.unknown() })).mutation(async ({ input }) => {
      const { getDb } = await import("./db"); const { attemptAnswers } = await import("../drizzle/schema"); const { and, eq } = await import("drizzle-orm"); const db = await getDb(); if (!db) throw new Error("データベースに接続できません");
      const existing = await db.select().from(attemptAnswers).where(and(eq(attemptAnswers.attemptId, input.attemptId), eq(attemptAnswers.questionId, input.questionId))).limit(1);
      if (existing[0]) await db.update(attemptAnswers).set({ answer: input.answer }).where(eq(attemptAnswers.id, existing[0].id)); else await db.insert(attemptAnswers).values({ attemptId: input.attemptId, questionId: input.questionId, answer: input.answer });
      return { saved: true } as const;
    }),
    event: protectedProcedure.input(z.object({ attemptId: z.number(), questionId: z.number().optional(), eventType: z.enum(["focus", "blur", "answer_change", "idle", "submit"]), durationMs: z.number().int().nonnegative().optional(), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ input }) => {
      const { getDb } = await import("./db"); const { activityEvents } = await import("../drizzle/schema"); const db = await getDb(); if (!db) throw new Error("データベースに接続できません"); await db.insert(activityEvents).values(input); return { recorded: true } as const;
    }),
    pendingShortAnswers: adminProcedure.query(async () => {
      const { getDb } = await import("./db"); const { attemptAnswers, attempts, questions } = await import("../drizzle/schema"); const db = await getDb(); if (!db) return [];
      const answers = await db.select().from(attemptAnswers); const attemptRows = await db.select().from(attempts); const questionRows = await db.select().from(questions); return answers.filter((answer) => { const attempt = attemptRows.find((row) => row.id === answer.attemptId); const question = questionRows.find((row) => row.id === answer.questionId); return isPendingShortAnswer(answer.points, question?.type ?? "", attempt?.status ?? ""); }).map((answer) => ({ ...answer, question: questionRows.find((question) => question.id === answer.questionId), attempt: attemptRows.find((attempt) => attempt.id === answer.attemptId) }));
    }),
    gradeShortAnswer: adminProcedure.input(z.object({ attemptId: z.number(), questionId: z.number(), conclusion: z.number().int().min(0).max(4), evidence: z.number().int().min(0).max(4), logic: z.number().int().min(0).max(4), comment: z.string().max(2000).optional() })).mutation(async ({ input }) => {
      const { getDb } = await import("./db"); const { attemptAnswers } = await import("../drizzle/schema"); const { and, eq } = await import("drizzle-orm"); const db = await getDb(); if (!db) throw new Error("データベースに接続できません"); const points = input.conclusion + input.evidence + input.logic; await db.update(attemptAnswers).set({ points, graderComment: input.comment ?? "" }).where(and(eq(attemptAnswers.attemptId, input.attemptId), eq(attemptAnswers.questionId, input.questionId))); return { points, maxPoints: 12 };
    }),
    submit: protectedProcedure.input(z.object({ attemptId: z.number(), answers: z.array(z.object({ questionId: z.number(), answer: z.unknown() })) })).mutation(async ({ input }) => {
      const { getDb } = await import("./db"); const { attempts, attemptAnswers, questions } = await import("../drizzle/schema"); const { and, eq } = await import("drizzle-orm"); const db = await getDb(); if (!db) throw new Error("データベースに接続できません");
      let score = 0; for (const response of input.answers) { const question = (await db.select().from(questions).where(eq(questions.id, response.questionId)).limit(1))[0]; const points = question ? autoGradePoints(question.type, question.answer, response.answer, question.points) : 0; score += points ?? 0; await db.update(attemptAnswers).set({ answer: response.answer, points }).where(and(eq(attemptAnswers.attemptId, input.attemptId), eq(attemptAnswers.questionId, response.questionId))); }
      await db.update(attempts).set({ status: "submitted", score, submittedAt: new Date() }).where(eq(attempts.id, input.attemptId)); return { score };
    }),
  }),
  tests: router({
    list: protectedProcedure.query(() => listTests()),
    create: adminProcedure.input(z.object({ name: z.string().min(1), description: z.string().optional(), questionCount: z.number().int().positive(), passScore: z.number().int().min(0).max(100), timeLimitMinutes: z.number().int().positive(), attemptLimit: z.number().int().positive(), accessMode: z.enum(["closed", "specified", "timed"]), revealMode: z.enum(["immediate", "after_submit", "after_period"]), targetMaterialIds: z.array(z.number()).default([]), targetQuestionIds: z.array(z.number()).default([]), formatDistribution: z.record(z.string(), z.number()).default({}), difficultyDistribution: z.record(z.string(), z.number()).default({}), availableFrom: z.date().nullable().optional(), availableUntil: z.date().nullable().optional() })).mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db"); const { tests } = await import("../drizzle/schema"); const db = await getDb(); if (!db) throw new Error("データベースに接続できません"); const config = normalizeTestConfig(input); const result = await db.insert(tests).values({ ...input, ...config, createdBy: ctx.user.id, status: "draft" }); return { id: result[0]?.insertId ?? null };
    }),
  }),
  analytics: router({
    summary: adminProcedure.input(z.object({ testId: z.number().optional() })).query(async ({ input }) => {
      const { getDb } = await import("./db"); const { attempts, attemptAnswers, questions, materials, activityEvents } = await import("../drizzle/schema"); const { desc } = await import("drizzle-orm"); const db = await getDb(); if (!db) return { attempts: [], byQuestion: [], byFormat: [], byMaterial: [], byDomain: [] };
      const attemptRows = await db.select().from(attempts).orderBy(desc(attempts.startedAt)); const answerRows = await db.select().from(attemptAnswers); const questionRows = await db.select().from(questions); const materialRows = await db.select().from(materials); const eventRows = await db.select().from(activityEvents);
      const filtered = input.testId ? attemptRows.filter((a) => a.testId === input.testId) : attemptRows;
      const byQuestion = questionRows.map((q) => { const rows = answerRows.filter((a) => a.questionId === q.id); const correct = rows.filter((a) => (a.points ?? 0) > 0).length; const times = eventRows.filter((e) => e.questionId === q.id && e.eventType === "question_time" && typeof e.durationMs === "number").map((e) => e.durationMs as number); return { questionId: q.id, prompt: q.prompt, correctRate: rows.length ? Math.round((correct / rows.length) * 100) : 0, responseCount: rows.length, averageTimeMs: times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : 0 }; });
      const byFormat = Array.from(new Set(questionRows.map((q) => q.type))).map((type) => { const related = questionRows.filter((q) => q.type === type); const rows = answerRows.filter((a) => related.some((q) => q.id === a.questionId)); const correct = rows.filter((a) => (a.points ?? 0) > 0).length; return { type, correctRate: rows.length ? Math.round((correct / rows.length) * 100) : 0, responseCount: rows.length }; });
      const byMaterial = materialRows.map((m) => { const related = questionRows.filter((q) => Array.isArray(q.evidence) && (q.evidence as Array<{ material?: string; materialId?: number }>).some((item) => item.materialId === m.id || item.material === m.title)); const rows = answerRows.filter((a) => related.some((q) => q.id === a.questionId)); const correct = rows.filter((a) => (a.points ?? 0) > 0).length; return { materialId: m.id, title: m.title, correctRate: rows.length ? Math.round((correct / rows.length) * 100) : 0, responseCount: rows.length }; }); const tagNames = Array.from(new Set(questionRows.flatMap((q) => Array.isArray(q.tags) ? (q.tags as string[]) : []))); const byDomain = tagNames.map((tag) => { const related = questionRows.filter((q) => Array.isArray(q.tags) && (q.tags as string[]).includes(tag)); const rows = answerRows.filter((a) => related.some((q) => q.id === a.questionId)); const correct = rows.filter((a) => (a.points ?? 0) > 0).length; return { tag, correctRate: rows.length ? Math.round((correct / rows.length) * 100) : 0, responseCount: rows.length }; });
      return { attempts: filtered, byQuestion, byFormat, byMaterial, byDomain };
    }),
    csv: adminProcedure.input(z.object({ testId: z.number().optional() })).query(async ({ input }) => {
      const { getDb } = await import("./db"); const { attempts, attemptAnswers } = await import("../drizzle/schema"); const { desc } = await import("drizzle-orm"); const db = await getDb(); if (!db) return "受験ID,テストID,受験者ID,得点,状態,開始時刻,提出時刻\\n";
      const rows = await db.select().from(attempts).orderBy(desc(attempts.startedAt)); const filtered = input.testId ? rows.filter((a) => a.testId === input.testId) : rows; return ["受験ID,テストID,受験者ID,得点,状態,開始時刻,提出時刻", ...filtered.map((a) => [a.id, a.testId, a.userId, a.score ?? "", a.status, a.startedAt.toISOString(), a.submittedAt?.toISOString() ?? ""].join(","))].join("\\n");
    }),
  }),
});

export type AppRouter = typeof appRouter;
