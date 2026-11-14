import { Response, Request, NextFunction } from "express";
import env from "../../../utils/env";
import { UserService } from "../types";
import { UpdateProfileRequestBody } from "./dto";
import { BaseController } from "../../../shared/base-controller";
import responseValidationError from "../../../shared/response";
import { HttpRequest } from "../../../types";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";

class UserController extends BaseController {
  service: UserService;

  constructor(service: UserService) {
    super();
    this.service = service;
  }

  // async getProfile(
  //   req: HttpRequest,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> {
  //   await this.execWithTryCatchBlock(
  //     req,
  //     res,
  //     next,
  //     async (req, res, _next) => {
  //       const userId = req.getSubject();
  //       if (!userId) {
  //         res.status(StatusCodes.UNAUTHORIZED).json({
  //           status: "Error",
  //           message: "Unauthorized",
  //         });
  //         return;
  //       }
  //       const serviceResponse = await this.service.getme(userId);
  //       handleServiceResponse(serviceResponse, res);
  //     }
  //   );
  // }

  async updateProfile(
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
          res.status(StatusCodes.UNAUTHORIZED).json({
            status: "Error",
            message: "Unauthorized",
          });
          return;
        }

        const { name, dob, gender, avatar_url, status, selectedModel } = req.body;
        // dob is optional (accounts created with e-mail + password only have none)
        const newDob = dob && dob.year ? new Date(Date.UTC(dob.year, dob.month - 1, dob.day)) : undefined;
        const updateProfileRequestBody = new UpdateProfileRequestBody(req.body);
        const validationResult = await updateProfileRequestBody.validate();

        if (!validationResult.ok) {
          responseValidationError(res, validationResult.errors[0]);
          return;
        }

        const serviceResponse = await this.service.updateProfile(userId, {
          name,
          newDob,
          gender,
          avatar_url,
          status,
          selectedModel, // ✅ MỚI: Thêm selectedModel
        });

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Updated profile successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async changePassword(
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
          res.status(StatusCodes.UNAUTHORIZED).json({
            status: "Error",
            message: "Unauthorized",
          });
          return;
        }

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Old password and new password are required",
          });
          return;
        }

        const serviceResponse = await this.service.changePassword(userId, {
          oldPassword,
          newPassword,
        });

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Password changed successfull",
          data: serviceResponse,
        });
      }
    );
  }

  async changeEmail(
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
          res.status(StatusCodes.UNAUTHORIZED).json({
            status: "Error",
            message: "Unauthorized",
          });
          return;
        }

        const { newEmail } = req.body;

        if (!newEmail) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "New email are required",
          });
          return;
        }

        const serviceResponse = await this.service.changeEmail(
          userId,
          newEmail
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Email changed successfull",
          data: serviceResponse,
        });
      }
    );
  }

  async getAllUsers(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const serviceResponse = await this.service.getAllUsers();

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get all users successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async getUserById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { id } = req.params;
        if (!id) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "User ID is required",
          });
          return;
        }
        const serviceResponse = await this.service.getUserById(id);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get user by ID successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async updateUserById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { id } = req.params;
        if (!id) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "User ID is required",
          });
          return;
        }

        const { name, dob, gender, avatar_url, status } = req.body;

        // dob is optional (accounts created with e-mail + password only have none)
        const newDob = dob && dob.year ? new Date(Date.UTC(dob.year, dob.month - 1, dob.day)) : undefined;
        const updateProfileRequestBody = new UpdateProfileRequestBody(req.body);
        const validationResult = await updateProfileRequestBody.validate();

        if (!validationResult.ok) {
          responseValidationError(res, validationResult.errors[0]);
          return;
        }

        const serviceResponse = await this.service.updateProfile(id, {
          name,
          newDob,
          gender,
          avatar_url,
          status,
        } as any, true);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get user by ID successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async resetPasswordById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { id } = req.params;
        if (!id) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "User ID is required",
          });
          return;
        }

        const serviceResponse = await this.service.resetPasswordById(id);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Reset password successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async deleteUserById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { id } = req.params;
        if (!id) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "User ID is required",
          });
          return;
        }

        const serviceResponse = await this.service.deleteUserById(id);
        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Delete user successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async searchUsersByNameAndEmail(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const content = req.body.content;
        if (!content) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Content is required",
          });
          return;
        }

        const serviceResponse = await this.service.searchUsersByNameOrEmail(
          content
        );
        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Search users successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async filterUsers(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { system_role, status, gender } = req.body;
        if (!system_role && !status && !gender) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Please select all fields to filter",
          });
          return;
        }
        const serviceResponse = await this.service.filterUsers(
          system_role,
          status,
          gender
        );
        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Search users successfully",
          data: serviceResponse,
        });
      }
    );
  }
  async uploadAvatar(
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
          res.status(StatusCodes.UNAUTHORIZED).json({
            status: "Error",
            message: "Unauthorized",
          });
          return;
        }

        // Kiểm tra file upload
        if (!req.files || !req.files.avatar) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Avatar file is required",
          });
          return;
        }

        const avatarFile = req.files.avatar;

        // Kiểm tra nếu là multiple files
        if (Array.isArray(avatarFile)) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Only single file upload is allowed",
          });
          return;
        }

        const serviceResponse = await this.service.uploadAvatar(userId, avatarFile);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Avatar uploaded successfully",
          data: {
            avatar_url: serviceResponse
          },
        });
      }
    );
  }

  /** Admin: create an account directly. */
  async createUser(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const created = await this.service.createUserByAdmin(req.body ?? {});
      res.status(StatusCodes.CREATED).json({ status: "Success", message: "User created successfully", data: created });
    });
  }

  /** Admin: activate / deactivate one account. */
  async setStatus(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const active = req.body?.active;
      if (typeof active !== "boolean") {
        res.status(StatusCodes.BAD_REQUEST).json({ status: "Error", message: "active must be true or false" });
        return;
      }
      const message = await this.service.setUserStatus(req.getSubject(), String(req.params.id), active);
      res.status(StatusCodes.OK).json({ status: "Success", message });
    });
  }

  /** Admin: activate / deactivate / delete several accounts. */
  async bulk(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const { userIds, action } = req.body ?? {};
      if (!Array.isArray(userIds) || !["activate", "deactivate", "delete"].includes(action)) {
        res.status(StatusCodes.BAD_REQUEST).json({ status: "Error", message: "userIds (array) and action (activate|deactivate|delete) are required" });
        return;
      }
      const result = await this.service.bulkAction(req.getSubject(), userIds.map(String), action);
      res.status(StatusCodes.OK).json({ status: "Success", message: `${result.done} done, ${result.skipped} skipped`, data: result });
    });
  }
}

export { UserController };
