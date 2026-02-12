/**
 * Johnny5 Memory Search API
 *
 * POST /api/johnny5/context/search
 *
 * Searches the memory system using hybrid vector + keyword search.
 * Falls back to keyword-only search if vector search is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  searchMemory,
  createGeminiProvider,
  type SearchResponse,
} from '@/services/memory';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SearchRequest {
  query: string;
  topK?: number;
  maxTokens?: number;
  minScore?: number;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// Singleton embedding provider (lazy initialized)
let embeddingProvider: ReturnType<typeof createGeminiProvider> | null = null;

function getEmbeddingProvider() {
  if (!embeddingProvider) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      embeddingProvider = createGeminiProvider({ apiKey });
    }
  }
  return embeddingProvider;
}

export async function POST(request: NextRequest) {
  try {
    let userId = 'default';
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        const decoded = verifyAccessToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
    }

    const body: SearchRequest = await request.json();
    const { query, topK = 10, maxTokens = 4000, minScore = 0.1 } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required',
          timestamp: new Date(),
        } as APIResponse<null>,
        { status: 400 }
      );
    }

    // Try to get embedding for hybrid search
    let queryEmbedding: number[] | undefined;
    const provider = getEmbeddingProvider();

    if (provider) {
      try {
        const embeddings = await provider.embed([query.trim()]);
        if (embeddings.length > 0) {
          queryEmbedding = embeddings[0];
        }
      } catch (embeddingError) {
        console.warn('[Memory Search] Embedding failed, falling back to keyword search:', embeddingError);
      }
    }

    // Perform search (hybrid if embedding available, keyword-only otherwise)
    const searchResponse: SearchResponse = await searchMemory(query.trim(), queryEmbedding, {
      userId,
      topK,
      maxTokens,
      minScore,
    });

    // Transform results for UI consumption
    const results = searchResponse.results.map(result => ({
      id: result.chunk_id,
      content: result.content,
      sourceType: result.source_type,
      sourceId: result.source_id,
      score: result.combined_score,
      citation: result.citation,
      tokenCount: result.tokenCount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        results,
        query: searchResponse.query,
        totalTokens: searchResponse.totalTokens,
        searchType: searchResponse.searchType,
        vectorAvailable: searchResponse.vectorAvailable,
        processingTimeMs: searchResponse.processingTimeMs,
      },
      timestamp: new Date(),
    } as APIResponse<typeof searchResponse>);

  } catch (error) {
    console.error('[Memory Search] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        timestamp: new Date(),
      } as APIResponse<null>,
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const provider = getEmbeddingProvider();

  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/johnny5/context/search',
      method: 'POST',
      embeddingAvailable: !!provider,
      usage: {
        query: 'string (required)',
        topK: 'number (optional, default: 10)',
        maxTokens: 'number (optional, default: 4000)',
        minScore: 'number (optional, default: 0.1)',
      },
    },
    timestamp: new Date(),
  });
}
