'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import type { Johnny5Skill } from '@/types/johnny5';
import SkillCard from './SkillCard';
import SkillCreator from './SkillCreator';

type FilterCategory = 'all' | 'productivity' | 'research' | 'monitoring' | 'communication' | 'development';
type FilterOrigin = 'all' | 'system' | 'user' | 'self_improvement';
type FilterTrigger = 'all' | 'scheduled' | 'event' | 'manual' | 'trend';

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
 */
export default function SkillsManager({
  skills = MOCK_SKILLS,
  onToggleSkill,
  onEditSkill,
  onDeleteSkill,
  onRunSkill,
  onCreateSkill,
}: SkillsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [originFilter, setOriginFilter] = useState<FilterOrigin>('all');
  const [triggerFilter, setTriggerFilter] = useState<FilterTrigger>('all');
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search skills
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
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
        // Skills don't have category in type, so we'll infer from name/description
        // In real implementation, add category to skill type
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

      // Enabled filter
      if (showEnabledOnly && !skill.enabled) {
        return false;
      }

      return true;
    });
  }, [skills, searchQuery, categoryFilter, originFilter, triggerFilter, showEnabledOnly]);

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
    total: skills.length,
    enabled: skills.filter((s) => s.enabled).length,
    system: skills.filter((s) => s.createdBy === 'system').length,
    user: skills.filter((s) => s.createdBy === 'user').length,
    selfLearned: skills.filter((s) => s.createdBy === 'self_improvement').length,
  }), [skills]);

  const handleToggle = (skillId: string) => {
    onToggleSkill?.(skillId);
  };

  const handleEdit = (skill: Johnny5Skill) => {
    onEditSkill?.(skill);
  };

  const handleDelete = (skillId: string) => {
    onDeleteSkill?.(skillId);
  };

  const handleRun = (skillId: string) => {
    onRunSkill?.(skillId);
  };

  const handleCreate = (skill: Omit<Johnny5Skill, 'id' | 'createdAt' | 'usageCount' | 'successRate'>) => {
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
        <button
          onClick={() => setShowCreator(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/40 rounded-lg text-xs font-semibold hover:bg-coder1-cyan/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Skill
        </button>
      </div>

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
        {filteredSkills.length === 0 ? (
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

      {/* Skill Creator Modal */}
      {showCreator && (
        <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm overflow-auto">
          <SkillCreator
            onCancel={() => setShowCreator(false)}
            onCreate={handleCreate}
          />
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

// ================================================================================
// Mock Data
// ================================================================================

const MOCK_SKILLS: Johnny5Skill[] = [
  {
    id: 'skill_001',
    name: 'Daily Analytics Report',
    description: 'Generates a daily report of token usage, session stats, and efficiency metrics.',
    trigger: 'scheduled',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
    usageCount: 47,
    successRate: 98,
    dependencies: ['analytics-service'],
    enabled: true,
  },
  {
    id: 'skill_002',
    name: 'Morning Brief Generator',
    description: 'Compiles overnight activity into a morning summary with actionable items.',
    trigger: 'scheduled',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 8 * 60 * 60 * 1000),
    usageCount: 28,
    successRate: 100,
    dependencies: ['morning-brief-service', 'activity-tracker'],
    enabled: true,
  },
  {
    id: 'skill_003',
    name: 'Security Audit',
    description: 'Scans for potential security issues and prompt injection attempts.',
    trigger: 'event',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 30 * 60 * 1000),
    usageCount: 156,
    successRate: 99,
    dependencies: ['security-service'],
    enabled: true,
  },
  {
    id: 'skill_004',
    name: 'PR Auto-Review',
    description: 'Automatically reviews Johnny5-generated PRs for code quality and security.',
    trigger: 'event',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000),
    usageCount: 12,
    successRate: 92,
    dependencies: ['github-service', 'code-review-service'],
    enabled: true,
  },
  {
    id: 'skill_005',
    name: 'Context Cleanup',
    description: 'Removes stale files from context to optimize token usage.',
    trigger: 'scheduled',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 60 * 60 * 1000),
    usageCount: 89,
    successRate: 100,
    dependencies: ['context-service'],
    enabled: true,
  },
  {
    id: 'skill_006',
    name: 'Content Repurposer',
    description: 'Repurposes content from YouTube videos to newsletter format and X threads.',
    trigger: 'manual',
    createdBy: 'self_improvement',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    usageCount: 12,
    successRate: 87,
    dependencies: ['youtube-api', 'content-generator'],
    enabled: true,
  },
  {
    id: 'skill_007',
    name: 'Competitor Video Monitor',
    description: 'Monitors competitor YouTube channels for outlier videos and trend opportunities.',
    trigger: 'scheduled',
    createdBy: 'self_improvement',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 12 * 60 * 60 * 1000),
    usageCount: 8,
    successRate: 94,
    dependencies: ['youtube-api', 'trend-analyzer'],
    enabled: true,
  },
  {
    id: 'skill_008',
    name: 'API Update Alerter',
    description: 'Monitors APIs you use for updates and breaking changes.',
    trigger: 'trend',
    createdBy: 'self_improvement',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
    usageCount: 5,
    successRate: 100,
    dependencies: ['github-api', 'changelog-parser'],
    enabled: false,
  },
  {
    id: 'skill_009',
    name: 'Quick Deploy Script',
    description: 'Custom deployment script for staging environment.',
    trigger: 'manual',
    createdBy: 'user',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    usageCount: 24,
    successRate: 96,
    dependencies: ['vercel-api'],
    enabled: true,
  },
  {
    id: 'skill_010',
    name: 'Database Backup',
    description: 'Creates a backup of the database before major operations.',
    trigger: 'event',
    createdBy: 'user',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    usageCount: 15,
    successRate: 100,
    dependencies: ['database-service'],
    enabled: true,
  },
];

export { MOCK_SKILLS };
