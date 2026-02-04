/**
 * Johnny5 Memory System
 *
 * Provides semantic search, session recall, and intelligent
 * context building for the Johnny5 autonomous AI employee.
 *
 * Key components:
 * - Chunker: Splits markdown into searchable chunks
 * - Embeddings: Generates vector embeddings via Gemini
 * - Search: Hybrid vector + keyword search
 * - Sources: Indexes ManusLive and session data
 */

// Chunking
export {
  chunkMarkdown,
  estimateTokens,
  generateContentHash,
  mergeOverlappingChunks,
  validateChunk,
  getChunkStats,
  type Chunk,
  type ChunkConfig,
  type ChunkMetadata,
  type ChunkStats,
} from './chunker';

// Search
export {
  hybridSearch,
  keywordOnlySearch,
  searchMemory,
  formatSearchResults,
  formatForPromptInjection,
  type HybridSearchConfig,
  type HybridSearchResult,
  type SearchResponse,
} from './search';

// Embeddings
export {
  GeminiEmbeddingProvider,
  createGeminiProvider,
  type EmbeddingProvider,
  type GeminiConfig,
  type EmbeddingCache,
  type ProviderHealth,
} from './embeddings';

// Sources
export {
  indexManusLiveMemory,
  indexManusLiveUser,
  indexAllManusLive,
  clearManusLiveIndex,
  indexSession,
  indexAllSessions,
  clearSessionIndex,
  startFileWatcher,
  stopFileWatcher,
  isWatcherRunning,
  initializeMemorySources,
  cleanupMemorySources,
} from './sources';
