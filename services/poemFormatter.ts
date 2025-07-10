/**
 * Poem formatting and processing service
 * Handles Claude API response processing, text extraction, and poem formatting
 */

export interface PoemStyle {
  name: string;
  description: string;
  lineBreakPattern: "natural" | "structured" | "minimal";
  indentationStyle: "none" | "alternating" | "first-line" | "hanging";
  punctuationHandling: "preserve" | "minimal" | "remove";
  lineSpacing: "single" | "double" | "custom";
}

export interface FormattedPoem {
  text: string;
  lines: string[];
  metadata: {
    lineCount: number;
    wordCount: number;
    characterCount: number;
    estimatedReadingTime: number; // in seconds
    detectedStyle: string;
    language: string;
    hasRhyme: boolean;
    meter?: string;
  };
  formatting: {
    style: PoemStyle;
    appliedFormatting: string[];
  };
}

export interface PoemValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Predefined poem styles
export const POEM_STYLES: Record<string, PoemStyle> = {
  freeVerse: {
    name: "Free Verse",
    description: "Natural flowing lines without strict meter or rhyme",
    lineBreakPattern: "natural",
    indentationStyle: "none",
    punctuationHandling: "preserve",
    lineSpacing: "single",
  },
  traditional: {
    name: "Traditional",
    description: "Structured format with consistent meter and possible rhyme",
    lineBreakPattern: "structured",
    indentationStyle: "none",
    punctuationHandling: "preserve",
    lineSpacing: "single",
  },
  haiku: {
    name: "Haiku",
    description: "Three-line format with minimal punctuation",
    lineBreakPattern: "structured",
    indentationStyle: "none",
    punctuationHandling: "minimal",
    lineSpacing: "single",
  },
  prose: {
    name: "Prose Poetry",
    description: "Paragraph format with poetic language",
    lineBreakPattern: "minimal",
    indentationStyle: "first-line",
    punctuationHandling: "preserve",
    lineSpacing: "single",
  },
  sonnet: {
    name: "Sonnet",
    description: "Fourteen lines with structured rhyme scheme",
    lineBreakPattern: "structured",
    indentationStyle: "none",
    punctuationHandling: "preserve",
    lineSpacing: "single",
  },
  korean: {
    name: "Korean Traditional",
    description: "Korean poetry format with natural line breaks",
    lineBreakPattern: "natural",
    indentationStyle: "none",
    punctuationHandling: "minimal",
    lineSpacing: "single",
  },
};

/**
 * Clean and normalize raw poem text from Claude API
 */
