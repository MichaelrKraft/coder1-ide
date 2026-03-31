'use client';

import React from 'react';
import {
  MessageCircle,
  Activity,
  Shield,
} from 'lucide-react';
import { Johnny5Tab } from '@/types/johnny5';

interface Johnny5TabBarProps {
  activeTab: Johnny5Tab;
  onTabChange: (tab: Johnny5Tab) => void;
  securityScore?: number;
  hasAlerts?: boolean;
}

const tabs: { id: Johnny5Tab; label: string; icon: React.ReactNode; title: string }[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    title: 'Chat with Johnny5 - Talk to your AI assistant'
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: <Activity className="w-3.5 h-3.5" />,
    title: 'Activity - What did Johnny5 do?'
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield className="w-3.5 h-3.5" />,
    title: 'Security Monitor - Am I protected?'
  },
];

export default function Johnny5TabBar({
  activeTab,
  onTabChange,
  securityScore,
  hasAlerts,
}: Johnny5TabBarProps) {
  return (
    <div className="flex border-b border-border-default bg-bg-secondary/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`
            relative flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider
            transition-all flex items-center justify-center gap-2
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
            {tab.id === 'security' && hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
