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
  private maxContextTokens: number = 3000; // Keep context under ~3K tokens
  private maxSessionAge: number = 168; // 7 days in hours

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
   * Load context from the most recent session summary
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
      console.error('[Eternal Memory] Failed to load context:', error);
      return {
        hasContext: false,
        contextPrompt: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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

    let prompt = `📝 Context from your last session (${ageText}):\n\n`;

    // Files worked on
    if (context.filesWorked.length > 0) {
      prompt += `Files you were working on:\n`;
      context.filesWorked.forEach(file => {
        prompt += `  • ${file}\n`;
      });
      prompt += '\n';
    }

    // Key decisions
    if (context.keyDecisions.length > 0) {
      prompt += `Key decisions you made:\n`;
      context.keyDecisions.forEach(decision => {
        prompt += `  • ${decision}\n`;
      });
      prompt += '\n';
    }

    // Current state
    if (context.currentState) {
      prompt += `Where you left off:\n`;
      prompt += `  ${context.currentState}\n\n`;
    }

    // Next steps
    if (context.nextSteps.length > 0) {
      prompt += `Planned next steps:\n`;
      context.nextSteps.forEach((step, i) => {
        prompt += `  ${i + 1}. ${step}\n`;
      });
      prompt += '\n';
    }

    prompt += `---\n`;
    prompt += `You now have full context from your last session. `;
    prompt += `Ready to continue where you left off!\n\n`;

    // Truncate if too long (should be under 3K tokens = ~2K words = ~12K chars)
    if (prompt.length > 12000) {
      prompt = prompt.substring(0, 12000) + '\n\n[Context truncated - keeping most recent info]';
    }

    return prompt;
  }

  /**
   * Create user-friendly message about loaded context
   */
  public createContextLoadedMessage(context: EternalMemoryContext): string {
    if (!context.hasContext) {
      return '';
    }

    const sessionInfo = context.sessionInfo;
    if (!sessionInfo) {
      return '📝 Context loaded from previous session\n\n';
    }

    let message = '╔════════════════════════════════════════════════════════════════╗\n';
    message += '║          📝 Eternal Memory: Context Loaded                     ║\n';
    message += '╠════════════════════════════════════════════════════════════════╣\n';
    message += `║  Last Session: ${sessionInfo.lastSessionDate.padEnd(48)}║\n`;
    
    if (sessionInfo.filesWorked.length > 0) {
      message += `║  Files: ${sessionInfo.filesWorked.slice(0, 2).join(', ').substring(0, 55).padEnd(55)}║\n`;
    }
    
    if (sessionInfo.nextSteps.length > 0) {
      message += `║  Next: ${sessionInfo.nextSteps[0].substring(0, 56).padEnd(56)}║\n`;
    }
    
    message += '╚════════════════════════════════════════════════════════════════╝\n\n';
    
    return message;
  }
}

// Export singleton instance
export const eternalMemoryContextLoader = EternalMemoryContextLoader.getInstance();
