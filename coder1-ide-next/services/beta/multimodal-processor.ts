/**
 * Multimodal Processor Service for Beta IDE
 * Handles image processing, file conversion, PDF processing, and Claude vision API integration
 */

import { Anthropic } from '@anthropic-ai/sdk';
import * as pdfParse from 'pdf-parse';

export interface ProcessedImage {
  base64: string;
  mimeType: string;
  originalName: string;
  width?: number;
  height?: number;
  text?: string; // OCR extracted text
  analysis?: string; // AI analysis
}

export interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  summary?: string;
  language?: string; // For code files
}

export interface ProcessedPDF {
  name: string;
  type: string;
  size: number;
  content: string; // Extracted text content
  pages: number;
  title?: string; // PDF metadata title
  author?: string; // PDF metadata author
  summary?: string;
}

export interface MultimodalContent {
  text?: string;
  images?: ProcessedImage[];
  files?: ProcessedFile[];
  pdfs?: ProcessedPDF[]; // Add PDF support
}

class MultimodalProcessor {
  private maxImageSize = 5 * 1024 * 1024; // 5MB
  private maxFileSize = 1 * 1024 * 1024; // 1MB for text files
  private maxPdfSize = 10 * 1024 * 1024; // 10MB for PDF files
  private supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private supportedPdfTypes = ['application/pdf'];
  private supportedCodeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', 
    '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.r',
    '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte'
  ];

  /**
   * Process a single image file
   */
  async processImage(file: File): Promise<ProcessedImage> {
    if (!this.supportedImageTypes.includes(file.type)) {
      throw new Error(`Unsupported image type: ${file.type}`);
    }

    if (file.size > this.maxImageSize) {
      throw new Error(`Image too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
    }

    const base64 = await this.fileToBase64(file);
    const dimensions = await this.getImageDimensions(file);

    return {
      base64: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
      mimeType: file.type,
      originalName: file.name,
      width: dimensions.width,
      height: dimensions.height
    };
  }

  /**
   * Process a text or code file
   */
  async processTextFile(file: File): Promise<ProcessedFile> {
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 1MB)`);
    }

    const content = await this.fileToText(file);
    const language = this.detectLanguage(file.name);

    return {
      name: file.name,
      type: file.type || 'text/plain',
      size: file.size,
      content,
      language,
      summary: this.generateFileSummary(content, language)
    };
  }

  /**
   * Process a PDF file
   */
  async processPdfFile(file: File): Promise<ProcessedPDF> {
    if (!this.supportedPdfTypes.includes(file.type)) {
      throw new Error(`Unsupported PDF type: ${file.type}`);
    }

    if (file.size > this.maxPdfSize) {
      throw new Error(`PDF too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
    }

    try {
      const buffer = await this.fileToBuffer(file);
      const pdfData = await pdfParse(buffer);

      return {
        name: file.name,
        type: file.type,
        size: file.size,
        content: pdfData.text || '',
        pages: pdfData.numpages || 0,
        title: pdfData.info?.Title || undefined,
        author: pdfData.info?.Author || undefined,
        summary: this.generatePdfSummary(pdfData.text || '', pdfData.numpages || 0)
      };
    } catch (error) {
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multiple files
   */
  async processFiles(files: File[]): Promise<MultimodalContent> {
    const images: ProcessedImage[] = [];
    const processedFiles: ProcessedFile[] = [];
    const pdfs: ProcessedPDF[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        if (this.supportedImageTypes.includes(file.type)) {
          const processedImage = await this.processImage(file);
          images.push(processedImage);
        } else if (this.supportedPdfTypes.includes(file.type)) {
          const processedPdf = await this.processPdfFile(file);
          pdfs.push(processedPdf);
        } else if (this.isTextFile(file)) {
          const processedFile = await this.processTextFile(file);
          processedFiles.push(processedFile);
        } else {
          errors.push(`Unsupported file type: ${file.name} (${file.type})`);
        }
      } catch (error) {
        errors.push(`Error processing ${file.name}: ${error}`);
      }
    }

    // Build text description
    let text = '';
    if (images.length > 0) {
      text += `Images (${images.length}):\n`;
      images.forEach(img => {
        text += `- ${img.originalName}`;
        if (img.width && img.height) {
          text += ` (${img.width}x${img.height})`;
        }
        text += '\n';
      });
    }

    if (pdfs.length > 0) {
      text += `\nPDFs (${pdfs.length}):\n`;
      pdfs.forEach(pdf => {
        text += `- ${pdf.name}`;
        if (pdf.pages) {
          text += ` (${pdf.pages} pages)`;
        }
        text += '\n';
        if (pdf.summary) {
          text += `  ${pdf.summary}\n`;
        }
      });
    }

    if (processedFiles.length > 0) {
      text += `\nFiles (${processedFiles.length}):\n`;
      processedFiles.forEach(file => {
        text += `- ${file.name}`;
        if (file.language) {
          text += ` (${file.language})`;
        }
        text += '\n';
        if (file.summary) {
          text += `  ${file.summary}\n`;
        }
      });
    }

    if (errors.length > 0) {
      text += `\nErrors:\n${errors.join('\n')}`;
    }

    return { text, images, files: processedFiles, pdfs };
  }

  /**
   * Build Claude API message content with multimodal support
   */
  buildClaudeMessage(content: MultimodalContent): any[] {
    const messages: any[] = [];

    // Add text if present
    if (content.text) {
      messages.push({
        type: 'text',
        text: content.text
      });
    }

    // Add images for vision processing
    if (content.images && content.images.length > 0) {
      content.images.forEach(img => {
        messages.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mimeType,
            data: img.base64
          }
        });
      });
    }

    // Add file contents as text
    if (content.files && content.files.length > 0) {
      content.files.forEach(file => {
        let fileText = `\n--- File: ${file.name} ---\n`;
        if (file.language) {
          fileText += `Language: ${file.language}\n`;
        }
        fileText += `\n${file.content}\n`;
        fileText += `--- End of ${file.name} ---\n`;
        
        messages.push({
          type: 'text',
          text: fileText
        });
      });
    }

    // Add PDF contents as text
    if (content.pdfs && content.pdfs.length > 0) {
      content.pdfs.forEach(pdf => {
        let pdfText = `\n--- PDF: ${pdf.name} ---\n`;
        pdfText += `Pages: ${pdf.pages}\n`;
        if (pdf.title) {
          pdfText += `Title: ${pdf.title}\n`;
        }
        if (pdf.author) {
          pdfText += `Author: ${pdf.author}\n`;
        }
        pdfText += `\n${pdf.content}\n`;
        pdfText += `--- End of ${pdf.name} ---\n`;
        
        messages.push({
          type: 'text',
          text: pdfText
        });
      });
    }

    return messages;
  }

  /**
   * Perform OCR on an image (placeholder - would integrate with Tesseract.js or similar)
   */
  async extractTextFromImage(image: ProcessedImage): Promise<string> {
    // TODO: Integrate with Tesseract.js for local OCR
    // For now, return empty string
    return '';
  }

  /**
   * Helper: Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Helper: Convert file to text
   */
  private fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Helper: Convert file to buffer (for PDF processing)
   */
  private fileToBuffer(file: File): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(Buffer.from(reader.result));
        } else {
          reject(new Error('Failed to convert file to buffer'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Helper: Get image dimensions
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Helper: Detect programming language from file extension
   */
  private detectLanguage(filename: string): string | undefined {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript-react',
      '.ts': 'typescript',
      '.tsx': 'typescript-react',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.r': 'r',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
      '.fish': 'fish',
      '.ps1': 'powershell'
    };

    return languageMap[ext];
  }

  /**
   * Helper: Check if file is text-based
   */
  private isTextFile(file: File): boolean {
    // Check by MIME type
    if (file.type.startsWith('text/')) return true;
    if (file.type === 'application/json') return true;
    if (file.type === 'application/xml') return true;
    if (file.type === 'application/javascript') return true;

    // Check by extension
    const filename = file.name.toLowerCase();
    const textExtensions = [
      ...this.supportedCodeExtensions,
      '.txt', '.md', '.json', '.xml', '.yaml', '.yml',
      '.csv', '.log', '.ini', '.env', '.gitignore',
      '.dockerfile', '.makefile', '.readme'
    ];

    return textExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Helper: Generate a brief summary of file content
   */
  private generateFileSummary(content: string, language?: string): string {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    if (language) {
      // For code files, try to extract key information
      if (language.includes('javascript') || language.includes('typescript')) {
        const imports = lines.filter(line => line.trim().startsWith('import'));
        const exports = lines.filter(line => line.includes('export'));
        const functions = lines.filter(line => line.includes('function') || line.includes('=>'));
        
        return `${imports.length} imports, ${exports.length} exports, ~${functions.length} functions`;
      }
    }

    // Generic summary
    return `${lines.length} lines, ${content.length} characters`;
  }

  /**
   * Helper: Generate a brief summary of PDF content
   */
  private generatePdfSummary(content: string, pages: number): string {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const characters = content.length;
    
    // Basic content analysis
    const avgWordsPerPage = pages > 0 ? Math.round(words.length / pages) : 0;
    
    return `${pages} pages, ${words.length} words, ~${avgWordsPerPage} words/page`;
  }

  /**
   * Compress image if too large
   */
  async compressImage(file: File, maxWidth: number = 1024): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            resolve(file);
          }
        }, file.type, 0.8); // 80% quality
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }
}

// Export singleton instance
export const multimodalProcessor = new MultimodalProcessor();