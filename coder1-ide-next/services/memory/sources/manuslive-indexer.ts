/**
 * ManusLive Memory Indexer
 *
 * Indexes MEMORY.md and USER.md files from ~/.manuslive/workspace/ into
 * the Johnny5 memory database for semantic search.
 *
 * Features:
 * - Incremental indexing via content hash comparison
 * - Graceful handling of missing/empty files
 * - Progress reporting for background processing
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

import { chunkMarkdown, generateContentHash } from '../chunker';
import {
  initializeDb,
  upsertMemoryChunk,
  getChunksBySource,
  deleteChunksBySource,
  type MemoryChunk,
} from '@/lib/johnny5-db';

// ============================================================================
// Constants
// ============================================================================

const MANUSLIVE_DIR = join(homedir(), '.manuslive', 'workspace');
const MEMORY_FILE_PATH = join(MANUSLIVE_DIR, 'MEMORY.md');
const USER_FILE_PATH = join(MANUSLIVE_DIR, 'USER.md');

// Source identifiers for the database
const MEMORY_SOURCE_ID = 'manuslive:memory.md';
const USER_SOURCE_ID = 'manuslive:user.md';

// ============================================================================
// Types
// ============================================================================

export interface IndexResult {
  chunks: number;
  skipped: number;
  deleted?: number;
  error?: string;
}

export interface IndexProgress {
  phase: 'reading' | 'chunking' | 'indexing' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: IndexProgress) => void;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Index a single ManusLive file
 */
