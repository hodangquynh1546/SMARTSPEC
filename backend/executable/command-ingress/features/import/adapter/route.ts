import express, { NextFunction, Request, Response } from "express";
import { requireAuthorizedUser } from "../../../middlewares/auth";
import { guardProjectResources } from "../../../middlewares/projectAccess";
import { HttpRequest } from "../../../types";
import { ImportError, ImportService } from "../domain/service";

/**
 * Write structured design artifacts (database design, UML diagrams) into a version without SmartSpec calling an LLM:
 * used by the Claude MCP. Same permissions and version/preview rules as editing in the web app.
 */
export default function initImportRoute(): express.Router {
  const router = express.Router();
  router.use(requireAuthorizedUser);
  guardProjectResources(router, ["versionId"]);
  const service = new ImportService();

  const handle = (fn: (userId: string, versionId: string, body: any) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fn((req as HttpRequest).getSubject(), String(req.params.versionId), req.body ?? {});
      res.status(201).json({ success: true, data });
    } catch (e) {
      if (e instanceof ImportError) return void res.status(400).json({ success: false, code: e.code, message: e.message, errors: e.errors });
      next(e);
    }
  };

  router.post("/versions/:versionId/usecases", handle((u, v, b) => service.importUsecases(u, v, b)));
  router.post("/versions/:versionId/database", handle((u, v, b) => service.importDatabase(u, v, b)));
  router.post("/versions/:versionId/usecase-diagram", handle((u, v, b) => service.importUsecaseDiagram(u, v, b)));
  router.post("/versions/:versionId/sequence-diagram", handle((u, v, b) => service.importSequenceDiagram(u, v, b)));
  router.post("/versions/:versionId/activity-diagram", handle((u, v, b) => service.importActivityDiagram(u, v, b)));
  return router;
}
