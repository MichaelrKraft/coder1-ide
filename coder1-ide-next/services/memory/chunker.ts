/**
 * Markdown-Aware Chunking Service for Johnny5 Memory System
 *
 * This service splits markdown text into semantically coherent chunks while:
 * - Preserving structure (never splits mid-heading, mid-code-block, or mid-list-item)
 * - Adding overlap between chunks for context continuity
 * - Tracking line numbers for citations
 * - Generating SHA-256 content hashes for deduplication
 */

import * as crypto from 'crypto';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ChunkConfig {
  maxTokens?: number;          // Default 500
  overlapTokens?: number;      // Default 50
  preserveStructure?: boolean; // Default true
}

export interface Chunk {
  id: string;
  content: string;
  contentHash: string;
  startLine: number;
  endLine: number;
  tokenCount: number;
  metadata: {
    heading?: string;          // Parent heading context
    isCodeBlock?: boolean;
    sectionType?: string;      // 'preferences', 'facts', 'context', etc.
  };
}

interface MarkdownBlock {
  type: 'heading' | 'code' | 'list' | 'paragraph' | 'blockquote' | 'hr' | 'empty';
  content: string;
  startLine: number;
  endLine: number;
  level?: number;              // For headings (1-6)
  language?: string;           // For code blocks
  listDepth?: number;          // For nested lists
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_OVERLAP_TOKENS = 50;
const CHARS_PER_TOKEN = 4;

// Section type detection keywords
const SECTION_TYPE_PATTERNS: Record<string, RegExp[]> = {
  preferences: [/prefer/i, /like/i, /want/i, /style/i, /favor/i, /dislike/i],
  facts: [/is a/i, /was born/i, /works at/i, /lives in/i, /email/i, /phone/i, /name is/i],
  context: [/project/i, /codebase/i, /repository/i, /framework/i, /stack/i],
  instructions: [/always/i, /never/i, /must/i, /should/i, /don't/i, /do not/i, /rule/i],
  history: [/yesterday/i, /last week/i, /previously/i, /earlier/i, /ago/i],
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Estimate token count for a string
 * Uses ~4 characters per token as a rough approximation
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Generate SHA-256 content hash for deduplication
 */
export function generateContentHash(content: string): string {
  if (!content) return '';
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a unique chunk ID
 */
function generateChunkId(): string {
  return `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detect the section type based on content
 */
function detectSectionType(content: string): string | undefined {
  for (const [sectionType, patterns] of Object.entries(SECTION_TYPE_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(content))) {
      return sectionType;
    }
  }
  return undefined;
}

/**
 * Parse markdown into structural blocks
 */
function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  if (!text) return [];

  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];
  let currentBlock: MarkdownBlock | null = null;
  let inCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockStartLine = 0;
  let listStartLine = -1;
  let currentListDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed

    // Handle code block boundaries
    const codeBlockMatch = line.match(/^```(\w*)?/);
    if (codeBlockMatch) {
      if (!inCodeBlock) {
        // Start of code block
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        inCodeBlock = true;
        codeBlockLanguage = codeBlockMatch[1] || '';
        codeBlockStartLine = lineNumber;
        currentBlock = {
          type: 'code',
          content: line,
          startLine: lineNumber,
          endLine: lineNumber,
          language: codeBlockLanguage,
        };
      } else {
        // End of code block
        if (currentBlock && currentBlock.type === 'code') {
          currentBlock.content += '\n' + line;
          currentBlock.endLine = lineNumber;
          blocks.push(currentBlock);
        }
        currentBlock = null;
        inCodeBlock = false;
        codeBlockLanguage = '';
      }
      continue;
    }

    // Inside code block - accumulate
    if (inCodeBlock && currentBlock) {
      currentBlock.content += '\n' + line;
      currentBlock.endLine = lineNumber;
      continue;
    }

    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      blocks.push({
        type: 'heading',
        content: line,
        startLine: lineNumber,
        endLine: lineNumber,
        level: headingMatch[1].length,
      });
      currentBlock = null;
      continue;
    }

    // Check for horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      blocks.push({
        type: 'hr',
        content: line,
        startLine: lineNumber,
        endLine: lineNumber,
      });
      currentBlock = null;
      continue;
    }

    // Check for list item
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const depth = Math.floor(indent / 2) + 1;

      // If starting a new list or continuing
      if (!currentBlock || currentBlock.type !== 'list') {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: 'list',
          content: line,
          startLine: lineNumber,
          endLine: lineNumber,
          listDepth: depth,
        };
      } else {
        // Continue existing list
        currentBlock.content += '\n' + line;
        currentBlock.endLine = lineNumber;
        currentBlock.listDepth = Math.max(currentBlock.listDepth || 1, depth);
      }
      continue;
    }

    // Check for blockquote
    if (line.match(/^>\s*/)) {
      if (!currentBlock || currentBlock.type !== 'blockquote') {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: 'blockquote',
          content: line,
          startLine: lineNumber,
          endLine: lineNumber,
        };
      } else {
        currentBlock.content += '\n' + line;
        currentBlock.endLine = lineNumber;
      }
      continue;
    }

    // Check for empty line
    if (line.trim() === '') {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      // Optionally track empty lines for formatting preservation
      continue;
    }

    // Regular paragraph
    if (!currentBlock || currentBlock.type !== 'paragraph') {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: 'paragraph',
        content: line,
        startLine: lineNumber,
        endLine: lineNumber,
      };
    } else {
      currentBlock.content += '\n' + line;
      currentBlock.endLine = lineNumber;
    }
  }

  // Don't forget the last block
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // Handle unclosed code block
  if (inCodeBlock && currentBlock) {
    // The code block was never closed - still add it
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Find function boundaries in code for smart splitting
 */
function findFunctionBoundaries(code: string): number[] {
  const boundaries: number[] = [];
  const lines = code.split('\n');

  // Common function patterns across languages
  const functionPatterns = [
    /^(export\s+)?(async\s+)?function\s+\w+/,           // JS/TS function
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,  // Arrow function assignment
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?function/,
    /^(public|private|protected)?\s*(async\s+)?\w+\s*\([^)]*\)\s*[:{]/,  // Class method
    /^def\s+\w+/,                                        // Python
    /^fn\s+\w+/,                                         // Rust
    /^func\s+\w+/,                                       // Go
    /^(pub\s+)?(async\s+)?fn\s+\w+/,                    // Rust with pub/async
    /^class\s+\w+/,                                      // Class definition
    /^interface\s+\w+/,                                  // Interface
    /^type\s+\w+/,                                       // Type alias
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (functionPatterns.some(pattern => pattern.test(line))) {
      boundaries.push(i);
    }
  }

  return boundaries;
}

/**
 * Split a large code block at function boundaries
 */
function splitCodeBlock(block: MarkdownBlock, maxTokens: number): MarkdownBlock[] {
  const tokens = estimateTokens(block.content);

  if (tokens <= maxTokens) {
    return [block];
  }

  const lines = block.content.split('\n');
  const boundaries = findFunctionBoundaries(block.content);

  // If no function boundaries found, split by lines
  if (boundaries.length <= 1) {
    return splitByLines(block, maxTokens);
  }

  const result: MarkdownBlock[] = [];
  let currentContent = '';
  let currentStartLine = block.startLine;
  let lastBoundary = 0;

  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    const segment = lines.slice(lastBoundary, boundary).join('\n');

    if (estimateTokens(currentContent + segment) > maxTokens && currentContent) {
      // Push current chunk
      result.push({
        type: 'code',
        content: currentContent,
        startLine: currentStartLine,
        endLine: currentStartLine + currentContent.split('\n').length - 1,
        language: block.language,
      });
      currentContent = '';
      currentStartLine = block.startLine + boundary;
    }

    currentContent += (currentContent ? '\n' : '') + segment;
    lastBoundary = boundary;
  }

  // Add remaining content
  const remaining = lines.slice(lastBoundary).join('\n');
  if (remaining) {
    currentContent += (currentContent ? '\n' : '') + remaining;
  }

  if (currentContent) {
    result.push({
      type: 'code',
      content: currentContent,
      startLine: currentStartLine,
      endLine: block.endLine,
      language: block.language,
    });
  }

  return result.length > 0 ? result : [block];
}

