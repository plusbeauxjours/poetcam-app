/**
 * Application configuration
 * Update these values according to your environment
 */

export const CONFIG = {
  // Backend API URL - Update this to match your backend domain
  API_BASE_URL: __DEV__
    ? "http://localhost:3000" // Local development
    : "https://your-production-backend.com", // Production

  // API endpoints
  ENDPOINTS: {
    GENERATE_POEM: "/api/generate-poem",
  },

  // Feature flags
  FEATURES: {
    SHARE_ENABLED: true,
    LOCATION_TRACKING: true,
    NOTIFICATIONS: true,
  },
} as const;

/**
 * Get full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  return `${CONFIG.API_BASE_URL}${endpoint}`;
}
