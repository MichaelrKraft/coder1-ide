const express = require('express');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const multer = require('multer');
const FileContentExtractor = require('../services/file-content-extractor');

const router = express.Router();

// Documentation storage directory
const DOCS_DIR = path.join(__dirname, '../../data/documentation');

// File upload configuration
const upload = multer({
    dest: path.join(__dirname, '../../temp/uploads'),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files at once
    },
    fileFilter: (req, file, cb) => {
        const extractor = new FileContentExtractor();
        if (extractor.isSupported(file.mimetype, file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.originalname}. Supported types: PDF, DOCX, TXT, MD, HTML, JS, TS, PY, JSON, CSS, XML`));
        }
    }
});

// Initialize file content extractor
const fileExtractor = new FileContentExtractor();

// Ensure directories exist
async function ensureDocsDir() {
    try {
        await fs.access(DOCS_DIR);
    } catch {
        await fs.mkdir(DOCS_DIR, { recursive: true });
        console.log('📁 Created documentation storage directory');
    }
    
    // Ensure temp upload directory exists
    const tempDir = path.join(__dirname, '../../temp/uploads');
    try {
        await fs.access(tempDir);
    } catch {
        await fs.mkdir(tempDir, { recursive: true });
        console.log('📁 Created temporary uploads directory');
    }
}

// Generate doc ID from URL
function generateDocId(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}

// Extract main content from HTML
function extractContent(html, url) {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .nav, .navigation, .sidebar, .ads, .advertisement').remove();
    
    // Try common content selectors
    const contentSelectors = [
        'main',
        'article', 
        '.content',
        '.main-content',
        '.documentation',
        '.docs-content',
        '#content',
        '.markdown-body',
        '.prose'
    ];
    
    let content = '';
    let title = $('title').text() || '';
    
    // Try to find main content
    for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length && element.text().trim().length > 100) {
            content = element.text().trim();
            break;
        }
    }
    
    // Fallback to body if no main content found
    if (!content) {
        content = $('body').text().trim();
    }
    
    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    return {
        title: title.trim(),
        content,
        url,
        wordCount: content.split(' ').length,
        extractedAt: new Date().toISOString()
    };
}

// Chunk content for better search
function chunkContent(content, maxChunkSize = 1000) {
    const words = content.split(' ');
    const chunks = [];
    
    for (let i = 0; i < words.length; i += maxChunkSize) {
        const chunk = words.slice(i, i + maxChunkSize).join(' ');
        chunks.push({
            content: chunk,
            startIndex: i,
            wordCount: chunk.split(' ').length
        });
    }
    
    return chunks;
}

// Add documentation endpoint
router.post('/add', async (req, res) => {
    try {
        await ensureDocsDir();
        
        const { url, name, description } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate URL
        let validUrl;
        try {
            validUrl = new URL(url);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        console.log(`📖 [DOCS] Fetching documentation from: ${url}`);
        
        // Fetch the page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'CoderOne Documentation Bot 1.0'
            },
            timeout: 30000
        });
        
        if (!response.ok) {
            return res.status(400).json({ 
                error: `Failed to fetch URL: ${response.status} ${response.statusText}` 
            });
        }
        
        const html = await response.text();
        
        // Extract content
        const extracted = extractContent(html, url);
        
        if (extracted.wordCount < 50) {
            return res.status(400).json({ 
                error: 'Extracted content too short. This might not be a documentation page.' 
            });
        }
        
        // Create documentation object
        const doc = {
            id: generateDocId(url),
            url,
            name: name || extracted.title,
            description: description || `Documentation from ${validUrl.hostname}`,
            title: extracted.title,
            content: extracted.content,
            chunks: chunkContent(extracted.content),
            wordCount: extracted.wordCount,
            domain: validUrl.hostname,
            addedAt: new Date().toISOString(),
            extractedAt: extracted.extractedAt,
            lastUpdated: new Date().toISOString()
        };
        
        // Save to file
        const filename = `${doc.id}.json`;
        const filepath = path.join(DOCS_DIR, filename);
        await fs.writeFile(filepath, JSON.stringify(doc, null, 2));
        
        console.log(`✅ [DOCS] Saved documentation: ${doc.name} (${doc.wordCount} words)`);
        
        // Return success response
        res.json({
            success: true,
            message: 'Documentation added successfully',
            doc: {
                id: doc.id,
                name: doc.name,
                url: doc.url,
                description: doc.description,
                wordCount: doc.wordCount,
                domain: doc.domain,
                addedAt: doc.addedAt
            }
        });
        
    } catch (error) {
        console.error('❌ [DOCS] Error adding documentation:', error);
        res.status(500).json({ 
            error: 'Failed to add documentation',
            message: error.message 
        });
    }
});

// File upload documentation endpoint
router.post('/upload', upload.array('files', 10), async (req, res) => {
    const uploadedFiles = [];
    const errors = [];
    
    try {
        await ensureDocsDir();
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        console.log(`📁 [DOCS] Processing ${req.files.length} uploaded files`);
        
        // Process each uploaded file
        for (const file of req.files) {
            try {
                console.log(`📄 [DOCS] Processing: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);
                
                // Extract content from file
                const extraction = await fileExtractor.extractContent(
                    file.path, 
                    file.originalname, 
                    file.mimetype
                );
                
                if (!extraction.success) {
                    errors.push({
                        filename: file.originalname,
                        error: extraction.error
                    });
                    continue;
                }
                
                // Create file-based URL
                const fileUrl = `file://local/${encodeURIComponent(file.originalname)}`;
                const docId = generateDocId(fileUrl);
                
                // Create documentation object (same schema as URL docs)
                const doc = {
                    id: docId,
                    url: fileUrl,
                    name: req.body[`name_${file.originalname}`] || extraction.title,
                    description: req.body[`description_${file.originalname}`] || `Local file: ${file.originalname}`,
                    title: extraction.title,
                    content: extraction.content,
                    chunks: chunkContent(extraction.content),
                    wordCount: extraction.wordCount,
                    domain: 'local-files',
                    type: 'file', // Distinguish from external docs and sessions
                    fileType: extraction.fileType,
                    originalFilename: file.originalname,
                    fileSize: file.size,
                    addedAt: new Date().toISOString(),
                    extractedAt: extraction.extractedAt,
                    lastUpdated: new Date().toISOString()
                };
                
                // Save to documentation storage
                const filename = `${doc.id}.json`;
                const filepath = path.join(DOCS_DIR, filename);
                await fs.writeFile(filepath, JSON.stringify(doc, null, 2));
                
                uploadedFiles.push({
                    id: doc.id,
                    name: doc.name,
                    title: doc.title,
                    originalFilename: file.originalname,
                    fileType: extraction.fileType,
                    wordCount: doc.wordCount,
                    fileSize: file.size,
                    addedAt: doc.addedAt
                });
                
                console.log(`✅ [DOCS] Saved file: ${file.originalname} (${doc.wordCount} words)`);
                
            } catch (fileError) {
                console.error(`❌ [DOCS] Error processing ${file.originalname}:`, fileError);
                errors.push({
                    filename: file.originalname,
                    error: fileError.message
                });
            } finally {
                // Clean up temporary file
                try {
                    await fs.unlink(file.path);
                } catch (cleanupError) {
                    console.warn(`⚠️ [DOCS] Failed to cleanup temp file: ${file.path}`);
                }
            }
        }
        
        // Return results
        const response = {
            success: uploadedFiles.length > 0,
            message: `Processed ${req.files.length} files: ${uploadedFiles.length} successful, ${errors.length} failed`,
            uploaded: uploadedFiles,
            errors: errors,
            summary: {
                totalFiles: req.files.length,
                successful: uploadedFiles.length,
                failed: errors.length,
                totalWords: uploadedFiles.reduce((sum, file) => sum + file.wordCount, 0)
            }
        };
        
        console.log(`📊 [DOCS] Upload complete: ${uploadedFiles.length}/${req.files.length} files processed successfully`);
        
        if (uploadedFiles.length === 0) {
            res.status(400).json(response);
        } else {
            res.json(response);
        }
        
    } catch (error) {
        console.error('❌ [DOCS] File upload error:', error);
        
        // Clean up any temp files in case of global error
        if (req.files) {
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
        }
        
        res.status(500).json({ 
            error: 'File upload failed',
            message: error.message 
        });
    }
});

