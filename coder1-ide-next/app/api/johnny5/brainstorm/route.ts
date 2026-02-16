/**
 * GET /api/johnny5/brainstorm
 *
 * "How Can I Help?" brainstorm endpoint.
 * Generates 10-20 personalized suggestions for how Johnny5 can help the user,
 * based on their profile, extracted facts, learned patterns, and installed skills.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, getProfile, getSkillRecords, getRecentFacts } from '@/lib/johnny5-db';
import { getHighConfidencePatterns } from '@/services/memory/pattern-detection-service';
import { extractUserId } from '@/lib/auth/extract-user-id';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

interface BrainstormSuggestion {
  id: string;
  category: 'productivity' | 'code_quality' | 'learning' | 'business' | 'monitoring' | 'automation' | 'communication';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  implementationType: 'skill' | 'cron_job' | 'workflow' | 'configuration' | 'habit';
  actionable: boolean;
  action?: {
    type: 'create_skill' | 'create_cron' | 'configure' | 'chat_command';
    payload: Record<string, unknown>;
  };
}

interface BrainstormResult {
  suggestions: BrainstormSuggestion[];
  totalSuggestions: number;
  basedOn: {
    profileComplete: boolean;
    factsCount: number;
    patternsCount: number;
    skillsCount: number;
  };
  generatedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_SECONDS = 900; // 15 minutes
const GEMINI_TIMEOUT_MS = 30000;

const VALID_CATEGORIES = new Set([
  'productivity', 'code_quality', 'learning', 'business',
  'monitoring', 'automation', 'communication',
]);
const VALID_IMPACTS = new Set(['high', 'medium', 'low']);
const VALID_IMPL_TYPES = new Set(['skill', 'cron_job', 'workflow', 'configuration', 'habit']);

// Token budget caps (character approximation: 1 token ~ 4 chars)
const TOKEN_BUDGETS = {
  profile: 1000 * 4,   // 4000 chars
  facts: 2000 * 4,     // 8000 chars
  patterns: 1000 * 4,  // 4000 chars
  skills: 500 * 4,     // 2000 chars
};

// ============================================================================
// Gemini Integration (same lazy-load pattern as self-audit)
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

async function loadProfile(userId: string): Promise<{ text: string; complete: boolean }> {
  try {
    const profile = await getProfile(userId);
    if (!profile) return { text: '', complete: false };

    const parts: string[] = [];
    if (profile.roles.length > 0) parts.push(`Roles: ${profile.roles.join(', ')}`);
    if (profile.platforms.length > 0) parts.push(`Platforms: ${profile.platforms.join(', ')}`);
    if (profile.projects.length > 0) parts.push(`Projects: ${profile.projects.join(', ')}`);
    if (profile.goals.length > 0) parts.push(`Goals: ${profile.goals.join(', ')}`);
    if (profile.proactivity_level) parts.push(`Proactivity: ${profile.proactivity_level}`);
    if (profile.preferences && Object.keys(profile.preferences).length > 0) {
      parts.push(`Preferences: ${JSON.stringify(profile.preferences)}`);
    }

    const complete = profile.roles.length > 0 && profile.goals.length > 0;
    return {
      text: parts.join('\n').slice(0, TOKEN_BUDGETS.profile),
      complete,
    };
  } catch {
    return { text: '', complete: false };
  }
}

function loadFacts(userId: string): { text: string; count: number } {
  try {
    const facts = getRecentFacts(userId, 720); // Last 30 days
    if (facts.length === 0) return { text: '', count: 0 };

    const text = facts
      .map(f => `[${f.fact_type}] ${f.fact_key}: ${f.fact_value}`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.facts);

    return { text, count: facts.length };
  } catch {
    return { text: '', count: 0 };
  }
}

async function loadPatterns(userId: string): Promise<{ text: string; count: number }> {
  try {
    const patterns = await getHighConfidencePatterns(0.5, 20, userId);
    if (patterns.length === 0) return { text: '', count: 0 };

    const text = patterns
      .map(p => `[${p.pattern_type}] ${p.pattern_description} (confidence: ${p.confidence})`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.patterns);

    return { text, count: patterns.length };
  } catch {
    return { text: '', count: 0 };
  }
}

function loadSkills(): { text: string; count: number } {
  try {
    const skills = getSkillRecords();
    if (skills.length === 0) return { text: '', count: 0 };

    const text = skills
      .map(s => `${s.name} (${s.source}, trigger: ${s.trigger_type}, used: ${s.usage_count}x)`)
      .join('\n')
      .slice(0, TOKEN_BUDGETS.skills);

    return { text, count: skills.length };
  } catch {
    return { text: '', count: 0 };
  }
}

function hasCronJobs(): boolean {
  const db = getDb();
  try {
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM cron_jobs WHERE enabled = 1`).get() as { cnt: number } | undefined;
    return (row?.cnt ?? 0) > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

function checkRateLimit(): { allowed: boolean; secondsRemaining: number } {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      SELECT created_at FROM self_improvement_log
      WHERE improvement_type = 'brainstorm_run'
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

function recordBrainstormRun(): void {
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO self_improvement_log (id, improvement_type, description, impact_score, applied, created_at)
      VALUES (?, 'brainstorm_run', 'Brainstorm suggestions generated', 0.5, 0, datetime('now'))
    `).run(randomUUID());
  } catch {
    // Non-critical
  }
}

// ============================================================================
// Fallback: Template-Based Suggestions
// ============================================================================

function buildFallbackSuggestions(
  profileComplete: boolean,
  factsCount: number,
  patternsCount: number,
  skillsCount: number,
  hasCrons: boolean,
  factsText: string,
): BrainstormSuggestion[] {
  const suggestions: BrainstormSuggestion[] = [];

  // Profile incomplete
  if (!profileComplete) {
    suggestions.push({
      id: randomUUID(),
      category: 'productivity',
      title: 'Complete your deep-dive interview',
      description: 'Run /interview so Johnny5 can learn about your roles, projects, goals, and preferences. This is the foundation for personalized help.',
      impact: 'high',
      implementationType: 'configuration',
      actionable: true,
      action: { type: 'chat_command', payload: { command: '/interview' } },
    });
  }

  // No skills installed
  if (skillsCount === 0) {
    suggestions.push({
      id: randomUUID(),
      category: 'automation',
      title: 'Install skills from ClawHub',
      description: 'Browse the skill marketplace to add automation capabilities like code review, deployment checks, or documentation generation.',
      impact: 'high',
      implementationType: 'skill',
      actionable: true,
      action: { type: 'chat_command', payload: { command: '/skills' } },
    });
  }

  // No cron jobs
  if (!hasCrons) {
    suggestions.push({
      id: randomUUID(),
      category: 'productivity',
      title: 'Set up a morning brief',
      description: 'Configure a daily morning brief that summarizes what happened overnight - git activity, deployments, alerts, and what Johnny5 learned about you.',
      impact: 'high',
      implementationType: 'cron_job',
      actionable: true,
      action: { type: 'create_cron', payload: { schedule: '0 9 * * 1-5', task: 'morning_brief' } },
    });
  }

  // Low pattern count
  if (patternsCount < 3) {
    suggestions.push({
      id: randomUUID(),
      category: 'learning',
      title: 'Use Johnny5 more to build intelligence',
      description: 'The more you chat and work with Johnny5, the more behavior patterns get detected. This enables proactive suggestions and automation.',
      impact: 'medium',
      implementationType: 'habit',
      actionable: false,
    });
  }

  // Check for pain points in facts
  const factsLower = factsText.toLowerCase();
  if (factsLower.includes('pain_point') || factsLower.includes('frustrat') || factsLower.includes('annoying')) {
    suggestions.push({
      id: randomUUID(),
      category: 'automation',
      title: 'Automate your pain points',
      description: 'Johnny5 detected frustration points in your workflow. Consider creating custom skills to automate repetitive or annoying tasks.',
      impact: 'high',
      implementationType: 'skill',
      actionable: true,
      action: { type: 'chat_command', payload: { command: '/create-skill' } },
    });
  }

  // Check for automation wishes
  if (factsLower.includes('automation_wish') || factsLower.includes('wish') || factsLower.includes('automate')) {
    suggestions.push({
      id: randomUUID(),
      category: 'automation',
      title: 'Build skills for your automation wishes',
      description: 'You\'ve mentioned wanting to automate certain tasks. Let Johnny5 help you create custom skills to handle them.',
      impact: 'high',
      implementationType: 'skill',
      actionable: true,
      action: { type: 'create_skill', payload: { source: 'brainstorm' } },
    });
  }

  // Generic useful suggestions
  suggestions.push(
    {
      id: randomUUID(),
      category: 'code_quality',
      title: 'Automated code review on git push',
      description: 'Create a skill that automatically reviews code changes when you push to a branch, checking for common issues and style violations.',
      impact: 'medium',
      implementationType: 'skill',
      actionable: true,
      action: { type: 'create_skill', payload: { name: 'Auto Code Review', trigger: 'event' } },
    },
    {
      id: randomUUID(),
      category: 'monitoring',
      title: 'Error log monitoring',
      description: 'Set up a cron job that scans your application logs for errors and alerts you with a summary and suggested fixes.',
      impact: 'medium',
      implementationType: 'cron_job',
      actionable: true,
      action: { type: 'create_cron', payload: { schedule: '*/30 * * * *', task: 'error_monitoring' } },
    },
    {
      id: randomUUID(),
      category: 'communication',
      title: 'PR summary generation',
      description: 'Have Johnny5 automatically generate clear PR descriptions from your commit history and changed files.',
      impact: 'medium',
      implementationType: 'skill',
      actionable: true,
      action: { type: 'create_skill', payload: { name: 'PR Summarizer', trigger: 'manual' } },
    },
    {
      id: randomUUID(),
      category: 'productivity',
      title: 'Run a self-audit',
      description: 'Let Johnny5 analyze its own performance and suggest improvements based on your recent interactions.',
      impact: 'low',
      implementationType: 'configuration',
      actionable: true,
      action: { type: 'chat_command', payload: { command: '/self-audit' } },
    },
  );

  // Sort by impact: high first, then medium, then low
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2));

  return suggestions;
}

