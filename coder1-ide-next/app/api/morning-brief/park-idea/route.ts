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
  let body: { text?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, context } = body;

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const contextLabel = (context && context.trim()) ? context.trim() : 'Morning Brief';

  const newEntry = `- [ ] **${text.trim()}**\n  - Parked: ${dateStr} ${timeStr} | Context: ${contextLabel}\n`;

  try {
    if (!fs.existsSync(PARKING_LOT_PATH)) {
      fs.mkdirSync(path.dirname(PARKING_LOT_PATH), { recursive: true });
      fs.writeFileSync(PARKING_LOT_PATH, `# Parking Lot\n\n${newEntry}`, 'utf-8');
    } else {
      fs.appendFileSync(PARKING_LOT_PATH, `\n${newEntry}`, 'utf-8');
    }
    return NextResponse.json({ success: true, path: PARKING_LOT_PATH });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to write parking lot: ${message}` }, { status: 500 });
  }
}
