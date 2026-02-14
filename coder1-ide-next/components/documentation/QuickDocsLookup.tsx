'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ExternalLink, Loader2, Book, Code, FileText } from 'lucide-react';
import { RECOMMENDED_DOCS, type DocRecommendation } from '@/lib/recommended-docs';

interface QuickDocsLookupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickResult {
  type: 'library' | 'doc';
  name: string;
  description: string;
  url: string;
  category?: string;
}

const QuickDocsLookup: React.FC<QuickDocsLookupProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuickResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchDocs = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      const defaultResults: QuickResult[] = Object.entries(RECOMMENDED_DOCS)
        .slice(0, 8)
        .map(([key, doc]) => ({
          type: 'library' as const,
          name: doc.name,
          description: doc.description,
          url: doc.urls[0]?.url || '',
          category: key
        }));
      setResults(defaultResults);
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    const matchedResults: QuickResult[] = [];

    Object.entries(RECOMMENDED_DOCS).forEach(([key, doc]) => {
      const nameMatch = doc.name.toLowerCase().includes(queryLower);
      const descMatch = doc.description.toLowerCase().includes(queryLower);
      const keyMatch = key.includes(queryLower);

      if (nameMatch || descMatch || keyMatch) {
        matchedResults.push({
          type: 'library',
          name: doc.name,
          description: doc.description,
          url: doc.urls[0]?.url || '',
          category: key
        });

        doc.urls.forEach(urlItem => {
          if (urlItem.title.toLowerCase().includes(queryLower)) {
            matchedResults.push({
              type: 'doc',
              name: urlItem.title,
              description: `${doc.name} documentation`,
              url: urlItem.url,
              category: key
            });
          }
        });
      }
    });

    setResults(matchedResults.slice(0, 10));
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchDocs(query);
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [query, searchDocs]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          window.open(results[selectedIndex].url, '_blank');
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-xl bg-bg-secondary border border-border-default rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border-default">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documentation... (React, Next.js, Stripe, etc.)"
            className="flex-1 bg-transparent text-text-primary text-lg placeholder-text-muted focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div 
          ref={resultsRef}
          className="max-h-[400px] overflow-y-auto"
        >
          {results.length === 0 && query ? (
            <div className="p-8 text-center text-text-muted">
              <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documentation found for &quot;{query}&quot;</p>
              <p className="text-xs mt-1">Try searching for a library name like &quot;react&quot; or &quot;prisma&quot;</p>
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.category}-${result.url}-${index}`}
                onClick={() => {
                  window.open(result.url, '_blank');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                  index === selectedIndex 
                    ? 'bg-blue-500/20 border-l-2 border-blue-500' 
                    : 'hover:bg-bg-tertiary border-l-2 border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  result.type === 'library' 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {result.type === 'library' ? (
                    <Code className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary truncate">
                    {result.name}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {result.description}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-text-muted flex-shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between p-3 border-t border-border-default bg-bg-tertiary/50 text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-bg-primary rounded border border-border-default">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-bg-primary rounded border border-border-default">↵</kbd> Open</span>
            <span><kbd className="px-1.5 py-0.5 bg-bg-primary rounded border border-border-default">Esc</kbd> Close</span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
};

export default QuickDocsLookup;
