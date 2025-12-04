'use client';

import React, { useState } from 'react';

type PanelView = 'default' | 'reports' | 'settings' | 'docs';

/**
 * Mission Control Details Panel Component
 * Right panel for contextual details and information
 */
export default function MCDetailsPanel() {
  const [activeView, setActiveView] = useState<PanelView>('default');

  // Reports view content
  const reportsContent = (
    <div className="space-y-4">
      <button
        onClick={() => setActiveView('default')}
        className="text-coder1-cyan hover:underline text-sm flex items-center gap-1"
        data-testid="details-back-btn"
      >
        ← Back
      </button>
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        📊 Reports
      </h3>
      <div className="space-y-3">
        <div className="p-3 bg-bg-primary border border-border-default rounded">
          <div className="text-sm font-medium text-text-primary">Test Summary</div>
          <div className="text-xs text-text-muted mt-1">Last run: Today</div>
        </div>
        <div className="p-3 bg-bg-primary border border-border-default rounded">
          <div className="text-sm font-medium text-text-primary">Coverage Report</div>
          <div className="text-xs text-text-muted mt-1">85% coverage</div>
        </div>
        <div className="p-3 bg-bg-primary border border-border-default rounded">
          <div className="text-sm font-medium text-text-primary">Performance Metrics</div>
          <div className="text-xs text-text-muted mt-1">Avg: 1.2s response</div>
        </div>
      </div>
    </div>
  );

  // Settings view content
  const settingsContent = (
    <div className="space-y-4">
      <button
        onClick={() => setActiveView('default')}
        className="text-coder1-cyan hover:underline text-sm flex items-center gap-1"
        data-testid="details-back-btn"
      >
        ← Back
      </button>
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        ⚙️ Settings
      </h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-text-secondary">Browser Type</label>
          <select className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary text-sm">
            <option>Chromium</option>
            <option>Firefox</option>
            <option>WebKit</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-text-secondary">Timeout (ms)</label>
          <input
            type="number"
            defaultValue={30000}
            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="headless" className="rounded" defaultChecked />
          <label htmlFor="headless" className="text-sm text-text-secondary">Run headless</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="screenshots" className="rounded" defaultChecked />
          <label htmlFor="screenshots" className="text-sm text-text-secondary">Capture screenshots</label>
        </div>
      </div>
    </div>
  );

  // Documentation view content
  const docsContent = (
    <div className="space-y-4">
      <button
        onClick={() => setActiveView('default')}
        className="text-coder1-cyan hover:underline text-sm flex items-center gap-1"
        data-testid="details-back-btn"
      >
        ← Back
      </button>
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        📖 Documentation
      </h3>
      <div className="space-y-3">
        <a
          href="https://playwright.dev/docs/intro"
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 bg-bg-primary border border-border-default rounded hover:border-coder1-cyan/30 transition-colors"
        >
          <div className="text-sm font-medium text-coder1-cyan">Playwright Docs →</div>
          <div className="text-xs text-text-muted mt-1">Official documentation</div>
        </a>
        <a
          href="#"
          className="block p-3 bg-bg-primary border border-border-default rounded hover:border-coder1-cyan/30 transition-colors"
        >
          <div className="text-sm font-medium text-coder1-cyan">API Reference →</div>
          <div className="text-xs text-text-muted mt-1">Mission Control APIs</div>
        </a>
        <a
          href="#"
          className="block p-3 bg-bg-primary border border-border-default rounded hover:border-coder1-cyan/30 transition-colors"
        >
          <div className="text-sm font-medium text-coder1-cyan">Examples →</div>
          <div className="text-xs text-text-muted mt-1">Sample test cases</div>
        </a>
      </div>
    </div>
  );

  // Default help text with Quick Actions
  const defaultContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-coder1-cyan">
        <span className="text-xl">ℹ️</span>
        <h3 className="font-semibold">Details</h3>
      </div>
      <p className="text-text-secondary text-sm">
        Select an item from the main panel to view detailed information here.
      </p>
      <div className="mt-6 space-y-3">
        <div className="text-text-muted text-xs uppercase tracking-wide">
          Quick Actions
        </div>
        <div className="space-y-2">
          <button
            onClick={() => setActiveView('reports')}
            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded
                       hover:border-coder1-cyan/30 hover:text-coder1-cyan
                       transition-all text-left text-sm text-text-secondary"
            data-testid="quick-action-reports"
          >
            📊 View Reports
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded
                       hover:border-coder1-cyan/30 hover:text-coder1-cyan
                       transition-all text-left text-sm text-text-secondary"
            data-testid="quick-action-settings"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setActiveView('docs')}
            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded
                       hover:border-coder1-cyan/30 hover:text-coder1-cyan
                       transition-all text-left text-sm text-text-secondary"
            data-testid="quick-action-docs"
          >
            📖 Documentation
          </button>
        </div>
      </div>
    </div>
  );

  // Render based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'reports':
        return reportsContent;
      case 'settings':
        return settingsContent;
      case 'docs':
        return docsContent;
      default:
        return defaultContent;
    }
  };

  return (
    <div className="h-full bg-bg-secondary border-l border-border-default p-4 overflow-y-auto">
      <div className="text-sm">
        {renderContent()}
      </div>
    </div>
  );
}
