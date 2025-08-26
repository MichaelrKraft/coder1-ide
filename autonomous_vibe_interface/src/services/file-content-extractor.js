const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const mime = require('mime-types');

/**
 * File Content Extractor Service
 * Extracts searchable text content from various file types
 */
class FileContentExtractor {
    constructor() {
        this.supportedTypes = {
            // Text files
            'text/plain': this.extractText,
            'text/markdown': this.extractText,
            'text/x-markdown': this.extractText,
            
            // Code files  
            'application/javascript': this.extractText,
            'text/javascript': this.extractText,
            'application/typescript': this.extractText,
            'text/x-python': this.extractText,
            'text/x-python-script': this.extractText,
            'application/json': this.extractText,
            'text/html': this.extractHTML,
            'application/xml': this.extractText,
            'text/xml': this.extractText,
            'text/css': this.extractText,
            
            // Document files
            'application/pdf': this.extractPDF,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.extractDOCX,
            
            // Fallback text extraction for unknown types
            'application/octet-stream': this.extractTextFallback
        };
        
        // File extensions to MIME type mapping for better detection
        this.extensionMap = {
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.markdown': 'text/x-markdown',
            '.js': 'application/javascript',
            '.jsx': 'application/javascript', 
            '.ts': 'application/typescript',
            '.tsx': 'application/typescript',
            '.py': 'text/x-python',
            '.json': 'application/json',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.xml': 'application/xml',
            '.css': 'text/css',
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword'
        };
    }
    
    /**
     * Extract content from uploaded file
     */
    async extractContent(filePath, originalName, mimeType) {
        try {
            // Determine MIME type from extension if not provided or generic
            let detectedMimeType = mimeType;
            if (!mimeType || mimeType === 'application/octet-stream') {
                const ext = path.extname(originalName).toLowerCase();
                detectedMimeType = this.extensionMap[ext] || mime.lookup(originalName) || mimeType;
            }
            
            console.log(`📄 [FILE-EXTRACTOR] Processing ${originalName} as ${detectedMimeType}`);
            
            // Get appropriate extractor
            const extractor = this.supportedTypes[detectedMimeType] || this.extractTextFallback;
            
            // Extract content
            const result = await extractor.call(this, filePath, originalName);
            
            return {
                success: true,
                content: result.content,
                title: result.title || this.generateTitle(originalName),
                fileType: detectedMimeType,
                wordCount: result.content.split(/\s+/).length,
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ [FILE-EXTRACTOR] Error processing ${originalName}:`, error);
            return {
                success: false,
                error: error.message,
                fileType: mimeType,
                extractedAt: new Date().toISOString()
            };
        }
    }
    
    /**
     * Extract content from plain text files
     */
    async extractText(filePath, originalName) {
        const buffer = await fs.readFile(filePath);
        const content = buffer.toString('utf8');
        
        return {
            content: content.trim(),
            title: this.generateTitle(originalName)
        };
    }
    
    /**
     * Extract content from HTML files (using existing cheerio logic)
     */
    async extractHTML(filePath, originalName) {
        const cheerio = require('cheerio');
        const html = await fs.readFile(filePath, 'utf8');
        const $ = cheerio.load(html);
        
        // Remove unwanted elements (same logic as URL extraction)
        $('script, style, nav, header, footer, .nav, .navigation, .sidebar').remove();
        
        // Extract title
        const title = $('title').text() || $('h1').first().text() || this.generateTitle(originalName);
        
        // Extract main content
        const contentSelectors = [
            'main', 'article', '.content', '.main-content', 
            '.documentation', '.docs-content', '#content'
        ];
        
        let content = '';
        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length && element.text().trim().length > 100) {
                content = element.text().trim();
                break;
            }
        }
        
        // Fallback to body content
        if (!content) {
            content = $('body').text().trim();
        }
        
        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        return {
            content,
            title: title.trim()
        };
    }
    
    /**
     * Extract content from PDF files
     */
    async extractPDF(filePath, originalName) {
        const buffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(buffer);
        
        return {
            content: pdfData.text.trim(),
            title: this.generateTitle(originalName),
            metadata: {
                pages: pdfData.numpages,
                info: pdfData.info
            }
        };
    }
    
    /**
     * Extract content from DOCX files
     */
    async extractDOCX(filePath, originalName) {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        
        return {
            content: result.value.trim(),
            title: this.generateTitle(originalName),
            warnings: result.messages
        };
    }
    
    /**
     * Fallback text extraction for unknown file types
     */
    async extractTextFallback(filePath, originalName) {
        try {
            // Try to read as UTF-8 text
            const buffer = await fs.readFile(filePath);
            const content = buffer.toString('utf8');
            
            // Basic check if it's readable text (not binary)
            const nonPrintableChars = content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g);
            if (nonPrintableChars && nonPrintableChars.length > content.length * 0.1) {
                throw new Error('File appears to be binary and cannot be processed as text');
            }
            
            return {
                content: content.trim(),
                title: this.generateTitle(originalName)
            };
            
        } catch (error) {
            throw new Error(`Unsupported file type or corrupted file: ${error.message}`);
        }
    }
    
    /**
     * Generate a readable title from filename
     */
    generateTitle(filename) {
        return path.basename(filename, path.extname(filename))
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    /**
     * Check if file type is supported
     */
    isSupported(mimeType, filename) {
        // Check by MIME type
        if (this.supportedTypes[mimeType]) {
            return true;
        }
        
        // Check by extension
        const ext = path.extname(filename).toLowerCase();
        return this.extensionMap.hasOwnProperty(ext);
    }
    
    /**
     * Get supported file types for UI display
     */
    getSupportedTypes() {
        return {
            documents: ['PDF', 'DOCX'],
            text: ['TXT', 'MD', 'HTML', 'XML'],
            code: ['JS', 'JSX', 'TS', 'TSX', 'PY', 'JSON', 'CSS'],
            maxFileSize: '10MB',
            maxFiles: 10
        };
    }
}

module.exports = FileContentExtractor;