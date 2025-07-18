import { supabase } from "@/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

export type AuthProvider = "google" | "apple" | "kakao";

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface SocialLoginOptions {
  provider: AuthProvider;
  redirectUrl?: string;
  additionalScopes?: string[];
}

class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize auth service
   */
  async initialize(): Promise<void> {
    // Configure web browser for auth sessions
    WebBrowser.maybeCompleteAuthSession();
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        user: data.user ?? undefined,
        session: data.session ?? undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: "로그인 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: "poetcamapp://auth/callback",
        },
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      return {
        success: false,
        error: "회원가입 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * Sign in with social provider
   */
  async signInWithSocial({
    provider,
    redirectUrl = "poetcamapp://auth/callback",
  }: SocialLoginOptions): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      if (data?.url) {
        // Open OAuth URL in browser
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === "success") {
          // Wait for session establishment
          await this.waitForSession();

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            return {
              success: true,
              user: sessionData.session.user ?? undefined,
              session: sessionData.session ?? undefined,
            };
          } else {
            return {
              success: false,
              error: "로그인이 완료되지 않았습니다. 다시 시도해주세요.",
            };
          }
        } else if (result.type === "cancel") {
          return {
            success: false,
            error: "사용자가 로그인을 취소했습니다.",
          };
        } else {
          return {
            success: false,
            error: "로그인이 실패했습니다.",
          };
        }
      } else {
        return {
          success: false,
          error: "로그인 URL을 가져올 수 없습니다.",
        };
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      return {
        success: false,
        error: `${provider} 로그인 중 오류가 발생했습니다.`,
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "poetcamapp://auth/reset-password",
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: "비밀번호 재설정 요청 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: "로그아웃 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<Session | undefined> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session ?? undefined;
    } catch (error) {
      console.error("Get session error:", error);
      return undefined;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | undefined> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user ?? undefined;
    } catch (error) {
      console.error("Get user error:", error);
      return undefined;
    }
  }

  /**
   * Wait for session to be established (with timeout)
   */
  private async waitForSession(maxWait = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: string): string {
    const errorMappings: Record<string, string> = {
      "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
      "User already registered": "이미 가입된 이메일 주소입니다.",
      "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
      "Unable to validate email address": "유효하지 않은 이메일 주소입니다.",
      "Email rate limit exceeded": "이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
      "Provider not found": "지원하지 않는 로그인 방식입니다.",
    };

    // Check for partial matches
    for (const [key, value] of Object.entries(errorMappings)) {
      if (error.includes(key)) {
        return value;
      }
    }

    return error || "알 수 없는 오류가 발생했습니다.";
  }

  /**
   * Show error alert
   */
  showErrorAlert(title: string, message: string): void {
    Alert.alert(title, message, [{ text: "확인" }]);
  }

  /**
   * Show success alert
   */
  showSuccessAlert(title: string, message: string, onPress?: () => void): void {
    Alert.alert(title, message, [{ text: "확인", onPress }]);
  }
}

export default AuthService.getInstance();
