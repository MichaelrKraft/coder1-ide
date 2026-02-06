'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCog, Shield, Gauge, BookOpen, TestTube2, Eye, Wrench,
  X, Copy, Check, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import personasData from '@/data/agent-personas.json';

// ============================================================================
// Types
// ============================================================================

interface AgentPersona {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  recommendedModel: string;
  promptPrefix: string;
  claudeMdRules: string[];
  tags: string[];
}

interface AgentPersonasProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Gauge,
  BookOpen,
  TestTube2,
  Eye,
  Wrench,
};

const MODEL_STYLES: Record<string, string> = {
  opus: 'bg-purple-500/20 text-purple-400',
  sonnet: 'bg-coder1-cyan/20 text-coder1-cyan',
  haiku: 'bg-green-500/20 text-green-400',
};

const CATEGORY_STYLES: Record<string, string> = {
  security: 'bg-red-500/15 text-red-400',
  performance: 'bg-yellow-500/15 text-yellow-400',
  docs: 'bg-blue-500/15 text-blue-400',
  testing: 'bg-green-500/15 text-green-400',
  review: 'bg-purple-500/15 text-purple-400',
  refactor: 'bg-orange-500/15 text-orange-400',
};

const STORAGE_KEY = 'johnny5_active_persona';

// ============================================================================
// Component
// ============================================================================

export default function AgentPersonas({ isOpen, onClose }: AgentPersonasProps) {
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activatedId, setActivatedId] = useState<string | null>(null);

  const personas = (personasData as { personas: AgentPersona[] }).personas;

  // Load active persona from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActivePersonaId(stored);
    }
  }, []);

  const toggleRules = useCallback((id: string) => {
    setExpandedRules(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleCopyRules = useCallback((persona: AgentPersona) => {
    const rulesText = `## ${persona.name} Rules\n\n` +
      persona.claudeMdRules.map(rule => `- ${rule}`).join('\n');
    navigator.clipboard.writeText(rulesText);
    setCopiedId(persona.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleActivate = useCallback((persona: AgentPersona) => {
    // Copy CLAUDE.md rules to clipboard
    const rulesText = `## ${persona.name} Rules\n\n` +
      persona.claudeMdRules.map(rule => `- ${rule}`).join('\n');
    navigator.clipboard.writeText(rulesText);

    // Send prompt prefix to terminal
    window.dispatchEvent(
      new CustomEvent('johnny5:sendToTerminal', { detail: { text: persona.promptPrefix } })
    );

    // Set as active persona
    setActivePersonaId(persona.id);
    localStorage.setItem(STORAGE_KEY, persona.id);

    // Show activation feedback
    setActivatedId(persona.id);
    setTimeout(() => setActivatedId(null), 2000);
  }, []);

  const handleDeactivate = useCallback(() => {
    setActivePersonaId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  if (!isOpen) return null;

  const activePersona = personas.find(p => p.id === activePersonaId) || null;

  return (
    <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4 text-coder1-cyan" />
          <div>
            <span className="text-sm font-semibold text-text-primary">
              Agent Personas
            </span>
            <p className="text-[10px] text-text-muted">
              Pre-configured modes for specialized Claude Code sessions
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Persona Indicator */}
      {activePersona && (
        <div className="mx-4 mt-2 px-3 py-2 bg-coder1-cyan/10 border border-coder1-cyan/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-coder1-cyan" />
            <span className="text-xs text-coder1-cyan font-medium">
              Active: {activePersona.name}
            </span>
          </div>
          <button
            onClick={handleDeactivate}
            className="text-[10px] text-text-muted hover:text-red-400 transition-colors"
          >
            Deactivate
          </button>
        </div>
      )}

      {/* Persona Cards */}
      <div className="flex-1 overflow-auto px-4 py-3 pb-4">
        <div className="grid grid-cols-1 gap-2">
          {personas.map(persona => {
            const Icon = ICON_MAP[persona.icon] || UserCog;
            const isActive = activePersonaId === persona.id;
            const isCopied = copiedId === persona.id;
            const isActivated = activatedId === persona.id;
            const isExpanded = expandedRules[persona.id] || false;
            const visibleRules = isExpanded ? persona.claudeMdRules : persona.claudeMdRules.slice(0, 2);
            const hiddenCount = persona.claudeMdRules.length - 2;

            return (
              <div
                key={persona.id}
                className={`p-3 bg-bg-secondary/60 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'border-coder1-cyan/50 bg-coder1-cyan/5'
                    : 'border-border-default hover:border-coder1-cyan/30'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-coder1-cyan/20' : 'bg-coder1-cyan/10'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-coder1-cyan' : 'text-coder1-cyan/70'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-semibold text-text-primary">
                        {persona.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_STYLES[persona.category] || ''}`}>
                        {persona.category}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${MODEL_STYLES[persona.recommendedModel] || ''}`}>
                        {persona.recommendedModel.charAt(0).toUpperCase() + persona.recommendedModel.slice(1)}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted line-clamp-2">
                      {persona.description}
                    </p>
                  </div>
                </div>

                {/* CLAUDE.md Rules Preview */}
                <div className="mb-2">
                  <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1">
                    CLAUDE.md Rules
                  </p>
                  <ul className="space-y-1">
                    {visibleRules.map((rule, idx) => (
                      <li
                        key={idx}
                        className="text-[10px] text-text-secondary pl-2 border-l-2 border-border-default leading-relaxed"
                      >
                        {rule}
                      </li>
                    ))}
                  </ul>
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => toggleRules(persona.id)}
                      className="flex items-center gap-1 mt-1 text-[10px] text-text-muted hover:text-coder1-cyan transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Show all {persona.claudeMdRules.length} rules
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleActivate(persona)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                      isActivated
                        ? 'bg-green-500/20 text-green-400'
                        : isActive
                          ? 'bg-coder1-cyan/30 text-coder1-cyan'
                          : 'bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30'
                    }`}
                  >
                    {isActivated ? (
                      <>
                        <Check className="w-3 h-3" />
                        Activated!
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        {isActive ? 'Re-activate' : 'Activate'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleCopyRules(persona)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-bg-tertiary text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/80 transition-all duration-200"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy Rules
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
