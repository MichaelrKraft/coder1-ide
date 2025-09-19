/**
 * API configuration for Coder1 V2
 * Centralizes all API endpoint configurations
 */

// Environment-based API base URL
const getApiBaseUrl = (): string => {
  // Check if we're in development mode
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  }
  
  // Production - use relative URLs
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoint configurations
export const API_ENDPOINTS = {
  // File management
  FILES: {
    LIST: `${API_BASE_URL}/api/files/list`,
    PREVIEW: `${API_BASE_URL}/api/files/preview`,
    SEARCH: `${API_BASE_URL}/api/files/search`,
  },
  
  // Session management
  SESSIONS: {
    CREATE: `${API_BASE_URL}/api/sessions`,
    LIST: `${API_BASE_URL}/api/sessions`,
    GET: (id: string) => `${API_BASE_URL}/api/sessions/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/sessions/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/sessions/${id}`,
    CHECKPOINT: (id: string) => `${API_BASE_URL}/api/sessions/${id}/checkpoint`,
    RESTORE: (id: string, checkpointId: string) => 
      `${API_BASE_URL}/api/sessions/${id}/checkpoints/${checkpointId}/restore`,
  },
  
  // AI integrations
  AI: {
    ANTHROPIC: `${API_BASE_URL}/api/anthropic`,
    OPENAI: `${API_BASE_URL}/api/openai`,
    AGENT: `${API_BASE_URL}/api/agent`,
  },
  
  // Tool management
  TOOLS: {
    STATUS: `${API_BASE_URL}/api/tools/status`,
    EXECUTE: `${API_BASE_URL}/api/tools/execute`,
    LIST: `${API_BASE_URL}/api/tools/list`,
  },
  
  // Hivemind/Multi-agent
  HIVEMIND: {
    CREATE: `${API_BASE_URL}/api/hivemind`,
    STATUS: (sessionId: string) => `${API_BASE_URL}/api/hivemind/${sessionId}`,
    AGENTS: (sessionId: string) => `${API_BASE_URL}/api/hivemind/${sessionId}/agents`,
  },
  
  // Voice interface
  VOICE: {
    PROCESS: `${API_BASE_URL}/api/voice`,
    STATUS: `${API_BASE_URL}/api/voice/status`,
  },
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`,
} as const;

// HTTP client configuration
export const HTTP_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
} as const;

// WebSocket configuration
export const WS_CONFIG = {
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 10,
  pingInterval: 30000, // 30 seconds
} as const;

/**
 * Build URL with query parameters
 */
export function buildUrl(baseUrl: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const url = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  
  return url.toString();
}

/**
 * Generic fetch wrapper with error handling and retries
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = HTTP_CONFIG.retries
): Promise<T> {
  const { timeout, retryDelay } = HTTP_CONFIG;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(endpoint, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Retry logic
    if (retries > 0 && shouldRetry(error)) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return apiRequest<T>(endpoint, options, retries - 1);
    }
    
    throw error;
  }
}

/**
 * Determine if an error should trigger a retry
 */
function shouldRetry(error: any): boolean {
  if (error.name === 'AbortError') return false;
  if (error.message?.includes('HTTP 4')) return false; // Don't retry client errors
  return true;
}

/**
 * WebSocket URL builder
 */
export function getWebSocketUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = API_BASE_URL ? new URL(API_BASE_URL).host : window.location.host;
  return `${protocol}//${host}${path}`;
}