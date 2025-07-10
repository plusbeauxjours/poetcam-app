import { CLAUDE_CONFIG, ERROR_MESSAGES, RequestMetrics } from "@/constants/api";
import {
  FormattedPoem,
  POEM_STYLES,
  PoemStyle,
  PoemValidationResult,
  processPoemResponse,
  validatePoem,
} from "@/services/poemFormatter";
import { detectImageFormat, getMediaType, hasMinimumSize, isValidBase64 } from "@/utils/image";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_API_KEY } from "@env";

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY,
});

export interface GeneratePoemOptions {
  style?: keyof typeof CLAUDE_CONFIG.STYLE_PROMPTS;
  length?: number;
  language?: keyof typeof CLAUDE_CONFIG.LANGUAGE_PROMPTS;
  preset?: keyof typeof CLAUDE_CONFIG.PRESETS;
  customPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  // New formatting options
  poemStyle?: string;
  enableFormatting?: boolean;
  customFormatting?: {
    lineBreakPattern?: "natural" | "structured" | "minimal";
    indentationStyle?: "none" | "alternating" | "first-line" | "hanging";
    punctuationHandling?: "preserve" | "minimal" | "remove";
    lineSpacing?: "single" | "double" | "custom";
  };
  // Enhanced timeout and retry options
  timeout?: number;
  maxRetries?: number;
  retryDelayBase?: number;
  retryDelayMax?: number;
  onRetryAttempt?: (attempt: number, maxAttempts: number, error: Error) => void;
  onProgress?: (progress: { stage: string; details?: string }) => void;
}

// Retry state tracking
export interface RetryState {
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  totalDuration: number;
  retryDelays: number[];
  isRetrying: boolean;
}

// Enhanced error classification
export enum ErrorType {
  TIMEOUT = "timeout",
  RATE_LIMIT = "rate_limit",
  API_KEY = "api_key",
  NETWORK = "network",
  SERVER = "server",
  IMAGE_FORMAT = "image_format",
  QUOTA_EXCEEDED = "quota_exceeded",
  CONTENT_FILTER = "content_filter",
  UNKNOWN = "unknown",
}

export class EnhancedPoemError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public isRetryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = "EnhancedPoemError";
  }
}

export interface PoemGenerationResult {
  poem: string;
  formattedPoem?: FormattedPoem;
  validation?: PoemValidationResult;
  metadata: {
    model: string;
    generatedAt: string;
    tokensUsed?: {
      input: number;
      output: number;
      total: number;
    };
    requestId: string;
    duration: number;
    parameters: {
      temperature: number;
      maxTokens: number;
      style?: string;
      language?: string;
      preset?: string;
    };
    processing?: {
      originalLength: number;
      formattedLength: number;
      cleaningApplied: string[];
      validationPassed: boolean;
    };
  };
}

// Request tracking for monitoring
const requestMetrics: RequestMetrics[] = [];

/**
 * Generate a poem from an image using Claude API with enhanced parameter handling
 * @param imageBase64 - Base64 encoded image data
 * @param options - Generation parameters including style, language, presets, and timeout
 * @returns Promise<PoemGenerationResult>
 */
