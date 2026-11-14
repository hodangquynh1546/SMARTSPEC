import { resolveMailConfig } from "./mailConfig";

describe("resolveMailConfig", () => {
  it("reads SmartSpec's EMAIL_* names", () => {
    const c = resolveMailConfig({ EMAIL_HOST: "smtp.gmail.com", EMAIL_USER: "a@gmail.com", EMAIL_PASS: "pw" } as any);
    expect(c).toMatchObject({ enabled: true, host: "smtp.gmail.com", port: 587, secure: false, user: "a@gmail.com", pass: "pw", from: "a@gmail.com" });
  });

  it("accepts WorkHub's SMTP_* / MAIL_* names", () => {
    const c = resolveMailConfig({ SMTP_HOST: "h", SMTP_PORT: "465", SMTP_USERNAME: "u@x.com", SMTP_PASSWORD: "p", MAIL_FROM: "no-reply@x.com" } as any);
    expect(c).toMatchObject({ host: "h", port: 465, secure: true, user: "u@x.com", pass: "p", from: "no-reply@x.com" });
  });

  it("EMAIL_* wins over SMTP_*, and blank values are ignored", () => {
    const c = resolveMailConfig({ EMAIL_HOST: "", SMTP_HOST: "fallback", EMAIL_USER: "own", SMTP_USERNAME: "other" } as any);
    expect(c.host).toBe("fallback");
    expect(c.user).toBe("own");
  });

  it("MAIL_ENABLED=false turns sending off; unset or anything else keeps it on", () => {
    expect(resolveMailConfig({ MAIL_ENABLED: "false" } as any).enabled).toBe(false);
    expect(resolveMailConfig({ MAIL_ENABLED: "FALSE" } as any).enabled).toBe(false);
    expect(resolveMailConfig({} as any).enabled).toBe(true);
    expect(resolveMailConfig({ MAIL_ENABLED: "true" } as any).enabled).toBe(true);
  });

  it("EMAIL_FROM overrides the sender, otherwise it is the login user", () => {
    expect(resolveMailConfig({ EMAIL_USER: "u@x.com", EMAIL_FROM: "f@x.com" } as any).from).toBe("f@x.com");
    expect(resolveMailConfig({ EMAIL_USER: "u@x.com" } as any).from).toBe("u@x.com");
  });
});
