/**
 * Terminal Output Capture Utility
 *
 * Captures output from terminal commands executed via WebSocket.
 * Handles timeouts, output truncation, and prompt detection.
 */

import type { Socket } from 'socket.io-client';

export interface CaptureResult {
  output: string;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
}

export interface CaptureOptions {
  timeoutMs?: number;
  maxBytes?: number;
  promptPatterns?: RegExp[];
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  timeoutMs: 30000, // 30 seconds
  maxBytes: 10240, // 10KB
  promptPatterns: [
    /\$\s*$/, // Standard bash prompt
    />\s*$/, // Windows/PowerShell prompt
    /❯\s*$/, // Oh My Zsh prompt
    /➜\s*$/, // Another common zsh prompt
    /\]\s*$/, // Bracket-ended prompts
  ],
};

/**
 * Capture terminal output after sending a command.
 *
 * @param socket - Socket.IO client connected to the terminal
 * @param sessionId - Terminal session ID
 * @param options - Capture options (timeout, max bytes, prompt patterns)
 * @returns Promise resolving to capture result
 *
 * @example
 * const socket = await getSocket();
 * socket.emit('terminal:input', { id: sessionId, data: 'ls -la\r' });
 * const result = await captureTerminalOutput(socket, sessionId, { timeoutMs: 10000 });
 * console.log(result.output);
 */
export function captureTerminalOutput(
  socket: Socket,
  sessionId: string,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  return new Promise((resolve) => {
    let output = '';
    let truncated = false;
    let timeoutId: NodeJS.Timeout;
    let promptDetectionBuffer = '';

    const cleanup = () => {
      clearTimeout(timeoutId);
      socket.off('terminal:output', handleOutput);
    };

    const handleOutput = (data: { id: string; data: string }) => {
      // Only capture output for our session
      if (data.id !== sessionId) return;

      // Append output
      if (output.length + data.data.length <= opts.maxBytes) {
        output += data.data;
      } else if (!truncated) {
        // Truncate and mark
        const remaining = opts.maxBytes - output.length;
        if (remaining > 0) {
          output += data.data.slice(0, remaining);
        }
        truncated = true;
      }

      // Check for prompt return (command finished)
      promptDetectionBuffer += data.data;
      // Keep only last 100 chars for prompt detection
      if (promptDetectionBuffer.length > 100) {
        promptDetectionBuffer = promptDetectionBuffer.slice(-100);
      }

      // Check if we've hit a prompt pattern (command finished)
      const hasPrompt = opts.promptPatterns.some((pattern) =>
        pattern.test(promptDetectionBuffer)
      );

      if (hasPrompt) {
        cleanup();
        resolve({
          output: cleanOutput(output),
          timedOut: false,
          truncated,
          durationMs: Date.now() - startTime,
        });
      }
    };

    // Set up timeout
    timeoutId = setTimeout(() => {
      cleanup();
      resolve({
        output: cleanOutput(output) || '[Command timed out - no output captured]',
        timedOut: true,
        truncated,
        durationMs: Date.now() - startTime,
      });
    }, opts.timeoutMs);

    // Listen for output
    socket.on('terminal:output', handleOutput);
  });
}

/**
 * Clean up terminal output by removing ANSI codes and normalizing newlines.
 */
function cleanOutput(output: string): string {
  // Remove ANSI escape codes
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]/g;
  let cleaned = output.replace(ansiRegex, '');

  // Remove carriage returns (keep newlines)
  cleaned = cleaned.replace(/\r(?!\n)/g, '');

  // Normalize multiple newlines to at most 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Execute a command and capture its output in one call.
 * Convenience wrapper around socket.emit + captureTerminalOutput.
 *
 * @param socket - Socket.IO client
 * @param sessionId - Terminal session ID
 * @param command - Command to execute
 * @param options - Capture options
 * @returns Promise resolving to capture result
 */
export async function executeAndCapture(
  socket: Socket,
  sessionId: string,
  command: string,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  // Start capturing before sending command
  const capturePromise = captureTerminalOutput(socket, sessionId, options);

  // Send the command with carriage return to execute
  socket.emit('terminal:input', {
    id: sessionId,
    data: command + '\r',
  });

  return capturePromise;
}

/**
 * Check if the terminal is ready for input.
 * Sends a test newline and checks for prompt.
 */
export async function isTerminalReady(
  socket: Socket,
  sessionId: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  try {
    const result = await captureTerminalOutput(socket, sessionId, {
      timeoutMs,
      maxBytes: 1024,
    });
    return !result.timedOut;
  } catch {
    return false;
  }
}
