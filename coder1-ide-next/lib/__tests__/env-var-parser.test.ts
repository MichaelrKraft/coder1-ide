/**
 * Tests for env-var-parser.ts and fuzzy-match.ts
 *
 * Run with: npx tsx lib/__tests__/env-var-parser.test.ts
 */

import {
  parseEnvVar,
  parseMultipleEnvVars,
  isValidEnvVarName,
  maskSensitiveValue,
  containsSecret,
} from '../env-var-parser';

import { levenshteinDistance, fuzzyMatch } from '../fuzzy-match';

// ---------------------------------------------------------------------------
// Minimal test harness (no jest/vitest dependency required)
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures: string[] = [];

function describe(name: string, fn: () => void): void {
  console.log(`\n  ${name}`);
  fn();
}

function it(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`    ✓ ${name}`);
  } catch (e: unknown) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`    ✗ ${name}`);
    console.log(`      ${msg}`);
    failures.push(`${name}: ${msg}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      if (a !== e) {
        throw new Error(`Expected ${e} but got ${a}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy but got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || actual <= n) {
        throw new Error(`Expected ${actual} > ${n}`);
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual < n) {
        throw new Error(`Expected ${actual} >= ${n}`);
      }
    },
    toBeLessThan(n: number) {
      if (typeof actual !== 'number' || actual >= n) {
        throw new Error(`Expected ${actual} < ${n}`);
      }
    },
    toHaveLength(n: number) {
      if (!Array.isArray(actual) || actual.length !== n) {
        throw new Error(
          `Expected length ${n} but got ${Array.isArray(actual) ? actual.length : 'non-array'}`
        );
      }
    },
  };
}

// ===========================================================================
// Tests
// ===========================================================================

console.log('\n=== Env Var Parser Tests ===');

