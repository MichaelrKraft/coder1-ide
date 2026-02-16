/**
 * GET /api/johnny5/self-audit
 *
 * Self-improvement audit endpoint.
 * Analyzes Johnny5's recent performance across sessions, patterns, facts, and skills
 * to generate actionable self-improvement recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, getRecentMessagesAcrossSessions, getSkillRecords } from '@/lib/johnny5-db';
import { getHighConfidencePatterns } from '@/services/memory/pattern-detection-service';
import { extractUserId } from '@/lib/auth/extract-user-id';

// ============================================================================
// Types
// ============================================================================

interface AuditRecommendation {
  type: 'create_skill' | 'update_living_file' | 'adjust_pattern' | 'general';
  title: string;
  description: string;
  actionable: boolean;
  action?: { endpoint: string; payload: Record<string, unknown> };
}

interface AuditResult {
  summary: string;
  performanceScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: AuditRecommendation[];
  sessionsAnalyzed: number;
  patternsReviewed: number;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_MESSAGES_REQUIRED = 5;
const RATE_LIMIT_SECONDS = 3600; // 1 hour
const GEMINI_TIMEOUT_MS = 30000;

// Token budget caps (character approximation: 1 token ~ 4 chars)
const TOKEN_BUDGETS = {
  messages: 3000 * 4,  // 12000 chars
  summaries: 2000 * 4, //  8000 chars
  patterns: 1000 * 4,  //  4000 chars
  facts: 1000 * 4,     //  4000 chars
  skills: 1000 * 4,    //  4000 chars
};

// ============================================================================
// Gemini Integration
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
// Data Loading Helpers
// ============================================================================

function loadRecentMessages(limit: number, userId: string): string {
  const messages = getRecentMessagesAcrossSessions(limit, userId);
  if (messages.length === 0) return '';

  return messages
    .map(m => `[${m.role}] ${m.content.slice(0, 300)}`)
    .join('\n')
    .slice(0, TOKEN_BUDGETS.messages);
}

function loadSessionSummaries(limit: number): string {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      SELECT content, source_id, created_at
      FROM memory_chunks
      WHERE source_type = 'ide_session_summary'
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const summaries = stmt.all(limit) as Array<{ content: string; source_id: string; created_at: string }>;
    if (summaries.length === 0) return '';

    return summaries
      .map(s => `[${s.created_at}] ${s.content.slice(0, 500)}`)
      .join('\n---\n')
      .slice(0, TOKEN_BUDGETS.summaries);
  } catch {
    return '';
  }
}

async function loadPatterns(userId: string): Promise<string> {
  try {
    const patterns = await getHighConfidencePatterns(0.5, 20, userId);
    if (patterns.length === 0) return '';

    return patterns
      .map(p => `[${p.pattern_type}] ${p.pattern_description} (confidence: ${p.confidence}, evidence: ${p.evidence_count})`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.patterns);
  } catch {
    return '';
  }
}

function loadRecentFacts(userId: string): string {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      SELECT fact_type, fact_key, fact_value, confidence
      FROM extracted_facts
      WHERE user_id = ? AND created_at > datetime('now', '-7 days')
      ORDER BY confidence DESC
      LIMIT 30
    `);
    const facts = stmt.all(userId) as Array<{ fact_type: string; fact_key: string; fact_value: string; confidence: number }>;
    if (facts.length === 0) return '';

    return facts
      .map(f => `[${f.fact_type}] ${f.fact_key}: ${f.fact_value}`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.facts);
  } catch {
    return '';
  }
}

function loadSkills(): string {
  try {
    const skills = getSkillRecords();
    if (skills.length === 0) return '';

    return skills
      .map(s => `${s.name} (${s.source}, used: ${s.usage_count}x, success: ${s.success_count}/${s.usage_count})`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.skills);
  } catch {
    return '';
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

function checkRateLimit(userId: string): { allowed: boolean; secondsRemaining: number } {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      SELECT created_at FROM self_improvement_log
      WHERE improvement_type = 'feedback_received'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const last = stmt.get() as { created_at: string } | undefined;
    if (!last) return { allowed: true, secondsRemaining: 0 };

    const lastTime = new Date(last.created_at).getTime();
    const elapsed = (Date.now() - lastTime) / 1000;
    if (elapsed < RATE_LIMIT_SECONDS) {
      return { allowed: false, secondsRemaining: Math.ceil(RATE_LIMIT_SECONDS - elapsed) };
    }
    return { allowed: true, secondsRemaining: 0 };
  } catch {
    return { allowed: true, secondsRemaining: 0 };
  }
}

function recordAuditRun(userId: string): void {
  const db = getDb();
  try {
    const id = require('crypto').randomUUID();
    db.prepare(`
      INSERT INTO self_improvement_log (id, improvement_type, description, impact_score, applied, created_at)
      VALUES (?, 'feedback_received', 'Self-audit run', 0.5, 0, datetime('now'))
    `).run(id);
  } catch {
    // Non-critical
  }
}

// ============================================================================
// Statistics-Only Fallback
// ============================================================================

function buildStatisticsReport(
  messageCount: number,
  summaryCount: number,
  patternCount: number,
  factCount: number,
  skillCount: number
): AuditResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (messageCount > 20) strengths.push('Active conversation history with good volume');
  if (factCount > 10) strengths.push(`${factCount} facts extracted - memory is working`);
  if (skillCount > 0) strengths.push(`${skillCount} skills installed`);
  if (patternCount > 0) strengths.push(`${patternCount} behavior patterns detected`);

  if (messageCount < 10) weaknesses.push('Limited conversation history for analysis');
  if (factCount === 0) weaknesses.push('No facts extracted yet - memory is underutilized');
  if (skillCount === 0) weaknesses.push('No skills installed - consider adding automation');
  if (patternCount === 0) weaknesses.push('No patterns detected - need more usage data');

  const score = Math.min(10, Math.max(1, Math.round(
    (messageCount > 0 ? 2 : 0) +
    (factCount > 5 ? 2 : factCount > 0 ? 1 : 0) +
    (patternCount > 2 ? 2 : patternCount > 0 ? 1 : 0) +
    (skillCount > 0 ? 2 : 0) +
    (summaryCount > 3 ? 2 : summaryCount > 0 ? 1 : 0)
  )));

  return {
    summary: `Statistics-only audit (Gemini API not available). Analyzed ${messageCount} messages, ${summaryCount} session summaries, ${patternCount} patterns, ${factCount} facts, and ${skillCount} skills.`,
    performanceScore: score,
    strengths,
    weaknesses,
    recommendations: weaknesses.length > 0
      ? [{ type: 'general', title: 'Increase Usage', description: 'Use Johnny5 more frequently to build up data for a comprehensive AI-powered audit.', actionable: false }]
      : [],
    sessionsAnalyzed: summaryCount,
    patternsReviewed: patternCount,
  };
}

// ============================================================================
// Gemini Self-Reflection
// ============================================================================

async function runGeminiAudit(
  messagesText: string,
  summariesText: string,
  patternsText: string,
  factsText: string,
  skillsText: string,
  messageCount: number,
  summaryCount: number,
  patternCount: number
): Promise<AuditResult> {
  const genAI = getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini not available');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  });

  const prompt = `You are Johnny5's self-reflection engine. Analyze the data below and produce a self-improvement audit.

## RECENT MESSAGES (${messageCount} total)
${messagesText || 'No messages available.'}

## SESSION SUMMARIES
${summariesText || 'No summaries available.'}

## LEARNED PATTERNS
${patternsText || 'No patterns detected yet.'}

## EXTRACTED FACTS (last 7 days)
${factsText || 'No facts extracted recently.'}

## INSTALLED SKILLS
${skillsText || 'No skills installed.'}

## OUTPUT FORMAT
Return ONLY a JSON object with this structure:
{
  "summary": "Brief 1-2 sentence audit summary",
  "performanceScore": 7,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": [
    {
      "type": "create_skill",
      "title": "Create X Skill",
      "description": "Why and what it would do",
      "actionable": true
    },
    {
      "type": "update_living_file",
      "title": "Update MEMORY.md",
      "description": "Add learned insight about...",
      "actionable": true
    },
    {
      "type": "adjust_pattern",
      "title": "Boost pattern confidence",
      "description": "Pattern X has proven reliable",
      "actionable": true
    },
    {
      "type": "general",
      "title": "Suggestion Title",
      "description": "General improvement suggestion",
      "actionable": false
    }
  ]
}

Rules:
- performanceScore: 1-10 integer
- strengths/weaknesses: 2-5 items each
- recommendations: 2-6 items, mix of types
- Be honest and specific, not generic
- Only return the JSON object, no other text`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const result = await model.generateContent(prompt);
    clearTimeout(timeoutId);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Return raw text as a general recommendation
      return {
        summary: 'Audit completed but response format was unexpected.',
        performanceScore: 5,
        strengths: [],
        weaknesses: [],
        recommendations: [{
          type: 'general',
          title: 'Audit Analysis',
          description: text.slice(0, 500),
          actionable: false,
        }],
        sessionsAnalyzed: summaryCount,
        patternsReviewed: patternCount,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build actionable recommendations with API payloads
    const recommendations: AuditRecommendation[] = (parsed.recommendations || []).map((rec: any) => {
      const recommendation: AuditRecommendation = {
        type: rec.type || 'general',
        title: rec.title || 'Recommendation',
        description: rec.description || '',
        actionable: rec.actionable ?? false,
      };

      // Add action payloads for actionable items
      if (recommendation.actionable) {
        switch (recommendation.type) {
          case 'create_skill':
            recommendation.action = {
              endpoint: '/api/johnny5/skills',
              payload: {
                name: rec.title,
                description: rec.description,
                trigger: 'manual',
                createdBy: 'self_improvement',
              },
            };
            break;
          case 'update_living_file':
            recommendation.action = {
              endpoint: '/api/johnny5/self-audit/apply',
              payload: {
                type: 'update_living_file',
                filename: 'MEMORY.md',
                content: `\n## Self-Audit Insight (${new Date().toISOString().split('T')[0]})\n${rec.description}\n`,
              },
            };
            break;
          case 'adjust_pattern':
            recommendation.action = {
              endpoint: '/api/johnny5/self-audit/apply',
              payload: {
                type: 'adjust_pattern',
                action: 'boost',
                description: rec.description,
              },
            };
            break;
        }
      }

      return recommendation;
    });

    return {
      summary: parsed.summary || 'Audit completed.',
      performanceScore: Math.min(10, Math.max(1, parsed.performanceScore || 5)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 5) : [],
      recommendations,
      sessionsAnalyzed: summaryCount,
      patternsReviewed: patternCount,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = extractUserId(request);

    // Rate limiting
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      const minutes = Math.ceil(rateCheck.secondsRemaining / 60);
      return NextResponse.json(
        { error: `Self-audit can only be run once per hour. Try again in ${minutes} minute(s).` },
        { status: 429 }
      );
    }

    // Load data
    const messages = getRecentMessagesAcrossSessions(50, userId);
    if (messages.length < MIN_MESSAGES_REQUIRED) {
      return NextResponse.json({
        summary: `Not enough conversation data for a meaningful audit. I need at least ${MIN_MESSAGES_REQUIRED} messages to analyze, but only found ${messages.length}. Keep chatting and try again later!`,
        performanceScore: 0,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        sessionsAnalyzed: 0,
        patternsReviewed: 0,
      });
    }

    const messagesText = loadRecentMessages(50, userId);
    const summariesText = loadSessionSummaries(10);
    const patternsText = await loadPatterns(userId);
    const factsText = loadRecentFacts(userId);
    const skillsText = loadSkills();

    // Count items for statistics
    const summaryCount = (summariesText.match(/---/g) || []).length + (summariesText ? 1 : 0);
    const patternCount = (patternsText.match(/\n/g) || []).length + (patternsText ? 1 : 0);
    const factCount = (factsText.match(/\n/g) || []).length + (factsText ? 1 : 0);
    const skillCount = (skillsText.match(/\n/g) || []).length + (skillsText ? 1 : 0);

    // Record audit run
    recordAuditRun(userId);

    // Try Gemini-powered audit
    const genAI = getGeminiClient();
    if (!genAI) {
      const result = buildStatisticsReport(messages.length, summaryCount, patternCount, factCount, skillCount);
      return NextResponse.json(result);
    }

    try {
      const result = await runGeminiAudit(
        messagesText,
        summariesText,
        patternsText,
        factsText,
        skillsText,
        messages.length,
        summaryCount,
        patternCount
      );
      return NextResponse.json(result);
    } catch (geminiError) {
      console.error('[SelfAudit] Gemini error, falling back to statistics:', geminiError);
      const result = buildStatisticsReport(messages.length, summaryCount, patternCount, factCount, skillCount);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('[SelfAudit] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run self-audit.' },
      { status: 500 }
    );
  }
}
