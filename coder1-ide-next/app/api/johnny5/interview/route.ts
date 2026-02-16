/**
 * POST /api/johnny5/interview
 *
 * Multi-turn conversational deep-dive interview endpoint.
 * Walks the user through 10 questions to build a rich profile.
 *
 * Flow:
 * 1. No sessionId -> check for unexpired session, if none start new -> return first question
 * 2. sessionId + answer -> extract facts via Gemini Flash -> generate next question -> return
 * 3. After Q10 -> write to USER.md + update profile -> return isComplete with summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/johnny5-db';
import { saveProfile, getProfile } from '@/lib/johnny5-db';
import { saveFacts, type ExtractedFact } from '@/services/memory/fact-extraction-service';
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

// ============================================================================
// Types
// ============================================================================

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

interface InterviewResponse {
  sessionId: string;
  question: string;
  questionNumber: number;
  totalQuestions: number;
  isComplete: boolean;
  profileUpdates?: Record<string, string>;
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
// Completion Handler
// ============================================================================

async function handleInterviewComplete(
  session: InterviewSession,
  userId: string
): Promise<Record<string, string>> {
  const answers: Record<string, string> = JSON.parse(session.answers || '{}');
  const extractedData: Record<string, ExtractedFact[]> = JSON.parse(session.extracted_data || '{}');

  // Build USER.md section
  const dateStr = new Date().toISOString().split('T')[0];
  const lines: string[] = [`## Deep-Dive Interview (${dateStr})\n`];

  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const answerKey = `q${i}`;
    const answer = answers[answerKey];
    if (answer && answer.trim()) {
      lines.push(`**${INTERVIEW_QUESTIONS[i]}**`);
      lines.push(answer.trim());
      lines.push('');
    }
  }

  // Write to USER.md
  const interviewContent = lines.join('\n');
  appendToLivingFile('USER.md', interviewContent);

  // Aggregate extracted facts and save them
  const allFacts: ExtractedFact[] = [];
  for (const factList of Object.values(extractedData)) {
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
  updateSession(session.id, { current_question: TOTAL_QUESTIONS });

  return profileUpdates;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = extractUserId(request);
    const body = await request.json().catch(() => ({}));
    const { sessionId, answer } = body as { sessionId?: string; answer?: string };

    // Clean up expired sessions periodically
    cleanExpiredSessions();

    // Case 1: No sessionId - check for existing session or start new
    if (!sessionId) {
      const existing = getActiveSession(userId);
      if (existing) {
        // Resume existing session
        const questionIndex = existing.current_question;
        const question = existing.follow_up_pending
          ? `(Follow-up) ${INTERVIEW_QUESTIONS[questionIndex]}`
          : INTERVIEW_QUESTIONS[questionIndex];

        return NextResponse.json({
          sessionId: existing.id,
          question,
          questionNumber: questionIndex + 1,
          totalQuestions: TOTAL_QUESTIONS,
          isComplete: false,
        });
      }

      // Start new session
      const session = createInterviewSession(userId);
      return NextResponse.json({
        sessionId: session.id,
        question: INTERVIEW_QUESTIONS[0],
        questionNumber: 1,
        totalQuestions: TOTAL_QUESTIONS,
        isComplete: false,
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

    const currentQ = session.current_question;
    const answers: Record<string, string> = JSON.parse(session.answers || '{}');
    const extractedData: Record<string, ExtractedFact[]> = JSON.parse(session.extracted_data || '{}');

    // Store answer (truncate to MAX_ANSWER_LENGTH)
    const trimmedAnswer = (answer || '').trim().slice(0, MAX_ANSWER_LENGTH);

    if (trimmedAnswer) {
      // Handle follow-up answers with a suffix key
      const answerKey = session.follow_up_pending ? `q${currentQ}_followup` : `q${currentQ}`;
      answers[answerKey] = trimmedAnswer;

      // Extract facts from this answer
      const facts = await extractFactsFromAnswer(
        INTERVIEW_QUESTIONS[currentQ],
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
    } else if (currentQ < TOTAL_QUESTIONS - 1 && trimmedAnswer) {
      // Check for follow-up (max 1 per question)
      const followUp = await checkForFollowUp(
        INTERVIEW_QUESTIONS[currentQ],
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
          totalQuestions: TOTAL_QUESTIONS,
          isComplete: false,
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
    if (nextQuestion >= TOTAL_QUESTIONS) {
      // Re-read session with updated answers
      const updatedSession: InterviewSession = {
        ...session,
        current_question: nextQuestion,
        answers: JSON.stringify(answers),
        extracted_data: JSON.stringify(extractedData),
      };

      const profileUpdates = await handleInterviewComplete(updatedSession, userId);

      return NextResponse.json({
        sessionId,
        question: "Thanks for sharing all of that! I've saved everything to your profile. I'll use this to give you much better, more personalized assistance going forward.",
        questionNumber: TOTAL_QUESTIONS,
        totalQuestions: TOTAL_QUESTIONS,
        isComplete: true,
        profileUpdates,
      });
    }

    // Return next question
    return NextResponse.json({
      sessionId,
      question: INTERVIEW_QUESTIONS[nextQuestion],
      questionNumber: nextQuestion + 1,
      totalQuestions: TOTAL_QUESTIONS,
      isComplete: false,
    });
  } catch (error) {
    console.error('[Interview] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process interview request.' },
      { status: 500 }
    );
  }
}
