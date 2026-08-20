import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [, navigate] = useLocation();
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(register ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "認証に失敗しました");
      navigate("/"); window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "認証に失敗しました"); } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f8fb] p-4"><Card className="w-full max-w-md border-0 shadow-xl"><CardHeader><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3975a8]">SourceBound Exam</p><CardTitle className="text-2xl text-[#17365d]">{register ? "アカウントを作成" : "ログイン"}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">{register && <Input required placeholder="氏名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />}<Input required type="email" placeholder="メールアドレス" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><Input required minLength={10} type="password" placeholder="パスワード（10文字以上）" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{error && <p className="text-sm text-red-600">{error}</p>}<Button type="submit" disabled={busy} className="w-full bg-[#17365d]">{busy ? "処理中…" : register ? "登録する" : "ログイン"}</Button></form><button className="mt-5 w-full text-sm text-[#3975a8] underline" onClick={() => setRegister(!register)}>{register ? "既にアカウントをお持ちの方" : "新規アカウントを作成"}</button></CardContent></Card></main>;
}
