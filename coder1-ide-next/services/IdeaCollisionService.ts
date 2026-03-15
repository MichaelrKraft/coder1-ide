/**
 * IdeaCollisionService — cross-references new ideas against the knowledge base.
 *
 * Trigger: note saved with #idea tag
 * Timeout: 90 seconds max
 * Output: feasibility section appended to the idea note
 * Fallback: runs via direct Claude API call (no Johnny5 dependency)
 */

import { featureFlags } from '@/config/feature-flags';

interface CollisionResult {
  notePath: string;
  relatedNotes: Array<{ path: string; title: string; relevance: string }>;
  feasibilityScore: number; // 1-10
  feasibilitySummary: string;
  caveats: string[];
}

export class IdeaCollisionService {
  private static readonly TIMEOUT_MS = 90000;

  static shouldTrigger(notePath: string, noteTags: string[], content: string): boolean {
    const hasIdeaTag = noteTags.some(t => t.toLowerCase() === 'idea');
    const hasIdeaPrefix = content.includes('[[Idea:');
    const isInIdeasFolder = notePath.toLowerCase().includes('idea');
    return hasIdeaTag || hasIdeaPrefix || isInIdeasFolder;
  }

  static async analyze(notePath: string, noteContent: string, noteTitle: string): Promise<CollisionResult | null> {
    // Works even without JOHNNY5_MIRACLES — uses direct Claude API as fallback
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      // 1. Search vault for related notes
      const searchQuery = noteTitle.split(' ').slice(0, 3).join(' ');
      const searchResp = await fetch(`/api/vault?search=${encodeURIComponent(searchQuery)}`);
      const { results: searchResults } = searchResp.ok ? await searchResp.json() : { results: [] };

      const relatedNotes = (searchResults || [])
        .filter((r: { note: { path: string } }) => r.note.path !== notePath)
        .slice(0, 5)
        .map((r: { note: { path: string; title: string }; snippet: string }) => ({
          path: r.note.path,
          title: r.note.title,
          relevance: r.snippet,
        }));

      // 2. Ask Claude to analyze feasibility
      const contextSnippets = relatedNotes
        .map((n: { title: string; relevance: string }) => `- ${n.title}: ${n.relevance}`)
        .join('\n');

      const claudeResp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze this idea and provide a feasibility assessment. Be concise and practical.

IDEA: ${noteTitle}
CONTENT: ${noteContent.slice(0, 600)}

RELATED EXISTING NOTES:
${contextSnippets || 'None found'}

Respond with ONLY a JSON object:
{
  "feasibilityScore": <1-10>,
  "feasibilitySummary": "<2-3 sentence assessment>",
  "caveats": ["<caveat1>", "<caveat2>"],
  "synergies": ["<how this connects to existing work>"]
}`,
          }],
          max_tokens: 400,
        }),
      });

      clearTimeout(timeout);

      if (!claudeResp.ok) return null;
      const claudeResult = await claudeResp.json();
      const text = claudeResult.content?.[0]?.text || '';

      let analysis: { feasibilityScore?: number; feasibilitySummary?: string; caveats?: string[]; synergies?: string[] };
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        return null;
      }

      const result: CollisionResult = {
        notePath,
        relatedNotes,
        feasibilityScore: analysis.feasibilityScore || 5,
        feasibilitySummary: analysis.feasibilitySummary || '',
        caveats: analysis.caveats || [],
      };

      // 3. Append feasibility section to the note
      await this.appendFeasibilityToNote(notePath, noteContent, result, analysis.synergies || []);

      return result;
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === 'AbortError') {
        console.warn('[IdeaCollisionService] Analysis timed out for:', notePath);
      }
      return null;
    }
  }

  private static async appendFeasibilityToNote(
    notePath: string,
    currentContent: string,
    result: CollisionResult,
    synergies: string[]
  ): Promise<void> {
    // Only append if not already analyzed
    if (currentContent.includes('## Feasibility Analysis')) return;

    const feasibilitySection = [
      ``,
      `---`,
      ``,
      `## Feasibility Analysis`,
      ``,
      `**Score:** ${result.feasibilityScore}/10`,
      ``,
      result.feasibilitySummary,
      ``,
    ];

    if (result.caveats.length > 0) {
      feasibilitySection.push(`**Caveats:**`, ``);
      result.caveats.forEach(c => feasibilitySection.push(`- ${c}`));
      feasibilitySection.push(``);
    }

    if (result.relatedNotes.length > 0) {
      feasibilitySection.push(`**Related Notes:**`, ``);
      result.relatedNotes.forEach(n => feasibilitySection.push(`- [[${n.path}|${n.title}]]`));
      feasibilitySection.push(``);
    }

    if (synergies.length > 0) {
      feasibilitySection.push(`**Synergies:**`, ``);
      synergies.forEach(s => feasibilitySection.push(`- ${s}`));
      feasibilitySection.push(``);
    }

    feasibilitySection.push(`*Analyzed by Idea Collision Engine — ${new Date().toLocaleString()}*`);

    const updatedContent = currentContent + feasibilitySection.join('\n');

    await fetch(`/api/vault?path=${encodeURIComponent(notePath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: updatedContent }),
    });
  }
}
