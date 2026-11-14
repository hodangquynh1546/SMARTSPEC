// Unit tests import modules that validate the environment at load time (utils/env). Give them harmless values.
const defaults = {
  PORT: "8000", MONGO_URI: "mongodb://localhost:27017/test", DEV: "true", CLIENT_URL: "http://localhost:5174",
  JWT_SECRET: "test-access", JWT_REFRESH_SECRET: "test-refresh", JWT_OTP_SECRET: "test-otp", JWT_EMAIL_SECRET: "test-email",
  GOOGLE_OAUTH_CLIENT_ID: "unset", GOOGLE_OAUTH_CLIENT_SECRET: "unset", GOOGLE_OAUTH_REDIRECT_URL: "http://localhost:8000/x",
  UPLOADS_PATH: "./uploads", WORKHUB_ENABLED: "false",
};
for (const [k, v] of Object.entries(defaults)) if (process.env[k] === undefined) process.env[k] = v;
