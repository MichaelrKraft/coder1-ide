/**
 * API endpoint to get Claude Code session token usage
 * GET /api/claude/session-usage?cwd=/path/to/project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUsage, getClaudeProjectDir, findRecentSessionFile } from '@/lib/claude-session-monitor';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Force dynamic rendering for this route (uses request.url)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cwd = searchParams.get('cwd');

    if (!cwd) {
      return NextResponse.json(
        { error: 'Missing cwd parameter' },
        { status: 400 }
      );
    }

    console.log('📊 [API] Getting session usage for cwd:', cwd);
    
    // Debug: Check what directory we're looking for
    const projectDir = getClaudeProjectDir(cwd);
    console.log('📊 [API] Project dir would be:', projectDir);
    console.log('📊 [API] Directory exists?:', fs.existsSync(projectDir));
    
    if (fs.existsSync(projectDir)) {
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
      console.log('📊 [API] Found', files.length, 'session files');
    }
    
    const usage = getCurrentSessionUsage(cwd);
    console.log('📊 [API] Usage result:', usage);

    if (!usage) {
      return NextResponse.json(
        { error: 'No active Claude Code session found', debug: { cwd, projectDir } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      usage: {
        input: usage.input,
        output: usage.output,
        total: usage.total,
        cacheCreation: usage.cacheCreation,
        cacheRead: usage.cacheRead
      }
    });
  } catch (error) {
    console.error('Error getting session usage:', error);
    return NextResponse.json(
      { error: 'Failed to get session usage' },
      { status: 500 }
    );
  }
}
