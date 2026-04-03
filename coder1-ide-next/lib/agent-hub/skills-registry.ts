import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
}

/**
 * Reads ~/.claude/skills/*\/SKILL.md and extracts name + description.
 * Returns [] if the directory doesn't exist (safe fallback).
 */
export function listAvailableSkills(): SkillInfo[] {
  const skillsDir = path.join(os.homedir(), '.claude', 'skills');

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const results: SkillInfo[] = [];

  let entries: string[];
  try {
    entries = fs.readdirSync(skillsDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const entryPath = path.join(skillsDir, entry);

    try {
      const stat = fs.statSync(entryPath);
      if (!stat.isDirectory()) continue;

      const skillMdPath = path.join(entryPath, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const description = extractDescription(content);

      results.push({
        name: entry,
        description,
        path: entryPath,
      });
    } catch {
      // Skip unreadable entries
    }
  }

  return results;
}

/**
 * Extracts description from SKILL.md.
 * Tries frontmatter `description:` key first, falls back to first non-empty line.
 */
function extractDescription(content: string): string {
  // Check YAML frontmatter block
  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) {
      const frontmatter = content.slice(3, end);
      const match = frontmatter.match(/^description:\s*(.+)$/m);
      if (match) return match[1].trim();
    }
  }

  // Fall back to first non-empty, non-heading line
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.replace(/^[*_]+|[*_]+$/g, '');
    }
  }

  return '';
}
