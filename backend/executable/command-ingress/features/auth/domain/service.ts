import env from "../../../utils/env";
import logger from "../../../../../lib/logger";
import { v4 as uuidv4 } from "uuid";
import {
  AuthService,
  ExchangeTokenResult,
  ExchangeTokenRequest,
  LoginResponse,
} from "../types";
import User from "../../../../../internal/model/user";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { GoogleIdentityBroker } from "../identity-broker/google-idp.broker";
import bcrypt from "bcrypt";
import {
  ServiceResponse,
  ResponseStatus,
} from "../../../services/serviceResponse";
import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";
import { LogService } from "../../log/domain/service";
import { AuthError } from "./errors";
import { assertPasswordPolicy } from "./password";
import { workhubIdentity } from "./identity";
import { workhubSyncService } from "../../workhub/domain/service";

export class AuthServiceImpl implements AuthService {
  googleIdentityBroker: GoogleIdentityBroker;
  jwtSecret: string;          // Dùng cho Access Token
  jwtRefreshSecret: string;   // Dùng cho Refresh Token
  jwtOtpSecret: string;       // Dùng cho OTP Token
  jwtEmailSecret: string      // Dùng cho Verify Email & Reset Password
  //Thêm log
  private logService: LogService;
  constructor(
    googleIdentityBroker: GoogleIdentityBroker,
    jwtSecret: string,
    jwtRefreshSecret: string,
    jwtOtpSecret: string,
    jwtEmailSecret: string
  ) {
    this.googleIdentityBroker = googleIdentityBroker;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
    this.jwtOtpSecret = jwtOtpSecret;
    this.jwtEmailSecret = jwtEmailSecret;
    //Khởi tạo log
    this.logService = new LogService();
  }

  private hashOtp(email: string, otp: string): string {
    return crypto.createHmac("sha256", this.jwtOtpSecret).update(`${email}:${otp}`).digest("hex");
  }

  signAccessToken(payload: any): string {
    return jwt.sign(
      {
        ...payload,
      },
      this.jwtSecret,
      { expiresIn: "1d" }
    );
  }

  signRefreshToken(payload: any): string {
    return jwt.sign({ ...payload, typ: "offline" }, this.jwtRefreshSecret, {
      expiresIn: "30d",
    });
  }

  verifyToken(token: string, secret: string): any {
    return jwt.verify(token, secret);
  }

  async createUserIfNotExists(userProfile: any): Promise<any> {
    let user = await User.findOne({ email: userProfile.email });
    if (!user) {
      user = new User({
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.picture ?? "",
        lists: [
          {
            name: "Reading list",
            posts: [],
            images: [],
          },
        ],
        provider: "GOOGLE",
        email_verified: true,
      });

      await user.save();
      await this.logService.createLog({
        user_id: user._id.toString(),
        target_id: user._id.toString(),
        action: "create_user",
        target_type: "system",
        details: { message: `New Google user created: ${user.email}` },
        level: "info",
      });
    }

    return user;
  }

  async exchangeWithGoogleIDP(
    request: ExchangeTokenRequest, ip?: string, userAgent?: string
  ): Promise<ExchangeTokenResult> {
    const { code } = request;
    const googleToken =
      await this.googleIdentityBroker.exchangeAuthorizationCode(code);
    const userProfile = await this.googleIdentityBroker.fetchProfile({
      idToken: googleToken.idToken,
      accessToken: googleToken.accessToken,
    });

    const user = await this.createUserIfNotExists(userProfile);
    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user._id,
      sub: user._id,
      sid: sessionID,
      system_role: user.system_role
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);
    const session = new Session({ sessionID: sessionID, userID: user._id });
    await session.save();

