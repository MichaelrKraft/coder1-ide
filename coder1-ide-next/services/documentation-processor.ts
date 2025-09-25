/**
 * Documentation Processor Service
 * Handles processing of various file types for the Documentation Hub
 */

// Dynamic import for optional dependency
let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse not available in documentation processor');
}

import { parse as csvParse } from 'csv-parse/sync';
import sharp from 'sharp';

export interface ProcessedDocument {
  docId: string;
  title: string;
  url: string;
  type: 'pdf' | 'image' | 'csv' | 'svg' | 'text';
  categories: string[];
  content: any;
  searchableText: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    processedAt: string;
    wordCount: number;
    [key: string]: any;
  };
}

export class DocumentationProcessor {
  private maxImageSize = 5 * 1024 * 1024; // 5MB
  private maxPdfSize = 50 * 1024 * 1024; // 50MB
  private maxCsvSize = 10 * 1024 * 1024; // 10MB

  /**
   * Process any supported file type
   */
  async processFile(file: File): Promise<ProcessedDocument> {
    const buffer = await this.fileToBuffer(file);
    const fileExtension = this.getFileExtension(file.name);
    const docId = this.generateDocId();
    
    let processedContent: any = {};
    let searchableText = '';
    let documentType: ProcessedDocument['type'] = 'text';
    let metadata: any = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      processedAt: new Date().toISOString()
    };

    // Process based on file type
    if (this.isPDF(file.type, fileExtension)) {
      const result = await this.processPDF(buffer);
      processedContent = result.content;
      searchableText = result.searchableText;
      documentType = 'pdf';
      metadata = { ...metadata, ...result.metadata };
      
    } else if (this.isImage(file.type, fileExtension)) {
      const result = await this.processImage(buffer, file.type);
      processedContent = result.content;
      searchableText = result.searchableText;
      documentType = 'image';
      metadata = { ...metadata, ...result.metadata };
      
    } else if (this.isSVG(file.type, fileExtension)) {
      const result = await this.processSVG(buffer);
      processedContent = result.content;
      searchableText = result.searchableText;
      documentType = 'svg';
      metadata = { ...metadata, ...result.metadata };
      
    } else if (this.isCSV(file.type, fileExtension)) {
      const result = await this.processCSV(buffer);
      processedContent = result.content;
      searchableText = result.searchableText;
      documentType = 'csv';
      metadata = { ...metadata, ...result.metadata };
      
    } else {
      throw new Error(`Unsupported file type: ${file.type || fileExtension}`);
    }

    // Calculate word count
    metadata.wordCount = searchableText.split(/\s+/).filter(word => word.length > 0).length;

