import { NextResponse } from 'next/server';
import { claudeCliService } from '@/services/claude-cli-service';

export async function GET() {
  try {
    const detection = await claudeCliService.detectClaude();
    return NextResponse.json(detection);
  } catch (error) {
    console.error('Error detecting Claude CLI:', error);
    return NextResponse.json(
      { 
        command: '',
        version: '',
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}