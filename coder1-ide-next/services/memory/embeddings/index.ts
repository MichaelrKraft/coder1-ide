/**
 * Embedding Providers for Johnny5 Memory System
 *
 * Exports all embedding provider implementations and shared types.
 */

// Types
export * from './types';

// Gemini Provider
export {
  GeminiEmbeddingProvider,
  createGeminiProvider,
  type GeminiConfig,
} from './gemini-provider';
