/**
 * Eternal Memory Prompt Formatter
 * 
 * Utility functions for formatting eternal memory context into Claude-optimized prompts.
 * Ensures context is injected in a way that Claude understands and utilizes effectively.
 */

/**
 * Escape eternal memory context for use in shell --append-system-prompt flag
 * Handles quotes, newlines, and special characters safely
 * 
 * Strategy: Keep newlines as actual newlines - they work fine inside double quotes
 * Only escape characters that break double-quoted strings
 */
export function escapeForShellArgument(context: string): string {
  if (!context || !context.trim()) {
    return '';
  }
  
  let escaped = context;
  
  // Escape backslashes first (to prevent double-escaping)
  escaped = escaped.replace(/\\/g, '\\\\');
  
  // Escape double quotes (these break the argument boundary)
  escaped = escaped.replace(/"/g, '\\"');
  
  // Escape dollar signs (prevent variable expansion)
  escaped = escaped.replace(/\$/g, '\\$');
  
  // Escape backticks (prevent command substitution)
  escaped = escaped.replace(/`/g, '\\`');
  
  // Keep newlines as actual newlines - they're safe inside double quotes
  // and Claude CLI expects them as real line breaks
  
  return escaped;
}

/**
 * Inject eternal memory context into Claude CLI command using --append-system-prompt
 * This is the CORRECT way to inject context into Claude Code CLI
 */
export function injectContextIntoClaudeCommand(
  claudeCommand: string,
  eternalMemoryContext: string
): string {
  // If no context, return original command
  if (!eternalMemoryContext || eternalMemoryContext.trim().length === 0) {
    return claudeCommand;
  }
  
  // Extract the claude command and arguments
  // Format: "claude [flags] [query]" or just "claude query"
  const trimmed = claudeCommand.trim();
  
  // Find where the actual user query starts (after 'claude' and any existing flags)
  const parts = trimmed.split(/\s+/);
  const claudeCmd = parts[0]; // "claude"
  
  // Check if there are already flags
  let flagsEndIndex = 1;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].startsWith('-')) {
      // This is a flag, might have a value after it
      if (parts[i].startsWith('--') && !parts[i].includes('=')) {
        // Long flag without =, next part might be its value
        // Skip both flag and value
        i++;
      }
      flagsEndIndex = i + 1;
    } else {
      // First non-flag argument - this is where user query starts
      break;
    }
  }
  
  // Escape context for safe shell usage
  const escapedContext = escapeForShellArgument(eternalMemoryContext);
  
  // Build command: claude [existing-flags] --append-system-prompt "context" [user-query]
  const existingFlags = parts.slice(1, flagsEndIndex).join(' ');
  const userQuery = parts.slice(flagsEndIndex).join(' ');
  
  let result = claudeCmd;
  if (existingFlags) {
    result += ' ' + existingFlags;
  }
  result += ` --append-system-prompt "${escapedContext}"`;
  if (userQuery) {
    result += ' ' + userQuery;
  }
  
  return result;
}

/**
 * DEPRECATED: Old prepending approach (doesn't work with terminal)
 * Use injectContextIntoClaudeCommand instead
 */
export function prependEternalMemoryToCommand(
  originalCommand: string,
  eternalMemoryContext: string
): string {
  console.warn('[DEPRECATED] prependEternalMemoryToCommand should not be used - use injectContextIntoClaudeCommand instead');
  
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
