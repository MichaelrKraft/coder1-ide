/**
 * Johnny5 Context Tracker Service
 *
 * Tracks context window composition for visibility into AI operations.
 * Shows what files, conversations, and system data occupy the context.
 */

import fs from 'fs';
import path from 'path';
import type { Johnny5ContextComposition, Johnny5FileContext } from '@/types/johnny5';

// Storage path
const DATA_DIR = path.join(process.cwd(), 'data', 'johnny5');
const CONTEXT_FILE = path.join(DATA_DIR, 'context-files.json');

// In-memory cache
interface ContextFileRecord {
  path: string;
  tokens: number;
  addedAt: Date;
  sessionId?: string;
}

let filesCache: ContextFileRecord[] = [];
let cacheLoaded = false;

// Estimated tokens for system components
const SYSTEM_PROMPT_TOKENS = 2500; // Johnny5 system prompt
const TOOL_DEFINITIONS_TOKENS = 1500; // Tool schemas

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load context files from disk
 */
function loadContextFiles(): ContextFileRecord[] {
  if (cacheLoaded) {
    return filesCache;
  }

  ensureDataDir();

  if (fs.existsSync(CONTEXT_FILE)) {
    try {
      const data = fs.readFileSync(CONTEXT_FILE, 'utf-8');
      filesCache = JSON.parse(data).map((file: ContextFileRecord) => ({
        ...file,
        addedAt: new Date(file.addedAt),
      }));
    } catch (error) {
      console.error('[ContextTracker] Failed to load context files:', error);
      filesCache = [];
    }
  } else {
    filesCache = [];
  }

  cacheLoaded = true;
  return filesCache;
}

/**
 * Save context files to disk
 */
function saveContextFiles(): void {
  ensureDataDir();
  try {
    // Keep only last 100 files
    const toSave = filesCache.slice(-100);
    fs.writeFileSync(CONTEXT_FILE, JSON.stringify(toSave, null, 2));
  } catch (error) {
    console.error('[ContextTracker] Failed to save context files:', error);
  }
}

/**
 * Estimate token count for text (rough approximation)
 */
function estimateTokens(text: string): number {
  // Claude uses ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Track a file being added to context
 */
export function trackFileRead(params: {
  path: string;
  content?: string;
  tokens?: number;
  sessionId?: string;
}): void {
  loadContextFiles();

  // Remove existing entry for this file if present
  filesCache = filesCache.filter(f => f.path !== params.path);

  const record: ContextFileRecord = {
    path: params.path,
    tokens: params.tokens || (params.content ? estimateTokens(params.content) : 1000),
    addedAt: new Date(),
    sessionId: params.sessionId,
  };

  filesCache.push(record);
  setImmediate(() => saveContextFiles());

  console.log('[ContextTracker] File added to context:', {
    path: record.path,
    tokens: record.tokens,
  });
}

/**
 * Track conversation tokens
 */
let conversationTokens = 0;

export function updateConversationTokens(tokens: number): void {
  conversationTokens = tokens;
}

export function addConversationTokens(inputTokens: number, outputTokens: number): void {
  conversationTokens += inputTokens + outputTokens;
}

/**
 * Get current context composition
 */
export function getContextComposition(): Johnny5ContextComposition {
  const files = loadContextFiles();

  // Filter to recent files (last hour) for current context
  const recentFiles = files.filter(f =>
    f.addedAt.getTime() > Date.now() - 60 * 60 * 1000
  );

  const filesTotal = recentFiles.reduce((sum, f) => sum + f.tokens, 0);

  const total = SYSTEM_PROMPT_TOKENS + conversationTokens + filesTotal + TOOL_DEFINITIONS_TOKENS;
  const limit = 200000; // Claude's context limit

  return {
    total,
    limit,
    usagePercentage: Math.round((total / limit) * 100),
    breakdown: {
      system: SYSTEM_PROMPT_TOKENS,
      conversation: conversationTokens,
      files: recentFiles.map(f => ({
        path: f.path,
        tokens: f.tokens,
        addedAt: f.addedAt,
      })),
      tools: TOOL_DEFINITIONS_TOKENS,
    },
  };
}

/**
 * Get files currently in context
 */
export function getContextFiles(sessionId?: string): Johnny5FileContext[] {
  const files = loadContextFiles();

  let filtered = files;
  if (sessionId) {
    filtered = files.filter(f => f.sessionId === sessionId);
  }

  // Sort by addedAt descending
  filtered.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());

  return filtered.map(f => ({
    path: f.path,
    tokens: f.tokens,
    addedAt: f.addedAt,
  }));
}

/**
 * Clear context (e.g., when starting new session)
 */
export function clearContext(): void {
  filesCache = [];
  conversationTokens = 0;
  cacheLoaded = true;
  saveContextFiles();
}

/**
 * Remove a file from context
 */
export function removeFileFromContext(filePath: string): void {
  loadContextFiles();
  filesCache = filesCache.filter(f => f.path !== filePath);
  setImmediate(() => saveContextFiles());
}

// Export singleton-style functions
export const ContextTracker = {
  trackFileRead,
  updateConversationTokens,
  addConversationTokens,
  getContextComposition,
  getContextFiles,
  clearContext,
  removeFileFromContext,
};

export default ContextTracker;
