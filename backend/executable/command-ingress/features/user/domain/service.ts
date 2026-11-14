import { assertPasswordPolicy } from "../../auth/domain/password";
import { workhubIdentity } from "../../auth/domain/identity";
import { workhubSyncService } from "../../workhub/domain/service";
import logger from "../../../../../lib/logger";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import {
  UserResponse,
  UserService,
  ExchangeTokenResult,
  ExchangeTokenRequest,
} from "../types";
import User from "../../../../../internal/model/user";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";
import { faker } from "@faker-js/faker";

export class UserServiceImpl implements UserService {
  async getAllUsers(): Promise<UserResponse[]> {
    const users = await User.find();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      avatar_url: user.avatar_url,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    }));
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await User.findOne({ _id: id });
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user.id,
      email: user.email,
      avatar_url: user.avatar_url,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    };
  }

  async getme(token: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
  async changePassword(
    userId: string,
    body: { oldPassword: string; newPassword: string }
  ): Promise<string> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }
    if (body.oldPassword === body.newPassword) {
      throw new Error("New password must be different from old password");
    }

    const isMatch = await bcrypt.compare(body.oldPassword, user.password);
    if (!isMatch) {
      throw new Error("Old password is incorrect");
    }

    assertPasswordPolicy(body.newPassword);
    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    user.password = hashedPassword;
    user.password_changed_at = new Date();
    await user.save();
    await workhubIdentity.setPassword(user.email, body.newPassword);
    return "Password changed successfully";
  }
  async updateProfile(
    userId: string,
    body: {
      name?: string;
      isTwoFactorEnabled?: boolean;
      newDob?: Date;
      gender?: string;
      avatar_url?: string;
      status?: string;
      selectedModel?: string; // ✅ MỚI: Model LLM được user chọn
    },
    asAdmin = false
  ): Promise<UserResponse> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }
    if (body.name) {
      user.name = body.name;
    }
    if (body.newDob) {
      user.dob = body.newDob;
    }
    if (body.gender) {
      user.gender = body.gender;
    }
    if (body.avatar_url) {
      user.avatar_url = body.avatar_url;
    }
    // chỉ quản trị viên được khoá/mở tài khoản; người dùng không tự đổi trạng thái của mình qua hồ sơ
    if (asAdmin && (body.status === "ACTIVE" || body.status === "INACTIVE")) {
      user.status = body.status;
      if (body.status === "INACTIVE") await Session.deleteMany({ userID: user._id });
    }
    // ✅ MỚI: Cập nhật selectedModel trong setting
    if (body.selectedModel !== undefined) {
      if (!user.setting) {
        user.setting = { language: "vi", theme: "light", selectedModel: null };
      }
      (user.setting as any).selectedModel = body.selectedModel || null;
      logger.info(`✅ [updateProfile] Updated selectedModel for user ${userId}: ${body.selectedModel || 'null'}`);
    }

    await user.save();

    return {
      id: user.id,
      email: user.email,
      avatar_url: user.avatar_url,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    };
  }
  async resetPasswordById(id: string): Promise<string> {
    const user = await User.findOne({ _id: id });
    if (!user) {
      throw new Error("User not found");
    }

    const newPassword = faker.string.alphanumeric(12).toLowerCase();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.password_changed_at = new Date();
    await user.save();
    await workhubIdentity.setPassword(user.email, newPassword);

    const subject = "Password Reset Notification";
    const data = `<p>Your password has been reset.</p>
                  <p>Your new password is: <b>${newPassword}</b>.</p>
                  <p>Please change it after logging in.</p>`;
    const mailIsSent = await mailService.sendEmail({
      emailFrom: mailService.from(),
      emailTo: user.email,
      emailSubject: subject,
      emailText: `${data}`,
    });

    return "Password reset successfully. New password has been sent to the user's email.";
  }

  /** Admin creates an account directly (no verification mail needed: the admin vouches for the address). */
  async createUserByAdmin(input: { email: string; password: string; name?: string; system_role?: string }): Promise<UserResponse> {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
    assertPasswordPolicy(input.password);
    if (await User.findOne({ email })) throw new Error("Email is already in use");
    const user = await new User({
      email, password: await bcrypt.hash(input.password, 10), name: input.name?.trim() || email.split("@")[0],
      system_role: input.system_role === "ADMIN" ? "ADMIN" : "PARTICIPANT", email_verified: true, password_changed_at: new Date(),
    }).save();
    return { id: user.id, email: user.email, avatar_url: user.avatar_url, name: user.name, dob: user.dob, system_role: user.system_role, status: user.status, gender: user.gender, isTwoFactorEnabled: user.isTwoFactorEnabled } as UserResponse;
  }

  async setUserStatus(actorId: string, id: string, active: boolean): Promise<string> {
    if (!active && actorId === id) throw new Error("You cannot deactivate your own account");
    const user = await User.findOne({ _id: id });
    if (!user) throw new Error("User not found");
    user.status = active ? "ACTIVE" : "INACTIVE";
    await user.save();
    if (!active) await Session.deleteMany({ userID: user._id }); // sign them out everywhere
    return active ? "User activated" : "User deactivated";
  }

  async bulkAction(actorId: string, ids: string[], action: "activate" | "deactivate" | "delete"): Promise<{ done: number; skipped: number }> {
    let done = 0, skipped = 0;
    for (const id of ids) {
      if (id === actorId && action !== "activate") { skipped++; continue; } // never lock out or delete yourself
      try {
        if (action === "delete") await this.deleteUserById(id);
        else await this.setUserStatus(actorId, id, action === "activate");
        done++;
      } catch { skipped++; }
    }
    return { done, skipped };
  }

  async deleteUserById(id: string): Promise<string> {
    const user = await User.findOne({ _id: id });
    if (!user) {
      throw new Error("User not found");
    }

    await User.deleteOne({ _id: id });
    await Session.deleteMany({ userID: id });

    return "User deleted successfully";
  }

  async searchUsersByNameOrEmail(content: string): Promise<UserResponse[]> {
    const regex = new RegExp(String(content ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // tìm theo chữ, không phải biểu thức chính quy
    const users = await User.find({
      $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }],
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      avatar_url: user.avatar_url,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    }));
  }
  async changeEmail(userId: string, newEmail: string): Promise<string> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }
    const normalized = String(newEmail ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("Invalid email address");
    }
    if (user.email === normalized) {
      throw new Error("New email must be different from current email");
    }

    const emailExists = await User.findOne({ email: normalized });
    if (emailExists) {
      throw new Error("Email is already in use");
    }

    user.email = normalized;
    user.email_verified = false; // the new address has to be confirmed
    await user.save();
    // The WorkHub account is tied to the old address: drop that link (nothing is deleted there) so the next sign-in
    // links the account for the new address.
    await workhubSyncService.unlinkUser(String(user._id)).catch(() => undefined);
    return "Email changed successfully. Please verify the new address.";
  }

  async filterUsers(
    system_role?: string,
    status?: string,
    gender?: string
  ): Promise<UserResponse[]> {
    const filter: Record<string, any> = {};

    if (system_role && system_role.toLowerCase() !== "all") {
      filter.system_role = new RegExp(`^${system_role}$`, "i");
    }
    if (status && status.toLowerCase() !== "all") {
      filter.status = new RegExp(`^${status}$`, "i");
    }
    if (gender && gender.toLowerCase() !== "all") {
      filter.gender = new RegExp(`^${gender}$`, "i");
    }

    const users = await User.find(filter);

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      avatar_url: user.avatar_url,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    }));
  }
  async uploadAvatar(userId: string, avatarFile: any): Promise<string> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }

    // Kiểm tra file
    if (!avatarFile) {
      throw new Error("Avatar file is required");
    }

    // Kiểm tra định dạng file
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(avatarFile.mimetype)) {
      throw new Error("Only JPEG, PNG, GIF, and WebP images are allowed");
    }

    // Kiểm tra kích thước file (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (avatarFile.size > maxSize) {
      throw new Error("File size must be less than 5MB");
    }

    // Tạo thư mục uploads nếu chưa tồn tại
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Xóa avatar cũ nếu tồn tại
    if (user.avatar_url && user.avatar_url.includes('/uploads/avatars/')) {
      const oldAvatarPath = path.join(process.cwd(), user.avatar_url);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Tạo tên file mới
    const fileExtension = path.extname(avatarFile.name);
    const fileName = `avatar_${userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Lưu file
    fs.writeFileSync(filePath, avatarFile.data);

    // Cập nhật avatar_url trong database
    const avatarUrl = `/uploads/avatars/${fileName}`;
    user.avatar_url = avatarUrl;
    await user.save();

    return avatarUrl;
  }
}
