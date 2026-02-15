/**
 * ClawHub Adapter Service
 *
 * Client for ClawHub's public API (https://clawhub.ai/api/v1).
 * Handles searching, fetching, and installing community skills.
 *
 * Internal service — user-facing UI brands this as "Skills Store".
 */

import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';
import matter from 'gray-matter';
import { scanSkillContent } from './skill-security-scanner';
import type {
  ClawHubSkillSummary,
  ClawHubSkillDetail,
  ClawHubSearchResponse,
  SkillCompatibility,
  SkillSecurityReport,
} from '@/types/johnny5';

// ============================================================================
// Configuration
// ============================================================================

const CLAWHUB_BASE_URL = 'https://clawhub.ai/api/v1';
const CLAWHUB_SKILLS_DIR = path.join(homedir(), '.coder1', 'skills', 'clawhub');
const MAX_SKILL_SIZE = 200 * 1024; // 200KB limit
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for search results
const DETAIL_CACHE_TTL = 60 * 60 * 1000; // 1 hour for skill details

// ============================================================================
// In-Memory Cache
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expires: Date.now() + ttl });
}

// ============================================================================
// API Client
// ============================================================================

async function fetchClawHub<T>(
  endpoint: string,
  options?: { timeout?: number }
): Promise<T> {
  const url = `${CLAWHUB_BASE_URL}${endpoint}`;
  const timeout = options?.timeout ?? 10000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Coder1-Johnny5/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      // Check rate limiting
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (response.status === 429 || (remaining && parseInt(remaining) === 0)) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Retry after ${retryAfter || '60'} seconds.`);
      }
      throw new Error(`ClawHub API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Search for skills on ClawHub
 */
export async function searchSkills(
  query: string,
  options?: { limit?: number; cursor?: string; sort?: string }
): Promise<ClawHubSearchResponse> {
  const limit = options?.limit ?? 20;
  const cacheKey = `search:${query}:${limit}:${options?.cursor || ''}:${options?.sort || ''}`;

  const cached = getCached<ClawHubSearchResponse>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (options?.cursor) params.set('cursor', options.cursor);
  if (options?.sort) params.set('sort', options.sort);

  const raw = await fetchClawHub<{ results?: Array<Record<string, unknown>>; hasMore?: boolean; cursor?: string }>(`/search?${params}`);

  // Transform raw ClawHub response to our expected format (API may omit some fields)
  const result: ClawHubSearchResponse = {
    results: (raw.results || []).map((r) => ({
      slug: (r.slug as string) || '',
      displayName: (r.displayName as string) || formatDisplayName((r.slug as string) || ''),
      summary: (r.summary as string) || '',
      version: (r.version as string) || '0.0.0',
      downloads: (r.downloads as number) ?? 0,
      stars: (r.stars as number) ?? 0,
      updatedAt: String(r.updatedAt || ''),
      score: (r.score as number) ?? 0,
    })),
    hasMore: !!raw.hasMore,
    cursor: raw.cursor,
  };

  setCache(cacheKey, result, CACHE_TTL);
  return result;
}

/**
 * Get detailed info about a specific skill
 */
export async function getSkillDetails(slug: string): Promise<ClawHubSkillDetail> {
  const cacheKey = `detail:${slug}`;
  const cached = getCached<ClawHubSkillDetail>(cacheKey);
  if (cached) return cached;

  const result = await fetchClawHub<ClawHubSkillDetail>(`/skills/${encodeURIComponent(slug)}`);
  setCache(cacheKey, result, DETAIL_CACHE_TTL);
  return result;
}

/**
 * Fetch raw SKILL.md content for a skill
 */
export async function getSkillContent(
  slug: string,
  version?: string
): Promise<string> {
  const params = new URLSearchParams({ path: 'SKILL.md' });
  if (version) params.set('version', version);

  const url = `${CLAWHUB_BASE_URL}/skills/${encodeURIComponent(slug)}/file?${params}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Coder1-Johnny5/1.0' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SKILL.md: ${response.status}`);
    }

    const content = await response.text();
    if (content.length > MAX_SKILL_SIZE) {
      throw new Error(`Skill content exceeds ${MAX_SKILL_SIZE / 1024}KB limit`);
    }

    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Install a skill from ClawHub
 *
 * Flow:
 * 1. Fetch SKILL.md content
 * 2. Run security scanner
 * 3. If dangerous → reject
 * 4. Parse YAML frontmatter
 * 5. Convert to Johnny5 format (metadata.json + SKILL.md)
 * 6. Write to ~/.coder1/skills/clawhub/{slug}/
 * 7. Return security report + result
 */
