/**
 * Eternal Memory Context Loader Service
 * 
 * Automatically loads previous session summaries and injects them into Claude's context
 * when the user types 'claude' command, creating true "eternal memory" functionality.
 * 
 * How it works:
 * 1. Queries /summaries/ directory for most recent session summary
 * 2. Extracts key context (not full summary - too long)
 * 3. Formats as concise prompt that Claude understands
 * 4. Returns formatted context to be prepended to user's query
 * 
 * This creates the illusion of persistence while working with stateless Claude API/CLI.
 */

import fs from 'fs/promises';
import path from 'path';
import { getDatabase, closeDatabaseSafely } from '../lib/database';

interface SessionSummaryMetadata {
  file: string;
  timestamp: number;
  age: number; // in hours
  size: number;
}

interface EternalMemoryContext {
  hasContext: boolean;
  contextPrompt: string;
  sessionInfo?: {
    lastSessionDate: string;
    filesWorked: string[];
    keyDecisions: string[];
    currentState: string;
    nextSteps: string[];
  };
  error?: string;
}

export class EternalMemoryContextLoader {
  private static instance: EternalMemoryContextLoader;
  private summariesDir: string;
  private maxContextTokens: number = 1500; // REDUCED: Keep context under ~1.5K tokens to prevent crashes
  private maxSessionAge: number = 720; // 30 days in hours (increased for testing)
  private maxContextChars: number = 6000; // ADDED: Hard limit on character count (~1500 tokens)

  constructor() {
    this.summariesDir = path.join(process.cwd(), 'summaries');
  }

  public static getInstance(): EternalMemoryContextLoader {
    if (!EternalMemoryContextLoader.instance) {
      EternalMemoryContextLoader.instance = new EternalMemoryContextLoader();
    }
    return EternalMemoryContextLoader.instance;
  }

