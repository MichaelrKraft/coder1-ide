import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Documentation Intelligence Service (Next.js TypeScript Port)
 * Handles smart documentation storage, retrieval, and integration with Claude Code
 */
export class DocumentationIntelligence extends EventEmitter {
  private docsDir: string;
  private cacheDir: string;
  private maxCacheAge: number;
  private maxTokensPerSearch: number;

  constructor(options: {
    docsDir?: string;
    cacheDir?: string;
    maxCacheAge?: number;
    maxTokensPerSearch?: number;
  } = {}) {
    super();
    
    this.docsDir = options.docsDir || path.join(process.cwd(), 'data/documentation');
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'data/doc-cache');
    this.maxCacheAge = options.maxCacheAge || 24 * 60 * 60 * 1000; // 24 hours
    this.maxTokensPerSearch = options.maxTokensPerSearch || 2000;
    
    // Initialize directories
    this.initializeDirectories();
  }

  async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.docsDir, { recursive: true });
      await fs.mkdir(this.cacheDir, { recursive: true });
      // REMOVED: // REMOVED: console.log('📁 [DOC-INTEL] Documentation directories initialized');
    } catch (error) {
      console.error('❌ [DOC-INTEL] Failed to initialize directories:', error);
    }
  }

  /**
   * Smart content extraction with improved heuristics
   */
  extractSmartContent(html: string, url: string): {
    title: string;
    description: string;
    content: string;
    headings: Array<{ level: number; text: string }>;
    codeBlocks: string[];
    wordCount: number;
    extractedWith: string;
  } {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer',
      '.nav', '.navigation', '.sidebar', '.menu',
      '.ads', '.advertisement', '.social', '.share',
      '.comments', '.related', '.recommended',
      '.breadcrumb', '.pagination', '.toc'
    ];
    
    unwantedSelectors.forEach(selector => $(selector).remove());
    
    // Extract metadata
    const title = $('h1').first().text().trim() || $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Try content selectors in order of preference
    const contentSelectors = [
      'main article',
      'main .content',
      'main',
      'article',
      '.content',
      '.main-content',
      '.documentation',
      '.docs-content',
      '.markdown-body',
      '.prose',
      '#content',
      '.post-content'
    ];
    
    let content = '';
    let contentSelector = 'body';
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length) {
        const text = element.text().trim();
        if (text.length > 200) { // Minimum meaningful content
          content = text;
          contentSelector = selector;
          break;
        }
      }
    }
    
    // Fallback to body if nothing found
    if (!content) {
      content = $('body').text().trim();
    }
    
    // Clean up content
    content = this.cleanContent(content);
    
    // Extract headings for structure
    const headings: Array<{ level: number; text: string }> = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const level = parseInt((el as any).tagName[1]);
      const text = $(el).text().trim();
      if (text) {
        headings.push({ level, text });
      }
    });

    // Extract code blocks
    const codeBlocks: string[] = [];
    $('pre code, code, .highlight pre').each((i, el) => {
      const code = $(el).text().trim();
      if (code.length > 10) { // Minimum code length
        codeBlocks.push(code);
      }
    });

    return {
      title,
      description,
      content,
      headings,
      codeBlocks,
      wordCount: content.split(/\s+/).length,
      extractedWith: contentSelector
    };
  }

  /**
   * Clean and normalize content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\n+/g, '\n')          // Remove excessive newlines
      .replace(/\t+/g, ' ')           // Replace tabs with spaces
      .trim();
  }

  /**
   * Generate unique ID for documentation
   */
  private generateDocId(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  /**
   * Check if document exists
   */
  private async exists(docId: string): Promise<boolean> {
    try {
      const docPath = path.join(this.docsDir, `${docId}.json`);
      await fs.access(docPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract headings from content
   */
  private extractHeadings(content: string): Array<{ level: number; text: string }> {
    const headings: Array<{ level: number; text: string }> = [];
    
    // Match markdown headings
    const markdownHeadings = content.match(/^#{1,6}\s+.+$/gm);
    if (markdownHeadings) {
      markdownHeadings.forEach(heading => {
        const level = heading.match(/^#{1,6}/)?.[0].length || 1;
        const text = heading.replace(/^#{1,6}\s+/, '').trim();
        headings.push({ level, text });
      });
    }
    
    return headings;
  }

  /**
   * Extract code blocks from content
   */
  private extractCodeBlocks(content: string): string[] {
    const codeBlocks: string[] = [];
    
    // Match fenced code blocks
    const fencedBlocks = content.match(/```[\s\S]*?```/g);
    if (fencedBlocks) {
      fencedBlocks.forEach(block => {
        const code = block.replace(/^```.*?\n/, '').replace(/```$/, '').trim();
        if (code) {
          codeBlocks.push(code);
        }
      });
    }
    
    // Match inline code
    const inlineCode = content.match(/`[^`\n]+`/g);
    if (inlineCode) {
      inlineCode.forEach(code => {
        const cleanCode = code.replace(/`/g, '').trim();
        if (cleanCode && cleanCode.length > 2) {
          codeBlocks.push(cleanCode);
        }
      });
    }
    
    return codeBlocks;
  }

  /**
   * Add documentation from direct content
   */
  async addFromContent(title: string, content: string, category?: string): Promise<{
    id: string;
    title: string;
    url: string;
    category: string;
    chunks: number;
    wordCount: number;
  }> {
    try {
      // Create a fake URL for content-based documents
      const fakeUrl = `content://uploaded/${title.replace(/\s+/g, '-').toLowerCase()}`;
      const docId = crypto.createHash('md5').update(fakeUrl).digest('hex');
      
      // Check if already exists
      if (await this.exists(docId)) {
        throw new Error(`Document with title "${title}" already exists`);
      }

      // Process the content directly
      const extracted = {
        content: content.trim(),
        title: title.trim(),
        headings: this.extractHeadings(content),
        codeBlocks: this.extractCodeBlocks(content),
        wordCount: content.trim().split(/\s+/).length,
        extractedWith: 'direct-upload'
      };

      // Chunk the content
      const chunks = this.chunkContent(extracted.content, extracted.headings);

      // Prepare document metadata
      const docData = {
        id: docId,
        title: extracted.title,
        url: fakeUrl,
        category: category || 'Uploaded Files',
        addedAt: new Date().toISOString(),
        wordCount: extracted.wordCount,
        headings: extracted.headings,
        codeBlocks: extracted.codeBlocks,
        chunks: chunks.length,
        extractedWith: extracted.extractedWith
      };

      // Save document metadata and chunks
      const docPath = path.join(this.docsDir, `${docId}.json`);
      await fs.writeFile(docPath, JSON.stringify({ 
        ...docData,
        content: extracted.content,
        chunks 
      }, null, 2));

      // REMOVED: // REMOVED: // REMOVED: console.log(`✅ [DOC-INTEL] Added documentation: ${docData.title} (${chunks.length} chunks)`);
      
      return {
        id: docId,
        title: docData.title,
        url: fakeUrl,
        category: docData.category,
        chunks: chunks.length,
        wordCount: extracted.wordCount
      };
    } catch (error: any) {
      console.error(`❌ [DOC-INTEL] Failed to add content documentation:`, error);
      throw new Error(`Failed to process content: ${error.message}`);
    }
  }

  /**
   * Add documentation from URL
   */
  async addFromUrl(url: string, category?: string): Promise<{
    id: string;
    title: string;
    url: string;
    category: string;
    chunks: number;
    wordCount: number;
  }> {
    try {
      // REMOVED: // REMOVED: console.log(`📥 [DOC-INTEL] Fetching documentation from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DocumentationBot/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const extracted = this.extractSmartContent(html, url);
      
      if (!extracted.content || extracted.wordCount < 50) {
        throw new Error('No meaningful content found on the page');
      }

      const docId = this.generateDocId(url);
      const chunks = this.chunkContent(extracted.content, extracted.headings);
      
      const docData = {
        id: docId,
        url,
        title: extracted.title || 'Untitled Documentation',
        description: extracted.description,
        category: category || 'General',
        addedAt: new Date().toISOString(),
        wordCount: extracted.wordCount,
        headings: extracted.headings,
        codeBlocks: extracted.codeBlocks,
        chunks: chunks.length,
        extractedWith: extracted.extractedWith
      };

      // Save document metadata and chunks
      const docPath = path.join(this.docsDir, `${docId}.json`);
      await fs.writeFile(docPath, JSON.stringify({ 
        ...docData,
        content: extracted.content,
        chunks 
      }, null, 2));

      // REMOVED: console.log(`✅ [DOC-INTEL] Added documentation: ${docData.title} (${chunks.length} chunks)`);
      
      return {
        id: docId,
        title: docData.title,
        url,
        category: docData.category,
        chunks: chunks.length,
        wordCount: extracted.wordCount
      };
    } catch (error: any) {
      console.error(`❌ [DOC-INTEL] Failed to add documentation from ${url}:`, error);
      throw new Error(`Failed to process documentation: ${error.message}`);
    }
  }

  /**
   * Chunk content intelligently
   */
  private chunkContent(content: string, headings: Array<{ level: number; text: string }>): Array<{
    id: string;
    content: string;
    headings: string[];
    wordCount: number;
  }> {
    const chunks: Array<{
      id: string;
      content: string;
      headings: string[];
      wordCount: number;
    }> = [];
    
    // Simple chunking for now - can be enhanced later
    const words = content.split(/\s+/);
    const chunkSize = 800; // ~800 words per chunk
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkContent = chunkWords.join(' ');
      
      chunks.push({
        id: crypto.createHash('md5').update(chunkContent).digest('hex'),
        content: chunkContent,
        headings: headings.map(h => h.text).slice(0, 3), // Top 3 headings for context
        wordCount: chunkWords.length
      });
    }
    
    return chunks;
  }

  /**
   * Search documentation
   */
  async search(query: string, options: {
    maxTokens?: number;
    category?: string;
  } = {}): Promise<Array<{
    id: string;
    title: string;
    url: string;
    category: string;
    relevanceScore: number;
    snippet: string;
    headings: string[];
  }>> {
    try {
      const maxTokens = options.maxTokens || this.maxTokensPerSearch;
      const results: Array<{
        id: string;
        title: string;
        url: string;
        category: string;
        relevanceScore: number;
        snippet: string;
        headings: string[];
      }> = [];

      // Read all documentation files
      const files = await fs.readdir(this.docsDir);
      const docFiles = files.filter(f => f.endsWith('.json'));

      for (const file of docFiles) {
        const docPath = path.join(this.docsDir, file);
        const docData = JSON.parse(await fs.readFile(docPath, 'utf-8'));
        
        // Filter by category if specified
        if (options.category && docData.category !== options.category) {
          continue;
        }

        // Calculate relevance score
        const score = this.calculateRelevanceScore(query, docData);
        
        if (score > 0) {
          const snippet = this.extractSnippet(query, docData.content, 200);
          
          results.push({
            id: docData.id,
            title: docData.title,
            url: docData.url,
            category: docData.category,
            relevanceScore: score,
            snippet,
            headings: docData.headings?.map((h: any) => h.text) || []
          });
        }
      }

      // Sort by relevance and return top results
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10); // Top 10 results
        
    } catch (error: any) {
      console.error(`❌ [DOC-INTEL] Search failed:`, error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(query: string, doc: any): number {
    const queryLower = query.toLowerCase();
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    
    let score = 0;
    
    // Title matching (highest weight)
    if (titleLower.includes(queryLower)) {
      score += 10;
    }
    
    // Content matching
    const contentMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    score += contentMatches * 0.1;
    
    // Heading matching
    if (doc.headings) {
      for (const heading of doc.headings) {
        if (heading.text.toLowerCase().includes(queryLower)) {
          score += 2;
        }
      }
    }
    
    return score;
  }

  /**
   * Extract relevant snippet
   */
  private extractSnippet(query: string, content: string, maxLength: number): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    const index = contentLower.indexOf(queryLower);
    if (index === -1) {
      return content.substring(0, maxLength) + '...';
    }
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + maxLength);
    
    return (start > 0 ? '...' : '') + 
           content.substring(start, end) + 
           (end < content.length ? '...' : '');
  }

  /**
   * List all documentation
   */
  async listAll(): Promise<Array<{
    id: string;
    title: string;
    url: string;
    category: string;
    addedAt: string;
    wordCount: number;
    chunks: number;
  }>> {
    try {
      const files = await fs.readdir(this.docsDir);
      const docFiles = files.filter(f => f.endsWith('.json'));
      
      const docs = [];
      for (const file of docFiles) {
        const docPath = path.join(this.docsDir, file);
        const docData = JSON.parse(await fs.readFile(docPath, 'utf-8'));
        
        docs.push({
          id: docData.id,
          title: docData.title,
          url: docData.url,
          category: docData.category,
          addedAt: docData.addedAt,
          wordCount: docData.wordCount,
          chunks: Array.isArray(docData.chunks) ? docData.chunks.length : (docData.chunks || 0)
        });
      }
      
      return docs.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    } catch (error: any) {
      console.error(`❌ [DOC-INTEL] Failed to list documentation:`, error);
      return [];
    }
  }

  /**
   * Remove documentation
   */
  async remove(id: string): Promise<boolean> {
    try {
      const docPath = path.join(this.docsDir, `${id}.json`);
      await fs.unlink(docPath);
      // REMOVED: // REMOVED: console.log(`🗑️ [DOC-INTEL] Removed documentation: ${id}`);
      return true;
    } catch (error: any) {
      console.error(`❌ [DOC-INTEL] Failed to remove documentation:`, error);
      return false;
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{
    status: string;
    docsCount: number;
    storageDir: string;
    timestamp: string;
  }> {
    try {
      const files = await fs.readdir(this.docsDir);
      const docFiles = files.filter(f => f.endsWith('.json'));
      
      return {
        status: 'healthy',
        docsCount: docFiles.length,
        storageDir: this.docsDir,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        docsCount: 0,
        storageDir: this.docsDir,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let docIntelligence: DocumentationIntelligence | null = null;

export function getDocumentationIntelligence(): DocumentationIntelligence {
  if (!docIntelligence) {
    docIntelligence = new DocumentationIntelligence();
  }
  return docIntelligence;
}