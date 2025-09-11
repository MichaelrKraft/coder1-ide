'use client';

import React, { useState, useEffect } from 'react';
import { X, File, Folder, FolderOpen, Search, FileText, FileCode, Image, Coffee, Hash, Braces, ChevronRight, ChevronDown } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileOpenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (filePath: string) => void;
}

export default function FileOpenDialog({ isOpen, onClose, onFileSelect }: FileOpenDialogProps) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTree, setFilteredTree] = useState<FileNode | null>(null);

  // Fetch file tree when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchFileTree();
    }
  }, [isOpen]);

  // Filter tree based on search
  useEffect(() => {
    if (!fileTree) return;
    
    if (!searchQuery) {
      setFilteredTree(fileTree);
      return;
    }

    const filterNode = (node: FileNode): FileNode | null => {
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (node.type === 'file') {
        return matchesSearch ? node : null;
      }
      
      // For directories, filter children
      const filteredChildren = node.children
        ?.map(child => filterNode(child))
        .filter((child): child is FileNode => child !== null);
      
      if (filteredChildren && filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      
      return matchesSearch ? { ...node, children: [] } : null;
    };

    setFilteredTree(filterNode(fileTree));
  }, [searchQuery, fileTree]);

  const fetchFileTree = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/files/tree');
      const data = await response.json();
      
      if (data.success) {
        setFileTree(data.tree);
        setFilteredTree(data.tree);
        // Auto-expand root and common directories
        const initialExpanded = new Set<string>();
        initialExpanded.add('/');
        // Expand directories with test files
        if (data.tree.children) {
          data.tree.children.forEach((child: FileNode) => {
            if (child.type === 'directory' && 
                (child.name === 'public' || child.name === 'src' || child.name === 'components')) {
              initialExpanded.add(child.path);
            }
          });
        }
        setExpandedFolders(initialExpanded);
      } else {
        setError(data.error || 'Failed to fetch file tree');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('File tree fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'directory') {
      toggleFolder(node.path);
    } else {
      setSelectedPath(node.path);
    }
  };

  const handleOpen = () => {
    if (selectedPath) {
      onFileSelect(selectedPath);
      onClose();
      setSelectedPath(null);
      setSearchQuery('');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'html':
      case 'htm':
        return <FileText className="w-4 h-4 text-orange-400" />;
      case 'tsx':
      case 'jsx':
        return <Braces className="w-4 h-4 text-blue-400" />;
      case 'ts':
      case 'js':
        return <FileCode className="w-4 h-4 text-yellow-400" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <Hash className="w-4 h-4 text-pink-400" />;
      case 'json':
        return <Braces className="w-4 h-4 text-green-400" />;
      case 'md':
        return <FileText className="w-4 h-4 text-gray-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className="w-4 h-4 text-purple-400" />;
      case 'java':
        return <Coffee className="w-4 h-4 text-red-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderFileNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;
    const isDirectory = node.type === 'directory';
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.path}>
        <div
          className={`
            flex items-center px-2 py-1 cursor-pointer hover:bg-bg-secondary
            ${isSelected ? 'bg-coder1-cyan/20 border-l-2 border-coder1-cyan' : ''}
          `}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleFileClick(node)}
        >
          {isDirectory && (
            <span className="mr-1">
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 text-gray-400" />
              }
            </span>
          )}
          <span className="mr-2">
            {isDirectory ? (
              isExpanded ? 
                <FolderOpen className="w-4 h-4 text-yellow-500" /> : 
                <Folder className="w-4 h-4 text-yellow-600" />
            ) : (
              getFileIcon(node.name)
            )}
          </span>
          <span className={`text-sm ${isDirectory ? 'text-gray-300' : 'text-gray-400'}`}>
            {node.name}
          </span>
        </div>
        
        {isDirectory && isExpanded && hasChildren && (
          <div>
            {node.children?.map(child => renderFileNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-[700px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h2 className="text-lg font-semibold text-white">Open File</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-default rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-coder1-cyan"
            />
          </div>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-4 bg-bg-primary">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-400">Loading files...</div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-red-400">Error: {error}</div>
            </div>
          )}
          
          {!loading && !error && filteredTree && (
            <div className="space-y-1">
              {filteredTree.children?.map(child => renderFileNode(child))}
            </div>
          )}
          
          {!loading && !error && searchQuery && !filteredTree?.children?.length && (
            <div className="text-center py-8 text-gray-500">
              No files found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-default bg-bg-secondary">
          <div className="text-sm text-gray-400">
            {selectedPath ? (
              <span>Selected: <span className="text-coder1-cyan">{selectedPath}</span></span>
            ) : (
              <span>Select a file to open</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleOpen}
              disabled={!selectedPath || selectedPath.endsWith('/')}
              className={`
                px-4 py-2 text-sm rounded-md transition-all
                ${selectedPath && !selectedPath.endsWith('/') ? 
                  'bg-coder1-cyan text-black hover:bg-coder1-cyan-light' : 
                  'bg-gray-700 text-gray-500 cursor-not-allowed'}
              `}
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}