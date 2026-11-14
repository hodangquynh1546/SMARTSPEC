import logger from "../../../../../lib/logger";
import { Response, Request, NextFunction } from "express";
import env from "../../../utils/env";
import { AuthService } from "../types";
import {
  ExchangeGoogleTokenBody,
  LogoutRequestBody,
  RefreshTokenRequestBody,
  RegisterRequestBody,
  LoginRequestBody,
  ForgotPasswordRequestBody,
  ResetPasswordRequestBody,
  verifyEmailRequestBody,
} from "./dto";
import { BaseController } from "../../../shared/base-controller";
import responseValidationError from "../../../shared/response";
import { HttpRequest } from "../../../types";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";
import { getClientInfo } from "../../../utils/networkInfo";
import { AuthError } from "../domain/errors";

class AuthController extends BaseController {
  service: AuthService;

  constructor(service: AuthService) {
    super();
    this.service = service;
  }

  async exchangeGoogleToken(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const exchangeGoogleTokenBody = new ExchangeGoogleTokenBody(req.query);
        logger.info("exchangeGoogleTokenBody: ", exchangeGoogleTokenBody);
        // lấy ip và userAgent
        const { ip, userAgent } = getClientInfo(req);
        //
        const validateResult = await exchangeGoogleTokenBody.validate();
        if (!validateResult.ok) {
          responseValidationError(res, validateResult.errors[0]);
          return;
        }

        const exchangeResult = await this.service.exchangeWithGoogleIDP({
          idp: "google",
          code: exchangeGoogleTokenBody.code,
        });

        const params = new URLSearchParams({
          uid: exchangeResult.sub,
          access_token: exchangeResult.accessToken,
          refresh_token: exchangeResult.refreshToken,
        });

        const redirectURL = `${env.CLIENT_URL
          }/oauth/redirect?${params.toString()}`;
        res.redirect(redirectURL);

        return;
      }
    );
  }

  async logout(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const logoutRequestBody = new LogoutRequestBody(req.body);
        // lấy ip và userAgent
        const { ip, userAgent } = getClientInfo(req);
        //
        const validateResult = await logoutRequestBody.validate();
        if (!validateResult.ok) {
          responseValidationError(res, validateResult.errors[0]);
          return;
        }
        await this.service.logout(logoutRequestBody.refreshToken,ip, userAgent);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "User logged in successfully",
        });
      }
    );
  }

  async refreshToken(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const refreshTokenRequestBody = new RefreshTokenRequestBody(req.body);
    const validateResult = await refreshTokenRequestBody.validate();
    if (!validateResult.ok) {
      responseValidationError(res, validateResult.errors[0]);
      return;
    }

    try {
      const token = await this.service.refreshToken(refreshTokenRequestBody.refreshToken);
      res.status(200).json({
        refresh_token: token.refreshToken,
        access_token: token.accessToken,
        refreshToken: token.refreshToken,
        accessToken: token.accessToken,
        sub: token.sub,
      });
    } catch (error) {
      this.fail(res, error, "Error refreshing token");
    }

    return;
  }

  async getProfile(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const userId = req.getSubject();
        if (!userId) {
          throw new Error("User ID not found in request. User is not authenticated.");
        }

        const userProfile = await this.service.getProfile(userId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "User profile fetched successfully.",
          data: userProfile,
        });
        return;
      }
    );
  }

  async verifyOTP(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { email, otp, otpToken } = req.body;

      if (!email || !otp || !otpToken) {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: "Failed",
          message: "Email, OTP, Token are required",
        });
        return;
      }
      // lấy ip và userAgent
      const { ip, userAgent } = getClientInfo(req);
      //
      const verifyOTP = await this.service.verifyOTP(email, otp, otpToken,ip,userAgent);
      const serviceResponse = {
        success: true,
        message: "User logged in successfully",
        data: verifyOTP,
        code: StatusCodes.OK,
      };
      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: "Error verifying OTP",
        error: (error as Error).message,
      });
    }
  }

  /** Expected failures keep their status and code; anything else is a 500 with the message. */
  private fail(res: Response, error: unknown, fallback: string): void {
    if (error instanceof AuthError) {
      res.status(error.status).json({ status: "Failed", code: error.code, message: error.message, error: error.message });
      return;
    }
    logger.error(`${fallback}: ${(error as Error).message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: "Failed", message: fallback, error: (error as Error).message });
  }

  /** Sign up: e-mail, password and confirmation only. */
  async register(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const body = new RegisterRequestBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const { ip, userAgent } = getClientInfo(req);
      const result = await this.service.register(body.email, body.password, body.confirmPassword, ip, userAgent);
      handleServiceResponse({ success: true, message: "User registered successfully", data: result, code: StatusCodes.OK }, res);
    } catch (error) {
      this.fail(res, error, "Error register");
    }
  }

  /** Re-sends the verification link to the signed-in user. */
  async resendVerification(req: HttpRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const sent = await this.service.sendVerificationEmail(req.getSubject());
      res.status(StatusCodes.OK).json({ success: true, message: sent ? "Đã gửi email xác thực" : "Không gửi được email, hãy thử lại sau", data: sent });
    } catch (error) {
      this.fail(res, error, "Error sending verification email");
    }
  }

  async verifyEmail(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { token } = req.body ?? {};
      if (!token || typeof token !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ status: "Failed", message: "Invalid or missing token" });
        return;
      }
      await this.service.verifyEmail(token);
      handleServiceResponse({ success: true, message: "Verify email successfully", data: true, code: StatusCodes.OK }, res);
    } catch (error) {
      this.fail(res, error, "Error verifying email");
    }
  }

  async login(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const body = new LoginRequestBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const { ip, userAgent } = getClientInfo(req);
      const loginResult = await this.service.login(body.email, body.password, ip, userAgent);
      handleServiceResponse({ success: true, message: "User logged in successfully", data: loginResult, code: StatusCodes.OK }, res);
    } catch (error) {
      this.fail(res, error, "Error logging in");
    }
  }

  /** Same answer whether or not the e-mail exists; the reset link is only ever sent to the mailbox. */
  async forgotPassword(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const body = new ForgotPasswordRequestBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const { ip, userAgent } = getClientInfo(req);
      const message = await this.service.forgotPassword(body.email, ip, userAgent);
      res.status(StatusCodes.OK).json({ success: true, message, data: null });
    } catch (error) {
      this.fail(res, error, "Error processing forgot password request");
    }
  }

  async resetPassword(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const token = typeof req.query.token === "string" ? req.query.token : typeof req.body?.token === "string" ? req.body.token : "";
      if (!token) {
        res.status(StatusCodes.BAD_REQUEST).json({ status: "Failed", code: "INVALID_TOKEN", message: "Invalid or missing token" });
        return;
      }
      const body = new ResetPasswordRequestBody({ newPassword: req.body?.newPassword, confirmNewPassword: req.body?.confirmNewPassword });
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const { ip, userAgent } = getClientInfo(req);
      const message = await this.service.resetPassword(token, body.newPassword, ip, userAgent);
      res.status(StatusCodes.OK).json({ success: true, message, data: null });
    } catch (error) {
      this.fail(res, error, "Error resetting password");
    }
  }

  async toggleTwoFactorAuth(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { enable } = req.body;
        if (enable !== true && enable !== false) {
          throw new Error(
            "Invalid value for enable. It should be true or false"
          );
        }
        const userId = req.getSubject();
        if (!userId) {
          throw new Error("User ID not found in request");
        }
        // lấy ip và userAgent
        const { ip, userAgent } = getClientInfo(req);
        //
        const result = await this.service.toggleTwoFactorAuth(userId, enable,ip, userAgent);
        res.status(StatusCodes.OK).json({
          status: "Success",
          message: `Two-factor authentication has been ${enable ? "enabled" : "disabled"
            } successfully.`,
          data: result,
        });
        return;
      }
    );
  }
}

export { AuthController };
