import { NextRequest, NextResponse } from 'next/server';
import { getVaultService } from '@/lib/vault-service';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';

export async function GET(req: NextRequest) {
  try {
    assertLocalOnly();
    if (!featureFlags.isEnabled('VAULT_ENABLED')) {
      return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const notePath = searchParams.get('path');
    if (!notePath) return NextResponse.json({ error: 'path is required' }, { status: 400 });

    const vault = getVaultService();
    const stubs = vault.getBacklinks(notePath);
    // Map VaultNoteStub → BacklinkEntry shape expected by BacklinksPanel
    const backlinks = stubs.map((s) => ({
      sourcePath: s.path,
      sourceTitle: s.title,
      modifiedAt: s.updatedAt,
    }));
    return NextResponse.json(backlinks);
  } catch (err) {
    console.error('[vault/backlinks GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
