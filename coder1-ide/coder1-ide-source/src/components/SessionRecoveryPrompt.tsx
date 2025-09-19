/**
 * SessionRecoveryPrompt Component
 * 
 * UI component that prompts users to restore their previous session
 * when returning to the IDE after accidental navigation.
 */

import React, { useState } from 'react';
import './SessionRecoveryPrompt.css';

interface SessionRecoveryPromptProps {
  sessionAge: number; // in minutes
  onRestore: () => void;
  onDismiss: () => void;
  onExport: () => string;
  onImport: (data: string) => boolean;
  onClear: () => void;
}

export const SessionRecoveryPrompt: React.FC<SessionRecoveryPromptProps> = ({
  sessionAge,
  onRestore,
  onDismiss,
  onExport,
  onImport,
  onClear
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);

  const formatSessionAge = (minutes: number): string => {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    return `${hours}h ${remainingMins}m ago`;
  };

  const handleExport = () => {
    try {
      const data = onExport();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coder1-session-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session:', error);
      alert('Failed to export session data');
    }
  };

  const handleImport = () => {
    try {
      const success = onImport(importData);
      if (success) {
        setImportData('');
        setShowImport(false);
        alert('Session imported successfully! You can now restore it.');
      } else {
        alert('Failed to import session data. Please check the format.');
      }
    } catch (error) {
      console.error('Failed to import session:', error);
      alert('Failed to import session data');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="session-recovery-prompt">
      <div className="session-recovery-overlay" onClick={onDismiss} />
      
      <div className="session-recovery-modal">
        <div className="session-recovery-header">
          <h3>🔄 Session Recovery Available</h3>
          <button 
            className="session-recovery-close"
            onClick={onDismiss}
            title="Close and start fresh session"
          >
            ×
          </button>
        </div>
        
        <div className="session-recovery-content">
          <div className="session-recovery-message">
            <div className="session-info">
              <span className="session-icon">💾</span>
              <div className="session-details">
                <p>
                  <strong>Previous session found!</strong>
                </p>
                <p className="session-age">
                  Last saved: {formatSessionAge(sessionAge)}
                </p>
                <p className="session-description">
                  Your terminal connections, AI modes, and command history can be restored.
                </p>
              </div>
            </div>
          </div>
          
          <div className="session-recovery-actions">
            <button 
              className="session-action-btn primary"
              onClick={onRestore}
            >
              🔄 Restore Session
            </button>
            
            <button 
              className="session-action-btn secondary"
              onClick={onDismiss}
            >
              🆕 Start Fresh
            </button>
          </div>
          
          <div className="session-recovery-advanced">
            <button 
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>
            
            {showAdvanced && (
              <div className="advanced-options">
                <div className="advanced-section">
                  <h4>Manual Backup</h4>
                  <div className="advanced-actions">
                    <button 
                      className="advanced-btn"
                      onClick={handleExport}
                      title="Download session as JSON file"
                    >
                      📤 Export Session
                    </button>
                    
                    <button 
                      className="advanced-btn"
                      onClick={() => setShowImport(!showImport)}
                      title="Import session from JSON file"
                    >
                      📥 Import Session
                    </button>
                    
                    <button 
                      className="advanced-btn danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all session data? This cannot be undone.')) {
                          onClear();
                        }
                      }}
                      title="Permanently delete session data"
                    >
                      🗑️ Clear Data
                    </button>
                  </div>
                </div>
                
                {showImport && (
                  <div className="import-section">
                    <h4>Import Session Data</h4>
                    <div className="import-controls">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="file-input"
                      />
                      <p>Or paste JSON data:</p>
                      <textarea
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        placeholder="Paste session JSON data here..."
                        className="import-textarea"
                        rows={4}
                      />
                      <div className="import-actions">
                        <button 
                          className="advanced-btn"
                          onClick={handleImport}
                          disabled={!importData.trim()}
                        >
                          Import
                        </button>
                        <button 
                          className="advanced-btn"
                          onClick={() => {
                            setShowImport(false);
                            setImportData('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="session-recovery-footer">
          <p className="session-recovery-note">
            💡 Automatic session backup is enabled to prevent data loss from accidental navigation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionRecoveryPrompt;