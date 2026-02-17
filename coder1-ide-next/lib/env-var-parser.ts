/**
 * Environment Variable Parser
 *
 * Robust parsing utilities for KEY=VALUE pairs with special character handling.
 * Used by the Deployment Assistant to parse env vars from natural language input.
 */

/**
 * Validate that a string is a legal environment variable name.
 * Must start with a letter or underscore, followed by letters, digits, or underscores.
 */
export function isValidEnvVarName(name: string): boolean {
  if (!name || name.length === 0) return false;
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/**
 * Parse a single KEY=VALUE string.
 * VALUE is everything after the FIRST '=' sign, preserving special characters.
 * Strips optional surrounding quotes from the value.
 *
 * Returns null for invalid input.
 */
export function parseEnvVar(input: string): { key: string; value: string } | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  const eqIndex = trimmed.indexOf('=');

  if (eqIndex === -1) return null;

  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1);

  if (!isValidEnvVarName(key)) return null;

  // Strip matching surrounding quotes (single or double)
  if (
    value.length >= 2 &&
    ((value[0] === '"' && value[value.length - 1] === '"') ||
      (value[0] === "'" && value[value.length - 1] === "'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

/**
 * Parse multiple KEY=VALUE pairs from natural language input.
 *
 * Strategy: split on commas only when the token after the comma starts
 * a new KEY= pattern. This avoids splitting commas that appear inside values
 * (e.g. connection strings, JSON).
 *
 * Also handles newline-separated pairs.
 */
export function parseMultipleEnvVars(
  input: string
): Array<{ key: string; value: string }> {
  if (!input || typeof input !== 'string') return [];

  // Normalise: replace literal \n with real newlines
  const normalised = input.replace(/\\n/g, '\n');

  // Split on newlines first to handle multi-line input
  const lines = normalised.split('\n').filter((l) => l.trim().length > 0);

  const results: Array<{ key: string; value: string }> = [];

  for (const line of lines) {
    // Within a single line, split on comma-boundaries that precede a valid KEY=
    const pairs = splitOnEnvVarBoundaries(line);
    for (const pair of pairs) {
      const parsed = parseEnvVar(pair);
      if (parsed) {
        results.push(parsed);
      }
    }
  }

  return results;
}

/**
 * Split a line into segments at comma positions where the next segment
 * starts with a valid env var name followed by '='.
 */
function splitOnEnvVarBoundaries(line: string): string[] {
  const segments: string[] = [];
  let current = '';

  // Regex to test if a string starts with a valid env var name then '='
  const startsWithKeyEq = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === ',') {
      const remaining = line.slice(i + 1);
      if (startsWithKeyEq.test(remaining)) {
        // This comma is a boundary
        segments.push(current);
        current = '';
        continue;
      }
    }
    current += line[i];
  }

  if (current.trim().length > 0) {
    segments.push(current);
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Secret Detection & Masking
// ---------------------------------------------------------------------------

/** Patterns that indicate a value is a secret */
const SECRET_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
  /access[_-]?key/i,
];

/** Patterns in values that look like secrets */
const SECRET_VALUE_PATTERNS = [
  /^sk[-_]/i, // Stripe-style keys
  /^pk[-_]/i,
  /^ghp_/, // GitHub PATs
  /^gho_/,
  /^ghu_/,
  /^ghs_/,
  /^github_pat_/,
  /^xoxb-/, // Slack tokens
  /^xoxp-/,
  /^Bearer\s+/i,
  /^Basic\s+/i,
  /^eyJ/, // JWT
];

/**
 * Detect if a key name or value likely contains a secret.
 */
export function containsSecret(value: string, key?: string): boolean {
  if (key) {
    for (const pattern of SECRET_KEY_PATTERNS) {
      if (pattern.test(key)) return true;
    }
  }

  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.test(value)) return true;
  }

  // Check for password-in-URL pattern: ://user:pass@host
  if (/:[^/]+@/.test(value) && value.includes('://')) return true;

  return false;
}

/**
 * Mask sensitive parts of a value for display.
 *
 * Handles:
 * - URLs with embedded credentials: postgres://user:password@host -> postgres://user:****@host
 * - Generic secrets: show first 4 chars, mask rest
 * - Short values: fully masked
 */
export function maskSensitiveValue(value: string): string {
  if (!value || value.length === 0) return value;

  // URL with credentials pattern: scheme://user:password@host
  const urlWithCreds = /^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^:]+:)([^@]+)(@.+)$/;
  const urlMatch = value.match(urlWithCreds);
  if (urlMatch) {
    return `${urlMatch[1]}****${urlMatch[3]}`;
  }

  // Short values get fully masked
  if (value.length <= 8) {
    return '****';
  }

  // Show first 4 characters, mask the rest
  return value.slice(0, 4) + '****';
}
