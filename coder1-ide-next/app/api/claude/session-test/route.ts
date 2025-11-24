/**
 * Test endpoint to directly test session file functions
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(request: NextRequest) {
  const logs: string[] = [];
  
  try {
    const cwd = '/Users/michaelkraft/autonomous_vibe_interface';
    logs.push(`CWD: ${cwd}`);
    
    // Step 1: Get project dir
    const homeDir = os.homedir();
    const claudeProjectsDir = path.join(homeDir, '.claude', 'projects');
    const projectDirName = cwd.replace(/\//g, '-');
    const projectDir = path.join(claudeProjectsDir, projectDirName);
    
    logs.push(`Home: ${homeDir}`);
    logs.push(`Projects dir: ${claudeProjectsDir}`);
    logs.push(`Project dir name: ${projectDirName}`);
    logs.push(`Full project dir: ${projectDir}`);
    logs.push(`Dir exists? ${fs.existsSync(projectDir)}`);
    
    // Try hardcoded path
    const hardcodedPath = '/Users/michaelkraft/.claude/projects/-Users-michaelkraft-autonomous-vibe-interface';
    logs.push(`Hardcoded path exists? ${fs.existsSync(hardcodedPath)}`);
    
    // Compare paths
    logs.push(`Paths equal? ${projectDir === hardcodedPath}`);
    logs.push(`Computed length: ${projectDir.length}`);
    logs.push(`Hardcoded length: ${hardcodedPath.length}`);
    logs.push(`Computed: "${projectDir}"`);
    logs.push(`Hardcoded: "${hardcodedPath}"`);
    
    // Check char codes at end
    const lastChars = 10;
    const computedEnd = projectDir.slice(-lastChars).split('').map((c: string) => c.charCodeAt(0)).join(',');
    const hardcodedEnd = hardcodedPath.slice(-lastChars).split('').map((c: string) => c.charCodeAt(0)).join(',');
    logs.push(`Computed end chars: ${computedEnd}`);
    logs.push(`Hardcoded end chars: ${hardcodedEnd}`);
    
    // Try using hardcoded path to list dir
    if (fs.existsSync(hardcodedPath)) {
      const files = fs.readdirSync(hardcodedPath).filter(f => f.endsWith('.jsonl'));
      logs.push(`Using hardcoded path, found ${files.length} session files`);
    }
    
    // Step 2: List files
    if (fs.existsSync(projectDir)) {
      const allFiles = fs.readdirSync(projectDir);
      logs.push(`Total files: ${allFiles.length}`);
      
      const jsonlFiles = allFiles.filter(f => f.endsWith('.jsonl'));
      logs.push(`JSONL files: ${jsonlFiles.length}`);
      
      if (jsonlFiles.length > 0) {
        // Get most recent
        const files = jsonlFiles
          .map(f => ({
            name: f,
            path: path.join(projectDir, f),
            mtime: fs.statSync(path.join(projectDir, f)).mtime
          }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        
        const mostRecent = files[0];
        logs.push(`Most recent: ${mostRecent.name}`);
        logs.push(`Modified: ${mostRecent.mtime.toISOString()}`);
        
        // Step 3: Read file
        const content = fs.readFileSync(mostRecent.path, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        logs.push(`Lines in file: ${lines.length}`);
        
        // Step 4: Parse lines
        let totalInput = 0;
        let totalOutput = 0;
        let messagesWithUsage = 0;
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.usage) {
              messagesWithUsage++;
              totalInput += (data.message.usage.input_tokens || 0);
              totalOutput += (data.message.usage.output_tokens || 0);
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
        
        logs.push(`Messages with usage: ${messagesWithUsage}`);
        logs.push(`Total input tokens: ${totalInput}`);
        logs.push(`Total output tokens: ${totalOutput}`);
        logs.push(`Total tokens: ${totalInput + totalOutput}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error: any) {
    logs.push(`ERROR: ${error.message}`);
    return NextResponse.json({
      success: false,
      logs,
      error: error.message
    });
  }
}
