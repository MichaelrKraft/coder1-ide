'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Plus } from 'lucide-react';
import type { AgentMarketplaceTemplate } from '@/types/agent-marketplace';
import type { AgentCategory } from '@/types/agent-marketplace';
import { AgentCategoryFilter } from './AgentCategoryFilter';
import { AgentTemplateCard } from './AgentTemplateCard';
import { AgentTemplateDetail } from './AgentTemplateDetail';
import { AgentBuilder } from './AgentBuilder';
import type { TeamRole } from '@/lib/team-permission';

// ============================================================================
// Types
// ============================================================================

type FilterValue = AgentCategory | 'all' | 'activated';

interface AgentMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string | null;
  userRole?: TeamRole | null;
}

// ============================================================================
// Helpers
// ============================================================================

function groupTemplates(templates: AgentMarketplaceTemplate[]): {
  builtIns: AgentMarketplaceTemplate[];
  teamCustom: AgentMarketplaceTemplate[];
} {
  return {
    builtIns: templates.filter((t) => t.isBuiltIn),
    teamCustom: templates.filter((t) => t.isTeamCustom),
  };
}

// ============================================================================
// Component
// ============================================================================

export function AgentMarketplaceModal({
  isOpen,
  onClose,
  teamId = null,
  userRole = null,
}: AgentMarketplaceModalProps): React.ReactElement | null {
  const [templates, setTemplates] = useState<AgentMarketplaceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterValue>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentMarketplaceTemplate | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (teamId) params.set('teamId', teamId);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/agent-marketplace/templates?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { templates: AgentMarketplaceTemplate[] };
      setTemplates(data.templates);
    } catch (err) {
      console.error('[AgentMarketplace] Failed to fetch templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, categoryFilter, search]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(id);
  }, [isOpen, fetchTemplates]);

  const handleActivate = useCallback(
    async (template: AgentMarketplaceTemplate) => {
      if (!teamId) return;
      setActivatingId(template.id);
      try {
        const res = await fetch('/api/agent-marketplace/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: template.id, teamId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, isActivated: true } : t))
        );
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate({ ...template, isActivated: true });
        }
      } catch (err) {
        console.error('[AgentMarketplace] Activate failed:', err);
      } finally {
        setActivatingId(null);
      }
    },
    [teamId, selectedTemplate]
  );

  const handleDeactivate = useCallback(
    async (templateId: string) => {
      if (!teamId) return;
      setActivatingId(templateId);
      try {
        const res = await fetch(
          `/api/agent-marketplace/activate/${encodeURIComponent(templateId)}?teamId=${encodeURIComponent(teamId)}`,
          { method: 'DELETE' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTemplates((prev) =>
          prev.map((t) => (t.id === templateId ? { ...t, isActivated: false } : t))
        );
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate({ ...selectedTemplate, isActivated: false });
        }
      } catch (err) {
        console.error('[AgentMarketplace] Deactivate failed:', err);
      } finally {
        setActivatingId(null);
      }
    },
    [teamId, selectedTemplate]
  );

  const handleBuilderCreated = useCallback(
    (template: AgentMarketplaceTemplate) => {
      setTemplates((prev) => [template, ...prev]);
      setIsBuilderOpen(false);
    },
    []
  );

  if (!isOpen) return null;

  const { builtIns, teamCustom } = groupTemplates(templates);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-primary border border-border-default rounded-lg w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h2 className="text-sm font-semibold text-text-primary">Agent Marketplace</h2>
          <div className="flex items-center gap-2 flex-1 max-w-sm mx-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents…"
                className="w-full bg-bg-tertiary border border-border-default rounded pl-7 pr-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {teamId && (
              <button
                onClick={() => setIsBuilderOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/30 rounded text-xs font-medium hover:bg-coder1-cyan/20 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Create Custom
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div className="px-4 py-2 border-b border-border-default">
          <AgentCategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Template list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-xs text-text-muted">
                Loading templates…
              </div>
            ) : (
              <>
                {/* Built-in Specialists */}
                {builtIns.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Built-in Specialists
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {builtIns.map((t) => (
                        <AgentTemplateCard
                          key={t.id} template={t}
                          onActivate={handleActivate} onDeactivate={handleDeactivate}
                          onViewDetail={setSelectedTemplate}
                          isActivating={activatingId === t.id}
                          userRole={userRole}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Team Custom Agents */}
                {(teamCustom.length > 0 || teamId) && (
                  <section>
                    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Team Custom Agents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {teamCustom.map((t) => (
                        <AgentTemplateCard
                          key={t.id} template={t}
                          onActivate={handleActivate} onDeactivate={handleDeactivate}
                          onViewDetail={setSelectedTemplate}
                          isActivating={activatingId === t.id}
                          userRole={userRole}
                        />
                      ))}
                      {teamId && (
                        <button
                          onClick={() => setIsBuilderOpen(true)}
                          className="border border-dashed border-border-default rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-text-muted hover:border-coder1-cyan/40 hover:text-coder1-cyan transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="text-xs">Create Custom Agent</span>
                        </button>
                      )}
                    </div>
                  </section>
                )}

                {builtIns.length === 0 && teamCustom.length === 0 && !isLoading && (
                  <div className="flex items-center justify-center h-32 text-xs text-text-muted">
                    No agents match your search.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail / Builder panel */}
          {(selectedTemplate || isBuilderOpen) && (
            <div className="w-72 shrink-0 overflow-y-auto">
              {isBuilderOpen ? (
                <AgentBuilder
                  teamId={teamId ?? ''}
                  onCreated={handleBuilderCreated}
                  onCancel={() => setIsBuilderOpen(false)}
                />
              ) : (
                <AgentTemplateDetail
                  template={selectedTemplate}
                  onClose={() => setSelectedTemplate(null)}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  isActivating={activatingId === selectedTemplate?.id}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
