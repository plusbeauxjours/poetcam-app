import { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export interface PasswordChangeRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface EmailChangeRequest {
  newEmail: string;
  password?: string;
}

export interface AccountDeleteRequest {
  password?: string;
  reason?: string;
}

export interface AccountServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requiresVerification?: boolean;
}

class AccountService {
  private static instance: AccountService | null = null;

  private constructor() {}

  public static getInstance(): AccountService {
    if (!AccountService.instance) {
      AccountService.instance = new AccountService();
    }
    return AccountService.instance;
  }

  /**
   * 비밀번호 변경
   */
  public async changePassword(request: PasswordChangeRequest): Promise<AccountServiceResult> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: request.newPassword,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        data: { message: "비밀번호가 성공적으로 변경되었습니다." },
      };
    } catch (error) {
      console.error("Password change error:", error);
      return {
        success: false,
        error: "비밀번호 변경 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 이메일 주소 변경
   */
  public async changeEmail(request: EmailChangeRequest): Promise<AccountServiceResult> {
    try {
      const { error } = await supabase.auth.updateUser({
        email: request.newEmail,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        requiresVerification: true,
        data: {
          message: "이메일 변경 확인 링크가 새 이메일 주소로 전송되었습니다.",
          newEmail: request.newEmail,
        },
      };
    } catch (error) {
      console.error("Email change error:", error);
      return {
        success: false,
        error: "이메일 변경 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 이메일 재전송
   */
  public async resendEmailConfirmation(email: string): Promise<AccountServiceResult> {
    try {
      const { error } = await supabase.auth.resend({
        type: "email_change",
        email: email,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        data: { message: "확인 이메일이 재전송되었습니다." },
      };
    } catch (error) {
      console.error("Email resend error:", error);
      return {
        success: false,
        error: "이메일 재전송 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 계정 삭제 (Supabase는 직접적인 계정 삭제 API를 제공하지 않음)
   * 실제로는 사용자 데이터를 비활성화하고 관리자가 수동으로 처리
   */
  public async deleteAccount(request: AccountDeleteRequest): Promise<AccountServiceResult> {
    try {
      // 먼저 현재 사용자 정보 가져오기
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          success: false,
          error: "사용자 정보를 가져올 수 없습니다.",
        };
      }

      // 사용자 메타데이터에 삭제 요청 표시
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          account_deletion_requested: true,
          account_deletion_requested_at: new Date().toISOString(),
          account_deletion_reason: request.reason || "",
        },
      });

      if (updateError) {
        return {
          success: false,
          error: this.getErrorMessage(updateError.message),
        };
      }

      // 로그아웃 처리 (실제 계정 삭제는 백엔드에서 처리)
      await supabase.auth.signOut();

      return {
        success: true,
        data: {
          message: "계정 삭제가 요청되었습니다. 처리까지 24-48시간이 소요될 수 있습니다.",
          requiresManualProcessing: true,
        },
      };
    } catch (error) {
      console.error("Account deletion error:", error);
      return {
        success: false,
        error: "계정 삭제 요청 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 현재 사용자 프로필 업데이트
   */
  public async updateProfile(updates: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  }): Promise<AccountServiceResult> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        data: { message: "프로필이 성공적으로 업데이트되었습니다." },
      };
    } catch (error) {
      console.error("Profile update error:", error);
      return {
        success: false,
        error: "프로필 업데이트 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 이메일 확인 상태 체크
   */
  public async checkEmailConfirmationStatus(): Promise<
    AccountServiceResult<{ isConfirmed: boolean; user: User }>
  > {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return {
          success: false,
          error: "사용자 정보를 가져올 수 없습니다.",
        };
      }

      return {
        success: true,
        data: {
          isConfirmed: user.email_confirmed_at !== null,
          user,
        },
      };
    } catch (error) {
      console.error("Email confirmation check error:", error);
      return {
        success: false,
        error: "이메일 확인 상태를 확인할 수 없습니다.",
      };
    }
  }

  /**
   * 비밀번호 재설정 이메일 전송
   */
  public async sendPasswordResetEmail(email: string): Promise<AccountServiceResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        data: { message: "비밀번호 재설정 링크가 이메일로 전송되었습니다." },
      };
    } catch (error) {
      console.error("Password reset email error:", error);
      return {
        success: false,
        error: "비밀번호 재설정 이메일 전송 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 에러 메시지 변환
   */
  private getErrorMessage(error: string): string {
    const errorMessages: { [key: string]: string } = {
      "Invalid login credentials": "잘못된 로그인 정보입니다.",
      "Password should be at least 6 characters": "비밀번호는 최소 6자 이상이어야 합니다.",
      "Email already registered": "이미 등록된 이메일 주소입니다.",
      "Invalid email format": "올바르지 않은 이메일 형식입니다.",
      "Password is too weak": "비밀번호가 너무 약합니다.",
      "Email rate limit exceeded": "이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
      "User not found": "사용자를 찾을 수 없습니다.",
      "Same password": "현재 비밀번호와 동일합니다.",
      "Email not confirmed": "이메일 확인이 필요합니다.",
    };

    return errorMessages[error] || error || "알 수 없는 오류가 발생했습니다.";
  }

  /**
   * 비밀번호 강도 검증
   */
  public validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number; // 0-4
  } {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 8) {
      errors.push("비밀번호는 최소 8자 이상이어야 합니다.");
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push("소문자를 포함해야 합니다.");
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("대문자를 포함해야 합니다.");
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push("숫자를 포함해야 합니다.");
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("특수문자를 포함하는 것이 좋습니다.");
    } else {
      score += 1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(score, 4),
    };
  }
}

export default AccountService.getInstance();
