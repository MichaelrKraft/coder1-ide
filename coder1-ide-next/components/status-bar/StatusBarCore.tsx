/**
 * StatusBarCore - Main Status Bar Container
 * 
 * Refactored from the original 700+ line StatusBar component
 * Now focused solely on layout and coordination between sub-components
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Eye, GitBranch, FileText } from 'lucide-react';
import StatusBarActions from './StatusBarActions';
import DiscoverPanel from './DiscoverPanel';
import { useIDEStore } from '@/stores/useIDEStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useUIStore } from '@/stores/useUIStore';
import { pollingManager } from '@/lib/polling-manager';
import type { IDEFile } from '@/types';

interface StatusBarCoreProps {
  activeFile?: string | null;
  isConnected?: boolean;
  openFiles?: IDEFile[];
  terminalHistory?: string;
  terminalCommands?: string[];
}

export default function StatusBarCore({ 
  activeFile, 
  isConnected = false, 
  openFiles = [], 
  terminalHistory = '', 
  terminalCommands = [] 
}: StatusBarCoreProps) {
  // Get state from stores
  const { connections } = useIDEStore();
  const { supervision } = useSessionStore();
  const { discoverPanel, addToast } = useUIStore();
  
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
  
  const actuallyConnected = isConnected || connections.terminal;
  const supervisionActive = supervision.isActive;

  // Setup git status polling using centralized polling manager
  useEffect(() => {
    // Register git status polling with the centralized manager
    pollingManager.register({
      id: 'git-status',
      url: '/api/git/status',
      interval: 60000,           // Poll every 60 seconds
      timeout: 5000,             // 5 second timeout
      maxFailures: 3,            // Open circuit after 3 failures
      backoffMultiplier: 2,      // Double interval on failure
      maxBackoff: 300000         // Max 5 minute backoff
    });

    // Subscribe to git status updates
    const unsubscribe = pollingManager.subscribe('git-status', (gitData) => {
      setGitInfo({
        branch: gitData.branch || null,
        modifiedCount: gitData.totalChanges || 0,
        isLoading: false
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  return (
    <>
      <div className="h-11 bg-bg-secondary border-t border-border-default flex items-center px-4 relative">
        {/* Left section - Discover Button & Supervision Indicator */}
        <div className="flex items-center gap-4 text-sm text-text-muted flex-1">
          <DiscoverPanel />
          
          {/* Supervision Indicator */}
          {supervisionActive && (
            <div className="flex items-center gap-1 text-coder1-cyan animate-pulse">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Supervision Active</span>
            </div>
          )}
          
          {/* Active File Indicator */}
          {activeFile && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse"></span>
              <span className="text-text-secondary">{activeFile}</span>
            </div>
          )}
        </div>

        {/* Center section - Action buttons (absolutely positioned to center) */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <StatusBarActions
            activeFile={activeFile}
            isConnected={actuallyConnected}
            openFiles={openFiles}
            terminalHistory={terminalHistory}
            terminalCommands={terminalCommands}
          />
        </div>

        {/* Right section - Empty spacer for layout balance */}
        <div className="flex items-center gap-4 text-sm text-text-muted flex-1">
          {/* Empty spacer */}
        </div>
      </div>
    </>
  );
}