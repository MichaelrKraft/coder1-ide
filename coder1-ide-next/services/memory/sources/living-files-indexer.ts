/**
 * Living Files Indexer
 *
 * Indexes Johnny5's 9 living files (SOUL.md, USER.md, MEMORY.md, etc.) into the
 * memory_chunks table so hybrid search can find personal data like user preferences,
 * project context, and persistent facts.
 *
 * Triggered three ways:
 *   1. Server startup (inside setImmediate after loadVectorExtension)
 *   2. After a living file is saved via the Living Files UI (PUT /api/johnny5/living-files/[filename])
 *   3. After MEMORY.md is compressed by the memory compressor
 */

import { randomUUID } from 'crypto';
import { LIVING_FILES, loadLivingFile } from '@/lib/living-files';
import { chunkMarkdown } from '../chunker';
import { initializeDb, upsertMemoryChunk, getChunksBySource, deleteChunksBySource } from '@/lib/johnny5-db';

// ============================================================================
// Types
// ============================================================================

export interface IndexResult {
  chunks: number;
  skipped: number;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SOURCE_TYPE = 'living_file';
const MAX_FILE_BYTES = 512 * 1024; // 512 KB — same guard as manuslive-indexer

// ============================================================================
// Helpers
// ============================================================================

function getSourceId(filename: string, userId: string): string {
  return `living:${filename}:${userId}`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Index a single living file into memory_chunks.
 *
 * Uses delete-then-reinsert (not upsert) to ensure stale chunks from
 * previous content (e.g. pre-compression MEMORY.md) are fully removed.
 *
 * Guards:
 * - No-op if file is missing or empty
 * - No-op if file exceeds 512 KB
 * - No-op if chunk hashes haven't changed (cheap change detection)
 */
export async function indexLivingFile(filename: string, userId: string = 'default'): Promise<IndexResult> {
  await initializeDb();
  const sourceId = getSourceId(filename, userId);

  const content = loadLivingFile(filename, userId);
  if (!content || !content.trim()) {
    return { chunks: 0, skipped: 0 };
  }

  if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_BYTES) {
    console.warn(`[living-files-indexer] Skipping oversized file: ${filename}`);
    return { chunks: 0, skipped: 1, error: 'File exceeds 512 KB size limit' };
  }

  const newChunks = chunkMarkdown(content, { maxTokens: 500, overlapTokens: 50 });
  if (newChunks.length === 0) {
    return { chunks: 0, skipped: 0 };
  }

  // Change detection: compare chunk hashes to avoid unnecessary writes
  const existingChunks = await getChunksBySource(SOURCE_TYPE, sourceId, userId);
  const newHashes = new Set(newChunks.map(c => c.contentHash));
  const existingHashes = new Set(existingChunks.map(c => c.content_hash));

  const hasChanges =
    newChunks.some(c => !existingHashes.has(c.contentHash)) ||
    existingChunks.some(c => !newHashes.has(c.content_hash));

  if (!hasChanges) {
    return { chunks: 0, skipped: newChunks.length };
  }

  // Delete all existing chunks for this source before inserting fresh ones.
  // This cleanly handles rewrites and compression (stale chunks from old
  // content won't survive a re-index).
  await deleteChunksBySource(SOURCE_TYPE, sourceId, userId);

  let indexed = 0;
  for (const chunk of newChunks) {
    await upsertMemoryChunk({
      id: randomUUID(),
      user_id: userId,
      source_type: SOURCE_TYPE,
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
  }

  console.log(`[living-files-indexer] ${filename}: ${indexed} chunks indexed`);
  return { chunks: indexed, skipped: 0 };
}

/**
 * Index all 9 living files on startup.
 *
 * Runs each file sequentially to avoid DB contention.
 * Errors on individual files are caught and logged — they don't abort the batch.
 */
export async function indexAllLivingFiles(
  userId: string = 'default'
): Promise<{ totalChunks: number; totalSkipped: number; results: Record<string, IndexResult> }> {
  await initializeDb();

  let totalChunks = 0;
  let totalSkipped = 0;
  const results: Record<string, IndexResult> = {};

  for (const file of LIVING_FILES) {
    try {
      const result = await indexLivingFile(file.filename, userId);
      results[file.filename] = result;
      totalChunks += result.chunks;
      totalSkipped += result.skipped;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.warn(`[living-files-indexer] Failed to index ${file.filename}:`, error);
      results[file.filename] = { chunks: 0, skipped: 0, error };
    }
  }

  return { totalChunks, totalSkipped, results };
}
