import React, { useState, useEffect } from 'react';
import { WorkspaceService } from '../services/WorkspaceService';
import { WorkspaceConfig, WorkspaceMetrics } from '../services/WorkspaceService';
import { ClaudePersona } from '../types/supervision';
import './MultiWorkspaceManager.css';

interface MultiWorkspaceManagerProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

export const MultiWorkspaceManager: React.FC<MultiWorkspaceManagerProps> = ({
  onWorkspaceChange
}) => {
  const [workspaceService] = useState(() => new WorkspaceService());
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [metrics, setMetrics] = useState<Map<string, WorkspaceMetrics>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    projectType: 'react',
    rootPath: '',
    claudePersona: 'analyzer' as ClaudePersona
  });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const allWorkspaces = await workspaceService.getAllWorkspaces();
      setWorkspaces(allWorkspaces);
      
      if (allWorkspaces.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(allWorkspaces[0].id);
        onWorkspaceChange?.(allWorkspaces[0].id);
      }

      const metricsMap = new Map<string, WorkspaceMetrics>();
      for (const workspace of allWorkspaces) {
        const workspaceMetrics = await workspaceService.getWorkspaceMetrics(workspace.id);
        if (workspaceMetrics && workspaceMetrics.length > 0) {
          metricsMap.set(workspace.id, workspaceMetrics[0]);
        }
      }
      setMetrics(metricsMap);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    try {
      const workspace = await workspaceService.createWorkspace({
        name: newWorkspace.name,
        projectType: newWorkspace.projectType as 'react' | 'vue' | 'angular' | 'node' | 'python' | 'java' | 'other',
        rootPath: newWorkspace.rootPath,
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          autoImports: true,
          tabSize: 2,
          theme: 'dark',
          fontSize: 14,
          wordWrap: true,
          minimap: true,
          lineNumbers: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced',
          autoApprovalThresholds: {
            codeQuality: 80,
            securityRisk: 30,
            performanceImpact: 25,
            testCoverage: 70
          }
        }
      });

      setWorkspaces(prev => [...prev, workspace]);
      setActiveWorkspaceId(workspace.id);
      onWorkspaceChange?.(workspace.id);
      setShowCreateModal(false);
      setNewWorkspace({
        name: '',
        projectType: 'react',
        rootPath: '',
        claudePersona: 'analyzer'
      });
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    onWorkspaceChange?.(workspaceId);
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (window.confirm('Are you sure you want to delete this workspace?')) {
      try {
        await workspaceService.deleteWorkspace(workspaceId);
        setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
        
        if (activeWorkspaceId === workspaceId) {
          const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
          if (remainingWorkspaces.length > 0) {
            setActiveWorkspaceId(remainingWorkspaces[0].id);
            onWorkspaceChange?.(remainingWorkspaces[0].id);
          } else {
            setActiveWorkspaceId('');
            onWorkspaceChange?.('');
          }
        }
      } catch (error) {
        console.error('Failed to delete workspace:', error);
      }
    }
  };

  const getPersonaIcon = (persona: ClaudePersona) => {
    const icons = {
      analyzer: '🔍',
      architect: '🏗️',
      frontend: '🎨',
      backend: '⚙️',
      security: '🔒',
      qa: '🧪',
      devops: '🚀',
      mobile: '📱',
      ai: '🤖',
      performance: '⚡',
      refactorer: '♻️',
      mentor: '👨‍🏫'
    };
    return icons[persona] || '🤖';
  };

  const formatMetric = (value: number, suffix: string = '') => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M${suffix}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K${suffix}`;
    }
    return `${value}${suffix}`;
  };

  return (
    <div className="multi-workspace-manager">
      <div className="workspace-header">
        <h3>🏢 Multi-Workspace Manager</h3>
        <button
          className="create-workspace-btn"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ New Workspace
        </button>
      </div>

      <div className="workspace-grid">
        {workspaces.map(workspace => {
          const workspaceMetrics = metrics.get(workspace.id);
          const isActive = workspace.id === activeWorkspaceId;
          
          return (
            <div
              key={workspace.id}
              className={`workspace-card ${isActive ? 'active' : ''}`}
              onClick={() => handleSwitchWorkspace(workspace.id)}
            >
              <div className="workspace-card-header">
                <div className="workspace-info">
                  <h4>{workspace.name}</h4>
                  <span className="workspace-type">{workspace.projectType}</span>
                </div>
                <div className="workspace-actions">
                  {workspace.claudePersona && (
                    <span className="persona-indicator" title={workspace.claudePersona}>
                      {getPersonaIcon(workspace.claudePersona as ClaudePersona)}
                    </span>
                  )}
                  <button
                    className="delete-workspace-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkspace(workspace.id);
                    }}
                    title="Delete workspace"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="workspace-path">
                📁 {workspace.rootPath}
              </div>

              {workspaceMetrics && (
                <div className="workspace-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Files:</span>
                    <span className="metric-value">{workspaceMetrics.filesCount}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Size:</span>
                    <span className="metric-value">{formatMetric(workspaceMetrics.linesOfCode, '')}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Memory:</span>
                    <span className="metric-value">{workspaceMetrics.codeQualityScore}%</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">CPU:</span>
                    <span className="metric-value">{workspaceMetrics.securityScore}%</span>
                  </div>
                </div>
              )}

              <div className="workspace-status">
                <div className={`status-indicator ${workspaceMetrics ? 'active' : 'inactive'}`}>
                  {workspaceMetrics ? 'Active' : 'Inactive'}
                </div>
                {workspace.settings?.supervisionEnabled && (
                  <div className="supervision-indicator">
                    🤖 Supervised
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-workspace-modal">
            <div className="modal-header">
              <h3>Create New Workspace</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Workspace Name:</label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Awesome Project"
                />
              </div>

              <div className="form-group">
                <label>Project Type:</label>
                <select
                  value={newWorkspace.projectType}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, projectType: e.target.value }))}
                >
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="angular">Angular</option>
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Root Path:</label>
                <input
                  type="text"
                  value={newWorkspace.rootPath}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, rootPath: e.target.value }))}
                  placeholder="/path/to/project"
                />
              </div>

              <div className="form-group">
                <label>Claude Persona:</label>
                <select
                  value={newWorkspace.claudePersona}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, claudePersona: e.target.value as ClaudePersona }))}
                >
                  <option value="analyzer">🔍 Analyzer</option>
                  <option value="architect">🏗️ Architect</option>
                  <option value="frontend">🎨 Frontend</option>
                  <option value="backend">⚙️ Backend</option>
                  <option value="security">🔒 Security</option>
                  <option value="qa">🧪 QA</option>
                  <option value="devops">🚀 DevOps</option>
                  <option value="mobile">📱 Mobile</option>
                  <option value="ai">🤖 AI</option>
                  <option value="performance">⚡ Performance</option>
                  <option value="refactorer">♻️ Refactorer</option>
                  <option value="mentor">👨‍🏫 Mentor</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleCreateWorkspace}
                disabled={!newWorkspace.name || !newWorkspace.rootPath}
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
