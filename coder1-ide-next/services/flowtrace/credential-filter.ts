/**
 * FlowTrace Credential Filter
 *
 * Detects sensitive data in screen captures and prevents them from being
 * embedded or stored. This is the trust foundation of FlowTrace — if this
 * fails, users lose trust permanently.
 */

// ============================================================================
// Sensitive Pattern Detection
// ============================================================================

const SENSITIVE_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/,                          // OpenAI API keys
  /AKIA[0-9A-Z]{16}/,                              // AWS access keys
  /ASIA[0-9A-Z]{16}/,                              // AWS temporary keys
  /ghp_[a-zA-Z0-9]{36}/,                          // GitHub Personal Access Tokens
  /gho_[a-zA-Z0-9]{36}/,                          // GitHub OAuth tokens
  /ghs_[a-zA-Z0-9]{36}/,                          // GitHub Apps tokens
  /xoxb-[0-9A-Za-z-]{50,}/,                       // Slack bot tokens
  /xoxp-[0-9A-Za-z-]{50,}/,                       // Slack user tokens
  /password\s*[:=]\s*['"]?\S+/i,                   // password= assignments
  /passwd\s*[:=]\s*['"]?\S+/i,                     // passwd= assignments
  /secret\s*[:=]\s*['"]?\S+/i,                    // secret= assignments
  /api[_-]?key\s*[:=]\s*['"]?\S+/i,              // api_key= / apikey= assignments
  /private[_-]?key\s*[:=]\s*['"]?\S+/i,          // private_key= assignments
  /auth[_-]?token\s*[:=]\s*['"]?\S+/i,           // auth_token= assignments
  /access[_-]?token\s*[:=]\s*['"]?\S+/i,         // access_token= assignments
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/,             // Bearer tokens in headers
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,     // PEM private keys
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,  // JWT tokens (header.payload)
  /pk_live_[a-zA-Z0-9]{24}/,                      // Stripe live publishable keys
  /sk_live_[a-zA-Z0-9]{24}/,                      // Stripe live secret keys
  /rk_live_[a-zA-Z0-9]{24}/,                      // Stripe live restricted keys
];

// App names that should never be captured
const EXCLUDED_APPS: Set<string> = new Set([
  '1password',
  '1password 7',
  'keychain access',
  'bitwarden',
  'lastpass',
  'dashlane',
  'keepassxc',
  'zoom',
  'zoom.us',
  'microsoft teams',
  'google meet',
  'webex',
  'facetime',
  'signal',
  'whatsapp',
  'telegram',
  'discord', // Optional - some devs ok with this, but safe default
]);

// Browser domains that should never be captured
const EXCLUDED_DOMAINS: readonly string[] = [
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citibank.com',
  'paypal.com',
  'venmo.com',
  'cashapp.com',
  'robinhood.com',
  'coinbase.com',
  'kraken.com',
  'binance.com',
  'turbotax.com',
  'h&rblock.com',
  'irs.gov',
  'socialsecurity.gov',
  'healthcare.gov',
];

// File path patterns visible in window titles that indicate sensitive files
const SENSITIVE_FILE_PATTERNS: RegExp[] = [
  /\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /credentials\.json/i,
  /secrets\.json/i,
  /service-account/i,
];

// ============================================================================
// Public API
// ============================================================================

export interface FilterResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Checks if a screen frame should be captured.
 * Returns { allowed: false, reason } if the frame should be skipped.
 */
export function shouldCapture(
  ocrText: string,
  appName: string,
  windowTitle: string,
  url?: string
): FilterResult {
  // Check app exclusions
  const normalizedApp = appName.toLowerCase();
  for (const excluded of EXCLUDED_APPS) {
    if (normalizedApp.includes(excluded)) {
      return { allowed: false, reason: `excluded app: ${appName}` };
    }
  }

  // Check URL domain exclusions (for browser frames)
  if (url) {
    const normalizedUrl = url.toLowerCase();
    for (const domain of EXCLUDED_DOMAINS) {
      if (normalizedUrl.includes(domain)) {
        return { allowed: false, reason: `excluded domain: ${domain}` };
      }
    }
  }

  // Check window title for sensitive file paths
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(windowTitle)) {
      return { allowed: false, reason: `sensitive file in window title: ${windowTitle}` };
    }
  }

  // Check OCR text for credential patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(ocrText)) {
      return { allowed: false, reason: 'sensitive credential pattern detected in screen text' };
    }
  }

  return { allowed: true };
}

/**
 * Returns user-facing excluded apps list for the settings UI.
 */
export function getExcludedApps(): string[] {
  return Array.from(EXCLUDED_APPS).sort();
}

/**
 * Returns user-facing excluded domains list for the settings UI.
 */
export function getExcludedDomains(): string[] {
  return [...EXCLUDED_DOMAINS].sort();
}
