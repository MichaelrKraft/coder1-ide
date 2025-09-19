const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

/**
 * Documentation Service - Local Documentation Server with Claude Search
 * 
 * This service creates a local documentation server that:
 * 1. Fetches and caches documentation from URLs
 * 2. Intelligently chunks content for AI consumption
 * 3. Provides semantic search via Claude Code
 * 4. Serves documentation with AI-enhanced context
 * 5. Manages documentation lifecycle and updates
 */
class DocumentationService {
  constructor(options) {
    this.logger = options.logger;
    this.claudeBridge = options.claudeBridge;
    this.config = options.config;
    
    // Documentation storage
    this.docsCache = new Map();
    this.searchIndex = new Map();
    this.urlCache = new Map();
    
    // Service configuration
    this.cacheDir = null;
    this.maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
    this.maxChunkSize = 800; // Words per chunk for optimal AI processing
    this.chunkOverlap = 100; // Word overlap between chunks
  }

  async initialize(projectPath) {
    this.logger.info('📚 Initializing Documentation Service...');

    try {
      // Setup documentation directory
      this.cacheDir = path.join(projectPath, '.claude', 'documentation');
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Create subdirectories
      await fs.mkdir(path.join(this.cacheDir, 'cache'), { recursive: true });
      await fs.mkdir(path.join(this.cacheDir, 'chunks'), { recursive: true });
      await fs.mkdir(path.join(this.cacheDir, 'search'), { recursive: true });
      
      // Load existing documentation
      await this.loadExistingDocumentation();
      
      // Setup cleanup interval
      this.startCleanupInterval();
      
      this.logger.success(`✅ Documentation Service initialized: ${this.docsCache.size} documents cached`);
      
      return {
        success: true,
        cacheDir: this.cacheDir,
        documentsLoaded: this.docsCache.size
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize Documentation Service:', error);
      throw error;
    }
  }

  async addDocumentationFromUrl(url, options = {}) {
    this.logger.info(`📥 Adding documentation from: ${url}`);

    try {
      // Generate document ID
      const docId = this.generateDocumentId(url);
      
      // Check if already cached and fresh
      if (this.isDocumentFresh(docId)) {
        this.logger.info(`📋 Using cached documentation: ${docId}`);
        return { success: true, docId, cached: true };
      }
      
      // Fetch content
      const content = await this.fetchDocumentationContent(url, options);
      
      // Process and chunk content
      const processedDoc = await this.processDocumentation(url, content, options);
      
      // Store in cache
      await this.storeDocumentation(docId, processedDoc);
      
      // Update search index
      await this.updateSearchIndex(docId, processedDoc);
      
      this.logger.success(`✅ Documentation added: ${docId} (${processedDoc.chunks.length} chunks)`);
      
      return {
        success: true,
        docId,
        url,
        title: processedDoc.title,
        chunks: processedDoc.chunks.length,
        size: processedDoc.content.length,
        cached: false
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to add documentation from ${url}:`, error);
      throw error;
    }
  }

  async searchDocumentation(query, options = {}) {
    this.logger.info(`🔍 Searching documentation: "${query}"`);

    try {
      const {
        maxResults = 10,
        includeContent = true,
        useClaudeAnalysis = true,
        projectContext = null
      } = options;

      // Stage 1: Basic text matching
      const basicMatches = await this.performBasicSearch(query, maxResults * 2);
      
      // Stage 2: Claude-enhanced semantic search (if enabled)
      let enhancedResults = basicMatches;
      if (useClaudeAnalysis && basicMatches.length > 0) {
        enhancedResults = await this.performClaudeEnhancedSearch(query, basicMatches, {
          projectContext,
          maxResults
        });
      }
      
      // Stage 3: Format results
      const formattedResults = await this.formatSearchResults(enhancedResults, {
        includeContent,
        maxResults
      });
      
      this.logger.success(`✅ Search completed: ${formattedResults.length} results for "${query}"`);
      
      return {
        query,
        results: formattedResults,
        totalFound: enhancedResults.length,
        searchType: useClaudeAnalysis ? 'claude-enhanced' : 'basic',
        searchTime: Date.now()
      };
      
    } catch (error) {
      this.logger.error(`❌ Documentation search failed for "${query}":`, error);
      throw error;
    }
  }

  async fetchDocumentationContent(url, options = {}) {
    const {
      timeout = 30000,
      userAgent = 'Coder1-Companion Documentation Fetcher',
      retries = 3
    } = options;

    this.logger.info(`🌐 Fetching content from: ${url}`);

    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(url, {
          timeout,
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        
        // Extract meaningful content using intelligent parsing
        const content = await this.extractContentFromHtml(html, url);
        
        this.logger.success(`✅ Content fetched: ${content.text.length} characters`);
        
        return content;
        
      } catch (error) {
        lastError = error;
        this.logger.warn(`⚠️ Attempt ${attempt}/${retries} failed: ${error.message}`);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw new Error(`Failed to fetch documentation after ${retries} attempts: ${lastError.message}`);
  }

  async extractContentFromHtml(html, url) {
    const { default: cheerio } = await import('cheerio');
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, footer, header, .navigation, .sidebar, .menu, .ads, .advertisement').remove();
    $('[class*="nav"], [class*="menu"], [class*="sidebar"], [class*="footer"], [class*="header"]').remove();
    $('[id*="nav"], [id*="menu"], [id*="sidebar"], [id*="footer"], [id*="header"]').remove();
    
    // Extract title
    let title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Documentation';
    
    // Extract main content with intelligent selectors
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.documentation',
      '.docs',
      '.article',
      '.post-content',
      '#content',
      '#main',
      'article'
    ];
    
    let mainContent = null;
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 200) {
        mainContent = element;
        break;
      }
    }
    
    // Fallback to body if no main content found
    if (!mainContent || mainContent.text().trim().length < 100) {
      mainContent = $('body');
    }
    
    // Extract structured content
    const headings = [];
    mainContent.find('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const level = parseInt(el.tagName.slice(1));
      const text = $(el).text().trim();
      if (text) {
        headings.push({ level, text, index: i });
      }
    });
    
    // Extract code blocks
    const codeBlocks = [];
    mainContent.find('pre, code').each((i, el) => {
      const code = $(el).text().trim();
      if (code && code.length > 10) {
        codeBlocks.push({
          language: $(el).attr('class')?.match(/language-(\w+)/)?.[1] || 'unknown',
          code,
          index: i
        });
      }
    });
    
    // Extract main text
    const textContent = mainContent.text()
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      url,
      title,
      text: textContent,
      headings,
      codeBlocks,
      extractedAt: new Date().toISOString(),
      wordCount: textContent.split(/\s+/).length
    };
  }

  async processDocumentation(url, content, options = {}) {
    const {
      customChunkSize = this.maxChunkSize,
      preserveStructure = true
    } = options;

    this.logger.info(`🔧 Processing documentation: ${content.title}`);

    // Create intelligent chunks
    const chunks = await this.createIntelligentChunks(content, {
      maxSize: customChunkSize,
      preserveStructure
    });
    
    // Generate document metadata
    const metadata = {
      url,
      title: content.title,
      headings: content.headings,
      codeBlocks: content.codeBlocks,
      wordCount: content.wordCount,
      chunkCount: chunks.length,
      processedAt: new Date().toISOString(),
      categories: this.categorizeContent(content)
    };
    
    return {
      id: this.generateDocumentId(url),
      url,
      title: content.title,
      content: content.text,
      metadata,
      chunks,
      extractedAt: content.extractedAt,
      processedAt: new Date().toISOString()
    };
  }

  async createIntelligentChunks(content, options = {}) {
    const { maxSize = 800, preserveStructure = true } = options;
    
    const chunks = [];
    const words = content.text.split(/\s+/);
    
    if (preserveStructure && content.headings.length > 0) {
      // Structure-aware chunking using headings
      let currentChunk = '';
      let currentHeading = null;
      let wordIndex = 0;
      
      for (const word of words) {
        // Check if we're at a heading boundary
        const nearbyHeading = this.findNearbyHeading(content.headings, wordIndex, words);
        
        if (nearbyHeading && nearbyHeading !== currentHeading) {
          // Save current chunk if it has content
          if (currentChunk.trim()) {
            chunks.push(this.createChunkObject(currentChunk, currentHeading, chunks.length));
          }
          
          // Start new chunk
          currentHeading = nearbyHeading;
          currentChunk = word;
        } else {
          currentChunk += ' ' + word;
        }
        
        // Split if chunk gets too large
        if (currentChunk.split(/\s+/).length >= maxSize) {
          chunks.push(this.createChunkObject(currentChunk, currentHeading, chunks.length));
          
          // Start new chunk with overlap
          const overlapWords = currentChunk.split(/\s+/).slice(-this.chunkOverlap);
          currentChunk = overlapWords.join(' ');
        }
        
        wordIndex++;
      }
      
      // Add final chunk
      if (currentChunk.trim()) {
        chunks.push(this.createChunkObject(currentChunk, currentHeading, chunks.length));
      }
      
    } else {
      // Simple sliding window chunking
      for (let i = 0; i < words.length; i += maxSize - this.chunkOverlap) {
        const chunkWords = words.slice(i, i + maxSize);
        const chunkText = chunkWords.join(' ');
        
        if (chunkText.trim()) {
          chunks.push(this.createChunkObject(chunkText, null, chunks.length));
        }
      }
    }
    
    this.logger.info(`📄 Created ${chunks.length} intelligent chunks`);
    return chunks;
  }

  createChunkObject(text, heading, index) {
    return {
      index,
      text: text.trim(),
      heading: heading?.text || null,
      headingLevel: heading?.level || null,
      wordCount: text.trim().split(/\s+/).length,
      hasCode: /```|`[^`]+`|\bfunction\b|\bclass\b|\bimport\b/.test(text),
      createdAt: new Date().toISOString()
    };
  }

  findNearbyHeading(headings, wordIndex, words) {
    // Simple heuristic: find heading text that appears near current word position
    const windowSize = 50;
    const windowStart = Math.max(0, wordIndex - windowSize);
    const windowEnd = Math.min(words.length, wordIndex + windowSize);
    const windowText = words.slice(windowStart, windowEnd).join(' ').toLowerCase();
    
    for (const heading of headings) {
      if (windowText.includes(heading.text.toLowerCase())) {
        return heading;
      }
    }
    
    return null;
  }

  categorizeContent(content) {
    const categories = [];
    const text = content.text.toLowerCase();
    
    // Programming language detection
    const languages = ['javascript', 'typescript', 'python', 'react', 'node', 'express', 'next'];
    for (const lang of languages) {
      if (text.includes(lang)) {
        categories.push(lang);
      }
    }
    
    // Content type detection
    if (text.includes('api') || text.includes('endpoint')) categories.push('api');
    if (text.includes('tutorial') || text.includes('guide')) categories.push('tutorial');
    if (text.includes('reference') || text.includes('documentation')) categories.push('reference');
    if (content.codeBlocks.length > 0) categories.push('code-examples');
    if (text.includes('install') || text.includes('setup')) categories.push('setup');
    
    return [...new Set(categories)];
  }

  async performBasicSearch(query, maxResults) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    for (const [docId, doc] of this.docsCache) {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      
      // Title matching (highest weight)
      if (titleLower.includes(queryLower)) score += 100;
      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 20;
      }
      
      // Content matching
      for (const word of queryWords) {
        const wordMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += wordMatches * 5;
      }
      
      // Heading matching
      for (const heading of doc.metadata.headings) {
        const headingLower = heading.text.toLowerCase();
        if (headingLower.includes(queryLower)) score += 50;
        for (const word of queryWords) {
          if (headingLower.includes(word)) score += 15;
        }
      }
      
      // Code block matching
      for (const codeBlock of doc.metadata.codeBlocks) {
        const codeLower = codeBlock.code.toLowerCase();
        for (const word of queryWords) {
          if (codeLower.includes(word)) score += 10;
        }
      }
      
      // Category matching
      for (const category of doc.metadata.categories) {
        if (queryWords.includes(category.toLowerCase())) score += 25;
      }
      
      if (score > 0) {
        results.push({ docId, doc, score });
      }
    }
    
    // Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  async performClaudeEnhancedSearch(query, basicMatches, options = {}) {
    const { projectContext, maxResults = 10 } = options;
    
    if (basicMatches.length === 0) return basicMatches;
    
    try {
      // Build Claude analysis prompt
      const analysisPrompt = this.buildSearchAnalysisPrompt(query, basicMatches, {
        projectContext
      });
      
      // Execute via Claude headless mode
      const result = await this.claudeBridge.executeHeadlessCommand({
        command: analysisPrompt,
        sessionId: `doc_search_${Date.now()}`,
        timeout: 30000,
        outputFormat: 'stream-json'
      });
      
      if (result.success) {
        // Parse Claude's analysis and re-rank results
        return await this.parseClaudeSearchAnalysis(result.result, basicMatches);
      } else {
        this.logger.warn('⚠️ Claude analysis failed, using basic results');
        return basicMatches.slice(0, maxResults);
      }
      
    } catch (error) {
      this.logger.error('❌ Claude-enhanced search failed:', error);
      return basicMatches.slice(0, maxResults);
    }
  }

  buildSearchAnalysisPrompt(query, matches, options = {}) {
    const { projectContext } = options;
    
    let prompt = `Analyze these documentation search results for the query: "${query}"\n\n`;
    
    if (projectContext) {
      prompt += `Project Context: ${projectContext}\n\n`;
    }
    
    prompt += `Search Results to Analyze:\n`;
    
    for (let i = 0; i < Math.min(matches.length, 15); i++) {
      const match = matches[i];
      prompt += `\n${i + 1}. Title: ${match.doc.title}\n`;
      prompt += `   URL: ${match.doc.url}\n`;
      prompt += `   Categories: ${match.doc.metadata.categories.join(', ')}\n`;
      prompt += `   Score: ${match.score}\n`;
      
      // Include relevant chunks
      const relevantChunks = match.doc.chunks
        .filter(chunk => chunk.text.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2);
      
      for (const chunk of relevantChunks) {
        const excerpt = chunk.text.substring(0, 200);
        prompt += `   Excerpt: ${excerpt}...\n`;
      }
    }
    
    prompt += `\n\nTask: Re-rank these results based on relevance to the query "${query}"`;
    if (projectContext) {
      prompt += ` in the context of: ${projectContext}`;
    }
    
    prompt += `\n\nProvide your analysis as a JSON array with objects containing:
- "rank": number (1-based ranking)  
- "docIndex": number (original 1-based index from above list)
- "relevanceScore": number (1-10 scale)
- "reasoning": string (brief explanation of ranking)

Focus on technical accuracy, practical applicability, and contextual relevance.`;
    
    return prompt;
  }

  async parseClaudeSearchAnalysis(claudeResponse, originalMatches) {
    try {
      // Try to extract JSON from Claude's response
      let analysisData;
      
      if (typeof claudeResponse === 'string') {
        const jsonMatch = claudeResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } else {
        analysisData = claudeResponse;
      }
      
      if (!Array.isArray(analysisData)) {
        throw new Error('Expected array of rankings');
      }
      
      // Re-order matches based on Claude's analysis
      const rerankedMatches = [];
      
      for (const analysis of analysisData) {
        const originalIndex = analysis.docIndex - 1; // Convert to 0-based
        if (originalIndex >= 0 && originalIndex < originalMatches.length) {
          const match = originalMatches[originalIndex];
          match.claudeScore = analysis.relevanceScore;
          match.claudeReasoning = analysis.reasoning;
          rerankedMatches.push(match);
        }
      }
      
      this.logger.success(`✅ Claude re-ranked ${rerankedMatches.length} search results`);
      return rerankedMatches;
      
    } catch (error) {
      this.logger.error('❌ Failed to parse Claude analysis:', error);
      return originalMatches; // Fallback to original order
    }
  }

  async formatSearchResults(matches, options = {}) {
    const { includeContent = true, maxResults = 10 } = options;
    
    const formattedResults = [];
    
    for (const match of matches.slice(0, maxResults)) {
      const result = {
        docId: match.docId,
        title: match.doc.title,
        url: match.doc.url,
        categories: match.doc.metadata.categories,
        relevanceScore: match.score,
        claudeScore: match.claudeScore || null,
        claudeReasoning: match.claudeReasoning || null
      };
      
      if (includeContent) {
        // Find most relevant chunks
        const query = match.query || '';
        const relevantChunks = match.doc.chunks
          .map(chunk => ({
            ...chunk,
            relevance: this.calculateChunkRelevance(chunk, query)
          }))
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 3);
        
        result.excerpts = relevantChunks.map(chunk => ({
          text: this.truncateText(chunk.text, 300),
          heading: chunk.heading,
          hasCode: chunk.hasCode
        }));
      }
      
      formattedResults.push(result);
    }
    
    return formattedResults;
  }

  calculateChunkRelevance(chunk, query) {
    if (!query) return chunk.index === 0 ? 10 : 1; // First chunk gets preference
    
    const queryLower = query.toLowerCase();
    const textLower = chunk.text.toLowerCase();
    
    let score = 0;
    
    // Exact phrase match
    if (textLower.includes(queryLower)) score += 20;
    
    // Word matches
    const queryWords = queryLower.split(/\s+/);
    for (const word of queryWords) {
      const matches = (textLower.match(new RegExp(word, 'g')) || []).length;
      score += matches * 5;
    }
    
    // Heading bonus
    if (chunk.heading && chunk.heading.toLowerCase().includes(queryLower)) {
      score += 15;
    }
    
    // Code bonus
    if (chunk.hasCode && queryWords.some(word => 
      ['function', 'class', 'method', 'api', 'code', 'example'].includes(word)
    )) {
      score += 10;
    }
    
    return score;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  // Storage and caching methods
  generateDocumentId(url) {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  isDocumentFresh(docId) {
    const doc = this.docsCache.get(docId);
    if (!doc) return false;
    
    const age = Date.now() - new Date(doc.processedAt).getTime();
    return age < this.maxCacheAge;
  }

  async storeDocumentation(docId, doc) {
    // Store in memory cache
    this.docsCache.set(docId, doc);
    
    // Persist to disk
    const filePath = path.join(this.cacheDir, 'cache', `${docId}.json`);
    await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
    
    // Store chunks separately for efficient loading
    const chunksPath = path.join(this.cacheDir, 'chunks', `${docId}.json`);
    await fs.writeFile(chunksPath, JSON.stringify(doc.chunks, null, 2));
  }

  async updateSearchIndex(docId, doc) {
    const index = {
      docId,
      title: doc.title,
      url: doc.url,
      categories: doc.metadata.categories,
      headings: doc.metadata.headings.map(h => h.text),
      wordCount: doc.metadata.wordCount,
      lastUpdated: new Date().toISOString()
    };
    
    this.searchIndex.set(docId, index);
    
    // Persist search index
    const indexPath = path.join(this.cacheDir, 'search', 'index.json');
    const fullIndex = Object.fromEntries(this.searchIndex);
    await fs.writeFile(indexPath, JSON.stringify(fullIndex, null, 2));
  }

  async loadExistingDocumentation() {
    try {
      // Load search index
      const indexPath = path.join(this.cacheDir, 'search', 'index.json');
      try {
        const indexData = await fs.readFile(indexPath, 'utf8');
        const index = JSON.parse(indexData);
        this.searchIndex = new Map(Object.entries(index));
      } catch (error) {
        this.logger.debug('No existing search index found');
      }
      
      // Load cached documents
      const cacheFiles = await fs.readdir(path.join(this.cacheDir, 'cache'));
      let loadedCount = 0;
      
      for (const file of cacheFiles.filter(f => f.endsWith('.json'))) {
        try {
          const docPath = path.join(this.cacheDir, 'cache', file);
          const docData = await fs.readFile(docPath, 'utf8');
          const doc = JSON.parse(docData);
          
          this.docsCache.set(doc.id, doc);
          loadedCount++;
        } catch (error) {
          this.logger.warn(`Failed to load cached document ${file}:`, error);
        }
      }
      
      this.logger.info(`📚 Loaded ${loadedCount} cached documents`);
      
    } catch (error) {
      this.logger.debug('No existing documentation cache found');
    }
  }

  startCleanupInterval() {
    // Clean up stale cache every 6 hours
    setInterval(async () => {
      await this.cleanupStaleCache();
    }, 6 * 60 * 60 * 1000);
  }

  async cleanupStaleCache() {
    this.logger.info('🧹 Cleaning up stale documentation cache...');
    
    let removedCount = 0;
    const staleIds = [];
    
    for (const [docId, doc] of this.docsCache) {
      const age = Date.now() - new Date(doc.processedAt).getTime();
      if (age > this.maxCacheAge) {
        staleIds.push(docId);
      }
    }
    
    for (const docId of staleIds) {
      try {
        // Remove from memory
        this.docsCache.delete(docId);
        this.searchIndex.delete(docId);
        
        // Remove files
        const cacheFile = path.join(this.cacheDir, 'cache', `${docId}.json`);
        const chunksFile = path.join(this.cacheDir, 'chunks', `${docId}.json`);
        
        await fs.unlink(cacheFile).catch(() => {});
        await fs.unlink(chunksFile).catch(() => {});
        
        removedCount++;
      } catch (error) {
        this.logger.warn(`Failed to cleanup document ${docId}:`, error);
      }
    }
    
    if (removedCount > 0) {
      // Update search index
      const indexPath = path.join(this.cacheDir, 'search', 'index.json');
      const fullIndex = Object.fromEntries(this.searchIndex);
      await fs.writeFile(indexPath, JSON.stringify(fullIndex, null, 2));
      
      this.logger.info(`🗑️ Cleaned up ${removedCount} stale documents`);
    }
  }

  // Public API methods
  async listDocumentation() {
    const docs = [];
    for (const [docId, doc] of this.docsCache) {
      docs.push({
        docId,
        title: doc.title,
        url: doc.url,
        categories: doc.metadata.categories,
        wordCount: doc.metadata.wordCount,
        chunkCount: doc.chunks.length,
        processedAt: doc.processedAt,
        age: Date.now() - new Date(doc.processedAt).getTime()
      });
    }
    
    return docs.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
  }

  async getDocumentation(docId) {
    const doc = this.docsCache.get(docId);
    if (!doc) {
      throw new Error(`Documentation not found: ${docId}`);
    }
    
    return doc;
  }

  async deleteDocumentation(docId) {
    if (!this.docsCache.has(docId)) {
      throw new Error(`Documentation not found: ${docId}`);
    }
    
    // Remove from memory
    this.docsCache.delete(docId);
    this.searchIndex.delete(docId);
    
    // Remove files
    const cacheFile = path.join(this.cacheDir, 'cache', `${docId}.json`);
    const chunksFile = path.join(this.cacheDir, 'chunks', `${docId}.json`);
    
    await fs.unlink(cacheFile).catch(() => {});
    await fs.unlink(chunksFile).catch(() => {});
    
    // Update search index
    const indexPath = path.join(this.cacheDir, 'search', 'index.json');
    const fullIndex = Object.fromEntries(this.searchIndex);
    await fs.writeFile(indexPath, JSON.stringify(fullIndex, null, 2));
    
    this.logger.success(`✅ Deleted documentation: ${docId}`);
    return { success: true, docId };
  }

  async getServiceStats() {
    return {
      documentsCount: this.docsCache.size,
      totalChunks: Array.from(this.docsCache.values()).reduce((sum, doc) => sum + doc.chunks.length, 0),
      totalWords: Array.from(this.docsCache.values()).reduce((sum, doc) => sum + doc.metadata.wordCount, 0),
      cacheSize: this.docsCache.size,
      indexSize: this.searchIndex.size,
      cacheDir: this.cacheDir,
      maxCacheAge: this.maxCacheAge
    };
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up Documentation Service...');
    
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear caches
    this.docsCache.clear();
    this.searchIndex.clear();
    this.urlCache.clear();
    
    this.logger.info('✅ Documentation Service cleanup complete');
  }
}

module.exports = { DocumentationService };