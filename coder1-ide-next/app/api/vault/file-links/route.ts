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

// GET /api/vault/file-links?file=path/to/file.ts  → { links: FileLink[] }
// GET /api/vault/file-links?note=path/to/note.md  → { links: FileLink[] }
export async function GET(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const vault = getVaultService();

    if (searchParams.has('file')) {
      const filePath = searchParams.get('file')!;
      const links = vault.getFileLinks(filePath);
      return NextResponse.json({ links });
    }

    if (searchParams.has('note')) {
      const notePath = searchParams.get('note')!;
      const links = vault.getFileLinksForNote(notePath);
      return NextResponse.json({ links });
    }

    return NextResponse.json({ error: 'file or note query parameter required' }, { status: 400 });
  } catch (err) {
    console.error('[vault/file-links GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/vault/file-links  body: { notePath, filePath, line }  → { ok: true }
export async function POST(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const body = await req.json();
    const { notePath, filePath, line } = body;

    if (!notePath) return NextResponse.json({ error: 'notePath is required' }, { status: 400 });
    if (!filePath) return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    if (line === undefined || line === null) return NextResponse.json({ error: 'line is required' }, { status: 400 });
    if (!Number.isInteger(line) || line < 1) return NextResponse.json({ error: 'line must be a positive integer' }, { status: 400 });

    const vault = getVaultService();
    vault.createFileLink(notePath, filePath, line);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[vault/file-links POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/vault/file-links?note=X&file=Y&line=N  → { ok: true }
export async function DELETE(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const notePath = searchParams.get('note');
    const filePath = searchParams.get('file');
    const lineRaw = searchParams.get('line');

    if (!notePath) return NextResponse.json({ error: 'note query parameter is required' }, { status: 400 });
    if (!filePath) return NextResponse.json({ error: 'file query parameter is required' }, { status: 400 });
    if (!lineRaw) return NextResponse.json({ error: 'line query parameter is required' }, { status: 400 });

    const line = Number(lineRaw);
    if (!Number.isInteger(line) || line < 1) return NextResponse.json({ error: 'line must be a positive integer' }, { status: 400 });

    const vault = getVaultService();
    vault.deleteFileLink(notePath, filePath, line);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[vault/file-links DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
