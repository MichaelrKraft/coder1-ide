import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface DocForSearch {
  docId: string;
  title: string;
  url?: string;
  content?: string;
  excerpt?: string;
  categories?: string[];
  wordCount?: number;
}

interface RankedResult {
  docId: string;
  title: string;
  url?: string;
  categories: string[];
  relevanceScore: number;
  claudeScore: number;
  claudeReasoning: string;
  excerpts: Array<{
    text: string;
    heading?: string;
    hasCode: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, documents } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: 'Documents array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.warn('[AI-SEARCH] No ANTHROPIC_API_KEY found, falling back to basic search');
      return fallbackSearch(query, documents);
    }

    try {
      const anthropic = new Anthropic({ apiKey });

      const docsContext = documents.map((doc: DocForSearch, i: number) => {
        const content = doc.content || doc.excerpt || `${doc.title} (${doc.wordCount || 0} words)`;
        const truncated = content.length > 500 ? content.substring(0, 500) + '...' : content;
        return `[${i}] "${doc.title}"${doc.categories?.length ? ` (${doc.categories.join(', ')})` : ''}\n${truncated}`;
      }).join('\n\n');

      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a documentation search assistant. Given the user's query and a list of documents, rank the documents by relevance.

User Query: "${query}"

Documents:
${docsContext}

Respond with a JSON array of rankings. For each relevant document (score >= 5), include:
- index: the document index number
- score: relevance score from 1-10
- reason: brief explanation of why this document is relevant (1 sentence)
- excerpt: the most relevant snippet from the document for this query (if available)

Only include documents that are actually relevant (score >= 5). Return empty array if none are relevant.

Respond ONLY with valid JSON in this format:
{"rankings": [{"index": 0, "score": 9, "reason": "...", "excerpt": "..."}]}`
        }]
      });

      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      let rankings: Array<{ index: number; score: number; reason: string; excerpt?: string }> = [];
      
      try {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          rankings = parsed.rankings || [];
        }
      } catch (parseError) {
        console.error('[AI-SEARCH] Failed to parse Claude response:', parseError);
        return fallbackSearch(query, documents);
      }

      const results: RankedResult[] = rankings
        .filter(r => r.score >= 5 && r.index >= 0 && r.index < documents.length)
        .sort((a, b) => b.score - a.score)
        .map(ranking => {
          const doc = documents[ranking.index];
          return {
            docId: doc.docId,
            title: doc.title,
            url: doc.url,
            categories: doc.categories || [],
            relevanceScore: ranking.score / 10,
            claudeScore: ranking.score,
            claudeReasoning: ranking.reason,
            excerpts: ranking.excerpt ? [{
              text: ranking.excerpt,
              hasCode: ranking.excerpt.includes('```') || ranking.excerpt.includes('function') || ranking.excerpt.includes('const ')
            }] : []
          };
        });

      return NextResponse.json({
        success: true,
        query,
        results,
        count: results.length,
        aiPowered: true
      });

    } catch (anthropicError: any) {
      console.error('[AI-SEARCH] Anthropic API error:', anthropicError);
      return fallbackSearch(query, documents);
    }

  } catch (error: any) {
    console.error('[AI-SEARCH] Search failed:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

function fallbackSearch(query: string, documents: DocForSearch[]): NextResponse {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const results: RankedResult[] = documents
    .map(doc => {
      const titleLower = doc.title.toLowerCase();
      const contentLower = (doc.content || doc.excerpt || '').toLowerCase();
      const categoriesLower = (doc.categories || []).map(c => c.toLowerCase());

      let score = 0;
      
      if (titleLower.includes(queryLower)) score += 5;
      queryWords.forEach(word => {
        if (titleLower.includes(word)) score += 2;
        if (contentLower.includes(word)) score += 1;
        if (categoriesLower.some(c => c.includes(word))) score += 1;
      });

      return {
        doc,
        score: Math.min(score, 10)
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => ({
      docId: item.doc.docId,
      title: item.doc.title,
      url: item.doc.url,
      categories: item.doc.categories || [],
      relevanceScore: item.score / 10,
      claudeScore: item.score,
      claudeReasoning: 'Basic text matching (AI search unavailable)',
      excerpts: item.doc.content || item.doc.excerpt ? [{
        text: (item.doc.content || item.doc.excerpt || '').substring(0, 200),
        hasCode: false
      }] : []
    }));

  return NextResponse.json({
    success: true,
    query,
    results,
    count: results.length,
    aiPowered: false
  });
}
