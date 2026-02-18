/**
 * Self-Improvement Service for Johnny5
 *
 * Connects existing pattern detection and skill feedback infrastructure
 * into a working feedback loop. No new infrastructure — only wires up
 * functions that already exist.
 *
 * Enabled by: JOHNNY5_SELF_IMPROVEMENT=true
 *
 * Schedules:
 *   Every 6h:  runPatternDetectionCycle() for all active users
 *   Every 24h: processPendingSkillFeedback() for low-rated skills
 */

import { DATA_DIR } from '@/lib/data-paths';
import {
  getDb,
  insertSkillVersion,
  getLatestSkillVersion,
  markFeedbackApplied,
} from '@/lib/johnny5-db';
import { runPatternDetectionCycle } from '@/services/memory/pattern-detection-service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Re-entrancy guard — prevents two simultaneous feedback consumer runs
let feedbackIsRunning = false;

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Returns distinct user IDs active in the past N days.
 * Uses extracted_facts as the activity signal (populated by every conversation).
 * Falls back to ['default'] if no records found.
 */
function getActiveUserIds(daysBack: number = 30): string[] {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT DISTINCT user_id
      FROM extracted_facts
      WHERE created_at > datetime('now', '-' || ? || ' days')
        AND user_id IS NOT NULL
      LIMIT 20
    `).all(daysBack) as Array<{ user_id: string }>;
    const ids = rows.map(r => r.user_id).filter(Boolean);
    return ids.length > 0 ? ids : ['default'];
  } catch {
    return ['default'];
  }
}

/**
 * Runs runPatternDetectionCycle() for every recently active user.
 * Called every 6 hours by the scheduler.
 */
async function runPatternMaintenance(): Promise<void> {
  logger.info('[SelfImprovement] Running pattern maintenance cycle...');
  const userIds = getActiveUserIds(30);
  for (const userId of userIds) {
    try {
      const result = await runPatternDetectionCycle(userId);
      logger.info(`[SelfImprovement] Pattern cycle for user '${userId}':`, result);
    } catch (err) {
      logger.error(`[SelfImprovement] Pattern cycle failed for user '${userId}':`, err);
      // Continue with next user — one failure should not block others
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process unapplied skill_feedback entries with rating <= 2.
 * Uses Gemini to rewrite SKILL.md, records new version, marks feedback applied.
 * Safe to call at any time — re-entrancy guard prevents overlapping runs.
 */
export async function processPendingSkillFeedback(): Promise<void> {
  if (feedbackIsRunning) {
    logger.info('[SelfImprovement] Feedback consumer already running — skipping this trigger');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('[SelfImprovement] GEMINI_API_KEY not set — skipping skill feedback processing');
    return;
  }

  feedbackIsRunning = true;
  try {
    const db = getDb();
    const pendingFeedback = db.prepare(`
      SELECT id, skill_id, rating, feedback_text, execution_context, created_at
      FROM skill_feedback
      WHERE applied = 0
        AND rating IS NOT NULL
        AND rating <= 2
      ORDER BY created_at ASC
      LIMIT 5
    `).all() as Array<{
      id: string;
      skill_id: string;
      rating: number;
      feedback_text: string | null;
      execution_context: string | null;
      created_at: string;
    }>;

    if (pendingFeedback.length === 0) {
      logger.info('[SelfImprovement] No pending low-rated skill feedback to process');
      return;
    }

    logger.info(`[SelfImprovement] Processing ${pendingFeedback.length} low-rated feedback item(s)`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    });

    for (const feedback of pendingFeedback) {
      try {
        // 1. Load current SKILL.md from disk
        const skillMdPath = path.join(DATA_DIR, 'skills', feedback.skill_id, 'SKILL.md');
        let currentContent: string;
        try {
          currentContent = await fs.readFile(skillMdPath, 'utf-8');
        } catch {
          logger.warn(`[SelfImprovement] SKILL.md not found for '${feedback.skill_id}' — skipping`);
          continue;
        }

        // 2. Ask Gemini to improve the skill based on feedback
        const prompt = `You are improving an AI skill definition based on user feedback.

CURRENT SKILL.MD:
${currentContent}

USER FEEDBACK (rating: ${feedback.rating}/5):
${feedback.feedback_text || 'No text feedback provided'}

EXECUTION CONTEXT:
${feedback.execution_context?.substring(0, 500) || 'Not provided'}

Rewrite the SKILL.md to address the feedback. Keep the YAML frontmatter intact.
Output ONLY the complete updated SKILL.md content, nothing else.`;

        const result = await model.generateContent(prompt);
        const updatedContent = result.response.text().trim();

        // 3. Validate the response has meaningful content
        if (!updatedContent || updatedContent.length < 50) {
          logger.warn(`[SelfImprovement] Gemini returned insufficient content for '${feedback.skill_id}' — skipping`);
          continue;
        }

        // 4. Write improved SKILL.md to disk
        await fs.mkdir(path.dirname(skillMdPath), { recursive: true });
        await fs.writeFile(skillMdPath, updatedContent, 'utf-8');

        // 5. Record new skill version using existing DB function
        const nextVersion = getLatestSkillVersion(feedback.skill_id) + 1;
        insertSkillVersion({
          id: randomUUID(),
          skill_id: feedback.skill_id,
          version: nextVersion,
          skill_md_content: updatedContent,
          change_summary: `Auto-improved from ${feedback.rating}/5 rating feedback`,
          feedback_id: feedback.id,
        });

        // 6. Mark feedback as applied using existing DB function
        markFeedbackApplied(feedback.id);

        // 7. Log to self_improvement_log
        // improvement_type CHECK constraint: ('skill_learned','pattern_detected','feedback_received','behavior_adjusted')
        db.prepare(`
          INSERT INTO self_improvement_log (id, user_id, improvement_type, description, impact_score, applied, created_at)
          VALUES (?, 'default', 'skill_learned', ?, 0.7, 1, datetime('now'))
        `).run(
          randomUUID(),
          `Auto-improved skill '${feedback.skill_id}' from ${feedback.rating}/5 rating feedback`
        );

        logger.info(`[SelfImprovement] Skill '${feedback.skill_id}' improved to v${nextVersion} from ${feedback.rating}/5 rating`);
      } catch (err) {
        logger.error(`[SelfImprovement] Failed to process feedback '${feedback.id}':`, err);
        // Continue to next feedback item — do not abort the whole batch
      }
    }
  } finally {
    feedbackIsRunning = false;
  }
}

/**
 * Schedule background self-improvement tasks.
 * Returns a cleanup function that cancels all timers.
 * Call once from server.js after the Telegram bot connects.
 */
export function schedulePatternMaintenance(): () => void {
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const FIVE_MIN_MS = 5 * 60 * 1000;
  const TEN_MIN_MS = 10 * 60 * 1000;

  logger.info('[SelfImprovement] Scheduling background improvement cycles');

  // Pattern maintenance: first run after 5 min, then every 6h
  const initialPatternTimer = setTimeout(() => {
    runPatternMaintenance().catch(err =>
      logger.error('[SelfImprovement] Pattern maintenance error:', err)
    );
  }, FIVE_MIN_MS);
  const patternInterval = setInterval(() => {
    runPatternMaintenance().catch(err =>
      logger.error('[SelfImprovement] Pattern maintenance error:', err)
    );
  }, SIX_HOURS_MS);

  // Skill feedback consumer: first run after 10 min, then every 24h
  const initialFeedbackTimer = setTimeout(() => {
    processPendingSkillFeedback().catch(err =>
      logger.error('[SelfImprovement] Feedback consumer error:', err)
    );
  }, TEN_MIN_MS);
  const feedbackInterval = setInterval(() => {
    processPendingSkillFeedback().catch(err =>
      logger.error('[SelfImprovement] Feedback consumer error:', err)
    );
  }, TWENTY_FOUR_HOURS_MS);

  logger.info('[SelfImprovement] Pattern maintenance: every 6h (first run in 5min)');
  logger.info('[SelfImprovement] Skill feedback consumer: every 24h (first run in 10min)');

  return () => {
    clearTimeout(initialPatternTimer);
    clearTimeout(initialFeedbackTimer);
    clearInterval(patternInterval);
    clearInterval(feedbackInterval);
    logger.info('[SelfImprovement] Background improvement tasks cancelled');
  };
}
