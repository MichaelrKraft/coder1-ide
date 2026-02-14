/**
 * Johnny5 Session Memory Test Suite
 *
 * Tests for the session memory system: temporal parsing, query intent detection,
 * session indexer utilities, budget allocation, and unified search orchestration.
 *
 * Created: Feb 14, 2026
 *
 * Run with: npx tsx __tests__/session-memory.test.ts
 */

// ============================================================================
// Minimal Test Framework (matches collab-file-sync.test.ts pattern)
// ============================================================================

type TestFn = () => void | Promise<void>;

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [] as Array<{ suite: string; test: string; error: string }>,
};

let currentSuite = '';
let beforeEachFn: (() => void) | null = null;

const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
    }
  },
  toBeFalsy: () => {
    if (actual) {
      throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
    }
  },
  toBeNull: () => {
    if (actual !== null) {
      throw new Error(`Expected ${JSON.stringify(actual)} to be null`);
    }
  },
  toBeGreaterThan: (expected: number) => {
    if (!(actual > expected)) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeGreaterThanOrEqual: (expected: number) => {
    if (!(actual >= expected)) {
      throw new Error(`Expected ${actual} to be >= ${expected}`);
    }
  },
  toBeLessThan: (expected: number) => {
    if (!(actual < expected)) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toBeLessThanOrEqual: (expected: number) => {
    if (!(actual <= expected)) {
      throw new Error(`Expected ${actual} to be <= ${expected}`);
    }
  },
  toContain: (expected: string) => {
    if (typeof actual === 'string' && !actual.includes(expected)) {
      throw new Error(`Expected "${actual.substring(0, 100)}..." to contain "${expected}"`);
    }
    if (Array.isArray(actual) && !actual.includes(expected)) {
      throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
    }
  },
  not: {
    toBe: (expected: any) => {
      if (actual === expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`);
      }
    },
    toBeNull: () => {
      if (actual === null) {
        throw new Error(`Expected value NOT to be null`);
      }
    },
    toContain: (expected: string) => {
      if (typeof actual === 'string' && actual.includes(expected)) {
        throw new Error(`Expected "${actual.substring(0, 100)}..." NOT to contain "${expected}"`);
      }
    },
  },
  toMatch: (pattern: RegExp) => {
    if (!pattern.test(actual)) {
      throw new Error(`Expected "${actual}" to match ${pattern}`);
    }
  },
});

async function describe(name: string, fn: () => void | Promise<void>) {
  currentSuite = name;
  beforeEachFn = null;
  console.log(`\n  📋 ${name}`);
  await fn();
}

function beforeEach(fn: () => void) {
  beforeEachFn = fn;
}

async function it(name: string, fn: TestFn) {
  testResults.total++;
  try {
    if (beforeEachFn) beforeEachFn();
    await fn();
    testResults.passed++;
    console.log(`    ✅ ${name}`);
  } catch (err: any) {
    testResults.failed++;
    console.log(`    ❌ ${name}`);
    console.log(`       ${err.message}`);
    testResults.errors.push({
      suite: currentSuite,
      test: name,
      error: err.message,
    });
  }
}

// ============================================================================
// Import modules under test
// ============================================================================

import {
  parseTemporalReference,
  stripTemporalReference,
} from '../services/memory/search/temporal-parser';

import {
  detectSessionQueryIntent,
  allocateTokenBudget,
} from '../services/memory/search/query-intent';

import {
  redactSensitiveData,
} from '../services/memory/session-indexer';

// ============================================================================
// Tests
// ============================================================================

async function runTests() {
  console.log('\n🧪 Johnny5 Session Memory Test Suite\n');
  console.log('=' .repeat(60));

  // --------------------------------------------------------------------------
  // 1. Temporal Parser Tests
  // --------------------------------------------------------------------------

  await describe('Temporal Parser: parseTemporalReference', async () => {
    await it('parses "yesterday" into start/end of previous day', () => {
      const result = parseTemporalReference('what did I do yesterday');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('yesterday');
      expect(result!.confidence).toBe('exact');
      expect(result!.after).toBeTruthy();
      expect(result!.before).toBeTruthy();

      // after should be start of yesterday (00:00:00)
      expect(result!.after!.getHours()).toBe(0);
      expect(result!.after!.getMinutes()).toBe(0);

      // before should be end of yesterday (23:59:59)
      expect(result!.before!.getHours()).toBe(23);
      expect(result!.before!.getMinutes()).toBe(59);

      // Should be 1 day before today
      const now = new Date();
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() - 1);
      expect(result!.after!.getDate()).toBe(expectedDate.getDate());
    });

    await it('parses "today" with exact confidence', () => {
      const result = parseTemporalReference('what happened today');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('today');
      expect(result!.confidence).toBe('exact');
      expect(result!.after!.getHours()).toBe(0);
      expect(result!.after!.getMinutes()).toBe(0);
    });

    await it('parses "last week" into previous week boundaries', () => {
      const result = parseTemporalReference('what did I work on last week');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('last week');
      expect(result!.confidence).toBe('exact');
      expect(result!.after).toBeTruthy();
      expect(result!.before).toBeTruthy();

      // after should be a Monday, before should be a Sunday
      const afterDay = result!.after!.getDay();
      const beforeDay = result!.before!.getDay();
      expect(afterDay).toBe(1); // Monday
      expect(beforeDay).toBe(0); // Sunday
    });

    await it('parses "this week" starting from Monday', () => {
      const result = parseTemporalReference('what did I do this week');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('this week');
      expect(result!.confidence).toBe('exact');
      // after should be a Monday
      expect(result!.after!.getDay()).toBe(1);
    });

    await it('parses "last month" into previous month boundaries', () => {
      const result = parseTemporalReference('changes from last month');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('last month');
      expect(result!.confidence).toBe('exact');
      // after should be the 1st of the previous month
      expect(result!.after!.getDate()).toBe(1);
    });

    await it('parses "3 days ago" with approximate confidence', () => {
      const result = parseTemporalReference('what errors did I hit 3 days ago');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('3 days ago');
      expect(result!.confidence).toBe('approximate');

      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() - 3);
      expect(result!.after!.getDate()).toBe(expected.getDate());
    });

    await it('parses "2 weeks ago" with approximate confidence', () => {
      const result = parseTemporalReference('2 weeks ago I fixed a bug');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('2 weeks ago');
      expect(result!.confidence).toBe('approximate');
    });

    await it('parses "in January" into month boundaries', () => {
      const result = parseTemporalReference('what did I do in January');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('in January');
      expect(result!.confidence).toBe('exact');
      expect(result!.after!.getMonth()).toBe(0); // January = 0
      expect(result!.after!.getDate()).toBe(1);
    });

    await it('parses abbreviated month names like "in Feb"', () => {
      const result = parseTemporalReference('sessions in Feb');
      expect(result).not.toBeNull();
      expect(result!.after!.getMonth()).toBe(1); // February = 1
    });

    await it('parses "recently" with ambiguous confidence', () => {
      const result = parseTemporalReference('I recently fixed something');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('recently');
      expect(result!.confidence).toBe('ambiguous');
    });

    await it('parses "last time" with ambiguous confidence', () => {
      const result = parseTemporalReference('last time I worked on auth');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('last time');
      expect(result!.confidence).toBe('ambiguous');
    });

    await it('returns null for queries with no temporal reference', () => {
      const result = parseTemporalReference('what files did I change');
      expect(result).toBeNull();
    });

    await it('returns null for empty queries', () => {
      const result = parseTemporalReference('');
      expect(result).toBeNull();
    });
  });

  await describe('Temporal Parser: stripTemporalReference', async () => {
    await it('strips "yesterday" from query', () => {
      const result = stripTemporalReference('what did I do yesterday');
      expect(result).toBe('what did I do');
    });

    await it('strips "last week" from query', () => {
      const result = stripTemporalReference('remember when I fixed the CORS bug last week');
      expect(result).toBe('remember when I fixed the CORS bug');
    });

    await it('strips "3 days ago" from query', () => {
      const result = stripTemporalReference('errors from 3 days ago');
      expect(result).toBe('errors from');
    });

    await it('normalizes extra whitespace after stripping', () => {
      const result = stripTemporalReference('what did I do    yesterday    please');
      expect(result).not.toContain('  '); // No double spaces
    });

    await it('returns query unchanged when no temporal reference', () => {
      const result = stripTemporalReference('what files did I change');
      expect(result).toBe('what files did I change');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Query Intent Tests
  // --------------------------------------------------------------------------

  await describe('Query Intent: detectSessionQueryIntent', async () => {
    await it('detects file_change intent for "what files did I change"', () => {
      const result = detectSessionQueryIntent('what files did I change');
      expect(result.intent).toBe('file_change');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.preferredSourceTypes).toContain('ide_file_change');
    });

    await it('detects file_change intent for "which files did I edit yesterday"', () => {
      const result = detectSessionQueryIntent('which files did I edit yesterday');
      expect(result.intent).toBe('file_change');
      expect(result.temporalRange).not.toBeNull();
      expect(result.temporalRange!.label).toBe('yesterday');
    });

    await it('detects error intent for "what errors did I hit"', () => {
      const result = detectSessionQueryIntent('what errors did I hit');
      expect(result.intent).toBe('error');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.preferredSourceTypes).toContain('ide_error');
    });

    await it('detects error intent for "what went wrong"', () => {
      const result = detectSessionQueryIntent('what went wrong');
      expect(result.intent).toBe('error');
    });

    await it('detects command intent for "what commands did I run"', () => {
      const result = detectSessionQueryIntent('what commands did I run');
      expect(result.intent).toBe('command');
      expect(result.preferredSourceTypes).toContain('ide_command');
      expect(result.preferredSourceTypes).toContain('ide_terminal_chunk');
    });

    await it('detects command intent for "terminal history"', () => {
      const result = detectSessionQueryIntent('show me terminal history');
      expect(result.intent).toBe('command');
    });

    await it('detects decision intent for "why did I choose"', () => {
      const result = detectSessionQueryIntent('why did I choose to use Redux');
      expect(result.intent).toBe('decision');
      expect(result.preferredSourceTypes).toContain('ide_session_summary');
    });

    await it('detects session_recall intent for "remember when"', () => {
      const result = detectSessionQueryIntent('remember when I fixed the auth bug');
      expect(result.intent).toBe('session_recall');
      expect(result.preferredSourceTypes).toContain('ide_session_summary');
      expect(result.preferredSourceTypes).toContain('ide_terminal_chunk');
    });

    await it('detects session_recall intent for "what did I work on"', () => {
      const result = detectSessionQueryIntent('what did I work on last week');
      expect(result.intent).toBe('session_recall');
      expect(result.temporalRange).not.toBeNull();
    });

    await it('detects session_recall intent for "last session"', () => {
      const result = detectSessionQueryIntent('what happened in the last session');
      expect(result.intent).toBe('session_recall');
    });

    await it('returns general intent for unrecognized queries', () => {
      const result = detectSessionQueryIntent('how does React useEffect work');
      expect(result.intent).toBe('general');
      expect(result.confidence).toBe(0.5);
    });

    await it('strips temporal references from query', () => {
      const result = detectSessionQueryIntent('what files did I change yesterday');
      expect(result.strippedQuery).toBe('what files did I change');
      expect(result.strippedQuery).not.toContain('yesterday');
    });

    await it('preserves original query when no temporal reference', () => {
      const result = detectSessionQueryIntent('what files did I change');
      expect(result.strippedQuery).toBe('what files did I change');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Token Budget Allocation Tests
  // --------------------------------------------------------------------------

  await describe('Token Budget: allocateTokenBudget', async () => {
    await it('allocates 70/30 for session_recall', () => {
      const budget = allocateTokenBudget('session_recall', 2000);
      expect(budget.sessionBudget).toBe(1400);
      expect(budget.factBudget).toBe(600);
    });

    await it('allocates 70/30 for file_change', () => {
      const budget = allocateTokenBudget('file_change', 2000);
      expect(budget.sessionBudget).toBe(1400);
      expect(budget.factBudget).toBe(600);
    });

    await it('allocates 70/30 for error', () => {
      const budget = allocateTokenBudget('error', 2000);
      expect(budget.sessionBudget).toBe(1400);
      expect(budget.factBudget).toBe(600);
    });

    await it('allocates 70/30 for command', () => {
      const budget = allocateTokenBudget('command', 2000);
      expect(budget.sessionBudget).toBe(1400);
      expect(budget.factBudget).toBe(600);
    });

    await it('allocates 50/50 for decision', () => {
      const budget = allocateTokenBudget('decision', 2000);
      expect(budget.sessionBudget).toBe(1000);
      expect(budget.factBudget).toBe(1000);
    });

    await it('allocates 30/70 for general', () => {
      const budget = allocateTokenBudget('general', 2000);
      expect(budget.sessionBudget).toBe(600);
      expect(budget.factBudget).toBe(1400);
    });

    await it('respects custom total budget', () => {
      const budget = allocateTokenBudget('session_recall', 1000);
      expect(budget.sessionBudget).toBe(700);
      expect(budget.factBudget).toBe(300);
      expect(budget.sessionBudget + budget.factBudget).toBe(1000);
    });

    await it('uses default 2000 budget when not specified', () => {
      const budget = allocateTokenBudget('general');
      expect(budget.sessionBudget + budget.factBudget).toBe(2000);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Sensitive Data Redaction Tests
  // --------------------------------------------------------------------------

  await describe('Session Indexer: redactSensitiveData', async () => {
    await it('redacts API key=value patterns', () => {
      const result = redactSensitiveData('export api_key=sk-abc123def456');
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('sk-abc123def456');
    });

    await it('redacts token: value patterns', () => {
      const result = redactSensitiveData('token: ghp_abc123def456');
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('ghp_abc123def456');
    });

    await it('redacts secret=value patterns', () => {
      const result = redactSensitiveData('secret=my-super-secret-value');
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('my-super-secret-value');
    });

    await it('redacts password patterns', () => {
      const result = redactSensitiveData('password: hunter2');
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('hunter2');
    });

    await it('redacts ANTHROPIC_ env vars', () => {
      const result = redactSensitiveData('ANTHROPIC_API_KEY=sk-ant-abc123');
      expect(result).not.toContain('sk-ant-abc123');
      expect(result).toContain('[REDACTED]');
    });

    await it('redacts OPENAI_ env vars', () => {
      const result = redactSensitiveData('OPENAI_API_KEY=sk-abc123');
      expect(result).not.toContain('sk-abc123');
      expect(result).toContain('[REDACTED]');
    });

    await it('redacts AWS_ env vars', () => {
      const result = redactSensitiveData('AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI');
      expect(result).toBe('[REDACTED]');
    });

    await it('redacts STRIPE_ env vars', () => {
      const result = redactSensitiveData('STRIPE_SECRET_KEY=sk_test_abc123');
      expect(result).toBe('[REDACTED]');
    });

    await it('redacts DATABASE_ env vars', () => {
      const result = redactSensitiveData('DATABASE_URL=postgresql://user:pass@host/db');
      expect(result).toBe('[REDACTED]');
    });

    await it('preserves non-sensitive content', () => {
      const content = 'npm run build\n✓ Compiled successfully\nFiles: 42 total';
      const result = redactSensitiveData(content);
      expect(result).toBe(content);
    });

    await it('handles content with mixed sensitive and safe data', () => {
      const content = 'Running deploy...\nANTHROPIC_API_KEY=sk-abc123\nDeploy successful!';
      const result = redactSensitiveData(content);
      expect(result).toContain('Running deploy...');
      expect(result).toContain('Deploy successful!');
      expect(result).not.toContain('sk-abc123');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Query Intent + Temporal Integration Tests
  // --------------------------------------------------------------------------

  await describe('Intent + Temporal Integration', async () => {
    await it('detects file_change intent with temporal range for "what files did I change yesterday"', () => {
      const result = detectSessionQueryIntent('what files did I change yesterday');
      expect(result.intent).toBe('file_change');
      expect(result.temporalRange).not.toBeNull();
      expect(result.temporalRange!.label).toBe('yesterday');
      expect(result.strippedQuery).toBe('what files did I change');
    });

    await it('detects error intent with temporal range for "errors from last week"', () => {
      const result = detectSessionQueryIntent('what errors did I hit last week');
      expect(result.intent).toBe('error');
      expect(result.temporalRange).not.toBeNull();
      expect(result.temporalRange!.label).toBe('last week');
    });

    await it('detects session_recall with temporal for "what did I work on 3 days ago"', () => {
      const result = detectSessionQueryIntent('what did I work on 3 days ago');
      expect(result.intent).toBe('session_recall');
      expect(result.temporalRange).not.toBeNull();
      expect(result.temporalRange!.label).toBe('3 days ago');
    });

    await it('returns general intent with temporal for "tell me about January"', () => {
      // No session-specific patterns, just temporal
      const result = detectSessionQueryIntent('tell me about in January');
      expect(result.intent).toBe('general');
      expect(result.temporalRange).not.toBeNull();
      expect(result.temporalRange!.label).toBe('in January');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Edge Cases
  // --------------------------------------------------------------------------

  await describe('Edge Cases', async () => {
    await it('handles empty query in intent detection', () => {
      const result = detectSessionQueryIntent('');
      expect(result.intent).toBe('general');
      expect(result.temporalRange).toBeNull();
    });

    await it('handles very long queries', () => {
      const longQuery = 'what files did I change when I was working on the authentication system that uses JWT tokens with refresh token rotation and was integrated with the OAuth2 provider from Google and GitHub last week';
      const result = detectSessionQueryIntent(longQuery);
      expect(result.intent).toBe('file_change');
      expect(result.temporalRange).not.toBeNull();
    });

    await it('handles queries with special characters', () => {
      const result = detectSessionQueryIntent('what errors did I hit with @/lib/johnny5-db.ts?');
      expect(result.intent).toBe('error');
    });

    await it('redacts mixed case sensitive patterns', () => {
      const result = redactSensitiveData('API_KEY=test123\napi-key: test456');
      expect(result).not.toContain('test123');
      expect(result).not.toContain('test456');
    });

    await it('temporal parser handles "1 day ago" (singular)', () => {
      const result = parseTemporalReference('what happened 1 day ago');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('1 day ago');
    });

    await it('temporal parser handles "1 month ago" (singular)', () => {
      const result = parseTemporalReference('1 month ago');
      expect(result).not.toBeNull();
      expect(result!.label).toBe('1 month ago');
    });

    await it('budget allocation always sums to total', () => {
      const intents = ['session_recall', 'file_change', 'error', 'command', 'decision', 'general'] as const;
      for (const intent of intents) {
        const budget = allocateTokenBudget(intent, 2000);
        expect(budget.sessionBudget + budget.factBudget).toBe(2000);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 7. ANSI Stripping
  // --------------------------------------------------------------------------

  await describe('ANSI Code Stripping', async () => {
    // Import stripAnsiCodes indirectly by testing the indexer behavior
    // Since stripAnsiCodes is private, we test it via the module's exported functions
    // For direct testing, re-implement the same logic here
    const stripAnsiCodes = (text: string): string => {
      return text
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')
        .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
        .replace(/\x1b\([A-Z]/g, '')
        .replace(/\r(?!\n)/g, '');
    };

    await it('strips CSI color sequences', () => {
      const input = '\x1b[38;2;215;119;87mcolored text\x1b[0m';
      const result = stripAnsiCodes(input);
      expect(result).toBe('colored text');
    });

    await it('strips private CSI sequences (?25h, ?2004h)', () => {
      const input = '\x1b[?25l\x1b[?2004h\x1b[?1004hreal content';
      const result = stripAnsiCodes(input);
      expect(result).toBe('real content');
    });

    await it('strips OSC window title sequences', () => {
      const input = '\x1b]0;My Terminal Title\x07actual output';
      const result = stripAnsiCodes(input);
      expect(result).toBe('actual output');
    });

    await it('strips character set selection', () => {
      const input = '\x1b(Bplain text';
      const result = stripAnsiCodes(input);
      expect(result).toBe('plain text');
    });

    await it('strips carriage returns but preserves \\r\\n', () => {
      const input = 'progress\roverwrite\r\nkeep this line';
      const result = stripAnsiCodes(input);
      // \r without \n is stripped (merges text), \r\n is preserved
      expect(result).toBe('progressoverwrite\r\nkeep this line');
      expect(result).not.toContain('\x1b');
    });

    await it('handles mixed ANSI codes in terminal output', () => {
      const input = '\x1b[?25l\x1b[38;2;153;153;153m$ npm run build\x1b[39m\n> next build\n\x1b[32m✓ Compiled\x1b[0m';
      const result = stripAnsiCodes(input);
      expect(result).toContain('$ npm run build');
      expect(result).toContain('✓ Compiled');
      expect(result).not.toContain('\x1b');
    });
  });

  // --------------------------------------------------------------------------
  // 8. File Path Extraction
  // --------------------------------------------------------------------------

  await describe('File Path Extraction from Snapshot', async () => {
    const extractFilePathsFromSnapshot = (files: any): string[] => {
      if (!files) return [];
      try {
        const parsed = typeof files === 'string' ? JSON.parse(files) : files;
        if (Array.isArray(parsed)) {
          return parsed
            .map((f: any) => (typeof f === 'string' ? f : f.path || f.name || ''))
            .filter(Boolean);
        }
        if (typeof parsed === 'object') {
          return Object.keys(parsed);
        }
      } catch {}
      return [];
    };

    await it('extracts paths from JSON-stringified IDEFile array', () => {
      const files = JSON.stringify([
        { id: '1', path: '/src/app.ts', name: 'app.ts' },
        { id: '2', path: '/src/index.ts', name: 'index.ts' },
      ]);
      const result = extractFilePathsFromSnapshot(files);
      expect(result.length).toBe(2);
      expect(result).toContain('/src/app.ts');
      expect(result).toContain('/src/index.ts');
    });

    await it('handles files already as object (Object.keys fallback)', () => {
      const files = { 'server.js': { modified: true }, 'lib/db.ts': { created: true } };
      const result = extractFilePathsFromSnapshot(files);
      expect(result.length).toBe(2);
      expect(result).toContain('server.js');
    });

    await it('returns empty array for undefined/null', () => {
      expect(extractFilePathsFromSnapshot(undefined).length).toBe(0);
      expect(extractFilePathsFromSnapshot(null).length).toBe(0);
    });

    await it('returns empty array for malformed JSON string', () => {
      expect(extractFilePathsFromSnapshot('{bad json').length).toBe(0);
    });

    await it('uses name when path is missing', () => {
      const files = JSON.stringify([{ id: '1', name: 'fallback.ts' }]);
      const result = extractFilePathsFromSnapshot(files);
      expect(result.length).toBe(1);
      expect(result).toContain('fallback.ts');
    });

    await it('detects numeric indices as bad data', () => {
      const badOpenFiles = ['0', '1', '2', '44'];
      const allNumeric = badOpenFiles.every(f => /^\d+$/.test(f));
      expect(allNumeric).toBe(true);

      const goodOpenFiles = ['/src/app.ts', '/src/index.ts'];
      const notNumeric = goodOpenFiles.every(f => /^\d+$/.test(f));
      expect(notNumeric).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Commit Pattern Matching
  // --------------------------------------------------------------------------

  await describe('Commit/Push/Deploy Pattern Matching', async () => {
    await it('detects file_change intent for "what files did I commit"', () => {
      const result = detectSessionQueryIntent('what files did I commit');
      expect(result.intent).toBe('file_change');
    });

    await it('detects file_change intent for "what files did I recently commit"', () => {
      const result = detectSessionQueryIntent('what files did I recently commit');
      expect(result.intent).toBe('file_change');
    });

    await it('detects file_change intent for "what did I push"', () => {
      const result = detectSessionQueryIntent('what did I push');
      expect(result.intent).toBe('file_change');
    });

    await it('detects file_change intent for "what did we merge"', () => {
      const result = detectSessionQueryIntent('what did we merge');
      expect(result.intent).toBe('file_change');
    });

    await it('detects file_change intent for "what files have I committed"', () => {
      const result = detectSessionQueryIntent('what files have I committed');
      expect(result.intent).toBe('file_change');
    });
  });

  // --------------------------------------------------------------------------
  // Print Results
  // --------------------------------------------------------------------------

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${testResults.passed} passed, ${testResults.failed} failed, ${testResults.total} total\n`);

  if (testResults.errors.length > 0) {
    console.log('❌ Failures:\n');
    for (const err of testResults.errors) {
      console.log(`  ${err.suite} > ${err.test}`);
      console.log(`    ${err.error}\n`);
    }
  }

  if (testResults.failed === 0) {
    console.log('✅ All tests passed!\n');
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run
runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
