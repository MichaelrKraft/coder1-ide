import React, { useState, useEffect } from 'react';
import { MultiWorkspaceOrchestrator, WorkspaceInstance, ClaudeAgentSupervisor } from '../services/MultiWorkspaceOrchestrator';
import './WorkspaceInstanceManager.css';

interface WorkspaceInstanceManagerProps {
  orchestrator: MultiWorkspaceOrchestrator;
}

export const WorkspaceInstanceManager: React.FC<WorkspaceInstanceManagerProps> = ({
  orchestrator
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceInstance[]>([]);
  const [supervisors, setSupervisors] = useState<ClaudeAgentSupervisor[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceInstance | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    rootPath: '',
    claudePersona: '',
    isolationLevel: 'basic' as 'none' | 'basic' | 'strict',
    maxCpuPercent: 50,
    maxMemoryMB: 2048,
    maxDiskMB: 10240,
    maxNetworkMbps: 100
  });

  const personas = [
    'frontend', 'backend', 'architect', 'analyzer', 'security', 
    'qa', 'performance', 'refactorer', 'mentor', 'debugger'
  ];

  useEffect(() => {
    const updateData = () => {
      const currentWorkspaces = orchestrator.getWorkspaceInstances();
      const currentSupervisors = orchestrator.getSupervisors();
      
      setWorkspaces(currentWorkspaces);
      setSupervisors(currentSupervisors);
    };

    updateData();
    const interval = setInterval(updateData, 5000);
    
    return () => clearInterval(interval);
  }, [orchestrator]);

  const handleCreateWorkspace = async () => {
    if (!createForm.name.trim() || !createForm.rootPath.trim()) {
      alert('Please provide workspace name and root path');
      return;
    }

    try {
      const workspace = await orchestrator.createWorkspaceInstance({
        name: createForm.name,
        rootPath: createForm.rootPath,
        claudePersona: createForm.claudePersona || undefined,
        isolationLevel: createForm.isolationLevel,
        resourceLimits: {
          maxCpuPercent: createForm.maxCpuPercent,
          maxMemoryMB: createForm.maxMemoryMB,
          maxDiskMB: createForm.maxDiskMB,
          maxNetworkMbps: createForm.maxNetworkMbps
        }
      });

      setWorkspaces(prev => [...prev, workspace]);
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        rootPath: '',
        claudePersona: '',
        isolationLevel: 'basic',
        maxCpuPercent: 50,
        maxMemoryMB: 2048,
        maxDiskMB: 10240,
        maxNetworkMbps: 100
      });
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace. Please try again.');
    }
  };

  const handlePauseWorkspace = async (workspaceId: string) => {
    try {
      await orchestrator.pauseWorkspace(workspaceId, 'User requested pause');
      const updatedWorkspaces = orchestrator.getWorkspaceInstances();
      setWorkspaces(updatedWorkspaces);
    } catch (error) {
      console.error('Failed to pause workspace:', error);
      alert('Failed to pause workspace');
    }
  };

  const handleResumeWorkspace = async (workspaceId: string) => {
    try {
      await orchestrator.resumeWorkspace(workspaceId);
      const updatedWorkspaces = orchestrator.getWorkspaceInstances();
      setWorkspaces(updatedWorkspaces);
    } catch (error) {
      console.error('Failed to resume workspace:', error);
      alert('Failed to resume workspace');
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      await orchestrator.deleteWorkspace(workspaceId);
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      if (selectedWorkspace?.id === workspaceId) {
        setSelectedWorkspace(null);
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert('Failed to delete workspace');
    }
  };

  const handleBalanceResources = async () => {
    try {
      await orchestrator.balanceWorkspaceResources();
      const updatedWorkspaces = orchestrator.getWorkspaceInstances();
      setWorkspaces(updatedWorkspaces);
    } catch (error) {
      console.error('Failed to balance resources:', error);
      alert('Failed to balance resources');
    }
  };

  const handleEnableCrossWorkspaceIntelligence = async () => {
    const activeWorkspaceIds = workspaces
      .filter(w => w.status === 'active')
      .map(w => w.id);
    
    if (activeWorkspaceIds.length < 2) {
      alert('Need at least 2 active workspaces for cross-workspace intelligence');
      return;
    }

    try {
      await orchestrator.enableCrossWorkspaceIntelligence(activeWorkspaceIds);
      alert('Cross-workspace intelligence enabled successfully');
    } catch (error) {
      console.error('Failed to enable cross-workspace intelligence:', error);
      alert('Failed to enable cross-workspace intelligence');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'sleeping': return '#3b82f6';
      case 'paused': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'sleeping': return '😴';
      case 'paused': return '⏸️';
      case 'error': return '🔴';
      default: return '⚫';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (createdAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="workspace-instance-manager">
      <div className="manager-header">
        <h2>🏗️ Multi-Workspace Manager</h2>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleBalanceResources}
          >
            ⚖️ Balance Resources
          </button>
          <button 
            className="btn btn-info"
            onClick={handleEnableCrossWorkspaceIntelligence}
          >
            🧠 Enable Intelligence Sharing
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            ➕ Create Workspace
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <div className="form-header">
              <h3>Create New Workspace</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="form-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Workspace Name:</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Project Workspace"
                  />
                </div>
                <div className="form-group">
                  <label>Root Path:</label>
                  <input
                    type="text"
                    value={createForm.rootPath}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, rootPath: e.target.value }))}
                    placeholder="/path/to/project"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Claude Persona (Optional):</label>
                  <select
                    value={createForm.claudePersona}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, claudePersona: e.target.value }))}
                  >
                    <option value="">No persona</option>
                    {personas.map(persona => (
                      <option key={persona} value={persona}>
                        {persona.charAt(0).toUpperCase() + persona.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Isolation Level:</label>
                  <select
                    value={createForm.isolationLevel}
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      isolationLevel: e.target.value as 'none' | 'basic' | 'strict' 
                    }))}
                  >
                    <option value="none">None</option>
                    <option value="basic">Basic</option>
                    <option value="strict">Strict</option>
                  </select>
                </div>
              </div>

              <div className="resource-limits">
                <h4>Resource Limits</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Max CPU (%):</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={createForm.maxCpuPercent}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        maxCpuPercent: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Memory (MB):</label>
                    <input
                      type="number"
                      min="256"
                      max="16384"
                      value={createForm.maxMemoryMB}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        maxMemoryMB: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Max Disk (MB):</label>
                    <input
                      type="number"
                      min="1024"
                      max="102400"
                      value={createForm.maxDiskMB}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        maxDiskMB: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Network (Mbps):</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={createForm.maxNetworkMbps}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        maxNetworkMbps: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleCreateWorkspace}
                >
                  Create Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="workspaces-grid">
        {workspaces.map(workspace => (
          <div 
            key={workspace.id} 
            className={`workspace-card ${selectedWorkspace?.id === workspace.id ? 'selected' : ''}`}
            onClick={() => setSelectedWorkspace(workspace)}
          >
            <div className="workspace-header">
              <div className="workspace-info">
                <h3>{workspace.name}</h3>
                <span className="workspace-path">{workspace.rootPath}</span>
              </div>
              <div className="workspace-status">
                <span 
                  className="status-indicator"
                  style={{ color: getStatusColor(workspace.status) }}
                >
                  {getStatusIcon(workspace.status)} {workspace.status}
                </span>
              </div>
            </div>

            <div className="workspace-details">
              <div className="workspace-stat">
                <span className="stat-label">Uptime:</span>
                <span className="stat-value">{formatUptime(workspace.createdAt)}</span>
              </div>
              <div className="workspace-stat">
                <span className="stat-label">Last Activity:</span>
                <span className="stat-value">
                  {workspace.lastActivity.toLocaleTimeString()}
                </span>
              </div>
              {workspace.claudePersona && (
                <div className="workspace-stat">
                  <span className="stat-label">Persona:</span>
                  <span className="stat-value persona-badge">
                    {workspace.claudePersona}
                  </span>
                </div>
              )}
            </div>

            <div className="resource-usage">
              <div className="resource-bar">
                <div className="resource-label">CPU</div>
                <div className="resource-progress">
                  <div 
                    className="resource-fill"
                    style={{ 
                      width: `${(workspace.resources.cpuUsage / workspace.resources.maxCpu) * 100}%`,
                      backgroundColor: workspace.resources.cpuUsage > workspace.resources.maxCpu * 0.8 ? '#ef4444' : '#3b82f6'
                    }}
                  />
                </div>
                <div className="resource-value">
                  {Math.round(workspace.resources.cpuUsage)}%
                </div>
              </div>
              <div className="resource-bar">
                <div className="resource-label">Memory</div>
                <div className="resource-progress">
                  <div 
                    className="resource-fill"
                    style={{ 
                      width: `${(workspace.resources.memoryUsage / workspace.resources.maxMemory) * 100}%`,
                      backgroundColor: workspace.resources.memoryUsage > workspace.resources.maxMemory * 0.8 ? '#ef4444' : '#22c55e'
                    }}
                  />
                </div>
                <div className="resource-value">
                  {formatBytes(workspace.resources.memoryUsage * 1024 * 1024)}
                </div>
              </div>
            </div>

            <div className="workspace-actions">
              {workspace.status === 'active' ? (
                <button 
                  className="btn btn-sm btn-warning"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePauseWorkspace(workspace.id);
                  }}
                >
                  ⏸️ Pause
                </button>
              ) : workspace.status === 'paused' ? (
                <button 
                  className="btn btn-sm btn-success"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResumeWorkspace(workspace.id);
                  }}
                >
                  ▶️ Resume
                </button>
              ) : null}
              <button 
                className="btn btn-sm btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkspace(workspace.id);
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedWorkspace && (
        <div className="workspace-details-panel">
          <div className="details-header">
            <h3>Workspace Details: {selectedWorkspace.name}</h3>
            <button 
              className="btn btn-secondary"
              onClick={() => setSelectedWorkspace(null)}
            >
              ✕ Close
            </button>
          </div>

          <div className="details-content">
            <div className="details-section">
              <h4>Configuration</h4>
              <div className="config-grid">
                <div className="config-item">
                  <span className="config-label">ID:</span>
                  <span className="config-value">{selectedWorkspace.id}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Root Path:</span>
                  <span className="config-value">{selectedWorkspace.rootPath}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Isolation:</span>
                  <span className="config-value">{selectedWorkspace.isolation.securityProfile}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Created:</span>
                  <span className="config-value">{selectedWorkspace.createdAt.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {selectedWorkspace.supervisor && (
              <div className="details-section">
                <h4>Supervisor Status</h4>
                <div className="supervisor-info">
                  <div className="supervisor-stat">
                    <span className="stat-label">Persona:</span>
                    <span className="stat-value">{selectedWorkspace.supervisor.personaId}</span>
                  </div>
                  <div className="supervisor-stat">
                    <span className="stat-label">Status:</span>
                    <span className="stat-value">{selectedWorkspace.supervisor.status}</span>
                  </div>
                  <div className="supervisor-stat">
                    <span className="stat-label">Autonomy Level:</span>
                    <span className="stat-value">{selectedWorkspace.supervisor.autonomyLevel}</span>
                  </div>
                  <div className="supervisor-stat">
                    <span className="stat-label">Decisions Made:</span>
                    <span className="stat-value">{selectedWorkspace.supervisor.decisionHistory.length}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="details-section">
              <h4>Resource Limits</h4>
              <div className="limits-grid">
                <div className="limit-item">
                  <span className="limit-label">Max CPU:</span>
                  <span className="limit-value">{selectedWorkspace.resources.maxCpu}%</span>
                </div>
                <div className="limit-item">
                  <span className="limit-label">Max Memory:</span>
                  <span className="limit-value">{formatBytes(selectedWorkspace.resources.maxMemory * 1024 * 1024)}</span>
                </div>
                <div className="limit-item">
                  <span className="limit-label">Max Disk:</span>
                  <span className="limit-value">{formatBytes(selectedWorkspace.resources.maxDisk * 1024 * 1024)}</span>
                </div>
                <div className="limit-item">
                  <span className="limit-label">Network Isolation:</span>
                  <span className="limit-value">{selectedWorkspace.isolation.networkIsolation ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {workspaces.length === 0 && (
        <div className="empty-state">
          <h3>No Workspaces</h3>
          <p>Create your first workspace to get started with multi-workspace development</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            ➕ Create First Workspace
          </button>
        </div>
      )}
    </div>
  );
};
