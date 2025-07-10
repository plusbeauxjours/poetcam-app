export const CLAUDE_CONFIG = {
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 1000,
  temperature: 0.7, // 0-1, higher = more creative
  systemPrompt: `You are a talented poet who creates beautiful, meaningful poems inspired by images. 
When you see an image, create a poem that captures its essence, mood, and visual elements. 
The poem should be 4-8 lines long, evocative, and emotionally resonant. 
Write in a style that feels natural and accessible while being literary and beautiful.
Response only with the poem text, no additional commentary.`,

  // Parameter presets for different use cases
  PRESETS: {
    CREATIVE: {
      temperature: 0.9,
      maxTokens: 1200,
    },
    BALANCED: {
      temperature: 0.7,
      maxTokens: 1000,
    },
    FOCUSED: {
      temperature: 0.3,
      maxTokens: 800,
    },
  },

  // Style-specific prompts
  STYLE_PROMPTS: {
    romantic: "Write in a romantic, passionate style with beautiful imagery and emotional depth.",
    nature: "Focus on natural elements, seasons, and the relationship between humanity and nature.",
    minimalist: "Use simple, clean language with powerful imagery. Keep it concise and impactful.",
    classical: "Write in a more traditional, formal poetic style with structured language.",
    modern: "Use contemporary language and free verse style. Be experimental and fresh.",
    melancholic: "Capture deeper emotions, introspection, and bittersweet beauty.",
    joyful: "Express happiness, celebration, and light-hearted emotions.",
    mystical: "Incorporate wonder, mystery, and spiritual or magical elements.",
  },

  // Language-specific adjustments
  LANGUAGE_PROMPTS: {
    ko: "시를 한국어로 작성해주세요. 아름다운 한국어 표현과 운율을 사용하세요.",
    en: "Write the poem in English with beautiful, flowing language.",
    ja: "日本語で詩を書いてください。美しい日本語の表現を使ってください。",
    zh: "请用中文写诗，使用优美的中文表达。",
  },

  // Request monitoring settings
  MONITORING: {
    LOG_REQUESTS: true,
    LOG_RESPONSES: true,
    LOG_PERFORMANCE: true,
    LOG_ERRORS: true,
    TRACK_TOKEN_USAGE: true,
  },

  // Timeout and retry settings
  TIMEOUT: {
    REQUEST_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // 1 second base delay
    RETRY_DELAY_MAX: 30000, // 30 seconds max delay
  },
} as const;

export const ERROR_MESSAGES = {
  api: {
    imageRequired: "이미지가 필요합니다",
    poemGenerationFailed: "시 생성에 실패했습니다. 다시 시도해주세요.",
    serverError: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    rateLimitExceeded: "너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.",
    invalidApiKey: "API 키 설정에 문제가 있습니다. 앱을 재시작해주세요.",
    networkError: "네트워크 연결을 확인해주세요.",
    timeoutError: "응답 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.",
    quotaExceeded: "일일 사용량을 초과했습니다. 내일 다시 시도해주세요.",
    contentFilter: "이미지 내용이 정책에 위반됩니다. 다른 이미지를 사용해주세요.",
  },
  image: {
    invalidBase64: "이미지 형식이 올바르지 않습니다",
    tooSmall: "이미지가 너무 작습니다. 더 큰 이미지를 사용해주세요.",
    tooLarge: "이미지가 너무 큽니다. 더 작은 이미지를 사용해주세요.",
    unsupportedFormat: "지원되지 않는 이미지 형식입니다. JPG, PNG 형식을 사용해주세요.",
    processingFailed: "이미지 처리에 실패했습니다. 다른 이미지를 시도해주세요.",
  },
} as const;

