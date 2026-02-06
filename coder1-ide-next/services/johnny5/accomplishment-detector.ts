/**
 * Johnny5 Accomplishment Detector
 *
 * Processes raw terminal activity events into meaningful accomplishments.
 * Groups related events, extracts user intent, and generates structured
 * summaries for the Morning Brief.
 *
 * CLIENT-SIDE service - runs in the browser, uses localStorage.
 */

import type { ActivityEvent, ActivityEventType } from './terminal-activity-collector';

// ============================================================================
// Types
// ============================================================================

export interface Accomplishment {
  id: string;
  title: string;
  description: string;
  category: 'build' | 'fix' | 'test' | 'deploy' | 'research' | 'refactor';
  /** Why the user was doing this (extracted from prompts) */
  intent?: string;
  /** Files involved */
  files: string[];
  /** Related git commits */
  commits: string[];
  /** Time span */
  startTime: Date;
  endTime: Date;
  /** Duration in minutes */
  duration: number;
  /** Number of underlying events */
  eventCount: number;
  /** Key metrics */
  metrics: {
    testsRun?: number;
    testsPassed?: number;
    testsFailed?: number;
    filesCreated?: number;
    filesModified?: number;
    commitsCount?: number;
  };
}

export interface WorkSession {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  events: ActivityEvent[];
  accomplishments: Accomplishment[];
  intent?: string;
  /** Branch name if detected */
  branch?: string;
}

export interface DailySummary {
  date: string;
  sessions: WorkSession[];
  accomplishments: Accomplishment[];
  totalDuration: number; // minutes
  totalCommits: number;
  totalFilesModified: number;
  totalTestsRun: number;
  /** Where the user left off */
  leftOff?: {
    description: string;
    branch?: string;
    lastFile?: string;
  };
}

// ============================================================================
// Accomplishment Detection Logic
// ============================================================================

/**
 * Group events into logical work sessions.
 * A new session starts when there's a gap of >15 minutes between events.
 */
function groupIntoSessions(events: ActivityEvent[]): WorkSession[] {
  if (events.length === 0) return [];

  const SESSION_GAP_MS = 15 * 60 * 1000; // 15 minutes
  const sessions: WorkSession[] = [];
  let currentEvents: ActivityEvent[] = [events[0]];

  for (let i = 1; i < events.length; i++) {
    const gap = events[i].timestamp.getTime() - events[i - 1].timestamp.getTime();
    if (gap > SESSION_GAP_MS) {
      // Start new session
      sessions.push(buildSession(currentEvents));
      currentEvents = [events[i]];
    } else {
      currentEvents.push(events[i]);
    }
  }

  // Don't forget the last session
  if (currentEvents.length > 0) {
    sessions.push(buildSession(currentEvents));
  }

  return sessions;
}

/**
 * Build a WorkSession from a group of events.
 */
function buildSession(events: ActivityEvent[]): WorkSession {
  const startTime = events[0].timestamp;
  const endTime = events[events.length - 1].timestamp;
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  // Extract intent from user prompts
  const userPrompts = events
    .filter(e => e.type === 'user_prompt')
    .map(e => e.data.text as string)
    .filter(Boolean);

  const intent = userPrompts.length > 0 ? userPrompts[0] : undefined;

  // Detect branch
  const branchEvents = events.filter(e => e.type === 'git_branch');
  const branch = branchEvents.length > 0
    ? (branchEvents[branchEvents.length - 1].data.branch as string)
    : undefined;

  // Detect accomplishments within this session
  const accomplishments = detectAccomplishments(events);

  return {
    id: `session-${startTime.getTime()}`,
    startTime,
    endTime,
    duration,
    events,
    accomplishments,
    intent,
    branch,
  };
}

/**
 * Detect accomplishments from a set of events.
 */
