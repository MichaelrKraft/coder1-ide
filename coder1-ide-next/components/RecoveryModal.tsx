"use client";

/**
 * Session Rescue - Recovery Modal Component
 * 
 * Displays when an unexpected shutdown is detected and a recoverable checkpoint exists.
 * Gives the user the choice to restore their previous session or start fresh.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getConfidenceLabel } from '@/lib/recovery-utils';

interface RecoveryModalProps {
  onClose?: () => void;
}

interface RecoveryData {
  hasRecovery: boolean;
  recovery?: {
    checkpoint: {
      id: string;
      sessionId: string;
      name: string;
      timestamp: string;
      type: string;
      openFiles: string[];
      gitBranch?: string;
    };
    age: string;
    score: {
      overall: number;
      filesVerified: number;
      terminalComplete: number;
      claudeContext: number;
      gitSync: number;
      recency: number;
    };
    warnings: string[];
    stats: {
      filesCount: number;
      terminalHistorySize: number;
      hasClaudeContext: boolean;
    };
  };
  reason?: string;
}

export default function RecoveryModal({ onClose }: RecoveryModalProps) {
  const router = useRouter();
  const [recovery, setRecovery] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    checkForRecovery();
  }, []);

  const checkForRecovery = async () => {
    try {
      // Check if recovery was recently consumed (within last 5 minutes)
      const consumedTimestamp = localStorage.getItem('recovery-consumed-timestamp');
      if (consumedTimestamp) {
        const ageMs = Date.now() - parseInt(consumedTimestamp);
        const fiveMinutes = 5 * 60 * 1000;
        if (ageMs < fiveMinutes) {
          console.log('ℹ️ Recovery already consumed recently (', Math.floor(ageMs / 1000), 's ago)');
          setIsVisible(false);
          setLoading(false);
          if (onClose) onClose();
          return;
        } else {
          // Clear old consumed flag
          localStorage.removeItem('recovery-consumed-timestamp');
        }
      }
      
      const response = await fetch('/api/recovery/check/');
      const data: RecoveryData = await response.json();
      
      if (data.hasRecovery && data.recovery) {
        setRecovery(data);
        console.log('🛟 Recovery available:', data.recovery);
      } else {
        console.log('ℹ️ No recovery available:', data.reason);
        // Hide modal if no recovery
        setIsVisible(false);
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Failed to check for recovery:', error);
      setIsVisible(false);
      if (onClose) onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    if (!recovery?.recovery) {
      console.error('❌ No recovery data available');
      alert('No recovery data available. Please refresh the page and try again.');
      return;
    }
    
    console.log('🛟 Starting recovery process...');
    console.log('Checkpoint ID:', recovery.recovery.checkpoint.id);
    console.log('Session ID:', recovery.recovery.checkpoint.sessionId);
    
    setRestoring(true);
    
    try {
      console.log('📡 Calling /api/recovery/restore...');
      const response = await fetch('/api/recovery/restore/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpointId: recovery.recovery.checkpoint.id,
          sessionId: recovery.recovery.checkpoint.sessionId
        })
      });
      
      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📡 Response data:', data);
      
      if (data.success && data.restoreUrl) {
        console.log('✅ Success! Checkpoint data loaded');
        
        // Store checkpoint data in localStorage for the IDE page to restore
        if (data.checkpoint?.data?.snapshot) {
          const snapshot = data.checkpoint.data.snapshot;
          console.log('💾 Storing checkpoint data in localStorage...');
          
          // Store files, terminal history, and editor content
          if (snapshot.files) {
            localStorage.setItem('openFiles', snapshot.files);
            console.log('  ✓ Stored openFiles:', snapshot.files.length, 'chars');
          }
          
          if (snapshot.terminal) {
            // Use mainTerminalHistory (not terminalHistory) - IDE migrates old key on startup
            console.log('  📊 About to store terminal history:', snapshot.terminal.length, 'chars');
            localStorage.setItem('mainTerminalHistory', snapshot.terminal);
            const stored = localStorage.getItem('mainTerminalHistory');
            console.log('  ✓ Stored mainTerminalHistory:', stored?.length, 'chars');
            console.log('  ✓ Verification - matches?', stored === snapshot.terminal);
          }
          
          if (snapshot.editor) {
            localStorage.setItem('editorContent', snapshot.editor);
            console.log('  ✓ Stored editorContent');
          }
          
          // Store session ID for terminal restoration
          localStorage.setItem('currentSessionId', data.sessionId);
          localStorage.setItem('ide-terminalSessionId', data.sessionId);
          console.log('  ✓ Stored session IDs');
        }
        
        // Mark recovery as consumed in localStorage (survives page reload)
        localStorage.setItem('recovery-consumed-timestamp', Date.now().toString());
        sessionStorage.removeItem('recovery-available');
        sessionStorage.removeItem('recovery-timestamp');
        console.log('✓ Recovery marked as consumed');
        
        // CRITICAL: Force localStorage to flush to disk before navigation
        // Without this delay, localStorage.setItem() calls may not complete before page unload
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify data was stored successfully
        const storedHistory = localStorage.getItem('mainTerminalHistory');
        console.log('✅ Verification before navigation - mainTerminalHistory length:', storedHistory?.length || 0);
        
        // Navigate to IDE with sessionId to prevent hard refresh detection
        // The IDE clears localStorage if no sessionId is in URL (treats it as hard refresh)
        console.log('🔄 Navigating to IDE to complete restoration...');
        const sessionId = data.sessionId || localStorage.getItem('currentSessionId');
        window.location.href = `/ide?sessionId=${sessionId}`;
      } else {
        const errorMsg = data.error || 'Unknown error occurred';
        console.error('❌ Recovery failed:', errorMsg);
        alert(`Failed to restore session: ${errorMsg}\n\nPlease check the browser console for details.`);
        setRestoring(false);
      }
    } catch (error) {
      console.error('❌ Recovery error:', error);
      alert(`Failed to restore session: ${error instanceof Error ? error.message : 'Network error'}\n\nPlease check your connection and try again.`);
      setRestoring(false);
    }
  };

  const handleStartFresh = () => {
    console.log('🆕 Starting fresh session');
    // Clear recovery indicators
    sessionStorage.removeItem('recovery-available');
    sessionStorage.removeItem('recovery-timestamp');
    // Hide modal
    setIsVisible(false);
    if (onClose) onClose();
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-bg-primary border border-border rounded-lg p-8 max-w-md">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-accent-primary border-t-transparent rounded-full"></div>
            <p className="text-text-secondary">Checking for recoverable sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!recovery?.hasRecovery) {
    return null;
  }

  const { checkpoint, age, score, warnings, stats } = recovery.recovery!;
  const confidence = getConfidenceLabel(score.overall);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-primary border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🛟</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Session Recovery Available
              </h2>
              <p className="text-text-secondary">
                Your last session ended unexpectedly <strong>{age}</strong>. 
                Would you like to restore it?
              </p>
            </div>
          </div>
        </div>

        {/* Recovery Details */}
        <div className="p-6 space-y-6">
          {/* Confidence Score */}
          <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
            <div>
              <p className="text-sm text-text-muted mb-1">Recovery Confidence</p>
              <p className="text-2xl font-bold text-text-primary">
                {confidence.label}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{
                color: confidence.color === 'success' ? '#10b981' : 
                       confidence.color === 'warning' ? '#f59e0b' : '#ef4444'
              }}>
                {score.overall}
                <span className="text-base text-text-muted">/100</span>
              </div>
            </div>
          </div>

          {/* What Will Be Restored */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Will Restore:
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-text-secondary">
                <span className="text-green-500">✓</span>
                <strong>{stats.filesCount}</strong> open file{stats.filesCount !== 1 && 's'}
              </li>
              <li className="flex items-center gap-2 text-text-secondary">
                <span className="text-green-500">✓</span>
                Terminal history ({(stats.terminalHistorySize / 1024).toFixed(1)} KB)
              </li>
              {stats.hasClaudeContext && (
                <li className="flex items-center gap-2 text-text-secondary">
                  <span className="text-green-500">✓</span>
                  Claude conversation context
                </li>
              )}
              <li className="flex items-center gap-2 text-text-secondary">
                <span className="text-green-500">✓</span>
                UI layout and cursor positions
              </li>
              {checkpoint.gitBranch && (
                <li className="flex items-center gap-2 text-text-secondary">
                  <span className="text-blue-500">ℹ</span>
                  Git branch: <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs">{checkpoint.gitBranch}</code>
                </li>
              )}
            </ul>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                ⚠️ Recovery Notes:
              </h4>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-300/80">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checkpoint Info */}
          <div className="text-xs text-text-muted">
            <p>Session: {checkpoint.sessionId.slice(0, 20)}...</p>
            <p>Checkpoint: {checkpoint.name}</p>
            <p>Type: {checkpoint.type === 'auto' ? '🤖 Auto-saved' : '📌 Manual'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-border p-6 flex gap-3">
          <button
            onClick={handleRecover}
            disabled={restoring}
            className="flex-1 px-6 py-3 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {restoring ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Restoring...
              </span>
            ) : (
              '🛟 Recover Session'
            )}
          </button>
          <button
            onClick={handleStartFresh}
            disabled={restoring}
            className="px-6 py-3 bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-50 text-text-primary font-semibold rounded-lg border border-border transition-colors"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
