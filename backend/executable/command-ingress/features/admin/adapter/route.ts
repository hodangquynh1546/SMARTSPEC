import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import os from "os";
import User from "../../../../../internal/model/user";
import Project from "../../../../../internal/model/project";
import Usecase from "../../../../../internal/model/usecase";
import Testcase from "../../../../../internal/model/testcase";
import ApiKey from "../../../../../internal/model/api_key";
import LogModel from "../../../../../internal/model/log";
import { requireAuthorizedUser, requireRole } from "../../../middlewares/auth";
import env from "../../../utils/env";

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

/** Admin dashboard and system information (the admin panel calls these; all need the ADMIN role). */
export default function initAdminRoute(): express.Router {
  const router = express.Router();
  router.use(requireAuthorizedUser, requireRole("ADMIN"));

  router.get("/dashboard/stats", wrap(async (_req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [totalUsers, activeUsers, newUsers, admins, projects, trashed, usecases, testcases, apiKeys, activeKeys] = await Promise.all([
      User.countDocuments({}), User.countDocuments({ status: { $ne: "INACTIVE" } }), User.countDocuments({ created_at: { $gte: weekAgo } }),
      User.countDocuments({ system_role: "ADMIN" }), Project.countDocuments({ "status.is_trashed": { $ne: true } }),
      Project.countDocuments({ "status.is_trashed": true }), Usecase.countDocuments({}), Testcase.countDocuments({}),
      ApiKey.countDocuments({}), ApiKey.countDocuments({ is_active: true } as any).catch(() => 0),
    ]);
    res.json({ success: true, data: { users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers, admins, newLast7Days: newUsers },
      projects: { active: projects, trashed }, usecases, testcases, apiKeys: { total: apiKeys, active: activeKeys } } });
  }));

  router.get("/dashboard/activities", wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rows = await LogModel.find({}).sort({ created_at: -1 }).limit(limit).populate("user_id", "name email").lean();
    res.json({ success: true, data: rows });
  }));

  router.get("/system/info", wrap(async (_req, res) => {
    const mem = process.memoryUsage();
    res.json({ success: true, data: {
      node: process.version, platform: `${os.platform()} ${os.arch()}`, uptimeSeconds: Math.round(process.uptime()),
      memoryMb: { rss: Math.round(mem.rss / 1048576), heapUsed: Math.round(mem.heapUsed / 1048576) },
      mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      mode: env.DEV ? "development" : "production", workhubIntegration: env.WORKHUB_ENABLED,
    } });
  }));

  router.get("/system/logs", wrap(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const filter: Record<string, unknown> = {};
    if (typeof req.query.level === "string") filter.level = req.query.level;
    if (typeof req.query.action === "string") filter.action = req.query.action;
    const [rows, total] = await Promise.all([
      LogModel.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(), LogModel.countDocuments(filter),
    ]);
    res.json({ success: true, data: { logs: rows, total, page, limit } });
  }));

  return router;
}
