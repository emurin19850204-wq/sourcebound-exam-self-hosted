import { BookOpen, CheckCircle2, FileText, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const adminSteps = [
  ["1", "資料を登録する", "資料ライブラリからPDF、Word、PowerPoint、テキスト、CSV、画像をアップロードします。カテゴリ、重要度、テスト利用可否を設定してください。"],
  ["2", "問題案を自動生成する", "問題案を生成から資料、問題数、難易度、問題形式を選択します。AIは選択資料の内容を根拠に、正答・解説・根拠ページ・タグ・配点を含む下書きを作成します。"],
  ["3", "問題案を編集・承認する", "生成後のレビュー画面で、設問、形式、選択肢、正答、解説、根拠、タグ、配点、難易度を修正できます。保存後、問題ごとに承認、保留、差し戻しを選択します。承認前の問題は受験者へ公開されません。"],
  ["4", "テストを設定する", "テスト名、対象資料、出題数、合格基準、制限時間、受験期間、受験回数、資料閲覧モードを設定します。公開前に問題構成を確認してください。"],
  ["5", "結果を確認する", "受験結果、問題形式別・資料別の傾向、回答時間、記述採点を結果分析で確認し、必要に応じてCSVを出力します。"],
];

const candidateSteps = [
  ["1", "受験を開始する", "受験者プレビューまたは案内されたテストから受験を開始します。開始時刻と制限時間が記録されます。"],
  ["2", "問題に回答する", "問題番号と進捗を確認しながら回答します。回答は自動保存され、選択式問題では選択肢順が受験ごとに変わる場合があります。"],
  ["3", "資料を参照する", "資料閲覧が許可されたテストでは、画面内の資料パネルで検索、ページ移動、拡大を利用できます。"],
  ["4", "提出する", "未回答がある場合は警告が表示されます。制限時間終了時は自動提出されます。タブ離脱は記録されますが、自動失格にはなりません。"],
];

function StepList({ steps }: { steps: string[][] }) {
  return <div className="space-y-3">{steps.map(([number, title, body]) => <div key={number} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17365d] text-xs font-bold text-white">{number}</div><div><h3 className="text-sm font-bold text-[#203956]">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{body}</p></div></div>)}</div>;
}

export default function Guide() {
  return <div className="space-y-7"><section className="rounded-3xl bg-[#17365d] px-6 py-7 text-white md:px-9 md:py-8"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><BookOpen className="h-5 w-5 text-[#a9d1ef]" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">User guide</p><h2 className="mt-1 text-2xl font-bold">SourceBound Exam 使用説明書</h2></div></div><p className="mt-5 max-w-3xl text-sm leading-6 text-blue-100/80">この説明書では、資料の登録から問題案の承認、テストの実施、結果の確認までの基本的な流れを案内します。</p></section><div className="grid gap-6 xl:grid-cols-2"><Card className="border-0 shadow-sm shadow-slate-200/70"><CardHeader><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#3975a8]" /><CardTitle className="text-lg text-[#203956]">管理者向け</CardTitle></div><p className="text-sm text-slate-500">資料と問題を管理し、テストを公開するまでの手順です。</p></CardHeader><CardContent><StepList steps={adminSteps} /></CardContent></Card><Card className="border-0 shadow-sm shadow-slate-200/70"><CardHeader><div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-[#4b7e68]" /><CardTitle className="text-lg text-[#203956]">受験者向け</CardTitle></div><p className="text-sm text-slate-500">テスト開始から提出までの注意点です。</p></CardHeader><CardContent><StepList steps={candidateSteps} /></CardContent></Card></div><Card className="border-0 bg-[#fff8ef] shadow-sm"><CardContent className="flex gap-4 p-5"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#c2773b]" /><div><p className="text-sm font-bold text-[#8a542e]">問題生成の品質について</p><p className="mt-1 text-sm leading-6 text-[#8a542e]/80">AI生成問題は必ず管理者が資料の根拠と照合してください。内容が資料にない場合や、正答・根拠が不明確な場合は編集または差し戻しを行い、承認しないでください。</p></div></CardContent></Card></div>;
}

export function GuideEmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center"><FileText className="h-10 w-10 text-slate-300" /><h3 className="mt-4 text-base font-bold text-[#203956]">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p>{action && <div className="mt-5">{action}</div>}<div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 className="h-4 w-4 text-emerald-500" />データが登録されると、ここに一覧が表示されます。</div></div>;
}
