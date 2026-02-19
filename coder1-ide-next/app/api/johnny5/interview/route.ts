/**
 * GET /api/johnny5/interview  - Interview status & completeness score
 * POST /api/johnny5/interview - Multi-turn conversational interview endpoint
 *
 * Supports three modes:
 *   - 'full'      (default) : 10-question deep-dive to build a rich profile
 *   - 'refresh'   : Re-interview with existing facts loaded as context
 *   - 'deep_dive' : 5 topic-specific questions (predefined or Gemini-generated)
 *
 * Flow (POST):
 * 1. No sessionId -> check for active session, if none start new -> return first question
 * 2. sessionId + answer -> extract facts via Gemini Flash -> generate next question -> return
 * 3. After last Q -> write to USER.md + update profile -> return isComplete with summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/johnny5-db';
import { saveProfile, getProfile } from '@/lib/johnny5-db';
import { saveFacts, type ExtractedFact } from '@/services/memory/fact-extraction-service';
import { getExistingFacts } from '@/services/memory/fact-extraction-service';
import { appendToLivingFile } from '@/lib/living-files';
import { extractUserId } from '@/lib/auth/extract-user-id';

// ============================================================================
// Constants
// ============================================================================

const INTERVIEW_QUESTIONS: string[] = [
  "What's your name and what do you do?",
  "What are you building right now?",
  "What does a typical workday look like for you?",
  "What tools and platforms do you use daily?",
  "What are the biggest pain points in your workflow?",
  "What are your top 3 priorities this month?",
  "Do you work solo or with a team? How do you collaborate?",
  "How do you prefer to receive updates from AI tools?",
  "What tasks do you wish you could automate?",
  "Anything else I should know about you?",
];

const TOTAL_QUESTIONS = INTERVIEW_QUESTIONS.length;
const SESSION_EXPIRY_HOURS = 2;
const MAX_ANSWER_LENGTH = 2000;

/** Key fact keys that indicate a thorough core interview */
const KEY_FACT_KEYS = [
  'user_name',
  'user_role',
  'current_project',
  'daily_tools',
  'workflow_pain_points',
  'monthly_priorities',
  'update_preference',
  'automation_wishes',
];

// ============================================================================
// Deep Dive Topics
// ============================================================================

const DEEP_DIVE_TOPICS: Record<string, string[]> = {
  workflow: [
    'Walk me through your morning routine when you start working.',
    'What does your development/creative process look like from idea to deployment?',
    'How do you handle interruptions and context-switching during deep work?',
    'What does your code review or quality assurance process look like?',
    'How do you track progress on long-running projects?',
  ],
  goals: [
    'What is the single most important thing you want to accomplish this quarter?',
    'What skills are you actively trying to develop or improve?',
    'Where do you see your career or business in one year?',
    'What milestones would make this month feel like a success?',
    'What is holding you back from achieving your biggest goal right now?',
  ],
  technical: [
    'What is your primary tech stack and why did you choose it?',
    'What development environment setup do you use (IDE, terminal, OS)?',
    'How do you handle testing, CI/CD, and deployments?',
    'What technical debt or infrastructure issues are you dealing with?',
    'What new technologies or tools are you evaluating or excited about?',
  ],
  business: [
    'Who are your customers or target users?',
    'What is your current business model or revenue strategy?',
    'What are the biggest risks to your project or business right now?',
    'How do you handle marketing, growth, or user acquisition?',
    'What partnerships, integrations, or collaborations are you pursuing?',
  ],
};

const DEEP_DIVE_QUESTION_COUNT = 5;

// ============================================================================
// Types
// ============================================================================

type InterviewMode = 'full' | 'refresh' | 'deep_dive';

interface InterviewSession {
  id: string;
  user_id: string;
  current_question: number;
  answers: string; // JSON string
  extracted_data: string; // JSON string
  follow_up_pending: number;
  created_at: string;
  expires_at: string;
}

