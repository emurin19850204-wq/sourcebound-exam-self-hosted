import type { Express, Request, Response } from "express";
import { createSession, loginLocalUser, registerLocalUser, setSession, clearSession } from "./auth";
import { SELFHOST } from "./adapters";
import * as db from "../db";

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const id = await registerLocalUser({ name: String(req.body.name ?? ""), email: String(req.body.email ?? "").toLowerCase(), password: String(req.body.password ?? "") });
      const user = await loginLocalUser(String(req.body.email).toLowerCase(), String(req.body.password));
      setSession(res, await createSession(id));
      res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "登録に失敗しました" }); }
  });
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const user = await loginLocalUser(String(req.body.email ?? "").toLowerCase(), String(req.body.password ?? ""));
      setSession(res, await createSession(user.id));
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) { res.status(401).json({ error: error instanceof Error ? error.message : "ログインに失敗しました" }); }
  });
  app.post("/api/auth/logout", (_req, res) => { clearSession(res); res.status(204).end(); });
  app.get("/api/auth/config", (_req, res) => res.json({ appName: SELFHOST.appName, registrationEnabled: true }));
}
