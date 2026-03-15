import { NextRequest, NextResponse } from 'next/server';
import { getVaultService } from '@/lib/vault-service';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';

function guardVault() {
  assertLocalOnly();
  if (!featureFlags.isEnabled('VAULT_ENABLED')) {
    return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
  }
  return null;
}

// GET /api/vault?path=...  → get note
// GET /api/vault?search=... → search notes
// GET /api/vault?folder=... → list notes in folder
// GET /api/vault?list=true  → list recent notes
// GET /api/vault?tree=true  → folder tree
export async function GET(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const vault = getVaultService();

    if (searchParams.has('search')) {
      const q = searchParams.get('search')!.trim();
      if (!q) return NextResponse.json([]);
      const results = vault.search(q, 20);
      // Return note stubs directly so the frontend can render them uniformly
      return NextResponse.json(results.map((r) => r.note));
    }

    if (searchParams.has('tree')) {
      // getFolderTree() returns a single root node; the UI renders its children
      return NextResponse.json(vault.getFolderTree().children);
    }

    if (searchParams.has('folder')) {
      const folder = searchParams.get('folder') || undefined;
      const notes = vault.listNotes(folder);
      return NextResponse.json(notes);
    }

    if (searchParams.has('list')) {
      const notes = vault.listNotes();
      return NextResponse.json(notes);
    }

    const notePath = searchParams.get('path');
    if (!notePath) {
      return NextResponse.json({ error: 'path, search, folder, list, or tree parameter required' }, { status: 400 });
    }

    const note = await vault.getNote(notePath);
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    return NextResponse.json(note);
  } catch (err) {
    console.error('[vault GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/vault  body: CreateNoteRequest → create note
export async function POST(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const body = await req.json();
    if (!body.path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
    if (!body.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const vault = getVaultService();
    const note = await vault.createNote(body);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error('[vault POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/vault?path=...  body: UpdateNoteRequest → update note
export async function PATCH(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const notePath = searchParams.get('path');
    if (!notePath) return NextResponse.json({ error: 'path is required' }, { status: 400 });

    const body = await req.json();
    if (body.content === undefined) return NextResponse.json({ error: 'content is required' }, { status: 400 });

    const vault = getVaultService();
    const note = await vault.updateNote(notePath, body);
    return NextResponse.json(note);
  } catch (err) {
    console.error('[vault PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/vault?path=...
export async function DELETE(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const notePath = searchParams.get('path');
    if (!notePath) return NextResponse.json({ error: 'path is required' }, { status: 400 });

    const vault = getVaultService();
    await vault.deleteNote(notePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[vault DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
