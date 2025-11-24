/**
 * Claude Code Token Usage Parser
 * Extracts token usage information from Claude Code CLI output
 */

export interface TokenUsageUpdate {
  input?: number;
  output?: number;
  total?: number;
}

/**
 * Parse Claude Code token usage from terminal output
 * Handles multiple formats that Claude Code uses to display token information
 */
export function parseClaudeTokenUsage(terminalOutput: string): TokenUsageUpdate | null {
  if (!terminalOutput) return null;

  // Pattern 1: "15,234 input + 3,421 output" or "Token usage: 15,234 input + 3,421 output = 18,655 total"
  const inputOutputPattern = /(\d{1,3}(?:,\d{3})*)\s+(?:tokens?\s+)?input.*?(\d{1,3}(?:,\d{3})*)\s+(?:tokens?\s+)?output/i;
  const inputOutputMatch = terminalOutput.match(inputOutputPattern);
  
  if (inputOutputMatch) {
    const input = parseInt(inputOutputMatch[1].replace(/,/g, ''), 10);
    const output = parseInt(inputOutputMatch[2].replace(/,/g, ''), 10);
    return {
      input,
      output,
      total: input + output
    };
  }

  // Pattern 2: "Context: 123,456 / 200,000 (62%)" - Claude Code status line
  const contextPattern = /Context:\s*(\d{1,3}(?:,\d{3})*)\s*\/\s*200,?000/i;
  const contextMatch = terminalOutput.match(contextPattern);
  
  if (contextMatch) {
    const total = parseInt(contextMatch[1].replace(/,/g, ''), 10);
    return {
      total
    };
  }

  // Pattern 3: XML-style budget tags "<budget:token_budget>200000</budget:token_budget>"
  const budgetTagPattern = /<budget:token_budget>(\d+)<\/budget:token_budget>/i;
  const budgetTagMatch = terminalOutput.match(budgetTagPattern);
  
  if (budgetTagMatch) {
    const total = parseInt(budgetTagMatch[1], 10);
    return {
      total
    };
  }

  // Pattern 4: "total tokens: 18,655" or similar
  const totalPattern = /total\s+tokens?:\s*(\d{1,3}(?:,\d{3})*)/i;
  const totalMatch = terminalOutput.match(totalPattern);
  
  if (totalMatch) {
    const total = parseInt(totalMatch[1].replace(/,/g, ''), 10);
    return {
      total
    };
  }

  // Pattern 5: Budget display "Token usage: X / Y (Z%)" or "Tokens: X / Y"
  const budgetPattern = /(?:Token\s+usage|Tokens):\s*(\d{1,3}(?:,\d{3})*)\s*\/\s*(\d{1,3}(?:,\d{3})*)/i;
  const budgetMatch = terminalOutput.match(budgetPattern);
  
  if (budgetMatch) {
    const current = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    return {
      total: current
    };
  }

  // Pattern 6: Simple number pattern with "tokens" nearby (last resort)
  // "Using 15234 tokens" or "15234 tokens used"
  const simplePattern = /(\d{1,3}(?:,\d{3})*)\s+tokens?(?:\s+used)?/i;
  const simpleMatch = terminalOutput.match(simplePattern);
  
  if (simpleMatch) {
    const total = parseInt(simpleMatch[1].replace(/,/g, ''), 10);
    // Only return if it's a reasonable token count (not something random like "2 tokens")
    if (total > 100) {
      return {
        total
      };
    }
  }

  return null;
}

/**
 * Detect if terminal output is from Claude Code
 * This helps us know when to start/stop tracking tokens
 */
export function isClaudeCodeOutput(terminalOutput: string): boolean {
  if (!terminalOutput) return false;

  const claudeIndicators = [
    /claude\s+code/i,
    /claude\s+cli/i,
    /anthropic/i,
    /token\s+usage:/i,
    /context:\s+\d+\s*\/\s*200,?000/i,
  ];

  return claudeIndicators.some(pattern => pattern.test(terminalOutput));
}

/**
 * Extract session ID from Claude Code output if present
 * This helps track separate sessions
 */
export function extractClaudeSessionId(terminalOutput: string): string | null {
  // Look for session identifiers in Claude Code output
  const sessionPattern = /session[_\s]+id:\s*([a-zA-Z0-9_-]+)/i;
  const match = terminalOutput.match(sessionPattern);
  
  return match ? match[1] : null;
}
