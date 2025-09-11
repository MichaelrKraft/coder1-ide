/**
 * ContainerPanel - Container Management Interface
 * 
 * Displays active containers, allows spawning new ones, and provides controls
 * Integrates with the existing Discover panel as a new tab
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  GitBranch, 
  Clock, 
  Cpu, 
  MemoryStick,
  HardDrive,
  Activity,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { clientFeatures } from '@/lib/config';
import { useUIStore } from '@/stores/useUIStore';

interface ContainerSession {
  id: string;
  name: string;
  agentType: string;
  branch: string;
  status: 'spawning' | 'running' | 'idle' | 'stopped' | 'error';
  startTime: Date;
  lastActivity?: Date;
  resources?: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface ContainerStats {
  totalContainers: number;
  runningContainers: number;
  enabled: boolean;
  containers: ContainerSession[];
}

export default function ContainerPanel() {
  const [containers, setContainers] = useState<ContainerSession[]>([]);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('frontend');
  
  const { addToast } = useUIStore();

  // Available agent types
  const agentTypes = [
    { id: 'frontend', name: 'Frontend Specialist', icon: '🎨', description: 'React, UI/UX, styling' },
    { id: 'backend', name: 'Backend Specialist', icon: '⚙️', description: 'APIs, databases, server logic' },
    { id: 'database', name: 'Database Expert', icon: '🗄️', description: 'SQL, data modeling, optimization' },
    { id: 'security', name: 'Security Expert', icon: '🔐', description: 'Authentication, encryption, security' },
    { id: 'architect', name: 'System Architect', icon: '🏗️', description: 'System design, architecture' },
    { id: 'devops', name: 'DevOps Engineer', icon: '🔧', description: 'CI/CD, deployment, automation' }
  ];

  // Check if container mode is available
  const containerModeEnabled = clientFeatures.containers;

  // Load containers on mount and periodically
  useEffect(() => {
    if (!containerModeEnabled) return;
    
    fetchContainers();
    // DISABLED: Polling to prevent runaway API calls
    // const interval = setInterval(fetchContainers, 5000); // Refresh every 5 seconds
    
    // return () => clearInterval(interval);
  }, [containerModeEnabled]);

  // Fetch containers from API
  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/containers');
      const data = await response.json();
      
      if (data.success) {
        setContainers(data.containers);
        setStats(data.stats);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch containers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  // Spawn new container
  const spawnContainer = async (agentType: string) => {
    if (!containerModeEnabled) {
      addToast({
        message: 'Container mode is disabled. Enable in settings to use containers.',
        type: 'warning'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: `✅ Container spawned: ${data.container.name}`,
          type: 'success'
        });
        await fetchContainers(); // Refresh list
      } else {
        if (data.fallback === 'tmux') {
          addToast({
            message: `⚠️ Container mode unavailable, falling back to tmux: ${data.error}`,
            type: 'warning'
          });
        } else {
          addToast({
            message: `❌ Failed to spawn container: ${data.error}`,
            type: 'error'
          });
        }
      }
    } catch (err) {
      addToast({
        message: `❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Container actions
  const destroyContainer = async (containerId: string) => {
    try {
      const response = await fetch(`/api/containers/${containerId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: '✅ Container destroyed',
          type: 'success'
        });
        await fetchContainers();
      } else {
        addToast({
          message: `❌ Failed to destroy container: ${data.error}`,
          type: 'error'
        });
      }
    } catch (err) {
      addToast({
        message: `❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const resetContainer = async (containerId: string) => {
    try {
      const response = await fetch(`/api/containers/${containerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          message: '✅ Container reset successfully',
          type: 'success'
        });
        await fetchContainers();
      } else {
        addToast({
          message: `❌ Failed to reset container: ${data.error}`,
          type: 'error'
        });
      }
    } catch (err) {
      addToast({
        message: `❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  // Format uptime
  const formatUptime = (startTime: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'spawning': return <Loader className="w-3 h-3 text-yellow-400 animate-spin" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-400" />;
      default: return <Activity className="w-3 h-3 text-gray-400" />;
    }
  };

  if (!containerModeEnabled) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <Container className="w-12 h-12 mx-auto mb-3 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary mb-1">Container Mode Disabled</h3>
          <p className="text-xs text-text-muted mb-3">
            Enable container mode in settings to use isolated AI agent environments
          </p>
          <p className="text-xs text-text-muted opacity-75">
            Currently using tmux-based agent system
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 h-full flex flex-col">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Container className="w-4 h-4 text-coder1-cyan" />
          <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider">
            Container Dashboard
          </h4>
        </div>
        {stats && (
          <div className="text-xs text-text-muted">
            {stats.runningContainers}/{stats.totalContainers} active
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Spawn container section */}
      <div className="mb-4 p-3 bg-bg-tertiary rounded border border-border-default">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-3 h-3 text-coder1-cyan" />
          <span className="text-xs font-medium text-text-primary">Spawn New Agent Container</span>
        </div>
        
        <div className="flex gap-2 mb-2">
          <select 
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="flex-1 text-xs bg-bg-primary border border-border-default rounded px-2 py-1 text-text-primary"
          >
            {agentTypes.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.icon} {agent.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => spawnContainer(selectedAgent)}
            disabled={loading}
            className="px-3 py-1 bg-coder1-cyan text-bg-primary rounded text-xs font-medium hover:bg-coder1-cyan-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          </button>
        </div>
        
        <p className="text-xs text-text-muted">
          {agentTypes.find(a => a.id === selectedAgent)?.description}
        </p>
      </div>

      {/* Container list */}
      <div className="flex-1 overflow-y-auto">
        {containers.length === 0 ? (
          <div className="text-center py-8">
            <Container className="w-8 h-8 mx-auto mb-2 text-text-muted" />
            <p className="text-xs text-text-muted">No containers running</p>
            <p className="text-xs text-text-muted opacity-75">Spawn an agent to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {containers.map((container) => (
              <div key={container.id} className="p-2 bg-bg-tertiary border border-border-default rounded">
                {/* Container header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(container.status)}
                    <span className="text-xs font-medium text-text-primary">
                      {container.name}
                    </span>
                    <span className="text-xs text-text-muted px-1 py-0.5 bg-bg-primary rounded">
                      {container.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => resetContainer(container.id)}
                      className="p-1 hover:bg-bg-primary rounded transition-colors"
                      title="Reset container"
                    >
                      <RotateCcw className="w-3 h-3 text-text-muted hover:text-text-secondary" />
                    </button>
                    <button
                      onClick={() => destroyContainer(container.id)}
                      className="p-1 hover:bg-bg-primary rounded transition-colors"
                      title="Destroy container"
                    >
                      <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Container details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-text-muted">
                    <GitBranch className="w-3 h-3" />
                    {container.branch}
                  </div>
                  <div className="flex items-center gap-1 text-text-muted">
                    <Clock className="w-3 h-3" />
                    {formatUptime(container.startTime)}
                  </div>
                  {container.resources && (
                    <>
                      <div className="flex items-center gap-1 text-text-muted">
                        <Cpu className="w-3 h-3" />
                        {Math.round(container.resources.cpu)}%
                      </div>
                      <div className="flex items-center gap-1 text-text-muted">
                        <MemoryStick className="w-3 h-3" />
                        {Math.round(container.resources.memory)}MB
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}