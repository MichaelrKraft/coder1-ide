'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
}

export default function FileExplorer({ onFileSelect, activeFile }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  
  // Mock file structure - will be replaced with actual file system
  const fileTree: FileNode = {
    name: 'coder1-project',
    type: 'folder',
    path: '/',
    children: [
      {
        name: 'src',
        type: 'folder',
        path: '/src',
        children: [
          { name: 'App.tsx', type: 'file', path: '/src/App.tsx' },
          { name: 'index.tsx', type: 'file', path: '/src/index.tsx' },
          {
            name: 'components',
            type: 'folder',
            path: '/src/components',
            children: [
              { name: 'Header.tsx', type: 'file', path: '/src/components/Header.tsx' },
              { name: 'Footer.tsx', type: 'file', path: '/src/components/Footer.tsx' },
            ],
          },
        ],
      },
      { name: 'package.json', type: 'file', path: '/package.json' },
      { name: 'README.md', type: 'file', path: '/README.md' },
    ],
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = activeFile === node.path;
    const indent = depth * 12;

    if (node.type === 'file') {
      return (
        <div
          key={node.path}
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

    return (
      <div key={node.path}>
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
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto">
      {renderNode(fileTree)}
    </div>
  );
}