export enum ResponseStatus {
  Success,
  Failed,
}

/**
 * Services report failures as `new Error("Access denied")` and controllers wrap them in a 500. A permission or
 * missing-record problem is not a server error, so the status follows the message (the web client reacts to 401
 * by logging the user out, so these must never come out as 401).
 */
export function statusForFailure(message: string, code: number): number {
  if (code < 500) return code;
  const m = String(message ?? "");
  if (/access denied|do not have access|not allowed|forbidden|no permission|viewer .*quyền|không có quyền/i.test(m)) return 403;
  if (/not found|không tìm thấy/i.test(m)) return 404;
  if (/already exists|does not exist|is required|must be |invalid |cannot be |không hợp lệ|cast to objectid failed|objectid failed|must be a string of 12 bytes/i.test(m)) return 400;
  return code;
}

export class ServiceResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
  code: number;

  constructor(status: ResponseStatus, message: string, data: T, code: number) {
    this.success = status === ResponseStatus.Success;
    this.message = message;
    this.data = data;
    this.code = this.success ? code : statusForFailure(message, code);
  }
}
