import initImportRoute from "./features/import/adapter/route";
import initAccessTokenRoute from "./features/access_token/adapter/route";
import initAdminRoute from "./features/admin/adapter/route";
import initWorkhubRoute, { initWorkhubCallbackRoute } from "./features/workhub/adapter/route";
import appLogger from "../../lib/logger";
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";
import express from "express";
import env from "./utils/env";
import logger from "./middlewares/logger";
import morgan from "morgan";
import fileUpload from "express-fileupload";

import cors from "cors";
import helmet from "helmet";
import { authLimiter, orchestrateLimiter } from "./middlewares/rateLimit";
import { recoverMiddleware } from "./middlewares/recover";
import { createServer } from "http";

import initAuthRoute from "./features/auth/adapter/route";
import { AuthController } from "./features/auth/adapter/controller";
import { AuthServiceImpl } from "./features/auth/domain/service";
import { GoogleIdentityBroker } from "./features/auth/identity-broker/google-idp.broker";

import initUserRoute from "./features/user/adapter/route";
import { UserController } from "./features/user/adapter/controller";
import { UserServiceImpl } from "./features/user/domain/service";

import initApiKeyRoute from "./features/api_key/adapter/route";
import { ApiKeyController } from "./features/api_key/adapter/controller";
import { ApiKeyServiceImpl } from "./features/api_key/domain/service";

import initOcrRoute from "./features/handle_image/adapter/route";
import { OcrController } from "./features/handle_image/adapter/controller";
import { OcrService } from "./features/handle_image/domain/service";

import initReadDocxRoute from "./features/handle_docx/adapter/route";
import { ReadDocxController } from "./features/handle_docx/adapter/controller";
import { ReadDocxService } from "./features/handle_docx/domain/service";

import initPdfRoute from "./features/handle_pdf/adapter/route";
import { PdfController } from "./features/handle_pdf/adapter/controller";
import { PdfService } from "./features/handle_pdf/domain/service";

import initExtractorRoute from "./features/handle_extraction/adapter/route";
import { ExtractorController } from "./features/handle_extraction/adapter/controller";
import { ExtractorService } from "./features/handle_extraction/domain/ExtractorService";

import initSpeechRoute from "./features/handle_audio/adapter/route";
import { SpeechController } from "./features/handle_audio/adapter/controller";
import { SpeechToTextService } from "./features/handle_audio/domain/service";

import initNotificationRoute from "./features/notification/adapter/route";
import { NotificationController } from "./features/notification/adapter/controller";
import { NotificationServiceImpl } from "./features/notification/domain/service";

import initTextRoute from "./features/handle_text/adapter/route";
import { TextController } from "./features/handle_text/adapter/controller";
import { TextService } from "./features/handle_text/domain/service";

import initOrchestratorRoute from "./features/orchestrator/adapter/route";
import { OrchestratorController } from "./features/orchestrator/adapter/controller";
import { OrchestratorService } from "./features/orchestrator/domain/service";

import { ProjectService } from "./features/project/domain/service";
import { ProjectController } from "./features/project/adapter/controller";
import initProjectRoute from "./features/project/adapter/route";

import { InputHandleService } from "./features/input/domain/service";
import { InputHandleController } from "./features/input/adapter/controller";
import initInputHandleRoute from "./features/input/adapter/route";

import { ShareProjectService } from "./features/share/domain/service";
import { ShareProjectController } from "./features/share/adapter/controller";
import initShareProjectRoute from "./features/share/adapter/route";
import { notificationService } from "./services/notification.service";

import { UsecaseService } from "./features/usecase/domain/service";
import { UsecaseController } from "./features/usecase/adapter/controller";
import initUsecaseRoute from "./features/usecase/adapter/route";

import initLogRoute from "../command-ingress/features/log/adapter/route";
import { LogService } from "../command-ingress/features/log/domain/service";
import { LogController } from "../command-ingress/features/log/adapter/controller";

import initDatabaseRoute from "./features/database/adapter/route";
import { InputService } from "./features/orchestrator/domain/InputService";

import initTestcaseRoute from './features/testcase/adapter/route';
import { TestcaseController } from './features/testcase/adapter/controller';
import { TestcaseService } from './features/testcase/domain/service';

