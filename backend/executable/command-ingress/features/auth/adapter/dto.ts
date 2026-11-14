import logger from "../../../../../lib/logger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  validate,
  ValidationError,
  ValidateNested,
  IsInt,
  Min,
  Max,
  Matches,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from "class-validator";
import { Type, plainToInstance } from "class-transformer";
import { ValidationResult } from "../../../shared/validation";
import { ServiceResponse } from "../../../services/serviceResponse";
import { ResponseStatus } from "../../../services/serviceResponse";
import { isString } from "lodash";

export class RequestDto {
  async validate(): Promise<ValidationResult> {
    try {
      const validationErrors = await validate(this, {
        forbidUnknownValues: false,
      });

      if (validationErrors && validationErrors.length > 0) {
        return {
          ok: false,
          errors: validationErrors,
        };
      }

      return { ok: true, errors: [] };
    } catch (_: any) {
      return { ok: false, errors: [] };
    }
  }
}

export class ExchangeGoogleTokenBody extends RequestDto {
  @Length(1)
  code: string;

  constructor(body: any) {
    super();
    if (body && body.code) {
      this.code = String(body.code);
    }
  }
}

export class LogoutRequestBody extends RequestDto {
  constructor(body: any) {
    super();
    const given = body?.refresh_token ?? body?.refreshToken;
    if (given) {
      this.refreshToken = String(given);
    }
  }

  @Length(1)
  refreshToken: string;
}

export class RefreshTokenRequestBody extends RequestDto {
  constructor(body: any) {
    super();
    // the web client sends refreshToken, older callers refresh_token: accept both
    const given = body?.refresh_token ?? body?.refreshToken;
    if (given) {
      this.refreshToken = String(given);
    }
  }

  @Length(1)
  refreshToken: string;

  async validate(): Promise<ValidationResult> {
    const result = await super.validate();
    if (!result.ok) {
      return result;
    }

    // Adding another logic, token must have three parts, which are seprated by a dot.
    const parts = this.refreshToken.split(".");
    if (parts.length != 3) {
      const tokenInvalidError = new ValidationError();
      tokenInvalidError.constraints = {
        jsonwebtoken: "Invalid JSON Web Token format",
      };

      return {
        ok: false,
        errors: [tokenInvalidError],
      };
    }

    return {
      ok: true,
      errors: [],
    };
  }
}
export class verifyEmailRequestBody extends RequestDto {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  constructor(body: any) {
    super();
    if (body) {
      this.email = body.email;
    }
  }
}

@ValidatorConstraint({ name: "IsValidDob", async: false })
class IsValidDobConstraint implements ValidatorConstraintInterface {
  validate(dob: any, args: ValidationArguments) {
    if (!dob || typeof dob !== "object") return false;

    const { day, month, year } = dob;

    if (
      typeof day !== "number" ||
      typeof month !== "number" ||
      typeof year !== "number"
    ) {
      return false;
    }

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;

    // Check ngày hợp lệ thực sự (ví dụ 30/02 là invalid)
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  defaultMessage(args: ValidationArguments) {
    return "dob must be a valid date object { day, month, year }";
  }
}

@ValidatorConstraint({ name: "IsValidPassword", async: false })
class IsValidPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    // Kiểm tra độ dài
    if (!password || password.length < 10) {
      return false;
    }

    // Kiểm tra có ít nhất một số
    const hasNumber = /\d/.test(password);
    if (!hasNumber) {
      return false;
    }

    // Kiểm tra có ít nhất một chữ cái hoặc ký tự đặc biệt
    const hasLetterOrSpecialChar = /[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasLetterOrSpecialChar;
  }

  defaultMessage(args: ValidationArguments) {
    return "Password must be at least 10 characters long and contain at least one number and one letter or special character";
  }
}

export class RegisterRequestBody extends RequestDto {
  @IsNotEmpty({ message: "Email là bắt buộc" })
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @IsNotEmpty({ message: "Mật khẩu là bắt buộc" })
  password: string;

  @IsNotEmpty({ message: "Vui lòng nhập lại mật khẩu" })
  confirmPassword: string;

  constructor(body: any) {
    super();
    if (body) {
      this.email = body.email;
      this.password = body.password;
      this.confirmPassword = body.confirmPassword;
    }
  }
  // password length / match rules live in the service (one place, same error codes as WorkHub)
}

export class LoginRequestBody extends RequestDto {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsNotEmpty({ message: "Password is required" })
  // @Validate(IsValidPasswordConstraint)
  password: string;

  constructor(body: any) {
    super();
    if (body) {
      this.email = body.email;
      this.password = body.password;
    }
  }
}

export class ForgotPasswordRequestBody extends RequestDto {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  constructor(body: any) {
    super();
    if (body) {
      this.email = body.email;
    }
  }
}

export class ResetPasswordRequestBody extends RequestDto {
  @IsNotEmpty({ message: "Password is required" })
  newPassword: string;

  @IsNotEmpty({ message: "Password confirmation is required" })
  confirmNewPassword: string;

  constructor(body: any) {
    super();
    if (body) {
      this.newPassword = body.newPassword;
      this.confirmNewPassword = body.confirmNewPassword;
    }
  }

  public async validate(): Promise<ValidationResult> {
    // 1. Chạy các validation cơ bản từ decorator (@IsNotEmpty, @Length, @IsEmail,...)
    const initialResult = await super.validate();
    if (!initialResult.ok) {
      return initialResult;
    }

    // 2. Thêm logic validation tùy chỉnh: kiểm tra mật khẩu có khớp không
    if (this.newPassword !== this.confirmNewPassword) {
      const passwordMismatchError = new ValidationError();
      // Gán lỗi này cho thuộc tính 'confirmPassword' để frontend biết cần hiển thị lỗi ở đâu
      passwordMismatchError.property = "confirmPassword";
      passwordMismatchError.constraints = {
        passwordMismatch: "Passwords do not match",
      };

      return {
        ok: false,
        errors: [passwordMismatchError],
      };
    }

    // Nếu tất cả đều hợp lệ
    return { ok: true, errors: [] };
  }
}