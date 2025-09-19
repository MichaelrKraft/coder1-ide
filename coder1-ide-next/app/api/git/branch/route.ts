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
    // Get project root directory
    const projectRoot = path.resolve(process.cwd());
    
    // Simple git branch command as fallback
    const { stdout } = await execAsync('git branch --show-current', {
      cwd: projectRoot
    });
    
    return NextResponse.json({ 
      branch: stdout.trim(),
      success: true 
    });
  } catch (error) {
    logger.error('Git branch API error:', error);
    return NextResponse.json({ 
      branch: null, 
      success: false,
      error: 'Git command failed' 
    }, { status: 500 });
  }
}