import { NextRequest, NextResponse } from 'next/server';
import claudeFileBridge from '@/services/claude-file-bridge';
import { claudeCliService } from '@/services/claude-cli-service';

// Mark as dynamic since this uses request data
export const dynamic = 'force-dynamic';

// Generate a message formatted for Claude Code with enhanced AI optimization
function generateClaudeMessage(files: any[]): string {
  // Create a properly formatted message for Claude Code
  let message = '# 📎 Files Shared via Coder1 IDE\n\n';
  message += `I'm sharing ${files.length} file${files.length > 1 ? 's' : ''} with you:\n\n`;
  
  files.forEach((file, index) => {
    // Get appropriate icon based on file type
    const icon = getFileIcon(file.type, file.originalName);
    message += `## ${icon} ${file.originalName}\n\n`;
    
    // Enhanced metadata display
    message += `**File Details:**\n`;
    message += `- **Type**: ${getReadableFileType(file.type, file.originalName)}\n`;
    message += `- **Size**: ${formatFileSize(file.size)}\n`;
    
    if (file.content) {
      // Handle different content types with better formatting
      if (file.content.includes('[Image:') && file.content.includes('Extracted text via OCR:')) {
        // OCR-processed image
        message += `- **Processing**: Text extracted via OCR\n\n`;
        message += `${file.content}\n\n`;
      } else if (file.content.includes('[PDF Document:')) {
        // PDF with extracted text
        message += `- **Processing**: PDF text extraction\n\n`;
        message += `${file.content}\n\n`;
      } else if (file.content.includes('[Word Document:')) {
        // Word document
        message += `- **Processing**: Word document text extraction\n\n`;
        message += `${file.content}\n\n`;
      } else if (file.content.includes('[Excel Spreadsheet:')) {
        // Excel file
        message += `- **Processing**: Excel data extraction\n\n`;
        message += `${file.content}\n\n`;
      } else if (file.type?.startsWith('image/')) {
        // Image without OCR (base64 fallback)
        message += `\n⚠️ **Image file**: This image couldn't be processed with OCR. For best results, please upload this image directly to Claude Code using the attachment button.\n\n`;
      } else if (file.content.startsWith('data:')) {
        // Base64 data - try to decode
        const base64Match = file.content.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match) {
          try {
            const decodedContent = Buffer.from(base64Match[1], 'base64').toString('utf-8');
            const ext = file.originalName.split('.').pop()?.toLowerCase() || 'txt';
            message += `\n\`\`\`${ext}\n${decodedContent}\n\`\`\`\n\n`;
          } catch (e) {
            message += `\n⚠️ **Binary file**: Cannot be displayed as text. Upload directly to Claude Code if needed.\n\n`;
          }
        }
      } else {
        // Plain text content
        const ext = file.originalName.split('.').pop()?.toLowerCase() || 'txt';
        message += `\n\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
      }
    } else {
      message += `\n⚠️ **No content extracted**: Upload this file directly to Claude Code.\n\n`;
    }
  });
  
  // Enhanced footer with instructions
  message += '---\n\n';
  message += '**Next Steps:**\n';
  message += '1. ✅ Files are now formatted for Claude Code\n';
  message += '2. 📋 This content is in your clipboard - paste it into your Claude Code conversation\n';
  message += '3. 🤖 Claude Code can now analyze, understand, and work with these files\n\n';
  message += '*Enhanced by Coder1 IDE file processing*\n';
  
  return message;
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
      // Add a formatted message that can be copied to Claude Code
      claudeMessage: generateClaudeMessage(filesWithContent)
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