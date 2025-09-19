import { useEffect, useRef } from 'react';
import prettierService from '../services/PrettierServiceBrowser';

interface ClaudeCodeEvent {
  type: 'code-generated' | 'file-modified' | 'batch-refactor';
  code?: string;
  language?: string;
  fileName?: string;
  files?: Array<{ path: string; content: string }>;
}

export const useClaudeCodeIntegration = (
  editorRef: React.MutableRefObject<any>,
  fileName: string
) => {
  const lastFormattedCode = useRef<string>('');

  useEffect(() => {
    const handleClaudeCodeEvent = async (event: CustomEvent<ClaudeCodeEvent>) => {
      const { type, code, language, files } = event.detail;

      switch (type) {
        case 'code-generated':
          if (code && language) {
            // Format the Claude-generated code
            const formatted = await prettierService.formatOnClaudeGenerate(code, language);
            
            // Only update if formatting changed the code
            if (formatted !== code && editorRef.current) {
              lastFormattedCode.current = formatted;
              editorRef.current.setValue(formatted);
              
              // Show notification
              showNotification('Code formatted with Prettier ✨');
            }
          }
          break;

        case 'file-modified':
          if (code && event.detail.fileName === fileName) {
            // Format when Claude modifies the current file
            const formatted = await prettierService.formatOnClaudeGenerate(
              code,
              detectLanguageFromFileName(fileName)
            );
            
            if (formatted !== code && editorRef.current) {
              lastFormattedCode.current = formatted;
              editorRef.current.setValue(formatted);
              showNotification('File formatted after Claude modification ✨');
            }
          }
          break;

        case 'batch-refactor':
          if (files && files.length > 0) {
            // Format all files in batch refactor
            const results = await prettierService.batchFormat(files);
            const successCount = results.filter(r => r.result.success).length;
            showNotification(`Formatted ${successCount}/${files.length} files ✨`);
            
            // If current file was part of batch, update editor
            const currentFileResult = results.find(r => r.path === fileName);
            if (currentFileResult?.result.success && currentFileResult.result.formatted) {
              if (editorRef.current) {
                editorRef.current.setValue(currentFileResult.result.formatted);
              }
            }
          }
          break;
      }
    };

    // Listen for Claude Code events
    window.addEventListener('claude-code-event', handleClaudeCodeEvent as unknown as EventListener);

    // Also listen for messages from parent window (for iframe integration)
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.source === 'claude-code' && event.data?.type) {
        handleClaudeCodeEvent(new CustomEvent('claude-code-event', {
          detail: event.data
        }));
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('claude-code-event', handleClaudeCodeEvent as unknown as EventListener);
      window.removeEventListener('message', handleMessage);
    };
  }, [editorRef, fileName]);

  // Expose format function for manual triggering
  const formatCurrentDocument = async () => {
    if (!editorRef.current) return;

    const currentValue = editorRef.current.getValue();
    const result = await prettierService.formatCode(currentValue, fileName);

    if (result.success && result.formatted) {
      editorRef.current.setValue(result.formatted);
      lastFormattedCode.current = result.formatted;
      showNotification('Document formatted with Prettier ✨');
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.error,
        suggestions: result.suggestions,
        autoFix: result.formatted
      };
    }
  };

  return {
    formatCurrentDocument,
    lastFormattedCode: lastFormattedCode.current
  };
};

// Helper functions
function detectLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'md': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  return languageMap[ext || ''] || 'javascript';
}

function showNotification(message: string) {
  // Create a custom notification element
  const notification = document.createElement('div');
  notification.className = 'prettier-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a1b26;
    color: #9ece6a;
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid #9ece6a;
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);