import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import TokenService from "../../services/tokenService";
import { useAuthStore } from "../../store/useAuthStore";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  fallback,
  requireAuth = true,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { session, isInitialized } = useAuthStore();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      if (!isInitialized) {
        setIsValidating(true);
        return;
      }

      try {
        if (requireAuth) {
          if (!session) {
            setIsValid(false);
            router.replace(redirectTo);
            return;
          }

          // 토큰 유효성 검사
          const isValidSession = await TokenService.validateCurrentSession();
          if (!isValidSession) {
            setIsValid(false);
            router.replace(redirectTo);
            return;
          }

          setIsValid(true);
        } else {
          // 인증이 필요하지 않은 경우
          setIsValid(true);
        }
      } catch (error) {
        console.error("Session validation error:", error);
        setIsValid(false);
        if (requireAuth) {
          router.replace(redirectTo);
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [session, isInitialized, requireAuth, redirectTo, router]);

  // 아직 초기화되지 않았거나 검증 중인 경우
  if (!isInitialized || isValidating) {
    return (
      fallback || (
        <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
          <ThemedText style={{ marginTop: 16 }}>로딩 중...</ThemedText>
        </ThemedView>
      )
    );
  }

  // 인증이 필요하지만 유효하지 않은 경우
  if (requireAuth && !isValid) {
    return (
      fallback || (
        <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ThemedText>인증이 필요합니다.</ThemedText>
        </ThemedView>
      )
    );
  }

  return <>{children}</>;
}

/**
 * HOC로 컴포넌트를 보호된 라우트로 감싸는 함수
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