    await this.logService.createLog({
      user_id: user._id.toString(),
      target_id: user._id.toString(),
      action: "login",
      target_type: "system",
      details: { message: `Google login success for ${user.email}` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });
    return {
      refreshToken,
      accessToken,
      sub: String(user._id),
    };
  }
  async logout(refreshToken: string, ip?: string, userAgent?: string): Promise<string> {
    const jwtClaims = jwt.verify(refreshToken, this.jwtRefreshSecret);
    const sid = jwtClaims["sid"];
    const sub = jwtClaims["sub"];
    await Session.deleteOne({
      sessionID: sid,
    });
    await this.logService.createLog({
      user_id: sub?.toString(),
      target_id: sub?.toString(),
      action: "logout",
      target_type: "system",
      details: { message: ` User "${sub}" logged out successfully (Session ID: ${sid}).` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });
    return "User logged out successfully";
  }

  async getProfile(userId: string): Promise<any> {
    const user = await User.findById(userId).select('-password'); // Lấy user và loại bỏ trường password
    if (!user) {
      throw new Error("User not found");
    }

    // Transform user object để đảm bảo dob được serialize đúng
    const userObj = user.toObject ? user.toObject() : user;

    // Đảm bảo dob là Date object hoặc ISO string
    if (userObj.dob) {
      // Nếu là Date object, giữ nguyên (Express sẽ serialize thành ISO string)
      // Nếu đã là string, giữ nguyên
      if (!(userObj.dob instanceof Date) && typeof userObj.dob !== 'string') {
        // Nếu là object khác, thử convert
        userObj.dob = new Date(userObj.dob);
      }
    }

    return userObj;
  }


  // ---------------------------------------------------------------- accounts (shared with WorkHub)

  private normalizeEmail(email: string): string {
    return String(email ?? "").trim().toLowerCase();
  }

  /** Case-insensitive lookup (older accounts may have been stored with capitals). */
  private async findUserByEmail(email: string): Promise<any | null> {
    const normalized = this.normalizeEmail(email);
    const exact = await User.findOne({ email: normalized });
    if (exact) return exact;
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return User.findOne({ email: new RegExp(`^${escaped}$`, "i") });
  }

  private checkPassword(password: string) {
    assertPasswordPolicy(password);
  }

  private async startSession(user: any, message: string, ip?: string, userAgent?: string): Promise<ExchangeTokenResult> {
    const sessionID = uuidv4();
    const jwtPayload = { _id: user._id, sub: user._id, sid: sessionID, system_role: user.system_role };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);
    await new Session({ sessionID, userID: user._id }).save();
    await this.logService.createLog({
      user_id: user._id.toString(), target_id: user._id.toString(), action: "login", target_type: "system",
      details: { message }, level: "info", ip, user_agent: userAgent,
    });
    return { refreshToken, accessToken, sub: String(user._id) };
  }

  private signEmailToken(email: string, typ: "verify" | "reset", expiresIn: string): string {
    return jwt.sign({ email, typ }, this.jwtEmailSecret, { expiresIn } as jwt.SignOptions);
  }

  private readEmailToken(token: string, typ: "verify" | "reset"): string {
    let payload: any;
    try {
      payload = jwt.verify(token, this.jwtEmailSecret);
    } catch {
      throw new AuthError(400, "INVALID_TOKEN", "Liên kết không hợp lệ hoặc đã hết hạn");
    }
    if (payload?.typ !== typ || !payload.email) throw new AuthError(400, "INVALID_TOKEN", "Liên kết không hợp lệ hoặc đã hết hạn");
    return String(payload.email);
  }