// ---------------------------------------------------------------------------
// isValidEnvVarName
// ---------------------------------------------------------------------------
describe('isValidEnvVarName', () => {
  it('accepts standard names', () => {
    expect(isValidEnvVarName('DATABASE_URL')).toBe(true);
    expect(isValidEnvVarName('API_KEY')).toBe(true);
    expect(isValidEnvVarName('NODE_ENV')).toBe(true);
    expect(isValidEnvVarName('_PRIVATE')).toBe(true);
    expect(isValidEnvVarName('a')).toBe(true);
  });

  it('rejects names starting with a digit', () => {
    expect(isValidEnvVarName('1BAD')).toBe(false);
    expect(isValidEnvVarName('0_ZERO')).toBe(false);
  });

  it('rejects names with special characters', () => {
    expect(isValidEnvVarName('MY-VAR')).toBe(false);
    expect(isValidEnvVarName('MY VAR')).toBe(false);
    expect(isValidEnvVarName('MY.VAR')).toBe(false);
    expect(isValidEnvVarName('')).toBe(false);
  });

  it('rejects null/undefined-ish inputs', () => {
    expect(isValidEnvVarName('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseEnvVar
// ---------------------------------------------------------------------------
describe('parseEnvVar', () => {
  it('parses a simple KEY=VALUE', () => {
    expect(parseEnvVar('NODE_ENV=production')).toEqual({
      key: 'NODE_ENV',
      value: 'production',
    });
  });

  it('handles values with = signs', () => {
    const result = parseEnvVar('CONFIG=a=b=c');
    expect(result).toEqual({ key: 'CONFIG', value: 'a=b=c' });
  });

  it('handles postgres connection string with special chars', () => {
    const input = 'DATABASE_URL=postgres://user:p@$$w0rd@host:5432/db?sslmode=require';
    const result = parseEnvVar(input);
    expect(result!.key).toBe('DATABASE_URL');
    expect(result!.value).toBe('postgres://user:p@$$w0rd@host:5432/db?sslmode=require');
  });

  it('handles JSON value', () => {
    const input = 'JSON_CONFIG={"key": "value", "nested": {"a": 1}}';
    const result = parseEnvVar(input);
    expect(result!.key).toBe('JSON_CONFIG');
    expect(result!.value).toBe('{"key": "value", "nested": {"a": 1}}');
  });

  it('handles escaped newline sequences in value', () => {
    const input = 'MULTILINE_VAR=line1\\nline2\\nline3';
    const result = parseEnvVar(input);
    expect(result!.key).toBe('MULTILINE_VAR');
    expect(result!.value).toBe('line1\\nline2\\nline3');
  });

  it('strips surrounding double quotes', () => {
    const result = parseEnvVar('QUOTED_VAR="value with spaces"');
    expect(result!.value).toBe('value with spaces');
  });

  it('strips surrounding single quotes', () => {
    const result = parseEnvVar("QUOTED_VAR='value with spaces'");
    expect(result!.value).toBe('value with spaces');
  });

  it('handles empty value', () => {
    const result = parseEnvVar('EMPTY_VAR=');
    expect(result).toEqual({ key: 'EMPTY_VAR', value: '' });
  });

  it('returns null for missing =', () => {
    expect(parseEnvVar('NO_EQUALS')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseEnvVar('')).toBeNull();
  });

  it('returns null for invalid key', () => {
    expect(parseEnvVar('1BAD=value')).toBeNull();
    expect(parseEnvVar('my-var=value')).toBeNull();
  });

  it('handles value with unicode', () => {
    const result = parseEnvVar('GREETING=Hello, world! \u{1F600}');
    expect(result!.key).toBe('GREETING');
    expect(result!.value).toBe('Hello, world! \u{1F600}');
  });

  it('handles value with dollar signs', () => {
    const result = parseEnvVar('PRICE=$9.99');
    expect(result!.key).toBe('PRICE');
    expect(result!.value).toBe('$9.99');
  });

  it('handles value with @ symbol', () => {
    const result = parseEnvVar('EMAIL=user@example.com');
    expect(result!.key).toBe('EMAIL');
    expect(result!.value).toBe('user@example.com');
  });

  it('trims whitespace around key', () => {
    const result = parseEnvVar('  MY_KEY  =value');
    expect(result!.key).toBe('MY_KEY');
  });
});

// ---------------------------------------------------------------------------
// parseMultipleEnvVars
// ---------------------------------------------------------------------------
describe('parseMultipleEnvVars', () => {
  it('parses comma-separated pairs', () => {
    const result = parseMultipleEnvVars('A=1, B=hello world, C=three');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ key: 'A', value: '1' });
    expect(result[1]).toEqual({ key: 'B', value: 'hello world' });
    expect(result[2]).toEqual({ key: 'C', value: 'three' });
  });

  it('does not split commas inside values when next token is not KEY=', () => {
    const input = 'A=1, B=with, commas, inside, C=end';
    const result = parseMultipleEnvVars(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ key: 'A', value: '1' });
    expect(result[1]).toEqual({ key: 'B', value: 'with, commas, inside' });
    expect(result[2]).toEqual({ key: 'C', value: 'end' });
  });

  it('handles newline-separated pairs', () => {
    const input = 'A=1\nB=2\nC=3';
    const result = parseMultipleEnvVars(input);
    expect(result).toHaveLength(3);
  });

  it('handles connection strings mixed with simple values', () => {
    const input =
      'DATABASE_URL=postgres://user:pass@host:5432/db, REDIS_URL=redis://localhost:6379, NODE_ENV=production';
    const result = parseMultipleEnvVars(input);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe('DATABASE_URL');
    expect(result[0].value).toBe('postgres://user:pass@host:5432/db');
    expect(result[1].key).toBe('REDIS_URL');
    expect(result[2].key).toBe('NODE_ENV');
  });

  it('returns empty array for empty input', () => {
    expect(parseMultipleEnvVars('')).toHaveLength(0);
  });

  it('handles single pair without comma', () => {
    const result = parseMultipleEnvVars('ONLY=one');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ key: 'ONLY', value: 'one' });
  });
});

// ---------------------------------------------------------------------------
// containsSecret
// ---------------------------------------------------------------------------
describe('containsSecret', () => {
  it('detects secret by key name', () => {
    expect(containsSecret('some-value', 'API_KEY')).toBe(true);
    expect(containsSecret('some-value', 'DATABASE_PASSWORD')).toBe(true);
    expect(containsSecret('some-value', 'AUTH_TOKEN')).toBe(true);
    expect(containsSecret('some-value', 'MY_SECRET')).toBe(true);
    expect(containsSecret('some-value', 'ACCESS_KEY_ID')).toBe(true);
    expect(containsSecret('some-value', 'PRIVATE_KEY')).toBe(true);
  });

  it('does not flag non-secret keys', () => {
    expect(containsSecret('some-value', 'NODE_ENV')).toBe(false);
    expect(containsSecret('some-value', 'PORT')).toBe(false);
    expect(containsSecret('some-value', 'LOG_LEVEL')).toBe(false);
  });

  it('detects secret by value pattern', () => {
    expect(containsSecret('sk-live_abc123')).toBe(true);
    expect(containsSecret('ghp_abc123')).toBe(true);
    expect(containsSecret('xoxb-123-456')).toBe(true);
    expect(containsSecret('eyJhbGciOiJIUzI1NiJ9')).toBe(true);
    expect(containsSecret('Bearer eyJabc')).toBe(true);
  });

  it('detects credentials in URLs', () => {
    expect(containsSecret('postgres://admin:SuperSecret@db.example.com/mydb')).toBe(true);
    expect(containsSecret('redis://default:mypass@redis.host:6379')).toBe(true);
  });

  it('does not flag plain URLs without credentials', () => {
    expect(containsSecret('https://example.com/path')).toBe(false);
    expect(containsSecret('redis://localhost:6379')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// maskSensitiveValue
// ---------------------------------------------------------------------------
describe('maskSensitiveValue', () => {
  it('masks password in URL', () => {
    const result = maskSensitiveValue('postgres://user:SuperSecret@host:5432/db');
    expect(result).toBe('postgres://user:****@host:5432/db');
  });

  it('masks generic long secrets showing first 4 chars', () => {
    const result = maskSensitiveValue('sk-live_abcdefgh12345');
    expect(result).toBe('sk-l****');
  });

  it('fully masks short values', () => {
    expect(maskSensitiveValue('abc')).toBe('****');
    expect(maskSensitiveValue('12345678')).toBe('****');
  });

  it('returns empty string unchanged', () => {
    expect(maskSensitiveValue('')).toBe('');
  });

  it('masks redis URL with password', () => {
    const result = maskSensitiveValue('redis://default:mypassword@redis.host:6379');
    expect(result).toBe('redis://default:****@redis.host:6379');
  });
});

// ---------------------------------------------------------------------------
// levenshteinDistance
// ---------------------------------------------------------------------------
describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('handles empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('computes correct distance for simple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
  });

  it('is case-insensitive', () => {
    expect(levenshteinDistance('Hello', 'hello')).toBe(0);
    expect(levenshteinDistance('ABC', 'abc')).toBe(0);
  });

  it('handles single character differences', () => {
    expect(levenshteinDistance('cat', 'car')).toBe(1);
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// fuzzyMatch
// ---------------------------------------------------------------------------
describe('fuzzyMatch', () => {
  const services = [
    'coder1-prod',
    'coder1-staging',
    'coder1-worker',
    'api-gateway',
    'redis-cache',
  ];

  it('returns exact match with confidence 1.0', () => {
    const results = fuzzyMatch('coder1-prod', services);
    expect(results[0].option).toBe('coder1-prod');
    expect(results[0].confidence).toBe(1);
  });

  it('matches with typos', () => {
    const results = fuzzyMatch('coder1-pord', services);
    expect(results[0].option).toBe('coder1-prod');
    expect(results[0].confidence).toBeGreaterThan(0.8);
  });

  it('matches partial names with lower threshold', () => {
    // "prod" (4 chars) vs "coder1-prod" (11 chars) has high edit distance,
    // so we lower the threshold to allow short substring-like matches
    const results = fuzzyMatch('prod', services, 0.3);
    const prodMatch = results.find((r) => r.option === 'coder1-prod');
    expect(prodMatch !== undefined).toBe(true);
  });

  it('returns empty for no matches above threshold', () => {
    const results = fuzzyMatch('zzzzzzzzzzz', services, 0.5);
    expect(results).toHaveLength(0);
  });

  it('returns empty for empty query', () => {
    expect(fuzzyMatch('', services)).toHaveLength(0);
  });

  it('returns empty for empty options', () => {
    expect(fuzzyMatch('query', [])).toHaveLength(0);
  });

  it('returns results sorted by confidence descending', () => {
    const results = fuzzyMatch('coder1', services);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].confidence <= results[i - 1].confidence).toBe(true);
    }
  });

  it('handles case-insensitive matching', () => {
    const results = fuzzyMatch('CODER1-PROD', services);
    expect(results[0].option).toBe('coder1-prod');
    expect(results[0].confidence).toBe(1);
  });
});

// ===========================================================================
// Summary
// ===========================================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\n  Failures:');
  for (const f of failures) {
    console.log(`    - ${f}`);
  }
}
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
