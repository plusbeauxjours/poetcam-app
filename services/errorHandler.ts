import { PROGRESS_MESSAGES, USER_ERROR_MESSAGES } from "@/constants/api";
import { EnhancedPoemError, ErrorType } from "@/services/claudeApi";

export interface UserFriendlyError {
  title: string;
  message: string;
  action: string;
  icon: string;
  suggestions?: string[];
  isRetryable: boolean;
  retryDelay?: number;
  type: ErrorType;
  originalError?: Error;
}

export interface ProgressUpdate {
  stage: string;
  title: string;
  message: string;
  icon: string;
  progress?: number; // 0-100
  details?: string;
}

export interface FeedbackState {
  isLoading: boolean;
  error: UserFriendlyError | null;
  progress: ProgressUpdate | null;
  success: boolean;
  retryCount: number;
  canRetry: boolean;
}

/**
 * Convert technical errors to user-friendly error messages
 */
export function convertToUserFriendlyError(error: any): UserFriendlyError {
  // Handle EnhancedPoemError
  if (error instanceof EnhancedPoemError) {
    const userError = getUserErrorForType(error.type);
    return {
      ...userError,
      isRetryable: error.isRetryable,
      type: error.type,
      originalError: error.originalError || error,
      retryDelay: calculateRetryDelay(error.type),
    };
  }

  // Handle network errors
  if (error.message?.includes("Network") || error.message?.includes("fetch")) {
    return {
      ...convertErrorMessage(USER_ERROR_MESSAGES.api.networkError),
      isRetryable: true,
      type: ErrorType.NETWORK,
      originalError: error,
      retryDelay: 5000,
    };
  }

  // Handle timeout errors
  if (error.message?.includes("timeout") || error.message?.includes("AbortError")) {
    return {
      ...convertErrorMessage(USER_ERROR_MESSAGES.api.timeoutError),
      isRetryable: true,
      type: ErrorType.TIMEOUT,
      originalError: error,
      retryDelay: 3000,
    };
  }

  // Handle image processing errors
  if (error.message?.includes("image") || error.message?.includes("base64")) {
    return {
      ...convertErrorMessage(USER_ERROR_MESSAGES.image.processingFailed),
      isRetryable: false,
      type: ErrorType.IMAGE_FORMAT,
      originalError: error,
    };
  }

  // Default fallback error
  return {
    title: "알 수 없는 오류",
    message: "예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    action: "다시 시도",
    icon: "alert-circle",
    suggestions: [
      "네트워크 연결을 확인해주세요",
      "앱을 재시작해보세요",
      "문제가 지속되면 지원팀에 문의해주세요",
    ],
    isRetryable: true,
    type: ErrorType.UNKNOWN,
    originalError: error,
    retryDelay: 5000,
  };
}

/**
 * Convert readonly error message to mutable format
 */
function convertErrorMessage(
  errorMessage: any
): Omit<UserFriendlyError, "isRetryable" | "type" | "originalError"> {
  return {
    title: errorMessage.title,
    message: errorMessage.message,
    action: errorMessage.action,
    icon: errorMessage.icon,
    suggestions: errorMessage.suggestions ? Array.from(errorMessage.suggestions) : undefined,
  };
}

/**
 * Get user-friendly error for specific error type
 */
function getUserErrorForType(
  errorType: ErrorType
): Omit<UserFriendlyError, "isRetryable" | "type" | "originalError"> {
  switch (errorType) {
    case ErrorType.API_KEY:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.invalidApiKey);
    case ErrorType.RATE_LIMIT:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.rateLimitExceeded);
    case ErrorType.NETWORK:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.networkError);
    case ErrorType.TIMEOUT:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.timeoutError);
    case ErrorType.SERVER:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.serverError);
    case ErrorType.IMAGE_FORMAT:
      return convertErrorMessage(USER_ERROR_MESSAGES.image.invalidBase64);
    case ErrorType.QUOTA_EXCEEDED:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.quotaExceeded);
    case ErrorType.CONTENT_FILTER:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.contentFilter);
    default:
      return convertErrorMessage(USER_ERROR_MESSAGES.api.poemGenerationFailed);
  }
}

/**
 * Calculate appropriate retry delay based on error type
 */
function calculateRetryDelay(errorType: ErrorType): number {
  switch (errorType) {
    case ErrorType.RATE_LIMIT:
      return 60000; // 1 minute
    case ErrorType.SERVER:
      return 30000; // 30 seconds
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
      return 5000; // 5 seconds
    default:
      return 3000; // 3 seconds
  }
}

