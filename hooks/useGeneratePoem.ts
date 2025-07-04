import { CONFIG, getApiUrl } from "@/constants/config";
import { fileUriToBase64DataUrl } from "@/utils/image";
import { useMutation } from "@tanstack/react-query";

interface GeneratePoemRequest {
  imageUri: string;
}

interface GeneratePoemResponse {
  poem: string;
}

/**
 * Generate poem from image using Claude API
 */
async function generatePoem({ imageUri }: GeneratePoemRequest): Promise<GeneratePoemResponse> {
  try {
    // Convert file URI to base64 data URL
    const base64DataUrl = await fileUriToBase64DataUrl(imageUri);

    // Call your API endpoint using configuration
    const response = await fetch(getApiUrl(CONFIG.ENDPOINTS.GENERATE_POEM), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64DataUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate poem");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to generate poem:", error);
    throw error;
  }
}

/**
 * Hook for generating poems from images
 */
export function useGeneratePoem() {
  return useMutation({
    mutationFn: generatePoem,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
