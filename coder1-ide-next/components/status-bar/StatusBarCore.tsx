/**
 * StatusBarCore - Main Status Bar Container
 * 
 * Refactored from the original 700+ line StatusBar component
 * Now focused solely on layout and coordination between sub-components
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Eye, GitBranch, FileText, Brain, AlertTriangle, Zap, Link, Unlink, Users } from 'lucide-react';
import StatusBarActions from './StatusBarActions';
import DiscoverPanel from './DiscoverPanel';
import CostDisplay from '../terminal/CostDisplay';
import { BridgeConnectButton } from '@/components/bridge/BridgeConnectButton';
import { useIDEStore } from '@/stores/useIDEStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useUIStore } from '@/stores/useUIStore';
import { usePollingHealthStore } from '@/stores/usePollingHealthStore';
import { useBridgeSessionData, formatTokenCount } from '@/lib/useBridgeSessionData';
import { features } from '@/lib/feature-flags';
import { useBridgeConnectionState } from '@/lib/useBridgeConnectionState';
import { logger } from '@/lib/logger';
import NotificationCenter from '@/components/johnny5/NotificationCenter';
import RecordingIndicator from '@/components/flight-recorder/RecordingIndicator';
import type { IDEFile } from '@/types';

interface StatusBarCoreProps {
  activeFile?: string | null;
  isConnected?: boolean;
  openFiles?: IDEFile[];
  getTerminalHistory?: () => string; // ⚡ CHANGED: Callback to get terminal history without re-renders
  terminalCommands?: string[];
  terminalSessionId?: string | null; // 🔧 CRITICAL: Actual terminal session ID from IDE page
}

export default function StatusBarCore({ 
  activeFile, 
  isConnected = false, 
  openFiles = [], 
  getTerminalHistory, // ⚡ CHANGED: Callback instead of string
  terminalCommands = [],
  terminalSessionId // 🔧 CRITICAL: Pass through to StatusBarActions
}: StatusBarCoreProps) {
  // Get state from stores
  const { connections } = useIDEStore();
  const { supervision } = useSessionStore();
  const { discoverPanel, addToast } = useUIStore();
  const { hasIssues: pollingHasIssues, issuesSummary: pollingIssuesSummary } = usePollingHealthStore();

  // Bridge session data - real token counts from user's local Claude Code sessions
  const { tokens: bridgeTokens, hasActiveSession, isConnected: bridgeSessionConnected } = useBridgeSessionData();

  // Bridge connection state - whether user's local machine is connected
  const bridgeState = useBridgeConnectionState();

  // Bridge setup modal state
  const [showBridgeSetup, setShowBridgeSetup] = useState(false);
  
  // Git state management
  const [gitInfo, setGitInfo] = useState<{
    branch: string | null;
    modifiedCount: number;
    isLoading: boolean;
  }>({
    branch: null,
    modifiedCount: 0,
    isLoading: false
  });
  
  // Context Folders state management removed - moved to terminal memory panel
  

  const actuallyConnected = isConnected || connections.terminal;
  const supervisionActive = supervision.isActive;
  const { activeTeam } = useSessionStore();

  // Fetch git information using simple API
  const fetchGitInfo = async () => {
    try {
      setGitInfo(prev => ({ ...prev, isLoading: true }));
      
      // Use our simple git status API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/git/status', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const gitData = await response.json();
        
        setGitInfo({
          branch: gitData.branch,
          modifiedCount: gitData.totalChanges || 0,
          isLoading: false
        });
      } else {
        // If status fails, try just branch with timeout
        const branchController = new AbortController();
        const branchTimeoutId = setTimeout(() => branchController.abort(), 3000);
        
        const branchResponse = await fetch('/api/git/branch', {
          signal: branchController.signal
        });
        
        clearTimeout(branchTimeoutId);
        if (branchResponse.ok) {
          const branchData = await branchResponse.json();
          setGitInfo({
            branch: branchData.branch,
            modifiedCount: 0,
            isLoading: false
          });
        } else {
          setGitInfo(prev => ({ ...prev, isLoading: false }));
        }
      }
    } catch (error) {
      // logger?.warn('Git info fetch failed:', error);
      setGitInfo(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Context stats fetching removed - moved to terminal memory panel

  // Fetch git info on mount and periodically
  useEffect(() => {
    fetchGitInfo();
    const interval = setInterval(fetchGitInfo, 60000); // Update every 60 seconds (reduced from 30)
    return () => clearInterval(interval);
  }, []);
  
  // Context stats removed - moved to terminal memory panel
  
  return (
    <>
      <div className="h-11 bg-bg-secondary border-t border-border-default flex items-center px-4" data-tour="status-bar">
        {/* Left section - Discover Button & Supervision Indicator */}
        <div className="flex items-center gap-4 text-sm text-text-muted flex-1">
          <RecordingIndicator />
          <div className="relative">
            <DiscoverPanel />
          </div>
          
          {/* Gemini/GLM Cost Display (next to Discover button) */}
          <CostDisplay />

          {/* Unsaved Files Indicator */}
          {openFiles.filter(f => f.isDirty).length > 0 && (
            <div
              className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 cursor-help transition-colors"
              title={`Unsaved changes in ${openFiles.filter(f => f.isDirty).length} file(s):\n${openFiles.filter(f => f.isDirty).map(f => '• ' + f.name).join('\n')}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">
                {openFiles.filter(f => f.isDirty).length} unsaved
              </span>
            </div>
          )}

          {/* Bridge Connection Indicator - Only show when NOT connected */}
          {!bridgeState.isConnected && (
            <div
              className="flex items-center gap-1.5 text-yellow-500/70 hover:text-yellow-400 cursor-pointer transition-colors"
              title="Bridge Not Connected&#10;&#10;Connect your local machine to see your own files.&#10;Click to see setup instructions."
              onClick={() => setShowBridgeSetup(true)}
            >
              <Unlink className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">Connect Bridge</span>
            </div>
          )}

          {/* Bridge Session Tokens - Real token counts from local Claude Code */}
          {bridgeSessionConnected && bridgeTokens && (
            <div
              className="flex items-center gap-1.5 text-coder1-cyan/80 hover:text-coder1-cyan cursor-help transition-colors"
              title={`Claude Code Session Tokens (via Bridge)\n\nInput: ${bridgeTokens.input.toLocaleString()}\nOutput: ${bridgeTokens.output.toLocaleString()}\nCache Read: ${(bridgeTokens.cacheRead || 0).toLocaleString()}\nCache Write: ${(bridgeTokens.cacheCreation || 0).toLocaleString()}\n\nTotal: ${bridgeTokens.total.toLocaleString()}`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">
                {formatTokenCount(bridgeTokens.total)}
              </span>
              {hasActiveSession && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
            </div>
          )}

          {/* Agent Team Indicator */}
          {features().teamFeatures && activeTeam && (activeTeam.status === 'executing' || activeTeam.status === 'planning' || activeTeam.status === 'spawning') && (
            <div
              className="flex items-center gap-1.5 text-coder1-cyan hover:text-coder1-cyan/80 cursor-pointer transition-colors"
              title="Agent team is active - click to view"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('switchToTeamsTab'));
                window.dispatchEvent(new CustomEvent('expandRightPanel'));
              }}
            >
              <span className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse" />
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">
                Team: {activeTeam.agents?.filter((a: any) => a.status === 'working' || a.status === 'thinking').length || 0}/{activeTeam.agents?.length || 0} active
              </span>
            </div>
          )}

          {/* Supervision Indicator */}
          {supervisionActive && (
            <div className="flex items-center gap-1 text-coder1-cyan animate-pulse">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Supervision Active</span>
            </div>
          )}
        </div>

        {/* Center section - Action buttons */}
        <div className="flex items-center justify-center">
          <StatusBarActions
            activeFile={activeFile}
            isConnected={actuallyConnected}
            openFiles={openFiles}
            getTerminalHistory={getTerminalHistory}
            terminalCommands={terminalCommands}
            terminalSessionId={terminalSessionId}
          />
        </div>

        {/* Right section - Status info */}
        <div className="flex items-center gap-4 text-sm text-text-muted flex-1 justify-end">

          {/* Johnny5 Notification Center */}
          <NotificationCenter />

          {/* Service Health Indicator */}
          {pollingHasIssues && (
            <div
              className="flex items-center gap-1 text-yellow-400 cursor-help"
              title={pollingIssuesSummary || 'Some services are experiencing issues'}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Service Issue</span>
            </div>
          )}

          {/* Connection status removed to reduce clutter - Team button now in corner */}
        </div>
      </div>

      {/* Bridge Setup Modal - New visually polished component */}
      <BridgeConnectButton
        isOpen={showBridgeSetup}
        onClose={() => setShowBridgeSetup(false)}
        modalOnly={true}
      />
    </>
  );
}