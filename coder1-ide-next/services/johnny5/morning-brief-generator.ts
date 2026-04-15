/**
 * @deprecated Replaced by the Morning Brief on Steroids system.
 * Use the /morning-brief-steroids skill instead.
 * Data pipeline: ~/.claude/skills/morning-brief-steroids/SKILL.md
 * Web output: public/morning-briefs/{date}.html (served at localhost:3001)
 * CLI output: /morning-brief command
 * This file is kept for reference only and will be removed in a future cleanup.
 */

/**
 * Johnny5 Morning Brief Generator Service
 *
 * Generates daily briefings from REAL data collected overnight.
 * Aggregates from task tracker, session tracker, and security tracker.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  Johnny5MorningBrief,
  Johnny5BriefItem,
  PhScoutBrief,
} from '@/types/johnny5';
import { getTasks, getTaskStats } from './task-tracker';
import { getSessionSummaries } from './session-tracker';
import { getAuditLog, getSecurityWarnings } from './security-tracker';
import { getUsageStats } from './usage-tracker';
import { getRecentFacts, getRecentPatterns } from '@/lib/johnny5-db';
import { getRecentSnapshots } from '@/lib/living-files';
// Scout service removed for beta simplification
const readLastScoutResult = (): null => null;

// Storage path
const DATA_DIR = path.join(process.cwd(), 'data', 'johnny5');
const BRIEFS_FILE = path.join(DATA_DIR, 'morning-briefs.json');

// In-memory cache
let briefsCache: Map<string, Johnny5MorningBrief> = new Map();
let cacheLoaded = false;

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Format date as YYYY-MM-DD key
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Load briefs from disk
 */
