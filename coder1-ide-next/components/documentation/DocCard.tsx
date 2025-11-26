'use client';

import React from 'react';
import { ExternalLink, Clock, Trash2, ClipboardCopy, Check, FileImage, File, FileText } from 'lucide-react';

interface DocCardProps {
  docId: string;
  title: string;
  url?: string;
  categories?: string[];
  wordCount?: number;
  chunkCount?: number;
  age?: number;
  claudeScore?: number;
  claudeReasoning?: string;
  excerpts?: Array<{ text: string; heading?: string; hasCode: boolean }>;
  isCopied: boolean;
  onCopyForClaude: () => void;
  onDelete: () => void;
  variant?: 'default' | 'search-result';
}

const DocCard: React.FC<DocCardProps> = ({
  docId,
  title,
  url,
  categories = [],
  wordCount,
  chunkCount,
  age,
  claudeScore,
  claudeReasoning,
  excerpts,
  isCopied,
  onCopyForClaude,
  onDelete,
  variant = 'default'
}) => {
  const formatAge = (ageMs: number) => {
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    if (hours < 1) return 'Just added';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext || '')) {
      return <FileImage className="w-4 h-4 text-blue-400" />;
    }
    if (ext === 'pdf') {
      return <File className="w-4 h-4 text-red-400" />;
    }
    if (ext === 'csv') {
      return <FileText className="w-4 h-4 text-green-400" />;
    }
    return null;
  };

  const isFile = url && !url.startsWith('http');

  return (
    <div className="border border-border-default rounded-lg p-3 space-y-2 hover:border-blue-500/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isFile && getFileIcon(title)}
            <h4 className="font-medium text-text-primary line-clamp-2">{title}</h4>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {url && url.startsWith('http') && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                {variant === 'search-result' ? 'View Original' : 'View'}
              </a>
            )}
            {age !== undefined && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatAge(age)}
              </span>
            )}
            {claudeScore && (
              <span className="text-xs text-green-400" title={claudeReasoning}>
                AI Score: {claudeScore}/10
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={onCopyForClaude}
            className="p-1.5 hover:bg-blue-500/20 rounded transition-colors group"
            title="Copy for Claude - paste in your conversation"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <ClipboardCopy className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
            title="Delete Documentation"
          >
            <Trash2 className="w-4 h-4 text-text-muted hover:text-red-400" />
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <span key={cat} className="px-2 py-0.5 bg-bg-tertiary text-xs text-text-muted rounded">
              {cat}
            </span>
          ))}
        </div>
      )}

      {excerpts && excerpts.length > 0 && (
        <div className="space-y-2">
          {excerpts.slice(0, 2).map((excerpt, i) => (
            <div key={i} className="text-xs text-text-secondary bg-bg-primary p-2 rounded">
              {excerpt.heading && (
                <div className="font-medium text-text-primary mb-1">{excerpt.heading}</div>
              )}
              <div className={excerpt.hasCode ? 'font-mono' : ''}>{excerpt.text}</div>
            </div>
          ))}
        </div>
      )}

      {claudeReasoning && (
        <div className="text-xs text-text-muted bg-blue-500/10 p-2 rounded">
          <strong>AI Analysis:</strong> {claudeReasoning}
        </div>
      )}

      {wordCount !== undefined && variant === 'default' && (
        <div className="text-xs text-text-muted">
          {wordCount.toLocaleString()} words{chunkCount ? ` • ${chunkCount} chunks` : ''}
        </div>
      )}
    </div>
  );
};

export default DocCard;
