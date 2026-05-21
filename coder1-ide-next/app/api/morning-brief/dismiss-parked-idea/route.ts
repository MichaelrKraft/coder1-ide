import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PARKING_LOT_PATH = path.join(
  os.homedir(),
  'Desktop',
  'Businesses',
  'Obsidian Notes',
  'Ideas',
  'parking-lot.md'
);

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text } = body;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(PARKING_LOT_PATH)) {
      return NextResponse.json({ error: 'parking-lot.md not found' }, { status: 404 });
    }

    const content = fs.readFileSync(PARKING_LOT_PATH, 'utf-8');
    const searchText = text.trim();

    // Find and check off the matching unchecked item
    const updated = content.replace(
      new RegExp(`(- \\[ \\] \\*\\*${escapeRegex(searchText)}\\*\\*)`, 'g'),
      `- [x] **${searchText}**`
    );

    if (updated === content) {
      // Try a looser match without bold markers
      const looser = content.replace(
        new RegExp(`(- \\[ \\] (?:\\*\\*)?${escapeRegex(searchText)}(?:\\*\\*)?)`, 'g'),
        (match) => match.replace('- [ ]', '- [x]')
      );
      if (looser === content) {
        return NextResponse.json({ error: 'Item not found in parking lot' }, { status: 404 });
      }
      fs.writeFileSync(PARKING_LOT_PATH, looser, 'utf-8');
    } else {
      fs.writeFileSync(PARKING_LOT_PATH, updated, 'utf-8');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to update parking lot: ${message}` }, { status: 500 });
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
