import { Router } from "express";
import { AICopilotController } from "./controller";
import { requireAuthorizedUser } from "../../../middlewares/auth";
import { guardProjectResources } from "../../../middlewares/projectAccess";

export default function initAICopilotRoute(controller: AICopilotController) {
  const router = Router();
  // Mọi route đều yêu cầu đăng nhập + kiểm tra quyền theo project của tài nguyên
  router.use(requireAuthorizedUser);
  guardProjectResources(router, ["projectId"]);

  // Chat endpoint
  router.post(
    "/projects/:projectId/chat",
    requireAuthorizedUser,
    controller.chat
  );

  // Apply action endpoint
  router.post(
    "/projects/:projectId/apply-action",
    requireAuthorizedUser,
    controller.applyAction
  );

  // Get project summary
  router.get(
    "/projects/:projectId/summary",
    requireAuthorizedUser,
    controller.getProjectSummary
  );

  // Analyze project
  router.post(
    "/projects/:projectId/analyze",
    requireAuthorizedUser,
    controller.analyzeProject
  );

  // Chat Sessions CRUD
  router.get(
    "/projects/:projectId/chats",
    requireAuthorizedUser,
    controller.getChatSessions
  );

  router.post(
    "/projects/:projectId/chats",
    requireAuthorizedUser,
    controller.createChatSession
  );

  router.get(
    "/projects/:projectId/chats/:chatId",
    requireAuthorizedUser,
    controller.getChatSession
  );

  router.put(
    "/projects/:projectId/chats/:chatId",
    requireAuthorizedUser,
    controller.updateChatSession
  );

  router.delete(
    "/projects/:projectId/chats/:chatId",
    requireAuthorizedUser,
    controller.deleteChatSession
  );

  return router;
}