/**
 * Split a block by lines when no semantic boundaries exist
 */
function splitByLines(block: MarkdownBlock, maxTokens: number): MarkdownBlock[] {
  const lines = block.content.split('\n');
  const result: MarkdownBlock[] = [];
  let currentLines: string[] = [];
  let currentStartLine = block.startLine;

  for (let i = 0; i < lines.length; i++) {
    const testContent = [...currentLines, lines[i]].join('\n');

    if (estimateTokens(testContent) > maxTokens && currentLines.length > 0) {
      // Push current chunk
      result.push({
        type: block.type,
        content: currentLines.join('\n'),
        startLine: currentStartLine,
        endLine: currentStartLine + currentLines.length - 1,
        language: block.language,
        listDepth: block.listDepth,
      });
      currentLines = [lines[i]];
      currentStartLine = block.startLine + i;
    } else {
      currentLines.push(lines[i]);
    }
  }

  if (currentLines.length > 0) {
    result.push({
      type: block.type,
      content: currentLines.join('\n'),
      startLine: currentStartLine,
      endLine: block.endLine,
      language: block.language,
      listDepth: block.listDepth,
    });
  }

  return result;
}

/**
 * Get the current heading context from previous blocks
 */
function getCurrentHeading(blocks: MarkdownBlock[], currentIndex: number): string | undefined {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (blocks[i].type === 'heading') {
      return blocks[i].content.replace(/^#+\s*/, '');
    }
  }
  return undefined;
}

