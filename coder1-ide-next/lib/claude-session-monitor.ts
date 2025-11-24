/**
 * Claude Code Session Monitor
 * Monitors Claude Code session files to extract real token usage
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ClaudeTokenUsage {
  input: number;
  output: number;
  total: number;
  cacheCreation?: number;
  cacheRead?: number;
}

export interface ClaudeMessage {
  message: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  timestamp: string;
  sessionId: string;
}

/**
 * Get the Claude projects directory for the current working directory
 */
export function getClaudeProjectDir(cwd: string): string {
  const homeDir = os.homedir();
  const claudeProjectsDir = path.join(homeDir, '.claude', 'projects');
  
  // Convert path to Claude's directory naming format
  // Example: /Users/michael/project -> -Users-michael-project
  const projectDirName = cwd.replace(/\//g, '-');
  
  return path.join(claudeProjectsDir, projectDirName);
}

/**
 * Find the most recent session file in the project directory
 */
export function findRecentSessionFile(projectDir: string): string | null {
  try {
    console.log('📊 [findRecentSessionFile] Checking dir:', projectDir);
    
    if (!fs.existsSync(projectDir)) {
      console.log('📊 [findRecentSessionFile] Directory does not exist');
      return null;
    }

    const allFiles = fs.readdirSync(projectDir);
    console.log('📊 [findRecentSessionFile] Found', allFiles.length, 'total files');
    
    const jsonlFiles = allFiles.filter(f => f.endsWith('.jsonl'));
    console.log('📊 [findRecentSessionFile] Found', jsonlFiles.length, 'jsonl files');
    
    const files = jsonlFiles
      .map(f => ({
        name: f,
        path: path.join(projectDir, f),
        mtime: fs.statSync(path.join(projectDir, f)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const result = files.length > 0 ? files[0].path : null;
    console.log('📊 [findRecentSessionFile] Returning:', result);
    return result;
  } catch (error) {
    console.error('Error finding session file:', error);
    return null;
  }
}

/**
 * Parse a single JSONL line to extract token usage
 */
export function parseSessionLine(line: string): ClaudeMessage | null {
  try {
    const data = JSON.parse(line);
    
    // Only interested in assistant messages with usage data
    if (data.message?.usage) {
      return {
        message: data.message,
        timestamp: data.timestamp,
        sessionId: data.sessionId
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Read all messages from a session file and sum token usage
 */
export function getSessionTokenUsage(sessionFilePath: string): ClaudeTokenUsage {
  const usage: ClaudeTokenUsage = {
    input: 0,
    output: 0,
    total: 0,
    cacheCreation: 0,
    cacheRead: 0
  };

  try {
    if (!fs.existsSync(sessionFilePath)) {
      return usage;
    }

    const content = fs.readFileSync(sessionFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const message = parseSessionLine(line);
      if (message?.message?.usage) {
        const u = message.message.usage;
        
        // Sum up all input tokens (including cache)
        usage.input += (u.input_tokens || 0);
        usage.cacheCreation = (usage.cacheCreation || 0) + (u.cache_creation_input_tokens || 0);
        usage.cacheRead = (usage.cacheRead || 0) + (u.cache_read_input_tokens || 0);
        
        // Output tokens
        usage.output += (u.output_tokens || 0);
      }
    }

    // Calculate total
    usage.total = usage.input + usage.output + (usage.cacheCreation || 0) + (usage.cacheRead || 0);

    return usage;
  } catch (error) {
    console.error('Error reading session file:', error);
    return usage;
  }
}

/**
 * Get current session token usage for a given working directory
 */
export function getCurrentSessionUsage(cwd: string): ClaudeTokenUsage | null {
  try {
    const projectDir = getClaudeProjectDir(cwd);
    console.log('📊 [Monitor] Looking for project dir:', projectDir);
    
    const sessionFile = findRecentSessionFile(projectDir);
    console.log('📊 [Monitor] Found session file:', sessionFile);
    
    if (!sessionFile) {
      return null;
    }

    const usage = getSessionTokenUsage(sessionFile);
    console.log('📊 [Monitor] Calculated usage:', usage);
    return usage;
  } catch (error) {
    console.error('Error getting current session usage:', error);
    return null;
  }
}

/**
 * Watch a session file for changes and call callback with updated usage
 */
export function watchSessionFile(
  sessionFilePath: string,
  callback: (usage: ClaudeTokenUsage) => void
): fs.FSWatcher | null {
  try {
    if (!fs.existsSync(sessionFilePath)) {
      return null;
    }

    let debounceTimer: NodeJS.Timeout | null = null;

    const watcher = fs.watch(sessionFilePath, (eventType) => {
      if (eventType === 'change') {
        // Debounce to avoid multiple rapid calls
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(() => {
          const usage = getSessionTokenUsage(sessionFilePath);
          callback(usage);
        }, 500); // Wait 500ms after last change
      }
    });

    // Get initial usage
    const initialUsage = getSessionTokenUsage(sessionFilePath);
    callback(initialUsage);

    return watcher;
  } catch (error) {
    console.error('Error watching session file:', error);
    return null;
  }
}

/**
 * Auto-detect and watch the current Claude Code session
 */
export function autoWatchCurrentSession(
  cwd: string,
  callback: (usage: ClaudeTokenUsage) => void
): fs.FSWatcher | null {
  try {
    const projectDir = getClaudeProjectDir(cwd);
    const sessionFile = findRecentSessionFile(projectDir);
    
    if (!sessionFile) {
      console.log('No Claude Code session file found for:', cwd);
      return null;
    }

    console.log('📊 Watching Claude Code session:', sessionFile);
    return watchSessionFile(sessionFile, callback);
  } catch (error) {
    console.error('Error auto-watching session:', error);
    return null;
  }
}