export async function installSkill(
  slug: string,
  options?: { version?: string; force?: boolean }
): Promise<{
  success: boolean;
  securityReport: SkillSecurityReport;
  installPath?: string;
  error?: string;
}> {
  // 1. Fetch content
  let content: string;
  try {
    content = await getSkillContent(slug, options?.version);
  } catch (error) {
    return {
      success: false,
      securityReport: {
        skillId: slug,
        score: 'dangerous',
        findings: [{ severity: 'danger', pattern: 'fetch_error', description: `Failed to fetch skill: ${error}` }],
        scannedAt: new Date(),
      },
      error: `Failed to fetch skill content: ${error}`,
    };
  }

  // 2. Security scan
  const securityReport = scanSkillContent(slug, content);

  // 3. Block dangerous skills
  if (securityReport.score === 'dangerous') {
    return {
      success: false,
      securityReport,
      error: 'Skill blocked: dangerous patterns detected',
    };
  }

  // 4. Block warnings unless forced
  if (securityReport.score === 'warning' && !options?.force) {
    return {
      success: false,
      securityReport,
      error: 'Skill has security warnings. Use force=true to install anyway.',
    };
  }

  // 5. Parse frontmatter
  let frontmatter: Record<string, unknown> = {};
  let skillBody: string = content;
  try {
    const parsed = matter(content);
    frontmatter = parsed.data as Record<string, unknown>;
    skillBody = parsed.content;
  } catch {
    // No frontmatter or parsing failed — use raw content
  }

  // 6. Build metadata.json from frontmatter
  const metadata = convertFrontmatterToMetadata(slug, frontmatter);

  // 7. Write to disk
  const installDir = path.join(CLAWHUB_SKILLS_DIR, slug);
  try {
    await fs.mkdir(installDir, { recursive: true });

    // Write metadata.json
    await fs.writeFile(
      path.join(installDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // Write SKILL.md (body without frontmatter)
    await fs.writeFile(
      path.join(installDir, 'SKILL.md'),
      skillBody,
      'utf-8'
    );

    // Verify files exist
    await fs.access(path.join(installDir, 'metadata.json'));
    await fs.access(path.join(installDir, 'SKILL.md'));
  } catch (error) {
    return {
      success: false,
      securityReport,
      error: `Failed to write skill files: ${error}`,
    };
  }

  return {
    success: true,
    securityReport,
    installPath: installDir,
  };
}

/**
 * Uninstall a ClawHub skill by removing its directory
 */
export async function uninstallSkill(slug: string): Promise<boolean> {
  const installDir = path.join(CLAWHUB_SKILLS_DIR, slug);
  try {
    await fs.rm(installDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a skill is already installed locally
 */
export async function isSkillInstalled(slug: string): Promise<boolean> {
  const metadataPath = path.join(CLAWHUB_SKILLS_DIR, slug, 'metadata.json');
  try {
    await fs.access(metadataPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Score compatibility of a ClawHub skill with Johnny5
 */
export function scoreCompatibility(frontmatter: Record<string, unknown>): SkillCompatibility {
  const metadata = (frontmatter.metadata || {}) as Record<string, unknown>;
  // Check all known metadata aliases
  const clawdbot = (metadata.clawdbot || metadata.clawdis || metadata.openclaw || {}) as Record<string, unknown>;
  const requires = (clawdbot.requires || {}) as Record<string, unknown>;

  const bins = (requires.bins || []) as string[];
  const env = (requires.env || []) as string[];

  // High: no external requirements
  if (bins.length === 0 && env.length === 0) {
    return 'high';
  }

  // Low: requires OpenClaw-specific tools
  if (typeof clawdbot === 'object' && 'tool' in (clawdbot as Record<string, unknown>)) {
    return 'low';
  }

  // Medium: has some requirements but nothing blocking
  return 'medium';
}

/**
 * Clear the adapter cache
 */
export function clearCache(): void {
  cache.clear();
}

// ============================================================================
// Internal Helpers
// ============================================================================

function convertFrontmatterToMetadata(
  slug: string,
  frontmatter: Record<string, unknown>
): Record<string, unknown> {
  const metadata = (frontmatter.metadata || {}) as Record<string, unknown>;
  const clawdbot = (metadata.clawdbot || metadata.clawdis || metadata.openclaw || {}) as Record<string, unknown>;
  const requires = (clawdbot.requires || {}) as Record<string, unknown>;

  const name = (frontmatter.name as string) || slug;
  const description = (frontmatter.description as string) || '';
  const bins = (requires.bins || []) as string[];
  const os = (requires.os || []) as string[];
  const emoji = (clawdbot.emoji as string) || '';

  return {
    id: `clawhub-${slug}`,
    name: formatDisplayName(name),
    description,
    category: 'clawhub',
    tools: bins,
    version: '1.0.0',
    estimatedTokens: 0, // Will be calculated after loading
    lastUpdated: new Date().toISOString(),
    author: 'community',
    tags: [...os, ...(emoji ? [emoji] : [])],
    source: 'clawhub',
    clawhubSlug: slug,
  };
}

function formatDisplayName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
