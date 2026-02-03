'use client';

import React from 'react';
import { useMissionControlStore } from '@/stores/useMissionControlStore';
import { MCModuleId } from '@/types/mission-control';

interface NavItem {
  id: MCModuleId;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'agents', label: 'Agent Dashboard' },
  // { id: 'browser', label: 'Browser Tests' },  // HIDDEN - incomplete feature, restore post-alpha
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'feedback', label: 'Feedback' },
];

/**
 * Mission Control Navigation Sidebar Component
 * Left navigation panel with module selection
 */
export default function MCNavigationSidebar() {
  const { activeModule, setActiveModule } = useMissionControlStore();

  return (
    <div className="h-full bg-bg-secondary border-r border-border-default p-4">
      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 text-left
                ${isActive
                  ? 'bg-coder1-cyan/10 border border-coder1-cyan text-coder1-cyan shadow-glow-cyan'
                  : 'bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary hover:border-coder1-cyan/30'
                }
              `}
              data-testid={`mc-nav-${item.id}`}
            >
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