// Get supported file types endpoint
router.get('/supported-types', (req, res) => {
    const supportedTypes = fileExtractor.getSupportedTypes();
    res.json({
        ...supportedTypes,
        message: 'Drag and drop supported file types into Documentation Intelligence'
    });
});

// Search documentation endpoint
router.post('/search', async (req, res) => {
    try {
        await ensureDocsDir();
        
        const { query, maxResults = 5, maxTokens = 2000 } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        console.log(`🔍 [DOCS] Searching for: "${query}"`);
        
        // Get all documentation files
        const files = await fs.readdir(DOCS_DIR);
        const docFiles = files.filter(file => file.endsWith('.json'));
        
        if (docFiles.length === 0) {
            return res.json({
                results: [],
                message: 'No documentation stored yet. Add some documentation first.'
            });
        }
        
        // Search through all documents
        const searchResults = [];
        const queryLower = query.toLowerCase();
        
        for (const file of docFiles) {
            const filepath = path.join(DOCS_DIR, file);
            const docData = JSON.parse(await fs.readFile(filepath, 'utf8'));
            
            // Simple text search for now (will upgrade to vector search later)
            const contentLower = docData.content.toLowerCase();
            const titleLower = docData.title.toLowerCase();
            
            let score = 0;
            let matchingChunks = [];
            
            // Title match (higher score)
            if (titleLower.includes(queryLower)) {
                score += 10;
            }
            
            // Content search in chunks
            for (const chunk of docData.chunks) {
                const chunkLower = chunk.content.toLowerCase();
                if (chunkLower.includes(queryLower)) {
                    score += 1;
                    
                    // Find the specific match context
                    const matchIndex = chunkLower.indexOf(queryLower);
                    const contextStart = Math.max(0, matchIndex - 100);
                    const contextEnd = Math.min(chunk.content.length, matchIndex + query.length + 100);
                    const context = chunk.content.substring(contextStart, contextEnd);
                    
                    matchingChunks.push({
                        content: chunk.content,
                        context,
                        wordCount: chunk.wordCount
                    });
                }
            }
            
            if (score > 0) {
                searchResults.push({
                    doc: {
                        id: docData.id,
                        name: docData.name,
                        url: docData.url,
                        title: docData.title,
                        domain: docData.domain,
                        addedAt: docData.addedAt,
                        type: docData.type || 'external', // Distinguish sessions from external docs
                        timestamp: docData.type === 'session' ? docData.sessionData?.timestamp : undefined
                    },
                    score,
                    matchingChunks: matchingChunks.slice(0, 3), // Limit chunks per doc
                    relevantContent: matchingChunks.slice(0, 2).map(c => c.content).join('\n\n')
                });
            }
        }
        
        // Sort by score and limit results
        searchResults.sort((a, b) => b.score - a.score);
        const limitedResults = searchResults.slice(0, maxResults);
        
        // Calculate token usage (rough estimate: 1 token ≈ 4 characters)
        let totalTokens = 0;
        const optimizedResults = [];
        
        for (const result of limitedResults) {
            const contentTokens = Math.ceil(result.relevantContent.length / 4);
            
            if (totalTokens + contentTokens <= maxTokens) {
                totalTokens += contentTokens;
                optimizedResults.push(result);
            } else {
                // Truncate content to fit token limit
                const remainingTokens = maxTokens - totalTokens;
                const truncatedLength = remainingTokens * 4;
                
                if (truncatedLength > 100) { // Only include if meaningful content remains
                    result.relevantContent = result.relevantContent.substring(0, truncatedLength) + '...';
                    result.truncated = true;
                    totalTokens += remainingTokens;
                    optimizedResults.push(result);
                }
                break;
            }
        }
        
        console.log(`📊 [DOCS] Found ${optimizedResults.length} results (${totalTokens} estimated tokens)`);
        
        res.json({
            results: optimizedResults,
            totalResults: searchResults.length,
            estimatedTokens: totalTokens,
            query,
            message: optimizedResults.length > 0 
                ? `Found ${optimizedResults.length} relevant documentation sections`
                : 'No matching documentation found'
        });
        
    } catch (error) {
        console.error('❌ [DOCS] Search error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            message: error.message 
        });
    }
});

