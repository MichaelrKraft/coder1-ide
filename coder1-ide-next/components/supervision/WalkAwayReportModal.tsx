/**
 * Walk-Away Report Modal
 * 
 * Simple, clean component for displaying session reports when user returns
 */

'use client';

import React, { useState } from 'react';
import { X, Clock, FileText, Terminal, GitCommit, AlertTriangle, CheckCircle, Circle, AlertCircle, Info } from 'lucide-react';
import { WalkAwayReport, SessionActivity, CriticalIssue } from '@/types/walk-away-supervision';
import { logger } from '@/lib/logger';

interface WalkAwayReportModalProps {
  report: WalkAwayReport | null;
  isOpen: boolean;
  onClose: () => void;
  onDismissIssue?: (issueId: string) => void;
}

export default function WalkAwayReportModal({ 
  report, 
  isOpen, 
  onClose, 
  onDismissIssue 
}: WalkAwayReportModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'activities' | 'issues' | 'recommendations'>('summary');

  if (!isOpen || !report) return null;

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (type: SessionActivity['type']) => {
    switch (type) {
      case 'file-change': return <FileText className="w-4 h-4" />;
      case 'terminal-command': return <Terminal className="w-4 h-4" />;
      case 'commit': return <GitCommit className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getProgressIcon = (progress: number) => {
    if (progress === 100) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (progress > 0) return <Clock className="w-5 h-5 text-yellow-400" />;
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-blue-400 bg-blue-500/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Walk-Away Session Report</h2>
            <p className="text-gray-400 text-sm mt-1">{report.session.originalTask}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'summary', label: 'Summary', icon: Info },
            { id: 'activities', label: 'Activities', icon: Terminal },
            { id: 'issues', label: 'Issues', icon: AlertTriangle, count: report.issues.critical.length },
            { id: 'recommendations', label: 'Next Steps', icon: CheckCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Session Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{report.summary.duration}</div>
                  <div className="text-gray-400 text-sm">Duration</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{report.summary.filesModified}</div>
                  <div className="text-gray-400 text-sm">Files Modified</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{report.summary.commitsCreated}</div>
                  <div className="text-gray-400 text-sm">Commits</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{report.summary.errorsEncountered}</div>
                  <div className="text-gray-400 text-sm">Errors</div>
                </div>
              </div>

              {/* Progress Overview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Progress Overview</h3>
                
                {report.progress.completed.length > 0 && (
                  <div>
                    <h4 className="text-green-400 font-medium mb-2">✅ Completed ({report.progress.completed.length})</h4>
                    <div className="space-y-2">
                      {report.progress.completed.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-green-500/10 rounded-lg p-3">
                          {getProgressIcon(item.estimatedProgress)}
                          <span className="text-white">{item.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.progress.inProgress.length > 0 && (
                  <div>
                    <h4 className="text-yellow-400 font-medium mb-2">🔄 In Progress ({report.progress.inProgress.length})</h4>
                    <div className="space-y-2">
                      {report.progress.inProgress.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-yellow-500/10 rounded-lg p-3">
                          {getProgressIcon(item.estimatedProgress)}
                          <span className="text-white">{item.description}</span>
                          <span className="text-yellow-400 text-sm ml-auto">{item.estimatedProgress}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.progress.blocked.length > 0 && (
                  <div>
                    <h4 className="text-red-400 font-medium mb-2">⚠️ Blocked ({report.progress.blocked.length})</h4>
                    <div className="space-y-2">
                      {report.progress.blocked.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-red-500/10 rounded-lg p-3">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <span className="text-white">{item.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Recent Activities</h3>
              <div className="space-y-2">
                {report.activities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{activity.description}</p>
                      {activity.details?.filePath && (
                        <p className="text-gray-400 text-xs mt-1">{activity.details.filePath}</p>
                      )}
                      {activity.details?.errorMessage && (
                        <p className="text-red-400 text-xs mt-1">{activity.details.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {formatTime(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Issues Detected</h3>
              
              {report.issues.critical.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-red-400 font-medium">Critical Issues</h4>
                  {report.issues.critical.map((issue, index) => (
                    <div key={index} className={`p-4 rounded-lg ${getSeverityColor(issue.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium">{issue.title}</h5>
                          <p className="text-sm mt-1 opacity-90">{issue.description}</p>
                          {issue.location && (
                            <p className="text-xs mt-1 opacity-70">Location: {issue.location}</p>
                          )}
                          <p className="text-sm mt-2 font-medium">Suggested Action:</p>
                          <p className="text-sm opacity-90">{issue.suggestedAction}</p>
                        </div>
                        {onDismissIssue && (
                          <button
                            onClick={() => onDismissIssue(issue.id)}
                            className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {report.issues.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-yellow-400 font-medium">Warnings</h4>
                  {report.issues.warnings.map((warning, index) => (
                    <div key={index} className="p-3 rounded-lg bg-yellow-500/10 text-yellow-400">
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              {report.issues.notes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-blue-400 font-medium">Notes</h4>
                  {report.issues.notes.map((note, index) => (
                    <div key={index} className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                      {note}
                    </div>
                  ))}
                </div>
              )}

              {report.issues.critical.length === 0 && report.issues.warnings.length === 0 && report.issues.notes.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p>No issues detected during this session!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Recommendations</h3>
              
              {report.recommendations.nextSteps.length > 0 && (
                <div>
                  <h4 className="text-cyan-400 font-medium mb-3">🎯 Immediate Next Steps</h4>
                  <div className="space-y-2">
                    {report.recommendations.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-cyan-500/10 rounded-lg">
                        <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-white">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.recommendations.completionTasks.length > 0 && (
                <div>
                  <h4 className="text-green-400 font-medium mb-3">✅ Completion Tasks</h4>
                  <div className="space-y-2">
                    {report.recommendations.completionTasks.map((task, index) => (
                      <div key={index} className="p-3 bg-green-500/10 rounded-lg text-white">
                        {task}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.recommendations.qualityImprovements.length > 0 && (
                <div>
                  <h4 className="text-purple-400 font-medium mb-3">⭐ Quality Improvements</h4>
                  <div className="space-y-2">
                    {report.recommendations.qualityImprovements.map((improvement, index) => (
                      <div key={index} className="p-3 bg-purple-500/10 rounded-lg text-white">
                        {improvement}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              // Export functionality could be added here
              logger.debug('Export report:', report);
            }}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}