import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/lib/logger';
import path from 'path';

// Mark as dynamic since this accesses local filesystem
export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get project root directory (2 levels up from app/api/)
    const projectRoot = path.resolve(process.cwd());
    
    // Get git branch and status information
    const [branchResult, statusResult] = await Promise.all([
      execAsync('git branch --show-current', {
        cwd: projectRoot
      }),
      execAsync('git status --porcelain', {
        cwd: projectRoot
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