// List all documentation
router.get('/list', async (req, res) => {
    try {
        await ensureDocsDir();
        
        const files = await fs.readdir(DOCS_DIR);
        const docFiles = files.filter(file => file.endsWith('.json'));
        
        const docs = [];
        
        for (const file of docFiles) {
            const filepath = path.join(DOCS_DIR, file);
            const docData = JSON.parse(await fs.readFile(filepath, 'utf8'));
            
            docs.push({
                id: docData.id,
                name: docData.name,
                url: docData.url,
                title: docData.title,
                description: docData.description,
                domain: docData.domain,
                wordCount: docData.wordCount,
                addedAt: docData.addedAt,
                lastUpdated: docData.lastUpdated,
                type: docData.type || 'external', // Distinguish sessions from external docs
                timestamp: docData.type === 'session' ? docData.sessionData?.timestamp : undefined
            });
        }
        
        // Sort by most recently added
        docs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        
        res.json({
            docs,
            count: docs.length,
            totalWords: docs.reduce((sum, doc) => sum + doc.wordCount, 0)
        });
        
    } catch (error) {
        console.error('❌ [DOCS] List error:', error);
        res.status(500).json({ 
            error: 'Failed to list documentation',
            message: error.message 
        });
    }
});

// Delete documentation
router.delete('/:id', async (req, res) => {
    try {
        await ensureDocsDir();
        
        const { id } = req.params;
        const filepath = path.join(DOCS_DIR, `${id}.json`);
        
        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'Documentation not found' });
        }
        
        // Get doc info before deleting
        const docData = JSON.parse(await fs.readFile(filepath, 'utf8'));
        
        // Delete file
        await fs.unlink(filepath);
        
        console.log(`🗑️ [DOCS] Deleted documentation: ${docData.name}`);
        
        res.json({
            success: true,
            message: `Deleted documentation: ${docData.name}`,
            deletedDoc: {
                id: docData.id,
                name: docData.name,
                url: docData.url
            }
        });
        
    } catch (error) {
        console.error('❌ [DOCS] Delete error:', error);
        res.status(500).json({ 
            error: 'Failed to delete documentation',
            message: error.message 
        });
    }
});

