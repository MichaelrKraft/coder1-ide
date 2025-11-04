import { logger } from './logger';

export interface VectorSearchResult {
  id: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface VectorDocument {
  id: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export class VectorSearchService {
  private index: Map<string, VectorDocument>;
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private indexingInProgress = false;

  constructor() {
    this.index = new Map();
  }

  async addDocument(doc: VectorDocument): Promise<void> {
    if (!doc.embedding || doc.embedding.length === 0) {
      logger.warn(`⚠️ Skipping document ${doc.id} - no embedding`);
      return;
    }

    this.index.set(doc.id, doc);
    logger.debug(`✅ Added document ${doc.id} to vector index`);
  }

  async addDocuments(docs: VectorDocument[]): Promise<void> {
    this.indexingInProgress = true;

    try {
      for (const doc of docs) {
        await this.addDocument(doc);
      }

      logger.debug(`✅ Indexed ${docs.length} documents`);
    } finally {
      this.indexingInProgress = false;
    }
  }

  async search(
    queryEmbedding: number[],
    topK: number = 5,
    threshold: number = this.SIMILARITY_THRESHOLD
  ): Promise<VectorSearchResult[]> {
    if (!queryEmbedding || queryEmbedding.length === 0) {
      logger.warn('⚠️ Empty query embedding');
      return [];
    }

    const startTime = Date.now();
    const results: VectorSearchResult[] = [];

    for (const [id, doc] of this.index.entries()) {
      if (!doc.embedding || doc.embedding.length !== queryEmbedding.length) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);

      if (similarity >= threshold) {
        results.push({
          id,
          similarity,
          metadata: doc.metadata,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);

    const topResults = results.slice(0, topK);
    const duration = Date.now() - startTime;

    logger.debug(
      `🔍 Vector search completed in ${duration}ms - ${topResults.length}/${results.length} results above threshold`
    );

    return topResults;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async removeDocument(id: string): Promise<boolean> {
    const deleted = this.index.delete(id);

    if (deleted) {
      logger.debug(`🗑️ Removed document ${id} from vector index`);
    }

    return deleted;
  }

  async clear(): Promise<void> {
    this.index.clear();
    logger.debug('🧹 Vector index cleared');
  }

  getIndexStats(): {
    documentCount: number;
    indexingInProgress: boolean;
    memoryUsageEstimate: string;
  } {
    const docCount = this.index.size;
    const avgEmbeddingSize = 1536 * 8;
    const estimatedBytes = docCount * avgEmbeddingSize;
    const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);

    return {
      documentCount: docCount,
      indexingInProgress: this.indexingInProgress,
      memoryUsageEstimate: `${estimatedMB} MB`,
    };
  }

  async rebuildIndex(documents: VectorDocument[]): Promise<void> {
    await this.clear();
    await this.addDocuments(documents);
    logger.debug(`🔄 Rebuilt vector index with ${documents.length} documents`);
  }

  hasDocument(id: string): boolean {
    return this.index.has(id);
  }

  async bulkSearch(
    queries: Array<{ id: string; embedding: number[] }>,
    topK: number = 5,
    threshold: number = this.SIMILARITY_THRESHOLD
  ): Promise<Map<string, VectorSearchResult[]>> {
    const results = new Map<string, VectorSearchResult[]>();

    for (const query of queries) {
      const queryResults = await this.search(query.embedding, topK, threshold);
      results.set(query.id, queryResults);
    }

    return results;
  }
}

export const vectorSearchService = new VectorSearchService();
export default vectorSearchService;
