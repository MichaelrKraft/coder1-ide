'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Zap, AlertTriangle, X } from 'lucide-react';
import Johnny5TabBar from './Johnny5TabBar';
import { ChatTab } from './chat';
import { SessionsTab } from './sessions';
import { SecurityTab } from './security';
import { SettingsPanel, SetupWizard } from './settings';
import { useJohnny5Store } from '@/stores/useJohnny5Store';

interface Johnny5PanelProps {
  className?: string;
}

/**
 * Johnny5 Panel - Your AI Employee Dashboard
 *
 * 3-tab experience for beta:
 * - Chat: Talk to Johnny5
 * - Activity: See what Johnny5 did (sessions + morning brief + tasks)
 * - Security: Am I protected? (KEY DIFFERENTIATOR)
 */
export default function Johnny5Panel({ className }: Johnny5PanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const {
    activeTab,
    setActiveTab,
    status,
    security,
    setupStatus,
    setSetupStatus,
  } = useJohnny5Store();

  // Check URL parameters for force-show wizard
  const hasCheckedUrlParams = React.useRef(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasCheckedUrlParams.current) return;
    hasCheckedUrlParams.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const showSetupParam = urlParams.get('showSetup');
    const resetParam = urlParams.get('resetJohnny5');

    if (showSetupParam === 'true' || resetParam === 'true') {
      setShowSetupWizard(true);
      if (resetParam === 'true') {
        setSetupStatus({ ...setupStatus, isComplete: false });
      }
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [setSetupStatus, setupStatus]);

  const hasSecurityAlerts = security.warnings.filter(w => !w.dismissed).length > 0 ||
    security.promptInjectionAlerts.filter(a => !a.blocked).length > 0;

  return (
    <div data-tour="johnny5-panel" className={`h-full flex flex-col bg-bg-secondary relative overflow-hidden ${className || ''}`}>
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none">
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
          <div className="relative">
            <Zap
              className={`w-5 h-5 ${
                status === 'working' ? 'text-coder1-cyan animate-pulse' :
                status === 'sleeping' ? 'text-purple-400' :
                status === 'error' ? 'text-red-400' :
                'text-text-muted'
              }`}
            />
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
          {/* Security Score Badge */}
          <div
            className={`
              px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-help
              ${security.scoreStatus === 'good' ? 'bg-green-500/20 text-green-400' :
                security.scoreStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'}
            `}
            title={`Security Score: ${security.score}/100`}
          >
            {hasSecurityAlerts && (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span>{security.score}</span>
          </div>

          {/* Settings Button */}
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
            title="Johnny5 Settings"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <Johnny5TabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (!setupStatus.isComplete) {
            setSetupStatus({ ...setupStatus, isComplete: true });
          }
        }}
        securityScore={security.score}
        hasAlerts={hasSecurityAlerts}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        {/* Setup Wizard */}
        {(!setupStatus.isComplete || showSetupWizard) && (
          <SetupWizard
            onComplete={() => {
              setSetupStatus({ ...setupStatus, isComplete: true });
              setShowSetupWizard(false);
              setActiveTab('chat');
              window.dispatchEvent(new CustomEvent('johnny5:setup-complete'));
            }}
            onSkip={() => {
              setSetupStatus({ ...setupStatus, isComplete: true });
              setShowSetupWizard(false);
              setActiveTab('chat');
              window.dispatchEvent(new CustomEvent('johnny5:setup-complete'));
            }}
          />
        )}

        {/* Tab Content Panels */}
        {setupStatus.isComplete && !showSetupWizard && (
          <div className="h-full overflow-auto">
            {activeTab === 'chat' && <ChatTab />}
            {activeTab === 'activity' && <SessionsTab />}
            {activeTab === 'security' && <SecurityTabConnected />}
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
    </div>
  );
}

// Connected Security Tab - fetches real data
function SecurityTabConnected() {
  const {
    security,
    securityLoading,
    updatePermission,
    dismissSecurityWarning,
    setSecurity,
    setSecurityLoading,
  } = useJohnny5Store();

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
