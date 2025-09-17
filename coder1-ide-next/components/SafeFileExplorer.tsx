'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2 } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

interface SafeFileExplorerProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
}

export default function SafeFileExplorer({ onFileSelect, activeFile }: SafeFileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real file tree from API
  useEffect(() => {
    const fetchFileTree = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/files/tree');
        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.tree) {
          // Convert 'directory' type to 'folder' for UI consistency
          const convertTreeTypes = (node: any): FileNode => ({
            ...node,
            type: node.type === 'directory' ? 'directory' : 'file',
            children: node.children ? node.children.map(convertTreeTypes) : undefined
          });
          
          setFileTree(convertTreeTypes(data.tree));
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Failed to load file tree:', err);
        setError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        setLoading(false);
      }
    };

    fetchFileTree();
  }, []);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  }, []);

  const renderNode = useCallback((node: FileNode, depth: number = 0): React.ReactNode => {
    if (!node || !node.path) return null;
    
    const isExpanded = expandedFolders.has(node.path);
    const isActive = activeFile === node.path;
    const indent = depth * 12;

    if (node.type === 'file') {
      return (
        <div
          key={`file-${node.path}`}
          className={`
            flex items-center gap-2 px-2 py-1 cursor-pointer
            hover:bg-bg-tertiary transition-colors
            ${isActive ? 'bg-bg-tertiary text-coder1-cyan' : 'text-text-secondary'}
          `}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => onFileSelect(node.path)}
        >
          <File className="w-4 h-4 shrink-0" />
          <span className="text-sm truncate">{node.name}</span>
        </div>
      );
    }

    // Handle directory type
    return (
      <div key={`folder-${node.path}`}>
        <div
          className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-bg-tertiary transition-colors text-text-secondary"
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => toggleFolder(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 shrink-0 text-coder1-cyan" />
          ) : (
            <Folder className="w-4 h-4 shrink-0" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {isExpanded && node.children && Array.isArray(node.children) && (
          <div>
            {node.children.map((child, index) => 
              child ? renderNode(child, depth + 1) : null
            )}
          </div>
        )}
      </div>
    );
  }, [expandedFolders, activeFile, onFileSelect, toggleFolder]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading files...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 text-sm mb-2">Failed to load files</div>
          <div className="text-text-muted text-xs">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-3 py-1 text-xs bg-bg-tertiary hover:bg-bg-secondary rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {fileTree ? renderNode(fileTree) : (
        <div className="p-4 text-text-secondary text-sm">No files to display</div>
      )}
    </div>
  );
}