import crypto from "crypto";
import express, { NextFunction, Request, Response } from "express";
import AccessToken from "../../../../../internal/model/access_token";
import { PAT_PREFIX, requireInteractiveSession } from "../../../middlewares/auth";
import { HttpRequest } from "../../../types";

const MAX_TOKENS = 20;
const wrap = (fn: (req: HttpRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => fn(req as HttpRequest, res).catch(next);

/** Personal access tokens for the Claude MCP (and other tools). Managed from a signed-in session only. */
export default function initAccessTokenRoute(): express.Router {
  const router = express.Router();
  router.use(requireInteractiveSession);

  router.get("/", wrap(async (req, res) => {
    const rows = await AccessToken.find({ user_id: req.getSubject(), revoked_at: null }).sort({ created_at: -1 }).lean();
    res.json({ success: true, data: rows.map((t: any) => ({ id: String(t._id), name: t.name, prefix: t.prefix, created_at: t.created_at, last_used_at: t.last_used_at })) });
  }));

  // The raw token is returned once; only its hash is stored.
  router.post("/", wrap(async (req, res) => {
    const name = String(req.body?.name ?? "").trim() || "Claude";
    if (name.length > 100) return void res.status(400).json({ success: false, message: "Tên token tối đa 100 ký tự" });
    if ((await AccessToken.countDocuments({ user_id: req.getSubject(), revoked_at: null })) >= MAX_TOKENS) {
      return void res.status(409).json({ success: false, message: `Tối đa ${MAX_TOKENS} token đang dùng; hãy thu hồi bớt` });
    }
    const raw = PAT_PREFIX + crypto.randomBytes(32).toString("base64url");
    const doc = await AccessToken.create({ user_id: req.getSubject(), name, token_hash: crypto.createHash("sha256").update(raw).digest("hex"), prefix: raw.slice(0, 12) });
    res.status(201).json({ success: true, data: { id: String(doc._id), name, token: raw, prefix: doc.prefix } });
  }));

  router.delete("/:id", wrap(async (req, res) => {
    const r = await AccessToken.updateOne({ _id: req.params.id, user_id: req.getSubject(), revoked_at: null }, { $set: { revoked_at: new Date() } });
    if (!r.modifiedCount) return void res.status(404).json({ success: false, message: "Không tìm thấy token" });
    res.status(204).end();
  }));

  return router;
}
