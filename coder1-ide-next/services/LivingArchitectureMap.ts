/**
 * LivingArchitectureMap — keeps knowledge base in sync with code changes.
 *
 * Trigger: file change events (code or notes)
 * Process: checks if related notes need updating based on changed files
 * Output: contextual nudges + graph annotations (stale flags)
 * Rate limit: max 10 checks/minute
 */

import { featureFlags } from '@/config/feature-flags';

interface ArchitectureNudge {
  type: 'stale_doc' | 'missing_link' | 'orphan_note';
  notePath: string;
  noteTitle: string;
  message: string;
  changedFile?: string;
}

export class LivingArchitectureMap {
  private static recentNudges: ArchitectureNudge[] = [];
  private static checkCount = 0;
  private static checkCountReset = Date.now();

  static async onFileChanged(changedFilePath: string): Promise<ArchitectureNudge[]> {
    if (!featureFlags.isEnabled('VAULT_ENABLED')) return [];

    if (!this.checkRateLimit()) return [];

    const nudges: ArchitectureNudge[] = [];

    try {
      // Find notes that reference this file
      const filename = changedFilePath.split('/').pop() || changedFilePath;
      const searchQuery = filename.replace(/\.[^.]+$/, ''); // strip extension

      const resp = await fetch(`/api/vault?search=${encodeURIComponent(searchQuery)}`);
      if (!resp.ok) return [];

      const { results } = await resp.json();

      for (const result of (results || []).slice(0, 5)) {
        const note = result.note;
        // If the note references this file but hasn't been updated recently
        const daysSinceUpdate = (Date.now() - note.updatedAt) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate > 7) {
          nudges.push({
            type: 'stale_doc',
            notePath: note.path,
            noteTitle: note.title,
            message: `\`${filename}\` was modified — this note may need updating`,
            changedFile: changedFilePath,
          });
        }
      }

      // Store nudges for polling
      this.recentNudges = [...nudges, ...this.recentNudges].slice(0, 20);
      return nudges;
    } catch {
      return [];
    }
  }

  static async checkForOrphans(): Promise<ArchitectureNudge[]> {
    if (!featureFlags.isEnabled('VAULT_ENABLED')) return [];

    try {
      const graphResp = await fetch('/api/vault/graph');
      if (!graphResp.ok) return [];

      const graphData = await graphResp.json();
      const nudges: ArchitectureNudge[] = [];

      // Find orphan nodes (no links)
      const connectedIds = new Set([
        ...graphData.links.map((l: { source: number }) => l.source),
        ...graphData.links.map((l: { target: number }) => l.target),
      ]);

      for (const node of (graphData.nodes || [])) {
        if (
          !connectedIds.has(node.id) &&
          !node.path.startsWith('johnny5/') &&
          !node.path.startsWith('Output/')
        ) {
          nudges.push({
            type: 'orphan_note',
            notePath: node.path,
            noteTitle: node.title,
            message: `This note has no connections — consider adding [[wikilinks]] to related notes`,
          });
        }
      }

      return nudges.slice(0, 10); // cap at 10
    } catch {
      return [];
    }
  }

  static getRecentNudges(): ArchitectureNudge[] {
    return this.recentNudges;
  }

  static clearNudges(): void {
    this.recentNudges = [];
  }

  private static checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.checkCountReset > 60000) {
      this.checkCount = 0;
      this.checkCountReset = now;
    }
    return this.checkCount++ < 10;
  }
}
