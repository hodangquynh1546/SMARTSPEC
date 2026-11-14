import { Router, Request, Response, NextFunction } from 'express';
import { LogController } from "../adapter/controller";
import {requireAuthorizedUser, requireRole} from "../../../middlewares/auth";

export default function initLogRoute(controller: LogController) {
  const router = Router();

  // Writing logs, reading every user's logs, exporting them and purging them are administrator actions: any signed-in
 // user used to be able to forge audit entries, read other people's logs (IPs, e-mails) and trigger the purge.
 router.post("/", requireAuthorizedUser, requireRole("ADMIN"),(req: Request, res: Response, next: NextFunction) => controller.createLog(req as any, res, next));
  router.get("/", requireAuthorizedUser, requireRole("ADMIN"),(req: Request, res: Response, next: NextFunction) =>  controller.queryLog(req as any, res, next));
  router.get("/export", requireAuthorizedUser, requireRole("ADMIN"),(req: Request, res: Response, next: NextFunction) =>  controller.exportLog(req as any, res, next));
  router.get("/user-activity", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.getUserActivityLogs(req as any, res,next));
  router.get("/project", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.getProjectLogs(req as any, res,next));
  router.get("/output", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.getOutputLogs(req as any, res,next));
  router.post("/retention", requireAuthorizedUser, requireRole("ADMIN"),(req: Request, res: Response, next: NextFunction) =>  controller.runLogRetention(req as any, res,next));
  router.get("/system", requireAuthorizedUser, (req: Request, res: Response, next: NextFunction) =>  controller.getSystemLogs(req as any, res,next));
  return router;
}
