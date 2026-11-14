import rateLimit from "express-rate-limit";

const build = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: "TooManyRequests", message },
  });

// Đăng nhập / OTP / quên mật khẩu: chống brute-force.
export const authLimiter = build(
  15 * 60 * 1000,
  Number(process.env.AUTH_RATE_LIMIT ?? 20), // đặt lớn hơn khi chạy kiểm thử tự động
  "Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 15 phút."
);

// Tác vụ AI tốn tài nguyên.
export const orchestrateLimiter = build(
  60 * 1000,
  10,
  "Quá nhiều yêu cầu xử lý, vui lòng thử lại sau ít phút."
);
