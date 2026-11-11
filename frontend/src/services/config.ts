/**
 * Centralized API configuration for SIFTRIX.
 * Reads backend base URL from Vite environment variable (VITE_API_BASE_URL)
 * with a fallback to the default FastAPI local development address (http://localhost:8000).
 */
const rawBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000'

export const API_CONFIG = {
  // Base URL pointing to the FastAPI backend server (trailing slashes normalized)
  BASE_URL: rawBaseUrl.replace(/\/+$/, ''),

  // Request timeout in milliseconds (30 seconds to allow multi-agent AI analysis)
  TIMEOUT_MS: 30000,

  // Default headers for JSON communication
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
} as const
