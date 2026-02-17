import { NextRequest, NextResponse } from 'next/server';
import { dismissSkillSuggestion } from '@/lib/johnny5-db';

/**
 * POST /api/johnny5/skills/suggestions/[patternId]/dismiss
 * Dismiss a skill suggestion so it won't be shown again.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { patternId: string } }
) {
  const { patternId } = params;

  try {
    dismissSkillSuggestion(patternId);
    return NextResponse.json({ success: true, timestamp: new Date() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to dismiss suggestion', timestamp: new Date() },
      { status: 500 }
    );
  }
}
