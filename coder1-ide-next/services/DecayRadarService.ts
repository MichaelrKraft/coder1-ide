/**
 * DecayRadarService — detects stale notes in the knowledge base.
 *
 * Checks:
 * 1. Referenced code files still exist in the project
 * 2. Version/pricing numbers that may be outdated (heuristic)
 * 3. Notes not updated in >90 days
 *
 * Output: Output/Decay-Report-YYYY-MM-DD.md listing stale notes with suggested fixes.
 * Runs on-demand or weekly schedule.
 */

import * as fs from 'fs';
import * as path from 'path';
import { featureFlags } from '@/config/feature-flags';

interface StaleNote {
  notePath: string;
  title: string;
  reasons: string[];
  severity: 'low' | 'medium' | 'high';
}

interface DecayReport {
  reportPath: string | null;
  totalNotesChecked: number;
  staleCount: number;
  staleNotes: StaleNote[];
}

export class DecayRadarService {
  private static readonly STALE_DAYS = 90;
  private static readonly OUTPUT_FOLDER = 'Output';

  static async run(projectRoot?: string): Promise<DecayReport> {
    if (!featureFlags.isEnabled('VAULT_ENABLED')) {
      return { reportPath: null, totalNotesChecked: 0, staleCount: 0, staleNotes: [] };
    }

    try {
      // Fetch all notes
      const resp = await fetch('/api/vault?list=true');
      if (!resp.ok) return { reportPath: null, totalNotesChecked: 0, staleCount: 0, staleNotes: [] };

      const { notes } = await resp.json();
      const staleNotes: StaleNote[] = [];

      for (const stub of notes) {
        // Fetch full note content
        const noteResp = await fetch(`/api/vault?path=${encodeURIComponent(stub.path)}`);
        if (!noteResp.ok) continue;
        const note = await noteResp.json();

        const reasons: string[] = [];

        // Check 1: Age — not updated in > STALE_DAYS
        const daysSinceUpdate = (Date.now() - note.updatedAt) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > this.STALE_DAYS) {
          reasons.push(`Not updated in ${Math.round(daysSinceUpdate)} days`);
        }

        // Check 2: Referenced file paths in backticks that no longer exist
        if (projectRoot) {
          const fileRefs = this.extractFileReferences(note.content);
          for (const ref of fileRefs) {
            const absPath = path.resolve(projectRoot, ref);
            if (!fs.existsSync(absPath)) {
              reasons.push(`Referenced file no longer exists: \`${ref}\``);
            }
          }
        }

        // Check 3: Version-like strings that may be outdated (heuristic)
        const versionMatches = note.content.match(/v\d+\.\d+\.\d+|version\s+\d+\.\d+/gi);
        if (versionMatches && versionMatches.length > 0 && daysSinceUpdate > 30) {
          reasons.push(`Contains version references that may be outdated: ${versionMatches.slice(0, 3).join(', ')}`);
        }

        // Check 4: TODO items older than 30 days
        if (note.content.includes('TODO') && daysSinceUpdate > 30) {
          reasons.push(`Contains unresolved TODO items`);
        }

        if (reasons.length > 0) {
          staleNotes.push({
            notePath: note.path,
            title: note.title,
            reasons,
            severity: reasons.length >= 3 ? 'high' : reasons.length === 2 ? 'medium' : 'low',
          });
        }
      }

      // Sort by severity
      staleNotes.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      });

      const reportPath = await this.writeReport(staleNotes, notes.length);

      return {
        reportPath,
        totalNotesChecked: notes.length,
        staleCount: staleNotes.length,
        staleNotes,
      };
    } catch (err) {
      console.error('[DecayRadarService] run failed:', err);
      return { reportPath: null, totalNotesChecked: 0, staleCount: 0, staleNotes: [] };
    }
  }

  private static extractFileReferences(content: string): string[] {
    // Extract paths from backtick code spans: `src/components/Foo.tsx`
    const matches = content.match(/`([^`]+\.[a-zA-Z]{2,5})`/g) || [];
    return matches
      .map(m => m.slice(1, -1))
      .filter(m => m.includes('/') && !m.includes(' '));
  }

  private static async writeReport(staleNotes: StaleNote[], totalChecked: number): Promise<string | null> {
    const date = new Date().toISOString().split('T')[0];
    const reportPath = `${this.OUTPUT_FOLDER}/Decay-Report-${date}.md`;

    const lines = [
      `# Knowledge Decay Report — ${date}`,
      ``,
      `**Total notes checked:** ${totalChecked}`,
      `**Stale notes found:** ${staleNotes.length}`,
      ``,
    ];

    if (staleNotes.length === 0) {
      lines.push(`All notes are up to date!`);
    } else {
      // Group by severity
      for (const severity of ['high', 'medium', 'low'] as const) {
        const group = staleNotes.filter(n => n.severity === severity);
        if (group.length === 0) continue;

        const label = severity === 'high' ? '[HIGH]' : severity === 'medium' ? '[MEDIUM]' : '[LOW]';
        lines.push(`## ${label} ${severity.charAt(0).toUpperCase() + severity.slice(1)} Priority (${group.length})`, ``);

        for (const note of group) {
          lines.push(`### [[${note.notePath}|${note.title}]]`, ``);
          for (const reason of note.reasons) {
            lines.push(`- ${reason}`);
          }
          lines.push(``);
        }
      }
    }

    lines.push(`---`, `*Generated by Knowledge Decay Radar — ${new Date().toLocaleString()}*`);

    try {
      const resp = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: reportPath,
          title: `Decay Report — ${date}`,
          content: lines.join('\n'),
          frontmatter: {
            tags: ['decay-radar', 'report'],
            date,
            stale_count: staleNotes.length,
          },
        }),
      });
      if (!resp.ok) return null;
      return reportPath;
    } catch {
      return null;
    }
  }
}