  /** Sends the verification link (best effort: a mail outage must not block the account). */
  async sendVerificationEmail(userId: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) throw new AuthError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản");
    if (user.email_verified) return true;
    const token = this.signEmailToken(user.email, "verify", "24h");
    const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
    return this.sendmail(user.email, "Xác thực email SmartSpec",
      `<p>Xin chào ${user.name ?? ""},</p><p>Nhấn vào liên kết sau để xác thực email của bạn (có hiệu lực 24 giờ):</p><p><a href="${link}">${link}</a></p>`);
  }

  async verifyEmail(token: string): Promise<boolean> {
    const email = this.readEmailToken(token, "verify");
    const user = await this.findUserByEmail(email);
    if (!user) throw new AuthError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản");
    if (!user.email_verified) {
      user.email_verified = true;
      await user.save();
    }
    return true;
  }

  /**
   * Sign up with e-mail, password and confirmation only. If the address already has a WorkHub account with the same
   * password this is the same person, so the account is simply created here too; a different password is refused.
   */
  async register(email: string, password: string, confirmPassword: string, ip?: string, userAgent?: string): Promise<ExchangeTokenResult & { emailVerified: boolean }> {
    const normalized = this.normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new AuthError(400, "INVALID_EMAIL", "Email không hợp lệ");
    this.checkPassword(password);
    if (password !== confirmPassword) throw new AuthError(400, "PASSWORD_MISMATCH", "Mật khẩu xác nhận không khớp");
    if (await this.findUserByEmail(normalized)) throw new AuthError(409, "EMAIL_TAKEN", "Email này đã được đăng ký");

    const peer = await workhubIdentity.verify(normalized, password);
    if (peer.status === "wrong_password") {
      throw new AuthError(409, "EMAIL_TAKEN_ELSEWHERE", "Email này đã có tài khoản WorkHub với mật khẩu khác. Hãy đăng nhập bằng mật khẩu của WorkHub.");
    }
    const name = peer.name || normalized.split("@")[0];
    const user = await new User({
      email: normalized, password: await bcrypt.hash(password, 10), name, email_verified: peer.status === "ok" && !!peer.emailVerified, password_changed_at: new Date(),
    }).save();

    await this.logService.createLog({
      user_id: user._id.toString(), target_id: user._id.toString(), action: "create_user", target_type: "system",
      details: { message: `User "${normalized}" registered (ID: ${user._id}).` }, level: "info", ip, user_agent: userAgent,
    });
    if (!user.email_verified) this.sendVerificationEmail(String(user._id)).catch(() => undefined);
    await this.linkWorkhub(user, password, peer.status !== "ok");
    return { ...(await this.startSession(user, `User "${normalized}" registered and signed in.`, ip, userAgent)), emailVerified: !!user.email_verified };
  }

  /** Links the user's WorkHub account (creating it when needed) so projects appear there without any extra step. */
  private async linkWorkhub(user: any, password: string, createIfMissing: boolean): Promise<void> {
    await Promise.race([
      workhubSyncService.autoLink(String(user._id), user.email, password, user.name, createIfMissing).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 6000)), // never make sign-in wait long for the peer
    ]);
  }

  async login(email: string, password: string, ip?: string, userAgent?: string): Promise<LoginResponse> {
    const normalized = this.normalizeEmail(email);
    let user = await this.findUserByEmail(normalized);
    let ok = !!user?.password && (await bcrypt.compare(password, user.password));

    if (!ok) {
      // Not here (or a different password): the other system may know this account, e.g. it was created or its
      // password changed there. Adopt it.
      const peer = await workhubIdentity.verify(normalized, password);
      const peerChanged = peer.passwordChangedAt ? new Date(peer.passwordChangedAt) : null;
      // An existing account only takes the peer's password when it was changed there AFTER ours: otherwise the peer
      // is just stale (an old password) and must not come back to life.
      const peerIsNewer = !!peerChanged && (!user?.password_changed_at || peerChanged.getTime() > new Date(user.password_changed_at).getTime());
      if (peer.status === "ok" && (!user || peerIsNewer)) {
        const hash = await bcrypt.hash(password, 10);
        if (!user) {
          user = await new User({ email: normalized, password: hash, name: peer.name || normalized.split("@")[0], email_verified: !!peer.emailVerified, password_changed_at: peerChanged ?? new Date() }).save();
          await this.logService.createLog({ user_id: user._id.toString(), target_id: user._id.toString(), action: "create_user", target_type: "system",
            details: { message: `User "${normalized}" created from the WorkHub account on first sign-in.` }, level: "info", ip, user_agent: userAgent });
        } else {
          user.password = hash;
          user.password_changed_at = peerChanged ?? new Date();
          if (peer.emailVerified) user.email_verified = true;
          await user.save();
        }
        ok = true;
      }
    }
    if (!user || !ok) {
      await this.logService.createLog({ user_id: user ? user._id.toString() : undefined, target_id: undefined, action: "failed_login", target_type: "system",
        details: { message: `Failed login attempt for "${normalized}"` }, level: "warning", ip, user_agent: userAgent });
      // one message for "no such account" and "wrong password": do not reveal which e-mails exist
      throw new AuthError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
    }
    if (user.status === "INACTIVE") throw new AuthError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị vô hiệu hoá");

    // keep the WorkHub link (and its projects) up to date; the password is only known right now
    this.linkWorkhub(user, password, false).catch(() => undefined);

    if (user.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      // The token only carries an HMAC of the OTP (server-side secret), so the client cannot read the code.
      const otpToken = jwt.sign({ email: user.email, otpHash: this.hashOtp(user.email, otp), typ: "otp" }, this.jwtOtpSecret, { expiresIn: "5m" });
      await this.sendmail(user.email, "Mã OTP đăng nhập SmartSpec", `Mã OTP của bạn là: ${otp}`);
      return { isTwoFactorEnabled: true, otpToken };
    }
    const tokens = await this.startSession(user, `User "${user.email}" logged in successfully.`, ip, userAgent);
    return { isTwoFactorEnabled: false, ...tokens };
  }

  /** Always answers the same way, and never returns the token: it only goes to the mailbox. */
  async forgotPassword(email: string, ip?: string, userAgent?: string): Promise<string> {
    const user = await this.findUserByEmail(email);
    if (user) {
      const token = this.signEmailToken(user.email, "reset", "1h");
      const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
      await this.logService.createLog({ user_id: user._id.toString(), target_id: user._id.toString(), action: "update_user", target_type: "system",
        details: { message: `Password reset requested by "${user.email}".` }, level: "info", ip, user_agent: userAgent });
      const sent = await this.sendmail(user.email, "Đặt lại mật khẩu SmartSpec",
        `<p>Nhấn vào liên kết sau để đặt lại mật khẩu (có hiệu lực 1 giờ):</p><p><a href="${link}">${link}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`);
      if (!sent) logger.warn(`Could not send the password reset e-mail to ${user.email}`);
    }
    return "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.";
  }

  async resetPassword(token: string, newPassword: string, ip?: string, userAgent?: string): Promise<string> {
    const email = this.readEmailToken(token, "reset");
    this.checkPassword(newPassword);
    const user = await this.findUserByEmail(email);
    if (!user) throw new AuthError(400, "INVALID_TOKEN", "Liên kết không hợp lệ hoặc đã hết hạn");
    user.password = await bcrypt.hash(newPassword, 10);
    user.password_changed_at = new Date();
    user.email_verified = true; // following the link proves the address is theirs
    await user.save();
    await Session.deleteMany({ userID: user._id }); // sign out everywhere, like WorkHub
    await workhubIdentity.setPassword(user.email, newPassword); // the same account in WorkHub gets the new password now
    await this.logService.createLog({ user_id: user._id.toString(), target_id: user._id.toString(), action: "update_user", target_type: "system",
      details: { message: `User "${user.email}" reset the password.` }, level: "info", ip, user_agent: userAgent });
    return "Đặt lại mật khẩu thành công";
  }

  async refreshToken(token: string): Promise<ExchangeTokenResult> {
    let claims: any;
    try {
      claims = this.verifyToken(token, this.jwtRefreshSecret);
    } catch {
      throw new AuthError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã hết hạn");
    }
    const session = await Session.findOne({ sessionID: claims.sid });
    if (!session) throw new AuthError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại");
    const user = await User.findById(claims.sub).select("system_role status");
    if (!user || user.status === "INACTIVE") throw new AuthError(401, "INVALID_REFRESH_TOKEN", "Tài khoản không còn hiệu lực");

    // system_role must survive a refresh, otherwise an admin turns into a participant after the first token rotation
    const jwtPayload = { _id: claims.sub, sub: claims.sub, sid: claims.sid, system_role: user.system_role };
    return { sub: String(claims.sub), accessToken: this.signAccessToken(jwtPayload), refreshToken: this.signRefreshToken(jwtPayload) };
  }

  async verifyOTP(
    email: string,
    otp: string,
    otpToken: string,
    ip?: string, userAgent?: string
  ): Promise<ExchangeTokenResult> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    let payload: { email: string; otpHash: string; typ?: string };
    try {
      payload = jwt.verify(otpToken, this.jwtOtpSecret) as typeof payload;
    } catch {
      throw new Error("Invalid OTP or token");
    }

    const expected = Buffer.from(this.hashOtp(email, String(otp)));
    const actual = Buffer.from(String(payload.otpHash ?? ""));
    if (
      payload.typ !== "otp" ||
      payload.email !== email ||
      expected.length !== actual.length ||
      !crypto.timingSafeEqual(expected, actual)
    ) {
      throw new Error("Invalid OTP or token");
    }

    // Sau khi xác thực thành công, tạo session và cấp token cho người dùng.
    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user._id,
      sub: user._id,
      sid: sessionID,
      system_role: user.system_role
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);
    const session = new Session({ sessionID, userID: user._id });
    await session.save();
    await this.logService.createLog({
      user_id: user._id.toString(),
      target_id: user._id.toString(),
      action: "login",
      target_type: "system",
      details: { message: `2FA login success for ${email}` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });
    return {
      refreshToken,
      accessToken,
      sub: String(user._id),
    };
  }

  async sendmail(
    email: string,
    subject: string,
    data: string
  ): Promise<boolean> {
    try {
      const mailIsSent = await mailService.sendEmail({
        emailFrom: mailService.from(),
        emailTo: email,
        emailSubject: subject,
        emailText: `${data}`,
      });

      logger.info("mailIsSent", mailIsSent);

      if (!mailIsSent) {
        return false;
      }
      return true;
    } catch (ex) {
      // the real reason (bad host, wrong password, blocked port…) must be visible, not swallowed
      logger.error(`Error sending email: ${(ex as Error).message}`);
      return false;
    }
  }
  async toggleTwoFactorAuth(userId: string, enable: boolean, ip?: string, userAgent?: string): Promise<string> {
    try {
      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new Error("User not found");
      }
      const oldValue = user.isTwoFactorEnabled;
      user.isTwoFactorEnabled = enable === true;
      await user.save();
      await this.logService.createLog({
        user_id: userId,
        target_id: userId,
        action: "update_user",
        target_type: "system",
        details: {
          before: { isTwoFactorEnabled: oldValue },
          after: { isTwoFactorEnabled: enable },
          message: `User "${user.email}" ${enable ? "enabled" : "disabled"} Two-Factor Authentication (2FA).`
        },
        level: "info",
        ip: ip,
        user_agent: userAgent
      });
      return `Two-factor authentication has been ${enable === true ? "enabled" : "disabled"
        } successfully.`;
    } catch (error) {
      throw new Error("Error toggling two-factor authentication");
    }
  }
}