export async function generatePoemFromImage(
  imageBase64: string,
  options: GeneratePoemOptions = {}
): Promise<PoemGenerationResult> {
  const requestId = generateRequestId();
  const startTime = performance.now();

  // Setup timeout handling
  const timeout = options.timeout || CLAUDE_CONFIG.TIMEOUT.REQUEST_TIMEOUT;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  // Progress callback
  if (options.onProgress) {
    options.onProgress({ stage: "starting", details: "Initializing request" });
  }

  // Log request start if monitoring is enabled
  if (CLAUDE_CONFIG.MONITORING.LOG_REQUESTS) {
    console.log(`[Claude API] Starting request ${requestId}`, {
      timestamp: new Date().toISOString(),
      options,
      timeout,
    });
  }

  try {
    // Validate input
    if (!imageBase64) {
      throw new EnhancedPoemError(ERROR_MESSAGES.api.imageRequired, ErrorType.IMAGE_FORMAT, false);
    }

    if (!CLAUDE_API_KEY) {
      throw new EnhancedPoemError(ERROR_MESSAGES.api.invalidApiKey, ErrorType.API_KEY, false);
    }

    // Progress callback
    if (options.onProgress) {
      options.onProgress({ stage: "validating", details: "Validating image data" });
    }

    // Validate base64 data
    if (!isValidBase64(imageBase64)) {
      throw new EnhancedPoemError(
        ERROR_MESSAGES.image.invalidBase64,
        ErrorType.IMAGE_FORMAT,
        false
      );
    }

    if (!hasMinimumSize(imageBase64)) {
      throw new EnhancedPoemError(ERROR_MESSAGES.image.tooSmall, ErrorType.IMAGE_FORMAT, false);
    }

    // Detect image format and get appropriate media type
    const imageFormat = detectImageFormat(imageBase64);
    const mediaType = getMediaType(imageFormat);

    // Resolve API parameters based on preset and options
    const apiParams = resolveApiParameters(options);

    // Create enhanced system prompt
    const systemPrompt = createEnhancedSystemPrompt(options);

    // Create user prompt
    const userPrompt = createUserPrompt(options);

    // Progress callback
    if (options.onProgress) {
      options.onProgress({ stage: "requesting", details: "Sending request to Claude API" });
    }

    // Log API parameters if monitoring is enabled
    if (CLAUDE_CONFIG.MONITORING.LOG_PERFORMANCE) {
      console.log(`[Claude API] Request ${requestId} parameters:`, {
        model: CLAUDE_CONFIG.model,
        ...apiParams,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        timeout,
      });
    }

    // Make API request to Claude with timeout support
    const response = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: apiParams.maxTokens,
      temperature: apiParams.temperature,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    });

    // Clear timeout since request completed
    clearTimeout(timeoutId);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Progress callback
    if (options.onProgress) {
      options.onProgress({ stage: "processing", details: "Processing response" });
    }

    // Extract poem text from response
    const poemText = response.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n")
      .trim();

    if (!poemText) {
      throw new EnhancedPoemError(
        "No poem generated from Claude API response",
        ErrorType.SERVER,
        true
      );
    }

    // Process and format the poem response
    let formattedPoem: FormattedPoem | undefined;
    let validation: PoemValidationResult | undefined;
    let processingMetadata: any = {};

    if (options.enableFormatting !== false) {
      // Default to enabled
      try {
        const originalLength = poemText.length;

        // Progress callback
        if (options.onProgress) {
          options.onProgress({ stage: "formatting", details: "Formatting poem" });
        }

        // Process the poem with formatting options
        formattedPoem = processPoemResponse(poemText, {
          preferredStyle: options.poemStyle,
          language: options.language,
          customFormatting: options.customFormatting,
        });

        // Validate the poem
        validation = validatePoem(formattedPoem.text, options.poemStyle);

        // Create processing metadata
        processingMetadata = {
          originalLength,
          formattedLength: formattedPoem.text.length,
          cleaningApplied: formattedPoem.formatting.appliedFormatting,
          validationPassed: validation.isValid,
        };

        // Log formatting results if monitoring is enabled
        if (CLAUDE_CONFIG.MONITORING.LOG_PERFORMANCE) {
          console.log(`[Claude API] Poem formatted for request ${requestId}:`, {
            originalLength,
            formattedLength: formattedPoem.text.length,
            detectedStyle: formattedPoem.metadata.detectedStyle,
            appliedFormatting: formattedPoem.formatting.appliedFormatting,
            validationStatus: validation.isValid ? "passed" : "failed",
            warnings: validation.warnings.length,
            errors: validation.errors.length,
          });
        }
      } catch (formattingError) {
        // If formatting fails, log the error but continue with unformatted poem
        if (CLAUDE_CONFIG.MONITORING.LOG_ERRORS) {
          console.error(`[Claude API] Formatting failed for request ${requestId}:`, {
            error:
              formattingError instanceof Error ? formattingError.message : String(formattingError),
          });
        }

        // Set basic processing metadata for failure case
        processingMetadata = {
          originalLength: poemText.length,
          formattedLength: poemText.length,
          cleaningApplied: [],
          validationPassed: false,
        };
      }
    }

    // Progress callback
    if (options.onProgress) {
      options.onProgress({ stage: "completed", details: "Request completed successfully" });
    }

    // Create result with enhanced metadata
    const result: PoemGenerationResult = {
      poem: poemText,
      formattedPoem,
      validation,
      metadata: {
        model: CLAUDE_CONFIG.model,
        generatedAt: new Date().toISOString(),
        tokensUsed: response.usage
          ? {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
              total: response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
        requestId,
        duration,
        parameters: {
          temperature: apiParams.temperature,
          maxTokens: apiParams.maxTokens,
          style: options.style,
          language: options.language,
          preset: options.preset,
        },
        processing: processingMetadata,
      },
    };

    // Log successful response if monitoring is enabled
    if (CLAUDE_CONFIG.MONITORING.LOG_RESPONSES) {
      console.log(`[Claude API] Request ${requestId} completed successfully`, {
        duration,
        tokensUsed: result.metadata.tokensUsed,
        poemLength: poemText.length,
        timeout,
      });
    }

    // Track metrics if monitoring is enabled
    if (CLAUDE_CONFIG.MONITORING.TRACK_TOKEN_USAGE) {
      trackRequestMetrics({
        requestId,
        timestamp: startTime,
        duration,
        tokenUsage: result.metadata.tokensUsed,
      });
    }

    return result;
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(timeoutId);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Classify error and create enhanced error
    const enhancedError = classifyError(error, abortController.signal.aborted);

    // Progress callback for error
    if (options.onProgress) {
      options.onProgress({
        stage: "error",
        details: `Request failed: ${enhancedError.message}`,
      });
    }

    // Log error if monitoring is enabled
    if (CLAUDE_CONFIG.MONITORING.LOG_ERRORS) {
      console.error(`[Claude API] Request ${requestId} failed:`, {
        error: enhancedError.message,
        errorType: enhancedError.type,
        isRetryable: enhancedError.isRetryable,
        duration,
        timeout,
        options,
      });
    }

    // Track error metrics
    if (CLAUDE_CONFIG.MONITORING.TRACK_TOKEN_USAGE) {
      trackRequestMetrics({
        requestId,
        timestamp: startTime,
        duration,
        error: enhancedError.message,
      });
    }

    throw enhancedError;
  }
}