interface SessionMeta {
  mode: InterviewMode;
  topic?: string;
  questionSet?: string[];
  existingFactsSummary?: string;
}

interface InterviewResponse {
  sessionId: string;
  question: string;
  questionNumber: number;
  totalQuestions: number;
  isComplete: boolean;
  mode?: InterviewMode;
  topic?: string;
  profileUpdates?: Record<string, string>;
}

interface InterviewStatus {
  hasCompletedInterview: boolean;
  lastInterviewDate: string | null;
  completenessScore: number;
  factsCaptured: number;
  suggestedDeepDives: string[];
  activeSession: {
    sessionId: string;
    questionNumber: number;
    totalQuestions: number;
    mode: InterviewMode;
    topic?: string;
  } | null;
}

// ============================================================================
// Gemini Integration (optional)
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

/**
 * Use Gemini Flash to extract facts from a single Q&A pair
 */
async function extractFactsFromAnswer(
  question: string,
  answer: string,
  questionIndex: number
): Promise<ExtractedFact[]> {
  const genAI = getGeminiClient();
  if (!genAI) return extractFactsWithRegex(question, answer, questionIndex);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });

    const prompt = `Extract facts from this interview answer. Return a JSON array of facts.

Question: "${question}"
Answer: "${answer}"

Return format:
[{"type": "personal"|"preference"|"project"|"technical"|"goal", "key": "snake_case_key", "value": "value", "confidence": 0.6-1.0}]

Only extract EXPLICIT facts. Return [] if nothing concrete. ONLY return JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedFact[];
    return parsed.filter(
      (f: ExtractedFact) =>
        f.type && f.key && f.value && f.confidence >= 0.6
    );
  } catch (err) {
    console.error('[Interview] Gemini extraction error:', err);
    return extractFactsWithRegex(question, answer, questionIndex);
  }
}

/**
 * Check if a follow-up question is needed using Gemini Flash
 */
async function checkForFollowUp(
  question: string,
  answer: string
): Promise<string | null> {
  const genAI = getGeminiClient();
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
    });

    const prompt = `Given this interview Q&A, should I ask a brief follow-up to clarify or dig deeper?

Question: "${question}"
Answer: "${answer}"

If yes, respond with ONLY the follow-up question text.
If no, respond with exactly: NO_FOLLOWUP`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text === 'NO_FOLLOWUP' || text.length < 5) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Generate deep-dive questions for a custom topic via Gemini Flash
 */
async function generateDeepDiveQuestions(topic: string): Promise<string[]> {
  const genAI = getGeminiClient();
  if (!genAI) {
    // Fallback: return generic exploratory questions
    return [
      `Tell me more about your experience with ${topic}.`,
      `What challenges have you faced with ${topic}?`,
      `What tools or approaches do you use for ${topic}?`,
      `What would you like to improve about ${topic}?`,
      `What are your goals related to ${topic}?`,
    ];
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
    });

    const prompt = `Generate exactly 5 interview questions for a deep-dive on the topic: "${topic}".
The questions should be conversational, specific, and help build a rich profile of the user's experience with this topic.
Return ONLY a JSON array of 5 question strings. No other text.

Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const questions = JSON.parse(jsonMatch[0]) as string[];
    if (!Array.isArray(questions) || questions.length < 5) throw new Error('Invalid question count');
    return questions.slice(0, 5);
  } catch (err) {
    console.error('[Interview] Deep dive question generation error:', err);
    return [
      `Tell me more about your experience with ${topic}.`,
      `What challenges have you faced with ${topic}?`,
      `What tools or approaches do you use for ${topic}?`,
      `What would you like to improve about ${topic}?`,
      `What are your goals related to ${topic}?`,
    ];
  }
}

/**
 * Regex-based fact extraction fallback (when no Gemini API key)
 */
