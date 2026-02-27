import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const ADMIN_TOKEN = process.env.ALPHA_ADMIN_TOKEN;
const FEEDBACK_FILE = path.join(os.homedir(), '.coder1', 'alpha-feedback', 'feedback.json');

function verifyAdmin(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  const cookie = request.cookies.get('coder1-admin')?.value;
  if (cookie === ADMIN_TOKEN) return true;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.includes(ADMIN_TOKEN)) return true;
  return false;
}

interface RawFeedback {
  id: string;
  type: string;
  message: string;
  email?: string;
  status?: string;
  submittedAt?: string;
  createdAt?: string;
}

interface FileData {
  feedback?: RawFeedback[];
}

// File format is { "feedback": [...] } with submittedAt timestamps
async function loadFeedbackArray(): Promise<RawFeedback[]> {
  try {
    const content = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    const parsed: RawFeedback[] | FileData = JSON.parse(content);
    // Handle both { feedback: [...] } and plain array formats
    if (Array.isArray(parsed)) return parsed;
    if (parsed && !Array.isArray(parsed) && Array.isArray((parsed as FileData).feedback)) {
      return (parsed as FileData).feedback!;
    }
    return [];
  } catch {
    return [];
  }
}

async function saveFeedbackArray(items: RawFeedback[]): Promise<void> {
  // Always write back in { feedback: [...] } format to match existing structure
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify({ feedback: items }, null, 2));
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type');
  const statusFilter = searchParams.get('status');

  const items = await loadFeedbackArray();
  let filtered = items;

  if (typeFilter) filtered = filtered.filter(f => f.type === typeFilter);
  if (statusFilter) filtered = filtered.filter(f => (f.status || 'new') === statusFilter);

  // Normalize timestamp field: map submittedAt → createdAt for the frontend
  const normalized = filtered.map(f => ({
    ...f,
    status: f.status || 'new',
    createdAt: f.createdAt || f.submittedAt || new Date().toISOString(),
  }));

  return NextResponse.json({ items: normalized, total: normalized.length });
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const items = await loadFeedbackArray();
    const filtered = items.filter(f => f.id !== id);

    if (filtered.length === items.length) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    await saveFeedbackArray(filtered);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete feedback', details: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    const items = await loadFeedbackArray();
    const idx = items.findIndex(f => f.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    items[idx].status = status;
    await saveFeedbackArray(items);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update feedback', details: message }, { status: 500 });
  }
}