/**
 * Resolve API parameters based on preset and individual options
 */
function resolveApiParameters(options: GeneratePoemOptions): {
  temperature: number;
  maxTokens: number;
} {
  let temperature: number = CLAUDE_CONFIG.temperature;
  let maxTokens: number = CLAUDE_CONFIG.maxTokens;

  // Apply preset if specified
  if (options.preset && CLAUDE_CONFIG.PRESETS[options.preset]) {
    const preset = CLAUDE_CONFIG.PRESETS[options.preset];
    temperature = preset.temperature;
    maxTokens = preset.maxTokens;
  }

  // Override with individual options if provided
  if (options.temperature !== undefined) {
    temperature = Math.max(0, Math.min(1, options.temperature));
  }
  if (options.maxTokens !== undefined) {
    maxTokens = Math.max(100, Math.min(4000, options.maxTokens));
  }

  return { temperature, maxTokens };
}

/**
 * Create enhanced system prompt with style and language considerations
 */
function createEnhancedSystemPrompt(options: GeneratePoemOptions): string {
  let prompt = CLAUDE_CONFIG.systemPrompt;

  // Add style-specific instructions
  if (options.style && CLAUDE_CONFIG.STYLE_PROMPTS[options.style]) {
    prompt += "\n\nStyle instructions: " + CLAUDE_CONFIG.STYLE_PROMPTS[options.style];
  }

  // Add language-specific instructions
  if (options.language && CLAUDE_CONFIG.LANGUAGE_PROMPTS[options.language]) {
    prompt += "\n\nLanguage instructions: " + CLAUDE_CONFIG.LANGUAGE_PROMPTS[options.language];
  }

  // Add custom prompt if provided
  if (options.customPrompt) {
    prompt += "\n\nAdditional instructions: " + options.customPrompt;
  }

  return prompt;
}

/**
 * Create user prompt with length and other specifications
 */
