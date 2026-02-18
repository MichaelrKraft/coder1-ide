'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, Zap, AlertTriangle, X, FileText, Terminal, ListChecks, UserCog, Users } from 'lucide-react';
import Johnny5TabBar from './Johnny5TabBar';
import { ChatTab } from './chat';
import { MissionControlTab } from './mission-control';
import { SessionsTab } from './sessions';
import { SecurityTab } from './security';
import { AnalyticsTab } from './analytics';
import { ContextTab } from './context';
import { ReasoningTab } from './reasoning';
import { MorningBriefTab } from './morning-brief';
import { SkillsManager } from './skills';
import { SettingsPanel, SetupWizard } from './settings';
import ContextBudgetMini from './ContextBudgetMini';
import PromptTemplates from './PromptTemplates';
import CommandTranslator from './CommandTranslator';
import RuleSuggestion from './RuleSuggestion';
import SessionMemoryPanel from './SessionMemoryPanel';
import HandoffBanner from './HandoffBanner';
import WorkflowBuilder from './WorkflowBuilder';
import AgentPersonas from './AgentPersonas';
import ErrorPatternCard from './ErrorPatternCard';
import CoachTip from './CoachTip';
import CrewPanel from './CrewPanel';
import { LiveFeed } from './LiveFeed';
import crewData from '@/data/crew-members.json';
import { getSocket } from '@/lib/socket';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import { useIDEStore } from '@/stores/useIDEStore';
import { getPatternDetector } from '@/services/johnny5/pattern-detector';
import { getRuleSuggester } from '@/services/johnny5/rule-suggester';
import { getModelAdvisor } from '@/services/johnny5/model-advisor';
import { getSessionMemory } from '@/services/johnny5/session-memory';
import { getHandoffGenerator } from '@/services/johnny5/handoff-generator';
import { getErrorPatternLibrary } from '@/services/johnny5/error-pattern-library';
import { getSessionCoach } from '@/services/johnny5/session-coach';

interface Johnny5PanelProps {
  className?: string;
}

/**
 * Johnny5 Panel - Your AI Employee Dashboard
 *
 * Replaces Memory UX in the right panel of Coder1 IDE.
 * Provides visibility into AI operations and control over autonomous features.
 *
 * Key Features:
 * - Session Intelligence: What did your AI do?
 * - Reasoning Replay: Why did it make that decision?
 * - Analytics View: Usage patterns and metrics
 * - Context Visualizer: What does AI remember?
 * - Security Monitor: Am I protected? (KEY DIFFERENTIATOR)
 * - Mission Control: Track all Johnny5 tasks
 * - Morning Brief: Daily summary of overnight work
 *
 * URL Parameters:
 * - ?showSetup=true - Force show the setup wizard
 * - ?resetJohnny5=true - Reset Johnny5 state and show wizard
 */
