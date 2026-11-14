import { describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";

const user = { _id: "u1", email: "a@b.com", password: "x", system_role: "USER", isTwoFactorEnabled: true };
jest.mock("../../../../../internal/model/user", () => ({
  __esModule: true,
  default: { findOne: async () => user },
}));
jest.mock("../../../../../internal/model/session", () => ({
  __esModule: true,
  default: class { save = async () => undefined },
}));
jest.mock("../../log/domain/service", () => ({
  LogService: class { createLog = async () => undefined },
}));
jest.mock("../../../services/sendMail.service", () => ({
  __esModule: true,
  default: { sendMail: async () => undefined },
}));

import { AuthServiceImpl } from "./service";

const OTP_SECRET = "otp-secret";
const makeService = () =>
  new AuthServiceImpl({} as any, "access", "refresh", OTP_SECRET, "email");

describe("2FA OTP token", () => {
  it("không chứa OTP dạng đọc được và verify đúng mã", async () => {
    const svc = makeService() as any;
    const otp = "123456";
    const otpToken = jwt.sign(
      { email: user.email, otpHash: svc.hashOtp(user.email, otp), typ: "otp" },
      OTP_SECRET,
      { expiresIn: "5m" }
    );
    const decoded = jwt.decode(otpToken) as any;
    expect(JSON.stringify(decoded)).not.toContain(otp);

    await expect(svc.verifyOTP(user.email, otp, otpToken)).resolves.toBeDefined();
    await expect(svc.verifyOTP(user.email, "000000", otpToken)).rejects.toThrow("Invalid OTP");
  });

  it("từ chối token ký bằng secret khác (vd access secret)", async () => {
    const svc = makeService() as any;
    const forged = jwt.sign(
      { email: user.email, otpHash: svc.hashOtp(user.email, "111111"), typ: "otp" },
      "access"
    );
    await expect(svc.verifyOTP(user.email, "111111", forged)).rejects.toThrow("Invalid OTP");
  });
});
