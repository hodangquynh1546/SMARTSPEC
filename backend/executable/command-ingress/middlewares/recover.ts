import logger from "../../../lib/logger";
import { Request, Response, NextFunction } from 'express';
import { statusForFailure } from '../services/serviceResponse';

export function recoverMiddleware(
  error: any, // Dùng `any` để bắt được cả những thứ không phải là đối tượng Error
  req: Request,
  res: Response,
  next: NextFunction
) {
  // BƯỚC 1 (QUAN TRỌNG NHẤT): Ghi lại toàn bộ thông tin lỗi và stack trace ra console.
  // Lần tới khi server bị lỗi 500, bạn sẽ thấy chi tiết lỗi ở đây.
  logger.error("==================== UNHANDLED ERROR ====================");
  logger.error(`[${new Date().toISOString()}] Error on request ${req.method} ${req.path}`);
  logger.error(error); // In ra đối tượng lỗi đầy đủ, bao gồm cả stack trace
  logger.error("=======================================================");

  // BƯỚC 2: Kiểm tra nếu response đã được gửi đi thì không làm gì nữa
  if (res.headersSent) {
    return next(error);
  }

  // BƯỚC 3: lỗi do người dùng (thiếu quyền, không tìm thấy, dữ liệu sai) trả đúng mã 4xx kèm lý do;
  // chỉ lỗi thật sự của máy chủ mới trả 500 chung chung.
  const message = error instanceof Error ? error.message : typeof error?.message === "string" ? error.message : "";
  const declared = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : null;
  const status = declared ?? statusForFailure(message, 500);
  if (status < 500) {
    res.status(status).json({ success: false, error: status === 403 ? "Forbidden" : status === 404 ? "NotFound" : "BadRequest", message });
    return;
  }
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "An unexpected error occurred on the server.",
  });
}