// ============================================================================
// Gemini-Powered Brainstorm
// ============================================================================

async function runGeminiBrainstorm(
  profileText: string,
  factsText: string,
  patternsText: string,
  skillsText: string,
): Promise<BrainstormSuggestion[]> {
  const genAI = getGeminiClient();
  if (!genAI) throw new Error('Gemini not available');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  });

  const prompt = `You are Johnny5, an autonomous AI assistant. Based on everything you know about this user, brainstorm personalized ways you can help them.

## USER PROFILE
${profileText || 'No profile data yet.'}

## EXTRACTED FACTS
${factsText || 'No facts extracted yet.'}

## BEHAVIOR PATTERNS
${patternsText || 'No patterns detected yet.'}

## INSTALLED SKILLS (already have these)
${skillsText || 'No skills installed.'}

## INSTRUCTIONS
Generate 10-15 specific, personalized suggestions for how you can help this user. Each suggestion should be:
- Specific to THEIR situation (not generic)
- Something they probably haven't thought of
- Actionable (can be implemented as a skill, cron job, workflow, or config change)

Categories: productivity, code_quality, learning, business, monitoring, automation, communication

For each suggestion, return:
- category (one of the categories above)
- title (short, actionable title)
- description (1-2 sentences explaining what it does and why it helps)
- impact (high, medium, or low)
- implementationType (skill, cron_job, workflow, configuration, or habit)

Return ONLY a JSON array of objects. No other text.

Example format:
[
  {
    "category": "automation",
    "title": "Auto-deploy staging on PR merge",
    "description": "Automatically trigger a staging deployment when PRs are merged to develop branch, saving manual deployment steps.",
    "impact": "high",
    "implementationType": "skill"
  }
]`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const result = await model.generateContent(prompt);
    clearTimeout(timeoutId);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) throw new Error('Response is not an array');

    // Validate and normalize each suggestion
    return parsed
      .filter(item => item.title && item.description && item.category)
      .slice(0, 20)
      .map(item => ({
        id: randomUUID(),
        category: VALID_CATEGORIES.has(item.category as string)
          ? (item.category as BrainstormSuggestion['category'])
          : 'productivity',
        title: String(item.title).slice(0, 100),
        description: String(item.description).slice(0, 300),
        impact: VALID_IMPACTS.has(item.impact as string)
          ? (item.impact as BrainstormSuggestion['impact'])
          : 'medium',
        implementationType: VALID_IMPL_TYPES.has(item.implementationType as string)
          ? (item.implementationType as BrainstormSuggestion['implementationType'])
          : 'skill',
        actionable: true,
        action: {
          type: mapImplToActionType(item.implementationType as string),
          payload: { name: item.title, source: 'brainstorm' },
        },
      }));
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function mapImplToActionType(
  implType: string,
): 'create_skill' | 'create_cron' | 'configure' | 'chat_command' {
  switch (implType) {
    case 'cron_job': return 'create_cron';
    case 'configuration': return 'configure';
    case 'habit': return 'chat_command';
    default: return 'create_skill';
  }
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
        { error: `Brainstorm can only be run once every 15 minutes. Try again in ${minutes} minute(s).` },
        { status: 429 },
      );
    }

    // Load all user context in parallel
    const [profileData, factsData, patternsData, skillsData] = await Promise.all([
      loadProfile(userId),
      Promise.resolve(loadFacts(userId)),
      loadPatterns(userId),
      Promise.resolve(loadSkills()),
    ]);

    const hasCrons = hasCronJobs();

    // Record this brainstorm run
    recordBrainstormRun();

    const basedOn = {
      profileComplete: profileData.complete,
      factsCount: factsData.count,
      patternsCount: patternsData.count,
      skillsCount: skillsData.count,
    };

    // Try Gemini-powered brainstorm
    const genAI = getGeminiClient();
    if (genAI) {
      try {
        const suggestions = await runGeminiBrainstorm(
          profileData.text,
          factsData.text,
          patternsData.text,
          skillsData.text,
        );

        // Sort by impact: high first
        const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        suggestions.sort((a, b) => (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2));

        const result: BrainstormResult = {
          suggestions,
          totalSuggestions: suggestions.length,
          basedOn,
          generatedAt: new Date().toISOString(),
        };
        return NextResponse.json(result);
      } catch (geminiError) {
        console.error('[Brainstorm] Gemini error, falling back to templates:', geminiError);
      }
    }

    // Fallback: template-based suggestions
    const suggestions = buildFallbackSuggestions(
      profileData.complete,
      factsData.count,
      patternsData.count,
      skillsData.count,
      hasCrons,
      factsData.text,
    );

    const result: BrainstormResult = {
      suggestions,
      totalSuggestions: suggestions.length,
      basedOn,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Brainstorm] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate brainstorm suggestions.' },
      { status: 500 },
    );
  }
}
