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
  formatSessionMemoryForInjection,
  type HybridSearchConfig,
  type HybridSearchResult,
  type SearchResponse,
  // Temporal parsing
  parseTemporalReference,
  stripTemporalReference,
  type TemporalRange,
  // Query intent
  detectSessionQueryIntent,
  allocateTokenBudget,
  type SessionQueryIntent,
  type QueryIntentResult,
  type TokenBudgetAllocation,
  // Unified search
  unifiedSessionSearch,
  type UnifiedSearchResult,
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

// ============================================================================
// Memory Intelligence Services (NEW - for production memory persistence)
// ============================================================================

// Fact Extraction - AI-powered extraction from conversations
export {
  extractFactsFromConversation,
  saveFacts,
  getExistingFacts,
  getRelevantFacts,
  recordFactReference,
  getFactsByType,
  cleanupStaleFacts,
  type ExtractedFact,
  type ConversationMessage,
  type ExistingFact,
} from './fact-extraction-service';

// Pattern Detection - Learns user behavior patterns
export {
  detectPatterns,
  savePatterns,
  getHighConfidencePatterns,
  getPatternsByType,
  recordPatternApplication,
  decayStalePatterns,
  cleanupLowConfidencePatterns,
  runPatternDetectionCycle,
  type LearnedPattern,
  type PatternDetectionResult,
} from './pattern-detection-service';

// Memory Context Builder - Assembles context for prompt injection
export {
  buildMemoryContext,
  buildQuickContext,
  getProactiveSuggestion,
  type MemoryContext,
  type ContextBuildOptions,
} from './memory-context-builder';

// Session Indexer - Indexes checkpoint data into memory_chunks
export {
  indexSessionFromCheckpoint,
  type CheckpointData,
} from './session-indexer';
