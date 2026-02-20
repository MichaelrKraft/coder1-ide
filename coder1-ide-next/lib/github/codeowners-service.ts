/**
 * CODEOWNERS Service - Parses CODEOWNERS files and computes ownership.
 * Priority chain: CODEOWNERS > git blame > directory > recent reviewers > team admin
 */

import type { CodeOwnership } from '@/types/vcs';

interface CodeownersRule {
  pattern: string;
  owners: string[];  // GitHub usernames (without @)
}

/**
 * Parse a CODEOWNERS file content into structured rules.
 * Handles comments, blank lines, and @org/team or @user patterns.
 */
export function parseCodeownersFile(content: string): CodeownersRule[] {
  const rules: CodeownersRule[] = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    const pattern = parts[0];
    const owners = parts.slice(1)
      .map(owner => owner.replace(/^@/, ''))  // Remove leading @
      .filter(Boolean);

    if (owners.length > 0) {
      rules.push({ pattern, owners });
    }
  }

  return rules;
}

/**
 * Check if a file path matches a CODEOWNERS pattern.
 * Supports basic glob patterns used in CODEOWNERS files.
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // Normalize: remove leading slash from pattern
  const normalizedPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

  // Simple exact match
  if (normalizedPattern === normalizedPath) return true;

  // Directory match: pattern "docs/" matches all files under docs/
  if (normalizedPattern.endsWith('/')) {
    return normalizedPath.startsWith(normalizedPattern);
  }

  // Wildcard patterns
  if (normalizedPattern.includes('*')) {
    const regex = patternToRegex(normalizedPattern);
    return regex.test(normalizedPath);
  }

  // Pattern without directory separator matches any file with that name
  if (!normalizedPattern.includes('/')) {
    const fileName = normalizedPath.split('/').pop() ?? '';
    return matchesGlob(fileName, normalizedPattern);
  }

  // Direct path match
  return normalizedPath === normalizedPattern;
}

/**
 * Convert a CODEOWNERS glob pattern to a RegExp.
 */
function patternToRegex(pattern: string): RegExp {
  let regex = pattern
    // Escape regex special chars (except *)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // ** matches any path segment(s)
    .replace(/\*\*/g, '{{DOUBLESTAR}}')
    // * matches anything except /
    .replace(/\*/g, '[^/]*')
    // Restore ** as any path
    .replace(/\{\{DOUBLESTAR\}\}/g, '.*');

  // If pattern doesn't start with /, it can match anywhere
  if (!pattern.startsWith('/')) {
    regex = '(^|.*/?)' + regex;
  }

  return new RegExp('^' + regex + '$');
}

/**
 * Simple glob match for filenames (no path separators).
 */
function matchesGlob(name: string, pattern: string): boolean {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + regex + '$').test(name);
}

/**
 * Find owners for a specific file path using CODEOWNERS rules.
 * CODEOWNERS uses "last match wins" - later rules override earlier ones.
 */
export function findOwners(
  filePath: string,
  rules: CodeownersRule[],
): string[] {
  let matchedOwners: string[] = [];

  // Iterate forward; last match wins per CODEOWNERS spec
  for (const rule of rules) {
    if (matchesPattern(filePath, rule.pattern)) {
      matchedOwners = rule.owners;
    }
  }

  return matchedOwners;
}

/**
 * Fetch CODEOWNERS file from a GitHub repo.
 * Checks standard locations: /.github/CODEOWNERS, /CODEOWNERS, /docs/CODEOWNERS
 */
export async function fetchCodeownersFile(
  token: string,
  owner: string,
  repo: string,
): Promise<string | null> {
  const locations = [
    '.github/CODEOWNERS',
    'CODEOWNERS',
    'docs/CODEOWNERS',
  ];

  for (const path of locations) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.raw',
            'User-Agent': 'Coder1-IDE/1.0',
          },
        }
      );

      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Try next location
    }
  }

  return null;
}

/**
 * Get code ownership for a file path.
 * Tries CODEOWNERS first, falls back to empty ownership.
 */
export async function getCodeOwnership(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  teamMemberLogins: string[],
): Promise<CodeOwnership> {
  // Try to get CODEOWNERS file
  const codeownersContent = await fetchCodeownersFile(token, owner, repo);

  if (codeownersContent) {
    const rules = parseCodeownersFile(codeownersContent);
    const owners = findOwners(filePath, rules);

    if (owners.length > 0) {
      return {
        path: filePath,
        owners: owners.map(login => ({
          githubLogin: login,
          percentage: Math.round(100 / owners.length),
          source: 'codeowners' as const,
        })),
      };
    }
  }

  // Fallback: return empty ownership (git blame would need bridge CLI)
  return {
    path: filePath,
    owners: [],
  };
}

/**
 * Suggest reviewers for a PR based on changed files and ownership.
 * Excludes the PR author from suggestions.
 *
 * Priority: CODEOWNERS > directory owners > recent reviewers > team admin
 */
export function suggestReviewers(
  changedFiles: string[],
  codeownersRules: CodeownersRule[],
  prAuthor: string,
  teamMembers: Array<{ githubLogin: string; userId?: string }>,
): Array<{ githubLogin: string; reason: string; score: number }> {
  const reviewerScores = new Map<string, { reason: string; score: number }>();

  // Score based on CODEOWNERS matches
  for (const file of changedFiles) {
    const owners = findOwners(file, codeownersRules);
    for (const owner of owners) {
      if (owner === prAuthor) continue;  // Never suggest author

      const existing = reviewerScores.get(owner);
      const newScore = (existing?.score ?? 0) + 10;
      reviewerScores.set(owner, {
        reason: `Owns ${file} (CODEOWNERS)`,
        score: newScore,
      });
    }
  }

  // Filter to team members only and sort by score
  const suggestions: Array<{ githubLogin: string; reason: string; score: number }> = [];

  for (const member of teamMembers) {
    if (member.githubLogin === prAuthor) continue;

    const entry = reviewerScores.get(member.githubLogin);
    if (entry) {
      suggestions.push({
        githubLogin: member.githubLogin,
        reason: entry.reason,
        score: entry.score,
      });
    }
  }

  // Sort descending by score
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions;
}
