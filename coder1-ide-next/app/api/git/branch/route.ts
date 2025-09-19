import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Simple git branch command as fallback
    const { stdout } = await execAsync('git branch --show-current', {
      cwd: '/Users/michaelkraft/autonomous_vibe_interface'
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