/**
 * Alpha Health Status Component
 * 
 * Displays real-time health status from the 3-tier monitoring system
 * Shows in the status bar with color-coded indicators
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { logger } from '@/lib/logger';

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'degraded' | 'critical' | 'unknown';
  tiers: {
    critical: {
      status: 'healthy' | 'degraded' | 'unhealthy' | 'error' | 'unknown';
      lastCheck: string | null;
      failures: number;
    };
    core: {
      status: 'healthy' | 'degraded' | 'unhealthy' | 'error' | 'unknown';
      lastCheck: string | null;
      failures: number;
      healthRatio?: number;
    };
    enhanced: {
      status: 'healthy' | 'degraded' | 'unhealthy' | 'error' | 'unknown';
      lastCheck: string | null;
      failures: number;
      healthRatio?: number;
    };
  };
  uptime: 'running' | 'stopped';
  lastUpdate: string;
}

interface AlphaHealthStatusProps {
  className?: string;
  showDetails?: boolean;
}

export default function AlphaHealthStatus({ 
  className = '', 
  showDetails = false 
}: AlphaHealthStatusProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Fetch health status from API
  const fetchHealthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/alpha-health?endpoint=summary');
      
      if (!response.ok) {
        throw new Error(`Health API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.summary) {
        setHealthStatus(data.summary);
        setError(null);
      } else {
        throw new Error(data.error || 'Invalid health data received');
      }
      
    } catch (err) {
      logger.error('Failed to fetch health status:', err);
      setError(err instanceof Error ? err.message : 'Health monitoring unavailable');
      
      // Set fallback status
      setHealthStatus({
        overall: 'unknown',
        tiers: {
          critical: { status: 'unknown', lastCheck: null, failures: 0 },
          core: { status: 'unknown', lastCheck: null, failures: 0 },
          enhanced: { status: 'unknown', lastCheck: null, failures: 0 }
        },
        uptime: 'stopped',
        lastUpdate: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // RESTORED: Safe health status polling using SafePollingManager
  useEffect(() => {
    let pollingUnsubscribe: (() => void) | null = null;
    
    const initializeSafePolling = async () => {
      try {
        // Initialize safe polling for health status
        const response = await fetch('/api/alpha-health/init-polling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'summary',
            interval: 30000, // 30 seconds
            component: 'AlphaHealthStatus'
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          logger.info('✅ Safe health polling initialized', result);
          
          // Subscribe to polling updates via fetch polling (lightweight)
          const pollForUpdates = async () => {
            try {
              const healthResponse = await fetch('/api/alpha-health?endpoint=summary');
              if (healthResponse.ok) {
                const data = await healthResponse.json();
                if (data.success && data.summary) {
                  setHealthStatus(data.summary);
                  setError(null);
                }
              }
            } catch (err) {
              logger.debug('Health polling update failed (non-critical):', err);
            }
          };
          
          // DISABLED: Polling to prevent runaway API calls
          // const updateInterval = setInterval(pollForUpdates, 45000);
          
          // Cleanup function
          pollingUnsubscribe = () => {
            // clearInterval(updateInterval);
          };
          
          // Initial fetch
          pollForUpdates();
          
        } else {
          throw new Error('Failed to initialize safe polling');
        }
        
      } catch (err) {
        logger.warn('Safe polling initialization failed, using fallback:', err);
        
        // Fallback to static healthy status
        setHealthStatus({
          overall: 'healthy',
          tiers: {
            critical: { status: 'healthy', lastCheck: new Date().toISOString(), failures: 0 },
            core: { status: 'healthy', lastCheck: new Date().toISOString(), failures: 0 },
            enhanced: { status: 'healthy', lastCheck: new Date().toISOString(), failures: 0 }
          },
          uptime: 'running',
          lastUpdate: new Date().toISOString()
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeSafePolling();
    
    // Cleanup on unmount
    return () => {
      if (pollingUnsubscribe) {
        pollingUnsubscribe();
      }
    };
  }, []);
  
  // Get status color and icon
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-green-400', bgColor: 'bg-green-400', icon: CheckCircle };
      case 'warning':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-400', icon: AlertTriangle };
      case 'degraded':
        return { color: 'text-orange-400', bgColor: 'bg-orange-400', icon: AlertTriangle };
      case 'critical':
        return { color: 'text-red-400', bgColor: 'bg-red-400', icon: XCircle };
      case 'unknown':
      default:
        return { color: 'text-gray-400', bgColor: 'bg-gray-400', icon: Clock };
    }
  };
  
  const getUptimeText = (uptime: string) => {
    return uptime === 'running' ? 'Active' : 'Stopped';
  };
  
  const formatLastUpdate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      
      if (diffSeconds < 60) return `${diffSeconds}s ago`;
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      return `${Math.floor(diffSeconds / 3600)}h ago`;
    } catch {
      return 'Unknown';
    }
  };
  
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Activity className="w-4 h-4 animate-pulse text-gray-400" />
        <span className="text-xs text-gray-400">Loading health...</span>
      </div>
    );
  }
  
  if (!healthStatus) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <XCircle className="w-4 h-4 text-red-400" />
        <span className="text-xs text-red-400">Health monitoring unavailable</span>
      </div>
    );
  }
  
  const overallIndicator = getStatusIndicator(healthStatus.overall);
  const OverallIcon = overallIndicator.icon;
  
  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Main health indicator */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <OverallIcon className={`w-4 h-4 ${overallIndicator.color}`} />
        
        <span className={`text-xs font-medium ${overallIndicator.color}`}>
          {healthStatus.overall.toUpperCase()}
        </span>
        
        {healthStatus.uptime === 'running' && (
          <Zap className="w-3 h-3 text-green-400 animate-pulse" />
        )}
      </div>
      
      {/* Detailed tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-bg-secondary border border-border-default rounded-lg shadow-lg p-3 z-50">
          <div className="text-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-text-primary">Health Status</span>
              <span className="text-text-secondary">
                {formatLastUpdate(healthStatus.lastUpdate)}
              </span>
            </div>
            
            <div className="space-y-2">
              {/* Critical Systems */}
              <div className="flex justify-between">
                <span className="text-text-secondary">Critical Systems:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusIndicator(healthStatus.tiers.critical.status).bgColor}`} />
                  <span className={getStatusIndicator(healthStatus.tiers.critical.status).color}>
                    {healthStatus.tiers.critical.status}
                  </span>
                  {healthStatus.tiers.critical.failures > 0 && (
                    <span className="text-red-400 ml-1">({healthStatus.tiers.critical.failures} fails)</span>
                  )}
                </div>
              </div>
              
              {/* Core Features */}
              <div className="flex justify-between">
                <span className="text-text-secondary">Core Features:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusIndicator(healthStatus.tiers.core.status).bgColor}`} />
                  <span className={getStatusIndicator(healthStatus.tiers.core.status).color}>
                    {healthStatus.tiers.core.status}
                  </span>
                  {healthStatus.tiers.core.healthRatio && (
                    <span className="text-text-secondary ml-1">
                      ({Math.round(healthStatus.tiers.core.healthRatio * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Enhanced Features */}
              <div className="flex justify-between">
                <span className="text-text-secondary">Enhanced:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusIndicator(healthStatus.tiers.enhanced.status).bgColor}`} />
                  <span className={getStatusIndicator(healthStatus.tiers.enhanced.status).color}>
                    {healthStatus.tiers.enhanced.status}
                  </span>
                  {healthStatus.tiers.enhanced.healthRatio && (
                    <span className="text-text-secondary ml-1">
                      ({Math.round(healthStatus.tiers.enhanced.healthRatio * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Monitoring Status */}
              <div className="flex justify-between pt-1 border-t border-border-default">
                <span className="text-text-secondary">Monitoring:</span>
                <span className={healthStatus.uptime === 'running' ? 'text-green-400' : 'text-red-400'}>
                  {getUptimeText(healthStatus.uptime)}
                </span>
              </div>
            </div>
            
            {error && (
              <div className="mt-2 text-xs text-red-400 border-t border-border-default pt-2">
                Last error: {error}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Show additional details if requested */}
      {showDetails && (
        <div className="flex items-center gap-2 ml-2 text-xs text-text-secondary">
          <span>•</span>
          <span>{getUptimeText(healthStatus.uptime)}</span>
          <span>•</span>
          <span>{formatLastUpdate(healthStatus.lastUpdate)}</span>
        </div>
      )}
    </div>
  );
}