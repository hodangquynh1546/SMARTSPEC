import { NextFunction, Response, Router } from "express";
import { Types } from "mongoose";
import Project from "../../../internal/model/project";
import Version from "../../../internal/model/version";
import Database from "../../../internal/model/database";
import Testcase from "../../../internal/model/testcase";
import Usecase from "../../../internal/model/usecase";
import ActivityDiagram from "../../../internal/model/activity_diagram";
import SequenceDiagram from "../../../internal/model/sequence_diagram";
import UsecaseDiagram from "../../../internal/model/usecase_diagram";
import { HttpRequest } from "../types";

type Role = "owner" | "editor" | "viewer";

/** Mapping tên param -> các model có thể chứa project_id (thử lần lượt, thấy trước dùng trước). */
type Resolver = { findById: (id: string) => any };
const PROJECT_SELF: Resolver = Project as any;

export const PARAM_RESOLVERS = {
  projectId: [PROJECT_SELF],
  project_id: [PROJECT_SELF],
  version_id: [Version],
  versionId: [Version],
  databaseId: [Database],
  testCaseId: [Testcase],
  activityDiagramId: [ActivityDiagram],
  sqdId: [SequenceDiagram],
  sequenceId: [SequenceDiagram],
  ucId: [UsecaseDiagram, SequenceDiagram, Usecase],
} as const;

export type GuardedParam = keyof typeof PARAM_RESOLVERS;

const isValidId = (id: unknown): id is string =>
  typeof id === "string" && Types.ObjectId.isValid(id);

/** Trả về project_id của tài nguyên; null nếu không tìm thấy (để service tự trả 404). */
const resolveProjectId = async (
  param: GuardedParam,
  id: string
): Promise<string | null> => {
  for (const model of PARAM_RESOLVERS[param] as readonly Resolver[]) {
    const doc = await model.findById(id).select("project_id").lean();
    if (!doc) continue;
    return String(model === PROJECT_SELF ? doc._id : doc.project_id);
  }
  return null;
};

const roleInProject = (project: any, userId: string): Role | null => {
  if (String(project.owner_id) === userId) return "owner";
  const member = project.members?.find(
    (m: any) => String(m.user_id) === userId && m.status === "accepted"
  );
  return member ? (member.role as Role) ?? "viewer" : null;
};

// POST nhưng chỉ đọc/xuất dữ liệu -> viewer vẫn được phép.
const READ_ONLY_POST = /(export|validate|statistics|coverage|metrics|duplicate-testcases|preview|chat|analyze|summary)/i;

const needsWrite = (req: HttpRequest): boolean => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  if (req.method === "POST" && READ_ONLY_POST.test(req.path)) return false;
  return true;
};

type Denial = { status: number; message: string } | null;

/** Trả về lý do từ chối, hoặc null nếu được phép (hoặc tài nguyên không tồn tại -> để service trả 404). */
const evaluate = async (
  req: HttpRequest,
  param: GuardedParam,
  id: unknown
): Promise<Denial> => {
  if (!isValidId(id)) return null; // id sai định dạng: tầng sau tự báo lỗi
  const userId = req.getSubject?.();
  if (!userId) return { status: 401, message: "Unauthorized" };

  const projectId = await resolveProjectId(param, id);
  if (!projectId) return null;

  const project: any = await Project.findById(projectId).select("owner_id members").lean();
  if (!project) return null;

  const role = roleInProject(project, userId);
  if (!role) return { status: 403, message: "Access denied" };
  if (role === "viewer" && needsWrite(req)) {
    return { status: 403, message: "Viewer không có quyền chỉnh sửa" };
  }
  return null;
};

const send = (res: Response, d: NonNullable<Denial>) =>
  res.status(d.status).json({
    success: false,
    error: d.status === 401 ? "Unauthorized" : "Forbidden",
    message: d.message,
  });

/**
 * Gắn kiểm tra quyền cho mọi route của router có chứa các param đã liệt kê,
 * cùng versionId/projectId truyền qua query/body.
 * Phải đăng ký SAU `router.use(requireAuthorizedUser)`.
 */
export const guardProjectResources = (router: Router, params: GuardedParam[]) => {
  for (const param of params) {
    router.param(param, async (req, res, next, id) => {
      try {
        const denial = await evaluate(req as HttpRequest, param, id);
        return denial ? send(res, denial) : next();
      } catch (err) {
        return next(err);
      }
    });
  }

  router.use(async (req, res, next) => {
    try {
      const sources: [GuardedParam, unknown][] = [
        ["versionId", (req.query as any)?.versionId ?? (req.body as any)?.versionId],
        ["projectId", (req.query as any)?.projectId ?? (req.body as any)?.projectId],
        ["version_id", (req.query as any)?.version_id ?? (req.body as any)?.version_id],
        ["project_id", (req.query as any)?.project_id ?? (req.body as any)?.project_id],
      ];
      for (const [param, id] of sources) {
        if (id === undefined) continue;
        const denial = await evaluate(req as HttpRequest, param, id);
        if (denial) return send(res, denial);
      }
      return next();
    } catch (err) {
      return next(err);
    }
  });
};
