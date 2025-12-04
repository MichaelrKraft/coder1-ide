import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/embedding-service';
import { vectorSearchService, VectorDocument } from '@/lib/vector-search';
import { contextDatabase } from '@/services/context-database';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 5, threshold = 0.7 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query text is required' },
        { status: 400 }
      );
    }

    // Fall back to keyword search if OpenAI API not configured
    if (!embeddingService.isConfigured()) {
      console.log('⚠️ [SEARCH] OpenAI API not configured, using keyword fallback');
      return await keywordSearchFallback(query, topK);
    }

    const startTime = Date.now();

    console.log('🔍 [SEMANTIC-SEARCH] Query:', query);
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    console.log('✅ [SEMANTIC-SEARCH] Query embedding generated:', queryEmbedding ? `${queryEmbedding.length} dimensions` : 'FAILED');

    if (!queryEmbedding) {
      return NextResponse.json(
        { error: 'Failed to generate query embedding' },
        { status: 500 }
      );
    }

    await ensureVectorIndex();
    const indexStats = vectorSearchService.getIndexStats();
    console.log('📊 [SEMANTIC-SEARCH] Index stats:', indexStats);

    const searchResults = await vectorSearchService.search(
      queryEmbedding,
      topK,
      threshold
    );

    console.log('🎯 [SEMANTIC-SEARCH] Search complete:', searchResults.length, 'results above threshold', threshold);
    if (searchResults.length > 0) {
      console.log('🔝 [SEMANTIC-SEARCH] Top result similarity:', searchResults[0].similarity.toFixed(3));
    }

    const conversationIds = searchResults.map(r => r.id);
    const conversations = await getConversationDetails(conversationIds);

    const results = searchResults.map(result => {
      const conversation = conversations.find(c => c.id === result.id);
      return {
        ...result,
        conversation: conversation || null,
      };
    });

    const duration = Date.now() - startTime;

    logger.debug(
      `🔍 Semantic search completed in ${duration}ms - ${results.length} results`
    );

    return NextResponse.json({
      results,
      stats: {
        queryTime: duration,
        resultsCount: results.length,
        threshold,
        indexStats: vectorSearchService.getIndexStats(),
      },
    });
  } catch (error: any) {
    logger.error('❌ Semantic search failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

async function ensureVectorIndex(): Promise<void> {
  const stats = vectorSearchService.getIndexStats();

  if (stats.documentCount === 0) {
    logger.debug('🔄 Building vector index from database...');

    await contextDatabase.initialize();

    const db = (contextDatabase as any).db;
    if (!db) {
      throw new Error('Database not initialized');
    }

    const conversations = db
      .prepare(
        `SELECT id, embedding FROM claude_conversations 
         WHERE embedding IS NOT NULL 
         ORDER BY timestamp DESC 
         LIMIT 1000`
      )
      .all();

    console.log('📥 [SEMANTIC-SEARCH] Loaded', conversations.length, 'conversations from DB');

    const documents: VectorDocument[] = [];

    for (const conv of conversations) {
      try {
        const embedding = JSON.parse(conv.embedding);
        if (Array.isArray(embedding) && embedding.length > 0) {
          documents.push({
            id: conv.id,
            embedding,
          });
        }
      } catch (e) {
        logger.warn(`⚠️ Failed to parse embedding for conversation ${conv.id}`);
      }
    }

    await vectorSearchService.addDocuments(documents);

    console.log('✅ [SEMANTIC-SEARCH] Vector index built with', documents.length, 'documents');
    console.log('⚠️ [SEMANTIC-SEARCH] Failed to parse', conversations.length - documents.length, 'embeddings');
    logger.debug(`✅ Vector index built with ${documents.length} documents`);
  }
}

async function getConversationDetails(ids: string[]): Promise<any[]> {
  if (ids.length === 0) {
    return [];
  }

  await contextDatabase.initialize();

  const db = (contextDatabase as any).db;
  if (!db) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(',');
  const conversations = db
    .prepare(
      `SELECT 
        id,
        user_input,
        claude_reply,
        timestamp,
        success,
        error_type,
        files_involved,
        tokens_used
      FROM claude_conversations 
      WHERE id IN (${placeholders})`
    )
    .all(...ids);

  return conversations.map((conv: any) => ({
    id: conv.id,
    userInput: conv.user_input,
    claudeReply: conv.claude_reply,
    timestamp: conv.timestamp,
    success: conv.success === 1,
    errorType: conv.error_type,
    filesInvolved: conv.files_involved ? JSON.parse(conv.files_involved) : [],
    tokensUsed: conv.tokens_used,
  }));
}

// Keyword-only fallback when OpenAI API is not available
async function keywordSearchFallback(query: string, topK: number): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    await contextDatabase.initialize();
    const db = (contextDatabase as any).db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Tokenize query into keywords for flexible matching
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

    if (keywords.length === 0) {
      return NextResponse.json({
        results: [],
        stats: { queryTime: Date.now() - startTime, resultsCount: 0, searchMode: 'keyword' }
      });
    }

    // Build SQL LIKE conditions for each keyword
    const conditions = keywords.map(() =>
      `(LOWER(user_input) LIKE ? OR LOWER(claude_reply) LIKE ?)`
    ).join(' OR ');

    const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

    const conversations = db.prepare(`
      SELECT
        id,
        user_input,
        claude_reply,
        timestamp,
        success,
        error_type,
        files_involved,
        tokens_used
      FROM claude_conversations
      WHERE ${conditions}
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(...params, topK);

    // Calculate simple relevance score based on keyword matches
    const results = conversations.map((conv: any) => {
      const text = `${conv.user_input || ''} ${conv.claude_reply || ''}`.toLowerCase();
      const matchCount = keywords.filter(k => text.includes(k)).length;
      const similarity = matchCount / keywords.length; // 0-1 range

      return {
        id: conv.id,
        similarity: Math.round(similarity * 100) / 100,
        conversation: {
          id: conv.id,
          userInput: conv.user_input,
          claudeReply: conv.claude_reply,
          timestamp: conv.timestamp,
          success: conv.success === 1,
          errorType: conv.error_type,
          filesInvolved: conv.files_involved ? JSON.parse(conv.files_involved) : [],
          tokensUsed: conv.tokens_used,
        }
      };
    });

    // Sort by relevance (keyword match count)
    results.sort((a: any, b: any) => b.similarity - a.similarity);

    const duration = Date.now() - startTime;

    console.log(`🔑 [KEYWORD-SEARCH] Found ${results.length} results in ${duration}ms`);

    return NextResponse.json({
      results,
      stats: {
        queryTime: duration,
        resultsCount: results.length,
        searchMode: 'keyword', // Indicates fallback was used
        keywords,
      },
    });
  } catch (error: any) {
    logger.error('❌ Keyword search fallback failed:', error);
    return NextResponse.json(
      { error: 'Keyword search failed', message: error.message },
      { status: 500 }
    );
  }
}
