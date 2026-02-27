/**
 * Loads built-in CLAUDE.md templates from disk.
 * Server-only: uses fs.readFileSync. Do NOT import this on the client.
 */
import 'server-only';
import * as fs from 'fs';
import * as path from 'path';
import type { ClaudeMdTemplate } from '@/types/claude-md';

// Validate that the category value is one of the allowed literals
function parseCategory(
  raw: string
): ClaudeMdTemplate['category'] {
  const valid = ['web', 'api', 'mobile', 'data', 'general'] as const;
  const normalized = raw.trim().toLowerCase();
  if ((valid as readonly string[]).includes(normalized)) {
    return normalized as ClaudeMdTemplate['category'];
  }
  return 'general';
}

/**
 * Parse a simple YAML-like frontmatter block from a markdown string.
 * Only handles string, and array-of-strings fields. No full YAML library needed.
 */
function parseFrontmatter(
  raw: string
): { meta: Record<string, string | string[]>; body: string } {
  const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = FM_RE.exec(raw);
  if (!match) {
    return { meta: {}, body: raw };
  }

  const fmBlock = match[1];
  const body = match[2];
  const meta: Record<string, string | string[]> = {};

  for (const line of fmBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    // Detect inline array: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1);
      meta[key] = inner
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      meta[key] = value;
    }
  }

  return { meta, body };
}

const TEMPLATES_DIR = path.join(
  process.cwd(),
  'lib',
  'claude-md-templates'
);

/**
 * Reads all .md files in lib/claude-md-templates/ and returns parsed templates.
 * Called server-side only (API routes, server components).
 */
export function loadBuiltInTemplates(): ClaudeMdTemplate[] {
  let files: string[];
  try {
    files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    console.warn('[claude-md-template-loader] Templates directory not found:', TEMPLATES_DIR);
    return [];
  }

  const templates: ClaudeMdTemplate[] = [];

  for (const filename of files) {
    const filePath = path.join(TEMPLATES_DIR, filename);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { meta, body } = parseFrontmatter(raw);

      const id =
        typeof meta['id'] === 'string' && meta['id']
          ? meta['id']
          : path.basename(filename, '.md');

      const name =
        typeof meta['name'] === 'string' && meta['name']
          ? meta['name']
          : id;

      const description =
        typeof meta['description'] === 'string' ? meta['description'] : '';

      const category = parseCategory(
        typeof meta['category'] === 'string' ? meta['category'] : 'general'
      );

      const rawTags = meta['tags'];
      const tags: string[] = Array.isArray(rawTags)
        ? rawTags
        : typeof rawTags === 'string'
        ? [rawTags]
        : [];

      templates.push({
        id,
        name,
        description,
        category,
        content: body.trim(),
        tags,
        isBuiltIn: true,
      });
    } catch (err) {
      console.warn(`[claude-md-template-loader] Failed to load ${filename}:`, err);
    }
  }

  return templates;
}