export function cleanPoemText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Invalid poem text provided");
  }

  let cleaned = rawText.trim();

  // Remove common artifacts from AI responses
  cleaned = cleaned
    // Remove markdown formatting
    .replace(/```.*?\n?/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Remove "Here's a poem" type prefixes
    .replace(/^(here'?s?\s+)?(a\s+)?(poem|poetry)[\s:]+/i, "")
    .replace(/^(i\s+)?(created|wrote|composed)\s+(a\s+)?poem[\s:]+/i, "")
    // Remove explanation text at the end
    .replace(/\n\n*(this\s+poem|the\s+poem|i\s+hope).*$/is, "")
    // Clean up multiple spaces and newlines
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    // Remove leading/trailing quotes if present
    .replace(/^["'"](.*)["'"]$/s, "$1")
    .trim();

  return cleaned;
}

/**
 * Detect the likely style/format of a poem
 */
export function detectPoemStyle(text: string): string {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const lineCount = lines.length;
  const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lineCount;

  // Haiku detection
  if (lineCount === 3 && avgLineLength < 30) {
    return "haiku";
  }

  // Sonnet detection
  if (lineCount === 14 && avgLineLength > 20) {
    return "sonnet";
  }

  // Prose poetry detection
  if (lineCount <= 2 && avgLineLength > 80) {
    return "prose";
  }

  // Korean poetry detection (based on character patterns)
  const hasKoreanChars = /[가-힣]/.test(text);
  if (hasKoreanChars && lineCount <= 8) {
    return "korean";
  }

  // Traditional vs free verse
  const hasRegularLength = lines.every(
    (line) => Math.abs(line.length - avgLineLength) < avgLineLength * 0.3
  );

  return hasRegularLength ? "traditional" : "freeVerse";
}

/**
 * Detect language of poem text
 */
export function detectLanguage(text: string): string {
  // Korean
  if (/[가-힣]/.test(text)) return "ko";

  // Japanese
  if (/[ひらがなカタカナ]/.test(text)) return "ja";

  // Chinese
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";

  // Default to English
  return "en";
}

/**
 * Detect if poem has rhyme scheme
 */
export function detectRhyme(lines: string[]): boolean {
  if (lines.length < 2) return false;

  const endings = lines.map((line) => {
    const words = line.trim().split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.,!?;:]$/, "") || "";
    return lastWord.slice(-2); // Last 2 characters for simple rhyme detection
  });

  // Check for alternating rhyme (ABAB) or couplet rhyme (AABB)
  let rhymeCount = 0;
  for (let i = 0; i < endings.length - 1; i++) {
    if (
      endings[i] === endings[i + 1] || // Couplet
      (i < endings.length - 2 && endings[i] === endings[i + 2])
    ) {
      // Alternating
      rhymeCount++;
    }
  }

  return rhymeCount >= Math.min(2, Math.floor(lines.length / 2));
}

/**
 * Estimate reading time for a poem
 */
export function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  const avgReadingSpeed = 150; // words per minute for poetry (slower than prose)
  return Math.max(10, Math.round((words / avgReadingSpeed) * 60)); // minimum 10 seconds
}

/**
 * Apply formatting to poem based on style
 */
export function applyPoemFormatting(text: string, style: PoemStyle): string {
  let formatted = text;
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const appliedFormatting: string[] = [];

  // Handle line breaks
  switch (style.lineBreakPattern) {
    case "structured":
      // Ensure consistent line breaks
      formatted = lines.join("\n");
      appliedFormatting.push("structured line breaks");
      break;
    case "minimal":
      // Join into paragraphs
      formatted = lines.join(" ");
      appliedFormatting.push("minimal line breaks");
      break;
    case "natural":
    default:
      // Keep natural breaks but clean them up
      formatted = lines.join("\n");
      appliedFormatting.push("natural line breaks");
      break;
  }

  // Handle indentation
  const formattedLines = formatted.split("\n");
  switch (style.indentationStyle) {
    case "alternating":
      formatted = formattedLines
        .map((line, index) => (index % 2 === 1 ? "  " + line : line))
        .join("\n");
      appliedFormatting.push("alternating indentation");
      break;
    case "first-line":
      if (formattedLines.length > 0) {
        formattedLines[0] = "  " + formattedLines[0];
        formatted = formattedLines.join("\n");
        appliedFormatting.push("first-line indentation");
      }
      break;
    case "hanging":
      formatted = formattedLines.map((line, index) => (index > 0 ? "  " + line : line)).join("\n");
      appliedFormatting.push("hanging indentation");
      break;
    case "none":
    default:
      // No indentation changes
      break;
  }

  // Handle punctuation
  switch (style.punctuationHandling) {
    case "minimal":
      formatted = formatted
        .replace(/[,;]/g, "") // Remove commas and semicolons
        .replace(/\.{2,}/g, "...") // Normalize ellipses
        .replace(/[!?]{2,}/g, (match) => match[0]); // Single exclamation/question marks
      appliedFormatting.push("minimal punctuation");
      break;
    case "remove":
      formatted = formatted.replace(/[.,!?;:]/g, "");
      appliedFormatting.push("removed punctuation");
      break;
    case "preserve":
    default:
      // Keep original punctuation
      break;
  }

  // Handle line spacing
  if (style.lineSpacing === "double") {
    formatted = formatted.replace(/\n/g, "\n\n");
    appliedFormatting.push("double line spacing");
  }

  return formatted;
}

/**
 * Validate poem structure and content
 */
export function validatePoem(text: string, expectedStyle?: string): PoemValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Basic validation
  if (!text || text.trim().length === 0) {
    errors.push("Poem text is empty");
    return { isValid: false, errors, warnings, suggestions };
  }

  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const lineCount = lines.length;
  const wordCount = text.split(/\s+/).length;

  // Length validation
  if (lineCount === 0) {
    errors.push("Poem has no content lines");
  } else if (lineCount === 1 && wordCount < 3) {
    warnings.push("Poem is very short - consider expanding");
  }

  if (wordCount < 5) {
    warnings.push("Poem has very few words");
  }

  // Style-specific validation
  if (expectedStyle) {
    switch (expectedStyle) {
      case "haiku":
        if (lineCount !== 3) {
          errors.push(`Haiku should have 3 lines, but has ${lineCount}`);
        }
        break;
      case "sonnet":
        if (lineCount !== 14) {
          errors.push(`Sonnet should have 14 lines, but has ${lineCount}`);
        }
        break;
      case "prose":
        if (lineCount > 3) {
          warnings.push("Prose poetry typically has fewer line breaks");
        }
        break;
    }
  }

  // Content quality checks
  const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lineCount;
  if (avgLineLength < 10) {
    warnings.push("Lines are quite short - consider adding more detail");
  }

  // Check for repetitive content
  const uniqueLines = new Set(lines.map((line) => line.trim().toLowerCase()));
  if (uniqueLines.size < lines.length * 0.8) {
    warnings.push("Poem has repetitive lines");
  }

  // Suggestions
  if (lineCount > 20) {
    suggestions.push("Consider breaking long poems into stanzas");
  }

  if (!detectRhyme(lines) && expectedStyle === "traditional") {
    suggestions.push("Traditional poems often benefit from rhyme scheme");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Process and format poem from Claude API response
 */
export function processPoemResponse(
  rawText: string,
  options: {
    preferredStyle?: string;
    language?: string;
    customFormatting?: Partial<PoemStyle>;
  } = {}
): FormattedPoem {
  try {
    // Step 1: Clean the raw text
    const cleanedText = cleanPoemText(rawText);

    if (!cleanedText) {
      throw new Error("No valid poem content found in response");
    }

    // Step 2: Detect characteristics
    const detectedStyle = options.preferredStyle || detectPoemStyle(cleanedText);
    const detectedLanguage = options.language || detectLanguage(cleanedText);
    const lines = cleanedText.split("\n").filter((line) => line.trim().length > 0);

    // Step 3: Select appropriate style configuration
    const baseStyle = POEM_STYLES[detectedStyle] || POEM_STYLES.freeVerse;
    const style: PoemStyle = {
      ...baseStyle,
      ...options.customFormatting,
    };

    // Step 4: Apply formatting
    const formattedText = applyPoemFormatting(cleanedText, style);
    const finalLines = formattedText.split("\n").filter((line) => line.trim().length > 0);

    // Step 5: Generate metadata
    const metadata = {
      lineCount: finalLines.length,
      wordCount: formattedText.split(/\s+/).length,
      characterCount: formattedText.length,
      estimatedReadingTime: estimateReadingTime(formattedText),
      detectedStyle,
      language: detectedLanguage,
      hasRhyme: detectRhyme(finalLines),
      meter: detectedStyle === "haiku" ? "5-7-5" : undefined,
    };

    // Step 6: Validate result
    const validation = validatePoem(formattedText, detectedStyle);

    if (!validation.isValid) {
      console.warn("Poem validation failed:", validation.errors);
      // Continue processing but log warnings
    }

    return {
      text: formattedText,
      lines: finalLines,
      metadata,
      formatting: {
        style,
        appliedFormatting: [], // This would be populated by applyPoemFormatting
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to process poem response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get available poem styles
 */
export function getAvailablePoemStyles(): Array<{ key: string; style: PoemStyle }> {
  return Object.entries(POEM_STYLES).map(([key, style]) => ({ key, style }));
}

/**
 * Create a custom poem style
 */
export function createCustomPoemStyle(
  name: string,
  options: Partial<Omit<PoemStyle, "name">>
): PoemStyle {
  return {
    name,
    description: options.description || "Custom poem style",
    lineBreakPattern: options.lineBreakPattern || "natural",
    indentationStyle: options.indentationStyle || "none",
    punctuationHandling: options.punctuationHandling || "preserve",
    lineSpacing: options.lineSpacing || "single",
  };
}
