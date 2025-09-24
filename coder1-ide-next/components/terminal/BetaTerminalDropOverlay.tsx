'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, FileText, FileCode, File, X, Loader2, Check, Terminal, Link } from 'lucide-react';

interface BetaTerminalDropOverlayProps {
  onFileDrop: (files: File[]) => void;
  onTextInsert?: (text: string) => void;
  onClaudeBridge?: (bridgeResult: any) => void; // New: handle Claude CLI bridge
  isProcessing?: boolean;
  terminalRef?: React.RefObject<HTMLDivElement>;
}

interface ProcessedFile {
  file: File;
  preview?: string;
  content?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export default function BetaTerminalDropOverlay({ 
  onFileDrop, 
  onTextInsert,
  onClaudeBridge,
  isProcessing = false,
  terminalRef 
}: BetaTerminalDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [droppedFiles, setDroppedFiles] = useState<ProcessedFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Global drag prevention to stop browser from opening files
  React.useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Prevent all drops when we're in dragging state to avoid browser navigation
      if (isDragging) {
        return false;
      }
    };

    // Add global event listeners in CAPTURE phase to prevent browser default behavior early
    document.addEventListener('dragover', preventDefaults, true);
    document.addEventListener('dragenter', preventDefaults, true);
    document.addEventListener('dragstart', preventDefaults, true);
    document.addEventListener('drop', handleGlobalDrop, true);

