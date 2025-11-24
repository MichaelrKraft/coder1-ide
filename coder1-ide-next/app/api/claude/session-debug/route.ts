/**
 * Debug endpoint to check Claude session file detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClaudeProjectDir } from '@/lib/claude-session-monitor';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cwd = searchParams.get('cwd') || '/Users/michaelkraft/autonomous_vibe_interface';

    const homeDir = os.homedir();
    const claudeProjectsDir = path.join(homeDir, '.claude', 'projects');
    const projectDir = getClaudeProjectDir(cwd);
    
    // List all projects
    const allProjects = fs.existsSync(claudeProjectsDir) 
      ? fs.readdirSync(claudeProjectsDir)
      : [];
    
    // Check if our project dir exists
    const projectExists = fs.existsSync(projectDir);
    
    // List session files if project exists
    let sessionFiles: string[] = [];
    if (projectExists) {
      sessionFiles = fs.readdirSync(projectDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => {
          const stats = fs.statSync(path.join(projectDir, f));
          return `${f} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`;
        });
    }

    return NextResponse.json({
      debug: {
        cwd,
        homeDir,
        claudeProjectsDir,
        projectDir,
        projectDirExists: projectExists,
        allProjects: allProjects.slice(0, 10), // First 10
        sessionFilesCount: sessionFiles.length,
        sessionFiles: sessionFiles.slice(0, 5) // First 5
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
