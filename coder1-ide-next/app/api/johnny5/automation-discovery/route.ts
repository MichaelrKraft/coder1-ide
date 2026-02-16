/**
 * GET /api/johnny5/automation-discovery
 *
 * Automation Discovery Engine.
 * Analyzes user behavior patterns (messages, tasks, patterns) to identify
 * repetitive workflows that could be automated via cron jobs, skills, or workflows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, getRecentMessagesAcrossSessions, getSkillRecords, getRecentPatterns } from '@/lib/johnny5-db';
import { getHighConfidencePatterns } from '@/services/memory/pattern-detection-service';
import { extractUserId } from '@/lib/auth/extract-user-id';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

interface AutomationOpportunity {
  id: string;
  type: 'cron_job' | 'skill' | 'workflow';
  title: string;
  description: string;
  frequency: string;
  estimatedTimeSaved: string;
  confidence: number;
  evidence: string[];
  suggestedImplementation?: {
    cronExpression?: string;
    skillName?: string;
    steps?: string[];
  };
}

interface AutomationDiscoveryResult {
  opportunities: AutomationOpportunity[];
  totalOpportunities: number;
  analysisScope: {
    messagesAnalyzed: number;
    patternsReviewed: number;
    tasksReviewed: number;
    timeRange: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_SECONDS = 1800; // 30 minutes
const GEMINI_TIMEOUT_MS = 30000;
const MIN_MESSAGES_REQUIRED = 5;

// Token budget caps (character approximation: 1 token ~ 4 chars)
const TOKEN_BUDGETS = {
  messages: 3000 * 4,  // 12000 chars
  patterns: 1000 * 4,  //  4000 chars
  tasks: 1000 * 4,     //  4000 chars
  skills: 500 * 4,     //  2000 chars
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
// Rate Limiting
// ============================================================================

const lastRunTimestamps = new Map<string, number>();

function checkRateLimit(userId: string): { allowed: boolean; secondsRemaining: number } {
  const lastRun = lastRunTimestamps.get(userId);
  if (!lastRun) return { allowed: true, secondsRemaining: 0 };

  const elapsed = (Date.now() - lastRun) / 1000;
  if (elapsed < RATE_LIMIT_SECONDS) {
    return { allowed: false, secondsRemaining: Math.ceil(RATE_LIMIT_SECONDS - elapsed) };
  }
  return { allowed: true, secondsRemaining: 0 };
}

function recordRun(userId: string): void {
  lastRunTimestamps.set(userId, Date.now());
}

// ============================================================================
// Data Loading Helpers
// ============================================================================

function loadRecentMessages(limit: number, userId: string): { text: string; count: number } {
  const messages = getRecentMessagesAcrossSessions(limit, userId);
  if (messages.length === 0) return { text: '', count: 0 };

  const text = messages
    .map(m => `[${m.role}] ${m.content.slice(0, 300)}`)
    .join('\n')
    .slice(0, TOKEN_BUDGETS.messages);

  return { text, count: messages.length };
}

function loadRecentTasks(): { text: string; count: number } {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      SELECT title, type, status, created_at
      FROM tasks
      WHERE created_at > datetime('now', '-30 days')
      ORDER BY created_at DESC
      LIMIT 50
    `);
    const tasks = stmt.all() as Array<{ title: string; type: string; status: string; created_at: string }>;
    if (tasks.length === 0) return { text: '', count: 0 };

    const text = tasks
      .map(t => `[${t.type}/${t.status}] ${t.title} (${t.created_at})`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.tasks);

    return { text, count: tasks.length };
  } catch {
    return { text: '', count: 0 };
  }
}

async function loadPatterns(userId: string): Promise<{ text: string; count: number }> {
  try {
    const patterns = await getHighConfidencePatterns(0.3, 20, userId);
    if (patterns.length === 0) return { text: '', count: 0 };

    const text = patterns
      .map(p => `[${p.pattern_type}] ${p.pattern_description} (confidence: ${p.confidence}, evidence: ${p.evidence_count})`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.patterns);

    return { text, count: patterns.length };
  } catch {
    return { text: '', count: 0 };
  }
}

function loadExistingSkills(): { text: string; names: Set<string> } {
  try {
    const skills = getSkillRecords();
    const names = new Set(skills.map(s => s.name.toLowerCase()));
    if (skills.length === 0) return { text: '', names };

    const text = skills
      .map(s => `${s.name} (trigger: ${s.trigger_type}, used: ${s.usage_count}x)`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.skills);

    return { text, names };
  } catch {
    return { text: '', names: new Set() };
  }
}

// ============================================================================
// Heuristic Fallback (no Gemini)
// ============================================================================

function findRepeatedMessagePatterns(
  userId: string,
  existingSkillNames: Set<string>
): AutomationOpportunity[] {
  const opportunities: AutomationOpportunity[] = [];
  const messages = getRecentMessagesAcrossSessions(100, userId);
  const userMessages = messages.filter(m => m.role === 'user');

  if (userMessages.length < 3) return opportunities;

  // Group messages by similar content (simple prefix matching)
  const prefixGroups = new Map<string, string[]>();
  for (const msg of userMessages) {
    const content = msg.content.trim().toLowerCase();
    if (content.length < 5) continue;
    // Use first 30 chars as a rough prefix key
    const prefix = content.slice(0, 30);
    const group = prefixGroups.get(prefix) || [];
    group.push(msg.content);
    prefixGroups.set(prefix, group);
  }

  // Find groups with 3+ similar messages
  for (const [prefix, group] of prefixGroups) {
    if (group.length < 3) continue;

    const sampleContent = group[0].slice(0, 100);
    const skillName = `auto-${prefix.replace(/[^a-z0-9]/g, '-').slice(0, 20)}`;

    if (existingSkillNames.has(skillName.toLowerCase())) continue;

    opportunities.push({
      id: crypto.randomUUID(),
      type: 'skill',
      title: `Automate: "${sampleContent.slice(0, 50)}..."`,
      description: `You've sent similar messages ${group.length} times. This could be turned into a reusable skill.`,
      frequency: `${group.length}x in recent history`,
      estimatedTimeSaved: '~5 min per occurrence',
      confidence: Math.min(0.9, 0.3 + group.length * 0.1),
      evidence: group.slice(0, 3).map(g => g.slice(0, 80)),
      suggestedImplementation: {
        skillName,
        steps: ['Create skill from repeated pattern', 'Add trigger keyword', 'Test with sample input'],
      },
    });
  }

  // Detect command-like patterns (messages starting with common commands)
  const commandPatterns = new Map<string, number>();
  for (const msg of userMessages) {
    const content = msg.content.trim().toLowerCase();
    const commandMatch = content.match(/^(run|check|deploy|build|test|update|fix|show|list|get|create|delete|restart)\s/);
    if (commandMatch) {
      const verb = commandMatch[1];
      commandPatterns.set(verb, (commandPatterns.get(verb) || 0) + 1);
    }
  }

  for (const [verb, count] of commandPatterns) {
    if (count < 3) continue;

    opportunities.push({
      id: crypto.randomUUID(),
      type: 'workflow',
      title: `Workflow for "${verb}" commands`,
      description: `You frequently use "${verb}" commands (${count} times). A workflow could streamline these operations.`,
      frequency: `${count}x in recent history`,
      estimatedTimeSaved: '~2 min per occurrence',
      confidence: Math.min(0.8, 0.2 + count * 0.08),
      evidence: [`"${verb}" command used ${count} times`],
      suggestedImplementation: {
        steps: [`Create workflow for common "${verb}" operations`, 'Add parameter templates', 'Enable one-click execution'],
      },
    });
  }

  return opportunities;
}

function findRepeatedTaskPatterns(existingSkillNames: Set<string>): AutomationOpportunity[] {
  const opportunities: AutomationOpportunity[] = [];
  const db = getDb();

  try {
    const stmt = db.prepare(`
      SELECT title, type, COUNT(*) as cnt
      FROM tasks
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY title
      HAVING cnt >= 2
      ORDER BY cnt DESC
      LIMIT 5
    `);
    const repeatedTasks = stmt.all() as Array<{ title: string; type: string; cnt: number }>;

    for (const task of repeatedTasks) {
      const skillName = `auto-task-${task.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`;
      if (existingSkillNames.has(skillName.toLowerCase())) continue;

      opportunities.push({
        id: crypto.randomUUID(),
        type: 'cron_job',
        title: `Schedule: "${task.title}"`,
        description: `Task "${task.title}" has been created ${task.cnt} times. Consider scheduling it as a cron job.`,
        frequency: `${task.cnt}x in last 30 days`,
        estimatedTimeSaved: '~10 min per occurrence',
        confidence: Math.min(0.85, 0.3 + task.cnt * 0.1),
        evidence: [`Task "${task.title}" created ${task.cnt} times in 30 days`],
        suggestedImplementation: {
          cronExpression: '0 9 * * 1-5', // Weekdays at 9am as default
          steps: ['Create cron job for recurring task', 'Set appropriate schedule', 'Add notification on completion'],
        },
      });
    }
  } catch {
    // tasks table may not exist or be empty
  }

  return opportunities;
}

function findPatternBasedOpportunities(userId: string, existingSkillNames: Set<string>): AutomationOpportunity[] {
  const opportunities: AutomationOpportunity[] = [];

  try {
    const patterns = getRecentPatterns(userId, 720); // Last 30 days
    const actionable = patterns.filter(p => p.actionable === 1 && p.confidence >= 0.5);

    for (const pattern of actionable.slice(0, 5)) {
      const skillName = `pattern-${pattern.id.slice(0, 8)}`;
      if (existingSkillNames.has(skillName.toLowerCase())) continue;

      opportunities.push({
        id: crypto.randomUUID(),
        type: 'skill',
        title: `Pattern: ${pattern.pattern_description.slice(0, 60)}`,
        description: pattern.suggested_action || `Detected pattern could be automated: ${pattern.pattern_description}`,
        frequency: 'recurring',
        estimatedTimeSaved: '~5 min per occurrence',
        confidence: pattern.confidence,
        evidence: [pattern.pattern_description],
        suggestedImplementation: {
          skillName,
          steps: [pattern.suggested_action || 'Create skill from detected pattern'],
        },
      });
    }
  } catch {
    // patterns may not be available
  }

  return opportunities;
}

function buildFallbackResult(
  userId: string,
  messageCount: number,
  patternCount: number,
  taskCount: number,
  existingSkillNames: Set<string>
): AutomationDiscoveryResult {
  const messageOpportunities = findRepeatedMessagePatterns(userId, existingSkillNames);
  const taskOpportunities = findRepeatedTaskPatterns(existingSkillNames);
  const patternOpportunities = findPatternBasedOpportunities(userId, existingSkillNames);

  const allOpportunities = [...messageOpportunities, ...taskOpportunities, ...patternOpportunities]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);

  return {
    opportunities: allOpportunities,
    totalOpportunities: allOpportunities.length,
    analysisScope: {
      messagesAnalyzed: messageCount,
      patternsReviewed: patternCount,
      tasksReviewed: taskCount,
      timeRange: 'last 30 days',
    },
  };
}

// ============================================================================
// Gemini-Powered Analysis
// ============================================================================

async function runGeminiAnalysis(
  messagesText: string,
  patternsText: string,
  tasksText: string,
  skillsText: string,
  messageCount: number,
  patternCount: number,
  taskCount: number
): Promise<AutomationDiscoveryResult> {
  const genAI = getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini not available');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  });

  const prompt = `You are an automation advisor. Analyze this user activity data and identify repetitive workflows that could be automated.

## RECENT MESSAGES (user commands/requests)
${messagesText || 'No messages available.'}

## DETECTED PATTERNS
${patternsText || 'No patterns detected yet.'}

## RECENT TASKS
${tasksText || 'No tasks available.'}

## EXISTING SKILLS (don't suggest these)
${skillsText || 'No skills installed.'}

Identify 3-8 automation opportunities. For each, specify:
- What repetitive behavior you noticed
- How to automate it (cron_job, skill, or workflow)
- Estimated frequency and time savings
- Confidence level (0-1)

Return ONLY a JSON array of opportunities matching this structure:
[
  {
    "type": "cron_job" | "skill" | "workflow",
    "title": "Short title",
    "description": "What this automation would do",
    "frequency": "e.g., daily, 3x per week",
    "estimatedTimeSaved": "e.g., ~15 min/day",
    "confidence": 0.8,
    "evidence": ["pattern or message that led to this suggestion"],
    "suggestedImplementation": {
      "cronExpression": "0 9 * * *",
      "skillName": "optional-skill-name",
      "steps": ["step 1", "step 2"]
    }
  }
]

Rules:
- confidence: 0-1 float
- Only suggest automations NOT already covered by existing skills
- Be specific about the evidence
- Sort by confidence descending
- Return ONLY the JSON array, no other text`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const result = await model.generateContent(prompt);
    clearTimeout(timeoutId);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Gemini response did not contain a JSON array');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
    const validTypes = new Set(['cron_job', 'skill', 'workflow']);

    const opportunities: AutomationOpportunity[] = parsed
      .filter((item: Record<string, unknown>) => validTypes.has(item.type as string))
      .slice(0, 8)
      .map((item: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        type: item.type as 'cron_job' | 'skill' | 'workflow',
        title: (item.title as string) || 'Untitled Opportunity',
        description: (item.description as string) || '',
        frequency: (item.frequency as string) || 'unknown',
        estimatedTimeSaved: (item.estimatedTimeSaved as string) || 'unknown',
        confidence: Math.min(1, Math.max(0, (item.confidence as number) || 0.5)),
        evidence: Array.isArray(item.evidence) ? (item.evidence as string[]).slice(0, 5) : [],
        suggestedImplementation: item.suggestedImplementation as AutomationOpportunity['suggestedImplementation'],
      }));

    return {
      opportunities,
      totalOpportunities: opportunities.length,
      analysisScope: {
        messagesAnalyzed: messageCount,
        patternsReviewed: patternCount,
        tasksReviewed: taskCount,
        timeRange: 'last 30 days',
      },
    };
  } catch (error) {
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
        { error: `Automation discovery can only be run once per 30 minutes. Try again in ${minutes} minute(s).` },
        { status: 429 }
      );
    }

    // Load data
    const messages = getRecentMessagesAcrossSessions(100, userId);
    if (messages.length < MIN_MESSAGES_REQUIRED) {
      return NextResponse.json({
        opportunities: [],
        totalOpportunities: 0,
        analysisScope: {
          messagesAnalyzed: messages.length,
          patternsReviewed: 0,
          tasksReviewed: 0,
          timeRange: 'last 30 days',
        },
        message: `Not enough data for automation discovery. Need at least ${MIN_MESSAGES_REQUIRED} messages, found ${messages.length}. Keep using Johnny5 and try again later.`,
      });
    }

    const { text: messagesText, count: messageCount } = loadRecentMessages(100, userId);
    const { text: patternsText, count: patternCount } = await loadPatterns(userId);
    const { text: tasksText, count: taskCount } = loadRecentTasks();
    const { text: skillsText, names: existingSkillNames } = loadExistingSkills();

    // Record the run
    recordRun(userId);

    // Try Gemini-powered analysis
    const genAI = getGeminiClient();
    if (!genAI) {
      console.log('[AutomationDiscovery] Gemini not available, using heuristic fallback');
      const result = buildFallbackResult(userId, messageCount, patternCount, taskCount, existingSkillNames);
      return NextResponse.json(result);
    }

    try {
      const result = await runGeminiAnalysis(
        messagesText,
        patternsText,
        tasksText,
        skillsText,
        messageCount,
        patternCount,
        taskCount
      );
      return NextResponse.json(result);
    } catch (geminiError) {
      console.error('[AutomationDiscovery] Gemini error, falling back to heuristics:', geminiError);
      const result = buildFallbackResult(userId, messageCount, patternCount, taskCount, existingSkillNames);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('[AutomationDiscovery] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run automation discovery.' },
      { status: 500 }
    );
  }
}
