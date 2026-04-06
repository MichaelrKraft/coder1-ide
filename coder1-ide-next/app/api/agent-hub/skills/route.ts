import { NextRequest, NextResponse } from 'next/server';
import { listAvailableSkills } from '@/lib/agent-hub/skills-registry';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const skills = listAvailableSkills();
    return NextResponse.json({ skills });
  } catch (error) {
    console.error('[agent-hub] GET /skills error:', error);
    return NextResponse.json({ skills: [] });
  }
}