// Health check
router.get('/health', async (req, res) => {
    try {
        await ensureDocsDir();
        
        const files = await fs.readdir(DOCS_DIR);
        const docCount = files.filter(file => file.endsWith('.json')).length;
        
        res.json({
            status: 'healthy',
            docsCount: docCount,
            storageDir: DOCS_DIR,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Get specific documentation content
router.get('/:id', async (req, res) => {
    try {
        await ensureDocsDir();
        
        const { id } = req.params;
        const { includeContent = false } = req.query;
        const filepath = path.join(DOCS_DIR, `${id}.json`);
        
        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'Documentation not found' });
        }
        
        const docData = JSON.parse(await fs.readFile(filepath, 'utf8'));
        
        // Return basic info or full content based on query parameter
        const response = {
            id: docData.id,
            name: docData.name,
            url: docData.url,
            title: docData.title,
            description: docData.description,
            domain: docData.domain,
            wordCount: docData.wordCount,
            addedAt: docData.addedAt,
            lastUpdated: docData.lastUpdated,
            type: docData.type || 'external',
            timestamp: docData.type === 'session' ? docData.sessionData?.timestamp : undefined
        };
        
        if (includeContent === 'true') {
            response.content = docData.content;
            response.chunks = docData.chunks;
            
            // Include session data for session documents
            if (docData.type === 'session') {
                response.sessionData = docData.sessionData;
            }
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ [DOCS] Get error:', error);
        res.status(500).json({ 
            error: 'Failed to get documentation',
            message: error.message 
        });
    }
});

module.exports = router;