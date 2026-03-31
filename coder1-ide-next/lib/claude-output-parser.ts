/**
 * Parses Claude Code terminal output to extract file edit events.
 *
 * Two signal sources:
 *  Signal A — Tool call lines (always present):
 *    ⏺ Edit(src/foo.tsx)
 *    ⏺ Write(src/bar.ts)
 *    ⏺ MultiEdit(src/baz.tsx)
 *    ⏺ Bash(rm path/to/file.ts)
 *
 *  Signal B — Completion lines (have stats when present):
 *    ✓ Updated src/foo.tsx (+15 -3)
 *    ✓ Wrote to src/bar.ts (+42)
 *    ✓ Created src/new.ts (+20)
 *    ✓ Deleted src/old.ts
 *    Updated src/foo.tsx (+5 -2)   ← no checkmark variant
 */

export interface ParsedFileEdit {
  path: string;
  operation: 'updated' | 'created' | 'deleted';
  additions: number;
  deletions: number;
  hasStats: boolean;
}

const ANSI_RE = /\x1b\[[0-9;]*[mGKHF]/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

function normalizePath(p: string): string {
  // Strip leading ./
  return p.replace(/^\.\//, '').replace(/\/+/g, '/');
}

// Signal A patterns
const TOOL_CALL_RE = /^[⏺●*]\s+(?:Edit|Write|MultiEdit|Bash)\(([^)]+)\)/;
const BASH_RM_RE = /^[⏺●*]\s+Bash\(rm\s+([^\s)]+)/;

// Signal B patterns
const COMPLETION_STATS_RE = /(?:^|\s)(?:✓\s+)?(?:Updated|Wrote to|Created|Deleted)\s+(\S+)(?:\s+\(([^)]+)\))?/i;
const STATS_RE = /\+(\d+)(?:\s+-(\d+))?/;

export function parseClaudeFileEdits(rawOutput: string): ParsedFileEdit[] {
  const results: ParsedFileEdit[] = [];
  const clean = stripAnsi(rawOutput);
  const lines = clean.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Signal A: Bash(rm ...) → deleted
    const rmMatch = trimmed.match(BASH_RM_RE);
    if (rmMatch) {
      const path = normalizePath(rmMatch[1].trim());
      if (path && !path.includes(' ')) {
        results.push({ path, operation: 'deleted', additions: 0, deletions: 0, hasStats: false });
      }
      continue;
    }

    // Signal A: Edit/Write/MultiEdit
    const toolMatch = trimmed.match(TOOL_CALL_RE);
    if (toolMatch) {
      const path = normalizePath(toolMatch[1].trim());
      if (path) {
        // Infer operation: Write = created, Edit/MultiEdit = updated
        const verb = trimmed.match(/^[⏺●*]\s+(Edit|Write|MultiEdit)/)?.[1] ?? 'Edit';
        const operation: ParsedFileEdit['operation'] = verb === 'Write' ? 'created' : 'updated';
        results.push({ path, operation, additions: 0, deletions: 0, hasStats: false });
      }
      continue;
    }

    // Signal B: completion lines with optional stats
    const compMatch = trimmed.match(COMPLETION_STATS_RE);
    if (compMatch) {
      const path = normalizePath(compMatch[1].trim());
      if (!path || path.includes(' ')) continue;

      const statsStr = compMatch[2] ?? '';
      const statsMatch = statsStr.match(STATS_RE);

      const verbLower = trimmed.toLowerCase();
      let operation: ParsedFileEdit['operation'];
      if (verbLower.includes('created') || verbLower.includes('wrote to')) {
        operation = 'created';
      } else if (verbLower.includes('deleted')) {
        operation = 'deleted';
      } else {
        operation = 'updated';
      }

      if (statsMatch) {
        results.push({
          path,
          operation,
          additions: parseInt(statsMatch[1], 10),
          deletions: statsMatch[2] ? parseInt(statsMatch[2], 10) : 0,
          hasStats: true,
        });
      } else {
        results.push({ path, operation, additions: 0, deletions: 0, hasStats: false });
      }
    }
  }

  return results;
}
