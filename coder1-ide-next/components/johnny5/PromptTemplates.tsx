'use client';

import React, { useState, useMemo } from 'react';
import {
  X, Search, Bug, Wrench, TestTube, Eye, GitPullRequest,
  Code, Zap, Shield, FileText, Copy, Send, ChevronLeft,
} from 'lucide-react';
import templatesData from '@/data/prompt-templates.json';

// ============================================================================
// Types
// ============================================================================

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  template: string;
  placeholders: Array<{
    key: string;
    label: string;
    type: 'text' | 'multiline' | 'file';
    autofill?: string;
  }>;
  tags: string[];
}

interface PromptTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile?: string;
  lastError?: string;
  currentBranch?: string;
  onSendToTerminal?: (text: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'debug', label: 'Debug' },
  { id: 'build', label: 'Build' },
  { id: 'refactor', label: 'Refactor' },
  { id: 'test', label: 'Test' },
  { id: 'review', label: 'Review' },
  { id: 'deploy', label: 'Deploy' },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bug, Wrench, TestTube, Eye, GitPullRequest, Code, Zap, Shield, FileText,
};

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-orange-500/20 text-orange-400',
};

// ============================================================================
// Component
// ============================================================================

export default function PromptTemplates({
  isOpen,
  onClose,
  activeFile,
  lastError,
  currentBranch,
  onSendToTerminal,
}: PromptTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filledValues, setFilledValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const templates = templatesData as PromptTemplate[];

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(t => t.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    }
    return filtered;
  }, [templates, activeCategory, searchQuery]);

  // Auto-fill values when template is selected
  const selectTemplate = (template: PromptTemplate) => {
    const values: Record<string, string> = {};
    for (const p of template.placeholders) {
      if (p.autofill === 'activeFile' && activeFile) values[p.key] = activeFile;
      else if (p.autofill === 'lastError' && lastError) values[p.key] = lastError;
      else if (p.autofill === 'branch' && currentBranch) values[p.key] = currentBranch;
      else values[p.key] = '';
    }
    setFilledValues(values);
    setSelectedTemplate(template);
  };

  // Build final prompt text
  const buildPrompt = (): string => {
    if (!selectedTemplate) return '';
    let text = selectedTemplate.template;
    for (const [key, value] of Object.entries(filledValues)) {
      text = text.replace(`{${key}}`, value || `[${key}]`);
    }
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    const text = buildPrompt();
    if (onSendToTerminal) {
      onSendToTerminal(text);
    }
    window.dispatchEvent(new CustomEvent('johnny5:sendToTerminal', { detail: { text } }));
    onClose();
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setFilledValues({});
  };

  if (!isOpen) return null;

  const IconComponent = selectedTemplate ? ICON_MAP[selectedTemplate.icon] || FileText : FileText;

  return (
    <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          {selectedTemplate && (
            <button onClick={handleBack} className="p-1 rounded hover:bg-bg-tertiary text-text-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <FileText className="w-4 h-4 text-coder1-cyan" />
          <span className="text-sm font-semibold text-text-primary">
            {selectedTemplate ? selectedTemplate.name : 'Prompt Templates'}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!selectedTemplate ? (
        /* ============ Template Picker View ============ */
        <>
          {/* Search */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-8 pr-3 py-1.5 bg-bg-secondary border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
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

          {/* Template Cards */}
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="grid grid-cols-1 gap-2">
              {filteredTemplates.map(template => {
                const Icon = ICON_MAP[template.icon] || FileText;
                return (
                  <button
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className="text-left p-3 bg-bg-tertiary border border-border-default rounded-lg hover:border-coder1-cyan/30 hover:bg-bg-tertiary/80 transition-all group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-coder1-cyan/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-coder1-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-text-primary group-hover:text-coder1-cyan transition-colors">
                            {template.name}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${DIFFICULTY_STYLES[template.difficulty]}`}>
                            {template.difficulty}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted line-clamp-2">{template.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-text-muted text-xs">
                  No templates match your search.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ============ Template Fill View ============ */
        <div className="flex-1 overflow-auto">
          {/* Placeholder Form */}
          <div className="p-4 space-y-3">
            {selectedTemplate.placeholders.map(placeholder => (
              <div key={placeholder.key}>
                <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1">
                  {placeholder.label}
                  {placeholder.autofill && filledValues[placeholder.key] && (
                    <span className="ml-1 text-coder1-cyan normal-case tracking-normal">(auto-filled)</span>
                  )}
                </label>
                {placeholder.type === 'multiline' ? (
                  <textarea
                    value={filledValues[placeholder.key] || ''}
                    onChange={e => setFilledValues({ ...filledValues, [placeholder.key]: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 resize-none"
                    placeholder={placeholder.label}
                  />
                ) : (
                  <input
                    type="text"
                    value={filledValues[placeholder.key] || ''}
                    onChange={e => setFilledValues({ ...filledValues, [placeholder.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
                    placeholder={placeholder.label}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="px-4 pb-4">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Preview</p>
            <div className="p-3 bg-bg-secondary border border-border-default rounded-lg">
              <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                {buildPrompt()}
              </pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleSend}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Send to Terminal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
