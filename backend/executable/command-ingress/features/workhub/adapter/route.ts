import { NextFunction, Request, Response, Router } from "express";
import { requireAuthorizedUser } from "../../../middlewares/auth";
import { guardProjectResources } from "../../../middlewares/projectAccess";
import env from "../../../utils/env";
import Project from "../../../../../internal/model/project";
import User from "../../../../../internal/model/user";
import bcrypt from "bcrypt";
import Session from "../../../../../internal/model/session";
import { HttpRequest } from "../../../types";
import { BridgeError, bridgeClient } from "../domain/bridge.client";
import { workhubSyncService } from "../domain/service";

const wrap = (fn: (req: HttpRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
  fn(req as HttpRequest, res).catch((e) => {
    if (e instanceof BridgeError) return res.status(e.status === 503 ? 503 : e.status).json({ success: false, code: e.code, message: e.message });
    next(e);
  });

export default function initWorkhubRoute(): Router {
  const router = Router();
  router.use(requireAuthorizedUser);
  guardProjectResources(router, ["projectId"]);

  // Is the signed-in user linked to a WorkHub account?
  router.get("/status", wrap(async (req, res) => {
    res.json({ success: true, data: await workhubSyncService.userStatus(req.getSubject()) });
  }));

  // Sign in to (or register) a WorkHub account; afterwards everything the user owns is created in WorkHub automatically.
  router.post("/link", wrap(async (req, res) => {
    const { email, password, register, fullName } = req.body ?? {};
    if (!password) return void res.status(400).json({ success: false, code: "BAD_REQUEST", message: "Thiếu mật khẩu WorkHub" });
    res.json({ success: true, data: await workhubSyncService.linkUser(req.getSubject(), { email, password, register: !!register, fullName }) });
  }));

  // Unlink my WorkHub account: the token is revoked in WorkHub; tasks/documents already created stay untouched.
  router.delete("/link", wrap(async (req, res) => {
    res.json({ success: true, data: await workhubSyncService.unlinkUser(req.getSubject()) });
  }));

  // Pause/resume syncing of a project (owner only).
  router.put("/projects/:projectId/paused", wrap(async (req, res) => {
    const project: any = await Project.findById(String(req.params.projectId)).select("owner_id").lean();
    if (!project || String(project.owner_id) !== req.getSubject()) {
      return void res.status(403).json({ success: false, code: "OWNER_ONLY", message: "Chỉ chủ dự án mới tạm dừng/tiếp tục đồng bộ" });
    }
    res.json({ success: true, data: await workhubSyncService.setPaused(String(req.params.projectId), !!req.body?.paused) });
  }));

  // Link + use case progress of one project (for the "Mở WorkHub" button and the badges).
  router.get("/projects/:projectId", wrap(async (req, res) => {
    const data = await bridgeClient.projectStatus(String(req.params.projectId));
    res.json({ success: true, data });
  }));

  // "Sync now": also what the UI calls right after a first link or when it shows link_required.
  router.post("/projects/:projectId/sync", wrap(async (req, res) => {
    const result = await workhubSyncService.syncProject(String(req.params.projectId), req.getSubject());
    if (!result) return void res.status(409).json({ success: false, code: "NOTHING_TO_SYNC", message: "Dự án chưa có phiên bản hoàn tất hoặc chưa liên kết WorkHub" });
    res.json({ success: true, data: result });
  }));

  // Tasks tab: use cases with their WorkHub progress
  router.get("/projects/:projectId/board", wrap(async (req, res) => {
    res.json({ success: true, data: await workhubSyncService.board(String(req.params.projectId)) });
  }));

  // Change the status of a use case's task (writes go through WorkHub; the guard blocks viewers)
  router.put("/projects/:projectId/usecases/:key/status", wrap(async (req, res) => {
    const status = String(req.body?.status ?? "");
    if (!["TO_DO", "IN_PROGRESS", "CODE_REVIEW", "TESTING", "DONE"].includes(status)) {
      return void res.status(400).json({ success: false, code: "BAD_STATUS", message: "Trạng thái không hợp lệ" });
    }
    res.json({ success: true, data: await workhubSyncService.changeStatus(String(req.params.projectId), String(req.params.key), status, req.getSubject()) });
  }));

  // Change the status of the bug linked to a test case
  router.put("/projects/:projectId/testcases/:key/bug-status", wrap(async (req, res) => {
    const status = String(req.body?.status ?? "");
    if (!["TO_DO", "IN_PROGRESS", "CODE_REVIEW", "TESTING", "DONE"].includes(status)) {
      return void res.status(400).json({ success: false, code: "BAD_STATUS", message: "Trạng thái không hợp lệ" });
    }
    res.json({ success: true, data: await workhubSyncService.changeBugStatus(String(req.params.projectId), String(req.params.key), status, req.getSubject()) });
  }));

  // Recreate a task that was deleted in WorkHub
  router.post("/projects/:projectId/usecases/:key/recreate", wrap(async (req, res) => {
    res.json({ success: true, data: await workhubSyncService.recreate(String(req.params.projectId), String(req.params.key)) });
  }));

  // Pull WorkHub's real state now
  router.post("/projects/:projectId/reconcile", wrap(async (req, res) => {
    res.json({ success: true, data: await bridgeClient.reconcile(String(req.params.projectId)) });
  }));

  return router;
}

/** Server-to-server callback used by ForgeBridge (no user token; protected by the shared key). */
export function initWorkhubCallbackRoute(): Router {
  const router = Router();
  router.post("/progress", async (req, res) => {
    if (req.header("x-bridge-key") !== env.BRIDGE_SECRET) return void res.status(401).json({ success: false });
    const b = req.body ?? {};
    if (!b.ssProjectId || !Array.isArray(b.items)) return void res.status(400).json({ success: false });
    await workhubSyncService.applyBatch(b);
    res.status(204).end();
  });
  // WorkHub asks (through the Bridge) whether an e-mail/password pair is valid here. Local check only (no loop back).
  router.post("/identity/verify", async (req, res) => {
    if (req.header("x-bridge-key") !== env.BRIDGE_SECRET) return void res.status(401).json({ success: false });
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const user: any = email ? await User.findOne({ email }).select("password name email_verified status password_changed_at") : null;
    if (!user) return void res.json({ status: "not_found" });
    const ok = !!user.password && (await bcrypt.compare(password, user.password));
    if (!ok || user.status === "INACTIVE") return void res.json({ status: "wrong_password" });
    res.json({ status: "ok", name: user.name, emailVerified: !!user.email_verified, passwordChangedAt: user.password_changed_at ? new Date(user.password_changed_at).toISOString() : undefined });
  });

  // WorkHub changed this person's password (reset or change there): take it and sign out everywhere. No loop back.
  router.post("/identity/set-password", async (req, res) => {
    if (req.header("x-bridge-key") !== env.BRIDGE_SECRET) return void res.status(401).json({ success: false });
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const user: any = email ? await User.findOne({ email }) : null;
    if (user && password.length >= 8 && Buffer.byteLength(password, "utf8") <= 72) {
      user.password = await bcrypt.hash(password, 10);
      user.password_changed_at = new Date();
      await user.save();
      await Session.deleteMany({ userID: user._id });
    }
    res.status(204).end();
  });
  return router;
}
