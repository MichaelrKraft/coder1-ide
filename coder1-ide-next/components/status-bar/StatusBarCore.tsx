/**
 * StatusBarCore - Main Status Bar Container
 * 
 * Refactored from the original 700+ line StatusBar component
 * Now focused solely on layout and coordination between sub-components
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Eye, GitBranch, FileText, Brain } from 'lucide-react';
import StatusBarActions from './StatusBarActions';
import DiscoverPanel from './DiscoverPanel';
import { TeamStatusIndicator } from './TeamStatusIndicator';
import { useIDEStore } from '@/stores/useIDEStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useUIStore } from '@/stores/useUIStore';
import { logger } from '@/lib/logger';
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
  
  // Context Folders state management removed - moved to terminal memory panel
  
  const actuallyConnected = isConnected || connections.terminal;
  const supervisionActive = supervision.isActive;

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
      <div className="h-11 bg-bg-secondary border-t border-border-default flex items-center px-4">
        {/* Left section - Discover Button & Supervision Indicator */}
        <div className="flex items-center gap-4 text-sm text-text-muted flex-1">
          <div className="relative">
            <DiscoverPanel />
          </div>
          
          {/* Supervision Indicator */}
          {supervisionActive && (
            <div className="flex items-center gap-1 text-coder1-cyan animate-pulse">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Supervision Active</span>
            </div>
          )}
          
          {/* Team Status Indicator */}
          <TeamStatusIndicator />
          
          {/* Active File Indicator */}
          {activeFile && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse"></span>
              <span className="text-text-secondary">{activeFile}</span>
            </div>
          )}
        </div>

        {/* Center section - Action buttons */}
        <div className="flex items-center justify-center">
          <StatusBarActions
            activeFile={activeFile}
            isConnected={actuallyConnected}
            openFiles={openFiles}
            terminalHistory={terminalHistory}
            terminalCommands={terminalCommands}
          />
        </div>

        {/* Right section - Status info */}
        <div className="flex items-center gap-4 text-sm text-text-muted flex-1 justify-end">
          {/* Git Modified Files Count (without branch name) */}
          {gitInfo.modifiedCount > 0 && (
            <div className="flex items-center gap-1" title={`${gitInfo.modifiedCount} file${gitInfo.modifiedCount > 1 ? 's' : ''} modified`}>
              <FileText className="w-3 h-3 text-orange-400" />
              <span className="text-orange-400">{gitInfo.modifiedCount} modified</span>
            </div>
          )}
          
          {/* Connection Status */}
          {actuallyConnected && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-green-400">Connected</span>
            </div>
          )}
          
          {/* Context memory statistics moved to terminal header memory panel */}
        </div>
      </div>
    </>
  );
}