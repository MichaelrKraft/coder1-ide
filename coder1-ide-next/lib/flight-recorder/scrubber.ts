/**
 * SecretScrubber — Sanitizes sensitive data from Flight Recorder events.
 * Runs before any data is written to disk. Pure functions, no I/O.
 */

interface ScrubResult {
  text: string;
  wasRedacted: boolean;
}

const API_KEY_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: '[REDACTED_API_KEY]' },
  { pattern: /sk-ant-[a-zA-Z0-9-]{20,}/g, replacement: '[REDACTED_API_KEY]' },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { pattern: /gho_[a-zA-Z0-9]{36,}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { pattern: /github_pat_[a-zA-Z0-9_]{20,}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { pattern: /xoxb-[a-zA-Z0-9-]+/g, replacement: '[REDACTED_SLACK_TOKEN]' },
  { pattern: /xoxp-[a-zA-Z0-9-]+/g, replacement: '[REDACTED_SLACK_TOKEN]' },
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED_AWS_KEY]' },
  { pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, replacement: '[REDACTED_JWT]' },
];

const TOKEN_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(Bearer\s+)[a-zA-Z0-9._\-/+=]{10,}/gi, replacement: '$1[REDACTED_TOKEN]' },
  { pattern: /(Authorization:\s*)[^\s\n]+/gi, replacement: '$1[REDACTED_TOKEN]' },
];

const SECRET_VALUE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(ANTHROPIC_API_KEY|OPENAI_API_KEY|AWS_SECRET_ACCESS_KEY|DATABASE_URL|REDIS_URL|SUPABASE_KEY|STRIPE_SECRET_KEY)[=:]\s*\S+/gi, replacement: '$1=[REDACTED]' },
  { pattern: /(password|passwd|pwd|secret|token|apikey|api_key)\s*[:=]\s*\S+/gi, replacement: '$1=[REDACTED]' },
];

const PEM_PATTERN = /-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE KEY-----/g;

const ENV_LINE_PATTERN = /^[A-Z][A-Z0-9_]+=.+$/gm;

const PASSWORD_PROMPT_PATTERNS = [
  /password\s*:/i,
  /enter\s+passphrase/i,
  /sudo\s+/i,
  /\[sudo\]/i,
  /enter\s+password/i,
  /authentication\s+required/i,
  /login\s*:/i,
];

function applyPatterns(text: string, patterns: Array<{ pattern: RegExp; replacement: string }>): ScrubResult {
  let wasRedacted = false;
  let result = text;

  for (const { pattern, replacement } of patterns) {
    const newResult = result.replace(pattern, replacement);
    if (newResult !== result) {
      wasRedacted = true;
      result = newResult;
    }
  }

  return { text: result, wasRedacted };
}

class SecretScrubber {
  /** Standard scrub — runs on every event before storage */
  scrub(text: string): ScrubResult {
    if (!text) return { text, wasRedacted: false };

    let wasRedacted = false;

    const keyResult = applyPatterns(text, API_KEY_PATTERNS);
    if (keyResult.wasRedacted) wasRedacted = true;

    const tokenResult = applyPatterns(keyResult.text, TOKEN_PATTERNS);
    if (tokenResult.wasRedacted) wasRedacted = true;

    const secretResult = applyPatterns(tokenResult.text, SECRET_VALUE_PATTERNS);
    if (secretResult.wasRedacted) wasRedacted = true;

    let finalText = secretResult.text;
    const pemReplaced = finalText.replace(PEM_PATTERN, '[REDACTED_PRIVATE_KEY]');
    if (pemReplaced !== finalText) {
      wasRedacted = true;
      finalText = pemReplaced;
    }

    return { text: finalText, wasRedacted };
  }

  /** Deep scrub — more aggressive, runs before export/sharing */
  deepScrub(text: string): ScrubResult {
    if (!text) return { text, wasRedacted: false };

    const standardResult = this.scrub(text);
    let { text: scrubbed, wasRedacted } = standardResult;

    // Scrub any line that looks like an env variable assignment
    const envScrubbed = scrubbed.replace(ENV_LINE_PATTERN, (match) => {
      const eqIndex = match.indexOf('=');
      if (eqIndex === -1) return match;
      wasRedacted = true;
      return match.substring(0, eqIndex + 1) + '[REDACTED]';
    });

    // Scrub any remaining long hex/base64 strings (potential secrets)
    const hexScrubbed = envScrubbed.replace(/[a-f0-9]{40,}/gi, '[REDACTED_HASH]');
    if (hexScrubbed !== envScrubbed) wasRedacted = true;

    return { text: hexScrubbed, wasRedacted };
  }

  /** Detect if terminal output indicates a password prompt */
  isPasswordPrompt(text: string): boolean {
    return PASSWORD_PROMPT_PATTERNS.some((pattern) => pattern.test(text));
  }
}

export const secretScrubber = new SecretScrubber();
