const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,
  /sk-[a-zA-Z0-9\-_]{20,}/g,
  /AIza[a-zA-Z0-9\-_]{35}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /ghs_[a-zA-Z0-9]{36}/g,
  /xoxb-[0-9\-a-zA-Z]{50,}/g,
  /xoxp-[0-9\-a-zA-Z]{50,}/g,
  /AKIA[A-Z0-9]{16}/g,
  /[a-zA-Z0-9+/]{40}(?:[a-zA-Z0-9+/]{4})*={0,2}/g,
  /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /password\s*[:=]\s*["']?[^\s"']{8,}["']?/gi,
  /secret\s*[:=]\s*["']?[^\s"']{8,}["']?/gi,
  /token\s*[:=]\s*["']?[^\s"']{20,}["']?/gi,
  /api[_-]?key\s*[:=]\s*["']?[^\s"']{10,}["']?/gi,
];

const REDACTED = '[REDACTED]';

export interface ScanResult {
  clean: string;
  redacted: boolean;
  patternsFound: number;
}

export function scanForSecrets(text: string): ScanResult {
  let clean = text;
  let patternsFound = 0;

  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex since patterns use /g flag
    pattern.lastIndex = 0;
    const before = clean;
    clean = clean.replace(pattern, REDACTED);
    if (clean !== before) patternsFound++;
  }

  return { clean, redacted: patternsFound > 0, patternsFound };
}