function detectAccomplishments(events: ActivityEvent[]): Accomplishment[] {
  const accomplishments: Accomplishment[] = [];

  // Collect all relevant events by type
  const commits = events.filter(e => e.type === 'git_commit');
  const pushes = events.filter(e => e.type === 'git_push');
  const prs = events.filter(e => e.type === 'git_pr');
  const testPasses = events.filter(e => e.type === 'test_pass');
  const testFails = events.filter(e => e.type === 'test_fail');
  const testRuns = events.filter(e => e.type === 'test_run');
  const buildSuccesses = events.filter(e => e.type === 'build_success');
  const buildFails = events.filter(e => e.type === 'build_fail');
  const fileCreates = events.filter(e => e.type === 'file_create');
  const fileModifies = events.filter(e => e.type === 'file_modify');
  const fileDeletes = events.filter(e => e.type === 'file_delete');
  const errors = events.filter(e => e.type === 'error_encountered');
  const userPrompts = events.filter(e => e.type === 'user_prompt');

  const allFiles = new Set<string>();
  [...fileCreates, ...fileModifies, ...fileDeletes].forEach(e => {
    if (e.data.path) allFiles.add(e.data.path as string);
  });

  const allCommitMessages = commits.map(c => c.data.message as string).filter(Boolean);

  // --- Pattern 1: Commits made → "Built/Fixed X" ---
  if (commits.length > 0) {
    const commitMessages = allCommitMessages;
    const title = commits.length === 1
      ? commitMessages[0] || 'Made a commit'
      : `${commits.length} commits`;

    // Determine category from commit messages
    const category = inferCategoryFromMessages(commitMessages, userPrompts);

    accomplishments.push({
      id: `acc-commits-${events[0].timestamp.getTime()}`,
      title,
      description: commits.length > 1
        ? commitMessages.slice(0, 3).join('; ')
        : commitMessages[0] || 'Code changes committed',
      category,
      intent: extractIntent(userPrompts),
      files: Array.from(allFiles).slice(0, 10),
      commits: allCommitMessages,
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
      duration: Math.round(
        (events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime()) / 60000
      ),
      eventCount: events.length,
      metrics: {
        commitsCount: commits.length,
        filesCreated: fileCreates.length,
        filesModified: fileModifies.length,
      },
    });
  }

  // --- Pattern 2: Tests passing → "Tests passing" ---
  if (testPasses.length > 0) {
    const totalPassed = testPasses.reduce((sum, e) => sum + ((e.data.count as number) || 0), 0);
    const totalFailed = testFails.reduce((sum, e) => sum + ((e.data.count as number) || 0), 0);

    accomplishments.push({
      id: `acc-tests-${events[0].timestamp.getTime()}`,
      title: totalFailed > 0
        ? `${totalPassed} tests passing, ${totalFailed} failing`
        : `All ${totalPassed} tests passing`,
      description: totalFailed === 0
        ? 'Full test suite passing'
        : `${totalPassed} passed, ${totalFailed} failed`,
      category: 'test',
      files: Array.from(allFiles).slice(0, 5),
      commits: [],
      startTime: testRuns[0]?.timestamp || events[0].timestamp,
      endTime: testPasses[testPasses.length - 1]?.timestamp || events[events.length - 1].timestamp,
      duration: 0,
      eventCount: testRuns.length + testPasses.length + testFails.length,
      metrics: {
        testsRun: testRuns.length,
        testsPassed: totalPassed,
        testsFailed: totalFailed,
      },
    });
  }

  // --- Pattern 3: Build succeeded ---
  if (buildSuccesses.length > 0) {
    accomplishments.push({
      id: `acc-build-${events[0].timestamp.getTime()}`,
      title: 'Build succeeded',
      description: `Project built successfully${buildFails.length > 0 ? ` after ${buildFails.length} failed attempt(s)` : ''}`,
      category: 'build',
      files: Array.from(allFiles).slice(0, 5),
      commits: [],
      startTime: events[0].timestamp,
      endTime: buildSuccesses[buildSuccesses.length - 1].timestamp,
      duration: 0,
      eventCount: buildSuccesses.length + buildFails.length,
      metrics: {},
    });
  }

  // --- Pattern 4: PR created → "Opened PR" ---
  if (prs.length > 0) {
    accomplishments.push({
      id: `acc-pr-${events[0].timestamp.getTime()}`,
      title: `Opened ${prs.length} PR${prs.length > 1 ? 's' : ''}`,
      description: prs.map(p => p.data.title || 'Pull request').join('; '),
      category: 'deploy',
      files: Array.from(allFiles).slice(0, 5),
      commits: allCommitMessages,
      startTime: prs[0].timestamp,
      endTime: prs[prs.length - 1].timestamp,
      duration: 0,
      eventCount: prs.length,
      metrics: {},
    });
  }

  // --- Pattern 5: Error → Fix → "Fixed X" ---
  if (errors.length > 0 && commits.length > 0) {
    const fixCommits = commits.filter(c => {
      const msg = (c.data.message as string || '').toLowerCase();
      return msg.includes('fix') || msg.includes('resolve') || msg.includes('bug');
    });

    if (fixCommits.length > 0) {
      // Already covered by commits accomplishment, but mark the category as 'fix'
      const existing = accomplishments.find(a => a.id.startsWith('acc-commits-'));
      if (existing) {
        existing.category = 'fix';
      }
    }
  }

  return accomplishments;
}

