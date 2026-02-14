'use client';

import React from 'react';
import {
  Zap,
  Clock,
  TrendingUp,
  Hand,
  CheckCircle,
  XCircle,
  MoreVertical,
  Play,
  Settings,
  Trash2,
  Code,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';
import type { Johnny5Skill } from '@/types/johnny5';

interface SkillCardProps {
  skill: Johnny5Skill;
  onToggle: (skillId: string) => void;
  onEdit: (skill: Johnny5Skill) => void;
  onDelete: (skillId: string) => void;
  onRun?: (skillId: string) => void;
}

/**
 * SkillCard - Display card for a Johnny5 skill
 *
 * Shows skill information including:
 * - Name and description
 * - Trigger type and category
 * - Success rate with color coding
 * - Origin badge (system, user, self_improvement)
 * - Enable/disable toggle
 * - Quick actions (run, edit, delete)
 */
export default function SkillCard({
  skill,
  onToggle,
  onEdit,
  onDelete,
  onRun,
}: SkillCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  // Get trigger icon and label
  const getTriggerInfo = () => {
    switch (skill.trigger) {
      case 'scheduled':
        return { icon: <Clock className="w-3.5 h-3.5" />, label: 'Scheduled' };
      case 'event':
        return { icon: <Zap className="w-3.5 h-3.5" />, label: 'Event' };
      case 'manual':
        return { icon: <Hand className="w-3.5 h-3.5" />, label: 'Manual' };
      case 'trend':
        return { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Trend' };
      default:
        return { icon: <Zap className="w-3.5 h-3.5" />, label: 'Unknown' };
    }
  };

  // Get origin badge styling
  const getOriginBadge = () => {
    switch (skill.createdBy) {
      case 'system':
        return {
          icon: <Bot className="w-3 h-3" />,
          label: 'System',
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/40',
        };
      case 'user':
        return {
          icon: <User className="w-3 h-3" />,
          label: 'User',
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/40',
        };
      case 'self_improvement':
        return {
          icon: <Sparkles className="w-3 h-3" />,
          label: 'Self-Learned',
          bg: 'bg-purple-500/20',
          text: 'text-purple-400',
          border: 'border-purple-500/40',
        };
      default:
        return {
          icon: <Bot className="w-3 h-3" />,
          label: 'Unknown',
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/40',
        };
    }
  };

  // Get success rate color
  const getSuccessRateColor = () => {
    if (skill.successRate >= 90) return 'text-green-400';
    if (skill.successRate >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get category icon
  const getCategoryIcon = () => {
    switch (skill.category) {
      case 'productivity':
        return '⚡';
      case 'research':
        return '🔍';
      case 'monitoring':
        return '📊';
      case 'communication':
        return '💬';
      case 'development':
        return '💻';
      default:
        return '📋';
    }
  };

  // Format last used time
  const formatLastUsed = (date?: Date) => {
    if (!date) return 'Never used';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const triggerInfo = getTriggerInfo();
  const originBadge = getOriginBadge();

  return (
    <div
      className={`
        relative p-4 rounded-lg border transition-all duration-200
        ${skill.enabled
          ? 'bg-bg-secondary border-border-default hover:border-coder1-cyan/40'
          : 'bg-bg-tertiary/50 border-border-default/50 opacity-60'
        }
      `}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Category Icon */}
          <span className="text-lg" title={skill.category}>
            {getCategoryIcon()}
          </span>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-text-primary truncate">
              {skill.name}
            </h4>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
              {skill.description}
            </p>
          </div>
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary
              hover:bg-bg-tertiary transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-36 py-1 bg-bg-secondary border border-border-default rounded-lg shadow-xl">
                {skill.trigger === 'manual' && onRun && (
                  <button
                    onClick={() => {
                      onRun(skill.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run Now
                  </button>
                )}
                <button
                  onClick={() => {
                    onEdit(skill);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onEdit(skill);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                >
                  <Code className="w-3.5 h-3.5" />
                  View Code
                </button>
                <hr className="my-1 border-border-default" />
                <button
                  onClick={() => {
                    onDelete(skill.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Row */}
      <div className="flex items-center gap-2 flex-wrap mt-3">
        {/* Origin Badge */}
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
            ${originBadge.bg} ${originBadge.text} border ${originBadge.border}
          `}
        >
          {originBadge.icon}
          {originBadge.label}
        </span>

        {/* Trigger Badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-secondary border border-border-default">
          {triggerInfo.icon}
          {triggerInfo.label}
        </span>

        {/* Success Rate */}
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
            bg-bg-tertiary border border-border-default
            ${getSuccessRateColor()}
          `}
        >
          {skill.successRate >= 70 ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {skill.usageCount > 0 ? `${skill.successRate}%` : 'New'}
        </span>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-default/50">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>Used {skill.usageCount} times</span>
          <span className="w-px h-3 bg-border-default" />
          <span>{formatLastUsed(skill.lastUsed)}</span>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => onToggle(skill.id)}
          className={`
            relative w-10 h-5 rounded-full transition-all duration-200
            ${skill.enabled
              ? 'bg-coder1-cyan/30 border border-coder1-cyan/50'
              : 'bg-bg-tertiary border border-border-default'
            }
          `}
          title={skill.enabled ? 'Disable skill' : 'Enable skill'}
        >
          <span
            className={`
              absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200
              ${skill.enabled
                ? 'left-5 bg-coder1-cyan'
                : 'left-0.5 bg-text-muted'
              }
            `}
          />
        </button>
      </div>

      {/* Self-learned insight */}
      {skill.createdBy === 'self_improvement' && (
        <div className="mt-3 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-md">
          <p className="text-[10px] text-purple-300 italic">
            &quot;Learned from your repeated workflow patterns&quot;
          </p>
        </div>
      )}
    </div>
  );
}
