/**
 * DreamWeaverService — overnight autonomous knowledge synthesis.
 *
 * Schedule: configurable (default: 2 AM daily via cron-like trigger)
 * Safety: never modifies existing notes, only creates new ones in johnny5/ folder
 * Rate limit: 10 writes/minute, 100/hour
 * Writes restricted to: ~/.coder1/knowledge/johnny5/
 */

import { featureFlags } from '@/config/feature-flags';

interface DreamWeaverResult {
  notesAnalyzed: number;
  insightsGenerated: number;
  notesCreated: string[];
  morningBriefPath: string | null;
  error?: string;
}

interface UnresolvedIdea {
  sourcePath: string;
  title: string;
  content: string;
  lastModified: number;
}

export class DreamWeaverService {
  private static readonly OUTPUT_PREFIX = 'johnny5/dream-weaver/';
  private static readonly MAX_NOTES_TO_ANALYZE = 20; // analyze last 20 modified notes
  private static writeCount = { minute: 0, hour: 0, minuteReset: 0, hourReset: 0 };

  static async run(): Promise<DreamWeaverResult> {
    if (!featureFlags.isEnabled('JOHNNY5_MIRACLES')) {
      return { notesAnalyzed: 0, insightsGenerated: 0, notesCreated: [], morningBriefPath: null, error: 'Feature disabled' };
    }

    try {
      // 1. Fetch recently updated notes
      const recentNotes = await this.fetchRecentNotes();
      if (recentNotes.length === 0) {
        return { notesAnalyzed: 0, insightsGenerated: 0, notesCreated: [], morningBriefPath: null };
      }

      // 2. Find unresolved ideas (notes with #idea tag or marked "TODO" / "?")
      const unresolvedIdeas = this.findUnresolvedIdeas(recentNotes);

      // 3. For each unresolved idea, generate architecture synthesis via Claude
      const notesCreated: string[] = [];
      for (const idea of unresolvedIdeas.slice(0, 5)) { // cap at 5 per run
        const notePath = await this.synthesizeIdea(idea);
        if (notePath) notesCreated.push(notePath);
      }

      // 4. Generate morning brief
      const morningBriefPath = await this.generateMorningBrief({
        analyzedCount: recentNotes.length,
        ideasFound: unresolvedIdeas.length,
        notesCreated,
      });

      return {
        notesAnalyzed: recentNotes.length,
        insightsGenerated: notesCreated.length,
        notesCreated,
        morningBriefPath,
      };
    } catch (err) {
      console.error('[DreamWeaverService] run failed:', err);
      return {
        notesAnalyzed: 0,
        insightsGenerated: 0,
        notesCreated: [],
        morningBriefPath: null,
        error: String(err),
      };
    }
  }

  private static async fetchRecentNotes(): Promise<Array<{ path: string; title: string; content: string; updatedAt: number }>> {
    const response = await fetch('/api/vault?list=true');
    if (!response.ok) return [];
    const { notes } = await response.json();

    // Get top 20 most recently modified
    const recent = notes.slice(0, this.MAX_NOTES_TO_ANALYZE);

    // Fetch full content for each
    const withContent = await Promise.all(
      recent.map(async (stub: { path: string; title: string; updatedAt: number }) => {
        try {
          const r = await fetch(`/api/vault?path=${encodeURIComponent(stub.path)}`);
          if (!r.ok) return null;
          const note = await r.json();
          return { path: note.path, title: note.title, content: note.content, updatedAt: note.updatedAt };
        } catch {
          return null;
        }
      })
    );

    return withContent.filter(Boolean) as Array<{ path: string; title: string; content: string; updatedAt: number }>;
  }

  private static findUnresolvedIdeas(notes: Array<{ path: string; title: string; content: string; updatedAt: number }>): UnresolvedIdea[] {
    return notes.filter(note => {
      const text = (note.title + ' ' + note.content).toLowerCase();
      return (
        text.includes('#idea') ||
        text.includes('todo:') ||
        text.includes('unresolved:') ||
        text.includes('question:') ||
        note.path.toLowerCase().includes('idea')
      );
    }).map(note => ({
      sourcePath: note.path,
      title: note.title,
      content: note.content,
      lastModified: note.updatedAt,
    }));
  }

