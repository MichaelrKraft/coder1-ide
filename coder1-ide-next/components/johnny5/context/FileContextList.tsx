'use client';

import React, { useState } from 'react';
import {
  FileCode,
  FileText,
  FileJson,
  File,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Clock,
} from 'lucide-react';
import { Johnny5FileContext } from '@/types/johnny5';

interface FileContextListProps {
  files: Johnny5FileContext[];
  onRemoveFile?: (path: string) => void;
  className?: string;
}

/**
 * FileContextList - List of files currently in context
 *
 * Features:
 * - File type icons
 * - Token count per file
 * - Sortable (by tokens, name, time added)
 * - Searchable
 * - Remove file action
 */
export default function FileContextList({
  files,
  onRemoveFile,
  className = '',
}: FileContextListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'tokens' | 'name' | 'time'>('tokens');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Get file icon based on extension
  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return <FileCode className="w-3.5 h-3.5 text-coder1-cyan" />;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
      case 'md':
      case 'txt':
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      case 'css':
      case 'scss':
        return <FileCode className="w-3.5 h-3.5 text-pink-400" />;
      case 'html':
        return <FileCode className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <File className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  // Get filename from path
  const getFileName = (path: string) => path.split('/').pop() || path;

  // Get relative path
  const getRelativePath = (path: string) => {
    const parts = path.split('/');
    if (parts.length <= 2) return path;
    return '.../' + parts.slice(-2).join('/');
  };

  // Format tokens
  const formatTokens = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Format relative time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  // Filter and sort files
  const filteredFiles = files
    .filter(f => f.path.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'tokens':
          comparison = a.tokens - b.tokens;
          break;
        case 'name':
          comparison = getFileName(a.path).localeCompare(getFileName(b.path));
          break;
        case 'time':
          comparison = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

  // Calculate total tokens
  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);

  // Toggle sort
  const handleSort = (field: 'tokens' | 'name' | 'time') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  // Toggle file expansion
  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  return (
    <div className={`bg-bg-tertiary rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-coder1-cyan" />
          Files in Context
          <span className="ml-1 px-1.5 py-0.5 bg-coder1-cyan/20 text-coder1-cyan rounded text-[9px]">
            {files.length}
          </span>
        </h4>
        <span className="text-[10px] text-text-muted">
          {formatTokens(totalTokens)} tokens
        </span>
      </div>

      {/* Search */}
      {files.length > 3 && (
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-bg-secondary border border-border-default rounded-md
              text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-coder1-cyan/50"
          />
        </div>
      )}

      {/* Sort controls */}
      {files.length > 1 && (
        <div className="flex items-center gap-1 mb-2 text-[9px]">
          <span className="text-text-muted mr-1">Sort:</span>
          {(['tokens', 'name', 'time'] as const).map((field) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                sortBy === field
                  ? 'bg-coder1-cyan/20 text-coder1-cyan'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {field.charAt(0).toUpperCase() + field.slice(1)}
              {sortBy === field && (
                sortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* File list */}
      <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-4 text-text-muted text-xs">
            {files.length === 0 ? 'No files in context' : 'No matching files'}
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isExpanded = expandedFiles.has(file.path);
            const percentage = totalTokens > 0 ? (file.tokens / totalTokens) * 100 : 0;

            return (
              <div
                key={file.path}
                className="bg-bg-secondary rounded-md overflow-hidden group"
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-bg-secondary/80"
                  onClick={() => toggleExpanded(file.path)}
                >
                  {/* Icon */}
                  {getFileIcon(file.path)}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-text-primary truncate">
                        {getFileName(file.path)}
                      </span>
                      <span className="text-[10px] text-text-muted ml-2 flex-shrink-0">
                        {formatTokens(file.tokens)}
                      </span>
                    </div>

                    {/* Token bar */}
                    <div className="mt-1 h-0.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-coder1-cyan/60"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Expand/collapse */}
                  <ChevronDown
                    className={`w-3 h-3 text-text-muted transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-2 pb-2 pt-1 border-t border-border-default space-y-1">
                    <div className="flex items-center gap-2 text-[9px] text-text-muted">
                      <span className="truncate flex-1">{file.path}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[9px] text-text-muted">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Added {formatTime(file.addedAt)}</span>
                      </div>

                      {onRemoveFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFile(file.path);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[9px]
                            text-red-400 hover:bg-red-500/20 rounded transition-all"
                        >
                          <X className="w-2.5 h-2.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer summary */}
      {files.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border-default flex items-center justify-between text-[9px]">
          <span className="text-text-muted">
            {filteredFiles.length} of {files.length} files shown
          </span>
          <span className="text-text-muted">
            Avg: {formatTokens(Math.round(totalTokens / files.length))} tokens/file
          </span>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 217, 255, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 217, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
