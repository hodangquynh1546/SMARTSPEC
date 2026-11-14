import { InferSchemaType, model, Schema } from "mongoose";

/**
 * Personal access token: a long-lived, revocable credential (for the Claude MCP and other tools) that acts as its owner
 * with the owner's project roles, but never as an administrator. Only the SHA-256 hash is stored.
 */
const accessTokenSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  token_hash: { type: String, required: true, unique: true },
  prefix: { type: String, required: true }, // first characters, to recognise the token in a list
  created_at: { type: Date, default: Date.now },
  last_used_at: { type: Date, default: null },
  revoked_at: { type: Date, default: null },
});

type AccessTokenInferType = InferSchemaType<typeof accessTokenSchema>;
export default model<AccessTokenInferType>("access_tokens", accessTokenSchema);
