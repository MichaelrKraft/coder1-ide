import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface Skill {
  name: string;
  description: string;
  tags: string[];
  path: string;
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, unknown> = {};
  const lines = match[1].split('\n');
  let currentKey = '';
  let multilineValue = '';
  let inMultiline = false;
  let inArray = false;
  const arrayValues: string[] = [];

  for (const line of lines) {
    if (inMultiline) {
      if (line.startsWith('  ') || line === '') {
        multilineValue += (multilineValue ? '\n' : '') + line.trim();
        continue;
      } else {
        result[currentKey] = multilineValue.trim();
        inMultiline = false;
        multilineValue = '';
      }
    }

    if (inArray) {
      const arrayMatch = line.match(/^\s+-\s+(.+)/);
      if (arrayMatch) {
        arrayValues.push(arrayMatch[1].trim());
        continue;
      } else {
        result[currentKey] = arrayValues.slice();
        arrayValues.length = 0;
        inArray = false;
      }
    }

    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (!kvMatch) continue;

    const [, key, value] = kvMatch;
    currentKey = key;

    if (value === '|') {
      inMultiline = true;
    } else if (value === '') {
      inArray = true;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      result[key] = value.trim();
    }
  }

  if (inMultiline) result[currentKey] = multilineValue.trim();
  if (inArray) result[currentKey] = arrayValues.slice();

  return result;
}

export async function GET() {
  const skillsDir = path.join(os.homedir(), '.claude', 'skills');

  if (!fs.existsSync(skillsDir)) {
    return NextResponse.json({ skills: [] });
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: Skill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const fm = parseFrontmatter(content);

      const name = (fm.name as string) || entry.name;
      const description = (fm.description as string) || '';
      const tags = Array.isArray(fm.tags)
        ? (fm.tags as string[])
        : Array.isArray((fm.metadata as Record<string, unknown>)?.tags)
        ? ((fm.metadata as Record<string, string[]>).tags as string[])
        : [];

      skills.push({ name, description: description.replace(/\n+/g, ' ').trim(), tags, path: entry.name });
    } catch {
      // skip unreadable skills
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ skills, count: skills.length, generatedAt: new Date().toISOString() });
}
