/**
 * Logger dùng chung. Giữ chữ ký giống `console` (nhận nhiều đối số) để thay thế trực tiếp.
 * Điều chỉnh mức log bằng biến môi trường LOG_LEVEL: debug | info | warn | error | silent.
 * Mặc định: debug khi DEV=true, ngược lại info.
 */
type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const resolveThreshold = (): number => {
  const configured = (process.env.LOG_LEVEL || "").toLowerCase() as Level | "silent";
  if (configured in ORDER) return ORDER[configured];
  return process.env.DEV === "true" ? ORDER.debug : ORDER.info;
};

const threshold = resolveThreshold();

const emit = (level: Level, args: unknown[]) => {
  if (ORDER[level] < threshold) return;
  const prefix = `${new Date().toISOString()} [${level.toUpperCase()}]`;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  sink(prefix, ...args);
};

const logger = {
  debug: (...args: unknown[]) => emit("debug", args),
  info: (...args: unknown[]) => emit("info", args),
  warn: (...args: unknown[]) => emit("warn", args),
  error: (...args: unknown[]) => emit("error", args),
};

export default logger;