// User-friendly error messages with action guidance
export const USER_ERROR_MESSAGES = {
  api: {
    imageRequired: {
      title: "이미지가 필요해요",
      message: "시를 만들기 위해 사진을 먼저 촬영하거나 선택해주세요.",
      action: "사진 촬영하기",
      icon: "camera" as const,
    },
    poemGenerationFailed: {
      title: "시 생성에 실패했어요",
      message: "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      action: "다시 시도",
      icon: "refresh-cw" as const,
      suggestions: [
        "네트워크 연결 상태를 확인해주세요",
        "앱을 재시작해보세요",
        "다른 이미지로 시도해보세요",
      ],
    },
    serverError: {
      title: "서버 문제가 발생했어요",
      message: "서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.",
      action: "다시 시도",
      icon: "server" as const,
      suggestions: [
        "1-2분 후 다시 시도해주세요",
        "네트워크 연결을 확인해주세요",
        "문제가 지속되면 나중에 다시 시도해주세요",
      ],
    },
    rateLimitExceeded: {
      title: "잠시만 기다려주세요",
      message: "너무 많은 요청으로 인해 일시적으로 제한되었습니다.",
      action: "잠시 후 시도",
      icon: "clock" as const,
      suggestions: ["1-2분 후 다시 시도해주세요", "하루에 생성 가능한 시의 개수에는 제한이 있어요"],
    },
    invalidApiKey: {
      title: "설정 문제가 발생했어요",
      message: "앱 설정에 문제가 있습니다. 앱을 재시작해주세요.",
      action: "앱 재시작",
      icon: "settings" as const,
      suggestions: ["앱을 완전히 종료 후 다시 실행해주세요", "문제가 지속되면 앱을 재설치해주세요"],
    },
    networkError: {
      title: "네트워크 연결 문제",
      message: "인터넷 연결을 확인하고 다시 시도해주세요.",
      action: "다시 시도",
      icon: "wifi-off" as const,
      suggestions: [
        "WiFi 또는 모바일 데이터 연결을 확인해주세요",
        "네트워크 설정을 재설정해보세요",
        "다른 WiFi 네트워크를 시도해보세요",
      ],
    },
    timeoutError: {
      title: "응답 시간 초과",
      message: "네트워크가 느려 응답 시간이 초과되었습니다.",
      action: "다시 시도",
      icon: "clock" as const,
      suggestions: [
        "더 빠른 네트워크 환경에서 시도해주세요",
        "잠시 후 다시 시도해주세요",
        "더 작은 크기의 이미지를 사용해보세요",
      ],
    },
    quotaExceeded: {
      title: "일일 사용량 초과",
      message: "오늘의 시 생성 한도를 모두 사용했습니다.",
      action: "내일 다시 시도",
      icon: "calendar" as const,
      suggestions: ["내일 다시 시도해주세요", "프리미엄 요금제를 확인해보세요"],
    },
    contentFilter: {
      title: "이미지 내용 문제",
      message: "이 이미지로는 시를 만들 수 없어요. 다른 이미지를 사용해주세요.",
      action: "다른 이미지 선택",
      icon: "image" as const,
      suggestions: [
        "풍경, 자연, 일상의 아름다운 순간을 담은 사진을 사용해보세요",
        "선명하고 밝은 이미지를 선택해주세요",
      ],
    },
  },
  image: {
    invalidBase64: {
      title: "이미지 형식 오류",
      message: "이미지를 읽을 수 없습니다. 다른 이미지를 선택해주세요.",
      action: "다른 이미지 선택",
      icon: "image" as const,
      suggestions: ["카메라로 새로 촬영해보세요", "갤러리에서 다른 이미지를 선택해주세요"],
    },
    tooSmall: {
      title: "이미지가 너무 작아요",
      message: "더 큰 해상도의 이미지를 사용해주세요.",
      action: "다른 이미지 선택",
      icon: "zoom-in" as const,
      suggestions: ["최소 200x200 픽셀 이상의 이미지를 사용해주세요", "카메라로 다시 촬영해보세요"],
    },
    tooLarge: {
      title: "이미지가 너무 커요",
      message: "더 작은 크기의 이미지를 사용해주세요.",
      action: "다른 이미지 선택",
      icon: "zoom-out" as const,
      suggestions: ["이미지 크기를 줄여보세요", "다른 이미지를 선택해주세요"],
    },
    unsupportedFormat: {
      title: "지원되지 않는 형식",
      message: "JPG, PNG 형식의 이미지만 지원됩니다.",
      action: "다른 이미지 선택",
      icon: "file-image" as const,
      suggestions: ["JPG 또는 PNG 형식의 이미지를 사용해주세요", "카메라로 새로 촬영해보세요"],
    },
    processingFailed: {
      title: "이미지 처리 실패",
      message: "이미지를 처리하는 중 문제가 발생했습니다.",
      action: "다른 이미지 시도",
      icon: "alert-circle" as const,
      suggestions: [
        "다른 이미지를 선택해주세요",
        "카메라로 새로 촬영해보세요",
        "앱을 재시작해보세요",
      ],
    },
  },
} as const;

// Progress stage messages
export const PROGRESS_MESSAGES = {
  starting: {
    title: "시작하는 중...",
    message: "이미지를 분석할 준비를 하고 있어요",
    icon: "play-circle" as const,
  },
  validating: {
    title: "이미지 확인 중...",
    message: "이미지가 올바른지 확인하고 있어요",
    icon: "check-circle" as const,
  },
  preprocessing: {
    title: "이미지 준비 중...",
    message: "이미지를 최적화하고 있어요",
    icon: "image" as const,
  },
  requesting: {
    title: "AI가 시를 만드는 중...",
    message: "이미지를 보고 영감을 받고 있어요",
    icon: "brain" as const,
  },
  processing: {
    title: "시를 다듬는 중...",
    message: "아름다운 시로 완성하고 있어요",
    icon: "edit-3" as const,
  },
  formatting: {
    title: "마무리 중...",
    message: "시를 예쁘게 정리하고 있어요",
    icon: "align-left" as const,
  },
  completed: {
    title: "완성!",
    message: "당신만의 특별한 시가 완성되었어요",
    icon: "check" as const,
  },
  retrying: {
    title: "다시 시도 중...",
    message: "더 좋은 시를 만들기 위해 다시 시도하고 있어요",
    icon: "refresh-cw" as const,
  },
  error: {
    title: "문제 발생",
    message: "시 생성 중 문제가 발생했어요",
    icon: "alert-circle" as const,
  },
} as const;

// Performance tracking types
export interface RequestMetrics {
  requestId: string;
  timestamp: number;
  duration?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  imageMetadata?: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
  error?: string;
  retryCount?: number;
}
