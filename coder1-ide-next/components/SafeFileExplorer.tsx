'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, Home, ArrowLeft, Clock } from 'lucide-react';

const RECENT_FOLDERS_KEY = 'coder1-recentFolders';
const MAX_RECENT = 5;

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

interface SafeFileExplorerProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
  refreshTrigger?: number;
  onRootChange?: (newRoot: string) => void;
}

export default function SafeFileExplorer({ onFileSelect, activeFile, refreshTrigger, onRootChange }: SafeFileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRoot, setCurrentRoot] = useState<string>('');
  const [showDirectoryInput, setShowDirectoryInput] = useState(false);
  const [directoryInput, setDirectoryInput] = useState('');
  const [recentFolders, setRecentFolders] = useState<string[]>([]);
  const [projects, setProjects] = useState<{ name: string; path: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const projectsFetchedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved directory and recent folders from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fileExplorerDirectory');
    if (saved) {
      setCurrentRoot(saved);
    }
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_FOLDERS_KEY) || '[]');
      if (Array.isArray(recent)) setRecentFolders(recent);
    } catch {}
  }, []);

  // Listen for 'coder1:openFolder' event from MenuBar
  useEffect(() => {
    const handler = () => {
      setShowDirectoryInput(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener('coder1:openFolder', handler);
    return () => window.removeEventListener('coder1:openFolder', handler);
  }, []);

  // Listen for 'coder1:setExplorerRoot' event from ProjectPicker
  useEffect(() => {
    const handler = (e: Event) => {
      const { path } = (e as CustomEvent).detail;
      if (path) setCurrentRoot(path);
    };
    window.addEventListener('coder1:setExplorerRoot', handler);
    return () => window.removeEventListener('coder1:setExplorerRoot', handler);
  }, []);

  // Fetch discovered projects when directory panel opens (lazy, one-time)
  useEffect(() => {
    if (!showDirectoryInput || projectsFetchedRef.current) return;
    projectsFetchedRef.current = true;
    setLoadingProjects(true);
    fetch('/api/vault/projects')
      .then(r => r.json())
      .then(data => setProjects(data.projects ?? []))
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [showDirectoryInput]);

  // Add a folder to recent list
  const addToRecentFolders = useCallback((folderPath: string) => {
    if (!folderPath) return;
    setRecentFolders(prev => {
      const updated = [folderPath, ...prev.filter(p => p !== folderPath)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    });
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
        onRootChange?.(data.currentRoot);

        // Save to localStorage and track in recent folders
        if (data.currentRoot) {
          localStorage.setItem('fileExplorerDirectory', data.currentRoot);
          addToRecentFolders(data.currentRoot);
        }
        
        // Reset expanded folders for new directory
        setExpandedFolders(new Set(['/']));
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Failed to load file tree:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [addToRecentFolders]);

  useEffect(() => {
    fetchFileTree(currentRoot || undefined);
  }, [fetchFileTree, currentRoot, refreshTrigger]);

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
    const isNoFiles = error.includes('ENOENT') || error.includes('user-workspaces') || error.includes('no such file');
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          {isNoFiles ? (
            <>
              <div className="text-text-secondary text-sm mb-2">No files to show</div>
              <div className="text-text-muted text-xs mb-3">
                Connect the Coder1 bridge to browse your local files
              </div>
              <a
                href="/bridge-setup"
                className="px-3 py-1 text-xs bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 rounded transition-colors"
              >
                Connect Bridge
              </a>
            </>
          ) : (
            <>
              <div className="text-red-400 text-sm mb-2">Failed to load files</div>
              <div className="text-text-muted text-xs">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 text-xs bg-bg-tertiary hover:bg-bg-secondary rounded transition-colors"
              >
                Retry
              </button>
            </>
          )}
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
              onClick={() => {
                setShowDirectoryInput(!showDirectoryInput);
                if (!showDirectoryInput) setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="px-2 py-0.5 text-xs bg-coder1-cyan/10 border border-coder1-cyan/30 rounded hover:bg-coder1-cyan/20 transition-colors flex items-center gap-1"
              title="Open Folder"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Open</span>
            </button>
          </div>
        </div>

        {/* Directory Input */}
        {showDirectoryInput && (
          <div className="space-y-1">
            {/* Project dropdown */}
            <div className="flex gap-2">
              {loadingProjects ? (
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Scanning projects...
                </div>
              ) : projects.length > 0 ? (
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) handleDirectoryChange(e.target.value); }}
                  className="flex-1 px-2 py-1 text-xs bg-bg-primary border border-border-default rounded focus:outline-none focus:ring-1 focus:ring-coder1-cyan text-text-secondary cursor-pointer"
                >
                  <option value="">Pick a project...</option>
                  {projects.map(p => (
                    <option key={p.path} value={p.path}>{p.name}</option>
                  ))}
                </select>
              ) : null}
            </div>
            {/* Manual path input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={directoryInput}
                onChange={(e) => setDirectoryInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDirectoryInputSubmit()}
                placeholder="Or type a path..."
                className="flex-1 px-2 py-1 text-xs bg-bg-primary border border-border-default rounded focus:outline-none focus:ring-1 focus:ring-coder1-cyan"
              />
              <button
                onClick={handleDirectoryInputSubmit}
                className="px-2 py-1 text-xs bg-coder1-cyan text-bg-primary rounded hover:bg-opacity-80 transition-colors"
              >
                Go
              </button>
            </div>
            {recentFolders.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] text-text-muted uppercase tracking-wider px-1">Recent</div>
                {recentFolders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => handleDirectoryChange(folder)}
                    className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:bg-bg-secondary rounded truncate transition-colors flex items-center gap-1.5"
                    title={folder}
                  >
                    <Clock className="w-3 h-3 shrink-0 text-text-muted" />
                    <span className="truncate">{folder.replace(/^\/Users\/[^/]+/, '~')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Tree Content */}
      <div className="flex-1 overflow-auto">
        {fileTree ? renderNode(fileTree) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <FolderOpen className="w-10 h-10 text-coder1-cyan/50 mb-3" />
            <div className="text-sm font-medium text-text-secondary mb-1">Open a Folder</div>
            <div className="text-xs text-text-muted mb-4">Get started by opening a project folder</div>
            <button
              onClick={() => {
                setShowDirectoryInput(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="px-4 py-2 text-xs bg-coder1-cyan/10 border border-coder1-cyan/30 rounded-lg hover:bg-coder1-cyan/20 transition-colors flex items-center gap-2 text-coder1-cyan"
            >
              <FolderOpen className="w-4 h-4" />
              Open Folder...
            </button>
            {recentFolders.length > 0 && (
              <div className="mt-5 w-full max-w-[200px]">
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Recent Folders</div>
                {recentFolders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => handleDirectoryChange(folder)}
                    className="w-full text-left px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary rounded truncate transition-colors flex items-center gap-1.5"
                    title={folder}
                  >
                    <Clock className="w-3 h-3 shrink-0 text-text-muted" />
                    <span className="truncate">{folder.replace(/^\/Users\/[^/]+/, '~')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}