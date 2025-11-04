import OpenAI from 'openai';
import { logger } from './logger';

interface EmbeddingCache {
  embedding: number[];
  timestamp: number;
}

export class EmbeddingService {
  private openai: OpenAI;
  private cache: Map<string, EmbeddingCache>;
  private readonly CACHE_MAX_SIZE = 1000;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000;
  private readonly MODEL = 'text-embedding-3-small';
  private readonly RATE_LIMIT_RPM = 3000;
  private requestQueue: Array<() => Promise<void>> = [];
  private processing = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      logger.warn('⚠️ OPENAI_API_KEY not configured - embeddings will be unavailable');
      this.openai = null as any;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
    
    this.cache = new Map();
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) {
      logger.debug('⚠️ OpenAI not configured, skipping embedding generation');
      return null;
    }

    try {
      const cached = this.getCached(text);
      if (cached) {
        logger.debug('✅ Using cached embedding');
        return cached;
      }

      const cleanText = this.preprocessText(text);
      
      if (cleanText.length === 0) {
        logger.warn('⚠️ Empty text after preprocessing, skipping embedding');
        return null;
      }

      const response = await this.retryWithBackoff(async () => {
        return await this.openai.embeddings.create({
          model: this.MODEL,
          input: cleanText,
          encoding_format: 'float',
        });
      });

      const embedding = response.data[0].embedding;
      
      this.setCached(text, embedding);
      
      logger.debug(`✅ Generated embedding (${embedding.length} dimensions)`);
      
      return embedding;
    } catch (error: any) {
      logger.error('❌ Failed to generate embedding:', error.message);
      return null;
    }
  }

  async generateBatch(texts: string[]): Promise<Array<number[] | null>> {
    if (!this.openai) {
      return texts.map(() => null);
    }

    if (texts.length === 0) {
      return [];
    }

    const BATCH_SIZE = 100;
    const results: Array<number[] | null> = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(text => this.generateEmbedding(text))
      );
      results.push(...batchResults);

      if (i + BATCH_SIZE < texts.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  private getCached(text: string): number[] | null {
    const key = this.getCacheKey(text);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.embedding;
  }

  private setCached(text: string, embedding: number[]): void {
    const key = this.getCacheKey(text);

    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
    });
  }

  private getCacheKey(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text).digest('hex');
  }

  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (error.status === 429) {
          const delay = initialDelay * Math.pow(2, attempt);
          logger.warn(`⚠️ Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        if (error.status >= 500) {
          const delay = initialDelay * Math.pow(2, attempt);
          logger.warn(`⚠️ Server error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('🧹 Embedding cache cleared');
  }

  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_MAX_SIZE,
      hitRate: 0,
    };
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
