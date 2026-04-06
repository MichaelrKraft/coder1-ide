import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const OWNER_PROFILE_PATH = path.join(process.env.HOME || '/tmp', '.coder1', 'owner.md');
const MAX_SIZE = 4 * 1024;

export async function GET() {
  try {
    if (!existsSync(OWNER_PROFILE_PATH)) {
      return NextResponse.json({ content: '' });
    }
    const content = await readFile(OWNER_PROFILE_PATH, 'utf-8');
    return NextResponse.json({ content: content.slice(0, MAX_SIZE) });
  } catch {
    return NextResponse.json({ content: '' });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    const trimmed = content.slice(0, MAX_SIZE);
    const dir = path.dirname(OWNER_PROFILE_PATH);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(OWNER_PROFILE_PATH, trimmed, 'utf-8');
    return NextResponse.json({ success: true, length: trimmed.length });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
