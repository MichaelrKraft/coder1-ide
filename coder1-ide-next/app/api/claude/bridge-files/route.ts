import { NextRequest, NextResponse } from 'next/server';
import claudeFileBridge from '@/services/claude-file-bridge';
import { claudeCliService } from '@/services/claude-cli-service';

// Mark as dynamic since this uses request data
export const dynamic = 'force-dynamic';

// Generate user-friendly content for terminal display (minimal output)
function generateDisplayMessage(files: any[]): string {
  // Return minimal display - just file info, no verbose content
  let content = '';
  
  files.forEach((file, index) => {
    if (file.content) {
      // For all file types, just show icon, name and size
      const fileIcon = getFileIcon(file.type, file.originalName);
      const fileSize = formatFileSize(file.size);
      content += `${fileIcon} ${file.originalName} (${fileSize})`;
      
      // Add separator between multiple files
      if (index < files.length - 1) {
        content += ', ';
      }
    }
  });
  
  return content;
}

// Generate content for Claude Code clipboard (reference for images, not base64)
function generateClaudeMessage(files: any[]): string {
  // Return content for clipboard - reference images instead of base64
  let content = '';
  
  files.forEach((file, index) => {
    if (file.content) {
      // For images, provide a reference instead of base64 data
      if (file.content.startsWith('data:image')) {
        const fileIcon = getFileIcon(file.type, file.originalName);
        const fileType = getReadableFileType(file.type, file.originalName);
        const fileSize = formatFileSize(file.size);
        content += `[Image File: ${file.originalName}]\n`;
        content += `Type: ${fileType}\n`;
        content += `Size: ${fileSize}\n`;
        content += `\nPlease use the file at: ${file.tempPath || file.originalName}\n`;
        content += `(Drag the original image file directly into Claude Code for analysis)`;
      } else if (file.content.startsWith('data:')) {
        // Other data URLs - provide reference
        const fileType = getReadableFileType(file.type, file.originalName);
        const fileSize = formatFileSize(file.size);
        content += `[Data File: ${file.originalName}]\n`;
        content += `Type: ${fileType}\n`;
        content += `Size: ${fileSize}\n`;
        content += `(Drag the original file directly into Claude Code for processing)`;
      } else {
        // Text content - include actual content
        content += file.content;
      }
      
      // Add separator between multiple files
      if (index < files.length - 1) {
        content += '\n\n---\n\n';
      }
    }
  });
  
  return content;
}

// Helper functions for better formatting
function getFileIcon(mimeType: string, fileName: string): string {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (fileName.toLowerCase().endsWith('.docx')) return '📝';
  if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) return '📊';
  if (mimeType?.includes('javascript') || fileName.toLowerCase().endsWith('.js')) return '📜';
  if (mimeType?.includes('typescript') || fileName.toLowerCase().endsWith('.ts')) return '📘';
  if (mimeType?.includes('json')) return '📋';
  if (mimeType?.includes('html')) return '🌐';
  if (mimeType?.includes('css')) return '🎨';
  return '📄';
}

function getReadableFileType(mimeType: string, fileName: string): string {
  if (mimeType?.startsWith('image/')) return `${mimeType.split('/')[1].toUpperCase()} Image`;
  if (mimeType === 'application/pdf') return 'PDF Document';
  if (fileName.toLowerCase().endsWith('.docx')) return 'Word Document';
  if (fileName.toLowerCase().endsWith('.xlsx')) return 'Excel Spreadsheet';
  if (fileName.toLowerCase().endsWith('.xls')) return 'Excel Spreadsheet (Legacy)';
  if (mimeType?.includes('javascript')) return 'JavaScript Code';
  if (mimeType?.includes('typescript')) return 'TypeScript Code';
  if (mimeType?.includes('json')) return 'JSON Data';
  if (mimeType?.includes('html')) return 'HTML Document';
  if (mimeType?.includes('css')) return 'CSS Stylesheet';
  return mimeType || 'Unknown';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export async function POST(request: NextRequest) {
  try {
    // Get files from FormData
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    console.log(`🌉 Bridging ${files.length} files for Claude CLI`);
    
    // Bridge files to temporary location
    const bridgedFiles = await claudeFileBridge.bridgeFiles(
      files.map(file => ({ file, metadata: { uploadTime: new Date() } }))
    );
    
    if (bridgedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to bridge any files' },
        { status: 500 }
      );
    }
    
    // Generate Claude CLI command
    const filePaths = bridgedFiles.map(f => f.tempPath);
    const fileIds = bridgedFiles.map(f => f.id);
    const command = claudeFileBridge.generateClaudeCommand(fileIds, 'Please analyze these files');
    
    console.log(`✅ Bridged files:`, bridgedFiles.map(f => ({
      name: f.originalName,
      path: f.tempPath,
      size: f.size
    })));
    console.log(`📋 Generated command: ${command}`);
    
    // Also log the actual file paths for debugging
    console.log(`📂 Temp file paths:`, filePaths);
    
    // Generate a summary with file contents for Claude Code
    const filesWithContent = bridgedFiles.map(f => {
      let displayContent = '';
      
      if (f.content) {
        if (f.content.startsWith('data:image')) {
          // For images, we'll just note it's an image (base64 is too large for terminal)
          displayContent = '[Image data - ready for Claude Code]';
        } else if (f.content.length > 500) {
          // Truncate long text content for display
          displayContent = f.content.substring(0, 500) + '\n[... truncated for display ...]';
        } else {
          displayContent = f.content;
        }
      }
      
      return {
        id: f.id,
        originalName: f.originalName,
        tempPath: f.tempPath,
        type: f.type,
        size: f.size,
        content: f.content,  // Full content for processing
        displayContent  // Truncated content for terminal display
      };
    });
    
    return NextResponse.json({
      bridgedFiles: filesWithContent,
      fileIds,
      filePaths,
      command,
      summary: claudeFileBridge.generateFilesSummary(fileIds),
      // Add a formatted message that can be copied to Claude Code (includes base64)
      claudeMessage: generateClaudeMessage(filesWithContent),
      // Add user-friendly display message for terminal (hides base64)
      displayMessage: generateDisplayMessage(filesWithContent)
    });
    
  } catch (error) {
    console.error('Error bridging files:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to bridge files',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}