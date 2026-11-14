import logger from "../../../lib/logger";
import { NextFunction, Response } from 'express';
import { AsyncHandler, HttpRequest } from '../types';
import { ApiKeyError, analyzeApiKeyError } from './apiKeyErrorHandler';
import { statusForFailure } from '../services/serviceResponse';

export class BaseController {
  async execWithTryCatchBlock(
    req: HttpRequest,
    res: Response,
    next: NextFunction,
    handler: AsyncHandler
  ) {
    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error("❌ Error in execWithTryCatchBlock:", error);
      if (!res.headersSent) {
        // Xử lý ApiKeyError đặc biệt
        if (error instanceof ApiKeyError) {
          const errorInfo = error.errorInfo;
          const language = req.headers['accept-language']?.includes('vi') ? 'vi' : 'en';
          
          res.status(this.getHttpStatusForApiKeyError(errorInfo.type)).json({
            status: "Error",
            message: errorInfo.userFriendlyMessage[language],
            error: errorInfo.type,
            errorCode: errorInfo.type,
            errorType: 'API_KEY_ERROR',
            retryable: errorInfo.retryable,
            shouldDisableKey: errorInfo.shouldDisableKey,
          });
          return;
        }

        // Lỗi dạng HTTP (`throw { status: 403, message }`) không phải lỗi API key: trả đúng mã của nó
        const httpLike = !(error instanceof Error) && error && typeof error === 'object' ? (error as any) : null;
        if (httpLike && Number.isInteger(httpLike.status) && httpLike.status >= 400 && httpLike.status < 600) {
          res.status(httpLike.status).json({ status: "Error", message: String(httpLike.message ?? "Request failed"), error: httpLike.code ?? "HttpError" });
          return;
        }

        // Xử lý lỗi thông thường
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Thử phân tích xem có phải lỗi API key không
        const apiKeyErrorInfo = analyzeApiKeyError(error);
        if (apiKeyErrorInfo.type !== 'UNKNOWN') {
          const language = req.headers['accept-language']?.includes('vi') ? 'vi' : 'en';
          res.status(this.getHttpStatusForApiKeyError(apiKeyErrorInfo.type)).json({
            status: "Error",
            message: apiKeyErrorInfo.userFriendlyMessage[language],
            error: apiKeyErrorInfo.type,
            errorCode: apiKeyErrorInfo.type,
            errorType: 'API_KEY_ERROR',
            retryable: apiKeyErrorInfo.retryable,
            shouldDisableKey: apiKeyErrorInfo.shouldDisableKey,
          });
          return;
        }

        res.status(((mapped) => (mapped === 500 ? 400 : mapped))(statusForFailure(errorMessage, 500))).json({
          status: "Error",
          message: errorMessage,
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }

  private getHttpStatusForApiKeyError(errorType: string): number {
    switch (errorType) {
      case 'QUOTA_EXCEEDED':
      case 'RESOURCE_EXHAUSTED':
        return 402; // Payment Required
      case 'RATE_LIMIT':
        return 429; // Too Many Requests
      // Lỗi của API key LLM là lỗi của dịch vụ phía sau, KHÔNG phải của phiên người dùng: trả 401/403 sẽ khiến
      // web tưởng phiên hết hạn và đăng xuất người dùng.
      case 'INVALID_KEY':
      case 'UNAUTHORIZED':
      case 'PERMISSION_DENIED':
        return 502; // Bad Gateway
      case 'SERVICE_UNAVAILABLE':
        return 503; // Service Unavailable
      case 'BILLING_ISSUE':
        return 402; // Payment Required
      default:
        return 400; // Bad Request
    }
  }
}