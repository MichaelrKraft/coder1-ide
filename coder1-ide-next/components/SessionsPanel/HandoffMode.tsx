'use client';

import React, { useState } from 'react';
import { FileText, Download, Copy, Loader2, CheckCircle, ArrowRight, Info, Upload } from 'lucide-react';
import { useIDEStore } from '@/stores/useIDEStore';
import { useSessionStore } from '@/stores/useSessionStore';

interface HandoffModeProps {
  onClose?: () => void;
}

type HandoffMode = 'generate' | 'load';

export default function HandoffMode({ onClose }: HandoffModeProps) {
  const { aiState } = useIDEStore();
  const { currentSession } = useSessionStore();
  
  const [mode, setMode] = useState<HandoffMode>('generate');
  const [generating, setGenerating] = useState(false);
  const [generatedHandoff, setGeneratedHandoff] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [handoffContent, setHandoffContent] = useState('');
  const [skipQA, setSkipQA] = useState(false);
  
  // Context usage stats
  const contextUsage = aiState?.tokenUsage?.total || 0;
  const CONTEXT_LIMIT = 200000;
  const contextPercentage = Math.round((contextUsage / CONTEXT_LIMIT) * 100);
  
  // Generate handoff document
  const handleGenerateHandoff = async () => {
    if (!currentSession) {
      alert('No active session to create handoff from');
      return;
    }
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/handoff/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.metadata.sessionId,
          contextUsage: {
            total: contextUsage,
            percentage: contextPercentage
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.handoff) {
        setGeneratedHandoff(result.handoff);
      } else {
        throw new Error(result.error || 'Failed to generate handoff');
      }
    } catch (error) {
      console.error('Handoff generation error:', error);
      alert(`Failed to generate handoff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };
  
  // Copy handoff to clipboard
  const handleCopyHandoff = () => {
    if (!generatedHandoff) return;
    
    navigator.clipboard.writeText(generatedHandoff).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };
  
  // Download handoff as markdown file
  const handleDownloadHandoff = () => {
    if (!generatedHandoff) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `handoff-${timestamp}.md`;
    
    const blob = new Blob([generatedHandoff], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Load handoff from pasted content
  const handleLoadHandoff = async () => {
    if (!handoffContent.trim()) {
      alert('Please paste a handoff document');
      return;
    }
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/handoff/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoffContent,
          skipQA
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Handoff loaded successfully! ${result.questions ? `\n\nQuestions for context:\n${result.questions.join('\n')}` : 'Session ready to continue.'}`);
        
        // Emit event to start new terminal session with handoff context
        window.dispatchEvent(new CustomEvent('startHandoffSession', {
          detail: {
            handoffData: result.handoffData,
            questions: result.questions
          }
        }));
        
        // Close handoff mode
        if (onClose) onClose();
      } else {
        throw new Error(result.error || 'Failed to load handoff');
      }
    } catch (error) {
      console.error('Handoff load error:', error);
      alert(`Failed to load handoff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="p-3 border-b border-border-primary bg-bg-secondary">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">Session Handoff</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-bg-primary rounded">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
              mode === 'generate'
                ? 'bg-yellow-500 text-black'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-3 h-3 inline mr-1" />
            Generate Handoff
          </button>
          <button
            onClick={() => setMode('load')}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
              mode === 'load'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Upload className="w-3 h-3 inline mr-1" />
            Load Handoff
          </button>
        </div>
        
        {/* Context Usage Info */}
        <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3 text-yellow-400" />
            <span className="text-text-secondary">
              Context: {contextUsage.toLocaleString()} / {CONTEXT_LIMIT.toLocaleString()} tokens ({contextPercentage}%)
            </span>
          </div>
          <p className="mt-1 text-text-muted">
            Creating a handoff allows you to start fresh while preserving all context
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {mode === 'load' ? (
          // Load Handoff Mode
          <div className="space-y-4">
            {/* Instructions */}
            <div className="p-3 bg-bg-secondary border border-border-primary rounded">
              <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-2">
                <Upload className="w-3 h-3" />
                Load a Handoff Document
              </h4>
              <p className="text-xs text-text-muted">
                Paste a handoff document from a previous session to continue development with full context.
              </p>
            </div>
            
            {/* Handoff Content Input */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Handoff Document (Markdown)
              </label>
              <textarea
                value={handoffContent}
                onChange={(e) => setHandoffContent(e.target.value)}
                placeholder="Paste your handoff document here..."
                className="w-full h-64 p-2 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary font-mono resize-none focus:outline-none focus:border-blue-500"
              />
            </div>
            
            {/* Skip Q&A Option */}
            <div className="flex items-center gap-2 p-2 bg-bg-secondary border border-border-primary rounded">
              <input
                type="checkbox"
                id="skipQA"
                checked={skipQA}
                onChange={(e) => setSkipQA(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="skipQA" className="text-xs text-text-secondary cursor-pointer">
                Skip Q&A validation (load handoff immediately without questions)
              </label>
            </div>
            
            {/* Load Button */}
            <button
              onClick={handleLoadHandoff}
              disabled={generating || !handoffContent.trim()}
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium text-sm rounded transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading Handoff...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Load Handoff & Continue
                </>
              )}
            </button>
            
            {/* Info Box */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-xs text-text-muted">
                <strong className="text-blue-400">Tip:</strong> Loading a handoff will analyze the document and
                {skipQA ? ' start a new session immediately with the preserved context.' : ' ask clarifying questions to ensure the next agent has complete understanding before starting.'}
              </p>
            </div>
          </div>
        ) : !generatedHandoff ? (
          // Pre-generation state
          <div className="space-y-4">
            {/* What is a Handoff */}
            <div className="p-3 bg-bg-secondary border border-border-primary rounded">
              <h4 className="text-xs font-medium text-text-primary mb-2">What is a handoff?</h4>
              <p className="text-xs text-text-muted mb-2">
                A handoff creates a comprehensive document that captures:
              </p>
              <ul className="text-xs text-text-muted space-y-1 ml-4 list-disc">
                <li>What you&apos;ve accomplished in this session</li>
                <li>Current state of your project</li>
                <li>Any blockers or issues encountered</li>
                <li>Prioritized next steps</li>
                <li>Complete context for the next agent</li>
              </ul>
            </div>
            
            {/* Session Info */}
            {currentSession && (
              <div className="p-3 bg-bg-secondary border border-border-primary rounded">
                <h4 className="text-xs font-medium text-text-primary mb-2">Current Session</h4>
                <div className="space-y-1 text-xs text-text-muted">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="text-text-secondary">{currentSession.metadata.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Started:</span>
                    <span className="text-text-secondary">
                      {new Date(currentSession.metadata.startTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Files Open:</span>
                    <span className="text-text-secondary">{currentSession.openFiles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Checkpoints:</span>
                    <span className="text-text-secondary">{currentSession.checkpoints.length}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Generate Button */}
            <button
              onClick={handleGenerateHandoff}
              disabled={generating || !currentSession}
              className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-black font-medium text-sm rounded transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
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
            
            {!currentSession && (
              <p className="text-xs text-center text-text-muted">
                No active session. Start a session to create a handoff.
              </p>
            )}
          </div>
        ) : (
          // Post-generation state
          <div className="space-y-4">
            {/* Success Message */}
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Handoff document generated successfully!</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Copy to clipboard or download the markdown file to continue in a new session
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCopyHandoff}
                className="flex-1 py-2 px-3 bg-bg-secondary hover:bg-bg-tertiary border border-border-primary rounded text-xs font-medium text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy to Clipboard
                  </>
                )}
              </button>
              
              <button
                onClick={handleDownloadHandoff}
                className="flex-1 py-2 px-3 bg-bg-secondary hover:bg-bg-tertiary border border-border-primary rounded text-xs font-medium text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3 h-3" />
                Download .md
              </button>
            </div>
            
            {/* Preview */}
            <div className="p-3 bg-bg-secondary border border-border-primary rounded">
              <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Document Preview
              </h4>
              <div className="max-h-64 overflow-y-auto">
                <pre className="text-xs text-text-muted whitespace-pre-wrap font-mono">
                  {generatedHandoff.substring(0, 1000)}
                  {generatedHandoff.length > 1000 && '\n\n... [truncated, see full document above] ...'}
                </pre>
              </div>
            </div>
            
            {/* Next Steps */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <h4 className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-2">
                <ArrowRight className="w-3 h-3" />
                Next Steps
              </h4>
              <ol className="text-xs text-text-muted space-y-1 ml-4 list-decimal">
                <li>Copy or download the handoff document</li>
                <li>End the current session or start a new one</li>
                <li>Share the handoff with the next agent or developer</li>
                <li>Continue development with full context preserved</li>
              </ol>
            </div>
            
            {/* Generate Another */}
            <button
              onClick={() => setGeneratedHandoff(null)}
              className="w-full py-2 px-3 bg-bg-secondary hover:bg-bg-tertiary border border-border-primary rounded text-xs font-medium text-text-primary transition-colors"
            >
              Generate Another Handoff
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
