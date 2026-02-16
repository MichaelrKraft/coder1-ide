/**
 * Claude Code Session Ingester
 *
 * Reads Claude Code CLI session files (~/.claude/projects/{project}/*.jsonl)
 * and indexes conversation content into the `memory_chunks` table so that
 * Johnny5 can recall past Claude Code sessions via unifiedSessionSearch().
 *
 * The downstream search pipeline (query-intent → unified-session-search →
 * hybrid-search → chat route) already works. This module provides the
 * missing upstream data ingestion.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

import { chunkMarkdown, generateContentHash, estimateTokens } from '../chunker';
import {
  upsertMemoryChunk,
  getDb,
} from '@/lib/johnny5-db';
import { redactSensitiveData } from '../session-indexer';

// ============================================================================
// Types
// ============================================================================

interface ParsedMessage {
  role: 'human' | 'assistant';
  content: string;
  timestamp: string | null;
}

export interface BatchIndexResult {
  sessions: number;
  chunks: number;
  skipped: number;
  errors: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_CHUNKS_PER_SESSION = 50;
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

// ============================================================================
// JSONL Parsing
// ============================================================================

/**
 * Parse a Claude Code JSONL session file and extract conversation messages.
 *
 * JSONL structure (per line):
 *   { type: "user", message: { role: "user", content: "..." }, timestamp: "..." }
 *   { type: "assistant", message: { role: "assistant", content: [...] }, timestamp: "..." }
 *
 * We extract only human/assistant messages with text content, skipping
 * tool_use blocks, progress events, and file-history-snapshots.
 */
export function parseSessionMessages(jsonlPath: string): ParsedMessage[] {
  const raw = readFileSync(jsonlPath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      if (parsed.type !== 'user' && parsed.type !== 'assistant') {
        continue;
      }

      const msg = parsed.message;
      if (!msg) continue;

      let textContent: string | null = null;

      if (typeof msg.content === 'string') {
        textContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Assistant messages use content blocks: [{ type: "text", text: "..." }, ...]
        const textBlocks = msg.content
          .filter((b: { type: string }) => b.type === 'text')
          .map((b: { text: string }) => b.text);
        if (textBlocks.length > 0) {
          textContent = textBlocks.join('\n');
        }
      }

      if (textContent && textContent.length > 10) {
        messages.push({
          role: parsed.type === 'user' ? 'human' : 'assistant',
          content: textContent,
          timestamp: parsed.timestamp || null,
        });
      }
    } catch {
      // Skip malformed lines
    }
  }

  return messages;
}

// ============================================================================
// Session Indexing
// ============================================================================

/**
 * Index a single Claude Code session file into memory_chunks.
 *
 * Uses the same upsertMemoryChunk() and chunkMarkdown() that
 * the existing session-indexer.ts uses for Coder1 IDE data.
 */
