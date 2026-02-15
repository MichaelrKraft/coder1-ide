/**
 * Skill Security Scanner
 *
 * Pattern-based scanner that checks SKILL.md content before installation.
 * Defends against malicious skills (ClawHavoc-style attacks).
 *
 * Severity levels:
 * - danger: Block install entirely
 * - warning: Allow with user approval
 * - info: Log only, auto-approve
 */

import type { SkillSecurityFinding, SkillSecurityReport } from '@/types/johnny5';

// ============================================================================
// Dangerous Patterns (Block Install)
// ============================================================================

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /curl\s+.*\|\s*(sh|bash|zsh)/i,
    description: 'Pipes remote content to shell execution',
  },
  {
    pattern: /wget\s+.*\|\s*(sh|bash|zsh)/i,
    description: 'Pipes remote download to shell execution',
  },
  {
    pattern: /base64\s+(--decode|-d)\s*.*\|\s*(sh|bash|eval)/i,
    description: 'Decodes and executes base64-encoded commands',
  },
  {
    pattern: /eval\s*\(\s*atob\s*\(/i,
    description: 'JavaScript eval with base64 decoding',
  },
  {
    pattern: /~\/\.ssh\//i,
    description: 'Accesses SSH credentials directory',
  },
  {
    pattern: /~\/\.aws\//i,
    description: 'Accesses AWS credentials directory',
  },
  {
    pattern: /~\/\.env/i,
    description: 'Accesses environment file with secrets',
  },
  {
    pattern: /\/etc\/passwd/i,
    description: 'Accesses system password file',
  },
  {
    pattern: /\/etc\/shadow/i,
    description: 'Accesses system shadow password file',
  },
  {
    pattern: /id_rsa|id_ed25519|id_ecdsa/i,
    description: 'References SSH private keys',
  },
  {
    pattern: /credentials\.json|service[-_]?account.*\.json/i,
    description: 'References credential files',
  },
  {
    pattern: /eval\s*\(\s*["'`].*["'`]\s*\)/,
    description: 'Dynamic code execution via eval',
  },
  {
    pattern: /\$\(curl\s/i,
    description: 'Command substitution with remote fetch',
  },
  {
    pattern: /nc\s+-[elp]|ncat\s+-/i,
    description: 'Netcat reverse shell pattern',
  },
  {
    pattern: />(\/dev\/tcp|\/dev\/udp)\//i,
    description: 'Bash reverse shell via /dev/tcp',
  },
];

// ============================================================================
// Warning Patterns (Require User Approval)
// ============================================================================

const WARNING_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /execute_bash/i,
    description: 'Uses bash command execution',
  },
  {
    pattern: /\bcurl\b|\bwget\b|\bfetch\b/i,
    description: 'Makes external network requests',
  },
  {
    pattern: /fs\.write|writeFile|writeFileSync/i,
    description: 'Writes to filesystem',
  },
  {
    pattern: /process\.env\b|\$[A-Z_]+/,
    description: 'Reads environment variables',
  },
  {
    pattern: /require\s*\(\s*['"]child_process['"]\s*\)/,
    description: 'Imports child_process module',
  },
  {
    pattern: /\bexec\b|\bspawn\b|\bexecSync\b/,
    description: 'Executes system commands',
  },
  {
    pattern: /rm\s+-rf?\s/i,
    description: 'Recursive file deletion',
  },
  {
    pattern: /chmod\s+[0-7]{3,4}/,
    description: 'Changes file permissions',
  },
  {
    pattern: /\.npmrc|\.pypirc|\.netrc/i,
    description: 'References package manager credentials',
  },
  {
    pattern: /keychain|keyring|credential[-_]?store/i,
    description: 'Accesses system credential storage',
  },
];

// ============================================================================
// Scanner
// ============================================================================

/**
 * Scan SKILL.md content for security issues
 */
export function scanSkillContent(skillId: string, content: string): SkillSecurityReport {
  const findings: SkillSecurityFinding[] = [];
  const lines = content.split('\n');

  // Check each line against dangerous patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { pattern, description } of DANGEROUS_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          severity: 'danger',
          pattern: pattern.source.slice(0, 50),
          description,
          line: i + 1,
        });
      }
    }

    for (const { pattern, description } of WARNING_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          severity: 'warning',
          pattern: pattern.source.slice(0, 50),
          description,
          line: i + 1,
        });
      }
    }
  }

  // Also check full content for multi-line patterns
  const fullContentPatterns: Array<{ pattern: RegExp; description: string; severity: 'danger' | 'warning' }> = [
    {
      pattern: /```(?:bash|sh|shell)\s*\n(?:.*\n)*?.*(?:curl|wget).*\|.*(?:sh|bash)/im,
      description: 'Code block with piped remote execution',
      severity: 'danger',
    },
    {
      pattern: /```(?:bash|sh|shell)\s*\n(?:.*\n)*?.*(?:rm\s+-rf\s+[\/~])/im,
      description: 'Code block with dangerous recursive deletion',
      severity: 'danger',
    },
  ];

  for (const { pattern, description, severity } of fullContentPatterns) {
    if (pattern.test(content)) {
      findings.push({
        severity,
        pattern: pattern.source.slice(0, 50),
        description,
      });
    }
  }

  // Deduplicate findings by description
  const seen = new Set<string>();
  const uniqueFindings = findings.filter(f => {
    const key = `${f.severity}:${f.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Determine overall score
  const hasDanger = uniqueFindings.some(f => f.severity === 'danger');
  const hasWarning = uniqueFindings.some(f => f.severity === 'warning');

  let score: 'safe' | 'warning' | 'dangerous';
  if (hasDanger) {
    score = 'dangerous';
  } else if (hasWarning) {
    score = 'warning';
  } else {
    score = 'safe';
  }

  return {
    skillId,
    score,
    findings: uniqueFindings,
    scannedAt: new Date(),
  };
}

/**
 * Quick check if content is safe (no dangerous patterns)
 */
export function isContentSafe(content: string): boolean {
  for (const { pattern } of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) return false;
  }
  return true;
}
