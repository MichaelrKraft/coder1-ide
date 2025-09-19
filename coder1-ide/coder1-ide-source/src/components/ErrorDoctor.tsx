import React, { useState, useEffect } from 'react';
import './ErrorDoctor.css';

interface Fix {
  title: string;
  description: string;
  command?: string;
  confidence: 'high' | 'medium' | 'low';
  requiresFileEdit?: boolean;
}

interface ErrorAnalysis {
  success: boolean;
  source: string;
  confidence: string;
  fixes: Fix[];
  explanation?: string;
  metadata?: {
    timestamp: string;
    analysisTime: number;
    errorLength: number;
    contextProvided: boolean;
  };
}

interface ErrorDoctorEvent {
  sessionId: string;
  analysis: ErrorAnalysis;
  timestamp: number;
}

interface ErrorDoctorProps {
  socket: any;
  terminalId?: string;
  onApplyFix?: (fix: Fix) => void;
}

const ErrorDoctor: React.FC<ErrorDoctorProps> = ({ socket, terminalId, onApplyFix }) => {
  const [analyses, setAnalyses] = useState<ErrorDoctorEvent[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isUserToggleEnabled, setIsUserToggleEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastAppliedFix, setLastAppliedFix] = useState<string | null>(null);
  const [isSilentMode, setIsSilentMode] = useState(true); // Default to silent mode

  useEffect(() => {
    if (!socket) return;

    // Load user toggle preference from localStorage
    const savedToggleState = localStorage.getItem('errorDoctor.userToggle');
    if (savedToggleState !== null) {
      setIsUserToggleEnabled(JSON.parse(savedToggleState));
    }
    
    // Load silent mode preference from localStorage (default to true)
    const savedSilentMode = localStorage.getItem('errorDoctor.silentMode');
    if (savedSilentMode !== null) {
      setIsSilentMode(JSON.parse(savedSilentMode));
    } else {
      // Default to silent mode and save it
      setIsSilentMode(true);
      localStorage.setItem('errorDoctor.silentMode', JSON.stringify(true));
    }

    // Check Error Doctor status
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/error-doctor/status');
        const data = await response.json();
        if (data.success) {
          setStatus(data.status);
          setIsEnabled(data.status.enabled);
          // If user toggle is different from server, sync it
          if (data.status.userToggleEnabled !== undefined) {
            const userToggle = data.status.userToggleEnabled;
            setIsUserToggleEnabled(userToggle);
            localStorage.setItem('errorDoctor.userToggle', JSON.stringify(userToggle));
          }
        }
      } catch (error) {
        console.warn('Error Doctor status check failed:', error);
        setIsEnabled(false);
      }
    };

    checkStatus();

    // Listen for error analyses
    const handleErrorAnalysis = (event: ErrorDoctorEvent) => {
      console.log('🔍 Error Doctor: Received analysis', event);
      
      // Only show panel if user toggle is enabled
      if (!isUserToggleEnabled) {
        console.log('🔇 Error Doctor: Analysis received but user toggle is disabled');
        return;
      }
      
      // If in silent mode, don't show the panel (errors still go to Agent Dashboard)
      if (isSilentMode) {
        console.log('🔕 Error Doctor: Silent mode - not showing popup');
        return;
      }
      
      // Clear any existing auto-hide timer
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        setAutoHideTimer(null);
      }
      
      setAnalyses(prev => {
        const newAnalyses = [event, ...prev].slice(0, 10); // Keep last 10 analyses
        return newAnalyses;
      });
      setIsVisible(true); // Show the panel when new analysis arrives
      
      // Auto-hide after 2 minutes if no interaction
      const timer = setTimeout(() => {
        setIsVisible(false);
        setAutoHideTimer(null);
      }, 120000); // 2 minutes
      
      setAutoHideTimer(timer);
    };

    // Listen for fix application results
    const handleFixApplied = (event: any) => {
      console.log('✅ Error Doctor: Fix applied', event);
      
      // Show success message
      setLastAppliedFix(event.fix?.title || 'Fix applied successfully');
      
      // Clear the auto-hide timer when fix is applied
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        setAutoHideTimer(null);
      }
      
      // Auto-close panel after successful fix (after 3 seconds)
      const closeTimer = setTimeout(() => {
        setIsVisible(false);
        setAnalyses([]);
        setLastAppliedFix(null);
      }, 3000);
      
      setAutoHideTimer(closeTimer);
    };

    const handleFixError = (event: any) => {
      console.error('❌ Error Doctor: Fix error', event);
      // Keep panel open on error so user can see what went wrong
    };

    socket.on('error-doctor:analysis', handleErrorAnalysis);
    socket.on('error-doctor:fix-applied', handleFixApplied);
    socket.on('error-doctor:fix-error', handleFixError);

    return () => {
      socket.off('error-doctor:analysis', handleErrorAnalysis);
      socket.off('error-doctor:fix-applied', handleFixApplied);
      socket.off('error-doctor:fix-error', handleFixError);
      
      // Clean up auto-hide timer
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [socket, autoHideTimer, isUserToggleEnabled]);

  const handleToggleErrorDoctor = async (enabled: boolean) => {
    try {
      console.log(`🔧 Error Doctor: User toggling to ${enabled ? 'enabled' : 'disabled'}`);
      
      // Update local state immediately for responsive UI
      setIsUserToggleEnabled(enabled);
      localStorage.setItem('errorDoctor.userToggle', JSON.stringify(enabled));
      
      // If disabling, hide the panel and clear analyses
      if (!enabled) {
        setIsVisible(false);
        setAnalyses([]);
        setLastAppliedFix(null);
        if (autoHideTimer) {
          clearTimeout(autoHideTimer);
          setAutoHideTimer(null);
        }
      }
      
      // Send to backend API
      const response = await fetch('/api/error-doctor/toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Error Doctor: Toggle ${enabled ? 'enabled' : 'disabled'} successfully`);
      } else {
        console.error('❌ Error Doctor: Toggle failed:', result.error);
        // Revert local state on failure
        setIsUserToggleEnabled(!enabled);
        localStorage.setItem('errorDoctor.userToggle', JSON.stringify(!enabled));
      }
    } catch (error) {
      console.error('❌ Error Doctor: Toggle request failed:', error);
      // Revert local state on failure
      setIsUserToggleEnabled(!enabled);
      localStorage.setItem('errorDoctor.userToggle', JSON.stringify(!enabled));
    }
  };

  const handleApplyFix = (fix: Fix) => {
    if (!socket || !terminalId) {
      console.error('Error Doctor: Cannot apply fix - no socket or terminal ID');
      return;
    }

    // Clear auto-hide timer when user interacts
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }

    console.log('🔧 Error Doctor: Applying fix', fix);
    socket.emit('error-doctor:apply-fix', {
      sessionId: terminalId,
      fix: fix
    });

    if (onApplyFix) {
      onApplyFix(fix);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '#10b981'; // green
      case 'medium':
        return '#f59e0b'; // amber
      case 'low':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'quick-fix':
        return '⚡';
      case 'claude-ai':
        return '🤖';
      case 'openai':
        return '🧠';
      default:
        return '🔍';
    }
  };

  if (!isEnabled || !isUserToggleEnabled) {
    // Still render a minimal header for toggle when user has disabled it
    if (!isUserToggleEnabled && isEnabled) {
      return (
        <div className="error-doctor hidden">
          <div className="error-doctor-header">
            <div className="error-doctor-title">
              <span className="error-doctor-icon">🩺</span>
              Error Doctor (Disabled)
            </div>
            <div className="error-doctor-controls">
              <button 
                className="toggle-error-doctor-btn disabled" 
                onClick={() => handleToggleErrorDoctor(true)}
                title="Enable Error Doctor"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null; // Don't render if Error Doctor is disabled by environment
  }

  return (
    <div className={`error-doctor ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="error-doctor-header">
        <div className="error-doctor-title">
          <span className="error-doctor-icon">🩺</span>
          Error Doctor
          {(status && status.aiServices.openai) || status?.aiServices.anthropic ? (
            <span className="ai-indicator">AI</span>
          ) : (
            <span className="quick-fix-indicator">Quick Fix</span>
          )}
        </div>
        <div className="error-doctor-controls">
          <button 
            className={`toggle-error-doctor-btn ${isUserToggleEnabled ? 'enabled' : 'disabled'}`}
            onClick={() => handleToggleErrorDoctor(!isUserToggleEnabled)}
            title={isUserToggleEnabled ? 'Disable Error Doctor' : 'Enable Error Doctor'}
          >
            {isUserToggleEnabled ? 'ON' : 'OFF'}
          </button>
          {analyses.length > 0 && (
            <button 
              className="close-panel-btn" 
              onClick={() => {
                setAnalyses([]);
                setIsVisible(false);
              }}
              title="Clear all analyses and close panel"
            >
              ✕
            </button>
          )}
          <button 
            className="toggle-visibility" 
            onClick={() => setIsVisible(!isVisible)}
            title={isVisible ? 'Hide Error Doctor' : 'Show Error Doctor'}
          >
            {isVisible ? '−' : '+'}
          </button>
        </div>
      </div>

      {isVisible && (
        <div className="error-doctor-content">
          {lastAppliedFix && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span className="success-text">Applied: {lastAppliedFix}</span>
              <span className="auto-close-notice">(closing in 3s)</span>
            </div>
          )}
          
          {analyses.length === 0 ? (
            <div className="no-analyses">
              <div className="no-analyses-icon">🔍</div>
              <div className="no-analyses-text">
                Monitoring for errors...
                <br />
                <span className="no-analyses-subtext">
                  I'll automatically analyze any errors that appear in your terminal
                </span>
              </div>
            </div>
          ) : (
            <div className="analyses-list">
              {analyses.map((analysis, index) => (
                <div key={`${analysis.timestamp}-${index}`} className="analysis-item">
                  <div className="analysis-header">
                    <span className="analysis-source">
                      {getSourceIcon(analysis.analysis.source)} {analysis.analysis.source}
                    </span>
                    <span 
                      className="analysis-confidence"
                      style={{ color: getConfidenceColor(analysis.analysis.confidence) }}
                    >
                      {analysis.analysis.confidence} confidence
                    </span>
                  </div>

                  {analysis.analysis.explanation && (
                    <div className="analysis-explanation">
                      {analysis.analysis.explanation}
                    </div>
                  )}

                  <div className="fixes-list">
                    {analysis.analysis.fixes.map((fix, fixIndex) => (
                      <div key={fixIndex} className="fix-item">
                        <div className="fix-header">
                          <span className="fix-title">{fix.title}</span>
                          <span 
                            className="fix-confidence"
                            style={{ color: getConfidenceColor(fix.confidence) }}
                          >
                            {fix.confidence}
                          </span>
                        </div>
                        
                        <div className="fix-description">
                          {fix.description}
                        </div>

                        {fix.command && (
                          <div className="fix-command">
                            <code>{fix.command}</code>
                          </div>
                        )}

                        <div className="fix-actions">
                          {fix.command ? (
                            <button
                              className="apply-fix-btn"
                              onClick={() => handleApplyFix(fix)}
                              title="Apply this fix automatically"
                            >
                              🔧 Apply Fix
                            </button>
                          ) : (
                            <span className="manual-fix-note">
                              ℹ️ Manual intervention required
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="analysis-timestamp">
                    {new Date(analysis.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {analyses.length > 0 && (
            <div className="error-doctor-footer">
              <button 
                className="clear-analyses-btn"
                onClick={() => {
                  setAnalyses([]);
                  setLastAppliedFix(null);
                  if (autoHideTimer) {
                    clearTimeout(autoHideTimer);
                    setAutoHideTimer(null);
                  }
                }}
                title="Clear all analyses"
              >
                🗑️ Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorDoctor;