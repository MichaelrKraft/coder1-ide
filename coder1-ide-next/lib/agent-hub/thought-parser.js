// lib/agent-hub/thought-parser.js
'use strict';

const ANSI_STRIP = /\x1b\[[0-9;]*[mGKHF]/g;

// Claude Code tool call: ⏺ ToolName(args) or ● ToolName(args)
const TOOL_CALL_RE = /^[⏺●◆]\s+(\w+)\(([^)]*(?:\([^)]*\)[^)]*)*)\)/;

// Completion indicator: ✓ or ✔ followed by text
const TOOL_DONE_RE = /^[✓✔✅]\s+(.+)/;

// Milestone: lines starting with known planning/reasoning phrases
const THINKING_RE = /^(?:I (?:need|will|should|can|am|have)|Let me|Now I|Next,|First,|Then,|Finally,|Analyzing|Planning|Thinking|Based on|Looking at|The (?:task|issue|error|problem|file|code))/i;

/**
 * Parse a raw output chunk from Claude Code and extract a thought event if present.
 * Returns null if no meaningful thought is detected.
 *
 * @param {string} rawChunk
 * @returns {{ eventType: string, label: string, tool?: string, detail?: string } | null}
 */
function parseThoughtFromChunk(rawChunk) {
  const lines = rawChunk.split('\n');

  for (const line of lines) {
    const clean = line.replace(ANSI_STRIP, '').trim();
    if (!clean || clean.length < 4) continue;

    // Tool call pattern: ⏺ Read(path/to/file.ts)
    const toolMatch = clean.match(TOOL_CALL_RE);
    if (toolMatch) {
      const tool = toolMatch[1];
      const args = toolMatch[2].slice(0, 100);
      return {
        eventType: 'tool_call',
        tool,
        detail: args,
        label: `${tool}(${args})`,
      };
    }

    // Tool result/completion line
    const doneMatch = clean.match(TOOL_DONE_RE);
    if (doneMatch) {
      return {
        eventType: 'tool_result',
        label: doneMatch[1].slice(0, 120),
      };
    }

    // Planning / reasoning text (only lines > 30 chars to avoid noise)
    if (clean.length > 30 && THINKING_RE.test(clean)) {
      return {
        eventType: 'thinking',
        label: clean.slice(0, 150),
      };
    }
  }

  return null;
}

module.exports = { parseThoughtFromChunk };
