'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Brain,
  Search,
  Filter,
  Plus,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Settings,
  Zap,
  Clock,
  Hand,
  TrendingUp,
  Store,
  Loader2,
  X,
  Globe,
  HardDrive,
  CheckCircle,
  Play,
  AlertTriangle,
  History,
} from 'lucide-react';
import type { Johnny5Skill } from '@/types/johnny5';
import SkillCard from './SkillCard';
import SkillCreator from './SkillCreator';
import SkillStoreBrowser from './SkillStoreBrowser';

type FilterCategory = 'all' | 'productivity' | 'research' | 'monitoring' | 'communication' | 'development';
type FilterOrigin = 'all' | 'system' | 'user' | 'self_improvement';
type FilterTrigger = 'all' | 'scheduled' | 'event' | 'manual' | 'trend';
type FilterSource = 'all' | 'local' | 'clawhub';

interface SkillsManagerProps {
  skills?: Johnny5Skill[];
  onToggleSkill?: (skillId: string) => void;
  onEditSkill?: (skill: Johnny5Skill) => void;
  onDeleteSkill?: (skillId: string) => void;
  onRunSkill?: (skillId: string) => void;
  onCreateSkill?: (skill: Omit<Johnny5Skill, 'id' | 'createdAt' | 'usageCount' | 'successRate'>) => void;
}

/**
 * SkillsManager - Main UI for managing Johnny5 skills
 *
 * Features:
 * - View all skills with filtering and search
 * - Enable/disable skills
 * - Create new skills
 * - Edit and delete existing skills
 * - Group skills by origin (system, user, self-learned)
 * - Browse and install skills from the Skills Store
 */
