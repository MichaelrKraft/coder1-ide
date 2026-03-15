import { NextRequest, NextResponse } from 'next/server';
import { getVaultService } from '@/lib/vault-service';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';

export async function POST(_req: NextRequest) {
  try {
    assertLocalOnly();
    if (!featureFlags.isEnabled('VAULT_ENABLED')) {
      return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
    }
    const vault = getVaultService();
    const count = await vault.reindexAll();
    return NextResponse.json({ ok: true, indexedCount: count });
  } catch (err) {
    console.error('[vault/reindex POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