function createUserPrompt(options: GeneratePoemOptions): string {
  let prompt = "Please create a beautiful poem inspired by this image.";

  if (options.length) {
    prompt += ` The poem should be approximately ${options.length} lines long.`;
  }

  return prompt;
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Track request metrics for monitoring and analytics
 */
function trackRequestMetrics(metrics: RequestMetrics): void {
  requestMetrics.push(metrics);

  // Keep only last 100 requests to prevent memory leaks
  if (requestMetrics.length > 100) {
    requestMetrics.splice(0, requestMetrics.length - 100);
  }
}

/**
 * Get recent request metrics for monitoring
 */
export function getRequestMetrics(): RequestMetrics[] {
  return [...requestMetrics];
}

/**
 * Clear request metrics
 */
export function clearRequestMetrics(): void {
  requestMetrics.length = 0;
}

/**
 * Test Claude API connection
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: 'Hello, please respond with "Connection successful"',
        },
      ],
    });

    const responseText = response.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("");

    return responseText.toLowerCase().includes("connection successful");
  } catch (error) {
    console.error("Claude connection test failed:", error);
    return false;
  }
}

/**
 * Classify errors for better retry logic and user feedback
 */
function classifyError(error: any, wasAborted: boolean): EnhancedPoemError {
  if (wasAborted) {
    return new EnhancedPoemError(
      ERROR_MESSAGES.api.timeoutError,
      ErrorType.TIMEOUT,
      true // Timeout errors are retryable
    );
  }

  if (error instanceof EnhancedPoemError) {
    return error;
  }

  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // API Key errors
  if (
    errorMessage.includes("api key") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("authentication")
  ) {
    return new EnhancedPoemError(ERROR_MESSAGES.api.invalidApiKey, ErrorType.API_KEY, false, error);
  }

  // Rate limit errors
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorMessage.includes("429")
  ) {
    return new EnhancedPoemError(
      ERROR_MESSAGES.api.rateLimitExceeded,
      ErrorType.RATE_LIMIT,
      true, // Rate limit errors are retryable
      error
    );
  }

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("fetch")
  ) {
    return new EnhancedPoemError(
      ERROR_MESSAGES.api.networkError,
      ErrorType.NETWORK,
      true, // Network errors are retryable
      error
    );
  }

  // Server errors (5xx)
  if (
    errorMessage.includes("server error") ||
    errorMessage.includes("500") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503")
  ) {
    return new EnhancedPoemError(
      ERROR_MESSAGES.api.serverError,
      ErrorType.SERVER,
      true, // Server errors are retryable
      error
    );
  }

  // Content filter errors
  if (errorMessage.includes("content") && errorMessage.includes("filter")) {
    return new EnhancedPoemError(
      "Content was filtered by the AI safety system",
      ErrorType.CONTENT_FILTER,
      false, // Content filter errors are not retryable
      error
    );
  }

  // Quota exceeded
  if (errorMessage.includes("quota") || errorMessage.includes("limit exceeded")) {
    return new EnhancedPoemError(
      "API quota exceeded",
      ErrorType.QUOTA_EXCEEDED,
      false, // Quota errors are not retryable
      error
    );
  }

  // Default to unknown error, but make it retryable
  return new EnhancedPoemError(
    ERROR_MESSAGES.api.poemGenerationFailed,
    ErrorType.UNKNOWN,
    true,
    error
  );
}

/**
 * Calculate retry delay using exponential backoff with jitter
 */
