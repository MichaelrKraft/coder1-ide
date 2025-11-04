'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Zap, DollarSign, Activity, TrendingUp, Hash } from 'lucide-react';

interface SessionMetrics {
  sessionDuration: number; // in seconds
  totalTokens: { input: number; output: number };
  totalCost: number;
  commandCount: number;
  averageResponseTime: number; // in ms
  currentBurnRate: number; // tokens per minute
}

interface SessionMetricsBarProps {
  sessionId: string | null;
  isProcessing?: boolean;
  claudeActive?: boolean;
}

export default function SessionMetricsBar({ 
  sessionId, 
  isProcessing = false,
  claudeActive = false 
}: SessionMetricsBarProps) {
  // Debug: Log claudeActive changes
  React.useEffect(() => {
    console.log('📊 [SessionMetricsBar] claudeActive changed:', claudeActive);
  }, [claudeActive]);
  
  const [metrics, setMetrics] = useState<SessionMetrics>({
    sessionDuration: 0,
    totalTokens: { input: 0, output: 0 },
    totalCost: 0,
    commandCount: 0,
    averageResponseTime: 0,
    currentBurnRate: 0
  });

  const [sessionStartTime] = useState(Date.now());
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Update session duration every second
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Fetch token usage from API
  useEffect(() => {
    if (!sessionId) return;

    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/claude/usage?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Calculate burn rate (tokens per minute) using current metrics
            const prevInputTokens = metrics.totalTokens.input;
            const prevOutputTokens = metrics.totalTokens.output;
            const timeDiff = (Date.now() - lastUpdateTime) / 60000; // in minutes
            const tokenDiff = (data.inputTokens + data.outputTokens) - 
                             (prevInputTokens + prevOutputTokens);
            
            setMetrics(prev => ({
              ...prev,
              totalTokens: {
                input: data.inputTokens || 0,
                output: data.outputTokens || 0
              },
              totalCost: data.cost || 0,
              commandCount: data.commandCount || prev.commandCount,
              currentBurnRate: (timeDiff > 0 && tokenDiff > 0) 
                ? Math.round(tokenDiff / timeDiff) 
                : prev.currentBurnRate
            }));
            setLastUpdateTime(Date.now());
          }
        }
      } catch (error) {
        console.error('Failed to fetch session metrics:', error);
      }
    };

    // 🔇 DISABLED: Aggressive polling causing second question freeze (Feb 1, 2025)
    // Fetch immediately and then every 5 seconds for real-time updates
    // fetchMetrics();
    // const interval = setInterval(fetchMetrics, 5000);
    // return () => clearInterval(interval);
  }, [sessionId, lastUpdateTime]);

  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format cost as currency
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  // Format large numbers with K/M suffixes
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div 
      className="flex items-center justify-center px-4 py-2 bg-bg-primary/90 border-t border-border-primary text-xs backdrop-blur-sm"
      style={{
        height: '32px',
        position: 'relative',
        flexShrink: 0
      }}
    >
      {/* Centered metrics */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Clock className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-mono">{formatDuration(metrics.sessionDuration)}</span>
        </div>
        
        {metrics.commandCount > 0 && (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Hash className="w-3.5 h-3.5 text-green-500" />
            <span>{metrics.commandCount} cmds</span>
          </div>
        )}

        {(metrics.totalTokens.input + metrics.totalTokens.output) > 0 && (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span className="font-mono">
              {formatNumber(metrics.totalTokens.input + metrics.totalTokens.output)} tokens
            </span>
          </div>
        )}

        {metrics.currentBurnRate > 0 && (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <span>{formatNumber(metrics.currentBurnRate)} t/min</span>
          </div>
        )}

        {metrics.totalCost > 0 && (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <span className="font-mono font-medium">{formatCost(metrics.totalCost)}</span>
          </div>
        )}

        {/* Estimated cost per hour */}
        {metrics.currentBurnRate > 0 && (
          <div className="text-text-muted">
            ~{formatCost(metrics.currentBurnRate * 60 * 0.00001)}/hr
          </div>
        )}

        {claudeActive && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            <span className="text-orange-500 font-medium animate-pulse">🤖 Claude is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}