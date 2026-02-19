/**
 * Gemini Embedding Provider
 * Implements embedding generation using Google's Gemini embedding-001 model
 * with rate limiting, caching, and retry logic for the Johnny5 memory system
 */

import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import {
  EmbeddingProvider,
  EmbeddingCache,
  EmbeddingCacheEntry,
  RateLimiterState,
  ProviderHealth,
  EmbeddingError,
  EmbeddingErrorType,
  BatchEmbeddingResult,
} from './types';

/**
 * Configuration for the Gemini embedding provider
 */
export interface GeminiConfig {
  /** Google AI API key */
  apiKey: string;
  /** Maximum requests per minute (default: 60) */
  requestsPerMinute?: number;
  /** Maximum requests per day (default: 1500) */
  requestsPerDay?: number;
  /** Maximum texts per batch request (default: 100) */
  batchSize?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Cache TTL in milliseconds (default: 24 hours) */
  cacheTtlMs?: number;
  /** Maximum cache size (default: 10000) */
  maxCacheSize?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<GeminiConfig, 'apiKey'>> = {
  requestsPerMinute: 60,
  requestsPerDay: 1500,
  batchSize: 100,
  retryDelayMs: 1000,
  maxRetries: 3,
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 10000,
  timeoutMs: 30000,
};

/**
 * Gemini embedding model constants
 * Override GEMINI_EMBEDDING_MODEL in .env.local if text-embedding-004 returns 404.
 * Run: curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | grep embedding
 * to list available models.
 */
const GEMINI_MODEL_NAME = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
const GEMINI_DIMENSIONS = 768;

/**
 * Simple in-memory LRU cache implementation
 */
class LRUCache implements EmbeddingCache {
  private cache = new Map<string, EmbeddingCacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number
  ) {}

  get(textHash: string): EmbeddingCacheEntry | undefined {
    const entry = this.cache.get(textHash);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(textHash);
      this.misses++;
      return undefined;
    }

    // Move to end for LRU behavior
    this.cache.delete(textHash);
    this.cache.set(textHash, entry);
    this.hits++;
    return entry;
  }

  set(textHash: string, entry: EmbeddingCacheEntry): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(textHash, entry);
  }

  has(textHash: string): boolean {
    const entry = this.cache.get(textHash);
    if (!entry) return false;
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(textHash);
      return false;
    }
    return true;
  }

  delete(textHash: string): boolean {
    return this.cache.delete(textHash);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }
}