/**
 * Convert progress stage to user-friendly progress update
 */
export function convertToProgressUpdate(
  stage: string,
  details?: string,
  progress?: number
): ProgressUpdate {
  const progressInfo = PROGRESS_MESSAGES[stage as keyof typeof PROGRESS_MESSAGES];

  if (progressInfo) {
    return {
      stage,
      ...progressInfo,
      progress,
      details,
    };
  }

  // Fallback for unknown stages
  return {
    stage,
    title: "처리 중...",
    message: details || "작업을 진행하고 있어요",
    icon: "loader",
    progress,
    details,
  };
}

/**
 * Create initial feedback state
 */
export function createInitialFeedbackState(): FeedbackState {
  return {
    isLoading: false,
    error: null,
    progress: null,
    success: false,
    retryCount: 0,
    canRetry: false,
  };
}

/**
 * Create loading feedback state
 */
export function createLoadingState(
  stage?: string,
  details?: string,
  progress?: number
): FeedbackState {
  return {
    isLoading: true,
    error: null,
    progress: stage ? convertToProgressUpdate(stage, details, progress) : null,
    success: false,
    retryCount: 0,
    canRetry: false,
  };
}

/**
 * Create error feedback state
 */
export function createErrorState(error: any, retryCount: number = 0): FeedbackState {
  const userError = convertToUserFriendlyError(error);
  return {
    isLoading: false,
    error: userError,
    progress: null,
    success: false,
    retryCount,
    canRetry: userError.isRetryable,
  };
}

/**
 * Create success feedback state
 */
export function createSuccessState(): FeedbackState {
  return {
    isLoading: false,
    error: null,
    progress: convertToProgressUpdate("completed"),
    success: true,
    retryCount: 0,
    canRetry: false,
  };
}

/**
 * Generate helpful suggestions based on error context
 */
export function generateErrorSuggestions(
  error: UserFriendlyError,
  retryCount: number,
  context?: {
    hasInternetConnection?: boolean;
    isFirstUse?: boolean;
    recentErrors?: string[];
  }
): string[] {
  const suggestions = [...(error.suggestions || [])];

  // Add context-specific suggestions
  if (retryCount > 2) {
    suggestions.push("여러 번 실패했어요. 잠시 후 다시 시도해주세요");
  }

  if (context?.hasInternetConnection === false) {
    suggestions.unshift("인터넷 연결을 확인해주세요");
  }

  if (context?.isFirstUse) {
    suggestions.push("처음 사용 시 약간의 시간이 걸릴 수 있어요");
  }

  if (error.type === ErrorType.RATE_LIMIT && retryCount === 0) {
    suggestions.push("잠시 후 자동으로 다시 시도됩니다");
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Determine if automatic retry should be attempted
 */
export function shouldAutoRetry(
  error: UserFriendlyError,
  retryCount: number,
  maxRetries: number = 3
): boolean {
  if (!error.isRetryable || retryCount >= maxRetries) {
    return false;
  }

  // Auto-retry for specific error types
  const autoRetryTypes = [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER];

  return autoRetryTypes.includes(error.type);
}

/**
 * Log error for debugging and analytics
 */
export function logErrorForDebugging(
  error: UserFriendlyError,
  context?: {
    imageUri?: string;
    options?: any;
    userId?: string;
    sessionId?: string;
  }
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    errorType: error.type,
    errorTitle: error.title,
    originalError: error.originalError?.message,
    isRetryable: error.isRetryable,
    context: {
      imageProvided: !!context?.imageUri,
      optionsProvided: !!context?.options,
      userId: context?.userId,
      sessionId: context?.sessionId,
    },
  };

  // Log to console in development
  if (__DEV__) {
    console.warn("[Error Handler]", logData);
  }

  // Here you could send to analytics service
  // Analytics.track('poem_generation_error', logData);
}

/**
 * Format error for user display with proper truncation
 */
export function formatErrorForDisplay(error: UserFriendlyError): {
  title: string;
  message: string;
  action: string;
  suggestions: string[];
} {
  return {
    title: error.title,
    message: error.message.length > 100 ? error.message.substring(0, 97) + "..." : error.message,
    action: error.action,
    suggestions: error.suggestions?.slice(0, 2) || [],
  };
}
