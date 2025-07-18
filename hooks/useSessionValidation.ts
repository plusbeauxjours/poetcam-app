import { useEffect, useState } from "react";
import TokenService from "../services/tokenService";
import { useAuthStore } from "../store/useAuthStore";

interface UseSessionValidationResult {
  isValid: boolean;
  isValidating: boolean;
  error: string | null;
  validateSession: () => Promise<boolean>;
  forceRefresh: () => Promise<boolean>;
}

export function useSessionValidation(): UseSessionValidationResult {
  const { session, setSession, error } = useAuthStore();
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateSession = async (): Promise<boolean> => {
    if (!session) {
      setIsValid(false);
      return false;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      // 토큰 만료 확인
      const isExpired = TokenService.isTokenExpired(session.access_token);
      const isExpiringSoon = TokenService.isTokenExpiringSoon(session.access_token);

      if (isExpired) {
        // 만료된 토큰 - 자동 갱신 시도
        const refreshedSession = await TokenService.refreshToken();
        if (refreshedSession) {
          setSession(refreshedSession);
          setIsValid(true);
          return true;
        } else {
          setIsValid(false);
          setValidationError("세션이 만료되었습니다. 다시 로그인해주세요.");
          return false;
        }
      } else if (isExpiringSoon) {
        // 곧 만료될 토큰 - 미리 갱신
        console.log("Token expiring soon, refreshing preemptively");
        const refreshedSession = await TokenService.refreshToken();
        if (refreshedSession) {
          setSession(refreshedSession);
        }
      }

      // 현재 세션 검증
      const isValidSession = await TokenService.validateCurrentSession();
      setIsValid(isValidSession);

      if (!isValidSession) {
        setValidationError("세션이 유효하지 않습니다.");
      }

      return isValidSession;
    } catch (error) {
      console.error("Session validation error:", error);
      setIsValid(false);
      setValidationError(error instanceof Error ? error.message : "세션 검증 실패");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const forceRefresh = async (): Promise<boolean> => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const refreshedSession = await TokenService.refreshToken();
      if (refreshedSession) {
        setSession(refreshedSession);
        setIsValid(true);
        return true;
      } else {
        setIsValid(false);
        setValidationError("토큰 갱신에 실패했습니다.");
        return false;
      }
    } catch (error) {
      console.error("Force refresh error:", error);
      setIsValid(false);
      setValidationError(error instanceof Error ? error.message : "토큰 갱신 실패");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // 세션이 변경될 때마다 자동 검증
  useEffect(() => {
    if (session) {
      validateSession();
    } else {
      setIsValid(false);
      setValidationError(null);
    }
  }, [session]);

  return {
    isValid,
    isValidating,
    error: validationError || error,
    validateSession,
    forceRefresh,
  };
}

export default useSessionValidation;