function loadBriefs(): Map<string, Johnny5MorningBrief> {
  if (cacheLoaded) {
    return briefsCache;
  }

  ensureDataDir();

  if (fs.existsSync(BRIEFS_FILE)) {
    try {
      const data = fs.readFileSync(BRIEFS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      briefsCache = new Map(Object.entries(parsed).map(([key, brief]: [string, any]) => [
        key,
        {
          ...brief,
          date: new Date(brief.date),
        } as Johnny5MorningBrief,
      ]));
    } catch (error) {
      console.error('[MorningBriefGenerator] Failed to load briefs:', error);
      briefsCache = new Map();
    }
  } else {
    briefsCache = new Map();
  }

  cacheLoaded = true;
  return briefsCache;
}

/**
 * Save briefs to disk
 */
function saveBriefs(): void {
  ensureDataDir();
  try {
    const obj = Object.fromEntries(briefsCache);
    // Keep only last 30 days
    const keys = Object.keys(obj).sort().slice(-30);
    const toSave: Record<string, Johnny5MorningBrief> = {};
    for (const key of keys) {
      toSave[key] = obj[key];
    }
    fs.writeFileSync(BRIEFS_FILE, JSON.stringify(toSave, null, 2));
  } catch (error) {
    console.error('[MorningBriefGenerator] Failed to save briefs:', error);
  }
}

/**
 * Generate morning brief from real data (async version)
 */
export async function generateMorningBrief(targetDate: Date, userId: string = 'default'): Promise<Johnny5MorningBrief> {
  const dateKey = formatDateKey(targetDate);

  // Check cache first
  const briefs = loadBriefs();
  if (briefs.has(dateKey)) {
    return briefs.get(dateKey)!;
  }

  // Calculate overnight window (6 PM previous day to 6 AM target day)
  const overnightStart = new Date(targetDate);
  overnightStart.setDate(overnightStart.getDate() - 1);
  overnightStart.setHours(18, 0, 0, 0);

  const overnightEnd = new Date(targetDate);
  overnightEnd.setHours(6, 0, 0, 0);

  // Gather real data
  const builtOvernight: Johnny5BriefItem[] = [];
  const researchCompleted: Johnny5BriefItem[] = [];
  const trendsSpotted: Johnny5BriefItem[] = [];
  const needsAttention: Johnny5BriefItem[] = [];

  // Get completed tasks (async)
  let allTasks: any[] = [];
  try {
    allTasks = await getTasks({});
  } catch (error) {
    console.warn('[MorningBriefGenerator] Failed to fetch tasks:', error);
    allTasks = [];
  }

  const overnightTasks = allTasks.filter(task => {
    if (!task.completedAt) return false;
    const completedTime = new Date(task.completedAt).getTime();
    return completedTime >= overnightStart.getTime() && completedTime <= overnightEnd.getTime();
  });

  // Categorize tasks into brief sections
  for (const task of overnightTasks) {
    const briefItem: Johnny5BriefItem = {
      id: task.id,
      title: task.title,
      description: task.result?.summary || task.description,
      priority: task.priority === 'urgent' ? 'high' : task.priority,
      actionable: task.status === 'review' || !!task.result?.prUrl,
      action: task.result?.prUrl ? 'View PR' : task.status === 'review' ? 'Review' : undefined,
      link: task.result?.prUrl || task.result?.reportPath,
    };

    switch (task.type) {
      case 'build':
      case 'create_pr':
      case 'skill':
      case 'fix':
        builtOvernight.push(briefItem);
        break;
      case 'research':
        researchCompleted.push(briefItem);
        break;
      case 'trend':
      case 'monitor':
        trendsSpotted.push(briefItem);
        break;
    }
  }

  // Get tasks that need attention (queued high priority or failed)
  const attentionTasks = allTasks.filter(task =>
    (task.status === 'queued' && (task.priority === 'high' || task.priority === 'urgent')) ||
    task.status === 'failed' ||
    task.status === 'review'
  );

  for (const task of attentionTasks.slice(0, 5)) {
    needsAttention.push({
      id: task.id,
      title: task.status === 'failed' ? `Failed: ${task.title}` :
             task.status === 'review' ? `Ready for Review: ${task.title}` :
             `Queued: ${task.title}`,
      description: task.result?.error || task.description,
      priority: task.priority === 'urgent' ? 'high' : task.priority,
      actionable: true,
      action: task.status === 'failed' ? 'View Error' :
              task.status === 'review' ? 'Review' : 'Start Task',
      link: task.result?.prUrl,
    });
  }

  // Check for security warnings
  const securityWarnings = getSecurityWarnings();
  for (const warning of securityWarnings.slice(0, 2)) {
    needsAttention.push({
      id: `security-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: `Security Alert: ${warning.message}`,
      description: warning.description,
      priority: warning.severity === 'critical' ? 'high' : 'medium',
      actionable: true,
      action: 'View Alert',
    });
  }

  // Memory integration - recent facts
  let factItems: Johnny5BriefItem[] = [];
  try {
    const recentFacts = getRecentFacts(userId, 24);
    factItems = recentFacts
      .filter(f => f.confidence >= 0.8)
      .slice(0, 5)
      .map(f => ({
        id: `fact-${f.id}`,
        title: `Learned: ${f.fact_key}`,
        description: f.fact_value,
        priority: 'low' as const,
        actionable: false,
      }));
  } catch (err) {
    console.warn('[MorningBrief] Failed to load recent facts:', err);
  }

  // Memory integration - new patterns
  let patternItems: Johnny5BriefItem[] = [];
  try {
    const newPatterns = getRecentPatterns(userId, 24);
    patternItems = newPatterns
      .filter(p => p.confidence >= 0.7)
      .slice(0, 3)
      .map(p => ({
        id: `pattern-${p.id}`,
        title: `Pattern: ${p.pattern_description}`,
        description: p.suggested_action || 'No action suggested yet',
        priority: p.actionable ? 'medium' as const : 'low' as const,
        actionable: !!p.actionable,
      }));
  } catch (err) {
    console.warn('[MorningBrief] Failed to load recent patterns:', err);
  }

  // Memory integration - living file changes
  let changeItems: Johnny5BriefItem[] = [];
  try {
    const snapshots = getRecentSnapshots(24, userId);
    changeItems = snapshots
      .slice(0, 3)
      .map(s => ({
        id: `change-${s.filename}-${Date.now()}`,
        title: `Updated: ${s.filename}`,
        description: `${s.filename} was modified`,
        priority: 'low' as const,
        actionable: false,
      }));
  } catch (err) {
    console.warn('[MorningBrief] Failed to load recent snapshots:', err);
  }

  // Scout integration — add AI/dev news stories to trendsSpotted
  // Scout runs at 6:50 AM and saves results to disk; we read that file here.
  // Stories older than 25 hours are considered stale and skipped.
  let scoutStories: Johnny5BriefItem[] = [];
  let scoutNewsSection = '';
  try {
    const scoutResult = readLastScoutResult();
    if (scoutResult) {
      const ageMs = Date.now() - new Date(scoutResult.runAt).getTime();
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      if (ageMs <= twentyFiveHours) {
        scoutStories = scoutResult.stories.map((s, i) => ({
          id: `scout-${i}-${Date.now()}`,
          title: s.title,
          description: `${s.summary} — ${s.significance}`,
          priority: 'medium' as const,
          actionable: !!s.sourceUrl,
          action: s.sourceUrl ? 'Read More' : undefined,
          link: s.sourceUrl || undefined,
        }));
        trendsSpotted.push(...scoutStories);

        // Build a compact news section to append to the summary text
        const headlines = scoutResult.stories
          .slice(0, 5)
          .map((s, i) => `${i + 1}. ${s.title}`)
          .join('\n');
        scoutNewsSection = `\n\n📰 *Today's Top AI & Dev News:*\n${headlines}`;
        console.log(`[MorningBriefGenerator] Added ${scoutStories.length} Scout stories to brief`);
      } else {
        console.warn('[MorningBriefGenerator] Last Scout result is stale (>25h), skipping');
      }
    }
  } catch (err) {
    console.warn('[MorningBrief] Failed to load Scout results:', err);
  }

  // Generate summary
  const totalItems = builtOvernight.length + researchCompleted.length + trendsSpotted.length;
  let summary: string;

  if (totalItems === 0) {
    summary = `A quiet night with no scheduled tasks completed. Johnny5 monitored your projects and kept systems running smoothly.${scoutNewsSection}`;
  } else {
    const parts: string[] = [];
    if (builtOvernight.length > 0) {
      parts.push(`completed ${builtOvernight.length} build${builtOvernight.length > 1 ? 's' : ''}`);
    }
    if (researchCompleted.length > 0) {
      parts.push(`finished ${researchCompleted.length} research task${researchCompleted.length > 1 ? 's' : ''}`);
    }
    // Count only non-Scout trends (Scout stories are shown separately in scoutNewsSection)
    const nonScoutTrends = trendsSpotted.length - scoutStories.length;
    if (nonScoutTrends > 0) {
      parts.push(`spotted ${nonScoutTrends} trend${nonScoutTrends > 1 ? 's' : ''}`);
    }
    if (needsAttention.length > 0) {
      parts.push(`flagged ${needsAttention.length} item${needsAttention.length > 1 ? 's' : ''} needing attention`);
    }
    if (factItems.length > 0) {
      parts.push(`learned ${factItems.length} new fact${factItems.length > 1 ? 's' : ''}`);
    }
    if (patternItems.length > 0) {
      parts.push(`detected ${patternItems.length} pattern${patternItems.length > 1 ? 's' : ''}`);
    }
    summary = `While you were away, Johnny5 ${parts.join(', ')}. ${totalItems > 2 ? 'Overall, a productive night!' : ''}${scoutNewsSection}`;
  }

  // Get usage stats for the day
  const usageStats = getUsageStats(1);

  // PH Scout integration — read latest weekly gap analysis
  let phScout: PhScoutBrief | undefined;
  const phScoutPath = path.join(os.homedir(), 'ph-scout', 'data', 'latest.json');
  try {
    if (fs.existsSync(phScoutPath)) {
      const raw = fs.readFileSync(phScoutPath, 'utf-8');
      phScout = JSON.parse(raw) as PhScoutBrief;
      console.log(`[MorningBriefGenerator] Loaded PH Scout data for ${phScout.week}`);
    }
  } catch (err) {
    console.warn('[MorningBrief] Failed to load PH Scout data:', err);
  }

  // Create brief
  const brief: Johnny5MorningBrief = {
    id: `brief-${dateKey}`,
    date: targetDate,
    weather: {
      temperature: null,
      condition: null,
      location: 'Littleton, CO', // Could be made dynamic with weather API
    },
    summary,
    builtOvernight,
    researchCompleted,
    trendsSpotted,
    needsAttention,
    learnings: [...factItems, ...patternItems],
    livingFileChanges: changeItems,
    phScout,
    stats: {
      tokensUsed: usageStats.totalTokens,
      tasksCompleted: overnightTasks.filter(t => t.status === 'completed').length,
      sessionsActive: getSessionSummaries(10).length,
    },
  };

  // Cache and save
  briefsCache.set(dateKey, brief);
  setImmediate(() => saveBriefs());

  console.log('[MorningBriefGenerator] Generated brief:', {
    date: dateKey,
    built: builtOvernight.length,
    research: researchCompleted.length,
    trends: trendsSpotted.length,
    attention: needsAttention.length,
  });

  return brief;
}

/**
 * Get brief for a specific date (async)
 */
export async function getBrief(targetDate: Date): Promise<Johnny5MorningBrief> {
  return generateMorningBrief(targetDate);
}

/**
 * Get brief history (list of available briefs)
 * Returns minimal data for history selector (id, date, summary)
 * This is synchronous as it only reads from cache/file
 */
export function getBriefHistory(limit: number = 7): { id: string; date: string; summary: string }[] {
  const briefs = loadBriefs();
  const history: { id: string; date: string; summary: string }[] = [];

  // Get sorted keys (dates)
  const sortedKeys = Array.from(briefs.keys()).sort().reverse();

  for (const key of sortedKeys.slice(0, limit)) {
    const brief = briefs.get(key);
    if (brief) {
      history.push({
        id: brief.id,
        date: key,
        summary: brief.summary,
      });
    }
  }

  return history;
}

// Export singleton-style functions
export const MorningBriefGenerator = {
  generateMorningBrief,
  getBrief,
  getBriefHistory,
};

export default MorningBriefGenerator;