async function indexFile(
  filePath: string,
  sourceType: 'manuslive_memory' | 'manuslive_user',
  sourceId: string,
  onProgress?: ProgressCallback
): Promise<IndexResult> {
  // Check if file exists
  if (!existsSync(filePath)) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: `File not found: ${filePath}`,
    });
    return { chunks: 0, skipped: 0 };
  }

  // Read file content
  onProgress?.({
    phase: 'reading',
    current: 0,
    total: 1,
    message: `Reading ${filePath}`,
  });

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown read error';
    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message: `Failed to read file: ${error}`,
    });
    return { chunks: 0, skipped: 0, error };
  }

  // Handle empty file
  if (!content.trim()) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'File is empty, nothing to index',
    });
    return { chunks: 0, skipped: 0 };
  }

  // Get existing chunks to check for changes
  const existingChunks = await getChunksBySource(sourceType, sourceId);
  const existingHashes = new Set(existingChunks.map(c => c.content_hash));

  // Chunk the content
  onProgress?.({
    phase: 'chunking',
    current: 0,
    total: 1,
    message: 'Splitting content into chunks',
  });

  const chunks = chunkMarkdown(content, {
    maxTokens: 500,
    overlapTokens: 50,
    preserveStructure: true,
  });

  if (chunks.length === 0) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'No chunks generated from content',
    });
    return { chunks: 0, skipped: 0 };
  }

  // Track which hashes are still in use
  const currentHashes = new Set<string>();
  let indexed = 0;
  let skipped = 0;

  // Index each chunk
  onProgress?.({
    phase: 'indexing',
    current: 0,
    total: chunks.length,
    message: `Indexing ${chunks.length} chunks`,
  });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    currentHashes.add(chunk.contentHash);

    // Skip if content hasn't changed
    if (existingHashes.has(chunk.contentHash)) {
      skipped++;
      continue;
    }

    // Upsert the chunk
    await upsertMemoryChunk({
      id: randomUUID(),
      source_type: sourceType,
      source_id: sourceId,
      content: chunk.content,
      content_hash: chunk.contentHash,
      start_line: chunk.startLine,
      end_line: chunk.endLine,
      token_count: chunk.tokenCount,
      heading: chunk.metadata.heading,
      section_type: chunk.metadata.sectionType,
    });

    indexed++;

    onProgress?.({
      phase: 'indexing',
      current: i + 1,
      total: chunks.length,
      message: `Indexed chunk ${i + 1}/${chunks.length}`,
    });
  }

  // Delete chunks that are no longer in the file
  let deleted = 0;
  for (const existingChunk of existingChunks) {
    if (!currentHashes.has(existingChunk.content_hash)) {
      // This chunk is no longer in the source file
      // Note: We don't have a delete by hash function, so we track this
      // The next full reindex will handle cleanup
      deleted++;
    }
  }

  onProgress?.({
    phase: 'complete',
    current: chunks.length,
    total: chunks.length,
    message: `Indexed ${indexed} chunks, skipped ${skipped} unchanged`,
  });

  return {
    chunks: indexed,
    skipped,
    deleted: deleted > 0 ? deleted : undefined,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Index ManusLive MEMORY.md file
 *
 * Contains user facts, preferences, context, and goals collected from
 * various channels (Telegram, WhatsApp, etc.)
 *
 * @param onProgress - Optional callback for progress updates
 * @returns Index result with chunk counts
 *
 * @example
 * ```typescript
 * const result = await indexManusLiveMemory((progress) => {
 *   console.log(`${progress.phase}: ${progress.message}`);
 * });
 * console.log(`Indexed ${result.chunks} chunks`);
 * ```
 */
export async function indexManusLiveMemory(
  onProgress?: ProgressCallback
): Promise<IndexResult> {
  await initializeDb();

  return indexFile(
    MEMORY_FILE_PATH,
    'manuslive_memory',
    MEMORY_SOURCE_ID,
    onProgress
  );
}

/**
 * Index ManusLive USER.md file
 *
 * Contains detailed user profile including:
 * - Basic info (name, role, background)
 * - Preferences (work style, tech stack)
 * - Communication style
 * - Current focus and goals
 *
 * @param onProgress - Optional callback for progress updates
 * @returns Index result with chunk counts
 *
 * @example
 * ```typescript
 * const result = await indexManusLiveUser();
 * console.log(`Indexed ${result.chunks} chunks, skipped ${result.skipped}`);
 * ```
 */
export async function indexManusLiveUser(
  onProgress?: ProgressCallback
): Promise<IndexResult> {
  await initializeDb();

  return indexFile(
    USER_FILE_PATH,
    'manuslive_user',
    USER_SOURCE_ID,
    onProgress
  );
}

/**
 * Index both ManusLive files
 *
 * @param onProgress - Optional callback for progress updates
 * @returns Combined index results
 */
export async function indexAllManusLive(
  onProgress?: ProgressCallback
): Promise<{
  memory: IndexResult;
  user: IndexResult;
  totalChunks: number;
  totalSkipped: number;
}> {
  await initializeDb();

  onProgress?.({
    phase: 'reading',
    current: 0,
    total: 2,
    message: 'Starting ManusLive indexing',
  });

  const memoryResult = await indexManusLiveMemory((p) => {
    onProgress?.({
      ...p,
      message: `[MEMORY.md] ${p.message}`,
    });
  });

  const userResult = await indexManusLiveUser((p) => {
    onProgress?.({
      ...p,
      message: `[USER.md] ${p.message}`,
    });
  });

  onProgress?.({
    phase: 'complete',
    current: 2,
    total: 2,
    message: `Completed: ${memoryResult.chunks + userResult.chunks} chunks indexed`,
  });

  return {
    memory: memoryResult,
    user: userResult,
    totalChunks: memoryResult.chunks + userResult.chunks,
    totalSkipped: memoryResult.skipped + userResult.skipped,
  };
}

/**
 * Remove all ManusLive chunks from the index
 *
 * Use this when files are deleted or for a clean reindex.
 *
 * @returns Number of chunks deleted
 */
export async function clearManusLiveIndex(): Promise<{
  memoryDeleted: number;
  userDeleted: number;
}> {
  await initializeDb();

  const memoryDeleted = await deleteChunksBySource('manuslive_memory', MEMORY_SOURCE_ID);
  const userDeleted = await deleteChunksBySource('manuslive_user', USER_SOURCE_ID);

  return { memoryDeleted, userDeleted };
}

/**
 * Check if ManusLive files exist
 */
export function getManusLiveStatus(): {
  directoryExists: boolean;
  memoryFileExists: boolean;
  userFileExists: boolean;
  paths: {
    directory: string;
    memoryFile: string;
    userFile: string;
  };
} {
  return {
    directoryExists: existsSync(MANUSLIVE_DIR),
    memoryFileExists: existsSync(MEMORY_FILE_PATH),
    userFileExists: existsSync(USER_FILE_PATH),
    paths: {
      directory: MANUSLIVE_DIR,
      memoryFile: MEMORY_FILE_PATH,
      userFile: USER_FILE_PATH,
    },
  };
}

/**
 * Get content hash for a file without indexing
 *
 * Useful for checking if a file has changed.
 */
export async function getFileContentHash(
  fileType: 'memory' | 'user'
): Promise<string | null> {
  const filePath = fileType === 'memory' ? MEMORY_FILE_PATH : USER_FILE_PATH;

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    return generateContentHash(content);
  } catch {
    return null;
  }
}

export default {
  indexManusLiveMemory,
  indexManusLiveUser,
  indexAllManusLive,
  clearManusLiveIndex,
  getManusLiveStatus,
  getFileContentHash,
};