  /**
   * Load context from the most recent session (checkpoints or summaries)
   */
  public async loadLastSessionContext(): Promise<EternalMemoryContext> {
    try {
      // Check if eternal memory is enabled
      if (process.env.ENABLE_ETERNAL_MEMORY !== 'true') {
        return {
          hasContext: false,
          contextPrompt: '',
          error: 'Eternal memory disabled (set ENABLE_ETERNAL_MEMORY=true)'
        };
      }

      // Get strategy from env (default: checkpoint)
      const strategy = process.env.ETERNAL_MEMORY_SOURCE || 'checkpoint';
      console.log(`[Eternal Memory] Using strategy: ${strategy}`);

      switch (strategy) {
        case 'checkpoint':
          return await this.loadFromCheckpoints();
          
        case 'summary':
          return await this.loadFromSessionSummaries();
          
        case 'hybrid':
          // Try checkpoints first
          const checkpointContext = await this.loadFromCheckpoints();
          if (checkpointContext.hasContext) {
            return checkpointContext;
          }
          // Fallback to summaries
          console.log('[Eternal Memory] No recent checkpoint, trying session summaries...');
          return await this.loadFromSessionSummaries();
          
        default:
          console.warn(`[Eternal Memory] Unknown ETERNAL_MEMORY_SOURCE: ${strategy}, using checkpoint`);
          return await this.loadFromCheckpoints();
      }

    } catch (error) {
      console.error('[Eternal Memory] Failed to load context:', error);
      return {
        hasContext: false,
        contextPrompt: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load context from session summaries (original behavior)
   */
  private async loadFromSessionSummaries(): Promise<EternalMemoryContext> {
    try {
      // Get most recent summary file
      const lastSummary = await this.getMostRecentSummary();
      
      if (!lastSummary) {
        return {
          hasContext: false,
          contextPrompt: '',
          error: 'No previous session found'
        };
      }

      // Check if summary is too old
      if (lastSummary.age > this.maxSessionAge) {
        console.log(`[Eternal Memory] Last session is ${lastSummary.age}h old (max ${this.maxSessionAge}h) - skipping`);
        return {
          hasContext: false,
          contextPrompt: '',
          error: `Last session too old (${Math.floor(lastSummary.age / 24)} days ago)`
        };
      }

      // Read and extract key context
      const summaryContent = await fs.readFile(lastSummary.file, 'utf-8');
      const extractedContext = this.extractKeyContext(summaryContent);

      // Format as Claude-friendly prompt
      const contextPrompt = this.formatContextPrompt(extractedContext, lastSummary);

      console.log(`[Eternal Memory] Loaded context from ${path.basename(lastSummary.file)} (${lastSummary.age.toFixed(1)}h ago)`);

      return {
        hasContext: true,
        contextPrompt,
        sessionInfo: extractedContext
      };

    } catch (error) {
      console.error('[Eternal Memory] Failed to load from session summaries:', error);
      return {
        hasContext: false,
        contextPrompt: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load context from checkpoints (NEW: automatic, always current)
   */
  private async loadFromCheckpoints(): Promise<EternalMemoryContext> {
    try {
      // Step 1: Try database first (FAST - uses index)
      let checkpoint = await this.getMostRecentCheckpointFromDB();
      
      if (!checkpoint) {
        // Step 2: Fallback to file system scan
        console.log('[Eternal Memory] Database query returned no checkpoint, trying file system...');
        checkpoint = await this.getMostRecentCheckpointFromFiles();
        
        if (!checkpoint) {
          console.log('[Eternal Memory] No checkpoints found in database or file system');
          return {
            hasContext: false,
            contextPrompt: '',
            error: 'No checkpoints found'
          };
        }
      }
      
      // Format checkpoint data as context
      return this.formatCheckpointContext(checkpoint);
      
    } catch (error) {
      console.error('[Eternal Memory] Checkpoint load failed:', error);
      return {
        hasContext: false,
        contextPrompt: '',
        error: error instanceof Error ? error.message : 'Checkpoint load error'
      };
    }
  }

  /**
   * Query database for most recent checkpoint (FAST)
   */
  private async getMostRecentCheckpointFromDB(): Promise<any | null> {
    try {
      const db = await getDatabase();
      
      // Query most recent checkpoint across ALL sessions
      const checkpoint = db.prepare(`
        SELECT id, session_id, name, timestamp, 
               terminal_history, files_snapshot, metadata
        FROM checkpoints
        ORDER BY timestamp DESC
        LIMIT 1
      `).get();
      
      closeDatabaseSafely(db);
      
      if (!checkpoint) {
        return null;
      }
      
      // Parse JSON fields
      return {
        ...checkpoint,
        files_snapshot: JSON.parse(checkpoint.files_snapshot || '{}'),
        metadata: JSON.parse(checkpoint.metadata || '{}')
      };
      
    } catch (error) {
      console.warn('[Eternal Memory] Database query failed:', error);
      return null;
    }
  }

  /**
   * Scan file system for most recent checkpoint (FALLBACK)
   */
  private async getMostRecentCheckpointFromFiles(): Promise<any | null> {
    try {
      const dataDir = path.join(process.cwd(), 'data', 'sessions');
      
      // Check if data directory exists
      try {
        await fs.access(dataDir);
      } catch {
        console.log('[Eternal Memory] No data/sessions directory found');
        return null;
      }
      
      // Get all session directories
      const sessions = await fs.readdir(dataDir);
      let mostRecentCheckpoint: any = null;
      let mostRecentTimestamp = 0;
      
      // Search through all sessions for most recent checkpoint
      for (const sessionDir of sessions) {
        const checkpointsBaseDir = path.join(dataDir, sessionDir, 'checkpoints');
        
        try {
          // Check manual/, auto/, and legacy root directories
          const locationsToCheck = [
            path.join(checkpointsBaseDir, 'manual'),
            path.join(checkpointsBaseDir, 'auto'),
            checkpointsBaseDir // Legacy root location
          ];
          
          for (const location of locationsToCheck) {
            try {
              const checkpointFiles = await fs.readdir(location);
              
              for (const file of checkpointFiles.filter(f => f.endsWith('.json') && f.startsWith('checkpoint_'))) {
                const checkpointPath = path.join(location, file);
                const content = await fs.readFile(checkpointPath, 'utf-8');
                const checkpoint = JSON.parse(content);
                
                const timestamp = new Date(checkpoint.timestamp).getTime();
                if (timestamp > mostRecentTimestamp) {
                  mostRecentTimestamp = timestamp;
                  mostRecentCheckpoint = checkpoint;
                }
              }
            } catch {
              // Location doesn't exist, continue to next
              continue;
            }
          }
        } catch {
          // Skip sessions without checkpoints directory
          continue;
        }
      }
      
      return mostRecentCheckpoint;
      
    } catch (error) {
      console.error('[Eternal Memory] File system scan failed:', error);
      return null;
    }
  }

  /**
   * Format checkpoint data as eternal memory context
   */
  private formatCheckpointContext(checkpoint: any): EternalMemoryContext {
    const age = this.calculateCheckpointAge(checkpoint.timestamp);
    
    // Extract smart context (stay under 1500 chars)
    // Support both DB format (snake_case) and file format (camelCase)
    const filesSnapshot = checkpoint.data?.snapshot || checkpoint.files_snapshot || {};
    const files = this.extractOpenFiles(filesSnapshot);
    const terminalHistory = checkpoint.terminalHistory || checkpoint.data?.terminalHistory || checkpoint.terminal_history || '';
    const commands = this.extractRecentCommands(terminalHistory);
    const conversationHistory = checkpoint.data?.conversationHistory || checkpoint.metadata?.conversationHistory || [];
    const conversations = this.extractConversations(conversationHistory);
    
    const contextPrompt = `Context from your last session (${age}): ${files.substring(0, 100)}. Recent commands: ${commands.substring(0, 100)}. ${conversations ? 'Recent conversations available.' : ''}`;
    
    console.log(`[Eternal Memory] Loaded checkpoint context (${age})`);
    
    return {
      hasContext: true,
      contextPrompt,
      sessionInfo: {
        lastSessionDate: checkpoint.timestamp,
        filesWorked: files.split('\n').filter(f => f.trim()),
        keyDecisions: [],
        currentState: `Working in IDE - ${files.split('\n').length} files open`,
        nextSteps: []
      }
    };
  }

  /**
   * Extract open files from checkpoint snapshot
   */
  private extractOpenFiles(filesSnapshot: any): string {
    if (!filesSnapshot) {
      return '(No files open)';
    }
    
    // Files can be at filesSnapshot.files (nested) or directly as filesSnapshot (object with file paths as keys)
    const filesObj = filesSnapshot.files || filesSnapshot;
    if (!filesObj || typeof filesObj !== 'object') {
      return '(No files open)';
    }
    
    const files = Object.keys(filesObj).slice(0, 5);
    return files.map(f => `- ${f}`).join('\n') || '(No files)';
  }

  /**
   * Extract recent terminal commands (smart parsing)
   */
  private extractRecentCommands(terminalHistory: string): string {
    if (!terminalHistory) {
      return '(No terminal commands)';
    }
    
    // Regex to find shell prompts and commands
    const commandRegex = /^[\$#>]\s+(.+)$/gm;
    const commands: string[] = [];
    let match;
    
    while ((match = commandRegex.exec(terminalHistory)) !== null) {
      const cmd = match[1].trim();
      // Skip duplicates, clear commands, and system noise
      if (cmd && !commands.includes(cmd) && !cmd.startsWith('clear')) {
        commands.push(cmd);
      }
    }
    
    // Take last 10 commands
    const recentCommands = commands.slice(-10);
    return recentCommands.map(cmd => `$ ${cmd}`).join('\n') || '(No commands found)';
  }

  /**
   * Extract recent conversations from checkpoint
   */
  private extractConversations(conversationHistory: any[]): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }
    
    // Take last 3 conversations
    const recent = conversationHistory.slice(-3);
    return recent.map(conv => {
      const input = conv.user_input || '';
      const reply = (conv.claude_reply || '').substring(0, 100);
      return `User: "${input}" → Claude: "${reply}..."`;
    }).join('\n');
  }

  /**
   * Calculate human-readable age from timestamp
   */
  private calculateCheckpointAge(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }

  /**
   * Get the most recent summary file
   */
  private async getMostRecentSummary(): Promise<SessionSummaryMetadata | null> {
    try {
      // Check if summaries directory exists
      try {
        await fs.access(this.summariesDir);
      } catch {
        console.log('[Eternal Memory] No summaries directory found');
        return null;
      }

      // Get all summary files
      const files = await fs.readdir(this.summariesDir);
      const summaryFiles = files
        .filter(f => f.startsWith('summary-') && f.endsWith('.md'))
        .map(f => path.join(this.summariesDir, f));

      if (summaryFiles.length === 0) {
        console.log('[Eternal Memory] No summary files found');
        return null;
      }

      // Get file stats and find most recent
      const fileStats = await Promise.all(
        summaryFiles.map(async (file) => {
          const stats = await fs.stat(file);
          const age = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60); // hours
          return {
            file,
            timestamp: stats.mtimeMs,
            age,
            size: stats.size
          };
        })
      );

      // Sort by timestamp (most recent first)
      fileStats.sort((a, b) => b.timestamp - a.timestamp);

      return fileStats[0];

    } catch (error) {
      console.error('[Eternal Memory] Error getting summaries:', error);
      return null;
    }
  }

  /**
   * Extract key context from full summary (keep it concise)
   */
  private extractKeyContext(summaryContent: string): {
    lastSessionDate: string;
    filesWorked: string[];
    keyDecisions: string[];
    currentState: string;
    nextSteps: string[];
  } {
    // Extract session date
    const dateMatch = summaryContent.match(/\*\*Date:\*\* (.+)/);
    const lastSessionDate = dateMatch ? dateMatch[1] : 'Unknown';

    // Extract files worked on
    const filesSection = summaryContent.match(/## 📁 (?:Detailed )?File (?:Activity|Analysis)\s+([\s\S]*?)(?=\n##|$)/);
    const filesWorked: string[] = [];
    if (filesSection) {
      const fileMatches = filesSection[1].match(/###? (?:📄 )?([^\s🔴✅]+)/g);
      if (fileMatches) {
        filesWorked.push(...fileMatches.map(m => m.replace(/###? (?:📄 )?/, '').trim()).slice(0, 5));
      }
    }

    // Extract key decisions
    const decisionsSection = summaryContent.match(/## 🎯 Key Decisions(?: Made)?\s+([\s\S]*?)(?=\n##|$)/);
    const keyDecisions: string[] = [];
    if (decisionsSection) {
      const decisionMatches = decisionsSection[1].match(/^- (.+)$/gm);
      if (decisionMatches) {
        keyDecisions.push(...decisionMatches.map(m => m.replace(/^- /, '')).slice(0, 3));
      }
    }

    // Extract current state/status
    const stateSection = summaryContent.match(/## 📊 Current State(?: Assessment)?\s+([\s\S]*?)(?=\n##|$)/);
    let currentState = 'Working on Coder1 IDE development';
    if (stateSection) {
      const firstParagraph = stateSection[1].split('\n').filter(l => l.trim()).slice(0, 2).join(' ');
      currentState = firstParagraph.substring(0, 200);
    }

    // Extract next steps
    const nextStepsSection = summaryContent.match(/## 📋 (?:Recommended )?Next (?:Steps|Agent Handoff)/);
    const nextSteps: string[] = [];
    if (nextStepsSection) {
      const stepsText = summaryContent.substring(summaryContent.indexOf(nextStepsSection[0]));
      const stepMatches = stepsText.match(/^[\d.]+\. (.+)$/gm);
      if (stepMatches) {
        nextSteps.push(...stepMatches.map(m => m.replace(/^[\d.]+\. /, '')).slice(0, 3));
      }
    }

    return {
      lastSessionDate,
      filesWorked: filesWorked.filter(f => f && f.length > 0),
      keyDecisions: keyDecisions.filter(d => d && d.length > 0),
      currentState,
      nextSteps: nextSteps.filter(s => s && s.length > 0)
    };
  }

  /**
   * Format extracted context as concise Claude-friendly prompt
   * 🔧 FIXED: Ultra-minimal format to match simplified display message
   */
  private formatContextPrompt(
    context: ReturnType<typeof this.extractKeyContext>,
    metadata: SessionSummaryMetadata
  ): string {
    const ageText = metadata.age < 1 
      ? 'less than an hour ago' 
      : metadata.age < 24 
        ? `${Math.floor(metadata.age)} hours ago`
        : `${Math.floor(metadata.age / 24)} days ago`;

    // Simple one-line context matching the display message
    // Just provide enough context for Claude to understand this is a continuation
    const stateInfo = context.currentState || 'Working on Coder1 IDE development';
    return `Context from your last session (${ageText}): ${stateInfo}`;
  }

  /**
   * Create user-friendly message about loaded context
   * 🔧 FIXED: Ultra-minimal single line to avoid terminal clutter
   */
  public createContextLoadedMessage(context: EternalMemoryContext): string {
    if (!context.hasContext) {
      return '';
    }

    const sessionInfo = context.sessionInfo;
    if (!sessionInfo) {
      return '📝 Eternal memory loaded\n';
    }

    // Simple one-liner with session age
    const ageText = sessionInfo.lastSessionDate;
    return `📝 Eternal memory loaded (last session: ${ageText})\n`;
  }
}

// Export singleton instance
export const eternalMemoryContextLoader = EternalMemoryContextLoader.getInstance();
