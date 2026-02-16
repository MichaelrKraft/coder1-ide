/**
 * GET /api/johnny5/context/audit
 *
 * Context Optimization Audit endpoint.
 * Analyzes Johnny5's memory and context injection for token waste,
 * stale data, duplicates, and optimization opportunities.
 *
 * This is a read-only analysis endpoint -- it never modifies data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMemoryStats } from '@/lib/johnny5-db';
import { getLivingFilesTokenStats } from '@/lib/living-files';
import { getHighConfidencePatterns } from '@/services/memory/pattern-detection-service';
import { extractUserId } from '@/lib/auth/extract-user-id';

export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

interface LivingFileBreakdown {
  filename: string;
  tokens: number;
  stalePercent: number;
}

interface MemoryChunkBreakdown {
  totalChunks: number;
  totalTokens: number;
  staleChunks: number;
  duplicateChunks: number;
}

interface FactsBreakdown {
  total: number;
  stale: number;
  lowConfidence: number;
}

interface PatternsBreakdown {
  total: number;
  lowEvidence: number;
}

interface Optimization {
  type: 'archive_facts' | 'remove_duplicates' | 'trim_living_file' | 'prune_patterns' | 'general';
  title: string;
  description: string;
  estimatedTokenSavings: number;
  actionable: boolean;
  action?: { endpoint: string; payload: Record<string, unknown> };
}

interface ContextAuditResult {
  totalTokensInContext: number;
  breakdown: {
    livingFiles: LivingFileBreakdown[];
    memoryChunks: MemoryChunkBreakdown;
    facts: FactsBreakdown;
    patterns: PatternsBreakdown;
  };
  optimizations: Optimization[];
  totalPotentialSavings: number;
  healthScore: number;
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_SECONDS = 600; // 10 minutes
const GEMINI_TIMEOUT_MS = 30000;
const STALE_FACT_DAYS = 30;
const LOW_CONFIDENCE_THRESHOLD = 0.5;
const LOW_EVIDENCE_THRESHOLD = 2;
const OVERSIZED_LIVING_FILE_TOKENS = 2000;

// ============================================================================
// Gemini Integration (same pattern as self-audit)
// ============================================================================

let GoogleGenerativeAI: any = null;
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch {
  // Gemini not available
}

function getGeminiClient(): any | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !GoogleGenerativeAI) return null;
  return new GoogleGenerativeAI(apiKey);
}

// ============================================================================
// Rate Limiting
// ============================================================================

let lastAuditTime = 0;

function checkRateLimit(): { allowed: boolean; secondsRemaining: number } {
  const elapsed = (Date.now() - lastAuditTime) / 1000;
  if (elapsed < RATE_LIMIT_SECONDS) {
    return { allowed: false, secondsRemaining: Math.ceil(RATE_LIMIT_SECONDS - elapsed) };
  }
  return { allowed: true, secondsRemaining: 0 };
}

// ============================================================================
// Data Gathering
// ============================================================================

function getStaleAndLowConfidenceFacts(userId: string): { total: number; stale: number; lowConfidence: number; staleTokens: number; lowConfidenceTokens: number } {
  const db = getDb();
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM extracted_facts WHERE user_id = ?');
    const total = (totalStmt.get(userId) as { count: number }).count;

    const staleStmt = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(LENGTH(fact_value)), 0) as chars
      FROM extracted_facts
      WHERE user_id = ? AND created_at < datetime('now', '-${STALE_FACT_DAYS} days') AND reference_count = 0
    `);
    const staleRow = staleStmt.get(userId) as { count: number; chars: number };

    const lowConfStmt = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(LENGTH(fact_value)), 0) as chars
      FROM extracted_facts
      WHERE user_id = ? AND confidence < ?
    `);
    const lowConfRow = lowConfStmt.get(userId, LOW_CONFIDENCE_THRESHOLD) as { count: number; chars: number };

    return {
      total,
      stale: staleRow.count,
      lowConfidence: lowConfRow.count,
      staleTokens: Math.ceil(staleRow.chars / 4),
      lowConfidenceTokens: Math.ceil(lowConfRow.chars / 4),
    };
  } catch {
    return { total: 0, stale: 0, lowConfidence: 0, staleTokens: 0, lowConfidenceTokens: 0 };
  }
}

function getMemoryChunkAnalysis(userId: string): MemoryChunkBreakdown & { duplicateTokens: number; staleTokens: number } {
  const db = getDb();
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(token_count), 0) as tokens FROM memory_chunks WHERE user_id = ?');
    const totalRow = totalStmt.get(userId) as { count: number; tokens: number };

    // Duplicate chunks: same content_hash appearing more than once
    const dupStmt = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(token_count), 0) as tokens
      FROM memory_chunks
      WHERE user_id = ? AND content_hash IN (
        SELECT content_hash FROM memory_chunks WHERE user_id = ? GROUP BY content_hash HAVING COUNT(*) > 1
      )
    `);
    const dupRow = dupStmt.get(userId, userId) as { count: number; tokens: number };
    // Subtract one instance per hash (we only want the extras)
    const uniqueDupHashStmt = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT content_hash FROM memory_chunks WHERE user_id = ? GROUP BY content_hash HAVING COUNT(*) > 1
      )
    `);
    const uniqueDupCount = (uniqueDupHashStmt.get(userId) as { count: number }).count;
    const duplicateChunks = dupRow.count - uniqueDupCount; // extras only

    // Stale chunks: older than 30 days, never updated
    const staleStmt = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(token_count), 0) as tokens
      FROM memory_chunks
      WHERE user_id = ? AND updated_at < datetime('now', '-30 days')
    `);
    const staleRow = staleStmt.get(userId) as { count: number; tokens: number };

    return {
      totalChunks: totalRow.count,
      totalTokens: totalRow.tokens,
      staleChunks: staleRow.count,
      duplicateChunks: Math.max(0, duplicateChunks),
      duplicateTokens: Math.max(0, dupRow.tokens - (uniqueDupCount > 0 ? Math.ceil(dupRow.tokens / dupRow.count * uniqueDupCount) : 0)),
      staleTokens: staleRow.tokens,
    };
  } catch {
    return { totalChunks: 0, totalTokens: 0, staleChunks: 0, duplicateChunks: 0, duplicateTokens: 0, staleTokens: 0 };
  }
}

function getPatternsAnalysis(userId: string): PatternsBreakdown & { lowEvidenceTokens: number } {
  const db = getDb();
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM learned_patterns WHERE user_id = ?');
    const total = (totalStmt.get(userId) as { count: number }).count;

    const lowEvStmt = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(LENGTH(pattern_description)), 0) as chars
      FROM learned_patterns
      WHERE user_id = ? AND evidence_count < ?
    `);
    const lowEvRow = lowEvStmt.get(userId, LOW_EVIDENCE_THRESHOLD) as { count: number; chars: number };

    return {
      total,
      lowEvidence: lowEvRow.count,
      lowEvidenceTokens: Math.ceil(lowEvRow.chars / 4),
    };
  } catch {
    return { total: 0, lowEvidence: 0, lowEvidenceTokens: 0 };
  }
}

// ============================================================================
// Build Optimizations
// ============================================================================

function buildOptimizations(
  livingFiles: LivingFileBreakdown[],
  memoryChunks: MemoryChunkBreakdown & { duplicateTokens: number; staleTokens: number },
  facts: { stale: number; lowConfidence: number; staleTokens: number; lowConfidenceTokens: number },
  patterns: PatternsBreakdown & { lowEvidenceTokens: number },
): Optimization[] {
  const optimizations: Optimization[] = [];

  // Oversized living files
  for (const file of livingFiles) {
    if (file.tokens > OVERSIZED_LIVING_FILE_TOKENS) {
      const savings = file.tokens - OVERSIZED_LIVING_FILE_TOKENS;
      optimizations.push({
        type: 'trim_living_file',
        title: `Trim ${file.filename}`,
        description: `${file.filename} uses ${file.tokens} tokens (${savings} over the ${OVERSIZED_LIVING_FILE_TOKENS} token target). Consider archiving older entries.`,
        estimatedTokenSavings: savings,
        actionable: true,
        action: {
          endpoint: '/api/johnny5/self-audit/apply',
          payload: { type: 'update_living_file', filename: file.filename, action: 'trim' },
        },
      });
    }
  }

  // Stale facts
  if (facts.stale > 0) {
    optimizations.push({
      type: 'archive_facts',
      title: `Archive ${facts.stale} stale fact(s)`,
      description: `${facts.stale} fact(s) are older than ${STALE_FACT_DAYS} days and have never been referenced. Archiving them would save ~${facts.staleTokens} tokens.`,
      estimatedTokenSavings: facts.staleTokens,
      actionable: true,
      action: {
        endpoint: '/api/johnny5/self-audit/apply',
        payload: { type: 'archive_stale_facts', maxAgeDays: STALE_FACT_DAYS },
      },
    });
  }

  // Low-confidence facts
  if (facts.lowConfidence > 0) {
    optimizations.push({
      type: 'archive_facts',
      title: `Review ${facts.lowConfidence} low-confidence fact(s)`,
      description: `${facts.lowConfidence} fact(s) have confidence below ${LOW_CONFIDENCE_THRESHOLD}. Consider verifying or removing them to save ~${facts.lowConfidenceTokens} tokens.`,
      estimatedTokenSavings: facts.lowConfidenceTokens,
      actionable: false,
    });
  }

  // Duplicate memory chunks
  if (memoryChunks.duplicateChunks > 0) {
    optimizations.push({
      type: 'remove_duplicates',
      title: `Remove ${memoryChunks.duplicateChunks} duplicate memory chunk(s)`,
      description: `${memoryChunks.duplicateChunks} memory chunk(s) share the same content hash. Deduplicating would save ~${memoryChunks.duplicateTokens} tokens.`,
      estimatedTokenSavings: memoryChunks.duplicateTokens,
      actionable: true,
      action: {
        endpoint: '/api/johnny5/self-audit/apply',
        payload: { type: 'remove_duplicate_chunks' },
      },
    });
  }

  // Low-evidence patterns
  if (patterns.lowEvidence > 0) {
    optimizations.push({
      type: 'prune_patterns',
      title: `Prune ${patterns.lowEvidence} low-evidence pattern(s)`,
      description: `${patterns.lowEvidence} pattern(s) have fewer than ${LOW_EVIDENCE_THRESHOLD} evidence observations. Pruning would save ~${patterns.lowEvidenceTokens} tokens.`,
      estimatedTokenSavings: patterns.lowEvidenceTokens,
      actionable: true,
      action: {
        endpoint: '/api/johnny5/self-audit/apply',
        payload: { type: 'prune_low_evidence_patterns', minEvidence: LOW_EVIDENCE_THRESHOLD },
      },
    });
  }

  return optimizations;
}

// ============================================================================
// Health Score
// ============================================================================

function calculateHealthScore(
  livingFiles: LivingFileBreakdown[],
  memoryChunks: MemoryChunkBreakdown,
  facts: FactsBreakdown,
  patterns: PatternsBreakdown,
): number {
  let score = 100;

  // Deductions for oversized living files (up to -20)
  const oversizedCount = livingFiles.filter(f => f.tokens > OVERSIZED_LIVING_FILE_TOKENS).length;
  score -= Math.min(20, oversizedCount * 5);

  // Deductions for duplicate chunks (up to -15)
  if (memoryChunks.totalChunks > 0) {
    const dupRatio = memoryChunks.duplicateChunks / memoryChunks.totalChunks;
    score -= Math.min(15, Math.round(dupRatio * 30));
  }

  // Deductions for stale facts (up to -15)
  if (facts.total > 0) {
    const staleRatio = facts.stale / facts.total;
    score -= Math.min(15, Math.round(staleRatio * 25));
  }

  // Deductions for low-confidence facts (up to -10)
  if (facts.total > 0) {
    const lowConfRatio = facts.lowConfidence / facts.total;
    score -= Math.min(10, Math.round(lowConfRatio * 20));
  }

  // Deductions for stale memory chunks (up to -15)
  if (memoryChunks.totalChunks > 0) {
    const staleRatio = memoryChunks.staleChunks / memoryChunks.totalChunks;
    score -= Math.min(15, Math.round(staleRatio * 25));
  }

  // Deductions for low-evidence patterns (up to -10)
  if (patterns.total > 0) {
    const lowEvRatio = patterns.lowEvidence / patterns.total;
    score -= Math.min(10, Math.round(lowEvRatio * 20));
  }

  // Bonus for having data at all (up to +15)
  if (facts.total === 0 && memoryChunks.totalChunks === 0 && patterns.total === 0) {
    score = Math.min(score, 50); // Cap at 50 if no data exists
  }

  return Math.max(1, Math.min(100, score));
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = extractUserId(request);

    // Rate limiting
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      const minutes = Math.ceil(rateCheck.secondsRemaining / 60);
      return NextResponse.json(
        { error: `Context audit can only be run once every 10 minutes. Try again in ${minutes} minute(s).` },
        { status: 429 }
      );
    }

    // Record this audit time
    lastAuditTime = Date.now();

    // 1. Living files token stats
    const livingFileStats = getLivingFilesTokenStats();
    const livingFiles: LivingFileBreakdown[] = Object.entries(livingFileStats).map(([filename, stats]) => ({
      filename,
      tokens: stats.estimatedTokens,
      stalePercent: 0, // Living files don't have per-line staleness tracking
    }));

    // 2. Memory chunk analysis
    const memoryChunks = getMemoryChunkAnalysis(userId);

    // 3. Facts analysis
    const factsData = getStaleAndLowConfidenceFacts(userId);
    const facts: FactsBreakdown = {
      total: factsData.total,
      stale: factsData.stale,
      lowConfidence: factsData.lowConfidence,
    };

    // 4. Patterns analysis
    const patternsData = getPatternsAnalysis(userId);
    const patterns: PatternsBreakdown = {
      total: patternsData.total,
      lowEvidence: patternsData.lowEvidence,
    };

    // 5. Build optimizations
    const optimizations = buildOptimizations(livingFiles, memoryChunks, factsData, patternsData);

    // 6. Calculate totals
    const livingFilesTokenTotal = livingFiles.reduce((sum, f) => sum + f.tokens, 0);
    const totalTokensInContext = livingFilesTokenTotal + memoryChunks.totalTokens;
    const totalPotentialSavings = optimizations.reduce((sum, o) => sum + o.estimatedTokenSavings, 0);

    // 7. Health score
    const healthScore = calculateHealthScore(livingFiles, memoryChunks, facts, patterns);

    // 8. Optional Gemini-powered deeper insights
    const genAI = getGeminiClient();
    if (genAI && optimizations.length > 0) {
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        });

        const summaryText = optimizations.map(o => `- ${o.title}: ${o.description}`).join('\n');
        const prompt = `You are analyzing Johnny5's context efficiency. Given these optimization findings, provide ONE concise general recommendation (1-2 sentences) for improving overall context health.

Health score: ${healthScore}/100
Total tokens in context: ${totalTokensInContext}
Potential savings: ${totalPotentialSavings} tokens

Findings:
${summaryText}

Return ONLY a JSON object: { "recommendation": "your 1-2 sentence recommendation" }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.recommendation) {
            optimizations.push({
              type: 'general',
              title: 'AI Recommendation',
              description: parsed.recommendation,
              estimatedTokenSavings: 0,
              actionable: false,
            });
          }
        }
      } catch (geminiError) {
        console.error('[ContextAudit] Gemini analysis failed, continuing with statistics:', geminiError);
      }
    }

    // 9. Build response
    const result: ContextAuditResult = {
      totalTokensInContext,
      breakdown: {
        livingFiles,
        memoryChunks: {
          totalChunks: memoryChunks.totalChunks,
          totalTokens: memoryChunks.totalTokens,
          staleChunks: memoryChunks.staleChunks,
          duplicateChunks: memoryChunks.duplicateChunks,
        },
        facts,
        patterns,
      },
      optimizations,
      totalPotentialSavings,
      healthScore,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ContextAudit] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run context audit.' },
      { status: 500 }
    );
  }
}
