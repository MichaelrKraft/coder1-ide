/**
 * FlowTrace Query Engine
 *
 * Natural language query → Gemini embedding → Pinecone search → Claude Sonnet answer.
 * This is what the user actually interacts with: "How did I fix that CORS error?"
 */

import Anthropic from '@anthropic-ai/sdk';
import { embedQuery } from './embedding-service';
import { queryFrames, QueryOptions, QueryMatch } from './pinecone-service';

// ============================================================================
// Types
// ============================================================================

export interface FlowTraceResult {
  answer: string;
  matches: QueryMatch[];
  queryTimeMs: number;
}

// ============================================================================
// Claude Sonnet for answer generation
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(userQuery: string, matches: QueryMatch[]): string {
  const matchesText = matches
    .map(
      (m, i) =>
        `--- Match ${i + 1} (${(m.score * 100).toFixed(0)}% similarity) ---
Time: ${new Date(m.metadata.timestamp * 1000).toLocaleString()}
App: ${m.metadata.app_name}
Window: ${m.metadata.window_title}
Type: ${m.metadata.content_type}
${m.metadata.url ? `URL: ${m.metadata.url}` : ''}
Content: ${m.metadata.ocr_text_preview}`
    )
    .join('\n\n');

  return `You are the FlowTrace assistant — a developer's personal AI with access to their own work history.

The developer asked: "${userQuery}"

Here are the most relevant moments from their screen history, ordered by semantic similarity:

${matchesText}

Instructions:
- Answer specifically based on what they actually did in these captures
- Reference exact timestamps when relevant (e.g., "On March 9 at 2:34pm you...")
- If you can reconstruct steps they took, do so in order
- If the matches don't clearly answer the question, say so honestly
- Keep the answer concise and actionable — this is a developer tool, not a chat interface
- Do not make up information not present in the matches`;
}

// ============================================================================
// Main Query Function
// ============================================================================

export async function queryFlowTrace(
  userQuery: string,
  options: QueryOptions = {}
): Promise<FlowTraceResult> {
  const startTime = Date.now();

  // 1. Embed the query (text-only, RETRIEVAL_QUERY task type)
  const queryEmbedding = await embedQuery(userQuery);

  // 2. Semantic search in Pinecone
  const matches = await queryFrames(queryEmbedding, {
    topK: options.topK || 8,
    dateRange: options.dateRange,
    apps: options.apps,
    contentTypes: options.contentTypes,
  });

  if (matches.length === 0) {
    return {
      answer:
        "I didn't find any matching captures for that query. " +
        (options.dateRange
          ? 'Try expanding the date range. '
          : '') +
        'FlowTrace needs to have been running and capturing during the relevant work session.',
      matches: [],
      queryTimeMs: Date.now() - startTime,
    };
  }

  // 3. Generate answer via Claude Sonnet
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: buildSystemPrompt(userQuery, matches),
      },
    ],
  });

  const answer =
    response.content[0].type === 'text'
      ? response.content[0].text
      : 'Unable to generate answer.';

  return {
    answer,
    matches,
    queryTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// Auto-Documentation Generator (the viral feature)
// ============================================================================

export interface DocGeneratorOptions {
  dateRange: { start: number; end: number };
  focus?: string; // e.g. "auth system", "Stripe integration"
  format?: 'markdown' | 'summary';
}

export async function generateWorkSummary(
  options: DocGeneratorOptions
): Promise<string> {
  // Fetch a larger set of frames for doc generation
  const queryEmbedding = await embedQuery(
    options.focus || 'code development work programming implementation'
  );

  const matches = await queryFrames(queryEmbedding, {
    topK: 20,
    dateRange: options.dateRange,
    contentTypes: ['code', 'terminal'],
  });

  if (matches.length === 0) {
    return '# Work Summary\n\nNo coding activity found in the selected time range. Make sure FlowTrace was capturing during this period.';
  }

  // Sort by timestamp for chronological order
  const sorted = [...matches].sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

  const capturesText = sorted
    .map(
      (m) =>
        `[${new Date(m.metadata.timestamp * 1000).toLocaleString()}] ${m.metadata.app_name} — ${m.metadata.window_title}
${m.metadata.ocr_text_preview}`
    )
    .join('\n\n');

  const focusClause = options.focus ? ` with a focus on "${options.focus}"` : '';
  const startDate = new Date(options.dateRange.start * 1000).toLocaleDateString();
  const endDate = new Date(options.dateRange.end * 1000).toLocaleDateString();

  const prompt = `You are generating technical work documentation for a developer${focusClause}.

Time period: ${startDate} to ${endDate}

Here are chronological screen captures from their work sessions:

${capturesText}

Generate a concise technical work summary in Markdown with these sections:
1. **Overview** — What was built or worked on (2-3 sentences)
2. **Key Work** — Bullet points of the main tasks/features/fixes
3. **Technical Details** — Notable patterns, decisions, or approaches visible in the work
4. **Issues Encountered** — Any errors or debugging sessions visible

Keep it factual and based only on what appears in the captures. This is for the developer's own records.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text'
    ? response.content[0].text
    : '# Work Summary\n\nUnable to generate summary.';
}
