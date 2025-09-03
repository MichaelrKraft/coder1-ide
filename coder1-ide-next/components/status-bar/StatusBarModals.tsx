/**
 * StatusBarModals - Session Summary Modal Component
 * 
 * Handles the session summary modal functionality
 * Extracted from the original StatusBar for better modularity
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Download, Save, Loader2, FileText } from 'lucide-react';
import { useSessionSummary } from '@/lib/hooks/useSessionSummary';
import { useUIStore } from '@/stores/useUIStore';
import { useModalStack } from '@/lib/hooks/useModalStack';
import { zIndexClasses } from '@/lib/z-index';
import type { IDEFile } from '@/types';

interface StatusBarModalsProps {
  activeFile?: string | null;
  openFiles?: IDEFile[];
  terminalHistory?: string;
  terminalCommands?: string[];
}

export default function StatusBarModals({
  activeFile,
  openFiles = [],
  terminalHistory = '',
  terminalCommands = []
}: StatusBarModalsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'nextSteps'>('summary');
  const [copySuccess, setCopySuccess] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [isStoringInDocs, setIsStoringInDocs] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json' | 'html' | 'all'>('markdown');
  
  const { closeModal, addToast } = useUIStore();
  const { pushModal, popModal } = useModalStack();
  
  const {
    isGenerating,
    summary,
    insights,
    nextSteps,
    error: summaryError,
    hasGenerated,
    progress,
    currentStep,
    generateSummary,
    clearSummary,
    copySummaryToClipboard,
    exportSummary,
    storeInDocumentation
  } = useSessionSummary();

  // Handle modal close
  const handleCloseModal = () => {
    closeModal('sessionSummary');
    popModal('sessionSummary'); // Remove from modal stack
    setCopySuccess(false);
    setActiveTab('summary');
  };

  // Register modal with stack and start generation on mount
  useEffect(() => {
    const zIndex = pushModal({
      id: 'sessionSummary',
      onClose: handleCloseModal,
      closeOnEscape: true,
      closeOnBackdrop: true
    });
    
    // Only generate summary once when modal opens
    if (!hasGenerated && !isGenerating) {
      generateSummary({
        openFiles,
        activeFile,
        terminalHistory,
        terminalCommands
      });
    }

    // Cleanup on unmount
    return () => {
      popModal('sessionSummary');
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

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

  return (
    <div 
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${zIndexClasses.modalBackdrop} flex items-center justify-center p-4`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-bg-secondary border border-border-default rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col ${zIndexClasses.modalContent}`}
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="flex gap-1 p-4 border-b border-border-default">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded transition-all ${
              activeTab === 'summary' 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
                : 'hover:bg-bg-primary text-text-muted'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded transition-all ${
              activeTab === 'insights' 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
                : 'hover:bg-bg-primary text-text-muted'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('nextSteps')}
            className={`px-4 py-2 rounded transition-all ${
              activeTab === 'nextSteps' 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
                : 'hover:bg-bg-primary text-text-muted'
            }`}
          >
            Next Steps
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-4 p-4 border-t border-border-default">
          <div className="flex items-center gap-2">
            {/* Export Format Selector */}
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="px-3 py-1.5 bg-bg-primary border border-border-default rounded text-sm text-text-primary"
            >
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="html">HTML</option>
              <option value="all">All Formats</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Store in Docs Button */}
            <button
              onClick={handleStoreInDocs}
              disabled={!hasGenerated || isStoringInDocs}
              className="px-4 py-1.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isStoringInDocs ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : storeSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {storeSuccess ? 'Stored!' : 'Store in Docs'}
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopyToClipboard}
              disabled={!hasGenerated}
              className="px-4 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {copySuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportSummary}
              disabled={!hasGenerated}
              className="px-4 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Regenerate Button */}
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="px-4 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}