function calculateRetryDelay(
  attempt: number,
  baseDelay: number = CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_BASE,
  maxDelay: number = CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_MAX
): number {
  // Exponential backoff: baseDelay * (2 ^ attempt)
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter

  // Cap at max delay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Enhanced retry wrapper for poem generation with detailed progress tracking
 */
export async function generatePoemWithRetry(
  imageBase64: string,
  options: GeneratePoemOptions = {},
  maxRetries?: number
): Promise<PoemGenerationResult> {
  const finalMaxRetries = maxRetries ?? options.maxRetries ?? CLAUDE_CONFIG.TIMEOUT.RETRY_ATTEMPTS;
  const retryDelayBase = options.retryDelayBase ?? CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_BASE;
  const retryDelayMax = options.retryDelayMax ?? CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_MAX;

  const retryState: RetryState = {
    attempt: 0,
    maxAttempts: finalMaxRetries,
    totalDuration: 0,
    retryDelays: [],
    isRetrying: false,
  };

  const startTime = performance.now();

  for (let attempt = 1; attempt <= finalMaxRetries; attempt++) {
    retryState.attempt = attempt;
    retryState.isRetrying = attempt > 1;

    try {
      // Progress callback for retry attempts
      if (options.onProgress && attempt > 1) {
        options.onProgress({
          stage: "retrying",
          details: `Retry attempt ${attempt}/${finalMaxRetries}`,
        });
      }

      const result = await generatePoemFromImage(imageBase64, options);

      // Update total duration
      retryState.totalDuration = performance.now() - startTime;

      // Log successful retry if monitoring is enabled
      if (CLAUDE_CONFIG.MONITORING.LOG_RESPONSES && attempt > 1) {
        console.log(`[Claude API] Request succeeded on attempt ${attempt}/${finalMaxRetries}`, {
          totalDuration: retryState.totalDuration,
          retryDelays: retryState.retryDelays,
        });
      }

      return result;
    } catch (error) {
      retryState.lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const enhancedError =
        error instanceof EnhancedPoemError ? error : classifyError(error, false);

      // Don't retry for certain error types or if we've reached max attempts
      if (!enhancedError.isRetryable || attempt >= finalMaxRetries) {
        retryState.totalDuration = performance.now() - startTime;

        // Log final failure if monitoring is enabled
        if (CLAUDE_CONFIG.MONITORING.LOG_ERRORS) {
          console.error(`[Claude API] All retry attempts failed`, {
            finalAttempt: attempt,
            maxAttempts: finalMaxRetries,
            totalDuration: retryState.totalDuration,
            retryDelays: retryState.retryDelays,
            errorType: enhancedError.type,
            isRetryable: enhancedError.isRetryable,
          });
        }

        throw enhancedError;
      }

      // Calculate delay for next retry
      const delay = calculateRetryDelay(attempt, retryDelayBase, retryDelayMax);
      retryState.retryDelays.push(delay);

      // Call retry callback if provided
      if (options.onRetryAttempt) {
        options.onRetryAttempt(attempt, finalMaxRetries, enhancedError);
      }

      // Log retry attempt if monitoring is enabled
      if (CLAUDE_CONFIG.MONITORING.LOG_ERRORS) {
        console.log(
          `[Claude API] Retrying in ${delay}ms (attempt ${attempt + 1}/${finalMaxRetries})`,
          {
            error: enhancedError.message,
            errorType: enhancedError.type,
            delay,
            totalDuration: performance.now() - startTime,
          }
        );
      }

      // Wait before retrying
      if (attempt < finalMaxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw (
    retryState.lastError ||
    new EnhancedPoemError("Maximum retry attempts exceeded", ErrorType.UNKNOWN, false)
  );
}

/**
 * Get available poem styles for formatting
 */
export function getAvailablePoemStyles(): Array<{
  key: string;
  name: string;
  description: string;
}> {
  return Object.entries(POEM_STYLES).map(([key, style]: [string, PoemStyle]) => ({
    key,
    name: style.name,
    description: style.description,
  }));
}

/**
 * Create custom formatting options for poem generation
 */
export function createCustomFormattingOptions(
  baseStyle: keyof typeof POEM_STYLES = "freeVerse",
  overrides: Partial<GeneratePoemOptions["customFormatting"]> = {}
): GeneratePoemOptions["customFormatting"] {
  const base = POEM_STYLES[baseStyle];
  return {
    lineBreakPattern: overrides.lineBreakPattern || base.lineBreakPattern,
    indentationStyle: overrides.indentationStyle || base.indentationStyle,
    punctuationHandling: overrides.punctuationHandling || base.punctuationHandling,
    lineSpacing: overrides.lineSpacing || base.lineSpacing,
  };
}

/**
 * Get predefined formatting presets for common use cases
 */
export function getFormattingPreset(
  presetName: "minimal" | "traditional" | "modern" | "korean"
): Partial<GeneratePoemOptions> {
  const presets: Record<string, Partial<GeneratePoemOptions>> = {
    minimal: {
      poemStyle: "haiku",
      enableFormatting: true,
      customFormatting: createCustomFormattingOptions("haiku", {
        punctuationHandling: "minimal",
        lineBreakPattern: "structured",
      }),
    },
    traditional: {
      poemStyle: "traditional",
      enableFormatting: true,
      customFormatting: createCustomFormattingOptions("traditional", {
        punctuationHandling: "preserve",
        lineBreakPattern: "structured",
      }),
    },
    modern: {
      poemStyle: "freeVerse",
      enableFormatting: true,
      customFormatting: createCustomFormattingOptions("freeVerse", {
        punctuationHandling: "preserve",
        lineBreakPattern: "natural",
      }),
    },
    korean: {
      poemStyle: "korean",
      enableFormatting: true,
      language: "ko" as keyof typeof CLAUDE_CONFIG.LANGUAGE_PROMPTS,
      customFormatting: createCustomFormattingOptions("korean", {
        punctuationHandling: "minimal",
        lineBreakPattern: "natural",
      }),
    },
  };

  return presets[presetName];
}

/**
 * Check if a poem style is available
 */
export function isPoemStyleAvailable(styleName: string): boolean {
  return styleName in POEM_STYLES;
}

/**
 * Get default formatting options based on language and style preferences
 */
export function getDefaultFormattingOptions(
  language?: keyof typeof CLAUDE_CONFIG.LANGUAGE_PROMPTS,
  style?: keyof typeof CLAUDE_CONFIG.STYLE_PROMPTS
): Partial<GeneratePoemOptions> {
  // Default to Korean formatting for Korean language
  if (language === "ko") {
    return getFormattingPreset("korean");
  }

  // Style-based defaults
  if (style === "minimalist") {
    return getFormattingPreset("minimal");
  }
  if (style === "classical") {
    return getFormattingPreset("traditional");
  }

  // Default to modern formatting
  return getFormattingPreset("modern");
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof EnhancedPoemError) {
    return error.isRetryable;
  }

  const classified = classifyError(error, false);
  return classified.isRetryable;
}

/**
 * Create retry options with sensible defaults
 */
export function createRetryOptions(
  customOptions: Partial<
    Pick<
      GeneratePoemOptions,
      "maxRetries" | "retryDelayBase" | "retryDelayMax" | "onRetryAttempt" | "onProgress"
    >
  > = {}
): Partial<GeneratePoemOptions> {
  return {
    maxRetries: customOptions.maxRetries ?? CLAUDE_CONFIG.TIMEOUT.RETRY_ATTEMPTS,
    retryDelayBase: customOptions.retryDelayBase ?? CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_BASE,
    retryDelayMax: customOptions.retryDelayMax ?? CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_MAX,
    onRetryAttempt: customOptions.onRetryAttempt,
    onProgress: customOptions.onProgress,
  };
}

/**
 * Create a progress callback that logs to console
 */
export function createConsoleProgressCallback(
  prefix: string = "[Poem Generation]"
): (progress: { stage: string; details?: string }) => void {
  return (progress) => {
    const message = progress.details ? `${progress.stage}: ${progress.details}` : progress.stage;
    console.log(`${prefix} ${message}`);
  };
}

/**
 * Create a retry callback that logs retry attempts
 */
export function createConsoleRetryCallback(
  prefix: string = "[Retry]"
): (attempt: number, maxAttempts: number, error: Error) => void {
  return (attempt, maxAttempts, error) => {
    console.warn(`${prefix} Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
  };
}

/**
 * Get timeout configuration for different scenarios
 */
export function getTimeoutConfig(
  scenario: "fast" | "normal" | "patient" = "normal"
): Pick<GeneratePoemOptions, "timeout" | "maxRetries" | "retryDelayBase" | "retryDelayMax"> {
  const configs = {
    fast: {
      timeout: 15000, // 15 seconds
      maxRetries: 2,
      retryDelayBase: 500, // 0.5 seconds
      retryDelayMax: 5000, // 5 seconds
    },
    normal: {
      timeout: CLAUDE_CONFIG.TIMEOUT.REQUEST_TIMEOUT, // 30 seconds
      maxRetries: CLAUDE_CONFIG.TIMEOUT.RETRY_ATTEMPTS, // 3
      retryDelayBase: CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_BASE, // 1 second
      retryDelayMax: CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_MAX, // 30 seconds
    },
    patient: {
      timeout: 60000, // 60 seconds
      maxRetries: 5,
      retryDelayBase: 2000, // 2 seconds
      retryDelayMax: 60000, // 60 seconds
    },
  };

  return configs[scenario];
}

/**
 * Estimate total maximum time for retry attempts
 */
export function estimateMaxRetryTime(
  maxRetries: number = CLAUDE_CONFIG.TIMEOUT.RETRY_ATTEMPTS,
  baseDelay: number = CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_BASE,
  maxDelay: number = CLAUDE_CONFIG.TIMEOUT.RETRY_DELAY_MAX,
  requestTimeout: number = CLAUDE_CONFIG.TIMEOUT.REQUEST_TIMEOUT
): number {
  let totalTime = 0;

  // Add timeout for each attempt
  totalTime += requestTimeout * maxRetries;

  // Add retry delays (exponential backoff)
  for (let attempt = 1; attempt < maxRetries; attempt++) {
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    totalTime += delay;
  }

  return totalTime;
}

/**
 * Enhanced poem generation with preset retry configurations
 */
export async function generatePoemWithPreset(
  imageBase64: string,
  preset: "fast" | "normal" | "patient",
  options: GeneratePoemOptions = {}
): Promise<PoemGenerationResult> {
  const timeoutConfig = getTimeoutConfig(preset);
  const mergedOptions: GeneratePoemOptions = {
    ...options,
    ...timeoutConfig,
  };

  return generatePoemWithRetry(imageBase64, mergedOptions);
}
