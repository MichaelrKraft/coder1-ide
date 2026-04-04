'use client';

import { useState } from 'react';
import { FileText, FolderOpen, Settings, DollarSign, Bell } from 'lucide-react';
import OwnerProfileEditor from '@/components/agent-hub/settings/OwnerProfileEditor';
import ProjectContextEditor from '@/components/agent-hub/settings/ProjectContextEditor';
import AgentDefaultsEditor from '@/components/agent-hub/settings/AgentDefaultsEditor';
import BudgetSettings from '@/components/agent-hub/settings/BudgetSettings';
import NotificationSettings from '@/components/agent-hub/settings/NotificationSettings';

const TABS = [
  { id: 'owner-profile', label: 'Owner Profile', icon: FileText },
  { id: 'project-context', label: 'Project Context', icon: FolderOpen },
  { id: 'agent-defaults', label: 'Agent Defaults', icon: Settings },
  { id: 'budget', label: 'Budget Controls', icon: DollarSign },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('owner-profile');

  return (
    <div className="p-6 h-full">
      <h1 className="text-lg font-semibold text-text-primary mb-1">Settings</h1>
      <p className="text-xs text-text-muted mb-6">
        Configure global context, defaults, budgets, and notifications for your agents.
      </p>

      <div className="flex gap-6 h-[calc(100%-4rem)]">
        {/* Left sidebar tabs */}
        <nav className="w-[180px] flex-shrink-0 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-coder1-cyan/10 text-coder1-cyan'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right content area */}
        <div className="flex-1 max-w-2xl overflow-y-auto">
          {activeTab === 'owner-profile' && <OwnerProfileEditor />}
          {activeTab === 'project-context' && <ProjectContextEditor />}
          {activeTab === 'agent-defaults' && <AgentDefaultsEditor />}
          {activeTab === 'budget' && <BudgetSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
}
