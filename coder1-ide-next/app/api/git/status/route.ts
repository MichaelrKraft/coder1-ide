import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get git branch and status information
    const [branchResult, statusResult] = await Promise.all([
      execAsync('git branch --show-current', {
        cwd: '/Users/michaelkraft/autonomous_vibe_interface'
      }),
      execAsync('git status --porcelain', {
        cwd: '/Users/michaelkraft/autonomous_vibe_interface'
      })
    ]);
    
    const branch = branchResult.stdout.trim();
    const statusLines = statusResult.stdout.trim().split('\n').filter(line => line.trim());
    
    // Count different types of changes
    const modifiedCount = statusLines.filter(line => line.startsWith(' M') || line.startsWith('M')).length;
    const addedCount = statusLines.filter(line => line.startsWith('A')).length;
    const untrackedCount = statusLines.filter(line => line.startsWith('??')).length;
    
    return NextResponse.json({ 
      branch,
      modifiedCount,
      addedCount,
      untrackedCount,
      totalChanges: statusLines.length,
      success: true 
    });
  } catch (error) {
    logger.error('Git status API error:', error);
    return NextResponse.json({ 
      branch: null,
      modifiedCount: 0,
      addedCount: 0,
      untrackedCount: 0,
      totalChanges: 0,
      success: false,
      error: 'Git command failed' 
    }, { status: 500 });
  }
}