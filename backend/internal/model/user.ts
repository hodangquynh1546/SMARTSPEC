import { toInteger } from "lodash";
import { InferSchemaType, model, Schema } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true }, 
  password: {
    type: String,
  },
  name: { type: String }, 
  system_role: {
    type: String,
    enum: ["ADMIN", "PARTICIPANT"],
    default: "PARTICIPANT",
  },
  email_verified: { type: Boolean, default: false },
  // Khi mật khẩu được đổi lần cuối. So sánh với WorkHub để mật khẩu đổi ở một bên được bên kia nhận, và mật khẩu cũ không bao giờ sống lại.
  password_changed_at: { type: Date, default: null },
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
  },
  setting: {
    language: { type: String, default: "vi" },
    theme: { type: String, default: "light" },
    selectedModel: { type: String, default: null }, // ✅ Model LLM được user chọn
  },
  bio: String,
  avatar_url: String,
  phone: String,
  isTwoFactorEnabled: { type: Boolean, default: false },
  gender: String,
  dob: Date,
  accessToken: String,
  refreshToken: String,
  provider: { type: String, enum: ["LOCAL", "GOOGLE"], default: "LOCAL" },
  created_at: { type: Date, default: Date.now }, // Ngày tạo tài khoản
  updated_at: { type: Date },
});

type userSchemaInferType = InferSchemaType<typeof userSchema>;
export default model<userSchemaInferType>("users", userSchema);
