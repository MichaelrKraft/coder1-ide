/**
 * StatusBarModals - Session Summary Modal Component
 * 
 * Handles the session summary modal functionality
 * Extracted from the original StatusBar for better modularity
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Download, Save, Loader2, FileText, Eye, FileArchive, Share2, RotateCw, ChevronDown } from 'lucide-react';
import { useSessionSummary } from '@/lib/hooks/useSessionSummary';
import { useUIStore } from '@/stores/useUIStore';
import { useTeamStore } from '@/stores/useTeamStore';
import { getFeatureFlags } from '@/lib/feature-flags';
import type { IDEFile } from '@/types';
import PreviewModal from '@/components/modals/PreviewModal';
import DownloadProjectModal from '@/components/modals/DownloadProjectModal';

interface StatusBarModalsProps {
  activeFile?: string | null;
  openFiles?: IDEFile[];
  getTerminalHistory?: () => string; // ⚡ CHANGED: Callback instead of string
  terminalCommands?: string[];
  sessionId?: string;
  contextUsage?: { total: number; percentage: number };
  currentTeamId?: string | null;
}

export default function StatusBarModals({
  activeFile,
  openFiles = [],
  getTerminalHistory,
  terminalCommands = [],
  sessionId,
  contextUsage,
  currentTeamId
}: StatusBarModalsProps) {
  const terminalHistory = getTerminalHistory ? getTerminalHistory() : '';
  console.log('🔍 [MODAL] StatusBarModals component mounting', {
    activeFile,
    openFilesCount: openFiles.length,
    terminalHistoryLength: terminalHistory?.length || 0,
    terminalCommandsCount: terminalCommands.length
  });
  
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'nextSteps' | 'handoff'>('summary');
  const [copySuccess, setCopySuccess] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [handoffCopySuccess, setHandoffCopySuccess] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isStoringInDocs, setIsStoringInDocs] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json' | 'html' | 'all'>('markdown');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const { closeModal, addToast } = useUIStore();
  const syncTeam = useTeamStore(s => s.syncTeam);
  const syncStatus = useTeamStore(s => s.syncStatus);
  
  const {
    isGenerating,
    summary,
    insights,
    nextSteps,
    handoff,
    error: summaryError,
    hasGenerated,
    progress,
    currentStep,
    isGeneratingHandoff,
    handoffError,
    generateSummary,
    clearSummary,
    copySummaryToClipboard,
    exportSummary,
    storeInDocumentation,
    generateHandoff,
    copyHandoffToClipboard,
    downloadHandoff
  } = useSessionSummary();

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    closeModal('sessionSummary');
    setCopySuccess(false);
    setActiveTab('summary');
  }, [closeModal]);

  // Close modal on Escape key press, and reset modal state on unmount
  // (prevents BUG-2: modal auto-opening after navigation back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Reset modal state on unmount so it does not persist across navigation
      closeModal('sessionSummary');
    };
  }, [handleCloseModal, closeModal]);

  // Start generation on mount if not already generated
  React.useEffect(() => {
    console.log('🔍 [MODAL] useEffect triggered', {
      hasGenerated,
      isGenerating,
      willGenerate: !hasGenerated && !isGenerating
    });
    
    if (!hasGenerated && !isGenerating) {
      console.log('🔍 [MODAL] Calling generateSummary from useEffect...');
      generateSummary({
        openFiles,
        activeFile,
        terminalHistory,
        terminalCommands
      });
      console.log('🔍 [MODAL] generateSummary call completed');
    } else {
      console.log('🔍 [MODAL] Skipping generateSummary - already generated or generating');
    }
  }, []);

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    const content = activeTab === 'summary' ? summary :
                   activeTab === 'insights' ? insights : nextSteps;
    const success = await copySummaryToClipboard(content || '');
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Store session summary in Documentation Intelligence System
  const handleStoreInDocs = async () => {
    setIsStoringInDocs(true);
    setStoreSuccess(false);
    
    const success = await storeInDocumentation();
    if (success) {
      setStoreSuccess(true);
      setTimeout(() => setStoreSuccess(false), 3000);
    }
    
    setIsStoringInDocs(false);
  };

  // Handle export
  const handleExportSummary = async () => {
    const success = await exportSummary(exportFormat);
    if (success) {
      addToast({
        message: '📦 Export completed successfully',
        type: 'success'
      });
    } else {
      addToast({
        message: '⚠️ Failed to export summary',
        type: 'error'
      });
    }
  };

  // Reset share state when a new summary generation cycle begins
  useEffect(() => {
    if (isGenerating) {
      setSharedId(null);
      setShareError(null);
    }
  }, [isGenerating]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!exportDropdownOpen) return;
    const close = () => setExportDropdownOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [exportDropdownOpen]);

  // Regenerate summary
  const handleRegenerate = () => {
    clearSummary();
    generateSummary({
      openFiles,
      activeFile,
      terminalHistory,
      terminalCommands
    });
  };

  // Share session summary to team workspace
  const handleShareToTeam = async () => {
    if (!syncTeam || !summary) return;
    setIsSharing(true);
    setShareError(null);
    try {
      const filesModifiedCount = openFiles.filter(f => f.isDirty).length;
      const response = await fetch(`/api/team/${syncTeam.id}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          session_type: null,
          branch: null,
          files_modified_count: filesModifiedCount,
        }),
      });
      const data = await response.json();
      if (response.ok || response.status === 409) {
        setSharedId(data.id || 'shared');
        if (!syncStatus.isConnected) {
          addToast({ message: `Shared. Teammates will see it next time they open the panel.`, type: 'success' });
        }
      } else {
        setShareError(data.error || 'Failed to share');
      }
    } catch {
      setShareError('Network error. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCloseModal}>
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-semibold text-text-primary">Session Summary</h2>
          <button
            onClick={handleCloseModal}
            className="p-1 hover:bg-bg-primary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex gap-6 px-4 pt-3 border-b border-border-default">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-2 border-b-2 text-sm transition-colors ${
              activeTab === 'summary'
                ? 'border-orange-400 text-text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-2 border-b-2 text-sm transition-colors ${
              activeTab === 'insights'
                ? 'border-orange-400 text-text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('nextSteps')}
            className={`pb-2 border-b-2 text-sm transition-colors ${
              activeTab === 'nextSteps'
                ? 'border-orange-400 text-text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Next Steps
          </button>
          <button
            onClick={() => setActiveTab('handoff')}
            className={`pb-2 border-b-2 text-sm transition-colors ${
              activeTab === 'handoff'
                ? 'border-orange-400 text-text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Handoff
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              <div className="text-center">
                <p className="text-text-primary mb-2">Generating {currentStep}...</p>
                <div className="w-64 h-2 bg-bg-primary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : summaryError ? (
            <div className="text-red-400">
              <p>Error generating summary: {summaryError}</p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-text-secondary">
              {activeTab === 'summary' && (summary || 'No summary generated yet. Click regenerate to start.')}
              {activeTab === 'insights' && (insights || 'No insights generated yet.')}
              {activeTab === 'nextSteps' && (nextSteps || 'No next steps generated yet.')}
              {activeTab === 'handoff' && (
                <div className="space-y-4">
                  {!handoff ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
                        <h4 className="text-sm font-medium text-yellow-400 mb-2">What is a handoff?</h4>
                        <p className="text-sm text-text-muted mb-2">
                          A handoff creates a comprehensive document that captures:
                        </p>
                        <ul className="text-sm text-text-muted space-y-1 ml-4 list-disc">
                          <li>What you&apos;ve accomplished in this session</li>
                          <li>Current state of your project</li>
                          <li>Any blockers or issues encountered</li>
                          <li>Prioritized next steps</li>
                          <li>Complete context for the next agent</li>
                        </ul>
                      </div>
                      {contextUsage && (
                        <div className="p-3 bg-bg-secondary border border-border-default rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-text-muted">Context Usage:</span>
                            <span className="text-text-primary font-mono">
                              {contextUsage.total.toLocaleString()} tokens ({contextUsage.percentage}%)
                            </span>
                          </div>
                          {contextUsage.percentage >= 75 && (
                            <div className="mt-2 text-xs text-orange-400">
                              ⚠️ Critical - Handoff recommended
                            </div>
                          )}
                          {contextUsage.percentage >= 50 && contextUsage.percentage < 75 && (
                            <div className="mt-2 text-xs text-yellow-400">
                              ⚠️ Warning - Consider handoff soon
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Project Actions Section - Always Available */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">Project Actions</h4>
                        <div className="flex gap-2">
                          {/* Preview Button */}
                          <button
                            onClick={() => setIsPreviewModalOpen(true)}
                            disabled={!currentTeamId}
                            className="flex-1 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-500/10 border border-purple-500/50 disabled:border-gray-500/20 rounded text-sm font-medium text-purple-400 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
                            title={currentTeamId ? "Preview AI Team Output - Browse files and preview code" : "No AI Team output to preview"}
                          >
                            <Eye className="w-4 h-4" />
                            Preview Project
                          </button>
                          
                          {/* Download Button */}
                          <button
                            onClick={() => setIsDownloadModalOpen(true)}
                            className="flex-1 py-2 px-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded text-sm font-medium text-green-400 transition-colors flex items-center justify-center gap-2"
                            title="Download Project - Export project as ZIP or JSON with configurable options"
                          >
                            <FileArchive className="w-4 h-4" />
                            Download Project
                          </button>
                        </div>
                      </div>
                      
                      <div className="border-t border-border-default my-4"></div>
                      
                      <button
                        onClick={() => generateHandoff(sessionId, contextUsage)}
                        disabled={isGeneratingHandoff}
                        className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-black font-medium text-sm rounded transition-colors flex items-center justify-center gap-2"
                      >
                        {isGeneratingHandoff ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating Handoff...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Generate Handoff Document
                          </>
                        )}
                      </button>
                      {handoffError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                          Error: {handoffError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <Check className="w-4 h-4" />
                          <span className="font-medium">Handoff document generated successfully!</span>
                        </div>
                      </div>
                      
                      {/* Project Actions Section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">Project Actions</h4>
                        <div className="flex gap-2">
                          {/* Preview Button */}
                          <button
                            onClick={() => setIsPreviewModalOpen(true)}
                            disabled={!currentTeamId}
                            className="flex-1 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-500/10 border border-purple-500/50 disabled:border-gray-500/20 rounded text-sm font-medium text-purple-400 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
                            title={currentTeamId ? "Preview AI Team Output - Browse files and preview code" : "No AI Team output to preview"}
                          >
                            <Eye className="w-4 h-4" />
                            Preview Project
                          </button>
                          
                          {/* Download Button */}
                          <button
                            onClick={() => setIsDownloadModalOpen(true)}
                            className="flex-1 py-2 px-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded text-sm font-medium text-green-400 transition-colors flex items-center justify-center gap-2"
                            title="Download Project - Export project as ZIP or JSON with configurable options"
                          >
                            <FileArchive className="w-4 h-4" />
                            Download Project
                          </button>
                        </div>
                      </div>
                      
                      {/* Handoff Document Section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">Handoff Document</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const success = await copyHandoffToClipboard();
                              if (success) {
                                setHandoffCopySuccess(true);
                                setTimeout(() => setHandoffCopySuccess(false), 2000);
                              }
                            }}
                            className="flex-1 py-2 px-3 bg-bg-secondary hover:bg-bg-tertiary border border-border-default rounded text-sm font-medium text-text-primary transition-colors flex items-center justify-center gap-2"
                          >
                            {handoffCopySuccess ? (
                              <>
                                <Check className="w-4 h-4 text-green-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                                Copy Handoff
                              </>
                            )}
                          </button>
                          <button
                            onClick={downloadHandoff}
                            className="flex-1 py-2 px-3 bg-bg-secondary hover:bg-bg-tertiary border border-border-default rounded text-sm font-medium text-text-primary transition-colors flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download .md
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-bg-secondary border border-border-default rounded">
                        <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Document Preview
                        </h4>
                        <div className="max-h-64 overflow-y-auto">
                          <pre className="text-xs text-text-muted whitespace-pre-wrap font-mono">
                            {handoff.substring(0, 1000)}
                            {handoff.length > 1000 && '\n\n... [truncated, see full document above] ...'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3 border-t border-border-default bg-bg-primary/30">
          <div className="flex items-center text-xs text-text-muted">
            {isGenerating && <span className="text-orange-400">Generating...</span>}
            {hasGenerated && !isGenerating && <span className="text-green-400/70">Ready</span>}
          </div>

          <div className="flex items-center divide-x divide-border-default">
            {/* Regenerate */}
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              title="Regenerate summary"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Regen
            </button>

            {/* Store in Docs */}
            <button
              onClick={handleStoreInDocs}
              disabled={!hasGenerated || isStoringInDocs}
              title="Store in Documentation"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isStoringInDocs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : storeSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
              {storeSuccess ? 'Stored!' : 'Store in Docs'}
            </button>

            {/* Copy */}
            <button
              onClick={handleCopyToClipboard}
              disabled={!hasGenerated}
              title="Copy to clipboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <FileText className="w-3.5 h-3.5" />}
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>

            {/* Export with dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setExportDropdownOpen(v => !v); }}
                disabled={!hasGenerated}
                title="Export"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3" />
              </button>
              {exportDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-1 bg-bg-secondary border border-border-default rounded shadow-lg z-10 min-w-[140px]">
                  {(['markdown', 'json', 'html', 'all'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => { setExportFormat(fmt); setExportDropdownOpen(false); handleExportSummary(); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-bg-tertiary transition-colors ${exportFormat === fmt ? 'text-orange-400' : 'text-text-secondary'}`}
                    >
                      {fmt === 'all' ? 'All Formats' : fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Share to Team — conditional */}
            {getFeatureFlags().teamFeatures && syncTeam && (
              <button
                onClick={handleShareToTeam}
                disabled={!hasGenerated || isSharing || !!sharedId}
                title={`Share to ${syncTeam.name}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-coder1-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sharedId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {isSharing ? 'Sharing...' : sharedId ? 'Shared' : 'Share'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Preview Modal */}
    {currentTeamId && (
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        teamId={currentTeamId}
      />
    )}
    
    {/* Download Project Modal */}
    <DownloadProjectModal
      isOpen={isDownloadModalOpen}
      onClose={() => setIsDownloadModalOpen(false)}
    />
    </>
  );
}