function extractFactsWithRegex(
  question: string,
  answer: string,
  questionIndex: number
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const answerLower = answer.toLowerCase();

  // Q0: Name and role
  if (questionIndex === 0) {
    const nameMatch = answer.match(
      /(?:(?:my name is|i'm|i am|call me)\s+)([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i
    );
    if (nameMatch) {
      facts.push({ type: 'personal', key: 'user_name', value: nameMatch[1].trim(), confidence: 0.95 });
    }
    const roleMatch = answer.match(
      /(?:i(?:'m| am) an? |i work as an? )([a-z][a-z\s]{2,40}(?:developer|engineer|designer|founder|manager|analyst|scientist|architect|consultant|writer|artist)?)/i
    );
    if (roleMatch) {
      facts.push({ type: 'personal', key: 'user_role', value: roleMatch[1].trim(), confidence: 0.85 });
    }
  }

  // Q1: Current project
  if (questionIndex === 1 && answer.length > 5) {
    facts.push({ type: 'project', key: 'current_project', value: answer.slice(0, 200), confidence: 0.8 });
  }

  // Q3: Tools
  if (questionIndex === 3 && answer.length > 5) {
    facts.push({ type: 'technical', key: 'daily_tools', value: answer.slice(0, 200), confidence: 0.85 });
  }

  // Q4: Pain points
  if (questionIndex === 4 && answer.length > 5) {
    facts.push({ type: 'preference', key: 'workflow_pain_points', value: answer.slice(0, 200), confidence: 0.8 });
  }

  // Q5: Priorities
  if (questionIndex === 5 && answer.length > 5) {
    facts.push({ type: 'goal', key: 'monthly_priorities', value: answer.slice(0, 200), confidence: 0.85 });
  }

  // Q7: Update preference
  if (questionIndex === 7 && answer.length > 5) {
    facts.push({ type: 'preference', key: 'update_preference', value: answer.slice(0, 200), confidence: 0.85 });
  }

  // Q8: Automation wishes
  if (questionIndex === 8 && answer.length > 5) {
    facts.push({ type: 'goal', key: 'automation_wishes', value: answer.slice(0, 200), confidence: 0.8 });
  }

  return facts;
}

// ============================================================================
// Session Helpers
// ============================================================================

function getActiveSession(userId: string): InterviewSession | null {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT * FROM interview_sessions
    WHERE user_id = ? AND expires_at > ? AND current_question < ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return (stmt.get(userId, now, TOTAL_QUESTIONS) as InterviewSession) || null;
}

/**
 * Get an active session scoped to a specific mode. For deep_dive, also matches
 * on topic stored in extracted_data._meta. Falls back to any active session
 * for 'full' mode to maintain backwards compatibility.
 */
function getActiveSessionForMode(
  userId: string,
  mode: InterviewMode,
  topic?: string
): InterviewSession | null {
  const db = getDb();
  const now = new Date().toISOString();

  // Get all active (non-expired, non-complete) sessions, most recent first
  const sessions = db.prepare(`
    SELECT * FROM interview_sessions
    WHERE user_id = ? AND expires_at > ?
    ORDER BY created_at DESC
  `).all(userId, now) as InterviewSession[];

  for (const session of sessions) {
    const extractedData = JSON.parse(session.extracted_data || '{}');
    const meta: SessionMeta | undefined = extractedData._meta;

    if (!meta) {
      // Legacy session (no _meta) - only match for 'full' mode
      if (mode === 'full' && session.current_question < TOTAL_QUESTIONS) {
        return session;
      }
      continue;
    }

    // Check if session matches requested mode
    if (meta.mode !== mode) continue;

    // For deep_dive, also check topic match
    if (mode === 'deep_dive' && topic && meta.topic !== topic) continue;

    // Check if session is still in progress
    const totalQ = meta.questionSet ? meta.questionSet.length : TOTAL_QUESTIONS;
    if (session.current_question < totalQ) {
      return session;
    }
  }

  return null;
}

function getSessionById(sessionId: string): InterviewSession | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM interview_sessions WHERE id = ?').get(sessionId) as InterviewSession) || null;
}

function createInterviewSession(userId: string): InterviewSession {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO interview_sessions (id, user_id, current_question, answers, extracted_data, follow_up_pending, created_at, expires_at)
    VALUES (?, ?, 0, '{}', '{}', 0, ?, ?)
  `).run(id, userId, now, expiresAt);

  return {
    id,
    user_id: userId,
    current_question: 0,
    answers: '{}',
    extracted_data: '{}',
    follow_up_pending: 0,
    created_at: now,
    expires_at: expiresAt,
  };
}

/**
 * Create an interview session with mode/topic metadata and optional question set.
 * For 'refresh' mode, loads existing facts as context.
 */
async function createInterviewSessionWithMode(
  userId: string,
  mode: InterviewMode,
  topic?: string,
  questionSet?: string[]
): Promise<InterviewSession> {
  const session = createInterviewSession(userId);

  // Build _meta object
  const meta: SessionMeta = { mode };
  if (topic) meta.topic = topic;
  if (questionSet) meta.questionSet = questionSet;

  // For refresh mode, load existing facts as context summary
  if (mode === 'refresh') {
    try {
      const existingFacts = await getExistingFacts(undefined, 30, userId);
      if (existingFacts.length > 0) {
        const summary = existingFacts
          .map(f => `${f.fact_key}: ${f.fact_value}`)
          .join('; ');
        meta.existingFactsSummary = summary.slice(0, 1000);
      }
    } catch {
      // Non-critical: proceed without existing facts
    }
  }

  // Store _meta in extracted_data
  const extractedData: Record<string, unknown> = { _meta: meta };
  updateSession(session.id, { extracted_data: JSON.stringify(extractedData) });
  session.extracted_data = JSON.stringify(extractedData);

  return session;
}

function updateSession(
  sessionId: string,
  updates: { current_question?: number; answers?: string; extracted_data?: string; follow_up_pending?: number }
): void {
  const db = getDb();
  const parts: string[] = [];
  const values: unknown[] = [];

  if (updates.current_question !== undefined) {
    parts.push('current_question = ?');
    values.push(updates.current_question);
  }
  if (updates.answers !== undefined) {
    parts.push('answers = ?');
    values.push(updates.answers);
  }
  if (updates.extracted_data !== undefined) {
    parts.push('extracted_data = ?');
    values.push(updates.extracted_data);
  }
  if (updates.follow_up_pending !== undefined) {
    parts.push('follow_up_pending = ?');
    values.push(updates.follow_up_pending);
  }

  if (parts.length === 0) return;
  values.push(sessionId);

  db.prepare(`UPDATE interview_sessions SET ${parts.join(', ')} WHERE id = ?`).run(...values);
}

function cleanExpiredSessions(): void {
  const db = getDb();
  const now = new Date().toISOString();
  try {
    db.prepare('DELETE FROM interview_sessions WHERE expires_at < ?').run(now);
  } catch {
    // Non-critical
  }
}

// ============================================================================
// Session Meta Helpers
// ============================================================================

/**
 * Extract the _meta object from a session's extracted_data
 */
function getSessionMeta(session: InterviewSession): SessionMeta {
  try {
    const data = JSON.parse(session.extracted_data || '{}');
    return data._meta || { mode: 'full' };
  } catch {
    return { mode: 'full' };
  }
}

/**
 * Get the question set for a session based on its mode
 */
function getQuestionSetForSession(session: InterviewSession): string[] {
  const meta = getSessionMeta(session);
  if (meta.questionSet && meta.questionSet.length > 0) {
    return meta.questionSet;
  }
  return INTERVIEW_QUESTIONS;
}

/**
 * Get total question count for a session
 */
function getTotalQuestionsForSession(session: InterviewSession): number {
  return getQuestionSetForSession(session).length;
}

// ============================================================================
// Completeness Score
// ============================================================================

/**
 * Calculate a completeness score (0-100) based on interview progress.
 *
 * Scoring:
 *   - 10 points per core question answered (max 100 from full interview)
 *   - +5 bonus per completed deep dive (capped at +20)
 *   - -5 deduction per missing key fact (from KEY_FACT_KEYS)
 *   - Clamped to 0-100
 */
function calculateCompletenessScore(
  completedFullSessions: number,
  coreQuestionsAnswered: number,
  deepDivesCompleted: number,
  capturedFactKeys: string[]
): number {
  // Base: 10 points per core question answered (max 100)
  let score = Math.min(coreQuestionsAnswered * 10, 100);

  // Bonus: +5 per deep dive completed (max +20)
  score += Math.min(deepDivesCompleted * 5, 20);

  // Deduction: -5 per missing key fact
  const missingKeyFacts = KEY_FACT_KEYS.filter(k => !capturedFactKeys.includes(k));
  score -= missingKeyFacts.length * 5;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Completion Handler
// ============================================================================

async function handleInterviewComplete(
  session: InterviewSession,
  userId: string
): Promise<Record<string, string>> {
  const answers: Record<string, string> = JSON.parse(session.answers || '{}');
  const extractedData: Record<string, ExtractedFact[] | SessionMeta> = JSON.parse(session.extracted_data || '{}');
  const meta = getSessionMeta(session);
  const questionSet = getQuestionSetForSession(session);

  // Build USER.md section with appropriate header
  const dateStr = new Date().toISOString().split('T')[0];
  let header: string;
  if (meta.mode === 'deep_dive' && meta.topic) {
    header = `## Deep Dive: ${meta.topic} (${dateStr})`;
  } else if (meta.mode === 'refresh') {
    header = `## Re-Interview (${dateStr})`;
  } else {
    header = `## Deep-Dive Interview (${dateStr})`;
  }
  const lines: string[] = [`${header}\n`];

  const totalQ = questionSet.length;
  for (let i = 0; i < totalQ; i++) {
    const answerKey = `q${i}`;
    const answer = answers[answerKey];
    if (answer && answer.trim()) {
      lines.push(`**${questionSet[i]}**`);
      lines.push(answer.trim());
      lines.push('');
    }
  }

  // Write to USER.md
  const interviewContent = lines.join('\n');
  appendToLivingFile('USER.md', interviewContent, userId);

  // Aggregate extracted facts and save them (skip _meta key)
  const allFacts: ExtractedFact[] = [];
  for (const [key, factList] of Object.entries(extractedData)) {
    if (key === '_meta') continue;
    if (Array.isArray(factList)) {
      allFacts.push(...factList);
    }
  }

  if (allFacts.length > 0) {
    await saveFacts(session.id, allFacts, undefined, userId);
  }

  // Update profile with key fields
  const profileUpdates: Record<string, string> = {};
  const nameFactIdx = allFacts.findIndex(f => f.key === 'user_name');
  if (nameFactIdx >= 0) profileUpdates.name = allFacts[nameFactIdx].value;
  const roleFactIdx = allFacts.findIndex(f => f.key === 'user_role');
  if (roleFactIdx >= 0) profileUpdates.role = allFacts[roleFactIdx].value;

  // Update profile
  const profileData: Record<string, unknown> = {};
  const roles = allFacts.filter(f => f.key === 'user_role').map(f => f.value);
  const projects = allFacts.filter(f => f.type === 'project').map(f => f.value);
  const goals = allFacts.filter(f => f.type === 'goal').map(f => f.value);

  if (roles.length > 0) profileData.roles = roles;
  if (projects.length > 0) profileData.projects = projects;
  if (goals.length > 0) profileData.goals = goals;

  if (Object.keys(profileData).length > 0) {
    await saveProfile(profileData as any, userId);
  }

  // Mark session as complete by setting current_question beyond total
  updateSession(session.id, { current_question: totalQ });

  return profileUpdates;
}

// ============================================================================
// GET Handler - Interview Status
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = extractUserId(request);
    const db = getDb();

    // Check for completed full interview sessions
    const completedFullSessions = db.prepare(`
      SELECT COUNT(*) as count FROM interview_sessions
      WHERE user_id = ? AND current_question >= ?
    `).get(userId, TOTAL_QUESTIONS) as { count: number } | undefined;

    const hasCompletedInterview = (completedFullSessions?.count ?? 0) > 0;

    // Get last completed interview date
    const lastCompleted = db.prepare(`
      SELECT created_at FROM interview_sessions
      WHERE user_id = ? AND current_question >= ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, TOTAL_QUESTIONS) as { created_at: string } | undefined;

    const lastInterviewDate = lastCompleted?.created_at ?? null;

    // Count captured facts
    let factsCaptured = 0;
    let capturedFactKeys: string[] = [];
    try {
      const facts = await getExistingFacts(undefined, 200, userId);
      factsCaptured = facts.length;
      capturedFactKeys = facts.map(f => f.fact_key);
    } catch {
      // Non-critical
    }

    // Count completed deep dives
    let deepDivesCompleted = 0;
    const completedTopics: string[] = [];
    try {
      const allCompleted = db.prepare(`
        SELECT extracted_data FROM interview_sessions
        WHERE user_id = ? AND current_question > 0
        ORDER BY created_at DESC
      `).all(userId) as { extracted_data: string }[];

      for (const row of allCompleted) {
        try {
          const data = JSON.parse(row.extracted_data || '{}');
          const meta: SessionMeta | undefined = data._meta;
          if (meta?.mode === 'deep_dive' && meta.topic) {
            const totalQ = meta.questionSet ? meta.questionSet.length : DEEP_DIVE_QUESTION_COUNT;
            // Consider it completed if the session reached the last question
            deepDivesCompleted++;
            completedTopics.push(meta.topic);
          }
        } catch {
          // Skip malformed
        }
      }
    } catch {
      // Non-critical
    }

    // Count core questions answered across all full/refresh sessions
    let coreQuestionsAnswered = 0;
    try {
      const fullSessions = db.prepare(`
        SELECT answers, extracted_data FROM interview_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId) as { answers: string; extracted_data: string }[];

      const answeredQIndices = new Set<number>();
      for (const row of fullSessions) {
        try {
          const data = JSON.parse(row.extracted_data || '{}');
          const meta: SessionMeta | undefined = data._meta;
          // Only count full and refresh sessions for core questions
          if (meta && meta.mode === 'deep_dive') continue;

          const answers = JSON.parse(row.answers || '{}');
          for (let i = 0; i < TOTAL_QUESTIONS; i++) {
            if (answers[`q${i}`]) answeredQIndices.add(i);
          }
        } catch {
          // Skip malformed
        }
      }
      coreQuestionsAnswered = answeredQIndices.size;
    } catch {
      // Non-critical
    }

    // Calculate completeness score
    const completenessScore = calculateCompletenessScore(
      completedFullSessions?.count ?? 0,
      coreQuestionsAnswered,
      deepDivesCompleted,
      capturedFactKeys
    );

    // Suggest deep dives the user hasn't done yet
    const allTopics = Object.keys(DEEP_DIVE_TOPICS);
    const suggestedDeepDives = allTopics.filter(t => !completedTopics.includes(t));

    // Check for active session
    let activeSession: InterviewStatus['activeSession'] = null;
    const active = getActiveSession(userId);
    if (active) {
      const activeMeta = getSessionMeta(active);
      const totalQ = getTotalQuestionsForSession(active);
      if (active.current_question < totalQ) {
        activeSession = {
          sessionId: active.id,
          questionNumber: active.current_question + 1,
          totalQuestions: totalQ,
          mode: activeMeta.mode,
          topic: activeMeta.topic,
        };
      }
    }

    const status: InterviewStatus = {
      hasCompletedInterview,
      lastInterviewDate,
      completenessScore,
      factsCaptured,
      suggestedDeepDives,
      activeSession,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('[Interview] GET status error:', error);
    return NextResponse.json(
      { error: 'Failed to get interview status.' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = extractUserId(request);
    const body = await request.json().catch(() => ({}));
    const {
      sessionId,
      answer,
      mode: rawMode,
      topic,
    } = body as { sessionId?: string; answer?: string; mode?: string; topic?: string };

    // Validate and default mode
    const mode: InterviewMode =
      rawMode === 'refresh' || rawMode === 'deep_dive' ? rawMode : 'full';

    // Clean up expired sessions periodically
    cleanExpiredSessions();

    // Case 1: No sessionId - check for existing session or start new
    if (!sessionId) {
      // Check for active session matching this mode
      const existing = getActiveSessionForMode(userId, mode, topic);
      if (existing && mode !== 'refresh') {
        // Resume existing session (refresh always creates new)
        const questionSet = getQuestionSetForSession(existing);
        const totalQ = questionSet.length;
        const questionIndex = existing.current_question;
        const question = existing.follow_up_pending
          ? `(Follow-up) ${questionSet[questionIndex]}`
          : questionSet[questionIndex];
        const existingMeta = getSessionMeta(existing);

        return NextResponse.json({
          sessionId: existing.id,
          question,
          questionNumber: questionIndex + 1,
          totalQuestions: totalQ,
          isComplete: false,
          mode: existingMeta.mode,
          topic: existingMeta.topic,
        });
      }

      // Start new session based on mode
      let session: InterviewSession;
      let questionSet: string[];

      if (mode === 'deep_dive') {
        // Resolve question set for topic
        const normalizedTopic = (topic || '').trim().toLowerCase();
        if (normalizedTopic && DEEP_DIVE_TOPICS[normalizedTopic]) {
          questionSet = DEEP_DIVE_TOPICS[normalizedTopic];
        } else if (normalizedTopic) {
          // Custom topic - generate questions via Gemini
          questionSet = await generateDeepDiveQuestions(normalizedTopic);
        } else {
          return NextResponse.json(
            { error: 'Deep dive mode requires a topic. Available: ' + Object.keys(DEEP_DIVE_TOPICS).join(', ') },
            { status: 400 }
          );
        }
        session = await createInterviewSessionWithMode(userId, 'deep_dive', normalizedTopic, questionSet);
      } else if (mode === 'refresh') {
        questionSet = INTERVIEW_QUESTIONS;
        session = await createInterviewSessionWithMode(userId, 'refresh');
      } else {
        questionSet = INTERVIEW_QUESTIONS;
        session = await createInterviewSessionWithMode(userId, 'full');
      }

      // For refresh mode, add context note to first question
      const meta = getSessionMeta(session);
      let firstQuestion = questionSet[0];
      if (mode === 'refresh' && meta.existingFactsSummary) {
        firstQuestion = `(Re-interview: I already know some things about you. Feel free to update or confirm.) ${firstQuestion}`;
      }

      return NextResponse.json({
        sessionId: session.id,
        question: firstQuestion,
        questionNumber: 1,
        totalQuestions: questionSet.length,
        isComplete: false,
        mode,
        topic: mode === 'deep_dive' ? (topic || '').trim().toLowerCase() : undefined,
      });
    }

    // Case 2: sessionId + answer - process answer
    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Interview session not found or expired. Start a new interview with /interview.' },
        { status: 404 }
      );
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Interview session expired. Start a new interview with /interview.' },
        { status: 410 }
      );
    }

    // Verify ownership
    if (session.user_id !== userId) {
      return NextResponse.json(
        { error: 'Session does not belong to this user.' },
        { status: 403 }
      );
    }

    const sessionMeta = getSessionMeta(session);
    const questionSet = getQuestionSetForSession(session);
    const totalQ = questionSet.length;
    const currentQ = session.current_question;
    const answers: Record<string, string> = JSON.parse(session.answers || '{}');
    const extractedData: Record<string, ExtractedFact[] | SessionMeta> = JSON.parse(session.extracted_data || '{}');

    // Store answer (truncate to MAX_ANSWER_LENGTH)
    const trimmedAnswer = (answer || '').trim().slice(0, MAX_ANSWER_LENGTH);

    if (trimmedAnswer) {
      // Handle follow-up answers with a suffix key
      const answerKey = session.follow_up_pending ? `q${currentQ}_followup` : `q${currentQ}`;
      answers[answerKey] = trimmedAnswer;

      // Extract facts from this answer
      const facts = await extractFactsFromAnswer(
        questionSet[currentQ],
        trimmedAnswer,
        currentQ
      );
      if (facts.length > 0) {
        extractedData[answerKey] = facts;
      }
    }

    // Determine next step
    let nextQuestion: number;
    let followUpPending = 0;

    if (session.follow_up_pending) {
      // We just answered a follow-up, move to next question
      nextQuestion = currentQ + 1;
    } else if (currentQ < totalQ - 1 && trimmedAnswer) {
      // Check for follow-up (max 1 per question)
      const followUp = await checkForFollowUp(
        questionSet[currentQ],
        trimmedAnswer
      );
      if (followUp) {
        // Stay on current question but mark follow-up pending
        updateSession(sessionId, {
          answers: JSON.stringify(answers),
          extracted_data: JSON.stringify(extractedData),
          follow_up_pending: 1,
        });

        return NextResponse.json({
          sessionId,
          question: followUp,
          questionNumber: currentQ + 1,
          totalQuestions: totalQ,
          isComplete: false,
          mode: sessionMeta.mode,
          topic: sessionMeta.topic,
        });
      }
      nextQuestion = currentQ + 1;
    } else {
      nextQuestion = currentQ + 1;
    }

    // Update session
    updateSession(sessionId, {
      current_question: nextQuestion,
      answers: JSON.stringify(answers),
      extracted_data: JSON.stringify(extractedData),
      follow_up_pending: followUpPending,
    });

    // Check if complete
    if (nextQuestion >= totalQ) {
      // Re-read session with updated answers
      const updatedSession: InterviewSession = {
        ...session,
        current_question: nextQuestion,
        answers: JSON.stringify(answers),
        extracted_data: JSON.stringify(extractedData),
      };

      const profileUpdates = await handleInterviewComplete(updatedSession, userId);

      let completeMessage: string;
      if (sessionMeta.mode === 'deep_dive') {
        completeMessage = `Thanks for the deep dive on "${sessionMeta.topic}"! I've saved all the insights to your profile.`;
      } else if (sessionMeta.mode === 'refresh') {
        completeMessage = "Thanks for the update! I've refreshed your profile with the latest information.";
      } else {
        completeMessage = "Thanks for sharing all of that! I've saved everything to your profile. I'll use this to give you much better, more personalized assistance going forward.";
      }

      return NextResponse.json({
        sessionId,
        question: completeMessage,
        questionNumber: totalQ,
        totalQuestions: totalQ,
        isComplete: true,
        mode: sessionMeta.mode,
        topic: sessionMeta.topic,
        profileUpdates,
      });
    }

    // Return next question
    return NextResponse.json({
      sessionId,
      question: questionSet[nextQuestion],
      questionNumber: nextQuestion + 1,
      totalQuestions: totalQ,
      isComplete: false,
      mode: sessionMeta.mode,
      topic: sessionMeta.topic,
    });
  } catch (error) {
    console.error('[Interview] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process interview request.' },
      { status: 500 }
    );
  }
}
