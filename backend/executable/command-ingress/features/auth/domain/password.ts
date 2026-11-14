import { AuthError } from "./errors";

/** One rule for SmartSpec and WorkHub: 8 characters minimum, 72 bytes maximum (bcrypt). */
export function assertPasswordPolicy(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < 8) {
    throw new AuthError(400, "WEAK_PASSWORD", "Mật khẩu phải có ít nhất 8 ký tự");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new AuthError(400, "PASSWORD_TOO_LONG", "Mật khẩu tối đa 72 byte");
  }
}