import initVersionRoute from "./features/version/adapter/route";
import { VersionController } from "./features/version/adapter/controller";
import { VersionService } from "./features/version/domain/service";

import initActivityDiagramRoute from "./features/uml/activity_diagram/adapter/route";
import { ActivityDiagramController } from "./features/uml/activity_diagram/adapter/controller";
import { ActivityDiagramService } from "./features/uml/activity_diagram/domain/service";
// import initOcrRoute from "./features/handle_image/adapter/route";
// import { OcrController } from "./features/handle_image/adapter/controller";
// import { OcrService } from "./features/handle_image/domain/service";

import { UsecaseDiagramController } from "./features/uml/usecase.diagram/adapter/controller";
import { UsecaseDiagramServiceImpl } from "./features/uml/usecase.diagram/domain/service";
import initUsecaseDiagramRoute from "./features/uml/usecase.diagram/adapter/route";

import { SequenceDiagramController } from "./features/uml/sequence.diagram/adapter/controller";
import { SequenceDiagramServiceImpl } from "./features/uml/sequence.diagram/domain/service";
import initSequenceDiagramRoute from "./features/uml/sequence.diagram/adapter/route";

import initStatsRoute from "./features/stats/adapter/route";
import { StatsController } from "./features/stats/adapter/controller";
import { StatsService } from "./features/stats/domain/service";
import { StatsCacheService } from "./features/stats/domain/stats.cache.service";
import { PresenceRedisService } from "./features/presence/domain/presence.redis.service";
import { presenceSocketService } from "./features/presence/domain/presence.socket.service";

import initLLMRoute from "./features/llm/adapter/route";
import { AICopilotController } from "./features/ai_copilot/adapter/controller";
import initAICopilotRoute from "./features/ai_copilot/adapter/route";


const app = express();