/**
 * Infer category from commit messages and user prompts.
 */
function inferCategoryFromMessages(
  commitMessages: string[],
  userPrompts: ActivityEvent[]
): Accomplishment['category'] {
  const allText = [
    ...commitMessages,
    ...userPrompts.map(p => p.data.text as string || ''),
  ].join(' ').toLowerCase();

  if (/\b(fix|bug|resolve|patch|hotfix)\b/.test(allText)) return 'fix';
  if (/\b(refactor|clean|reorganize|restructure)\b/.test(allText)) return 'refactor';
  if (/\b(test|spec|coverage)\b/.test(allText)) return 'test';
  if (/\b(deploy|release|publish|ship)\b/.test(allText)) return 'deploy';
  if (/\b(research|investigate|explore|analyze)\b/.test(allText)) return 'research';
  return 'build';
}

/**
 * Extract the primary user intent from prompt events.
 */
function extractIntent(userPrompts: ActivityEvent[]): string | undefined {
  if (userPrompts.length === 0) return undefined;

  // Use the first user prompt as the primary intent
  const firstPrompt = userPrompts[0].data.text as string;
  if (!firstPrompt) return undefined;

  // Truncate to reasonable length
  return firstPrompt.length > 200 ? firstPrompt.substring(0, 200) + '...' : firstPrompt;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process raw activity events into a daily summary.
 */
export function generateDailySummary(events: ActivityEvent[], date: string): DailySummary {
  // Sort events by timestamp
  const sorted = [...events].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Group into sessions
  const sessions = groupIntoSessions(sorted);

  // Collect all accomplishments
  const allAccomplishments = sessions.flatMap(s => s.accomplishments);

  // Calculate totals
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalCommits = sorted.filter(e => e.type === 'git_commit').length;
  const modifiedFiles = new Set<string>();
  sorted
    .filter(e => e.type === 'file_modify' || e.type === 'file_create')
    .forEach(e => {
      if (e.data.path) modifiedFiles.add(e.data.path as string);
    });
  const totalTestRuns = sorted.filter(e => e.type === 'test_run').length;

  // Determine where user left off (last session)
  let leftOff: DailySummary['leftOff'];
  if (sessions.length > 0) {
    const lastSession = sessions[sessions.length - 1];
    const lastFiles = lastSession.events
      .filter(e => e.type === 'file_modify' || e.type === 'file_create')
      .map(e => e.data.path as string)
      .filter(Boolean);

    leftOff = {
      description: lastSession.intent || 'Working on code',
      branch: lastSession.branch,
      lastFile: lastFiles[lastFiles.length - 1],
    };
  }

  return {
    date,
    sessions,
    accomplishments: allAccomplishments,
    totalDuration,
    totalCommits,
    totalFilesModified: modifiedFiles.size,
    totalTestsRun: totalTestRuns,
    leftOff,
  };
}

/**
 * Generate a natural language summary from accomplishments.
 */
export function generateSummaryText(summary: DailySummary): string {
  const { accomplishments, totalDuration, totalCommits, totalFilesModified, sessions } = summary;

  if (accomplishments.length === 0 && sessions.length === 0) {
    return 'No coding sessions recorded. Your next session will be tracked by Johnny5.';
  }

  if (accomplishments.length === 0) {
    const durationStr = totalDuration < 60
      ? `${totalDuration} minutes`
      : `${Math.round(totalDuration / 60 * 10) / 10} hours`;
    return `You had ${sessions.length} coding session${sessions.length > 1 ? 's' : ''} totaling ${durationStr}, but no major accomplishments were detected yet.`;
  }

  const parts: string[] = [];

  // Count by category
  const builds = accomplishments.filter(a => a.category === 'build');
  const fixes = accomplishments.filter(a => a.category === 'fix');
  const tests = accomplishments.filter(a => a.category === 'test');
  const deploys = accomplishments.filter(a => a.category === 'deploy');

  if (builds.length > 0) {
    parts.push(`built ${builds.length} feature${builds.length > 1 ? 's' : ''}`);
  }
  if (fixes.length > 0) {
    parts.push(`fixed ${fixes.length} issue${fixes.length > 1 ? 's' : ''}`);
  }
  if (tests.length > 0) {
    parts.push(`ran test suites`);
  }
  if (deploys.length > 0) {
    parts.push(`created ${deploys.length} PR${deploys.length > 1 ? 's' : ''}`);
  }

  const durationStr = totalDuration < 60
    ? `${totalDuration} minutes`
    : `${Math.round(totalDuration / 60 * 10) / 10} hours`;

  let text = `Yesterday you ${parts.join(', ')} across ${sessions.length} session${sessions.length > 1 ? 's' : ''} (${durationStr}).`;

  if (totalCommits > 0) {
    text += ` ${totalCommits} commit${totalCommits > 1 ? 's' : ''} made.`;
  }
  if (totalFilesModified > 0) {
    text += ` ${totalFilesModified} file${totalFilesModified > 1 ? 's' : ''} modified.`;
  }

  return text;
}

/**
 * Convert accomplishments to Johnny5 MorningBrief format.
 * Maps our Accomplishment type to the BriefItem type used by the existing UI.
 */
export function accomplishmentsToMorningBrief(summary: DailySummary): {
  builtOvernight: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
    action?: string;
    link?: string;
  }>;
  researchCompleted: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  needsAttention: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
    action?: string;
  }>;
  summary: string;
  leftOff: DailySummary['leftOff'];
} {
  const builtOvernight = summary.accomplishments
    .filter(a => a.category === 'build' || a.category === 'fix' || a.category === 'deploy')
    .map(a => ({
      id: a.id,
      title: a.title,
      description: a.description + (a.intent ? ` (Intent: ${a.intent})` : ''),
      priority: 'medium' as const,
      actionable: a.category === 'deploy',
      action: a.category === 'deploy' ? 'View PR' : undefined,
    }));

  const researchCompleted = summary.accomplishments
    .filter(a => a.category === 'research')
    .map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      priority: 'low' as const,
      actionable: false,
    }));

  const needsAttention: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
    action?: string;
  }> = [];

  // Add failed tests as attention items
  const testAccomplishments = summary.accomplishments.filter(a => a.category === 'test');
  for (const t of testAccomplishments) {
    if (t.metrics.testsFailed && t.metrics.testsFailed > 0) {
      needsAttention.push({
        id: `attn-${t.id}`,
        title: `${t.metrics.testsFailed} failing test${t.metrics.testsFailed > 1 ? 's' : ''}`,
        description: `${t.metrics.testsFailed} test${t.metrics.testsFailed > 1 ? 's' : ''} failed in the last session`,
        priority: 'high',
        actionable: true,
        action: 'Fix Tests',
      });
    }
  }

  // Add "where you left off" as attention item
  if (summary.leftOff) {
    needsAttention.push({
      id: 'attn-left-off',
      title: `Left off: ${summary.leftOff.description}`,
      description: [
        summary.leftOff.branch ? `Branch: ${summary.leftOff.branch}` : '',
        summary.leftOff.lastFile ? `Last file: ${summary.leftOff.lastFile}` : '',
      ].filter(Boolean).join(' | '),
      priority: 'medium',
      actionable: true,
      action: 'Continue',
    });
  }

  return {
    builtOvernight,
    researchCompleted,
    needsAttention,
    summary: generateSummaryText(summary),
    leftOff: summary.leftOff,
  };
}

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Get stored activity events from localStorage for a date range.
 * Compatible with the Terminal Activity Collector's storage format.
 */