/**
 * Create overlap content from the end of previous chunk
 */
function createOverlapContent(content: string, overlapTokens: number): string {
  if (!content || overlapTokens <= 0) return '';

  const targetChars = overlapTokens * CHARS_PER_TOKEN;

  // Try to find a good break point (sentence, paragraph, or line)
  const breakPoints = [
    content.lastIndexOf('\n\n', targetChars),
    content.lastIndexOf('\n', targetChars),
    content.lastIndexOf('. ', targetChars),
    content.lastIndexOf('! ', targetChars),
    content.lastIndexOf('? ', targetChars),
  ].filter(p => p > 0);

  const breakPoint = Math.max(...breakPoints, 0);
  const startPoint = Math.max(content.length - targetChars, breakPoint);

  return content.slice(startPoint).trim();
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Chunk markdown text into semantically coherent pieces
 *
 * @param text - The markdown text to chunk
 * @param config - Configuration options
 * @returns Array of chunks with metadata
 */
export function chunkMarkdown(text: string, config?: ChunkConfig): Chunk[] {
  // Handle empty input
  if (!text || text.trim() === '') {
    return [];
  }

  const maxTokens = config?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlapTokens = config?.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  const preserveStructure = config?.preserveStructure ?? true;

  // Handle single line input
  const trimmedText = text.trim();
  if (!trimmedText.includes('\n') && estimateTokens(trimmedText) <= maxTokens) {
    return [{
      id: generateChunkId(),
      content: trimmedText,
      contentHash: generateContentHash(trimmedText),
      startLine: 1,
      endLine: 1,
      tokenCount: estimateTokens(trimmedText),
      metadata: {
        sectionType: detectSectionType(trimmedText),
      },
    }];
  }

  // Parse into blocks
  const blocks = parseMarkdownBlocks(text);

  if (blocks.length === 0) {
    return [];
  }

  // Handle large code blocks by splitting at function boundaries
  const processedBlocks: MarkdownBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'code' && estimateTokens(block.content) > maxTokens) {
      processedBlocks.push(...splitCodeBlock(block, maxTokens));
    } else {
      processedBlocks.push(block);
    }
  }

  // Group blocks into chunks
  const chunks: Chunk[] = [];
  let currentContent = '';
  let currentStartLine = 1;
  let currentEndLine = 1;
  let currentHeading: string | undefined;
  let currentIsCodeBlock = false;
  let previousChunkContent = '';

  for (let i = 0; i < processedBlocks.length; i++) {
    const block = processedBlocks[i];
    const blockTokens = estimateTokens(block.content);
    const currentTokens = estimateTokens(currentContent);

    // Update heading context
    if (block.type === 'heading') {
      currentHeading = block.content.replace(/^#+\s*/, '');
    }

    // Check if adding this block would exceed max tokens
    if (currentContent && (currentTokens + blockTokens > maxTokens)) {
      // Create chunk from accumulated content
      const chunkContent = currentContent.trim();

      chunks.push({
        id: generateChunkId(),
        content: chunkContent,
        contentHash: generateContentHash(chunkContent),
        startLine: currentStartLine,
        endLine: currentEndLine,
        tokenCount: estimateTokens(chunkContent),
        metadata: {
          heading: currentHeading,
          isCodeBlock: currentIsCodeBlock,
          sectionType: detectSectionType(chunkContent),
        },
      });

      // Add overlap from previous chunk to new chunk
      previousChunkContent = chunkContent;
      const overlap = createOverlapContent(previousChunkContent, overlapTokens);

      currentContent = overlap ? `${overlap}\n\n${block.content}` : block.content;
      currentStartLine = block.startLine;
      currentEndLine = block.endLine;
      currentIsCodeBlock = block.type === 'code';
    } else {
      // Accumulate block
      if (currentContent) {
        currentContent += '\n\n' + block.content;
      } else {
        currentContent = block.content;
        currentStartLine = block.startLine;
      }
      currentEndLine = block.endLine;

      // Track if this chunk contains code
      if (block.type === 'code') {
        currentIsCodeBlock = true;
      }
    }
  }

  // Don't forget the last chunk
  if (currentContent.trim()) {
    const chunkContent = currentContent.trim();
    chunks.push({
      id: generateChunkId(),
      content: chunkContent,
      contentHash: generateContentHash(chunkContent),
      startLine: currentStartLine,
      endLine: currentEndLine,
      tokenCount: estimateTokens(chunkContent),
      metadata: {
        heading: currentHeading,
        isCodeBlock: currentIsCodeBlock,
        sectionType: detectSectionType(chunkContent),
      },
    });
  }

  return chunks;
}

