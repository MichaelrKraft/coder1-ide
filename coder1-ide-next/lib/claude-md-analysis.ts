import type { ClaudeMdAnalysis } from '@/types/claude-md';

/**
 * Analyzes a CLAUDE.md content string and returns token/instruction metrics.
 */
export function analyzeClaudeMd(content: string): ClaudeMdAnalysis {
  const estimatedTokens = Math.ceil(content.length / 4);
  const lines = content.split('\n');
  const instructionCount = lines.filter(
    (l) => /^[-*•]\s/.test(l) || /^\d+\.\s/.test(l)
  ).length;

  return {
    estimatedTokens,
    tokenWarningLevel:
      estimatedTokens > 6000 ? 'error' : estimatedTokens > 4000 ? 'warning' : 'ok',
    instructionCount,
    instructionWarningLevel:
      instructionCount > 150 ? 'error' : instructionCount > 100 ? 'warning' : 'ok',
  };
}

/**
 * Computes a SHA-256 hex hash of the given content string using the Web Crypto API.
 * Only runs in browser environments (or Node.js 18+ with globalThis.crypto).
 */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
