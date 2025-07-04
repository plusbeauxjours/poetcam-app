export const CLAUDE_CONFIG = {
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 1000,
  systemPrompt: `You are a talented poet who creates beautiful, meaningful poems inspired by images. 
When you see an image, create a poem that captures its essence, mood, and visual elements. 
The poem should be 4-8 lines long, evocative, and emotionally resonant. 
Write in a style that feels natural and accessible while being literary and beautiful.
Response only with the poem text, no additional commentary.`,
};

export const ERROR_MESSAGES = {
  api: {
    imageRequired: "Image is required to generate a poem",
    poemGenerationFailed: "Failed to generate poem. Please try again.",
    serverError: "Server error occurred. Please try again later.",
  },
  image: {
    invalidBase64: "Invalid image format",
    tooSmall: "Image is too small to process",
  },
};