export default function Johnny5Panel({ className }: Johnny5PanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showWorkflows, setShowWorkflows] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);
  const [showRuleSuggestion, setShowRuleSuggestion] = useState(true);
  const [showMemoryPanel, setShowMemoryPanel] = useState(true);
  const [showHandoffBanner, setShowHandoffBanner] = useState(true);
  const [showErrorPattern, setShowErrorPattern] = useState(true);
  const [showCoachTip, setShowCoachTip] = useState(true);
  const [hasBriefNotification, setHasBriefNotification] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(false);
  const {
    activeTab,
    setActiveTab,
    status,
    security,
    setupStatus,
    setSetupStatus,
    activeCrewMember,
    crewStatus,
    crewActivityFeed,
    showCrewPanel,
    setActiveCrewMember,
    setCrewStatus,
    setShowCrewPanel,
  } = useJohnny5Store();

  const activeFile = useIDEStore((s) => s.editor.activeFile);

  // Listen for johnny5:openTemplates events from MorningBriefTab, SessionCoach, etc.
  useEffect(() => {
    const templatesHandler = () => setShowTemplates(true);
    const workflowsHandler = () => setShowWorkflows(true);
    window.addEventListener('johnny5:openTemplates', templatesHandler);
    window.addEventListener('johnny5:openWorkflows', workflowsHandler);
    return () => {
      window.removeEventListener('johnny5:openTemplates', templatesHandler);
      window.removeEventListener('johnny5:openWorkflows', workflowsHandler);
    };
  }, []);

  // Listen for morning brief Socket.IO event from cron service
  useEffect(() => {
    let cancelled = false;
    let socketRef: Awaited<ReturnType<typeof getSocket>> | null = null;

    const handler = () => {
      if (!cancelled && activeTab !== 'morning-brief') {
        setHasBriefNotification(true);
      }
    };

    getSocket().then((sock) => {
      if (cancelled) return;
      socketRef = sock;
      sock.on('johnny5:morning-brief', handler);
    }).catch(() => {
      // Socket not available — brief tab still works on-demand
    });

    return () => {
      cancelled = true;
      if (socketRef) {
        socketRef.off('johnny5:morning-brief', handler);
      }
    };
  }, [activeTab]);

  // Listen for proactive chat messages from Johnny5 (morning briefs, opportunity alerts, etc.)
  useEffect(() => {
    let cancelled = false;
    let socketRef: Awaited<ReturnType<typeof getSocket>> | null = null;

    const handler = () => {
      if (!cancelled && activeTab !== 'chat') {
        setHasChatNotification(true);
      }
    };

    getSocket().then((sock) => {
      if (cancelled) return;
      socketRef = sock;
      sock.on('johnny5:chat-push', handler);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (socketRef) {
        socketRef.off('johnny5:chat-push', handler);
      }
    };
  }, [activeTab]);

  // Start intelligence services on mount (Phase 2 + 3 + 4)
  const servicesStarted = useRef(false);
  useEffect(() => {
    if (servicesStarted.current || typeof window === 'undefined') return;
    servicesStarted.current = true;
    getPatternDetector().start();
    getRuleSuggester().start();
    getModelAdvisor().start();
    getSessionMemory().start();
    getHandoffGenerator().start();
    getErrorPatternLibrary().start();
    getSessionCoach().start();
    return () => {
      getPatternDetector().stop();
      getRuleSuggester().stop();
      getModelAdvisor().stop();
      getSessionMemory().stop();
      getHandoffGenerator().stop();
      getErrorPatternLibrary().stop();
      getSessionCoach().stop();
    };
  }, []);

  // Check URL parameters for force-show wizard (client-side only, runs once on mount)
  const hasCheckedUrlParams = React.useRef(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasCheckedUrlParams.current) return;
    hasCheckedUrlParams.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const showSetupParam = urlParams.get('showSetup');
    const resetParam = urlParams.get('resetJohnny5');

    if (showSetupParam === 'true' || resetParam === 'true') {
      // Force show the wizard
      setShowSetupWizard(true);

      // If reset param, also mark setup as incomplete
      if (resetParam === 'true') {
        setSetupStatus({ ...setupStatus, isComplete: false });
      }

      // Clean up URL to prevent re-triggering
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [setSetupStatus, setupStatus]);

  const hasSecurityAlerts = security.warnings.filter(w => !w.dismissed).length > 0 ||
    security.promptInjectionAlerts.filter(a => !a.blocked).length > 0;

  // Crew stats
  const crewMembers = useMemo(() => (crewData as { crewMembers: { id: string; name: string; icon: string; category: string; description: string; promptPrefix: string; exampleTasks: string[] }[] }).crewMembers, []);
  const totalCrewCount = crewMembers.length;
  const activeCrewCount = useMemo(() => {
    return Object.values(crewStatus).filter(s => s === 'working').length;
  }, [crewStatus]);

  // Crew activation handler — sets active crew member, closes panel, switches to chat
  const handleActivateCrew = (crewMemberId: string) => {
    setActiveCrewMember(crewMemberId);
    setShowCrewPanel(false);
    setActiveTab('chat');
  };

  return (
    <div data-tour="johnny5-panel" className={`h-full flex flex-col bg-bg-secondary relative overflow-hidden ${className || ''}`}>
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Orb 1 - Cyan (Johnny5 primary) */}
        <div
          className="absolute w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.4), transparent)',
            top: '-80px',
            right: '-80px',
            filter: 'blur(60px)',
            animation: 'johnny5Float 20s ease-in-out infinite',
          }}
        />

        {/* Gradient Orb 2 - Purple */}
        <div
          className="absolute w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent)',
            bottom: '100px',
            left: '-40px',
            filter: 'blur(40px)',
            animation: 'johnny5Float 15s ease-in-out infinite reverse',
          }}
        />

        {/* Gradient Orb 3 - Orange (for alerts/activity) */}
        <div
          className="absolute w-32 h-32 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.25), transparent)',
            top: '50%',
            right: '20%',
            filter: 'blur(30px)',
            opacity: status === 'working' ? 0.2 : 0.05,
            animation: status === 'working' ? 'johnny5Pulse 2s ease-in-out infinite' : 'johnny5Float 10s ease-in-out infinite',
          }}
        />

        {/* Security Alert Glow (red when alerts present) */}
        {hasSecurityAlerts && (
          <div
            className="absolute w-40 h-40 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3), transparent)',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              filter: 'blur(40px)',
              animation: 'johnny5AlertPulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes johnny5Float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(8px); }
          50% { transform: translateY(8px) translateX(-8px); }
          75% { transform: translateY(-8px) translateX(4px); }
        }

        @keyframes johnny5Pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.15); opacity: 0.3; }
        }

        @keyframes johnny5AlertPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-bg-secondary/80 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          {/* Johnny5 Logo/Icon */}
          <div className="relative">
            <Zap
              className={`w-5 h-5 ${
                status === 'working' ? 'text-coder1-cyan animate-pulse' :
                status === 'sleeping' ? 'text-purple-400' :
                status === 'error' ? 'text-red-400' :
                'text-text-muted'
              }`}
            />
            {/* Status indicator dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg-secondary ${
                status === 'working' ? 'bg-green-400' :
                status === 'sleeping' ? 'bg-purple-400' :
                status === 'error' ? 'bg-red-400' :
                'bg-gray-400'
              }`}
            />
          </div>

          <span className="text-xs text-text-muted">
            {status === 'working' ? 'Working...' :
             status === 'sleeping' ? 'Sleeping' :
             status === 'error' ? 'Error' :
             'Ready'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Crew Status Badge */}
          <button
            onClick={() => setShowCrewPanel(true)}
            className={`
              px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all
              ${activeCrewCount > 0
                ? 'bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30'
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'}
            `}
            title={`AI Crew Members (${totalCrewCount} total, ${activeCrewCount} active)\nClick to manage your AI team`}
          >
            <Users className="w-3 h-3" />
            <span>{totalCrewCount}</span>
            {activeCrewCount > 0 && (
              <span className="text-[9px] opacity-80">| {activeCrewCount} active</span>
            )}
          </button>

          {/* Security Score Badge */}
          <div
            className={`
              px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-help
              ${security.scoreStatus === 'good' ? 'bg-green-500/20 text-green-400' :
                security.scoreStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'}
            `}
            title={`Security Score: ${security.score}/100\n${security.scoreStatus === 'good' ? 'Your session is secure' : security.scoreStatus === 'warning' ? 'Some security concerns detected' : 'Security issues need attention'}`}
          >
            {hasSecurityAlerts && (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span>{security.score}</span>
          </div>

          {/* Agent Personas Button */}
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-coder1-cyan hover:bg-bg-tertiary transition-all"
            title="Agent Personas&#10;Switch between different AI personality modes"
            onClick={() => setShowPersonas(true)}
          >
            <UserCog className="w-4 h-4" />
          </button>

          {/* Workflow Orchestrator Button */}
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-coder1-cyan hover:bg-bg-tertiary transition-all"
            title="Workflow Orchestrator&#10;Create and manage automated task workflows"
            onClick={() => setShowWorkflows(true)}
          >
            <ListChecks className="w-4 h-4" />
          </button>

          {/* Command Translator Button */}
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-coder1-cyan hover:bg-bg-tertiary transition-all"
            title="Command Translator&#10;Convert natural language to terminal commands"
            onClick={() => setShowCommands(true)}
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Prompt Templates Button */}
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-coder1-cyan hover:bg-bg-tertiary transition-all"
            title="Prompt Templates&#10;Quick access to pre-built prompt snippets"
            onClick={() => setShowTemplates(true)}
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
            title="Johnny5 Settings&#10;Configure AI preferences and integrations"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Budget Mini Strip */}
      <ContextBudgetMini onClick={() => setActiveTab('context')} />

      {/* Tab Bar */}
      <Johnny5TabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'morning-brief') {
            setHasBriefNotification(false);
          }
          if (tab === 'chat') {
            setHasChatNotification(false);
          }
          // Mark setup as complete when user clicks any tab
          if (!setupStatus.isComplete) {
            setSetupStatus({ ...setupStatus, isComplete: true });
          }
        }}
        securityScore={security.score}
        hasAlerts={hasSecurityAlerts}
        hasBriefNotification={hasBriefNotification}
        hasChatNotification={hasChatNotification}
      />

      {/* Rule Suggestion Banner (Phase 2) */}
      <RuleSuggestion
        isVisible={showRuleSuggestion}
        onDismiss={() => setShowRuleSuggestion(false)}
      />

      {/* Context Carry-Forward Banner (Phase 3) */}
      <HandoffBanner
        isVisible={showHandoffBanner}
        onDismiss={() => setShowHandoffBanner(false)}
      />

      {/* Cross-Session Memory Panel (Phase 3) */}
      <SessionMemoryPanel
        isVisible={showMemoryPanel}
        onDismiss={() => setShowMemoryPanel(false)}
      />

      {/* Error Pattern Card (Phase 4) */}
      <ErrorPatternCard
        isVisible={showErrorPattern}
        onDismiss={() => setShowErrorPattern(false)}
      />

      {/* Session Coach Tip (Phase 4) */}
      <CoachTip
        isVisible={showCoachTip}
        onDismiss={() => setShowCoachTip(false)}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        {/* Setup Wizard (if not complete OR explicitly triggered) */}
        {(!setupStatus.isComplete || showSetupWizard) && (
          <SetupWizard
            onComplete={() => {
              setSetupStatus({ ...setupStatus, isComplete: true });
              setShowSetupWizard(false);
              setActiveTab('chat');
              // Emit event to refresh Johnny5 mode in ChatTab (clears Limited Mode banner)
              window.dispatchEvent(new CustomEvent('johnny5:setup-complete'));
            }}
            onSkip={() => {
              setSetupStatus({ ...setupStatus, isComplete: true });
              setShowSetupWizard(false);
              setActiveTab('chat');
              // Emit event to refresh Johnny5 mode in ChatTab
              window.dispatchEvent(new CustomEvent('johnny5:setup-complete'));
            }}
          />
        )}

        {/* Tab Content Panels */}
        {setupStatus.isComplete && !showSetupWizard && (
          <div className="h-full overflow-auto">
            {activeTab === 'chat' && <ChatTab />}
            {activeTab === 'sessions' && <SessionsTab />}
            {activeTab === 'reasoning' && <ReasoningTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'context' && <ContextTab />}
            {activeTab === 'security' && <SecurityTabConnected />}
            {activeTab === 'mission-control' && <MissionControlTab />}
            {activeTab === 'morning-brief' && <MorningBriefTab />}
            {activeTab === 'skills' && <SkillsManager />}
          </div>
        )}
      </div>

      {/* Settings Panel Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm overflow-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Johnny5 Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SettingsPanel
              onSave={() => setShowSettings(false)}
              onShowSetupWizard={() => {
                setShowSettings(false);
                setShowSetupWizard(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Prompt Templates Overlay */}
      <PromptTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        activeFile={activeFile || undefined}
      />

      {/* Command Translator Overlay (Phase 2) */}
      <CommandTranslator
        isOpen={showCommands}
        onClose={() => setShowCommands(false)}
      />

      {/* Workflow Builder Overlay (Phase 3) */}
      <WorkflowBuilder
        isOpen={showWorkflows}
        onClose={() => setShowWorkflows(false)}
      />

      {/* Agent Personas Overlay (Phase 4b) */}
      <AgentPersonas
        isOpen={showPersonas}
        onClose={() => setShowPersonas(false)}
      />

      {/* Crew Panel Overlay */}
      <CrewPanel
        isOpen={showCrewPanel}
        onClose={() => setShowCrewPanel(false)}
        onActivate={handleActivateCrew}
        activeCrewMember={activeCrewMember || undefined}
        crewStatus={crewStatus}
      />

      {/* Live Feed - Fixed at bottom when crew is active */}
      {activeCrewCount > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <LiveFeed entries={crewActivityFeed} maxEntries={20} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Connected Tab Components
// ============================================================================

function SecurityTabConnected() {
  const {
    security,
    securityLoading,
    updatePermission,
    dismissSecurityWarning,
    setSecurity,
    setSecurityLoading,
  } = useJohnny5Store();

  // Fetch real security data on mount
  useEffect(() => {
    const loadSecurityData = async () => {
      setSecurityLoading(true);
      try {
        const response = await fetch('/api/johnny5/security/score');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSecurity(data.data);
          }
        }
      } catch (error) {
        console.error('[SecurityTabConnected] Failed to load security data:', error);
      } finally {
        setSecurityLoading(false);
      }
    };

    loadSecurityData();
  }, [setSecurity, setSecurityLoading]);

  return (
    <SecurityTab
      security={security}
      onUpdatePermission={updatePermission}
      onDismissWarning={dismissSecurityWarning}
    />
  );
}


