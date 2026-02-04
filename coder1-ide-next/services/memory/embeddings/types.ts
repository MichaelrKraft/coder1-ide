/**
 * Embedding Provider Types
 * Shared interfaces for the Johnny5 memory system embedding providers
 */

/**
 * Core embedding provider interface
 * All embedding providers must implement this interface
 */
export interface EmbeddingProvider {
  /**
   * Embed multiple texts in a single batch request
   * @param texts Array of strings to embed
   * @returns Array of embedding vectors (number arrays)
   */
  embed(texts: string[]): Promise<number[][]>;

  /**
   * Embed a single text
   * @param text String to embed
   * @returns Single embedding vector
   */
  embedSingle(text: string): Promise<number[]>;

  /**
   * Model identifier string
   */
  readonly modelName: string;

  /**
   * Embedding vector dimensions
   */
  readonly dimensions: number;
}

/**
 * Rate limiter state for tracking API usage
 */
export interface RateLimiterState {
  /** Timestamps of requests made in current minute window */
  minuteWindow: number[];
  /** Timestamps of requests made in current day window */
  dayWindow: number[];
  /** Queue of pending requests when rate limited */
  pendingQueue: Array<{
    texts: string[];
    resolve: (value: number[][]) => void;
    reject: (error: Error) => void;
  }>;
  /** Whether the rate limiter is currently processing the queue */
  isProcessingQueue: boolean;
}

/**
 * Embedding cache entry
 */
export interface EmbeddingCacheEntry {
  /** The embedding vector */
  embedding: number[];
  /** Timestamp when cached */
  cachedAt: number;
  /** Hash of the input text */
  textHash: string;
}

/**
 * Embedding cache interface
 */
export interface EmbeddingCache {
  /** Get a cached embedding by text hash */
  get(textHash: string): EmbeddingCacheEntry | undefined;
  /** Set a cached embedding */
  set(textHash: string, entry: EmbeddingCacheEntry): void;
  /** Check if text hash exists in cache */
  has(textHash: string): boolean;
  /** Remove a cached entry */
  delete(textHash: string): boolean;
  /** Clear all cached entries */
  clear(): void;
  /** Get cache size */
  size: number;
}

/**
 * Result of a batch embedding operation
 */
export interface BatchEmbeddingResult {
  /** Successfully embedded texts and their vectors */
  successful: Array<{
    index: number;
    text: string;
    embedding: number[];
  }>;
  /** Failed texts with error information */
  failed: Array<{
    index: number;
    text: string;
    error: string;
  }>;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  /** Whether the provider is healthy */
  healthy: boolean;
  /** Last successful request timestamp */
  lastSuccessAt?: number;
  /** Last error message */
  lastError?: string;
  /** Current rate limit status */
  rateLimitStatus: {
    minuteRemaining: number;
    dayRemaining: number;
    queuedRequests: number;
  };
  /** Cache statistics */
  cacheStats: {
    size: number;
    hitRate: number;
  };
}

/**
 * Embedding provider error types
 */
export enum EmbeddingErrorType {
  API_KEY_MISSING = 'API_KEY_MISSING',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  API_TIMEOUT = 'API_TIMEOUT',
  API_ERROR = 'API_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
}

/**
 * Custom error class for embedding operations
 */
export class EmbeddingError extends Error {
  constructor(
    public readonly type: EmbeddingErrorType,
    message: string,
    public readonly retryable: boolean = false,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}
