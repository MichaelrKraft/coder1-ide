'use client';

import React from 'react';
import {
  MessageCircle,
  History,
  Brain,
  BarChart3,
  Database,
  Shield,
  Target,
  Sun,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Johnny5Tab } from '@/types/johnny5';

interface Johnny5TabBarProps {
  activeTab: Johnny5Tab;
  onTabChange: (tab: Johnny5Tab) => void;
  securityScore?: number;
  hasAlerts?: boolean;
  hasBriefNotification?: boolean;
}

const tabs: { id: Johnny5Tab; label: string; icon: React.ReactNode; title: string }[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    title: 'Chat with Johnny5 - Talk to your AI assistant'
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: <History className="w-3.5 h-3.5" />,
    title: 'Session Intelligence - What did your AI do?'
  },
  {
    id: 'reasoning',
    label: 'Replay',
    icon: <Brain className="w-3.5 h-3.5" />,
    title: 'Reasoning Replay - Why did it make that decision?'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    title: 'Usage Analytics - Token usage and efficiency metrics'
  },
  {
    id: 'context',
    label: 'Context',
    icon: <Database className="w-3.5 h-3.5" />,
    title: 'Context Visualizer - What does AI remember?'
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield className="w-3.5 h-3.5" />,
    title: 'Security Monitor - Am I protected?'
  },
  {
    id: 'mission-control',
    label: 'Mission',
    icon: <Target className="w-3.5 h-3.5" />,
    title: 'Mission Control - Track all Johnny5 tasks'
  },
  {
    id: 'morning-brief',
    label: 'Brief',
    icon: <Sun className="w-3.5 h-3.5" />,
    title: 'Morning Brief - Daily summary of overnight work'
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    title: 'Skills Manager - Manage and install Johnny5 skills'
  },
];

export default function Johnny5TabBar({
  activeTab,
  onTabChange,
  securityScore,
  hasAlerts,
  hasBriefNotification,
}: Johnny5TabBarProps) {
  return (
    <div className="flex flex-wrap border-b border-border-default bg-bg-secondary/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`
            relative flex-1 min-w-0 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider
            transition-all flex flex-col items-center justify-center gap-1
            ${activeTab === tab.id
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
            }
          `}
          onClick={() => onTabChange(tab.id)}
          title={tab.title}
        >
          <span className="relative">
            {tab.icon}
            {/* Security score badge */}
            {tab.id === 'security' && securityScore !== undefined && (
              <span
                className={`
                  absolute -top-1 -right-2 text-[8px] font-bold px-1 rounded-full
                  ${securityScore >= 80 ? 'bg-green-500/20 text-green-400' :
                    securityScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'}
                `}
              >
                {securityScore}
              </span>
            )}
            {/* Alert indicator */}
            {tab.id === 'security' && hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            {/* Brief notification indicator */}
            {tab.id === 'morning-brief' && hasBriefNotification && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-coder1-cyan rounded-full animate-pulse" />
            )}
          </span>
          <span className="truncate w-full text-center">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
