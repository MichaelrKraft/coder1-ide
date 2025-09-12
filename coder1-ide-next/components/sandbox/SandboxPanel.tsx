/**
 * SandboxPanel - UI for managing agent sandbox environments
 * 
 * Allows users to spawn AI agents in isolated sandboxes for parallel task execution
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Play, 
  Square, 
  Check,
  X,
  Trash2, 
  Upload,
  FolderOpen,
  Copy,
  TestTube,
  Cpu,
  HardDrive,
  Clock,
  AlertCircle,
  Loader,
  RefreshCw,
  ChevronRight,
  Grid
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useUIStore } from '@/stores/useUIStore';
import SandboxComparisonView from './SandboxComparisonView';

interface Sandbox {
  id: string;
  projectId: string;
  status: 'creating' | 'ready' | 'running' | 'stopped' | 'error';
  path: string;
  createdAt: Date;
  lastActivity: Date;
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  processCount?: number;
}

export default function SandboxPanel() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSandbox, setSelectedSandbox] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('my-project');
  const [baseFrom, setBaseFrom] = useState('');
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [showComparisonView, setShowComparisonView] = useState(false);
  
  const { addToast } = useUIStore();

  // Debug logging on component mount
  useEffect(() => {
    logger.debug('🏗️ SandboxPanel mounted');
    logger.debug('📋 Initial projectId:', projectId);
    logger.debug('🔄 Initial loading:', loading);
    logger.debug('🌍 Environment NEXT_PUBLIC_EXPRESS_BACKEND_URL:', process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL);
  }, []);

  const loadSandboxes = useCallback(async () => {
    try {
      // Use the correct backend URL instead of relative path
      const backendUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/sandbox`, {
        headers: {
          'x-user-id': getUserId()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSandboxes(data.sandboxes || []);
        logger.debug('✅ Sandboxes loaded:', data);
      } else {
        logger.error('❌ Failed to load sandboxes:', { status: response.status, statusText: response.statusText });
      }
    } catch (error) {
      logger.error('Failed to load sandboxes:', error);
      addToast({
        message: 'Failed to connect to backend. Check if Express server is running.',
        type: 'error'
      });
    }
  }, [addToast]);

  // Load sandboxes on mount
  useEffect(() => {
    loadSandboxes();
    // DISABLED: Polling to prevent runaway API calls
    // const interval = setInterval(loadSandboxes, 10000); // Refresh every 10 seconds
    // return () => clearInterval(interval);
  }, [loadSandboxes]);

  const getUserId = () => {
    // In production, get from auth context
    return localStorage.getItem('userId') || 'default-user';
  };

  const createSandbox = async () => {
    setLoading(true);
    logger.debug('🚀 Creating sandbox with projectId:', projectId);
    
    try {
      // Use the correct backend URL instead of relative path
      const backendUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3002';
      logger.debug('🎯 Backend URL:', backendUrl);
      logger.debug('📦 Environment variable NEXT_PUBLIC_EXPRESS_BACKEND_URL:', process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL);
      
      const response = await fetch(`${backendUrl}/api/sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getUserId()
        },
        body: JSON.stringify({
          projectId,
          baseFrom: baseFrom || undefined,
          maxCpu: 50,      // 50% CPU
          maxMemory: 2048, // 2GB RAM
          maxDisk: 5120,   // 5GB disk
          timeLimit: 3600  // 1 hour
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: `✅ Sandbox created: ${data.sandbox.id.slice(-8)}`,
          type: 'success'
        });
        await loadSandboxes();
        setSelectedSandbox(data.sandbox.id);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addToast({
        message: `❌ Failed to create sandbox: ${error}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const runCommand = async (sandboxId: string, command: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/sandbox/${sandboxId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'run',
          command
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: '✅ Command executed',
          type: 'success'
        });
        return data.result;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addToast({
        message: `❌ Command failed: ${error}`,
        type: 'error'
      });
    }
  };

  const testSandbox = async (sandboxId: string) => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/sandbox/${sandboxId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'test'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [sandboxId]: data.test
        }));
        
        const icon = data.test.passed ? '✅' : '❌';
        addToast({
          message: `${icon} Tests ${data.test.passed ? 'passed' : 'failed'}`,
          type: data.test.passed ? 'success' : 'error'
        });
      }
    } catch (error) {
      addToast({
        message: `❌ Test failed: ${error}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const promoteSandbox = async (sandboxId: string) => {
    if (!confirm('Promote this sandbox to main workspace? This will replace your current project.')) {
      return;
    }
    
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/sandbox/${sandboxId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'promote'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: '✅ Sandbox promoted to main workspace',
          type: 'success'
        });
        await loadSandboxes();
      }
    } catch (error) {
      addToast({
        message: `❌ Promotion failed: ${error}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const connectToSandbox = async (sandboxId: string) => {
    try {
      // Find the sandbox to get its details
      const sandbox = sandboxes.find(s => s.id === sandboxId);
      if (!sandbox) {
        addToast({
          message: '❌ Sandbox not found',
          type: 'error'
        });
        return;
      }

      // Emit event to terminal to switch context
      window.dispatchEvent(new CustomEvent('sandbox-connect', {
        detail: {
          sandboxId: sandbox.id,
          projectId: sandbox.projectId,
          sessionName: `coder1-${sandboxId}`,
          path: sandbox.path
        }
      }));

      addToast({
        message: `🔌 Connected to sandbox: ${sandbox.projectId}`,
        type: 'success'
      });

      logger.debug('🔌 Connecting terminal to sandbox:', sandbox);
    } catch (error) {
      addToast({
        message: `❌ Failed to connect to sandbox: ${error}`,
        type: 'error'
      });
    }
  };

  const destroySandbox = async (sandboxId: string) => {
    if (!confirm('Destroy this sandbox? All changes will be lost.')) {
      return;
    }
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/sandbox/${sandboxId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: '✅ Sandbox destroyed',
          type: 'success'
        });
        
        // Disconnect terminal if connected to this sandbox
        window.dispatchEvent(new CustomEvent('sandbox-disconnect', {
          detail: { sandboxId }
        }));
        
        await loadSandboxes();
        if (selectedSandbox === sandboxId) {
          setSelectedSandbox(null);
        }
      }
    } catch (error) {
      addToast({
        message: `❌ Failed to destroy sandbox: ${error}`,
        type: 'error'
      });
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400';
      case 'running': return 'text-blue-400';
      case 'stopped': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  return (
    <div className="p-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-coder1-cyan" />
          <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider">
            Agent Sandboxes
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {sandboxes.length >= 2 && (
            <button
              onClick={() => setShowComparisonView(true)}
              className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs rounded transition-all duration-200 flex items-center gap-1 shadow-lg animate-pulse"
            >
              <Grid className="w-3 h-3" />
              Compare All
            </button>
          )}
          <span className="text-xs text-text-muted">
            {sandboxes.length}/5 active
          </span>
        </div>
      </div>

      {/* Create Sandbox */}
      <div className="mb-4 p-3 bg-bg-tertiary rounded border border-border-default">
        <div className="flex items-center gap-2 mb-2">
          <Play className="w-3 h-3 text-coder1-cyan" />
          <span className="text-xs font-medium text-text-primary">Spawn Agent Sandbox</span>
        </div>
        
        <div className="space-y-2">
          <input
            type="text"
            value={projectId}
            onChange={(e) => {
              logger.debug('📝 Project ID changed to:', e.target.value);
              setProjectId(e.target.value);
            }}
            placeholder="Agent type (e.g., frontend, backend)"
            className="w-full text-xs bg-bg-primary border border-border-default rounded px-2 py-1 text-text-primary"
          />
          
          <input
            type="text"
            value={baseFrom}
            onChange={(e) => setBaseFrom(e.target.value)}
            placeholder="Copy workspace from (optional)"
            className="w-full text-xs bg-bg-primary border border-border-default rounded px-2 py-1 text-text-primary"
          />
          
          <button
            onClick={() => {
              logger.debug('🖱️ Create Sandbox button clicked!');
              logger.debug('📋 Current projectId:', projectId);
              logger.debug('🔄 Current loading state:', loading);
              logger.debug('❌ Button disabled?', loading || !projectId);
              createSandbox();
            }}
            disabled={loading || !projectId}
            className="w-full px-3 py-1 bg-coder1-cyan text-bg-primary rounded text-xs font-medium hover:bg-coder1-cyan-secondary disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Create Sandbox
          </button>
        </div>
      </div>

      {/* Sandbox List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {sandboxes.length === 0 ? (
          <div className="text-center py-8">
            <Box className="w-8 h-8 mx-auto mb-2 text-text-muted" />
            <p className="text-xs text-text-muted">No agent sandboxes running</p>
            <p className="text-xs text-text-muted opacity-75">Spawn an agent to start parallel task execution</p>
          </div>
        ) : (
          sandboxes.map((sandbox) => (
            <div 
              key={sandbox.id}
              className={`p-3 bg-bg-tertiary border rounded cursor-pointer transition-colors ${
                selectedSandbox === sandbox.id 
                  ? 'border-coder1-cyan' 
                  : 'border-border-default hover:border-border-hover'
              }`}
              onClick={() => setSelectedSandbox(sandbox.id)}
            >
              {/* Sandbox Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(sandbox.status)}`} />
                  <span className="text-xs font-medium text-text-primary">
                    {sandbox.projectId}
                  </span>
                  <span className="text-xs text-text-muted">
                    #{sandbox.id.slice(-6)}
                  </span>
                </div>
                <span className="text-xs text-text-muted">
                  {formatTime(sandbox.lastActivity)}
                </span>
              </div>

              {/* Resource Usage */}
              <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                <div className="flex items-center gap-1 text-text-muted">
                  <Cpu className="w-3 h-3" />
                  {Math.round(sandbox.resources.cpuUsage)}%
                </div>
                <div className="flex items-center gap-1 text-text-muted">
                  <HardDrive className="w-3 h-3" />
                  {sandbox.resources.memoryUsage}MB
                </div>
                <div className="flex items-center gap-1 text-text-muted">
                  <FolderOpen className="w-3 h-3" />
                  {sandbox.resources.diskUsage}MB
                </div>
              </div>

              {/* Test Results */}
              {testResults[sandbox.id] && (
                <div className={`text-xs p-2 rounded mb-2 ${
                  testResults[sandbox.id].passed 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {testResults[sandbox.id].passed ? '✅ Tests passed' : '❌ Tests failed'}
                </div>
              )}

              {/* Actions */}
              {selectedSandbox === sandbox.id && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      connectToSandbox(sandbox.id);
                    }}
                    className="p-1.5 hover:bg-bg-primary rounded transition-colors"
                    title="Connect terminal to sandbox"
                  >
                    <ChevronRight className="w-3 h-3 text-coder1-cyan" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      testSandbox(sandbox.id);
                    }}
                    className="p-1.5 hover:bg-bg-primary rounded transition-colors"
                    title="Run tests"
                  >
                    <TestTube className="w-3 h-3 text-text-secondary" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      promoteSandbox(sandbox.id);
                    }}
                    className="p-1.5 hover:bg-bg-primary rounded transition-colors"
                    title="Promote to main"
                  >
                    <Upload className="w-3 h-3 text-green-400" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      destroySandbox(sandbox.id);
                    }}
                    className="p-1.5 hover:bg-bg-primary rounded transition-colors ml-auto"
                    title="Destroy sandbox"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick Commands */}
      {selectedSandbox && (
        <div className="mt-3 p-2 bg-bg-tertiary rounded border border-border-default">
          <div className="text-xs text-text-muted mb-1">Quick Commands:</div>
          <div className="flex flex-wrap gap-1">
            {['npm install', 'npm test', 'npm run build'].map(cmd => (
              <button
                key={cmd}
                onClick={() => selectedSandbox && runCommand(selectedSandbox, cmd)}
                className="px-2 py-0.5 text-xs bg-bg-primary rounded hover:bg-bg-secondary transition-colors text-text-secondary"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sandbox Comparison View */}
      {showComparisonView && (
        <SandboxComparisonView
          sandboxIds={sandboxes.map(s => s.id)}
          onClose={() => setShowComparisonView(false)}
          onPromote={(sandboxId) => {
            setShowComparisonView(false);
            addToast({
              message: `✅ Sandbox ${sandboxId.slice(-6)} promoted!`,
              type: 'success'
            });
            loadSandboxes(); // Refresh the list
          }}
        />
      )}
    </div>
  );
}