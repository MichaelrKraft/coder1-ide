const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { EventEmitter } = require('events');

/**
 * Documentation Intelligence Service
 * Handles smart documentation storage, retrieval, and integration with Claude Code
 */
class DocumentationIntelligence extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.docsDir = options.docsDir || path.join(__dirname, '../../data/documentation');
        this.cacheDir = options.cacheDir || path.join(__dirname, '../../data/doc-cache');
        this.maxCacheAge = options.maxCacheAge || 24 * 60 * 60 * 1000; // 24 hours
        this.maxTokensPerSearch = options.maxTokensPerSearch || 2000;
        
        // Initialize directories
        this.initializeDirectories();
    }
    
    async initializeDirectories() {
        try {
            await fs.mkdir(this.docsDir, { recursive: true });
            await fs.mkdir(this.cacheDir, { recursive: true });
            console.log('📁 [DOC-INTEL] Documentation directories initialized');
        } catch (error) {
            console.error('❌ [DOC-INTEL] Failed to initialize directories:', error);
        }
    }
    
    /**
     * Smart content extraction with improved heuristics
     */
    extractSmartContent(html, url) {
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
        const headings = [];
        $('h1, h2, h3, h4, h5, h6').each((i, el) => {
            const level = parseInt(el.tagName[1]);
            const text = $(el).text().trim();
            if (text) {
                headings.push({ level, text });
            }
        });
        
        // Extract code blocks
        const codeBlocks = [];
        $('pre code, .code-block, .highlight').each((i, el) => {
            const code = $(el).text().trim();
            if (code && code.length > 10) {
                codeBlocks.push(code);
            }
        });
        
        return {
            title,
            description,
            content,
            headings,
            codeBlocks,
            contentSelector,
            wordCount: content.split(/\s+/).length,
            extractedAt: new Date().toISOString()
        };
    }
    
    /**
     * Clean and normalize content
     */
    cleanContent(content) {
        return content
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines
            .replace(/[^\x20-\x7E\n]/g, '')  // Remove non-ASCII chars
            .trim();
    }
    
    /**
     * Intelligent content chunking based on structure
     */
    chunkContentIntelligently(content, headings, options = {}) {
        const maxChunkSize = options.maxChunkSize || 800;
        const overlapSize = options.overlapSize || 100;
        
        const chunks = [];
        
        // If we have headings, use them as natural break points
        if (headings.length > 0) {
            let currentChunk = '';
            let currentHeading = '';
            
            const words = content.split(' ');
            let wordIndex = 0;
            
            for (const heading of headings) {
                // Find the position of this heading in content
                const headingPosition = content.indexOf(heading.text);
                
                if (headingPosition > -1) {
                    // Add chunk up to this heading
                    if (currentChunk.trim()) {
                        chunks.push({
                            content: currentChunk.trim(),
                            heading: currentHeading,
                            wordCount: currentChunk.split(' ').length,
                            type: 'section'
                        });
                    }
                    
                    currentHeading = heading.text;
                    currentChunk = '';
                }
            }
            
            // Add remaining content
            if (currentChunk.trim()) {
                chunks.push({
                    content: currentChunk.trim(),
                    heading: currentHeading,
                    wordCount: currentChunk.split(' ').length,
                    type: 'section'
                });
            }
        }
        
        // If no meaningful chunks from headings, use sliding window
        if (chunks.length === 0) {
            const words = content.split(' ');
            
            for (let i = 0; i < words.length; i += maxChunkSize - overlapSize) {
                const chunkWords = words.slice(i, i + maxChunkSize);
                const chunkContent = chunkWords.join(' ');
                
                chunks.push({
                    content: chunkContent,
                    wordCount: chunkWords.length,
                    startIndex: i,
                    type: 'sliding_window'
                });
            }
        }
        
        return chunks;
    }
    
    /**
     * Add documentation from URL
     */
    async addDocumentation(url, options = {}) {
        try {
            this.emit('process:start', { url });
            
            // Check if already exists and is recent
            const docId = this.generateDocId(url);
            const existingDoc = await this.getDocumentationById(docId);
            
            if (existingDoc && !options.forceRefresh) {
                const age = Date.now() - new Date(existingDoc.addedAt).getTime();
                if (age < this.maxCacheAge) {
                    console.log(`📋 [DOC-INTEL] Using cached documentation for ${url}`);
                    this.emit('process:cached', existingDoc);
                    return existingDoc;
                }
            }
            
            // Fetch content
            console.log(`🌐 [DOC-INTEL] Fetching ${url}...`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'CoderOne Documentation Intelligence Bot 1.0',
                    'Accept': 'text/html,application/xhtml+xml'
                },
                timeout: 30000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Extract and process content
            const extracted = this.extractSmartContent(html, url);
            
            if (extracted.wordCount < 100) {
                throw new Error('Insufficient content extracted. This might not be a documentation page.');
            }
            
            // Create intelligent chunks
            const chunks = this.chunkContentIntelligently(
                extracted.content, 
                extracted.headings
            );
            
            // Create documentation object
            const urlObj = new URL(url);
            const doc = {
                id: docId,
                url,
                domain: urlObj.hostname,
                title: extracted.title || `Documentation from ${urlObj.hostname}`,
                description: extracted.description || options.description || '',
                content: extracted.content,
                headings: extracted.headings,
                codeBlocks: extracted.codeBlocks,
                chunks,
                wordCount: extracted.wordCount,
                chunkCount: chunks.length,
                contentSelector: extracted.contentSelector,
                addedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                extractedAt: extracted.extractedAt,
                metadata: {
                    userAdded: options.userAdded || false,
                    category: options.category || 'general',
                    tags: options.tags || [],
                    priority: options.priority || 1
                }
            };
            
            // Save documentation
            await this.saveDocumentation(doc);
            
            console.log(`✅ [DOC-INTEL] Added documentation: ${doc.title} (${doc.wordCount} words, ${doc.chunkCount} chunks)`);
            
            this.emit('process:complete', doc);
            return doc;
            
        } catch (error) {
            console.error(`❌ [DOC-INTEL] Failed to add documentation from ${url}:`, error);
            this.emit('process:error', { url, error: error.message });
            throw error;
        }
    }
    
    /**
     * Search documentation with intelligent ranking
     */
    async searchDocumentation(query, options = {}) {
        try {
            const maxResults = options.maxResults || 5;
            const maxTokens = options.maxTokens || this.maxTokensPerSearch;
            const category = options.category;
            
            console.log(`🔍 [DOC-INTEL] Searching: "${query}"`);
            
            const allDocs = await this.getAllDocumentation();
            
            if (allDocs.length === 0) {
                return {
                    results: [],
                    totalResults: 0,
                    estimatedTokens: 0,
                    message: 'No documentation available. Add some documentation first.'
                };
            }
            
            // Filter by category if specified
            const docs = category 
                ? allDocs.filter(doc => doc.metadata?.category === category)
                : allDocs;
            
            const searchResults = [];
            const queryLower = query.toLowerCase();
            const queryWords = queryLower.split(/\s+/);
            
            for (const doc of docs) {
                const matches = this.findMatches(doc, queryWords, queryLower);
                
                if (matches.score > 0) {
                    searchResults.push({
                        doc: {
                            id: doc.id,
                            title: doc.title,
                            url: doc.url,
                            domain: doc.domain,
                            description: doc.description,
                            addedAt: doc.addedAt,
                            category: doc.metadata?.category
                        },
                        score: matches.score,
                        matches: matches.details,
                        relevantChunks: matches.chunks,
                        bestContext: matches.bestContext
                    });
                }
            }
            
            // Sort by relevance score
            searchResults.sort((a, b) => b.score - a.score);
            
            // Optimize results for token limit
            const optimizedResults = this.optimizeResultsForTokens(
                searchResults.slice(0, maxResults),
                maxTokens
            );
            
            const totalTokens = optimizedResults.reduce((sum, result) => 
                sum + Math.ceil(result.content.length / 4), 0);
            
            console.log(`📊 [DOC-INTEL] Found ${optimizedResults.length}/${searchResults.length} results (${totalTokens} tokens)`);
            
            return {
                results: optimizedResults,
                totalResults: searchResults.length,
                estimatedTokens: totalTokens,
                query,
                optimized: optimizedResults.length < searchResults.length
            };
            
        } catch (error) {
            console.error('❌ [DOC-INTEL] Search error:', error);
            throw error;
        }
    }
    
    /**
     * Find and score matches in a document
     */
    findMatches(doc, queryWords, queryLower) {
        let score = 0;
        const matches = { title: 0, headings: 0, content: 0, code: 0 };
        const relevantChunks = [];
        let bestContext = '';
        
        // Title matching (highest weight)
        if (doc.title.toLowerCase().includes(queryLower)) {
            score += 20;
            matches.title = 1;
        }
        
        // Heading matching
        for (const heading of doc.headings || []) {
            if (heading.text.toLowerCase().includes(queryLower)) {
                score += 10;
                matches.headings++;
            }
        }
        
        // Code block matching
        for (const codeBlock of doc.codeBlocks || []) {
            if (codeBlock.toLowerCase().includes(queryLower)) {
                score += 5;
                matches.code++;
            }
        }
        
        // Chunk-based content matching
        for (const chunk of doc.chunks || []) {
            const chunkLower = chunk.content.toLowerCase();
            let chunkScore = 0;
            
            // Exact phrase match
            if (chunkLower.includes(queryLower)) {
                chunkScore += 3;
            }
            
            // Individual word matches
            const wordMatches = queryWords.filter(word => chunkLower.includes(word));
            chunkScore += wordMatches.length;
            
            if (chunkScore > 0) {
                score += chunkScore;
                matches.content++;
                
                relevantChunks.push({
                    content: chunk.content,
                    score: chunkScore,
                    heading: chunk.heading,
                    wordCount: chunk.wordCount
                });
                
                // Track best context
                if (chunkScore > 3 && !bestContext) {
                    const matchIndex = chunkLower.indexOf(queryLower);
                    if (matchIndex > -1) {
                        const start = Math.max(0, matchIndex - 100);
                        const end = Math.min(chunk.content.length, matchIndex + queryLower.length + 100);
                        bestContext = chunk.content.substring(start, end);
                    }
                }
            }
        }
        
        // Sort chunks by relevance
        relevantChunks.sort((a, b) => b.score - a.score);
        
        return {
            score,
            details: matches,
            chunks: relevantChunks.slice(0, 3), // Top 3 chunks
            bestContext: bestContext || (relevantChunks[0]?.content.substring(0, 200) + '...')
        };
    }
    
    /**
     * Optimize results to fit within token limit
     */
    optimizeResultsForTokens(results, maxTokens) {
        const optimized = [];
        let usedTokens = 0;
        
        for (const result of results) {
            let content = '';
            
            // Build content from relevant chunks
            for (const chunk of result.relevantChunks) {
                const chunkContent = chunk.heading 
                    ? `## ${chunk.heading}\n\n${chunk.content}` 
                    : chunk.content;
                
                const chunkTokens = Math.ceil(chunkContent.length / 4);
                
                if (usedTokens + chunkTokens <= maxTokens) {
                    content += chunkContent + '\n\n';
                    usedTokens += chunkTokens;
                } else {
                    break;
                }
            }
            
            if (content.trim()) {
                optimized.push({
                    ...result,
                    content: content.trim(),
                    estimatedTokens: Math.ceil(content.length / 4)
                });
            }
            
            if (usedTokens >= maxTokens * 0.9) { // Leave some buffer
                break;
            }
        }
        
        return optimized;
    }
    
    /**
     * Generate document ID from URL
     */
    generateDocId(url) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(url).digest('hex');
    }
    
    /**
     * Save documentation to storage
     */
    async saveDocumentation(doc) {
        const filepath = path.join(this.docsDir, `${doc.id}.json`);
        await fs.writeFile(filepath, JSON.stringify(doc, null, 2));
        
        // Update index
        await this.updateIndex(doc);
    }
    
    /**
     * Get documentation by ID
     */
    async getDocumentationById(id) {
        try {
            const filepath = path.join(this.docsDir, `${id}.json`);
            const data = await fs.readFile(filepath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get all documentation
     */
    async getAllDocumentation() {
        try {
            const files = await fs.readdir(this.docsDir);
            const docFiles = files.filter(file => file.endsWith('.json'));
            
            const docs = [];
            for (const file of docFiles) {
                const filepath = path.join(this.docsDir, file);
                const data = await fs.readFile(filepath, 'utf8');
                docs.push(JSON.parse(data));
            }
            
            return docs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        } catch (error) {
            console.error('❌ [DOC-INTEL] Error getting all documentation:', error);
            return [];
        }
    }
    
    /**
     * Update search index
     */
    async updateIndex(doc) {
        // Simple file-based index for now
        // TODO: Upgrade to proper search index or vector database
        try {
            const indexPath = path.join(this.docsDir, '_index.json');
            let index = [];
            
            try {
                const indexData = await fs.readFile(indexPath, 'utf8');
                index = JSON.parse(indexData);
            } catch {
                // Index doesn't exist yet
            }
            
            // Remove existing entry
            index = index.filter(item => item.id !== doc.id);
            
            // Add new entry
            index.push({
                id: doc.id,
                url: doc.url,
                title: doc.title,
                domain: doc.domain,
                wordCount: doc.wordCount,
                chunkCount: doc.chunkCount,
                addedAt: doc.addedAt,
                lastUpdated: doc.lastUpdated,
                category: doc.metadata?.category
            });
            
            await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
        } catch (error) {
            console.error('❌ [DOC-INTEL] Failed to update index:', error);
        }
    }
    
    /**
     * Delete documentation
     */
    async deleteDocumentation(id) {
        try {
            const filepath = path.join(this.docsDir, `${id}.json`);
            
            // Get doc info before deleting
            const doc = await this.getDocumentationById(id);
            if (!doc) {
                throw new Error('Documentation not found');
            }
            
            // Delete file
            await fs.unlink(filepath);
            
            // Update index
            const indexPath = path.join(this.docsDir, '_index.json');
            try {
                const indexData = await fs.readFile(indexPath, 'utf8');
                const index = JSON.parse(indexData);
                const filteredIndex = index.filter(item => item.id !== id);
                await fs.writeFile(indexPath, JSON.stringify(filteredIndex, null, 2));
            } catch (error) {
                console.error('❌ [DOC-INTEL] Failed to update index after deletion:', error);
            }
            
            console.log(`🗑️ [DOC-INTEL] Deleted documentation: ${doc.title}`);
            this.emit('delete', doc);
            
            return doc;
        } catch (error) {
            console.error('❌ [DOC-INTEL] Delete error:', error);
            throw error;
        }
    }
    
    /**
     * Get statistics
     */
    async getStatistics() {
        try {
            const docs = await this.getAllDocumentation();
            
            const stats = {
                totalDocs: docs.length,
                totalWords: docs.reduce((sum, doc) => sum + doc.wordCount, 0),
                totalChunks: docs.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0),
                domains: [...new Set(docs.map(doc => doc.domain))],
                categories: {},
                addedToday: 0,
                addedThisWeek: 0
            };
            
            const today = new Date().toDateString();
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            for (const doc of docs) {
                // Categories
                const category = doc.metadata?.category || 'general';
                stats.categories[category] = (stats.categories[category] || 0) + 1;
                
                // Time-based stats
                const addedDate = new Date(doc.addedAt);
                if (addedDate.toDateString() === today) {
                    stats.addedToday++;
                }
                if (addedDate >= weekAgo) {
                    stats.addedThisWeek++;
                }
            }
            
            return stats;
        } catch (error) {
            console.error('❌ [DOC-INTEL] Statistics error:', error);
            return null;
        }
    }
}

module.exports = DocumentationIntelligence;