export async function indexClaudeSession(
  sessionFilePath: string,
  userId: string
): Promise<{ chunksIndexed: number; skipped: number }> {
  const sessionId = path.basename(sessionFilePath, '.jsonl');

  // Check if already indexed (idempotent via source_id prefix)
  const db = getDb();
  const existing = db.prepare(
    'SELECT COUNT(*) as count FROM memory_chunks WHERE source_id LIKE ?'
  ).get(`claude:${sessionId}:%`) as { count: number } | undefined;

  if (existing && existing.count > 0) {
    return { chunksIndexed: 0, skipped: existing.count };
  }

  const messages = parseSessionMessages(sessionFilePath);
  if (messages.length === 0) {
    return { chunksIndexed: 0, skipped: 0 };
  }

  // Determine project name from parent directory
  const parentDir = path.basename(path.dirname(sessionFilePath));
  // Directory names like -Users-michaelkraft-autonomous-vibe-interface
  const projectName = parentDir.split('-').slice(-2).join('-') || parentDir;

  // Build a conversation transcript
  const transcript = messages
    .map(m => `**${m.role === 'human' ? 'User' : 'Assistant'}:**\n${m.content}`)
    .join('\n\n');

  // Chunk the transcript using existing markdown chunker
  const chunks = chunkMarkdown(transcript, {
    maxTokens: 500,
    overlapTokens: 50,
    preserveStructure: true,
  });

  let chunksIndexed = 0;

  for (let i = 0; i < chunks.length && i < MAX_CHUNKS_PER_SESSION; i++) {
    const chunk = chunks[i];
    const content = redactSensitiveData(chunk.content);
    const contentHash = generateContentHash(content);

    await upsertMemoryChunk({
      id: randomUUID(),
      user_id: userId,
      source_type: 'claude_session',
      source_id: `claude:${sessionId}:${i}`,
      content,
      content_hash: contentHash,
      token_count: chunk.tokenCount,
      heading: `Claude Code Session (${projectName})`,
      section_type: 'conversation',
    });
    chunksIndexed++;
  }

  // Create a summary chunk with session metadata
  const firstUserMsg = messages.find(m => m.role === 'human');
  const summaryParts = [
    `Claude Code session in project: ${projectName}`,
    `Session ID: ${sessionId}`,
    `Messages: ${messages.length} (${messages.filter(m => m.role === 'human').length} user, ${messages.filter(m => m.role === 'assistant').length} assistant)`,
    firstUserMsg ? `First user message: ${firstUserMsg.content.slice(0, 300)}` : '',
    messages[0]?.timestamp ? `Started: ${messages[0].timestamp}` : '',
  ].filter(Boolean);

  const summaryContent = redactSensitiveData(summaryParts.join('\n'));
  await upsertMemoryChunk({
    id: randomUUID(),
    user_id: userId,
    source_type: 'claude_session_summary',
    source_id: `claude:${sessionId}:summary`,
    content: summaryContent,
    content_hash: generateContentHash(summaryContent),
    token_count: estimateTokens(summaryContent),
    heading: `Claude Session Summary (${projectName})`,
    section_type: 'session_summary',
  });
  chunksIndexed++;

  console.log(`[ClaudeSessionIngester] Indexed session ${sessionId.slice(0, 8)}: ${chunksIndexed} chunks from ${messages.length} messages`);

  return { chunksIndexed, skipped: 0 };
}

// ============================================================================
// Batch Indexing
// ============================================================================

/**
 * Scan all Claude Code project directories and index sessions
 * that haven't been indexed yet.
 *
 * @param userId - User ID for memory_chunks ownership
 * @param options.limit - Max number of sessions to process (default 50)
 * @param options.afterDate - Only index sessions modified after this date
 */
export async function indexAllClaudeSessions(
  userId: string,
  options?: { limit?: number; afterDate?: Date }
): Promise<BatchIndexResult> {
  const limit = options?.limit ?? 50;
  const afterDate = options?.afterDate;

  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    console.log('[ClaudeSessionIngester] Claude projects directory not found:', CLAUDE_PROJECTS_DIR);
    return { sessions: 0, chunks: 0, skipped: 0, errors: 0 };
  }

  // Collect all JSONL files across all project directories
  const jsonlFiles: { path: string; mtime: Date }[] = [];

  try {
    const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR);

    for (const dir of projectDirs) {
      const fullDir = path.join(CLAUDE_PROJECTS_DIR, dir);
      try {
        const dirStat = statSync(fullDir);
        if (!dirStat.isDirectory()) continue;

        const files = readdirSync(fullDir);
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue;

          const fullPath = path.join(fullDir, file);
          const fileStat = statSync(fullPath);

          if (afterDate && fileStat.mtime < afterDate) continue;

          jsonlFiles.push({ path: fullPath, mtime: fileStat.mtime });
        }
      } catch {
        // Skip inaccessible directories
      }
    }
  } catch (err) {
    console.warn('[ClaudeSessionIngester] Error scanning projects directory:', err);
    return { sessions: 0, chunks: 0, skipped: 0, errors: 0 };
  }

  // Sort by modification time (most recent first) and limit
  jsonlFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  const toProcess = jsonlFiles.slice(0, limit);

  console.log(`[ClaudeSessionIngester] Found ${jsonlFiles.length} JSONL files, processing ${toProcess.length}`);

  let totalSessions = 0;
  let totalChunks = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const file of toProcess) {
    try {
      const result = await indexClaudeSession(file.path, userId);
      totalSessions++;
      totalChunks += result.chunksIndexed;
      totalSkipped += result.skipped;
    } catch (err) {
      totalErrors++;
      console.error(`[ClaudeSessionIngester] Error indexing ${file.path}:`, err);
    }
  }

  if (totalChunks > 0) {
    console.log(`[ClaudeSessionIngester] Batch complete: ${totalSessions} sessions, ${totalChunks} chunks indexed, ${totalSkipped} skipped, ${totalErrors} errors`);
  }

  return {
    sessions: totalSessions,
    chunks: totalChunks,
    skipped: totalSkipped,
    errors: totalErrors,
  };
}
