/**
 * SandboxComparisonView - The Revolutionary Multiverse Development Dashboard
 * 
 * Shows multiple sandboxes running in parallel with:
 * - Live terminal output
 * - Side-by-side previews
 * - Real-time performance metrics
 * - Test results comparison
 * - One-click promotion
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Grid, Terminal, Globe, Activity, TestTube, 
  GitBranch, Upload, X, Maximize2, Minimize2,
  Play, Pause, RefreshCw, Check, AlertCircle,
  Cpu, HardDrive, Clock, Zap, TrendingUp,
  ChevronRight, Copy, GitMerge, Eye
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useUIStore } from '@/stores/useUIStore';
import { logger } from '@/lib/logger';

interface SandboxView {
  id: string;
  projectId: string;
  status: 'ready' | 'running' | 'testing' | 'error';
  terminal: {
    output: string[];
    isConnected: boolean;
  };
  preview: {
    url: string;
    isLoading: boolean;
  };
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    bundleSize: number;
    lighthouse: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
    };
  };
  tests: {
    total: number;
    passed: number;
    failed: number;
    running: boolean;
  };
  gitBranch: string;
  lastUpdate: Date;
}

interface ComparisonViewProps {
  sandboxIds: string[];
  onClose?: () => void;
  onPromote?: (sandboxId: string) => void;
}

export default function SandboxComparisonView({ 
  sandboxIds, 
  onClose,
  onPromote 
}: ComparisonViewProps) {
  const [sandboxes, setSandboxes] = useState<Map<string, SandboxView>>(new Map());
  const [selectedSandbox, setSelectedSandbox] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'grid' | 'focus'>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  
  const socketsRef = useRef<Map<string, Socket>>(new Map());
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  
  const { addToast } = useUIStore();

  // Initialize sandboxes and connect to their terminals
  useEffect(() => {
    sandboxIds.forEach(id => {
      initializeSandbox(id);
      connectToSandboxTerminal(id);
    });

    // Start metrics collection
    if (autoRefresh) {
      metricsIntervalRef.current = setInterval(updateAllMetrics, 2000);
    }

    return () => {
      // Cleanup
      socketsRef.current.forEach(socket => socket.disconnect());
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [sandboxIds]);

  const initializeSandbox = async (sandboxId: string) => {
    try {
      const response = await fetch(`/api/sandbox/${sandboxId}`);
      const data = await response.json();
      
      if (data.success) {
        const sandbox: SandboxView = {
          id: sandboxId,
          projectId: data.sandbox.projectId,
          status: 'ready',
          terminal: {
            output: [],
            isConnected: false
          },
          preview: {
            url: `http://localhost:${4001 + sandboxIds.indexOf(sandboxId)}`,
            isLoading: true
          },
          metrics: {
            cpuUsage: 0,
            memoryUsage: 0,
            responseTime: 0,
            bundleSize: 0,
            lighthouse: {
              performance: 0,
              accessibility: 0,
              bestPractices: 0,
              seo: 0
            }
          },
          tests: {
            total: 0,
            passed: 0,
            failed: 0,
            running: false
          },
          gitBranch: `sandbox-${sandboxId.slice(-6)}`,
          lastUpdate: new Date()
        };
        
        setSandboxes(prev => new Map(prev).set(sandboxId, sandbox));
      }
    } catch (error) {
      logger.error(`Failed to initialize sandbox ${sandboxId}:`, error);
    }
  };

  const connectToSandboxTerminal = (sandboxId: string) => {
    const socket = io('/', {
      query: { sandboxId }
    });

    socket.on('connect', () => {
      logger.debug(`Connected to sandbox ${sandboxId} terminal`);
      updateSandbox(sandboxId, {
        terminal: { output: [], isConnected: true }
      });
    });

    socket.on('terminal:data', ({ data }) => {
      appendTerminalOutput(sandboxId, data);
    });

    socket.on('disconnect', () => {
      updateSandbox(sandboxId, {
        terminal: { output: [], isConnected: false }
      });
    });

    socketsRef.current.set(sandboxId, socket);
  };

  const appendTerminalOutput = (sandboxId: string, data: string) => {
    setSandboxes(prev => {
      const newMap = new Map(prev);
      const sandbox = newMap.get(sandboxId);
      if (sandbox) {
        sandbox.terminal.output.push(data);
        // Keep last 100 lines
        if (sandbox.terminal.output.length > 100) {
          sandbox.terminal.output = sandbox.terminal.output.slice(-100);
        }
        sandbox.lastUpdate = new Date();
      }
      return newMap;
    });

    // Auto-scroll terminal
    const terminalEl = terminalRefs.current.get(sandboxId);
    if (terminalEl) {
      terminalEl.scrollTop = terminalEl.scrollHeight;
    }
  };

  const updateSandbox = (sandboxId: string, updates: Partial<SandboxView>) => {
    setSandboxes(prev => {
      const newMap = new Map(prev);
      const sandbox = newMap.get(sandboxId);
      if (sandbox) {
        Object.assign(sandbox, updates);
        sandbox.lastUpdate = new Date();
      }
      return newMap;
    });
  };

  const updateAllMetrics = async () => {
    for (const sandboxId of sandboxIds) {
      try {
        // Fetch real metrics from API
        const response = await fetch(`/api/sandbox/${sandboxId}/metrics`);
        const data = await response.json();
        
        if (data.success) {
          updateSandbox(sandboxId, {
            metrics: data.metrics
          });
        }
      } catch (error) {
        logger.debug(`Failed to fetch metrics for ${sandboxId}`);
      }
    }
  };

  const runTests = async (sandboxId: string) => {
    updateSandbox(sandboxId, {
      tests: { total: 0, passed: 0, failed: 0, running: true }
    });

    try {
      const response = await fetch(`/api/sandbox/${sandboxId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        updateSandbox(sandboxId, {
          tests: {
            total: data.test.results.tests || 0,
            passed: data.test.results.passed || 0,
            failed: data.test.results.failed || 0,
            running: false
          },
          status: data.test.passed ? 'ready' : 'error'
        });
      }
    } catch (error) {
      updateSandbox(sandboxId, {
        tests: { total: 0, passed: 0, failed: 0, running: false },
        status: 'error'
      });
    }
  };

  const promoteSandbox = async (sandboxId: string) => {
    if (!confirm(`Promote sandbox ${sandboxId} to main workspace?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/sandbox/${sandboxId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promote' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: '✅ Sandbox promoted successfully!',
          type: 'success'
        });
        onPromote?.(sandboxId);
      }
    } catch (error) {
      addToast({
        message: '❌ Failed to promote sandbox',
        type: 'error'
      });
    }
  };

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'score') => {
    if (type === 'score') {
      if (value >= 90) return 'text-green-400';
      if (value >= 70) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value <= 30) return 'text-green-400';
      if (value <= 60) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const renderSandboxPanel = (sandbox: SandboxView, index: number) => {
    const isSelected = selectedSandbox === sandbox.id;
    const gridCols = sandboxIds.length === 2 ? 'col-span-6' : 'col-span-4';
    
    return (
      <div
        key={sandbox.id}
        className={`${gridCols} border rounded-lg bg-bg-secondary ${
          isSelected ? 'border-coder1-cyan' : 'border-border-default'
        } flex flex-col`}
        onClick={() => setSelectedSandbox(sandbox.id)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              sandbox.status === 'running' ? 'bg-blue-400' :
              sandbox.status === 'error' ? 'bg-red-400' :
              'bg-green-400'
            }`} />
            <span className="text-xs font-medium text-text-primary">
              {sandbox.projectId}
            </span>
            <span className="text-xs text-text-muted">
              #{sandbox.id.slice(-6)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                runTests(sandbox.id);
              }}
              className="p-1 hover:bg-bg-primary rounded"
              title="Run tests"
            >
              <TestTube className="w-3 h-3 text-text-secondary" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                promoteSandbox(sandbox.id);
              }}
              className="p-1 hover:bg-bg-primary rounded"
              title="Promote to main"
            >
              <Upload className="w-3 h-3 text-green-400" />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-3 py-1 bg-bg-tertiary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3 text-text-muted" />
              <span className="text-xs text-text-muted">Terminal</span>
              {sandbox.terminal.isConnected && (
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
            <GitBranch className="w-3 h-3 text-text-muted" />
          </div>
          
          <div
            ref={el => {
              if (el) terminalRefs.current.set(sandbox.id, el);
            }}
            className="flex-1 bg-black p-2 overflow-y-auto font-mono text-xs text-green-400"
            style={{ minHeight: '150px', maxHeight: '200px' }}
          >
            {sandbox.terminal.output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="border-t border-border-default">
          <div className="px-3 py-1 bg-bg-tertiary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-text-muted" />
              <span className="text-xs text-text-muted">Preview</span>
            </div>
            <a
              href={sandbox.preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-coder1-cyan hover:text-coder1-cyan-secondary"
            >
              {sandbox.preview.url}
            </a>
          </div>
          
          <div className="h-48 bg-white">
            <iframe
              src={sandbox.preview.url}
              className="w-full h-full"
              title={`Preview ${sandbox.id}`}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>

        {/* Metrics */}
        {showMetrics && (
          <div className="border-t border-border-default px-3 py-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-text-muted" />
                <span className={getMetricColor(sandbox.metrics.cpuUsage, 'cpu')}>
                  {sandbox.metrics.cpuUsage}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-text-muted" />
                <span className={getMetricColor(sandbox.metrics.memoryUsage / 10, 'memory')}>
                  {sandbox.metrics.memoryUsage}MB
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-text-muted" />
                <span className={getMetricColor(sandbox.metrics.lighthouse.performance, 'score')}>
                  {sandbox.metrics.lighthouse.performance}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-text-muted" />
                <span className="text-text-secondary">
                  {sandbox.metrics.responseTime}ms
                </span>
              </div>
            </div>
            
            {/* Test Results */}
            {sandbox.tests.total > 0 && (
              <div className="mt-2 pt-2 border-t border-border-default">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Tests:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">✓ {sandbox.tests.passed}</span>
                    <span className="text-red-400">✗ {sandbox.tests.failed}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-border-default px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid className="w-5 h-5 text-coder1-cyan" />
          <h2 className="text-lg font-semibold text-text-primary">
            Sandbox Comparison Mode
          </h2>
          <span className="text-sm text-text-muted">
            {sandboxIds.length} parallel environments
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`px-3 py-1 text-xs rounded ${
              showMetrics ? 'bg-coder1-cyan text-black' : 'bg-bg-secondary text-text-secondary'
            }`}
          >
            <Activity className="w-3 h-3 inline mr-1" />
            Metrics
          </button>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-xs rounded ${
              autoRefresh ? 'bg-green-500 text-white' : 'bg-bg-secondary text-text-secondary'
            }`}
          >
            <RefreshCw className={`w-3 h-3 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto
          </button>
          
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-secondary rounded"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-12 gap-4">
          {Array.from(sandboxes.values()).map((sandbox, index) => 
            renderSandboxPanel(sandbox, index)
          )}
        </div>
      </div>

      {/* Comparison Summary */}
      <div className="border-t border-border-default px-4 py-3 bg-bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">Best Performance:</span>
            <span className="text-green-400 font-medium">
              {(() => {
                const best = Array.from(sandboxes.values()).reduce((prev, curr) => 
                  curr.metrics.lighthouse.performance > prev.metrics.lighthouse.performance ? curr : prev
                );
                return best ? `${best.projectId} (${best.metrics.lighthouse.performance})` : '-';
              })()}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">Lowest Memory:</span>
            <span className="text-blue-400 font-medium">
              {(() => {
                const best = Array.from(sandboxes.values()).reduce((prev, curr) => 
                  curr.metrics.memoryUsage < prev.metrics.memoryUsage ? curr : prev
                );
                return best ? `${best.projectId} (${best.metrics.memoryUsage}MB)` : '-';
              })()}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">All Tests Passing:</span>
            <span className="text-green-400 font-medium">
              {Array.from(sandboxes.values()).filter(s => 
                s.tests.total > 0 && s.tests.failed === 0
              ).length} / {sandboxes.size}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}