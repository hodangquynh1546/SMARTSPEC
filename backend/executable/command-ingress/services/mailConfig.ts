/**
 * Email settings. SmartSpec's own names (EMAIL_*) and WorkHub's (SMTP_*, MAIL_*) are both accepted, so one set of
 * values can be copied between the two projects. EMAIL_* wins when both are present.
 *
 * MAIL_ENABLED=false switches sending off: messages are written to the log instead (handy in development, the
 * verification / reset links can be read there). Unset or true = really send.
 */
export interface MailConfig {
  enabled: boolean;
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

const pick = (...values: (string | undefined)[]) => values.find((v) => v !== undefined && v.trim() !== "")?.trim();

export function resolveMailConfig(env: NodeJS.ProcessEnv): MailConfig {
  const port = Number(pick(env.EMAIL_PORT, env.SMTP_PORT) ?? 587);
  const user = pick(env.EMAIL_USER, env.SMTP_USERNAME);
  return {
    enabled: (pick(env.MAIL_ENABLED) ?? "true").toLowerCase() !== "false",
    host: pick(env.EMAIL_HOST, env.SMTP_HOST),
    port,
    secure: port === 465, // 465 = TLS from the start; 587 = STARTTLS
    user,
    pass: pick(env.EMAIL_PASS, env.SMTP_PASSWORD),
    from: pick(env.EMAIL_FROM, env.MAIL_FROM) ?? user ?? "",
  };
}
