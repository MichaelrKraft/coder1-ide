'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Folder, FolderOpen, File, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

interface FileTreeResponse {
  teamId: string;
  worktreePath: string;
  fileTree: FileNode[];
  totalFiles: number;
  totalDirectories: number;
}

export default function PreviewModal({ isOpen, onClose, teamId }: PreviewModalProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [leftPaneWidth, setLeftPaneWidth] = useState(30);

  useEffect(() => {
    if (isOpen && teamId) {
      loadFileTree();
    }
  }, [isOpen, teamId]);

  useEffect(() => {
    if (!isOpen) {
      setFileTree([]);
      setSelectedFile(null);
      setFileContent('');
      setError(null);
      setExpandedDirs(new Set());
    }
  }, [isOpen]);

  const loadFileTree = async () => {
    setIsLoadingTree(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai-team/preview/${teamId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load file tree (${response.status})`);
      }

      const data: FileTreeResponse = await response.json();
      setFileTree(data.fileTree);

    } catch (err) {
      console.error('Failed to load file tree:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file tree');
    } finally {
      setIsLoadingTree(false);
    }
  };

  const loadFileContent = async (filePath: string) => {
    setIsLoadingFile(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai-team/preview/${teamId}/file?path=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load file (${response.status})`);
      }

      const data = await response.json();
      
      if (data.isBinary) {
        setFileContent(`[Binary file: ${data.fileName}]\n\nCannot preview binary files.\nFile size: ${formatBytes(data.size)}`);
      } else {
        setFileContent(data.content);
      }

      setSelectedFile(filePath);

    } catch (err) {
      console.error('Failed to load file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setFileContent('');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'directory') {
      toggleDirectory(node.path);
    } else {
      loadFileContent(node.path);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  };

  const getFileLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'html': 'html',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'sh': 'shell',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const renderFileTree = (nodes: FileNode[], depth: number = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = selectedFile === node.path;
      
      return (
        <div key={node.path}>
          <button
            onClick={() => handleFileClick(node)}
            className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-bg-tertiary/50 transition-colors ${
              isSelected ? 'bg-cyan-600/20 text-cyan-300' : 'text-text-primary'
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {node.type === 'directory' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0 text-text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-text-muted" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                ) : (
                  <Folder className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                )}
              </>
            ) : (
              <>
                <div className="w-4" />
                <File className="w-4 h-4 flex-shrink-0 text-text-muted" />
              </>
            )}
            <span className="truncate">{node.name}</span>
            {node.type === 'file' && node.size !== undefined && (
              <span className="ml-auto text-xs text-text-muted">{formatBytes(node.size)}</span>
            )}
          </button>
          
          {node.type === 'directory' && isExpanded && node.children && (
            <div>
              {renderFileTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPaneWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const containerWidth = window.innerWidth * 0.9;
      const newWidth = Math.max(15, Math.min(50, startWidth + (deltaX / containerWidth) * 100));
      setLeftPaneWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl w-[90vw] h-[80vh] flex flex-col">
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Preview AI Team Output
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Team: {teamId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-tertiary rounded transition-colors"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            <div 
              className="border-r border-border-primary overflow-y-auto bg-bg-primary"
              style={{ width: `${leftPaneWidth}%` }}
            >
              <div className="p-2">
                {isLoadingTree ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : fileTree.length > 0 ? (
                  renderFileTree(fileTree)
                ) : (
                  <div className="text-center py-8 text-text-muted text-sm">
                    No files found
                  </div>
                )}
              </div>
            </div>

            <div
              className="w-1 bg-border-primary hover:bg-cyan-500/50 cursor-col-resize transition-colors"
              onMouseDown={handleMouseDown}
            />

            <div 
              className="flex-1 overflow-hidden bg-bg-secondary"
              style={{ width: `${100 - leftPaneWidth}%` }}
            >
              {isLoadingFile ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : selectedFile ? (
                <MonacoEditor
                  height="100%"
                  language={getFileLanguage(selectedFile)}
                  value={fileContent}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted">
                  <div className="text-center">
                    <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select a file to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border-primary bg-bg-primary/30">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
