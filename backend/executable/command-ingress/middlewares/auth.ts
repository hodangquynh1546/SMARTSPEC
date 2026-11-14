import crypto from "crypto";
import AccessToken from "../../../internal/model/access_token";
import User from "../../../internal/model/user";
import logger from "../../../lib/logger";
import { NextFunction, Response } from "express";
import env from "../utils/env";
import jwt from "jsonwebtoken";
import { HttpRequest } from "../types";

// const requireAuthorizedUser = (
//   req: HttpRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     logger.info(11);
//     const bearerToken = req.headers["authorization"];
//     const jwtToken = bearerToken?.split(" ")[1];

//     if (!jwtToken) {
//       res.sendStatus(401);
//       return;
//     }

//     const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;

//     if (!payload.sub) {
//       res.sendStatus(401);
//       return;
//     }

//     req.getSubject = () => String(payload.sub);
//     logger.info(22);
//     // (req as HttpRequest).getSubject = () => String(payload.sub);
//     next();
//   } catch (error) {
//     next(error);
//   }
// };


export const PAT_PREFIX = "ssp_";

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const lastTouched = new Map<string, number>();

/** Resolves a personal access token to its user id, or null when unknown, revoked or the owner is disabled. */
async function userOfAccessToken(raw: string): Promise<string | null> {
  const hash = sha256(raw);
  const token: any = await AccessToken.findOne({ token_hash: hash, revoked_at: null }).lean();
  if (!token) return null;
  const user: any = await User.findById(token.user_id).select("status").lean();
  if (!user || user.status === "INACTIVE") return null;
  // keep "last used" fresh without a write on every request
  const now = Date.now();
  if (now - (lastTouched.get(hash) ?? 0) > 60_000) {
    lastTouched.set(hash, now);
    AccessToken.updateOne({ _id: token._id }, { $set: { last_used_at: new Date() } }).catch(() => undefined);
  }
  return String(token.user_id);
}

const requireAuthorizedUser = async (
  req: HttpRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const bearerToken = req.headers["authorization"];
    const jwtToken = bearerToken?.split(" ")[1];

    // Personal access token (used by the Claude MCP): acts as its owner, never as an admin
    if (jwtToken?.startsWith(PAT_PREFIX)) {
      const userId = await userOfAccessToken(jwtToken);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized", message: "Access token is invalid or revoked" });
      }
      req.getSubject = () => userId;
      (req as any).viaAccessToken = true;
      return next();
    }

    if (!jwtToken) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Token is missing or invalid",
      });
    }

    const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid token",
      });
    }

    // Lưu subject vào request để controller dùng
    req.getSubject = () => String(payload.sub);

    next();
  } catch (error: any) {
    // JWT expired hoặc lỗi khác
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: error.message || "Invalid token",
    });
  }
};


/** Sign-in sessions only: a token must not be able to mint more tokens or change account settings. */
const requireInteractiveSession = (req: HttpRequest, res: Response, next: NextFunction) =>
  requireAuthorizedUser(req, res, () => {
    if ((req as any).viaAccessToken) {
      return res.status(403).json({ success: false, error: "Forbidden", message: "This action needs a signed-in session, not an access token." });
    }
    next();
  });

const requireRole = (system_role: string) => {
  return (req: HttpRequest, res: Response, next: NextFunction) => {
    try {
      const bearerToken = req.headers["authorization"];
      const jwtToken = bearerToken?.split(" ")[1];

      if (jwtToken?.startsWith(PAT_PREFIX)) {
        return res.status(403).json({ success: false, error: "Forbidden", message: `Access tokens cannot perform ${system_role} actions.` });
      }

      if (!jwtToken) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Token is missing or invalid",
        });
      }

      const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;

      logger.info("Payload:", payload);
      logger.info("Required role:", system_role);

      if (!payload.sub || payload.system_role !== system_role) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: `You must have the ${system_role} role to perform this action.`,
        });
      }

      req.getSubject = () => String(payload.sub);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export { requireAuthorizedUser, requireInteractiveSession, requireRole };
