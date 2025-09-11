/**
 * Walk-Away Supervision Demo Component
 * 
 * Simple demo to test the walk-away supervision functionality
 * This can be temporarily added to any page to test the system
 */

'use client';

import React, { useState } from 'react';
import { useWalkAwaySupervision } from '@/lib/hooks/useWalkAwaySupervision';
import WalkAwayReportModal from './WalkAwayReportModal';
import SupervisionAlerts from './SupervisionAlerts';
import { Shield, Play, Pause, Square, FileText, Terminal, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function WalkAwaySupervisionDemo() {
  const [demoTask, setDemoTask] = useState("Build a user authentication system with login, logout, and password reset functionality");

  const {
    activeSession,
    isSessionActive,
    isSessionPaused,
    lastReport,
    currentIssues,
    alerts,
    showReportModal,
    setShowReportModal,
    hasCriticalIssues,
    criticalIssueCount,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    trackFileChange,
    trackTerminalCommand,
    trackCommit,
    trackError,
    trackClaudeAction,
    dismissAlert,
    generateCurrentReport
  } = useWalkAwaySupervision();

  const handleStartDemo = async () => {
    if (!demoTask.trim()) return;
    
    try {
      await startSession(demoTask);
      logger.debug('Demo session started');
      
      // Simulate some activities after a delay
      setTimeout(() => simulateActivities(), 2000);
    } catch (error) {
      logger.error('Failed to start demo session:', error);
    }
  };

  const simulateActivities = () => {
    if (!isSessionActive) return;

    // Simulate file changes
    trackFileChange('src/auth/login.js', 45);
    trackFileChange('src/auth/register.js', 32);
    trackFileChange('src/auth/password-reset.js', 18);
    
    // Simulate terminal commands
    trackTerminalCommand('npm install bcrypt', true);
    trackTerminalCommand('npm install jsonwebtoken', true);
    trackTerminalCommand('npm test auth', false);
    
    // Simulate a commit
    trackCommit('Add basic authentication structure', ['src/auth/login.js', 'src/auth/register.js']);
    
    // Simulate Claude actions
    trackClaudeAction('Generated authentication middleware');
    trackClaudeAction('Added password hashing functionality');
    
    // Simulate some errors after delay
    setTimeout(() => {
      trackError('TypeError: Cannot read property \'email\' of undefined', 'src/auth/login.js:23');
      trackError('Database connection failed', 'src/config/database.js');
      
      // Simulate repeating error (should trigger stuck detection)
      setTimeout(() => {
        trackError('Database connection failed', 'src/config/database.js');
        trackError('Database connection failed', 'src/config/database.js');
        trackError('Database connection failed', 'src/config/database.js');
      }, 5000);
      
    }, 3000);
    
    // Simulate security vulnerability
    setTimeout(() => {
      const userEmail = 'test@example.com'; // Demo data
      trackFileChange('src/auth/login.js - Added: SELECT * FROM users WHERE email = "' + userEmail + '"', 12);
    }, 7000);
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-400" />
          Walk-Away Supervision Demo
        </h1>

        {/* Session Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          
          {!isSessionActive ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Task Description:</label>
                <textarea
                  value={demoTask}
                  onChange={(e) => setDemoTask(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded-lg text-white resize-none"
                  rows={3}
                  placeholder="Describe the task for Claude Code to work on..."
                />
              </div>
              <button
                onClick={handleStartDemo}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-colors"
                disabled={!demoTask.trim()}
              >
                <Play className="w-4 h-4" />
                Start Walk-Away Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Session ID</div>
                  <div className="text-sm font-mono">{activeSession?.id.slice(-8)}...</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Status</div>
                  <div className={`text-sm font-medium ${
                    isSessionPaused ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {isSessionPaused ? 'Paused' : 'Active'}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Task</div>
                  <div className="text-sm line-clamp-2">{activeSession?.originalTask}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Issues</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{currentIssues.length} total</span>
                    {criticalIssueCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {criticalIssueCount} critical
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {!isSessionPaused ? (
                  <button
                    onClick={pauseSession}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Pause Session
                  </button>
                ) : (
                  <button
                    onClick={resumeSession}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Resume Session
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    await generateCurrentReport();
                    setShowReportModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  View Report
                </button>
                
                <button
                  onClick={endSession}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  End Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Demo Controls */}
        {isSessionActive && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Demo Actions</h2>
            <p className="text-gray-400 text-sm mb-4">
              Simulate activities to test the supervision system:
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => trackFileChange('src/components/NewComponent.tsx', Math.floor(Math.random() * 100))}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                File Change
              </button>
              
              <button
                onClick={() => trackTerminalCommand(`npm install ${['axios', 'lodash', 'moment'][Math.floor(Math.random() * 3)]}`, Math.random() > 0.3)}
                className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
              >
                <Terminal className="w-4 h-4" />
                Command
              </button>
              
              <button
                onClick={() => trackCommit('Add new feature', ['src/feature.js'])}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
              >
                Commit
              </button>
              
              <button
                onClick={() => trackError(`Error: ${['Connection failed', 'Undefined property', 'Invalid syntax'][Math.floor(Math.random() * 3)]}`, 'src/app.js')}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                Error
              </button>
            </div>
          </div>
        )}

        {/* Current Issues Display */}
        {currentIssues.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Current Issues</h2>
            <div className="space-y-3">
              {currentIssues.map((issue, index) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${
                    issue.severity === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    issue.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                    'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{issue.title}</h3>
                      <p className="text-sm mt-1 opacity-90">{issue.description}</p>
                      {issue.location && (
                        <p className="text-xs mt-1 opacity-70">📍 {issue.location}</p>
                      )}
                    </div>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded">
                      {issue.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Supervision Components */}
      <SupervisionAlerts
        alerts={alerts}
        criticalIssues={currentIssues}
        onDismissAlert={dismissAlert}
        onPauseSession={pauseSession}
        onResumeSession={resumeSession}
        onReviewIssue={(issue) => logger.debug('Review issue:', issue)}
        isSessionPaused={isSessionPaused}
      />

      <WalkAwayReportModal
        report={lastReport}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onDismissIssue={(issueId) => logger.debug('Dismiss issue:', issueId)}
      />
    </div>
  );
}