    return () => {
      document.removeEventListener('dragover', preventDefaults, true);
      document.removeEventListener('dragenter', preventDefaults, true);
      document.removeEventListener('dragstart', preventDefaults, true);
      document.removeEventListener('drop', handleGlobalDrop, true);
    };
  }, [terminalRef, isDragging]);

  // File type icons
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (file.type === 'application/pdf') return <File className="w-5 h-5 text-red-400" />;
    if (file.type.startsWith('text/') || file.name.endsWith('.md')) return <FileText className="w-5 h-5" />;
    if (file.name.match(/\.(js|jsx|ts|tsx|py|java|cpp|c|go|rs|rb|php)$/)) return <FileCode className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    setDragCounter(0);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Process files and show preview
      const processedFiles: ProcessedFile[] = files.map(file => ({
        file,
        status: 'pending' as const
      }));
      
      setDroppedFiles(processedFiles);
      setShowPreview(true);
      
      // Process each file
      for (let i = 0; i < processedFiles.length; i++) {
        const pf = processedFiles[i];
        
        // Update status to processing
        setDroppedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'processing' as const } : f
        ));
        
        try {
          // Read file content for text files
          if (pf.file.type.startsWith('text/') || 
              pf.file.name.match(/\.(txt|md|js|jsx|ts|tsx|py|java|cpp|c|go|rs|rb|php|json|xml|yaml|yml|css|html)$/)) {
            const content = await readFileAsText(pf.file);
            setDroppedFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, content, status: 'success' as const } : f
            ));
          } 
          // Create preview for images
          else if (pf.file.type.startsWith('image/')) {
            const preview = await readFileAsDataURL(pf.file);
            setDroppedFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, preview, status: 'success' as const } : f
            ));
          }
          // Mark other files as ready
          else {
            setDroppedFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, status: 'success' as const } : f
            ));
          }
        } catch (error) {
          setDroppedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error' as const, error: String(error) } : f
          ));
        }
      }
      
      // Notify parent component
      onFileDrop(files);
    }
  }, [onFileDrop]);

  // Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Read file as data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Insert file path or content into terminal
  const handleInsertToTerminal = (file: ProcessedFile) => {
    if (onTextInsert) {
      if (file.content) {
        // For text files, insert content
        onTextInsert(file.content);
      } else {
        // For other files, insert file name/path
        onTextInsert(file.file.name);
      }
    }
    // Close preview after insertion
    setShowPreview(false);
    setDroppedFiles([]);
  };

  // Clear all files
  const handleClearAll = () => {
    setDroppedFiles([]);
    setShowPreview(false);
    setBridgeResult(null);
  };

  // Handle Claude CLI bridge
  const handleClaudeBridge = async () => {
    if (droppedFiles.length === 0) return;

    setIsBridging(true);
    try {
      const formData = new FormData();
      formData.append('sessionId', `bridge_${Date.now()}`);
      formData.append('userPrompt', `Analyze these ${droppedFiles.length} file(s)`);
      formData.append('autoInject', 'true');
      formData.append('preferredFormat', 'both');

      droppedFiles.forEach((pf, index) => {
        formData.append(`file_${index}`, pf.file);
      });

      const response = await fetch('/api/claude-bridge/session', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Bridge failed: ${response.statusText}`);
      }

      const result = await response.json();
      setBridgeResult(result);

      // Notify parent component
      if (onClaudeBridge) {
        onClaudeBridge(result);
      }

      // Insert terminal display text if available
      if (onTextInsert && result.terminalDisplay) {
        onTextInsert(result.terminalDisplay);
      }

    } catch (error) {
      console.error('Claude bridge error:', error);
      setBridgeResult({
        error: `Failed to bridge files: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <>
      {/* Invisible drop overlay that captures events */}
      <div
        ref={overlayRef}
        className="fixed pointer-events-auto"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ 
          zIndex: 9999,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          position: 'fixed'
        }}
      >
        {/* Visual feedback when dragging */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-bg-secondary/95 border-2 border-dashed border-primary rounded-lg p-8 shadow-2xl">
              <Upload className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-semibold text-text-primary">Drop files here</p>
              <p className="text-sm text-text-secondary mt-2">
                Images, text files, code files, or any document
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File preview panel */}
      {showPreview && droppedFiles.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-bg-secondary/95 backdrop-blur-sm border-t border-border-primary p-4 shadow-xl" 
             style={{ zIndex: 1000, maxHeight: '50%', overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Dropped Files ({droppedFiles.length})
            </h3>
            <button
              onClick={handleClearAll}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {droppedFiles.map((pf, idx) => (
              <div key={idx} 
                   className="flex items-center gap-3 p-2 bg-bg-primary rounded-lg border border-border-secondary hover:border-primary transition-colors">
                {/* File icon */}
                <div className="flex-shrink-0 text-text-secondary">
                  {getFileIcon(pf.file)}
                </div>
                
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {pf.file.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatFileSize(pf.file.size)}
                  </p>
                </div>
                
                {/* Status/Actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {pf.status === 'processing' && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}
                  {pf.status === 'success' && (
                    <>
                      <Check className="w-4 h-4 text-success" />
                      <button
                        onClick={() => handleInsertToTerminal(pf)}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                      >
                        Insert
                      </button>
                    </>
                  )}
                  {pf.status === 'error' && (
                    <span className="text-xs text-error">{pf.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Bulk actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                // Process all files at once
                onFileDrop(droppedFiles.map(pf => pf.file));
                handleClearAll();
              }}
              className="px-3 py-1.5 text-sm bg-primary text-bg-primary rounded hover:bg-primary-hover transition-colors"
              disabled={isProcessing || isBridging}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process All with AI'
              )}
            </button>
            
            <button
              onClick={handleClaudeBridge}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
              disabled={isProcessing || isBridging || droppedFiles.length === 0}
              title="Bridge files for Claude CLI access"
            >
              {isBridging ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Bridging...
                </>
              ) : (
                <>
                  <Link className="w-3 h-3" />
                  Bridge to Claude CLI
                </>
              )}
            </button>
            
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-sm bg-bg-tertiary text-text-secondary rounded hover:bg-bg-secondary transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Bridge status display */}
      {bridgeResult && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-900/95 backdrop-blur-sm border-t border-green-600 p-4 shadow-xl"
             style={{ zIndex: 1001 }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-green-100 flex items-center gap-2">
              <Link className="w-4 h-4" />
              Claude CLI Bridge Status
            </h3>
            <button
              onClick={() => setBridgeResult(null)}
              className="text-green-300 hover:text-green-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {bridgeResult.error ? (
            <div className="text-red-300 text-sm">
              ❌ {bridgeResult.error}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-green-200 text-sm">
                ✅ {bridgeResult.message}
              </div>
              
              {bridgeResult.sessionBridge?.claudeCommand && (
                <div className="bg-green-800/50 rounded p-2 text-xs">
                  <div className="text-green-300 mb-1">Ready to run:</div>
                  <code className="text-green-100 font-mono break-all">
                    {bridgeResult.sessionBridge.claudeCommand}
                  </code>
                </div>
              )}
              
              {bridgeResult.sessionBridge?.filesCount && (
                <div className="text-green-300 text-xs">
                  📁 {bridgeResult.sessionBridge.filesCount} file(s) bridged to filesystem
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload button for explicit file selection */}
      <button
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
              // Directly call the file processing logic
              onFileDrop(files);
              setDroppedFiles(files.map(file => ({
                file,
                status: 'pending' as const
              })));
              setShowPreview(true);
            }
          };
          input.click();
        }}
        className="absolute top-2 right-48 px-2 py-1 bg-bg-secondary/80 text-text-secondary hover:text-primary border border-border-secondary rounded text-xs flex items-center gap-1 transition-colors hover:border-primary"
        style={{ zIndex: 10 }}
      >
        <Upload className="w-3 h-3" />
        Upload
      </button>
    </>
  );
}