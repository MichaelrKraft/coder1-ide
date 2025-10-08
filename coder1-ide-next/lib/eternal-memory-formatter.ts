/**
 * Eternal Memory Prompt Formatter
 * 
 * Utility functions for formatting eternal memory context into Claude-optimized prompts.
 * Ensures context is injected in a way that Claude understands and utilizes effectively.
 */

/**
 * Prepend eternal memory context to user's query/command
 */
export function prependEternalMemoryToCommand(
  originalCommand: string,
  eternalMemoryContext: string
): string {
  // If no context, return original command
  if (!eternalMemoryContext || eternalMemoryContext.trim().length === 0) {
    return originalCommand;
  }

  // Format: Context first, then user's actual query
  // Claude will read context, then respond to the query with that knowledge
  return `${eternalMemoryContext}\n\nUser's current request:\n${originalCommand}`;
}

/**
 * Format context as system message (if using API instead of CLI)
 */
export function formatAsSystemMessage(eternalMemoryContext: string): {
  role: 'system';
  content: string;
} {
  return {
    role: 'system',
    content: eternalMemoryContext
  };
}

/**
 * Create a minimal context string when full context is too long
 */
export function createMinimalContext(sessionInfo: {
  filesWorked?: string[];
  nextSteps?: string[];
  lastSessionDate?: string;
}): string {
  let context = `📝 Continuing from last session`;
  
  if (sessionInfo.lastSessionDate) {
    context += ` (${sessionInfo.lastSessionDate})`;
  }
  
  context += `:\n\n`;
  
  if (sessionInfo.filesWorked && sessionInfo.filesWorked.length > 0) {
    context += `Last worked on: ${sessionInfo.filesWorked.slice(0, 3).join(', ')}\n`;
  }
  
  if (sessionInfo.nextSteps && sessionInfo.nextSteps.length > 0) {
    context += `Next step: ${sessionInfo.nextSteps[0]}\n`;
  }
  
  context += `\n`;
  
  return context;
}

/**
 * Validate that context isn't too long for Claude's context window
 */
export function validateContextLength(context: string, maxTokens: number = 4000): {
  valid: boolean;
  estimatedTokens: number;
  truncated?: string;
} {
  // Rough estimate: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(context.length / 4);
  
  if (estimatedTokens <= maxTokens) {
    return {
      valid: true,
      estimatedTokens
    };
  }
  
  // Truncate to fit
  const maxChars = maxTokens * 4;
  const truncated = context.substring(0, maxChars) + '\n\n[Context truncated to fit]';
  
  return {
    valid: false,
    estimatedTokens,
    truncated
  };
}

/**
 * Extract key information from a full session summary (for condensing)
 */
export function extractEssentials(fullSummary: string): string {
  const sections = {
    files: fullSummary.match(/## 📁 (?:Detailed )?File (?:Activity|Analysis)\s+([\s\S]*?)(?=\n##|$)/)?.[1] || '',
    decisions: fullSummary.match(/## 🎯 Key Decisions(?: Made)?\s+([\s\S]*?)(?=\n##|$)/)?.[1] || '',
    nextSteps: fullSummary.match(/## 📋 (?:Recommended )?Next (?:Steps|Agent Handoff)\s+([\s\S]*?)(?=\n##|$)/)?.[1] || ''
  };
  
  let essentials = '📝 Session Context:\n\n';
  
  if (sections.files) {
    essentials += '## Files:\n' + sections.files.split('\n').slice(0, 10).join('\n') + '\n\n';
  }
  
  if (sections.decisions) {
    essentials += '## Key Decisions:\n' + sections.decisions.split('\n').slice(0, 5).join('\n') + '\n\n';
  }
  
  if (sections.nextSteps) {
    essentials += '## Next Steps:\n' + sections.nextSteps.split('\n').slice(0, 5).join('\n') + '\n\n';
  }
  
  return essentials;
}
