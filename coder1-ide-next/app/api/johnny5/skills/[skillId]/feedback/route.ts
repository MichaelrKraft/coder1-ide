import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse, SkillFeedback } from '@/types/johnny5';
import { insertSkillFeedback, getSkillFeedback, getSkillRecord } from '@/lib/johnny5-db';

/**
 * GET /api/johnny5/skills/[skillId]/feedback
 * Returns feedback history for a skill
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;

  const record = getSkillRecord(skillId);
  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Skill not found', timestamp: new Date() },
      { status: 404 }
    );
  }

  const feedbackRecords = getSkillFeedback(skillId);
  const feedback: SkillFeedback[] = feedbackRecords.map(r => ({
    id: r.id,
    skillId: r.skill_id,
    rating: r.rating ?? 0,
    feedbackText: r.feedback_text ?? undefined,
    executionContext: r.execution_context ?? undefined,
    createdAt: new Date(r.created_at),
    applied: r.applied === 1,
  }));

  return NextResponse.json({
    success: true,
    data: feedback,
    timestamp: new Date(),
  } as Johnny5APIResponse<SkillFeedback[]>);
}

/**
 * POST /api/johnny5/skills/[skillId]/feedback
 * Submit feedback for a skill execution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;

  try {
    const body = await request.json();

    if (!body.rating && !body.feedbackText) {
      return NextResponse.json(
        { success: false, error: 'Rating or feedback text required', timestamp: new Date() },
        { status: 400 }
      );
    }

    const id = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    insertSkillFeedback({
      id,
      skill_id: skillId,
      rating: body.rating,
      feedback_text: body.feedbackText,
      execution_context: body.executionContext?.substring(0, 2000), // Cap at 2000 chars
    });

    const feedback: SkillFeedback = {
      id,
      skillId,
      rating: body.rating ?? 0,
      feedbackText: body.feedbackText,
      executionContext: body.executionContext,
      createdAt: new Date(),
      applied: false,
    };

    return NextResponse.json({
      success: true,
      data: feedback,
      timestamp: new Date(),
    } as Johnny5APIResponse<SkillFeedback>, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', timestamp: new Date() },
      { status: 400 }
    );
  }
}
