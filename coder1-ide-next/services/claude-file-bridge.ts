/**
 * Claude File Bridge Service
 * Manages temporary files for Claude Code CLI integration
 * Enables drag-and-dropped files to be accessible by Claude CLI sessions
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import Tesseract from 'tesseract.js';

// Dynamic imports to handle optional dependencies
let pdf: any;
let mammoth: any;
let XLSX: any;

try {
  pdf = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse not available');
}

try {
  mammoth = require('mammoth');
} catch (e) {
  console.warn('mammoth not available');
}

try {
  XLSX = require('xlsx');
} catch (e) {
  console.warn('xlsx not available');
}

export interface BridgedFile {
  id: string;
  originalName: string;
  tempPath: string;
  type: string;
  size: number;
  created: Date;
  accessed: Date;
  content?: string; // For text files/PDFs
  metadata?: any;
}

export interface FileSystemBridgeOptions {
  maxFileSize?: number;
  maxFiles?: number;
  cleanupIntervalMs?: number;
  maxAgeMs?: number;
}

class ClaudeFileBridge {
  private tempDir: string;
  private bridgedFiles = new Map<string, BridgedFile>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private options: Required<FileSystemBridgeOptions>;

  constructor(options: FileSystemBridgeOptions = {}) {
    this.options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      maxFiles: 100, // Max 100 files at once
      cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
      maxAgeMs: 2 * 60 * 60 * 1000, // Files expire after 2 hours
      ...options
    };

    // Create temporary directory for bridged files
    this.tempDir = path.join(os.tmpdir(), 'coder1-file-bridge');
    this.initialize();
  }

  private async initialize() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('🌉 Claude File Bridge initialized:', this.tempDir);

      // Start cleanup interval
      this.startCleanupInterval();
    } catch (error) {
      console.error('❌ Failed to initialize Claude File Bridge:', error);
      throw error;
    }
  }

  private startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredFiles().catch(console.error);
    }, this.options.cleanupIntervalMs);
  }

  /**
   * Bridge a File object to the filesystem for Claude CLI access
   * Also extracts content for direct transmission to Claude Code
   */
  async bridgeFile(file: File, content?: string, metadata?: any): Promise<BridgedFile> {
    // Enhanced validation
    if (!file || !file.name) {
      throw new Error('Invalid file object provided');
    }

    if (file.size === 0) {
      console.log(`⚠️ Empty file detected: ${file.name}`);
    }

    if (file.size > this.options.maxFileSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${this.options.maxFileSize / 1024 / 1024}MB)`);
    }

    if (this.bridgedFiles.size >= this.options.maxFiles) {
      // Clean up oldest files to make space
      await this.cleanupOldestFiles(Math.ceil(this.options.maxFiles * 0.2)); // Remove 20%
    }

    // Validate file name for security
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      console.log(`⚠️ Potentially unsafe filename detected: ${file.name}`);
      // Sanitize filename while preserving extension
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      console.log(`🧹 Sanitized filename: ${sanitizedName}`);
    }

    const fileId = uuidv4();
    const fileExtension = path.extname(file.name) || this.getExtensionFromMimeType(file.type);
    const tempFileName = `${fileId}${fileExtension}`;
    const tempPath = path.join(this.tempDir, tempFileName);

    try {
      // Write file to temporary location with error handling
      console.log(`📁 Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
      
      let buffer: Buffer;
      try {
        buffer = await this.fileToBuffer(file);
      } catch (bufferError) {
        console.error(`❌ Failed to read file buffer for ${file.name}:`, bufferError);
        throw new Error(`Failed to read file: ${bufferError instanceof Error ? bufferError.message : 'Unknown error'}`);
      }

      // Validate buffer is not empty
      if (buffer.length === 0 && file.size > 0) {
        console.log(`⚠️ File ${file.name} appears empty after reading`);
      }

      try {
        await fs.writeFile(tempPath, buffer);
        console.log(`✅ File written to temp location: ${tempPath}`);
      } catch (writeError) {
        console.error(`❌ Failed to write file ${file.name} to temp location:`, writeError);
        throw new Error(`Failed to save file temporarily: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
      }
      
      // Extract content based on file type with enhanced error handling
      let extractedContent: string | undefined;
      try {
        if (this.isTextFile(file.type, file.name)) {
          try {
            extractedContent = buffer.toString('utf-8');
            console.log(`✅ Text content extracted: ${extractedContent.length} characters`);
          } catch (textError) {
            console.error(`❌ Failed to decode text for ${file.name}:`, textError);
            extractedContent = `[Text File: ${file.name}]\nError: Unable to decode file as UTF-8 text. File may be binary or corrupted.`;
          }
        } else if (this.isImageFile(file.type)) {
          // For images, don't create base64 - just provide reference for proper Claude Code handling
          console.log(`🖼️ Processing image file: ${file.name} (keeping as file reference)`);
          extractedContent = `[Image: ${file.name}]\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)}KB\nSaved to: ${tempPath}\n\nTo analyze this image in Claude Code:\n1. Drag the original image file directly into Claude Code\n2. Or use the file at: ${tempPath}`;
          console.log(`✅ Image reference created (no base64) for: ${file.name}`);
        } else if (this.isPDFFile(file.type, file.name)) {
        // Enhanced PDF text extraction
        try {
          console.log(`📄 Extracting text from PDF: ${file.name}`);
          const data = await pdf(buffer);
          
          if (data.text && data.text.trim().length > 0) {
            console.log(`✅ PDF extracted ${data.text.length} characters from ${file.name}`);
            // Format PDF content with metadata
            extractedContent = `[PDF Document: ${file.name}]\n` +
              `Pages: ${data.numpages}\n` +
              `Created: ${data.info?.CreationDate || 'Unknown'}\n\n` +
              `Extracted text:\n${data.text.trim()}`;
          } else {
            console.log(`⚠️ PDF ${file.name} appears to be empty or image-based`);
            extractedContent = `[PDF Document: ${file.name}]\n` +
              `Pages: ${data.numpages || 'Unknown'}\n` +
              `Note: This PDF appears to contain no extractable text. It may be image-based or protected.`;
          }
        } catch (pdfError) {
          console.error(`❌ PDF extraction failed for ${file.name}:`, pdfError);
          extractedContent = `[PDF Document: ${file.name}]\n` +
            `Error: Unable to extract text from this PDF file. It may be corrupted, protected, or image-based.`;
        }
      } else if (this.isWordDoc(file.type, file.name)) {
        // Word document processing (.docx)
        try {
          console.log(`📝 Extracting text from Word document: ${file.name}`);
          const result = await mammoth.extractRawText({ buffer });
          
          if (result.value && result.value.trim().length > 0) {
            console.log(`✅ Word doc extracted ${result.value.length} characters from ${file.name}`);
            extractedContent = `[Word Document: ${file.name}]\n\n` +
              `Extracted text:\n${result.value.trim()}`;
            
            // Log any warnings from mammoth
            if (result.messages && result.messages.length > 0) {
              console.log(`⚠️ Word processing warnings for ${file.name}:`, result.messages);
            }
          } else {
            console.log(`⚠️ Word document ${file.name} appears to be empty`);
            extractedContent = `[Word Document: ${file.name}]\n` +
              `Note: This Word document appears to contain no extractable text.`;
          }
        } catch (wordError) {
          console.error(`❌ Word document extraction failed for ${file.name}:`, wordError);
          extractedContent = `[Word Document: ${file.name}]\n` +
            `Error: Unable to extract text from this Word document. It may be corrupted or in an unsupported format.`;
        }
      } else if (this.isExcelFile(file.type, file.name)) {
        // Excel spreadsheet processing (.xlsx, .xls)
        try {
          console.log(`📊 Extracting data from Excel file: ${file.name}`);
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          
          if (workbook.SheetNames && workbook.SheetNames.length > 0) {
            let excelContent = `[Excel Spreadsheet: ${file.name}]\n`;
            excelContent += `Sheets: ${workbook.SheetNames.length}\n\n`;
            
            // Process each sheet
            workbook.SheetNames.forEach((sheetName, index) => {
              const worksheet = workbook.Sheets[sheetName];
              const csvData = XLSX.utils.sheet_to_csv(worksheet);
              
              if (csvData && csvData.trim().length > 0) {
                excelContent += `## Sheet ${index + 1}: ${sheetName}\n\n`;
                // Convert to markdown table format for better readability
                const rows = csvData.split('\n').filter(row => row.trim().length > 0);
                if (rows.length > 0) {
                  excelContent += '```csv\n' + csvData + '\n```\n\n';
                }
              }
            });
            
            console.log(`✅ Excel extracted data from ${workbook.SheetNames.length} sheets in ${file.name}`);
            extractedContent = excelContent;
          } else {
            console.log(`⚠️ Excel file ${file.name} appears to have no sheets`);
            extractedContent = `[Excel Spreadsheet: ${file.name}]\n` +
              `Note: This Excel file appears to contain no accessible sheets.`;
          }
        } catch (excelError) {
          console.error(`❌ Excel extraction failed for ${file.name}:`, excelError);
          extractedContent = `[Excel Spreadsheet: ${file.name}]\n` +
            `Error: Unable to extract data from this Excel file. It may be corrupted or in an unsupported format.`;
        }
      } else {
          // Unsupported file type - provide helpful message
          console.log(`ℹ️ Unsupported file type for content extraction: ${file.type} (${file.name})`);
          extractedContent = `[File: ${file.name}]\n` +
            `Type: ${file.type || 'unknown'}\n` +
            `Size: ${(file.size / 1024).toFixed(1)}KB\n\n` +
            `This file type is not supported for content extraction. ` +
            `It has been saved temporarily for Claude CLI access, but you may need to ` +
            `upload it directly to Claude Code for analysis.`;
        }
      } catch (contentError) {
        console.error(`❌ Content extraction failed for ${file.name}:`, contentError);
        extractedContent = `[File: ${file.name}]\n` +
          `Error during content extraction: ${contentError instanceof Error ? contentError.message : 'Unknown error'}\n\n` +
          `The file has been saved temporarily but content could not be processed. ` +
          `You can try uploading it directly to Claude Code.`;
      }

      const bridgedFile: BridgedFile = {
        id: fileId,
        originalName: file.name,
        tempPath,
        type: file.type,
        size: file.size,
        created: new Date(),
        accessed: new Date(),
        content: extractedContent || content, // Use extracted content if available, fallback to passed content
        metadata
      };

      this.bridgedFiles.set(fileId, bridgedFile);

      console.log(`🔗 File bridged: ${file.name} -> ${tempPath}`);
      return bridgedFile;
    } catch (error) {
      console.error(`❌ Failed to bridge file ${file.name}:`, error);
      throw error;
    }
  }

  /**
   * Bridge multiple files at once
   */
  async bridgeFiles(files: { file: File; content?: string; metadata?: any }[]): Promise<BridgedFile[]> {
    const results: BridgedFile[] = [];

    for (const { file, content, metadata } of files) {
      try {
        const bridgedFile = await this.bridgeFile(file, content, metadata);
        results.push(bridgedFile);
      } catch (error) {
        console.error(`Failed to bridge ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Get a bridged file by ID
   */
  getBridgedFile(id: string): BridgedFile | undefined {
    const file = this.bridgedFiles.get(id);
    if (file) {
      file.accessed = new Date();
    }
    return file;
  }

  /**
   * Get all bridged files
   */
  getAllBridgedFiles(): BridgedFile[] {
    return Array.from(this.bridgedFiles.values());
  }

  /**
   * Generate Claude CLI command string with file paths
   */
  generateClaudeCommand(fileIds: string[], userMessage?: string): string {
    const filePaths = fileIds
      .map(id => this.getBridgedFile(id)?.tempPath)
      .filter(path => path)
      .map(path => `"${path}"`)
      .join(' ');

    const message = userMessage || 'Please analyze these files';
    
    return `claude ${filePaths} "${message}"`;
  }

  /**
   * Generate a summary for terminal display
   */
  generateFilesSummary(fileIds: string[]): string {
    const files = fileIds
      .map(id => this.getBridgedFile(id))
      .filter(file => file);

    if (files.length === 0) return 'No files available';

    let summary = `📎 ${files.length} file(s) ready for Claude CLI:\n`;
    
    files.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      const icon = this.getFileIcon(file.type);
      summary += `  ${icon} ${file.originalName} (${sizeKB}KB)\n`;
      summary += `     Path: ${file.tempPath}\n`;
    });

    return summary;
  }

  /**
   * Remove a bridged file
   */
  async removeBridgedFile(id: string): Promise<boolean> {
    const file = this.bridgedFiles.get(id);
    if (!file) return false;

    try {
      await fs.unlink(file.tempPath);
      this.bridgedFiles.delete(id);
      console.log(`🗑️  Removed bridged file: ${file.originalName}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove bridged file ${file.originalName}:`, error);
      return false;
    }
  }

  /**
   * Check if file is a text file based on type and extension
   */
  private isTextFile(mimeType: string, fileName: string): boolean {
    const textMimeTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'application/xml',
      'text/xml',
      'text/markdown',
      'application/x-sh',
      'application/x-yaml',
      'text/yaml',
      'text/csv',
      'application/csv'
    ];
    
    const textExtensions = [
      '.txt', '.md', '.js', '.ts', '.jsx', '.tsx',
      '.json', '.xml', '.yaml', '.yml', '.html',
      '.css', '.scss', '.sass', '.less', '.py',
      '.rb', '.go', '.rs', '.c', '.cpp', '.h',
      '.java', '.sh', '.bash', '.zsh', '.fish',
      '.csv', '.tsv', '.log', '.conf', '.ini',
      '.env', '.gitignore', '.dockerfile', '.sql'
    ];
    
    if (textMimeTypes.includes(mimeType)) return true;
    
    const ext = path.extname(fileName).toLowerCase();
    return textExtensions.includes(ext);
  }
  
  /**
   * Check if file is an image
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a PDF
   */
  private isPDFFile(mimeType: string, fileName: string): boolean {
    return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  }

  /**
   * Check if file is a Word document
   */
  private isWordDoc(mimeType: string, fileName: string): boolean {
    return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
           fileName.toLowerCase().endsWith('.docx');
  }

  /**
   * Check if file is an Excel spreadsheet
   */
  private isExcelFile(mimeType: string, fileName: string): boolean {
    const excelMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const lowerFileName = fileName.toLowerCase();
    return excelMimes.includes(mimeType) || 
           lowerFileName.endsWith('.xlsx') || 
           lowerFileName.endsWith('.xls');
  }

  /**
   * Clean up expired files
   */
  private async cleanupExpiredFiles(): Promise<void> {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, file] of this.bridgedFiles) {
      if (now - file.accessed.getTime() > this.options.maxAgeMs) {
        expiredIds.push(id);
      }
    }

    if (expiredIds.length > 0) {
      console.log(`🧹 Cleaning up ${expiredIds.length} expired bridged files`);
      for (const id of expiredIds) {
        await this.removeBridgedFile(id);
      }
    }
  }

  /**
   * Clean up oldest files to make space
   */
  private async cleanupOldestFiles(count: number): Promise<void> {
    const files = Array.from(this.bridgedFiles.values())
      .sort((a, b) => a.accessed.getTime() - b.accessed.getTime())
      .slice(0, count);

    console.log(`🧹 Cleaning up ${files.length} oldest bridged files to make space`);
    
    for (const file of files) {
      await this.removeBridgedFile(file.id);
    }
  }

  /**
   * Helper: Convert File to Buffer
   */
  private async fileToBuffer(file: File): Promise<Buffer> {
    // In Node.js environment, File is a Blob
    // We need to use arrayBuffer() method instead of FileReader
    try {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(`Failed to convert file to buffer: ${error}`);
    }
  }

  /**
   * Helper: Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'application/json': '.json',
      'application/javascript': '.js',
      'text/javascript': '.js',
      'application/typescript': '.ts',
      'text/typescript': '.ts',
      'text/html': '.html',
      'text/css': '.css',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    return mimeMap[mimeType] || '';
  }

  /**
   * Helper: Get file icon for display
   */
  private getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return '📜';
    if (mimeType.includes('json')) return '📋';
    if (mimeType.includes('html')) return '🌐';
    if (mimeType.includes('css')) return '🎨';
    return '📄';
  }

  /**
   * Shutdown the service and clean up all files
   */
  async shutdown(): Promise<void> {
    console.log('🌉 Shutting down Claude File Bridge...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Remove all bridged files
    const ids = Array.from(this.bridgedFiles.keys());
    for (const id of ids) {
      await this.removeBridgedFile(id);
    }

    // Remove temp directory if empty
    try {
      await fs.rmdir(this.tempDir);
    } catch {
      // Directory might not be empty or might not exist
    }

    console.log('🌉 Claude File Bridge shutdown complete');
  }

  /**
   * Get bridge statistics
   */
  getStats() {
    const files = Array.from(this.bridgedFiles.values());
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    return {
      totalFiles: files.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      tempDir: this.tempDir,
      oldestFile: files.length > 0 ? Math.min(...files.map(f => f.created.getTime())) : null,
      newestFile: files.length > 0 ? Math.max(...files.map(f => f.created.getTime())) : null,
    };
  }
}

// Export singleton instance
export const claudeFileBridge = new ClaudeFileBridge({
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 50, // Max 50 files
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxAgeMs: 2 * 60 * 60 * 1000, // 2 hours
});

export default claudeFileBridge;