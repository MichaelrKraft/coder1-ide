'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Database,
  Cpu,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface BaselineStats {
  sessionCreation: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  memory: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  apiResponse: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: {
    min: number;
    max: number;
    avg: number;
  };
}

interface FeatureStatus {
  enabled: boolean;
  rolloutPercentage?: number;
  userCount?: number;
  config?: any;
}

export default function MonitoringDashboard() {
  const [baselineStats, setBaselineStats] = useState<BaselineStats | null>(null);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [features, setFeatures] = useState<Record<string, FeatureStatus>>({});
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Fetch baseline statistics
  const fetchBaseline = async () => {
    try {
      const response = await fetch('/api/metrics/baseline');
      const data = await response.json();
      
      if (data.success) {
        setBaselineStats(data.statistics);
        setHasEnoughData(data.hasEnoughData);
      }
    } catch (error) {
      console.error('Failed to fetch baseline:', error);
    }
  };
  
  // Fetch feature flags
  const fetchFeatures = async () => {
    try {
      const response = await fetch('/api/features');
      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
      }
    } catch (error) {
      console.error('Failed to fetch features:', error);
    }
  };
  
  // Fetch health status
  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/monitoring/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      // Health endpoint might not exist yet
    }
  };
  
  // Start baseline collection
  const startCollection = async () => {
    try {
      const response = await fetch('/api/metrics/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', intervalMs: 60000 })
      });
      
      const data = await response.json();
      if (data.success) {
        setIsCollecting(true);
        alert('Baseline collection started. Will run for 48 hours.');
      }
    } catch (error) {
      console.error('Failed to start collection:', error);
    }
  };
  
  // Stop baseline collection
  const stopCollection = async () => {
    try {
      const response = await fetch('/api/metrics/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const data = await response.json();
      if (data.success) {
        setIsCollecting(false);
        alert('Baseline collection stopped.');
        fetchBaseline();
      }
    } catch (error) {
      console.error('Failed to stop collection:', error);
    }
  };
  
  // Refresh all data
  const refreshAll = () => {
    setLastUpdate(new Date());
    fetchBaseline();
    fetchFeatures();
    fetchHealth();
  };
  
  // Initial load and periodic refresh
  useEffect(() => {
    refreshAll();
    
    const interval = setInterval(refreshAll, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Format number with precision
  const fmt = (num: number | undefined, decimals = 2) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toFixed(decimals);
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-400" />
            Monitoring Dashboard
          </h1>
          <p className="text-gray-400">
            Phase 0: Baseline Metrics Collection | Safe Implementation Monitoring
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
            <button
              onClick={refreshAll}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Collection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-gray-500">Collection</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {hasEnoughData ? 'Complete' : 'In Progress'}
            </div>
            <div className="text-xs text-gray-400">
              {hasEnoughData ? '48+ hours collected' : 'Collecting baseline data...'}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-5 h-5 text-green-400" />
              <span className="text-xs text-gray-500">Data Points</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {baselineStats ? '2,880+' : '0'}
            </div>
            <div className="text-xs text-gray-400">
              Metrics collected
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-gray-500">Health</span>
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              healthStatus?.overall ? getStatusColor(healthStatus.overall) : 'text-gray-400'
            }`}>
              {healthStatus?.overall || 'Unknown'}
            </div>
            <div className="text-xs text-gray-400">
              System status
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-gray-500">Features</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {Object.values(features).filter((f: any) => f.enabled).length}/{Object.keys(features).length}
            </div>
            <div className="text-xs text-gray-400">
              Enhanced features active
            </div>
          </div>
        </div>
        
        {/* Baseline Statistics */}
        {baselineStats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Baseline Performance Metrics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Session Creation */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Session Creation Time</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Average:</span>
                    <span className="font-mono">{fmt(baselineStats.sessionCreation.avg)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P50:</span>
                    <span className="font-mono">{fmt(baselineStats.sessionCreation.p50)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P95:</span>
                    <span className="font-mono">{fmt(baselineStats.sessionCreation.p95)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P99:</span>
                    <span className="font-mono">{fmt(baselineStats.sessionCreation.p99)}ms</span>
                  </div>
                </div>
              </div>
              
              {/* Memory Usage */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Memory Usage</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Average:</span>
                    <span className="font-mono">{fmt(baselineStats.memory.avg)}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P50:</span>
                    <span className="font-mono">{fmt(baselineStats.memory.p50)}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P95:</span>
                    <span className="font-mono">{fmt(baselineStats.memory.p95)}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P99:</span>
                    <span className="font-mono">{fmt(baselineStats.memory.p99)}MB</span>
                  </div>
                </div>
              </div>
              
              {/* API Response */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">API Response Time</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Average:</span>
                    <span className="font-mono">{fmt(baselineStats.apiResponse.avg)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P50:</span>
                    <span className="font-mono">{fmt(baselineStats.apiResponse.p50)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P95:</span>
                    <span className="font-mono">{fmt(baselineStats.apiResponse.p95)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P99:</span>
                    <span className="font-mono">{fmt(baselineStats.apiResponse.p99)}ms</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Error Rate */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Error Rate</h3>
              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Average:</span>
                  <span className="font-mono">{(baselineStats.errorRate.avg * 100).toFixed(3)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Min:</span>
                  <span className="font-mono">{(baselineStats.errorRate.min * 100).toFixed(3)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Max:</span>
                  <span className="font-mono">{(baselineStats.errorRate.max * 100).toFixed(3)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Feature Flags */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Feature Flags
          </h2>
          
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Feature</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-400">Rollout %</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-400">Users</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(features).map(([name, status]) => (
                  <tr key={name} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-4 text-sm font-mono">{name}</td>
                    <td className="p-4 text-center">
                      {status.enabled ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <AlertCircle className="w-4 h-4" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center text-sm">
                      {status.rolloutPercentage ?? 0}%
                    </td>
                    <td className="p-4 text-center text-sm">
                      {status.userCount ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex gap-4">
          {!isCollecting && !hasEnoughData && (
            <button
              onClick={startCollection}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              Start Baseline Collection
            </button>
          )}
          
          {isCollecting && (
            <button
              onClick={stopCollection}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
            >
              Stop Collection
            </button>
          )}
          
          {hasEnoughData && (
            <div className="px-6 py-2 bg-gray-800 rounded-lg border border-green-500 text-green-400">
              ✅ Baseline collection complete - Ready for Phase 1
            </div>
          )}
        </div>
      </div>
    </div>
  );
}