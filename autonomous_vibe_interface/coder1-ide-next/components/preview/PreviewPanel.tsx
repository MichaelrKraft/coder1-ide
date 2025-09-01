'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Eye, X } from 'lucide-react';
import { colors, glows } from '@/lib/design-tokens';

type PreviewMode = 'dashboard' | 'wiki' | 'preview' | 'terminal';

interface PreviewPanelProps {
  agentsActive?: boolean;
  fileOpen?: boolean;
  isPreviewable?: boolean;
}

/**
 * Preview Panel with Multiple Modes
 * - Agent Dashboard (default when agents active)
 * - Codebase Wiki (📚 button in preview)
 * - Live Preview (when HTML/React files open)
 * - Terminal Output (optional)
 */
export default function PreviewPanel({
  agentsActive = false,
  fileOpen = false,
  isPreviewable = false,
}: PreviewPanelProps) {
  const [mode, setMode] = useState<PreviewMode>('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-switch based on context
  useEffect(() => {
    if (agentsActive) {
      setMode('dashboard');
    } else if (fileOpen && isPreviewable) {
      setMode('preview');
    }
  }, [agentsActive, fileOpen, isPreviewable]);

  const renderTabButton = (
    tabMode: PreviewMode,
    icon: React.ReactNode,
    label: string
  ) => (
    <button
      onClick={() => setMode(tabMode)}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm font-medium
        transition-all duration-200 border-b-2
        ${mode === tabMode 
          ? 'text-coder1-cyan border-coder1-cyan' 
          : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-hover'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-bg-secondary border border-coder1-cyan/50 shadow-glow-cyan">
      {/* Preview Header - matching Explorer style */}
      <div className="px-3 py-2 border-b border-border-default">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Preview
        </h3>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border-default px-4 h-12 shrink-0">
        <div className="flex items-center gap-1">
          {renderTabButton(
            'dashboard',
            <Users className="w-4 h-4" />,
            'Agent Dashboard'
          )}
          {renderTabButton(
            'wiki',
            <BookOpen className="w-4 h-4" />,
            'Codebase Wiki'
          )}
          {renderTabButton(
            'preview',
            <Eye className="w-4 h-4" />,
            'Preview'
          )}
        </div>
        
        {/* Close button */}
        <button 
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          onClick={() => {/* Handle close */}}
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-coder1-cyan border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Agent Dashboard */}
            {mode === 'dashboard' && (
              <div className="h-full p-4 overflow-auto">
                <div className="space-y-4">
                  {/* Agent Status Cards */}
                  <div className="glass-card p-4 rounded-lg border border-border-default">
                    <h3 className="text-sm font-semibold text-coder1-cyan mb-3">
                      Active Agents
                    </h3>
                    <div className="space-y-2">
                      <AgentStatusCard
                        name="Frontend Developer"
                        status="working"
                        task="Building UI components"
                        progress={67}
                      />
                      <AgentStatusCard
                        name="Backend Developer"
                        status="thinking"
                        task="Setting up API routes"
                        progress={45}
                      />
                      <AgentStatusCard
                        name="Architect"
                        status="idle"
                        task="Reviewing system design"
                        progress={100}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Codebase Wiki */}
            {mode === 'wiki' && (
              <div className="h-full overflow-auto">
                <iframe
                  src="/api/codebase/wiki"
                  className="w-full h-full border-0"
                  title="Codebase Wiki"
                  style={{ minHeight: '100%' }}
                />
              </div>
            )}

            {/* Live Preview */}
            {mode === 'preview' && (
              <div className="h-full bg-black">
                <iframe
                  src="/api/preview"
                  className="w-full h-full border-0"
                  title="Live Preview"
                  sandbox="allow-scripts allow-same-origin"
                  style={{ background: '#000' }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Agent Status Card Component
function AgentStatusCard({
  name,
  status,
  task,
  progress,
}: {
  name: string;
  status: 'idle' | 'thinking' | 'working' | 'error';
  task: string;
  progress: number;
}) {
  const statusColors = {
    idle: 'text-text-muted',
    thinking: 'text-warning',
    working: 'text-coder1-cyan',
    error: 'text-error',
  };

  return (
    <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div>
            <h4 className="text-sm font-medium text-text-primary">{name}</h4>
            <p className={`text-xs ${statusColors[status]}`}>{status}</p>
          </div>
        </div>
        <span className="text-xs text-text-secondary">{progress}%</span>
      </div>
      <p className="text-xs text-text-secondary mb-2">{task}</p>
      {/* Progress bar */}
      <div className="w-full h-1 bg-bg-primary rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-coder1-purple to-coder1-cyan transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}