  private static async synthesizeIdea(idea: UnresolvedIdea): Promise<string | null> {
    if (!this.checkRateLimit()) return null;

    // Use Claude API to analyze the idea
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze this note and provide a brief architectural synthesis (2-3 bullet points of actionable next steps, no fluff):

Title: ${idea.title}
Content: ${idea.content.slice(0, 500)}

Respond with ONLY a JSON object: { "synthesis": "...", "nextSteps": ["...", "..."], "relatedTopics": ["..."] }`,
          }],
          max_tokens: 300,
        }),
      });

      if (!response.ok) return null;
      const result = await response.json();
      const text = result.content?.[0]?.text || '';

      let parsed: { synthesis?: string; nextSteps?: string[]; relatedTopics?: string[] };
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        return null;
      }

      if (!parsed.synthesis) return null;

      // Write synthesis note
      const date = new Date().toISOString().split('T')[0];
      const slug = idea.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      const notePath = `${this.OUTPUT_PREFIX}${date}-synthesis-${slug}.md`;

      const content = [
        `## Synthesis`,
        ``,
        parsed.synthesis,
        ``,
        `## Next Steps`,
        ``,
        ...(parsed.nextSteps || []).map(s => `- ${s}`),
        ``,
        `## Related Topics`,
        ``,
        ...(parsed.relatedTopics || []).map(t => `- [[${t}]]`),
        ``,
        `---`,
        `*Generated by Dream Weaver from [[${idea.sourcePath}]]*`,
      ].join('\n');

      const createResp = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: notePath,
          title: `Synthesis: ${idea.title}`,
          content,
          frontmatter: { tags: ['dream-weaver', 'synthesis'], source: idea.sourcePath },
        }),
      });

      if (!createResp.ok) return null;
      this.incrementWriteCount();
      return notePath;
    } catch {
      return null;
    }
  }

  private static async generateMorningBrief(summary: { analyzedCount: number; ideasFound: number; notesCreated: string[] }): Promise<string | null> {
    if (!this.checkRateLimit()) return null;

    const date = new Date().toISOString().split('T')[0];
    const notePath = `${this.OUTPUT_PREFIX}${date}-morning-brief.md`;

    const content = [
      `## Dream Weaver Morning Brief`,
      ``,
      `**Date:** ${date}`,
      `**Notes analyzed:** ${summary.analyzedCount}`,
      `**Ideas found:** ${summary.ideasFound}`,
      `**Syntheses created:** ${summary.notesCreated.length}`,
      ``,
    ];

    if (summary.notesCreated.length > 0) {
      content.push(`## New Syntheses`, ``);
      for (const path of summary.notesCreated) {
        content.push(`- [[${path}]]`);
      }
      content.push(``);
    }

    content.push(`---`, `*Generated by Dream Weaver at ${new Date().toLocaleTimeString()}*`);

    try {
      const resp = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: notePath,
          title: `Morning Brief — ${date}`,
          content: content.join('\n'),
          frontmatter: { tags: ['dream-weaver', 'morning-brief'], date },
        }),
      });
      if (!resp.ok) return null;
      this.incrementWriteCount();
      return notePath;
    } catch {
      return null;
    }
  }

  private static checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.writeCount.minuteReset > 60000) {
      this.writeCount.minute = 0;
      this.writeCount.minuteReset = now;
    }
    if (now - this.writeCount.hourReset > 3600000) {
      this.writeCount.hour = 0;
      this.writeCount.hourReset = now;
    }
    const config = featureFlags.getConfig('JOHNNY5_MIRACLES');
    const maxPerMinute = (config?.maxWritesPerMinute as number) || 10;
    const maxPerHour = (config?.maxWritesPerHour as number) || 100;
    return this.writeCount.minute < maxPerMinute && this.writeCount.hour < maxPerHour;
  }

  private static incrementWriteCount(): void {
    this.writeCount.minute++;
    this.writeCount.hour++;
  }
}