    return {
      docId,
      title: this.extractTitle(file.name),
      url: `file://${file.name}`,
      type: documentType,
      categories: this.generateCategories(documentType, file.name),
      content: processedContent,
      searchableText,
      metadata
    };
  }

  /**
   * Process PDF files
   */
  private async processPDF(buffer: Buffer): Promise<{
    content: any;
    searchableText: string;
    metadata: any;
  }> {
    if (buffer.length > this.maxPdfSize) {
      throw new Error(`PDF file too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 50MB)`);
    }

    try {
      const data = await pdfParse(buffer);
      
      return {
        content: {
          text: data.text,
          pages: data.numpages,
          info: data.info
        },
        searchableText: data.text,
        metadata: {
          pageCount: data.numpages,
          title: data.info?.Title || '',
          author: data.info?.Author || '',
          subject: data.info?.Subject || '',
          keywords: data.info?.Keywords || '',
          creationDate: data.info?.CreationDate || '',
          modificationDate: data.info?.ModificationDate || ''
        }
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error('Failed to process PDF file');
    }
  }

  /**
   * Process image files (PNG, JPEG)
   */
  private async processImage(buffer: Buffer, mimeType: string): Promise<{
    content: any;
    searchableText: string;
    metadata: any;
  }> {
    if (buffer.length > this.maxImageSize) {
      throw new Error(`Image file too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
    }

    try {
      // Get image metadata using sharp
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      // Generate thumbnail
      const thumbnail = await image
        .resize(200, 200, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      const base64Thumbnail = thumbnail.toString('base64');
      
      // For full-size image, we'll store a reference rather than the full base64
      // In production, you'd upload to a storage service
      
      return {
        content: {
          thumbnailBase64: base64Thumbnail,
          dimensions: {
            width: metadata.width,
            height: metadata.height
          },
          format: metadata.format,
          size: buffer.length
        },
        searchableText: `[Image: ${metadata.width}x${metadata.height} ${metadata.format}]`,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          space: metadata.space,
          channels: metadata.channels,
          depth: metadata.depth,
          density: metadata.density,
          hasAlpha: metadata.hasAlpha
        }
      };
    } catch (error) {
      console.error('Error processing image:', error);
      // Fallback if sharp fails
      return {
        content: {
          base64: buffer.toString('base64').substring(0, 100) + '...',
          mimeType
        },
        searchableText: '[Image file]',
        metadata: {
          mimeType
        }
      };
    }
  }

  /**
   * Process SVG files
   */
  private async processSVG(buffer: Buffer): Promise<{
    content: any;
    searchableText: string;
    metadata: any;
  }> {
    const svgContent = buffer.toString('utf-8');
    
    // Extract viewBox and dimensions if available
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
    const widthMatch = svgContent.match(/width="([^"]+)"/);
    const heightMatch = svgContent.match(/height="([^"]+)"/);
    
    // Extract text content from SVG
    const textElements = svgContent.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
    const extractedText = textElements
      .map(el => el.replace(/<[^>]*>/g, ''))
      .join(' ');
    
    return {
      content: {
        svgContent: svgContent.substring(0, 1000) + '...', // Store truncated for preview
        fullContent: svgContent,
        hasText: textElements.length > 0
      },
      searchableText: extractedText || '[SVG graphic]',
      metadata: {
        viewBox: viewBoxMatch ? viewBoxMatch[1] : null,
        width: widthMatch ? widthMatch[1] : null,
        height: heightMatch ? heightMatch[1] : null,
        textElementCount: textElements.length,
        size: buffer.length
      }
    };
  }

  /**
   * Process CSV files
   */
  private async processCSV(buffer: Buffer): Promise<{
    content: any;
    searchableText: string;
    metadata: any;
  }> {
    if (buffer.length > this.maxCsvSize) {
      throw new Error(`CSV file too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
    }

    const csvContent = buffer.toString('utf-8');
    
    try {
      // Parse CSV with auto-detection of delimiter
      const records = csvParse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        auto_parse: true,
        auto_parse_date: true
      });
      
      const headers = records.length > 0 ? Object.keys(records[0]) : [];
      
      // Generate summary statistics
      const stats: any = {};
      headers.forEach(header => {
        const values = records.map(r => r[header]);
        const numericValues = values.filter(v => typeof v === 'number');
        
        if (numericValues.length > 0) {
          stats[header] = {
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
            count: numericValues.length
          };
        }
      });
      
      // Create searchable text from CSV content
      const searchableText = [
        `Headers: ${headers.join(', ')}`,
        `Rows: ${records.length}`,
        ...records.slice(0, 10).map(r => Object.values(r).join(' '))
      ].join('\n');
      
      return {
        content: {
          headers,
          rowCount: records.length,
          preview: records.slice(0, 10), // First 10 rows for preview
          stats,
          fullData: records // Store all data for searching
        },
        searchableText,
        metadata: {
          headers,
          rowCount: records.length,
          columnCount: headers.length,
          hasNumericData: Object.keys(stats).length > 0,
          stats
        }
      };
    } catch (error) {
      console.error('Error processing CSV:', error);
      
      // Fallback to simple parsing
      const lines = csvContent.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      
      return {
        content: {
          rawContent: csvContent,
          lineCount: lines.length,
          headers
        },
        searchableText: csvContent,
        metadata: {
          lineCount: lines.length,
          headers,
          parseError: error.message
        }
      };
    }
  }

  /**
   * Helper methods
   */
  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  private generateDocId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private extractTitle(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  private generateCategories(type: string, fileName: string): string[] {
    const categories = [type, 'uploaded'];
    
    // Add specific categories based on file name patterns
    if (fileName.toLowerCase().includes('api')) categories.push('api');
    if (fileName.toLowerCase().includes('guide')) categories.push('guide');
    if (fileName.toLowerCase().includes('tutorial')) categories.push('tutorial');
    if (fileName.toLowerCase().includes('reference')) categories.push('reference');
    if (fileName.toLowerCase().includes('spec')) categories.push('specification');
    
    return [...new Set(categories)];
  }

  private isPDF(mimeType: string, extension: string): boolean {
    return mimeType === 'application/pdf' || extension === 'pdf';
  }

  private isImage(mimeType: string, extension: string): boolean {
    return mimeType.startsWith('image/') && 
           ['png', 'jpg', 'jpeg'].includes(extension);
  }

  private isSVG(mimeType: string, extension: string): boolean {
    return mimeType === 'image/svg+xml' || extension === 'svg';
  }

  private isCSV(mimeType: string, extension: string): boolean {
    return mimeType === 'text/csv' || 
           mimeType === 'application/vnd.ms-excel' ||
           extension === 'csv';
  }
}

// Export singleton instance
export const documentationProcessor = new DocumentationProcessor();