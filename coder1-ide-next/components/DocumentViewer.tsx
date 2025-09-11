'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, Clock, Database, ExternalLink, Copy, Check } from 'lucide-react';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'session' | 'project' | 'context' | 'external';
  documentId?: string;
  documentName?: string;
}

export default function DocumentViewer({ isOpen, onClose, type, documentId, documentName }: DocumentViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let response;
        
        switch(type) {
          case 'session':
            response = await fetch('/api/docs/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: documentId }),
              cache: 'no-store'
            });
            
            if (response.ok) {
              const data = await response.json();
              setContent(data.summary?.content || '');
              setMetadata({
                title: data.summary?.title || 'Session Summary',
                timestamp: data.summary?.timestamp,
                size: data.summary?.size
              });
            }
            break;
            
          case 'project':
            response = await fetch('/api/docs/project', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: documentName }),
              cache: 'no-store'
            });
            
            if (response.ok) {
              const data = await response.json();
              setContent(data.document?.content || '');
              setMetadata({
                title: documentName || 'Project Documentation',
                modified: data.document?.modified,
                size: data.document?.size
              });
            }
            break;
            
          case 'context':
            // For context memories, we'll need to implement the API endpoint
            // For now, show a placeholder
            setContent(`# Context Memory: ${documentId}\n\nContext memory viewing coming soon...`);
            setMetadata({
              title: `Memory ${documentId}`,
              type: 'Context Folder Memory'
            });
            break;
            
          case 'external':
            response = await fetch(`/api/docs/${documentId}`, {
              cache: 'no-store'
            });
            
            if (response.ok) {
              const data = await response.json();
              // Reconstruct content from chunks
              const fullContent = data.chunks?.map((chunk: any) => chunk.content).join('\n\n') || data.content || '';
              setContent(fullContent);
              setMetadata({
                title: data.title || 'External Documentation',
                url: data.url,
                timestamp: data.timestamp,
                chunks: data.chunks?.length || 0
              });
            }
            break;
        }
        
        if (response && !response.ok) {
          throw new Error('Failed to fetch document');
        }
        
      } catch (err: any) {
        // logger?.error('Error fetching document:', err);
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen && (documentId || documentName)) {
      fetchDocument();
    }
  }, [isOpen, documentId, documentName, type]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (text: string) => {
    // Basic markdown rendering with syntax highlighting support
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2 text-text-primary">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3 text-text-primary">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4 text-text-primary">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-text-primary">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-coder1-cyan hover:underline" target="_blank">$1</a>')
      // Lists
      .replace(/^\* (.+)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.+)/gim, '<li class="ml-4">$1</li>')
      // Code blocks
      .replace(/```([^`]+)```/g, '<pre class="bg-bg-tertiary p-3 rounded-lg my-2 overflow-x-auto"><code class="text-sm">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-bg-tertiary px-1 py-0.5 rounded text-coder1-cyan text-sm">$1</code>')
      // Line breaks
      .replace(/\n/g, '<br/>');
    
    return { __html: html };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-secondary rounded-lg shadow-2xl w-[90%] h-[85%] max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-coder1-cyan" />
            <h2 className="text-lg font-semibold text-text-primary">
              {metadata?.title || 'Document Viewer'}
            </h2>
            {metadata?.url && (
              <a 
                href={metadata.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-text-muted hover:text-coder1-cyan transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Source</span>
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-text-muted">
              {metadata?.timestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(metadata.timestamp).toLocaleDateString()}</span>
                </div>
              )}
              {metadata?.modified && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(metadata.modified).toLocaleDateString()}</span>
                </div>
              )}
              {metadata?.size && (
                <div className="flex items-center gap-1">
                  <Database className="w-4 h-4" />
                  <span>{(metadata.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
              {metadata?.chunks && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{metadata.chunks} chunks</span>
                </div>
              )}
            </div>
            
            {/* Copy button */}
            <button
              onClick={copyToClipboard}
              className="p-2 rounded hover:bg-bg-tertiary transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-text-muted" />
              )}
            </button>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-bg-tertiary transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-text-muted">Loading document...</div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400">Error: {error}</div>
            </div>
          )}
          
          {!loading && !error && content && (
            <div 
              className="prose prose-invert max-w-none text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={renderMarkdown(content)}
            />
          )}
        </div>
      </div>
    </div>
  );
}