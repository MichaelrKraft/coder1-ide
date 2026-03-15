import { NextRequest, NextResponse } from 'next/server';
import { getVaultService } from '@/lib/vault-service';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';

export async function GET(_req: NextRequest) {
  try {
    assertLocalOnly();
    if (!featureFlags.isEnabled('VAULT_ENABLED')) {
      return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
    }

    const vault = getVaultService();
    const data = vault.getGraphData();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[vault/graph GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
