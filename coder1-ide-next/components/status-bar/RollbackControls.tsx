/**
 * Rollback Controls Component
 * 
 * Provides rollback management interface in the status bar:
 * - Create backups
 * - View backup history  
 * - Perform rollbacks
 * - Emergency recovery
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, RotateCcw, AlertTriangle, Clock, HardDrive, CheckCircle, XCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Backup {
  id: string;
  type: string;
  timestamp: string;
  components: string[];
  componentStatus: { [key: string]: string };
  metadata?: {
    gitBranch?: string;
    gitCommit?: string;
    nodeVersion?: string;
    platform?: string;
  };
}

interface RollbackStatus {
  backupCount: number;
  activeRollbacks: number;
  rollbackHistory: number;
  lastActivity: string | null;
}

interface RollbackControlsProps {
  className?: string;
  showDetails?: boolean;
}

export default function RollbackControls({ 
  className = '', 
  showDetails = false 
}: RollbackControlsProps) {
  const [rollbackStatus, setRollbackStatus] = useState<RollbackStatus | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isPerformingRollback, setIsPerformingRollback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  
  // Fetch rollback status
  const fetchRollbackStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/rollback/status');
      
      if (!response.ok) {
        throw new Error(`Rollback API returned ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Rollback API returned empty response');
      }
      
      const data = JSON.parse(text);
      
      if (data.success && data.rollback) {
        setRollbackStatus(data.rollback);
        setError(null);
      } else {
        throw new Error(data.error || 'Invalid rollback status data');
      }
      
    } catch (err) {
      logger.error('Failed to fetch rollback status:', err);
      setError(err instanceof Error ? err.message : 'Rollback system unavailable');
    }
  }, []);
  
  // Fetch backup list
  const fetchBackups = useCallback(async () => {
    try {
      const response = await fetch('/api/rollback/backups');
      
      if (!response.ok) {
        throw new Error(`Backup API returned ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Backup API returned empty response');
      }
      
      const data = JSON.parse(text);
      
      if (data.success && data.backups) {
        setBackups(data.backups);
      } else {
        throw new Error(data.error || 'Failed to load backups');
      }
      
    } catch (err) {
      logger.error('Failed to fetch backups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    }
  }, []);
  
  // Create new backup
  const createBackup = async (type: string = 'manual') => {
    setIsCreatingBackup(true);
    setError(null);
    
    try {
      const response = await fetch('/api/rollback/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          metadata: {
            source: 'status-bar',
            userInitiated: true
          }
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Backup creation failed (${response.status})`);
      }
      
      setLastAction(`Created backup: ${data.backup.id.substr(0, 8)}`);
      
      // Refresh data
      await Promise.all([
        fetchRollbackStatus(),
        fetchBackups()
      ]);
      
    } catch (err) {
      logger.error('Failed to create backup:', err);
      setError(err instanceof Error ? err.message : 'Backup creation failed');
    } finally {
      setIsCreatingBackup(false);
    }
  };
  
  // Perform rollback
  const performRollback = async (backupId: string) => {
    if (!confirm(`Are you sure you want to rollback to backup ${backupId.substr(0, 8)}? This will restore the system to a previous state.`)) {
      return;
    }
    
    setIsPerformingRollback(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/rollback/restore/${backupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          createPreRollbackBackup: true,
          continueOnError: false
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Rollback failed (${response.status})`);
      }
      
      setLastAction(`Rollback completed: ${data.rollback.stepsCompleted} steps`);
      
      // Refresh data
      await Promise.all([
        fetchRollbackStatus(),
        fetchBackups()
      ]);
      
    } catch (err) {
      logger.error('Failed to perform rollback:', err);
      setError(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setIsPerformingRollback(false);
    }
  };
  
  // Emergency rollback
  const emergencyRollback = async () => {
    if (!confirm('EMERGENCY ROLLBACK: This will restore the system to the most recent stable backup. Continue?')) {
      return;
    }
    
    setIsPerformingRollback(true);
    setError(null);
    
    try {
      const response = await fetch('/api/rollback/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Emergency rollback failed (${response.status})`);
      }
      
      setLastAction(`Emergency rollback completed`);
      
      // Refresh data
      await Promise.all([
        fetchRollbackStatus(),
        fetchBackups()
      ]);
      
    } catch (err) {
      logger.error('Emergency rollback failed:', err);
      setError(err instanceof Error ? err.message : 'Emergency rollback failed');
    } finally {
      setIsPerformingRollback(false);
    }
  };
  
  // Set up polling for rollback status updates
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchRollbackStatus(),
        fetchBackups()
      ]);
      setIsLoading(false);
    };
    
    loadData();
    
    // DISABLED: Polling to prevent runaway API calls
    // const interval = setInterval(() => {
    //   if (!isCreatingBackup && !isPerformingRollback) {
    //     fetchRollbackStatus();
    //   }
    // }, 60000);
    
    // return () => clearInterval(interval);
  }, [fetchRollbackStatus, fetchBackups, isCreatingBackup, isPerformingRollback]);
  
  // Clear last action after 10 seconds
  useEffect(() => {
    if (lastAction) {
      const timeout = setTimeout(() => setLastAction(null), 10000);
      return () => clearTimeout(timeout);
    }
  }, [lastAction]);
  
  const getStatusColor = () => {
    if (error) return 'text-red-400';
    if (isCreatingBackup || isPerformingRollback) return 'text-yellow-400';
    if (rollbackStatus?.activeRollbacks && rollbackStatus.activeRollbacks > 0) return 'text-orange-400';
    return 'text-green-400';
  };
  
  const getStatusIcon = () => {
    if (error) return XCircle;
    if (isCreatingBackup || isPerformingRollback) return Clock;
    if (rollbackStatus?.activeRollbacks && rollbackStatus.activeRollbacks > 0) return AlertTriangle;
    return Database;
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };
  
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className="w-4 h-4 animate-pulse text-gray-400" />
        <span className="text-xs text-gray-400">Loading rollback...</span>
      </div>
    );
  }
  
  const StatusIcon = getStatusIcon();
  const statusColor = getStatusColor();
  
  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Main rollback indicator */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setShowPanel(!showPanel)}
      >
        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
        
        <span className={`text-xs font-medium ${statusColor}`}>
          {lastAction ? lastAction.split(':')[0] : 
           error ? 'ERROR' :
           isCreatingBackup ? 'CREATING' :
           isPerformingRollback ? 'ROLLING BACK' :
           `${rollbackStatus?.backupCount || 0} BACKUPS`}
        </span>
        
        {rollbackStatus?.activeRollbacks && rollbackStatus.activeRollbacks > 0 && (
          <RotateCcw className="w-3 h-3 text-orange-400 animate-spin" />
        )}
      </div>
      
      {/* Control panel */}
      {showPanel && (
        <div className="absolute bottom-full left-0 mb-2 w-96 bg-bg-secondary border border-border-default rounded-lg shadow-lg p-3 z-50">
          <div className="text-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-text-primary">Rollback Management</span>
              <button
                onClick={() => setShowPanel(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                ×
              </button>
            </div>
            
            {/* Status overview */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-bg-tertiary rounded p-2">
                <div className="font-medium text-text-secondary">Backups</div>
                <div className={statusColor}>{rollbackStatus?.backupCount || 0}</div>
              </div>
              <div className="bg-bg-tertiary rounded p-2">
                <div className="font-medium text-text-secondary">History</div>
                <div className="text-text-primary">{rollbackStatus?.rollbackHistory || 0}</div>
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => createBackup('manual')}
                disabled={isCreatingBackup || isPerformingRollback}
                className="flex-1 bg-coder1-cyan hover:bg-coder1-cyan/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black text-xs py-1.5 px-2 rounded font-medium"
              >
                {isCreatingBackup ? 'Creating...' : 'Create Backup'}
              </button>
              <button
                onClick={emergencyRollback}
                disabled={isCreatingBackup || isPerformingRollback || !rollbackStatus?.backupCount}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs py-1.5 px-2 rounded font-medium"
              >
                Emergency Rollback
              </button>
            </div>
            
            {/* Recent backups */}
            <div className="space-y-2">
              <div className="font-medium text-text-secondary">Recent Backups</div>
              {backups.length === 0 ? (
                <div className="text-text-secondary text-center py-2">No backups available</div>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {backups.slice(0, 5).map((backup) => (
                    <div key={backup.id} className="bg-bg-tertiary rounded p-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-text-primary">
                            {backup.id.substr(0, 8)} ({backup.type})
                          </div>
                          <div className="text-text-secondary text-xs">
                            {formatTimestamp(backup.timestamp)}
                          </div>
                          <div className="text-text-secondary text-xs">
                            {backup.components.join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() => performRollback(backup.id)}
                          disabled={isCreatingBackup || isPerformingRollback}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs py-1 px-2 rounded"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Error display */}
            {error && (
              <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-400/20 rounded p-2">
                Error: {error}
              </div>
            )}
            
            {/* Last action display */}
            {lastAction && (
              <div className="mt-2 text-xs text-green-400 bg-green-900/20 border border-green-400/20 rounded p-2">
                {lastAction}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Show additional details if requested */}
      {showDetails && rollbackStatus && (
        <div className="flex items-center gap-2 ml-2 text-xs text-text-secondary">
          <span>•</span>
          <span>{rollbackStatus.backupCount} backups</span>
          {rollbackStatus.activeRollbacks > 0 && (
            <>
              <span>•</span>
              <span className="text-orange-400">{rollbackStatus.activeRollbacks} active</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}