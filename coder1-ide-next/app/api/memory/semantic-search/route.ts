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

    if (!embeddingService.isConfigured()) {
      return NextResponse.json(
        { 
          error: 'Semantic search unavailable - OpenAI API key not configured',
          fallback: 'Use keyword search instead'
        },
        { status: 503 }
      );
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
