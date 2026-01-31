'use client';

import React from 'react';
import {
  Hammer,
  Search,
  Eye,
  Wrench,
  GitPullRequest,
  Sparkles,
  TrendingUp,
  Clock,
  ExternalLink,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Timer,
  User,
  Calendar,
  Bot,
  MessageSquare,
} from 'lucide-react';
import type { Johnny5Task, Johnny5TaskType, Johnny5TaskTrigger } from '@/types';

interface TaskCardProps {
  task: Johnny5Task;
  onSelect?: (task: Johnny5Task) => void;
  isSelected?: boolean;
}

/**
 * TaskCard - Individual task card for Mission Control Kanban board
 *
 * Displays task information with:
 * - Type icon and priority badge
 * - Task title and description
 * - Duration indicator
 * - Result links (PR, report, skill)
 * - Trigger source indicator
 */
export default function TaskCard({ task, onSelect, isSelected }: TaskCardProps) {
  const typeConfig = getTypeConfig(task.type);
  const priorityConfig = getPriorityConfig(task.priority);
  const triggerConfig = getTriggerConfig(task.triggeredBy);

  const formattedDuration = task.duration
    ? formatDuration(task.duration)
    : task.startedAt
      ? formatDuration(Date.now() - new Date(task.startedAt).getTime())
      : null;

  const handleClick = () => {
    onSelect?.(task);
  };

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer
        bg-bg-tertiary hover:bg-bg-float
        ${isSelected
          ? 'border-coder1-cyan shadow-[0_0_12px_rgba(0,217,255,0.3)]'
          : 'border-border-default hover:border-coder1-cyan/50 hover:shadow-[0_0_8px_rgba(0,217,255,0.15)]'
        }
      `}
    >
      {/* Header: Type Icon + Priority Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Type Icon */}
          <div
            className={`
              flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
              ${typeConfig.bgColor}
            `}
            title={typeConfig.label}
          >
            <typeConfig.icon className={`w-4 h-4 ${typeConfig.textColor}`} />
          </div>

          {/* Priority Badge */}
          <span
            className={`
              px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
              ${priorityConfig.bgColor} ${priorityConfig.textColor}
            `}
          >
            {task.priority}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex-shrink-0">
          {task.status === 'in_progress' && (
            <Loader2 className="w-4 h-4 text-coder1-cyan animate-spin" />
          )}
          {task.status === 'completed' && (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
          {task.status === 'failed' && (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          {task.status === 'review' && (
            <Eye className="w-4 h-4 text-yellow-400" />
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-text-primary mb-1 line-clamp-2 group-hover:text-coder1-cyan transition-colors">
        {task.title}
      </h4>

      {/* Description */}
      <p className="text-xs text-text-muted mb-2 line-clamp-2">
        {task.description}
      </p>

      {/* Meta Row: Duration + Trigger */}
      <div className="flex items-center justify-between text-[10px] text-text-muted mb-2">
        <div className="flex items-center gap-1">
          <triggerConfig.icon className="w-3 h-3" />
          <span>{triggerConfig.label}</span>
        </div>

        {formattedDuration && (
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            <span>{formattedDuration}</span>
          </div>
        )}
      </div>

      {/* Result Links (if any) */}
      {task.result && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border-default">
          {task.result.prUrl && (
            <button
              onClick={(e) => handleLinkClick(e, task.result!.prUrl!)}
              className="
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                bg-purple-500/20 text-purple-400 hover:bg-purple-500/30
                transition-colors
              "
            >
              <GitPullRequest className="w-3 h-3" />
              View PR
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}

          {task.result.reportPath && (
            <button
              onClick={(e) => handleLinkClick(e, task.result!.reportPath!)}
              className="
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                bg-blue-500/20 text-blue-400 hover:bg-blue-500/30
                transition-colors
              "
            >
              <FileText className="w-3 h-3" />
              Report
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}

          {task.result.skillName && (
            <span
              className="
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                bg-coder1-cyan/20 text-coder1-cyan
              "
            >
              <Sparkles className="w-3 h-3" />
              {task.result.skillName}
            </span>
          )}

          {task.result.error && (
            <span
              className="
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                bg-red-500/20 text-red-400
              "
              title={task.result.error}
            >
              <AlertTriangle className="w-3 h-3" />
              Error
            </span>
          )}
        </div>
      )}

      {/* Cyan glow line on hover */}
      <div
        className={`
          absolute bottom-0 left-2 right-2 h-0.5 rounded-full
          transition-opacity duration-200
          bg-gradient-to-r from-transparent via-coder1-cyan to-transparent
          ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
        `}
      />
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTypeConfig(type: Johnny5TaskType): {
  icon: typeof Hammer;
  label: string;
  bgColor: string;
  textColor: string;
} {
  switch (type) {
    case 'build':
      return {
        icon: Hammer,
        label: 'Build',
        bgColor: 'bg-orange-500/20',
        textColor: 'text-orange-400',
      };
    case 'research':
      return {
        icon: Search,
        label: 'Research',
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-400',
      };
    case 'monitor':
      return {
        icon: Eye,
        label: 'Monitor',
        bgColor: 'bg-purple-500/20',
        textColor: 'text-purple-400',
      };
    case 'fix':
      return {
        icon: Wrench,
        label: 'Fix',
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
      };
    case 'create_pr':
      return {
        icon: GitPullRequest,
        label: 'Create PR',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
      };
    case 'skill':
      return {
        icon: Sparkles,
        label: 'Skill',
        bgColor: 'bg-coder1-cyan/20',
        textColor: 'text-coder1-cyan',
      };
    case 'trend':
      return {
        icon: TrendingUp,
        label: 'Trend',
        bgColor: 'bg-pink-500/20',
        textColor: 'text-pink-400',
      };
    default:
      return {
        icon: Hammer,
        label: 'Task',
        bgColor: 'bg-gray-500/20',
        textColor: 'text-gray-400',
      };
  }
}

function getPriorityConfig(priority: Johnny5Task['priority']): {
  bgColor: string;
  textColor: string;
} {
  switch (priority) {
    case 'urgent':
      return {
        bgColor: 'bg-red-500/30',
        textColor: 'text-red-400',
      };
    case 'high':
      return {
        bgColor: 'bg-orange-500/30',
        textColor: 'text-orange-400',
      };
    case 'medium':
      return {
        bgColor: 'bg-yellow-500/30',
        textColor: 'text-yellow-400',
      };
    case 'low':
    default:
      return {
        bgColor: 'bg-gray-500/30',
        textColor: 'text-gray-400',
      };
  }
}

function getTriggerConfig(trigger: Johnny5TaskTrigger): {
  icon: typeof User;
  label: string;
} {
  switch (trigger) {
    case 'user':
      return { icon: User, label: 'User' };
    case 'schedule':
      return { icon: Calendar, label: 'Scheduled' };
    case 'trend':
      return { icon: TrendingUp, label: 'Trend' };
    case 'self_improvement':
      return { icon: Bot, label: 'Self-Improvement' };
    case 'conversation':
      return { icon: MessageSquare, label: 'Conversation' };
    default:
      return { icon: Bot, label: 'Auto' };
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
