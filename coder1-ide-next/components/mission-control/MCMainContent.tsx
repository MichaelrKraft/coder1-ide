'use client';

import React from 'react';
import { useMissionControlStore } from '@/stores/useMissionControlStore';
import BrowserTestPanel from './browser/BrowserTestPanel';
import ArtifactsInbox from './artifacts/ArtifactsInbox';
import AgentDashboardPanel from './agents/AgentDashboardPanel';

/**
 * Mission Control Main Content Component
 * Center panel that renders different content based on active module
 */
export default function MCMainContent() {
  const { activeModule } = useMissionControlStore();

  // Render content based on active module
  const renderContent = () => {
    switch (activeModule) {
      case 'browser':
        return <BrowserTestPanel />;

      case 'artifacts':
        return <ArtifactsInbox />;

      case 'agents':
        return <AgentDashboardPanel />;

      case 'feedback':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-coder1-cyan mb-4 flex items-center gap-2">
              <span>💬</span> Feedback
            </h2>
            <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
              <p className="text-text-secondary">
                User feedback and bug reporting interface will appear here.
              </p>
              <p className="text-text-muted mt-2 text-sm">
                Phase 2: Feedback form, issue tracking, feature requests
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <p className="text-text-muted">Select a module from the sidebar</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full bg-bg-primary overflow-y-auto" data-testid="mc-main-content">
      {renderContent()}
    </div>
  );
}