const createHttpServer = (redisClient: any) => {
  const server = createServer(app);

  const isProd = !env.DEV;
  if (isProd) {
    app.use(logger);
  }
  // app.use(cors());

  app.use(morgan(() => null));

  app.use(express.json({ limit: '10mb' })); // Tăng từ 100KB lên 10MB
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(
    helmet({
      // Avatar được frontend (origin khác) nhúng trực tiếp.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    fileUpload({
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB/file
      abortOnLimit: true,
    })
  );
  // Chỉ public thư mục avatars; các file upload khác không được phơi ra ngoài.
  const uploadsDir = path.resolve(env.UPLOADS_PATH);
  app.use("/uploads/avatars", express.static(path.join(uploadsDir, "avatars")));
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  appLogger.info("🔍 Debug static file paths:");
  appLogger.info("Process CWD:", process.cwd());
  appLogger.info("__dirname:", __dirname);

  // --- 2. CẤU HÌNH CORS ĐÚNG CHUẨN ---
  // const corsOptions = {
  //   // Thay bằng URL của frontend bạn, đọc từ file .env
  //   origin: 'http://localhost:5173',
  //   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  //   // QUAN TRỌNG: Cho phép trình duyệt gửi header "Authorization"
  //   allowedHeaders: "Content-Type,Authorization"
  // };
  // app.use(cors(corsOptions));
  // app.options('*', cors(corsOptions)); // Xử lý các preflight request

  // Construct services
  const googleIdentityBroker = new GoogleIdentityBroker({
    clientID: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectURL: env.GOOGLE_OAUTH_REDIRECT_URL,
  });

  const authService = new AuthServiceImpl(
    googleIdentityBroker,
    env.JWT_SECRET,
    env.JWT_REFRESH_SECRET,
    env.JWT_OTP_SECRET, // <-- Lấy giá trị mới từ .env
    env.JWT_EMAIL_SECRET // <-- Lấy giá trị mới từ .env
  );

  const orchestratorService = new OrchestratorService();
  const inputService = new InputService();

  const projectService = new ProjectService(orchestratorService, inputService);
  const projectController = new ProjectController(projectService);

  const inputHandleService = new InputHandleService(
    orchestratorService,
    inputService
  );
  const inputHandleController = new InputHandleController(inputHandleService);

  const usecaseService = new UsecaseService();
  const usecaseController = new UsecaseController(usecaseService);

  const testcaseService = new TestcaseService();
  const testcaseController = new TestcaseController();
  // Setup route

  app.use(
    [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/verify-otp",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/resend-verification",
    ],
    authLimiter
  );
  app.use("/api/orchestrate", orchestrateLimiter);
  app.use('/api/auth', initAuthRoute(new AuthController(authService)));
  app.use('/api/orchestrate', initOrchestratorRoute(new OrchestratorController(new OrchestratorService())));
  app.use('/api/projects', initProjectRoute(projectController));
  app.use('/api/admin', initAdminRoute());
  app.use('/api/tokens', initAccessTokenRoute());
  app.use('/api/import', initImportRoute());
  app.use('/api/workhub', initWorkhubRoute());
  app.use('/api/integrations/workhub', initWorkhubCallbackRoute());
  app.use('/api/input', initInputHandleRoute(inputHandleController));
  app.use('/api/usecaseManagement', initUsecaseRoute(usecaseController));
  app.use('/api/databases', initDatabaseRoute())
  app.use('/api/testcases', initTestcaseRoute());
  app.use('/api/activity-diagrams', initActivityDiagramRoute());
  app.use(
    "/api/keys",
    initApiKeyRoute(new ApiKeyController(new ApiKeyServiceImpl()))
  );
  app.use(
    "/api/users",
    initUserRoute(new UserController(new UserServiceImpl()))
  );

  app.use(
    "/api/usecase-diagram",
    initUsecaseDiagramRoute(
      new UsecaseDiagramController(new UsecaseDiagramServiceImpl())
    )
  );

  app.use(
    "/api/sequence-diagram",
    initSequenceDiagramRoute(
      new SequenceDiagramController(new SequenceDiagramServiceImpl())
    )
  );

  app.use(
    "/api/handle_docx",
    initReadDocxRoute(new ReadDocxController(new ReadDocxService()))
  );
  app.use("/api/handle_pdf", initPdfRoute(new PdfController(new PdfService())));
  app.use(
    "/api/handle_extraction",
    initExtractorRoute(new ExtractorController(new ExtractorService()))
  );
  app.use(
    "/api/handle_audio",
    initSpeechRoute(new SpeechController(new SpeechToTextService()))
  );
  app.use(
    "/api/handle_image",
    initOcrRoute(new OcrController(new OcrService()))
  );
  app.use(
    "/api/handle_text",
    initTextRoute(new TextController(new TextService()))
  );
  app.use(
    "/api/projects",
    initShareProjectRoute(new ShareProjectController(new ShareProjectService()))
  );
  app.use(
    "/api/users",
    initShareProjectRoute(new ShareProjectController(new ShareProjectService()))
  );
  app.use(
    "/api/notifications",
    initNotificationRoute(
      new NotificationController(new NotificationServiceImpl())
    )
  );
  app.use("/api/logs", initLogRoute(new LogController(new LogService())));
  app.use("/api/versions", initVersionRoute(new VersionController(new VersionService())))
  app.use("/api/llm", initLLMRoute());
  app.use("/api/ai-copilot", initAICopilotRoute(new AICopilotController()));
  app.use(recoverMiddleware);

  // ✅ Khởi tạo Redis services nếu có Redis client
  if (redisClient) {
    // Khởi tạo Presence Redis Service
    const presenceRedisService = new PresenceRedisService(redisClient);
    presenceSocketService.setRedisService(presenceRedisService);
    appLogger.info('✅ Presence Redis Service initialized');

    // Khởi tạo Stats Cache Service
    const statsCacheService = new StatsCacheService(redisClient);
    const statsService = new StatsService();
    statsService.setCacheService(statsCacheService);
    appLogger.info('✅ Stats Cache Service initialized');

    app.use(
      "/api/stats",
      initStatsRoute(new StatsController(statsService))
    );
  } else {
    // Fallback: không có Redis, dùng StatsService không cache
    const statsService = new StatsService();
  app.use(
    "/api/stats",
      initStatsRoute(new StatsController(statsService))
  );
    // Không log warning ở đây vì đã log ở main.ts khi kết nối Redis
    // appLogger.info('⚠️ Stats Service initialized without Redis cache');
  }

  return server;
};

export { createHttpServer };