export default function SkillsManager({
  skills,
  onToggleSkill,
  onEditSkill,
  onDeleteSkill,
  onRunSkill,
  onCreateSkill,
}: SkillsManagerProps) {
  const [activeTab, setActiveTab] = useState<'my-skills' | 'store'>('my-skills');
  const [loadedSkills, setLoadedSkills] = useState<Johnny5Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [originFilter, setOriginFilter] = useState<FilterOrigin>('all');
  const [triggerFilter, setTriggerFilter] = useState<FilterTrigger>('all');
  const [sourceFilter, setSourceFilter] = useState<FilterSource>('all');
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Johnny5Skill | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Use prop if provided, otherwise use loaded data
  const activeSkills = skills || loadedSkills;

  // Fetch skills from API
  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/johnny5/skills');
      if (res.ok) {
        const json = await res.json();
        setLoadedSkills(json.data || []);
      }
    } catch (err) {
      console.error('[Skills] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSkills();
    setRefreshing(false);
  };

  // Filter and search skills
  const filteredSkills = useMemo(() => {
    return activeSkills.filter((skill) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const skillCategory = inferCategory(skill);
        if (skillCategory !== categoryFilter) return false;
      }

      // Origin filter
      if (originFilter !== 'all' && skill.createdBy !== originFilter) {
        return false;
      }

      // Trigger filter
      if (triggerFilter !== 'all' && skill.trigger !== triggerFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all') {
        const skillSource = skill.source || 'local';
        if (skillSource !== sourceFilter) return false;
      }

      // Enabled filter
      if (showEnabledOnly && !skill.enabled) {
        return false;
      }

      return true;
    });
  }, [activeSkills, searchQuery, categoryFilter, originFilter, triggerFilter, sourceFilter, showEnabledOnly]);

  // Group skills by origin
  const groupedSkills = useMemo(() => {
    const groups: Record<string, Johnny5Skill[]> = {
      system: [],
      user: [],
      self_improvement: [],
    };

    filteredSkills.forEach((skill) => {
      groups[skill.createdBy].push(skill);
    });

    return groups;
  }, [filteredSkills]);

  // Stats
  const stats = useMemo(() => ({
    total: activeSkills.length,
    enabled: activeSkills.filter((s) => s.enabled).length,
    system: activeSkills.filter((s) => s.createdBy === 'system').length,
    user: activeSkills.filter((s) => s.createdBy === 'user').length,
    selfLearned: activeSkills.filter((s) => s.createdBy === 'self_improvement').length,
  }), [activeSkills]);

  const handleToggle = async (skillId: string) => {
    const skill = activeSkills.find((s) => s.id === skillId);
    if (!skill) return;

    try {
      const res = await fetch(`/api/johnny5/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !skill.enabled }),
      });
      if (res.ok) {
        await fetchSkills();
      }
    } catch (err) {
      console.error('[Skills] Failed to toggle:', err);
    }

    onToggleSkill?.(skillId);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (skill: Johnny5Skill) => {
    setSelectedSkill(skill);
    onEditSkill?.(skill);
  };

  const handleDelete = async (skillId: string) => {
    const skill = activeSkills.find((s) => s.id === skillId);
    const name = skill?.name || skillId;
    if (!confirm(`Delete skill "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/johnny5/skills/${skillId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Deleted "${name}"`, 'success');
        await fetchSkills();
      } else {
        const json = await res.json().catch(() => null);
        showToast(json?.error || 'Failed to delete skill', 'error');
      }
    } catch (err) {
      console.error('[Skills] Failed to delete:', err);
      showToast('Failed to delete skill', 'error');
    }

    onDeleteSkill?.(skillId);
  };

  const handleRun = async (skillId: string) => {
    const skill = activeSkills.find((s) => s.id === skillId);
    showToast(`Triggered "${skill?.name || skillId}"`, 'success');
    onRunSkill?.(skillId);
  };

  const handleCreate = async (skill: Omit<Johnny5Skill, 'id' | 'createdAt' | 'usageCount' | 'successRate'>) => {
    try {
      const res = await fetch('/api/johnny5/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skill),
      });
      if (res.ok) {
        await fetchSkills();
      }
    } catch (err) {
      console.error('[Skills] Failed to create:', err);
    }

    onCreateSkill?.(skill);
    setShowCreator(false);
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent)',
            top: '-60px',
            right: '-60px',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent)',
            bottom: '100px',
            left: '-40px',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default relative z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-text-primary">Skills Manager</h3>
          <span className="text-xs text-text-muted">
            {stats.enabled}/{stats.total} enabled
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-all disabled:opacity-50"
            title="Refresh skills"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/40 rounded-lg text-xs font-semibold hover:bg-coder1-cyan/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Skill
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-border-default relative z-10">
        <button
          onClick={() => setActiveTab('my-skills')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all
            ${activeTab === 'my-skills'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-coder1-cyan/5'
              : 'text-text-muted hover:text-text-secondary'
            }
          `}
        >
          <Brain className="w-3.5 h-3.5" />
          My Skills
        </button>
        <button
          onClick={() => setActiveTab('store')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all
            ${activeTab === 'store'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-coder1-cyan/5'
              : 'text-text-muted hover:text-text-secondary'
            }
          `}
        >
          <Store className="w-3.5 h-3.5" />
          Skills Store
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'store' ? (
        <SkillStoreBrowser onInstalled={fetchSkills} />
      ) : (
        <>
          {/* Search and Filter Bar */}
          <div className="px-4 py-3 border-b border-border-default space-y-2 relative z-10">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-coder1-cyan focus:outline-none"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Options */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 pt-2">
                {/* Origin Filter */}
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value as FilterOrigin)}
                  className="px-2 py-1 bg-bg-secondary border border-border-default rounded text-xs text-text-primary focus:border-coder1-cyan focus:outline-none"
                >
                  <option value="all">All Origins</option>
                  <option value="system">System</option>
                  <option value="user">User Created</option>
                  <option value="self_improvement">Self-Learned</option>
                </select>

                {/* Trigger Filter */}
                <select
                  value={triggerFilter}
                  onChange={(e) => setTriggerFilter(e.target.value as FilterTrigger)}
                  className="px-2 py-1 bg-bg-secondary border border-border-default rounded text-xs text-text-primary focus:border-coder1-cyan focus:outline-none"
                >
                  <option value="all">All Triggers</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="event">Event</option>
                  <option value="manual">Manual</option>
                  <option value="trend">Trend</option>
                </select>

                {/* Source Filter */}
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as FilterSource)}
                  className="px-2 py-1 bg-bg-secondary border border-border-default rounded text-xs text-text-primary focus:border-coder1-cyan focus:outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="local">Built-in</option>
                  <option value="clawhub">Community</option>
                </select>

                {/* Enabled Only */}
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEnabledOnly}
                    onChange={(e) => setShowEnabledOnly(e.target.checked)}
                    className="rounded border-border-default bg-bg-secondary text-coder1-cyan focus:ring-coder1-cyan"
                  />
                  Enabled only
                </label>
              </div>
            )}
          </div>

          {/* Skills List */}
          <div className="flex-1 overflow-auto p-4 space-y-6 relative z-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-coder1-cyan animate-spin mb-3" />
                <p className="text-sm text-text-muted">Loading skills...</p>
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-50" />
                <p className="text-sm text-text-secondary">No skills found</p>
                <p className="text-xs text-text-muted mt-1">
                  {searchQuery ? 'Try a different search term' : 'Create your first skill to get started'}
                </p>
              </div>
            ) : (
              <>
                {/* System Skills */}
                {groupedSkills.system.length > 0 && (
                  <SkillGroup
                    title="System Skills"
                    icon={<Bot className="w-4 h-4 text-blue-400" />}
                    count={groupedSkills.system.length}
                    skills={groupedSkills.system}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRun={handleRun}
                  />
                )}

                {/* User Skills */}
                {groupedSkills.user.length > 0 && (
                  <SkillGroup
                    title="User Created"
                    icon={<User className="w-4 h-4 text-green-400" />}
                    count={groupedSkills.user.length}
                    skills={groupedSkills.user}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRun={handleRun}
                  />
                )}

                {/* Self-Learned Skills */}
                {groupedSkills.self_improvement.length > 0 && (
                  <SkillGroup
                    title="Self-Learned"
                    icon={<Sparkles className="w-4 h-4 text-purple-400" />}
                    count={groupedSkills.self_improvement.length}
                    description="Learned from your conversations and patterns"
                    skills={groupedSkills.self_improvement}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRun={handleRun}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Skill Creator Modal */}
      {showCreator && (
        <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm overflow-auto">
          <SkillCreator
            onCancel={() => setShowCreator(false)}
            onCreate={handleCreate}
          />
        </div>
      )}

      {/* Skill Detail Panel */}
      {selectedSkill && (
        <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm overflow-auto">
          <div className="max-w-lg mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-text-primary">Skill Details</h3>
              <button
                onClick={() => setSelectedSkill(null)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Name</label>
                <p className="text-sm text-text-primary mt-1">{selectedSkill.name}</p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Description</label>
                <p className="text-sm text-text-secondary mt-1">{selectedSkill.description || 'No description'}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Source</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    {selectedSkill.source === 'clawhub' ? (
                      <><Globe className="w-3.5 h-3.5 text-orange-400" /><span className="text-sm text-orange-400">Community</span></>
                    ) : (
                      <><HardDrive className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm text-gray-400">Built-in</span></>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Trigger</label>
                  <p className="text-sm text-text-secondary mt-1 capitalize">{selectedSkill.trigger}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Status</label>
                  <p className={`text-sm mt-1 ${selectedSkill.enabled ? 'text-green-400' : 'text-text-muted'}`}>
                    {selectedSkill.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Usage</label>
                  <p className="text-sm text-text-secondary mt-1">{selectedSkill.usageCount} runs</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Success Rate</label>
                  <p className="text-sm text-text-secondary mt-1">{selectedSkill.successRate}%</p>
                </div>
                {selectedSkill.clawhubSlug && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Slug</label>
                    <p className="text-sm text-text-secondary mt-1">{selectedSkill.clawhubSlug}</p>
                  </div>
                )}
              </div>
              {selectedSkill.securityScore && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Security</label>
                  <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedSkill.securityScore === 'safe' ? 'bg-green-500/20 text-green-400' :
                    selectedSkill.securityScore === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedSkill.securityScore === 'safe' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {selectedSkill.securityScore}
                  </span>
                </div>
              )}

              {/* Version History (Gap 2) */}
              <SkillVersionHistory skillId={selectedSkill.id} />

              <div className="flex gap-2 pt-4 border-t border-border-default">
                {selectedSkill.trigger === 'manual' && (
                  <button
                    onClick={() => { handleRun(selectedSkill.id); setSelectedSkill(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/40 rounded-lg text-xs font-semibold hover:bg-coder1-cyan/30 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run
                  </button>
                )}
                <button
                  onClick={() => { handleToggle(selectedSkill.id); setSelectedSkill(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary text-text-secondary border border-border-default rounded-lg text-xs font-semibold hover:text-text-primary transition-all"
                >
                  {selectedSkill.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => { const id = selectedSkill.id; setSelectedSkill(null); handleDelete(id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-all ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-xs font-medium shadow-lg border transition-all ${
          toast.type === 'success' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
          toast.type === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
          'bg-coder1-cyan/20 text-coder1-cyan border-coder1-cyan/40'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ================================================================================
// Skill Version History (Gap 2)
// ================================================================================

function SkillVersionHistory({ skillId }: { skillId: string }) {
  const [versions, setVersions] = useState<Array<{
    id: string;
    version: number;
    changeSummary?: string;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await fetch(`/api/johnny5/skills/${skillId}/versions`);
        if (res.ok) {
          const json = await res.json();
          setVersions(json.data || []);
        }
      } catch {
        // Silent failure
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [skillId]);

  if (loading || versions.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary w-full"
      >
        <History className="w-3.5 h-3.5" />
        <span className="font-semibold">Version History</span>
        <span className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px] text-text-muted">
          {versions.length}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-2 px-2 py-1.5 bg-bg-tertiary/50 rounded text-[11px]">
              <span className="text-coder1-cyan font-mono font-semibold">v{v.version}</span>
              <span className="text-text-muted truncate flex-1">
                {v.changeSummary || 'No description'}
              </span>
              <span className="text-text-muted text-[10px] flex-shrink-0">
                {new Date(v.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================================
// Helper Components
// ================================================================================

interface SkillGroupProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  description?: string;
  skills: Johnny5Skill[];
  onToggle: (skillId: string) => void;
  onEdit: (skill: Johnny5Skill) => void;
  onDelete: (skillId: string) => void;
  onRun?: (skillId: string) => void;
}

function SkillGroup({
  title,
  icon,
  count,
  description,
  skills,
  onToggle,
  onEdit,
  onDelete,
  onRun,
}: SkillGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            {title}
          </span>
          <span className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px] text-text-muted font-medium">
            {count}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-muted group-hover:text-text-secondary transition-all ${
            collapsed ? '-rotate-90' : ''
          }`}
        />
      </button>

      {description && !collapsed && (
        <p className="text-xs text-text-muted italic pl-6">{description}</p>
      )}

      {!collapsed && (
        <div className="space-y-2 pl-2">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onRun={onRun}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================================
// Helper Functions
// ================================================================================

function inferCategory(skill: Johnny5Skill): FilterCategory {
  const name = skill.name.toLowerCase();
  const desc = skill.description.toLowerCase();

  if (name.includes('research') || desc.includes('research')) return 'research';
  if (name.includes('monitor') || desc.includes('monitor')) return 'monitoring';
  if (name.includes('slack') || name.includes('email') || desc.includes('notify')) return 'communication';
  if (name.includes('code') || name.includes('build') || desc.includes('development')) return 'development';
  return 'productivity';
}
