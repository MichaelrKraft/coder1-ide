'use client';

import React, { useCallback, useMemo } from 'react';
import {
  Users, X, Sparkles, Check,
  Search, Pen, BarChart3, Target, Lightbulb, ClipboardList,
} from 'lucide-react';
import crewData from '@/data/crew-members.json';

// ============================================================================
// Types
// ============================================================================

interface CrewMember {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  promptPrefix: string;
  exampleTasks: string[];
}

interface CrewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (crewMemberId: string) => void;
  activeCrewMember?: string;
  crewStatus: Record<string, 'idle' | 'working' | 'completed'>;
}

// ============================================================================
// Constants
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Pen,
  BarChart3,
  Target,
  Lightbulb,
  ClipboardList,
};

const CATEGORY_STYLES: Record<string, string> = {
  intelligence: 'bg-blue-500/15 text-blue-400',
  content: 'bg-purple-500/15 text-purple-400',
  insights: 'bg-yellow-500/15 text-yellow-400',
  planning: 'bg-green-500/15 text-green-400',
  ideation: 'bg-pink-500/15 text-pink-400',
  operations: 'bg-orange-500/15 text-orange-400',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  idle: { bg: 'bg-text-muted/20', text: 'text-text-muted', label: 'Idle' },
  working: { bg: 'bg-coder1-cyan/20', text: 'text-coder1-cyan', label: 'Working' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
};

// ============================================================================
// Component
// ============================================================================

export default function CrewPanel({
  isOpen,
  onClose,
  onActivate,
  activeCrewMember,
  crewStatus,
}: CrewPanelProps) {
  const crewMembers = useMemo(
    () => (crewData as { crewMembers: CrewMember[] }).crewMembers,
    []
  );

  const handleActivate = useCallback(
    (member: CrewMember) => {
      onActivate(member.id);
    },
    [onActivate]
  );

  // Task counts — placeholder until real task tracking is wired up
  const getTaskCount = useCallback((_memberId: string): number => {
    return 0;
  }, []);

  if (!isOpen) return null;

  const activeMember = crewMembers.find(m => m.id === activeCrewMember) || null;

  return (
    <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-coder1-cyan" />
          <div>
            <span className="text-sm font-semibold text-text-primary">
              Johnny5 Crew
            </span>
            <p className="text-[10px] text-text-muted">
              Your AI crew for business and creative tasks
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

      {/* Active Crew Member Indicator */}
      {activeMember && (
        <div className="mx-4 mt-2 px-3 py-2 bg-coder1-cyan/10 border border-coder1-cyan/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-coder1-cyan" />
            <span className="text-xs text-coder1-cyan font-medium">
              Active: {activeMember.name}
            </span>
          </div>
          <span className="text-[10px] text-text-muted">
            {crewStatus[activeMember.id] === 'working' ? 'Processing...' : 'Ready'}
          </span>
        </div>
      )}

      {/* Crew Member Cards */}
      <div className="flex-1 overflow-auto px-4 py-3 pb-4">
        <div className="grid grid-cols-1 gap-2">
          {crewMembers.map(member => {
            const Icon = ICON_MAP[member.icon] || Users;
            const isActive = activeCrewMember === member.id;
            const status = crewStatus[member.id] || 'idle';
            const statusStyle = STATUS_STYLES[status];
            const taskCount = getTaskCount(member.id);

            return (
              <div
                key={member.id}
                className={`p-3 bg-bg-secondary/60 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'border-coder1-cyan/50 bg-coder1-cyan/5'
                    : 'border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-coder1-cyan/20' : 'bg-coder1-cyan/10'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-coder1-cyan' : 'text-coder1-cyan/70'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-semibold text-text-primary">
                        {member.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          CATEGORY_STYLES[member.category] || ''
                        }`}
                      >
                        {member.category}
                      </span>
                      {/* Status Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted line-clamp-2">
                      {member.description}
                    </p>
                  </div>
                </div>

                {/* Example Tasks Preview */}
                <div className="mb-2">
                  <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1">
                    Example Tasks
                  </p>
                  <ul className="space-y-1">
                    {member.exampleTasks.slice(0, 2).map((task, idx) => (
                      <li
                        key={idx}
                        className="text-[10px] text-text-secondary pl-2 border-l-2 border-border-default leading-relaxed line-clamp-1"
                      >
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleActivate(member)}
                    disabled={status === 'working'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                      status === 'working'
                        ? 'bg-coder1-cyan/10 text-coder1-cyan/50 cursor-not-allowed'
                        : isActive
                          ? 'bg-coder1-cyan/30 text-coder1-cyan'
                          : 'bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30'
                    }`}
                  >
                    {status === 'working' ? (
                      <>
                        <span className="w-3 h-3 border-2 border-coder1-cyan/50 border-t-coder1-cyan rounded-full animate-spin" />
                        Working...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        {isActive ? 'Re-activate' : 'Activate'}
                      </>
                    )}
                  </button>

                  {/* Task Count / Memory Indicator */}
                  <div className="flex items-center gap-1 text-[10px] text-text-muted">
                    {taskCount > 0 && (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span>{taskCount} task{taskCount !== 1 ? 's' : ''} completed</span>
                      </>
                    )}
                    {taskCount === 0 && status === 'idle' && (
                      <span>No tasks yet</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