// ============================================================================
// Utility Functions for External Use
// ============================================================================

/**
 * Merge overlapping chunks (useful for deduplication)
 */
export function mergeOverlappingChunks(chunks: Chunk[]): Chunk[] {
  const hashMap = new Map<string, Chunk>();

  for (const chunk of chunks) {
    if (!hashMap.has(chunk.contentHash)) {
      hashMap.set(chunk.contentHash, chunk);
    }
  }

  return Array.from(hashMap.values());
}

/**
 * Validate chunk integrity
 */
export function validateChunk(chunk: Chunk): boolean {
  if (!chunk.id || !chunk.content || !chunk.contentHash) {
    return false;
  }

  // Verify hash matches content
  const expectedHash = generateContentHash(chunk.content);
  if (chunk.contentHash !== expectedHash) {
    return false;
  }

  // Verify token count
  const expectedTokens = estimateTokens(chunk.content);
  if (Math.abs(chunk.tokenCount - expectedTokens) > 1) {
    return false;
  }

  // Verify line numbers make sense
  if (chunk.endLine < chunk.startLine) {
    return false;
  }

  return true;
}

/**
 * Get chunk statistics
 */
export function getChunkStats(chunks: Chunk[]): {
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
  codeChunks: number;
  sectionTypes: Record<string, number>;
} {
  const stats = {
    totalChunks: chunks.length,
    totalTokens: 0,
    avgTokensPerChunk: 0,
    codeChunks: 0,
    sectionTypes: {} as Record<string, number>,
  };

  for (const chunk of chunks) {
    stats.totalTokens += chunk.tokenCount;

    if (chunk.metadata.isCodeBlock) {
      stats.codeChunks++;
    }

    const sectionType = chunk.metadata.sectionType || 'unknown';
    stats.sectionTypes[sectionType] = (stats.sectionTypes[sectionType] || 0) + 1;
  }

  stats.avgTokensPerChunk = chunks.length > 0
    ? Math.round(stats.totalTokens / chunks.length)
    : 0;

  return stats;
}

export default {
  chunkMarkdown,
  estimateTokens,
  generateContentHash,
  mergeOverlappingChunks,
  validateChunk,
  getChunkStats,
};
