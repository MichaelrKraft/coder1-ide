'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Search, Copy, Send, Terminal,
  GitBranch, Code, Play, FolderSearch,
} from 'lucide-react';
import mappingsData from '@/data/command-mappings.json';

// ============================================================================
// Types
// ============================================================================

interface CommandMapping {
  id: string;
  phrases: string[];
  command: string;
  description: string;
  category: string;
  difficulty: string;
  warning?: string;
}

interface CommandTranslatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToTerminal?: (text: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'git', label: 'Git' },
  { id: 'claude', label: 'Claude' },
  { id: 'dev', label: 'Dev' },
  { id: 'nav', label: 'Nav' },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  git: GitBranch,
  claude: Code,
  dev: Play,
  nav: FolderSearch,
};

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-orange-500/20 text-orange-400',
};

// ============================================================================
// Helpers
// ============================================================================

function scoreMatch(query: string, mapping: CommandMapping): number {
  if (!query) return 1;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  let maxScore = 0;
  for (const phrase of mapping.phrases) {
    const phraseLower = phrase.toLowerCase();
    let hits = 0;
    for (const word of words) {
      if (phraseLower.includes(word)) hits++;
    }
    maxScore = Math.max(maxScore, hits);
  }

  // Also check description and command
  const descLower = mapping.description.toLowerCase();
  let descHits = 0;
  for (const word of words) {
    if (descLower.includes(word)) descHits++;
  }
  maxScore = Math.max(maxScore, descHits);

  return maxScore;
}

// ============================================================================
// Component
// ============================================================================

export default function CommandTranslator({
  isOpen,
  onClose,
  onSendToTerminal,
}: CommandTranslatorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mappings = mappingsData as CommandMapping[];

  const filteredMappings = useMemo(() => {
    let filtered = mappings;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(m => m.category === activeCategory);
    }

    if (!searchQuery.trim()) return filtered;

    const scored = filtered.map(m => ({ mapping: m, score: scoreMatch(searchQuery, m) }));
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.mapping);
  }, [mappings, activeCategory, searchQuery]);

  const handleCopy = useCallback((id: string, command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSend = useCallback((command: string) => {
    if (onSendToTerminal) {
      onSendToTerminal(command);
    }
    window.dispatchEvent(
      new CustomEvent('johnny5:sendToTerminal', { detail: { text: command } })
    );
    onClose();
  }, [onSendToTerminal, onClose]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-coder1-cyan" />
          <span className="text-sm font-semibold text-text-primary">
            Command Translator
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="What do you want to do? (e.g., 'save my work')"
            className="w-full pl-8 pr-3 py-1.5 bg-bg-secondary border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
            autoFocus
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 pb-2 flex gap-1 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-coder1-cyan/20 text-coder1-cyan'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Command Cards */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="grid grid-cols-1 gap-2">
          {filteredMappings.map(mapping => {
            const Icon = CATEGORY_ICONS[mapping.category] || Terminal;
            const isCopied = copiedId === mapping.id;

            return (
              <div
                key={mapping.id}
                className="p-3 bg-bg-tertiary border border-border-default rounded-lg hover:border-coder1-cyan/30 transition-all group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-coder1-cyan/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-coder1-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-text-primary">
                        {mapping.description}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          DIFFICULTY_STYLES[mapping.difficulty] || ''
                        }`}
                      >
                        {mapping.difficulty}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mb-1.5">
                      {mapping.phrases.slice(0, 3).map((p, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1 text-border-default">/</span>}
                          &ldquo;{p}&rdquo;
                        </span>
                      ))}
                    </p>
                    {/* Command code block */}
                    <div className="px-2.5 py-1.5 bg-bg-primary/80 border border-border-default rounded-md mb-2">
                      <code className="font-mono text-coder1-cyan text-xs break-all">
                        {mapping.command}
                      </code>
                    </div>
                    {mapping.warning && (
                      <p className="text-[10px] text-yellow-400 mb-1.5">
                        {mapping.warning}
                      </p>
                    )}
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(mapping.id, mapping.command)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-bg-secondary text-text-muted hover:text-text-secondary hover:bg-bg-secondary/80 transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleSend(mapping.command)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredMappings.length === 0 && (
            <div className="text-center py-8 text-text-muted text-xs">
              No commands match your search. Try different words.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
