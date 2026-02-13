/**
 * Johnny5 Command Parser
 *
 * Parses <execute_bash> tags from Johnny5 responses and extracts commands
 * for execution via the terminal WebSocket.
 */

export interface ParsedCommand {
  command: string;
  startIndex: number;
  endIndex: number;
}

export interface ParseResult {
  commands: ParsedCommand[];
  displayResponse: string;
  hasCommands: boolean;
}

/**
 * Parse <execute_bash> tags from a Johnny5 response.
 *
 * @param response - The raw response from Johnny5
 * @returns ParseResult with extracted commands and display-friendly response
 *
 * @example
 * const result = parseExecuteBashTags("Hello <execute_bash>ls -la</execute_bash> world");
 * // result.commands = [{ command: 'ls -la', startIndex: 6, endIndex: 42 }]
 * // result.displayResponse = "Hello \n```bash\n$ ls -la\n[Executing...]\n```\n world"
 */
export function parseExecuteBashTags(response: string): ParseResult {
  if (!response) {
    return {
      commands: [],
      displayResponse: response || '',
      hasCommands: false,
    };
  }

  const commands: ParsedCommand[] = [];
  const regex = /<execute_bash>([\s\S]*?)<\/execute_bash>/gi;

  let match;
  while ((match = regex.exec(response)) !== null) {
    const command = match[1].trim();
    if (command) {
      commands.push({
        command,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Replace tags with execution indicators for display
  let displayResponse = response;
  // Replace in reverse order to preserve indices
  for (let i = commands.length - 1; i >= 0; i--) {
    const cmd = commands[i];
    const before = displayResponse.slice(0, cmd.startIndex);
    const after = displayResponse.slice(cmd.endIndex);
    const indicator = formatCommandIndicator(cmd.command, 'pending');
    displayResponse = before + indicator + after;
  }

  return {
    commands,
    displayResponse,
    hasCommands: commands.length > 0,
  };
}

/**
 * Format a command for display with status indicator.
 */
export function formatCommandIndicator(
  command: string,
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout'
): string {
  const statusIndicators = {
    pending: '⏳',
    running: '🔄',
    success: '✅',
    error: '❌',
    timeout: '⏱️',
  };

  const icon = statusIndicators[status];
  const shortCmd = command.length > 50 ? command.slice(0, 47) + '...' : command;

  return `\n\`\`\`bash\n${icon} $ ${shortCmd}\n\`\`\`\n`;
}

/**
 * Update the display response with command results.
 *
 * @param displayResponse - The current display response
 * @param commandIndex - Which command (0-indexed) to update
 * @param command - The command that was executed
 * @param output - The command output
 * @param status - The execution status
 */
export function updateCommandResult(
  displayResponse: string,
  command: string,
  output: string,
  status: 'success' | 'error' | 'timeout'
): string {
  const statusIndicators = {
    success: '✅',
    error: '❌',
    timeout: '⏱️',
  };

  const icon = statusIndicators[status];
  const shortCmd = command.length > 50 ? command.slice(0, 47) + '...' : command;

  // Truncate output if too long
  const maxOutputLength = 5000;
  let displayOutput = output;
  if (output.length > maxOutputLength) {
    displayOutput = output.slice(0, maxOutputLength) + '\n... [output truncated]';
  }

  return `\n\`\`\`bash\n${icon} $ ${shortCmd}\n${displayOutput}\n\`\`\`\n`;
}

/**
 * Check if a response contains any <execute_bash> tags.
 * Quick check without full parsing.
 */
export function hasExecuteBashTags(response: string): boolean {
  if (!response) return false;
  return /<execute_bash>/i.test(response);
}

/**
 * Extract just the commands without modifying the response.
 * Useful when you only need the commands list.
 */
export function extractCommands(response: string): string[] {
  const result = parseExecuteBashTags(response);
  return result.commands.map((c) => c.command);
}