/**
 * Gemini Embedding Provider Implementation
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  public readonly modelName = GEMINI_MODEL_NAME;
  public readonly dimensions = GEMINI_DIMENSIONS;

  private readonly config: Required<GeminiConfig>;
  private readonly client: GoogleGenerativeAI;
  private readonly cache: LRUCache;
  private readonly rateLimiter: RateLimiterState;
  private lastSuccessAt?: number;
  private lastError?: string;

  constructor(config: GeminiConfig) {
    // Validate API key
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new EmbeddingError(
        EmbeddingErrorType.API_KEY_MISSING,
        'Gemini API key is required. Set GOOGLE_AI_API_KEY environment variable or pass apiKey in config.',
        false
      );
    }

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<GeminiConfig>;

    // Initialize Google AI client
    this.client = new GoogleGenerativeAI(this.config.apiKey);

    // Initialize cache
    this.cache = new LRUCache(this.config.maxCacheSize, this.config.cacheTtlMs);

    // Initialize rate limiter
    this.rateLimiter = {
      minuteWindow: [],
      dayWindow: [],
      pendingQueue: [],
      isProcessingQueue: false,
    };
  }

  /**
   * Embed multiple texts in batches
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Check for cached embeddings and separate uncached texts
    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];

      // Handle empty text - return zero vector
      if (!text || text.trim() === '') {
        results[i] = new Array(this.dimensions).fill(0);
        continue;
      }

      const hash = this.hashText(text);
      const cached = this.cache.get(hash);

      if (cached) {
        results[i] = cached.embedding;
      } else {
        uncachedIndices.push(i);
      }
    }

    // If all texts were cached, return results
    if (uncachedIndices.length === 0) {
      return results as number[][];
    }

    // Process uncached texts in batches
    const uncachedTexts = uncachedIndices.map(i => texts[i]);
    const batchResults = await this.processBatches(uncachedTexts);

    // Merge results and cache new embeddings
    for (let i = 0; i < uncachedIndices.length; i++) {
      const originalIndex = uncachedIndices[i];
      const embedding = batchResults[i];
      results[originalIndex] = embedding;

      // Cache the result
      const text = texts[originalIndex];
      const hash = this.hashText(text);
      this.cache.set(hash, {
        embedding,
        cachedAt: Date.now(),
        textHash: hash,
      });
    }

    return results as number[][];
  }

  /**
   * Embed a single text
   */
  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  /**
   * Process texts in batches with rate limiting
   */
  private async processBatches(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchResults = await this.processSingleBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Process a single batch with rate limiting and retries
   */
  private async processSingleBatch(texts: string[]): Promise<number[][]> {
    // Wait for rate limit clearance
    await this.waitForRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const embeddings = await this.callEmbeddingAPI(texts);
        this.lastSuccessAt = Date.now();
        return embeddings;
      } catch (error) {
        lastError = error as Error;

        // Determine if error is retryable
        const embeddingError = this.classifyError(error);

        if (!embeddingError.retryable || attempt === this.config.maxRetries) {
          this.lastError = embeddingError.message;
          throw embeddingError;
        }

        // Calculate exponential backoff delay
        const delay = this.config.retryDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new EmbeddingError(
      EmbeddingErrorType.API_ERROR,
      'Unknown error after retries',
      false
    );
  }

  /**
   * Call the Gemini embedding API
   */
  private async callEmbeddingAPI(texts: string[]): Promise<number[][]> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new EmbeddingError(
          EmbeddingErrorType.API_TIMEOUT,
          `API request timed out after ${this.config.timeoutMs}ms`,
          true
        ));
      }, this.config.timeoutMs);
    });

    // Call API with timeout
    const apiPromise = (async () => {
      const embeddings: number[][] = [];

      // Process each text individually since batch embedding isn't directly supported
      // in the same way as OpenAI - we use embedContent for each text
      for (const text of texts) {
        const result = await model.embedContent({
          content: { parts: [{ text }], role: 'user' },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
        });
        embeddings.push(result.embedding.values);
      }

      return embeddings;
    })();

    // Record the request for rate limiting
    this.recordRequest();

    return Promise.race([apiPromise, timeoutPromise]);
  }

  /**
   * Wait for rate limit clearance
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Clean up old timestamps
    this.rateLimiter.minuteWindow = this.rateLimiter.minuteWindow.filter(
      t => t > oneMinuteAgo
    );
    this.rateLimiter.dayWindow = this.rateLimiter.dayWindow.filter(
      t => t > oneDayAgo
    );

    // Check daily limit
    if (this.rateLimiter.dayWindow.length >= this.config.requestsPerDay) {
      const oldestDayRequest = Math.min(...this.rateLimiter.dayWindow);
      const waitTime = oldestDayRequest + 24 * 60 * 60 * 1000 - now;

      throw new EmbeddingError(
        EmbeddingErrorType.RATE_LIMIT_EXCEEDED,
        `Daily rate limit exceeded (${this.config.requestsPerDay} requests/day). ` +
        `Reset in ${Math.ceil(waitTime / 1000 / 60)} minutes.`,
        true,
        waitTime
      );
    }

    // Check minute limit and wait if necessary
    if (this.rateLimiter.minuteWindow.length >= this.config.requestsPerMinute) {
      const oldestMinuteRequest = Math.min(...this.rateLimiter.minuteWindow);
      const waitTime = oldestMinuteRequest + 60 * 1000 - now;

      if (waitTime > 0) {
        await this.sleep(waitTime + 100); // Add small buffer
      }
    }
  }

  /**
   * Record a request for rate limiting
   */
  private recordRequest(): void {
    const now = Date.now();
    this.rateLimiter.minuteWindow.push(now);
    this.rateLimiter.dayWindow.push(now);
  }

  /**
   * Classify an error and return an EmbeddingError
   */
  private classifyError(error: unknown): EmbeddingError {
    if (error instanceof EmbeddingError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Rate limit errors
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      return new EmbeddingError(
        EmbeddingErrorType.RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded: ${errorMessage}`,
        true,
        60000 // Wait 1 minute
      );
    }

    // Timeout errors
    if (lowerMessage.includes('timeout') || lowerMessage.includes('etimedout')) {
      return new EmbeddingError(
        EmbeddingErrorType.API_TIMEOUT,
        `API timeout: ${errorMessage}`,
        true
      );
    }

    // API key errors
    if (
      lowerMessage.includes('api key') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('401')
    ) {
      return new EmbeddingError(
        EmbeddingErrorType.API_KEY_MISSING,
        `API key error: ${errorMessage}`,
        false
      );
    }

    // Network errors (retryable)
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('econnreset') ||
      lowerMessage.includes('500') ||
      lowerMessage.includes('502') ||
      lowerMessage.includes('503') ||
      lowerMessage.includes('504')
    ) {
      return new EmbeddingError(
        EmbeddingErrorType.API_ERROR,
        `Network error: ${errorMessage}`,
        true
      );
    }

    // Default non-retryable error
    return new EmbeddingError(
      EmbeddingErrorType.API_ERROR,
      `API error: ${errorMessage}`,
      false
    );
  }

  /**
   * Generate a hash for text caching
   */
  private hashText(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `gemini_${hash.toString(16)}_${text.length}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider health status
   */
  getHealth(): ProviderHealth {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Clean up old timestamps for accurate counts
    const minuteRequests = this.rateLimiter.minuteWindow.filter(
      t => t > oneMinuteAgo
    ).length;
    const dayRequests = this.rateLimiter.dayWindow.filter(
      t => t > oneDayAgo
    ).length;

    return {
      healthy: !this.lastError || (this.lastSuccessAt ?? 0) > (now - 5 * 60 * 1000),
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      rateLimitStatus: {
        minuteRemaining: Math.max(0, this.config.requestsPerMinute - minuteRequests),
        dayRemaining: Math.max(0, this.config.requestsPerDay - dayRequests),
        queuedRequests: this.rateLimiter.pendingQueue.length,
      },
      cacheStats: {
        size: this.cache.size,
        hitRate: this.cache.hitRate,
      },
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; maxSize: number } {
    return {
      size: this.cache.size,
      hitRate: this.cache.hitRate,
      maxSize: this.config.maxCacheSize,
    };
  }
}

/**
 * Factory function to create a Gemini provider from environment variables
 */
export function createGeminiProvider(
  overrides?: Partial<GeminiConfig>
): GeminiEmbeddingProvider {
  const apiKey = overrides?.apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new EmbeddingError(
      EmbeddingErrorType.API_KEY_MISSING,
      'Gemini API key not found. Set GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable.',
      false
    );
  }

  return new GeminiEmbeddingProvider({
    apiKey,
    ...overrides,
  });
}

export default GeminiEmbeddingProvider;
