/**
 * Checkpoint Filtering Utilities
 * Provides centralized filtering for checkpoint data to remove transient animations and artifacts
 */

/**
 * Filter function to remove Claude thinking animations and validation loops from terminal data
 * This ensures clean checkpoint snapshots without animation artifacts or validation errors
 */
export function filterThinkingAnimations(terminalData: string): string {
  if (!terminalData) return terminalData;
  
  // Remove thinking animation lines including spinner, text, and cursor movements
  // Patterns to match:
  // 1. Lines with Unicode spinners (✳, ✢, ·, ✶, ✻, ✽, etc.) + "Thinking…" or variations
  // 2. Associated cursor movement sequences
  // 3. Color codes around "Thinking" with letters highlighted differently
  // 4. Claude Code validation loop messages and "Flowing…" patterns
  
  let filtered = terminalData;
  
  // Remove thinking animation patterns with all their ANSI codes
  // This matches lines with spinner symbols followed by "Thinking" (with possible color codes in between)
  const thinkingPatterns = [
    // Match lines with thinking animations including color codes
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s+\u001b\[38;5;\d+m.*?[Tt]hin.*?king.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match simpler thinking patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s+[Tt]hinking…\s+\(esc to interrupt\).*?\r?\n/g,
    // Match cursor movement sequences that are part of animations
    /(?:\u001b\[2K\u001b\[1A){2,}(?:\u001b\[2K\u001b\[G)?/g,
    // Match standalone cursor clearing sequences (often left after animations)
    /\u001b\[2K\u001b\[G\r?\n/g,
    // Remove excessive newlines that might be left
    /(\r?\n){4,}/g
  ];
  
  // Claude Code validation loop patterns - CRITICAL FOR ALPHA LAUNCH
  const validationLoopPatterns = [
    // Match "Found invalid settings files" messages with any surrounding text
    /.*Found invalid settings files\. They will be ignored\. Run \/doctor for details\..*\r?\n/g,
    // Match "Flowing…" patterns with spinners and interruption text
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Flowing…\s*\(esc to interrupt\).*?\r?\n/g,
    // Match color-coded "Flowing…" patterns
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Flowing.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match validation loop cursor sequences (specific to Claude Code loops)
    /\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[G.*?Found invalid settings files.*?\r?\n/g,
    // Match repetitive validation sequences
    /(\s*Found invalid settings files\. They will be ignored\. Run \/doctor for details\.\s*\r?\n){2,}/g,
    // Match repetitive "Flowing…" sequences
    /([✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Flowing…\s*\(esc to interrupt\).*?\r?\n){2,}/g
  ];
  
  // Apply thinking animation filters
  for (const pattern of thinkingPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply validation loop filters - CRITICAL FOR ALPHA LAUNCH
  for (const pattern of validationLoopPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Clean up any remaining isolated cursor movement codes
  filtered = filtered.replace(/(\u001b\[2K\u001b\[1A)+\u001b\[2K\u001b\[G/g, '');
  
  // Clean up validation loop specific cursor sequences
  filtered = filtered.replace(/(\u001b\[2K\u001b\[1A){5,}\u001b\[2K\u001b\[G/g, '');
  
  // Remove any remaining "Found invalid settings" fragments
  filtered = filtered.replace(/.*Found invalid settings.*?\r?\n/g, '');
  filtered = filtered.replace(/.*Flowing….*?\r?\n/g, '');
  
  // Normalize multiple consecutive newlines to maximum 2
  filtered = filtered.replace(/(\r?\n){3,}/g, '\r\n\r\n');
  
  return filtered;
}

/**
 * Process checkpoint data before saving
 * Applies all necessary filters to ensure clean checkpoint snapshots
 */
export function processCheckpointDataForSave(snapshot: any): any {
  if (!snapshot) return snapshot;
  
  const processed = { ...snapshot };
  
  // Filter terminal history to remove thinking animations
  if (processed.terminal) {
    processed.terminal = filterThinkingAnimations(processed.terminal);
  }
  
  // Filter conversation history if present
  if (processed.conversationHistory && Array.isArray(processed.conversationHistory)) {
    processed.conversationHistory = processed.conversationHistory.map((conv: any) => {
      if (conv.content && typeof conv.content === 'string') {
        return {
          ...conv,
          content: filterThinkingAnimations(conv.content)
        };
      }
      return conv;
    });
  }
  
  return processed;
}

/**
 * Process checkpoint data after loading for restore
 * Ensures any remaining artifacts are cleaned before restoration
 */
export function processCheckpointDataForRestore(checkpoint: any): any {
  if (!checkpoint?.data?.snapshot) return checkpoint;
  
  const processed = { ...checkpoint };
  
  // Apply filtering to restore data as well (double safety)
  if (processed.data?.snapshot) {
    processed.data.snapshot = processCheckpointDataForSave(processed.data.snapshot);
  }
  
  return processed;
}

/**
 * Extract Claude commands from terminal history
 * Parses terminal output to find executable Claude commands
 */
export function extractClaudeCommands(terminalHistory: string): Array<{
  command: string;
  context: string;
  timestamp?: string;
}> {
  if (!terminalHistory) return [];
  
  const commands: Array<{ command: string; context: string; timestamp?: string }> = [];
  
  // Split by lines and process each line
  const lines = terminalHistory.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for lines that contain 'claude' commands
    // Match various patterns like:
    // - claude help me with this
    // - $ claude analyze this code
    // - bash-3.2$ claude fix this error
    const claudeCommandMatch = line.match(/(?:[\$#]\s*)?claude\s+(.+)/i);
    
    if (claudeCommandMatch) {
      const fullCommand = claudeCommandMatch[0].trim();
      const commandText = claudeCommandMatch[1].trim();
      
      // Get some context from surrounding lines
      const contextStart = Math.max(0, i - 2);
      const contextEnd = Math.min(lines.length, i + 3);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      // Try to extract timestamp if available
      let timestamp: string | undefined;
      const timestampMatch = line.match(/\[(\d{2}:\d{2}:\d{2})\]/);
      if (timestampMatch) {
        timestamp = timestampMatch[1];
      }
      
      commands.push({
        command: fullCommand,
        context: context,
        timestamp
      });
    }
  }
  
  return commands;
}