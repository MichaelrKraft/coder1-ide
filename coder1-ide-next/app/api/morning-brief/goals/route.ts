import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const OBSIDIAN_DAILY_PATH = path.join(os.homedir(), 'Desktop', 'Businesses', 'Obsidian Notes', 'Daily');

function getDailyNotePath(date: string): string {
  return path.join(OBSIDIAN_DAILY_PATH, `${date}.md`);
}

function parseGoalsFromNote(content: string): string[] {
  const match = content.match(/## Today's Goals\n([\s\S]*?)(?=\n## |$)/);
  if (!match) return ['', '', ''];
  const lines = match[1].trim().split('\n')
    .filter(l => l.match(/^- \[[ x]\]/))
    .map(l => l.replace(/^- \[[ x]\] ?/, '').trim())
    .slice(0, 3);
  while (lines.length < 3) lines.push('');
  return lines;
}

function writeGoalsToNote(filePath: string, goals: string[]): void {
  const goalItems = goals
    .filter(g => g.trim())
    .map(g => `- [ ] ${g}`)
    .join('\n');
  const goalsSection = `## Today's Goals\n${goalItems}\n`;

  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes("## Today's Goals")) {
      content = content.replace(/## Today's Goals\n[\s\S]*?(?=\n## |$)/, goalsSection);
    } else {
      content = content + '\n' + goalsSection;
    }
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const dateLabel = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    content = `# ${dateLabel}\n\n${goalsSection}`;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date query param required (YYYY-MM-DD)' }, { status: 400 });
  }

  const filePath = getDailyNotePath(date);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ goals: ['', '', ''], found: false });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const goals = parseGoalsFromNote(content);
    const found = goals.some(g => g.trim() !== '');
    return NextResponse.json({ goals, found });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to read daily note: ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { goals?: string[]; date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { goals, date } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
  }

  if (!Array.isArray(goals) || goals.length === 0) {
    return NextResponse.json({ error: 'goals must be a non-empty array' }, { status: 400 });
  }

  const filePath = getDailyNotePath(date);

  try {
    writeGoalsToNote(filePath, goals.slice(0, 3));
    return NextResponse.json({ success: true, path: filePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to write daily note: ${message}` }, { status: 500 });
  }
}
