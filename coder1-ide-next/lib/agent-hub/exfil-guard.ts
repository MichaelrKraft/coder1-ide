const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,
  /sk-[a-zA-Z0-9\-_]{20,}/g,
  /AIza[a-zA-Z0-9\-_]{35}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /ghs_[a-zA-Z0-9]{36}/g,
  /xoxb-[0-9\-a-zA-Z]{50,}/g,
  /xoxp-[0-9\-a-zA-Z]{50,}/g,
  /AKIA[A-Z0-9]{16}/g,
  // base64 pattern: require padding (= or ==) to reduce false positives
  /[a-zA-Z0-9+/]{40,}={1,2}/g,
  /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /password\s*[:=]\s*["']?[^\s"']{8,}["']?/gi,
  /secret\s*[:=]\s*["']?[^\s"']{8,}["']?/gi,
  /token\s*[:=]\s*["']?[^\s"']{20,}["']?/gi,
  /api[_-]?key\s*[:=]\s*["']?[^\s"']{10,}["']?/gi,
];

const REDACTED = '[REDACTED]';

/** Returns Shannon entropy in bits per character. High-entropy strings (>4.5) are likely secrets. */
function shannonEntropy(s: string): number {
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export interface ScanResult {
  clean: string;
  redacted: boolean;
  patternsFound: number;
}

// Index of the base64 pattern in SECRET_PATTERNS (requires entropy gate)
const BASE64_PATTERN_INDEX = 8;
const BASE64_ENTROPY_THRESHOLD = 4.5;

export function scanForSecrets(text: string): ScanResult {
  let clean = text;
  let patternsFound = 0;

  for (let i = 0; i < SECRET_PATTERNS.length; i++) {
    const pattern = SECRET_PATTERNS[i];
    // Reset lastIndex since patterns use /g flag
    pattern.lastIndex = 0;

    if (i === BASE64_PATTERN_INDEX) {
      // Apply entropy gate to base64 pattern to avoid false positives on UUIDs and run IDs
      const before = clean;
      clean = clean.replace(pattern, (match) =>
        shannonEntropy(match) > BASE64_ENTROPY_THRESHOLD ? REDACTED : match
      );
      if (clean !== before) patternsFound++;
    } else {
      const before = clean;
      clean = clean.replace(pattern, REDACTED);
      if (clean !== before) patternsFound++;
    }
  }

  return { clean, redacted: patternsFound > 0, patternsFound };
}