export function getStoredActivityEvents(startDate: Date, endDate: Date): ActivityEvent[] {
  if (typeof window === 'undefined') return [];

  const events: ActivityEvent[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const key = `johnny5_activity_${current.toISOString().split('T')[0]}`;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      events.push(
        ...stored.map((e: Record<string, unknown>) => ({
          ...e,
          timestamp: new Date(e.timestamp as string),
        }))
      );
    } catch {
      // Skip corrupt entries
    }
    current.setDate(current.getDate() + 1);
  }

  // Filter to actual date range
  return events.filter(
    e => e.timestamp >= startDate && e.timestamp <= endDate
  );
}

/**
 * Generate a morning brief from stored activity data.
 * This is the main entry point called by the Morning Brief UI.
 */
export function generateMorningBriefFromActivity(sinceDate?: Date) {
  const now = new Date();
  const since = sinceDate || (() => {
    // Default: last 24 hours
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  })();

  const events = getStoredActivityEvents(since, now);
  const dateStr = now.toISOString().split('T')[0];
  const summary = generateDailySummary(events, dateStr);

  return accomplishmentsToMorningBrief(summary);
}

export default {
  generateDailySummary,
  generateSummaryText,
  accomplishmentsToMorningBrief,
  getStoredActivityEvents,
  generateMorningBriefFromActivity,
};
