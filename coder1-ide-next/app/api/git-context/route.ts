import { NextRequest, NextResponse } from 'next/server';
import { getGitContext } from '@/lib/git-context';

export async function GET() {
  try {
    const context = await getGitContext();
    return NextResponse.json({ success: true, context });
  } catch (error) {
    console.error('Git context error:', error);
    return NextResponse.json({
      success: false,
      context: null,
      error: 'Git context unavailable'
    });
  }
}