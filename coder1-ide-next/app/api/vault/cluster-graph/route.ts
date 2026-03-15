import { NextRequest, NextResponse } from 'next/server';
import { getVaultService } from '@/lib/vault-service';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';
import Anthropic from '@anthropic-ai/sdk';
import type { VaultGraphNode } from '@/lib/vault-types';

function guardVault() {
  assertLocalOnly();
  if (!featureFlags.isEnabled('VAULT_ENABLED')) {
    return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
  }
  return null;
}

interface Cluster {
  id: string;
  label: string;
  color: string;
  nodeIds: number[];
}

const PALETTE = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

function fallbackCluster(nodes: VaultGraphNode[]): Cluster[] {
  return [{ id: 'c0', label: 'All Notes', color: '#6366f1', nodeIds: nodes.map((n) => n.id) }];
}

function validateClusters(clusters: Cluster[], nodes: VaultGraphNode[]): boolean {
  const allIds = new Set(nodes.map((n) => n.id));
  const seen = new Set<number>();

  for (const cluster of clusters) {
    for (const nodeId of cluster.nodeIds) {
      if (!allIds.has(nodeId)) return false;
      if (seen.has(nodeId)) return false;
      seen.add(nodeId);
    }
  }

  return seen.size === allIds.size;
}

// POST /api/vault/cluster-graph
// body: { nodes: VaultGraphNode[] }
// response: { clusters: Array<{ id: string; label: string; color: string; nodeIds: number[] }> }
export async function POST(req: NextRequest) {
  let nodes: VaultGraphNode[] = [];

  try {
    const guard = guardVault();
    if (guard) return guard;

    const body = await req.json();

    if (!body.nodes || !Array.isArray(body.nodes) || body.nodes.length === 0) {
      return NextResponse.json({ error: 'nodes array is required and must be non-empty' }, { status: 400 });
    }

    const rawNodes: VaultGraphNode[] = body.nodes;
    nodes = rawNodes.length > 80 ? rawNodes.slice(0, 80) : rawNodes;

    if (nodes.length < 3) {
      return NextResponse.json({ clusters: fallbackCluster(nodes) });
    }

    // Server-side enrichment: get excerpts from vault
    const vault = getVaultService();
    const allNotes = vault.listNotes();
    const excerptMap = new Map<string, string>();
    for (const note of allNotes) {
      if (note.excerpt) {
        excerptMap.set(note.path, note.excerpt);
      }
    }

    // Build node list for prompt
    const nodeList = nodes
      .map((n) => {
        const excerpt = (excerptMap.get(n.path) ?? '').slice(0, 80);
        const tags = n.tags.length > 0 ? n.tags.join(', ') : '';
        return `${n.id} | ${n.title} | ${tags} | ${excerpt}`;
      })
      .join('\n');

    const prompt = `You are organizing a developer knowledge base into semantic topic clusters.

Notes (id | title | tags | preview):
${nodeList}

Group these notes into 3-8 thematic clusters. Use the fixed colors in order: ${PALETTE.join(', ')}.
Return ONLY a JSON array: [{"id":"c0","label":"Topic Name","color":"#hexcolor","nodeIds":[1,2,3]}]
Every note id must appear in exactly one cluster. No other text.`;

    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON with regex fallback
    let clusters: Cluster[] | null = null;
    try {
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) {
        clusters = JSON.parse(match[0]) as Cluster[];
      }
    } catch {
      clusters = null;
    }

    if (!clusters || !validateClusters(clusters, nodes)) {
      return NextResponse.json({ clusters: fallbackCluster(nodes) });
    }

    return NextResponse.json({ clusters });
  } catch (err) {
    console.error('[vault cluster-graph POST]', err);
    return NextResponse.json({ clusters: fallbackCluster(nodes) });
  }
}
