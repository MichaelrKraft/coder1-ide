'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, Home, Settings, ArrowLeft } from 'lucide-react';

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
  const [currentRoot, setCurrentRoot] = useState<string>('');
  const [showDirectoryInput, setShowDirectoryInput] = useState(false);
  const [directoryInput, setDirectoryInput] = useState('');

  // Load saved directory from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fileExplorerDirectory');
    if (saved) {
      setCurrentRoot(saved);
    }
  }, []);

  // Fetch real file tree from API
  const fetchFileTree = useCallback(async (rootPath?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = rootPath ? `/api/files/tree?rootPath=${encodeURIComponent(rootPath)}` : '/api/files/tree';
      const response = await fetch(url);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to fetch files: ${response.status}`);
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
        setCurrentRoot(data.currentRoot);
        
        // Save to localStorage
        if (data.currentRoot) {
          localStorage.setItem('fileExplorerDirectory', data.currentRoot);
        }
        
        // Reset expanded folders for new directory
        setExpandedFolders(new Set(['/']));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to load file tree:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFileTree(currentRoot || undefined);
  }, [fetchFileTree, currentRoot]);

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

  const handleDirectoryChange = useCallback((newPath: string) => {
    setCurrentRoot(newPath);
    setShowDirectoryInput(false);
    setDirectoryInput('');
  }, []);

  const handleDirectoryInputSubmit = useCallback(() => {
    if (directoryInput.trim()) {
      handleDirectoryChange(directoryInput.trim());
    }
  }, [directoryInput, handleDirectoryChange]);

  const resetToProjectRoot = useCallback(() => {
    localStorage.removeItem('fileExplorerDirectory');
    setCurrentRoot('');
  }, []);

  const navigateToParent = useCallback(() => {
    if (currentRoot) {
      const parentPath = require('path').dirname(currentRoot);
      if (parentPath !== currentRoot) { // Prevent infinite loop at root
        handleDirectoryChange(parentPath);
      }
    }
  }, [currentRoot, handleDirectoryChange]);

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

  // Format current path for display
  const formatPath = (path: string) => {
    if (!path) return 'Project Root';
    const parts = path.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return path;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Directory Controls Header */}
      <div className="border-b border-border-default p-2 space-y-2 bg-bg-tertiary">
        {/* Current Directory Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Folder className="w-4 h-4 shrink-0 text-coder1-cyan" />
            <span className="text-xs text-text-secondary truncate" title={currentRoot || 'Project Root'}>
              {formatPath(currentRoot)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {currentRoot && (
              <button
                onClick={navigateToParent}
                className="p-1 hover:bg-bg-secondary rounded transition-colors"
                title="Go to parent directory"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={resetToProjectRoot}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
              title="Reset to project root"
            >
              <Home className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowDirectoryInput(!showDirectoryInput)}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
              title="Change directory"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Directory Input */}
        {showDirectoryInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={directoryInput}
              onChange={(e) => setDirectoryInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleDirectoryInputSubmit()}
              placeholder="Enter directory path..."
              className="flex-1 px-2 py-1 text-xs bg-bg-primary border border-border-default rounded focus:outline-none focus:ring-1 focus:ring-coder1-cyan"
              autoFocus
            />
            <button
              onClick={handleDirectoryInputSubmit}
              className="px-2 py-1 text-xs bg-coder1-cyan text-bg-primary rounded hover:bg-opacity-80 transition-colors"
            >
              Go
            </button>
          </div>
        )}
      </div>

      {/* File Tree Content */}
      <div className="flex-1 overflow-auto">
        {fileTree ? renderNode(fileTree) : (
          <div className="p-4 text-text-secondary text-sm">No files to display</div>
        )}
      </div>
    </div>
  );
}