import React, { useState, useEffect } from 'react';
import { FileNode, OpenFile, TerminalSession } from '../types/supervision';
import { ClaudeAgentSupervisor } from '../services/SupervisionEngine';
import IDE from './IDE';
import './WorkspaceManager.css';

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  files: FileNode[];
  openFiles: OpenFile[];
  terminalSessions: TerminalSession[];
  claudePersona?: string;
  supervisor?: ClaudeAgentSupervisor;
  isActive: boolean;
  lastAccessed: Date;
  projectType: string;
  gitBranch?: string;
}

interface WorkspaceManagerProps {
  onWorkspaceChange?: (workspace: Workspace) => void;
  maxWorkspaces?: number;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  onWorkspaceChange,
  maxWorkspaces = 5
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    initializeDefaultWorkspace();
  }, []);

  const initializeDefaultWorkspace = () => {
    const defaultWorkspace: Workspace = {
      id: 'default',
      name: 'Main Project',
      rootPath: '/workspace/main',
      files: [],
      openFiles: [],
      terminalSessions: [],
      claudePersona: 'analyzer',
      isActive: true,
      lastAccessed: new Date(),
      projectType: 'react',
      gitBranch: 'main'
    };

    setWorkspaces([defaultWorkspace]);
    setActiveWorkspaceId('default');
  };

  const createWorkspace = (config: Partial<Workspace>) => {
    if (workspaces.length >= maxWorkspaces) {
      alert(`Maximum ${maxWorkspaces} workspaces allowed`);
      return;
    }

    const newWorkspace: Workspace = {
      id: `workspace-${Date.now()}`,
      name: config.name || `Workspace ${workspaces.length + 1}`,
      rootPath: config.rootPath || `/workspace/${Date.now()}`,
      files: [],
      openFiles: [],
      terminalSessions: [],
      claudePersona: config.claudePersona || 'analyzer',
      isActive: false,
      lastAccessed: new Date(),
      projectType: config.projectType || 'react',
      gitBranch: config.gitBranch || 'main'
    };

    setWorkspaces(prev => [...prev, newWorkspace]);
    switchToWorkspace(newWorkspace.id);
    setShowCreateModal(false);
  };

  const switchToWorkspace = (workspaceId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      isActive: ws.id === workspaceId,
      lastAccessed: ws.id === workspaceId ? new Date() : ws.lastAccessed
    })));
    
    setActiveWorkspaceId(workspaceId);
    
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace && onWorkspaceChange) {
      onWorkspaceChange(workspace);
    }
  };

  const closeWorkspace = (workspaceId: string) => {
    if (workspaces.length <= 1) {
      alert('Cannot close the last workspace');
      return;
    }

    setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
    
    if (activeWorkspaceId === workspaceId) {
      const remainingWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);
      switchToWorkspace(remainingWorkspaces[0].id);
    }
  };

  const updateWorkspace = (workspaceId: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId ? { ...ws, ...updates } : ws
    ));
  };

  const duplicateWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) return;

    const duplicatedWorkspace: Workspace = {
      ...workspace,
      id: `workspace-${Date.now()}`,
      name: `${workspace.name} (Copy)`,
      isActive: false,
      lastAccessed: new Date()
    };

    setWorkspaces(prev => [...prev, duplicatedWorkspace]);
  };

  const getActiveWorkspace = (): Workspace | undefined => {
    return workspaces.find(ws => ws.id === activeWorkspaceId);
  };

  const activeWorkspace = getActiveWorkspace();

  return (
    <div className="workspace-manager">
      <div className="workspace-tabs">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`workspace-tab ${workspace.isActive ? 'active' : ''}`}
            onClick={() => switchToWorkspace(workspace.id)}
          >
            <span className="workspace-name">{workspace.name}</span>
            <span className="workspace-persona">{workspace.claudePersona}</span>
            {workspaces.length > 1 && (
              <button
                className="close-workspace"
                onClick={(e) => {
                  e.stopPropagation();
                  closeWorkspace(workspace.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        <button
          className="add-workspace"
          onClick={() => setShowCreateModal(true)}
          disabled={workspaces.length >= maxWorkspaces}
        >
          +
        </button>
      </div>

      {activeWorkspace && (
        <div className="workspace-content">
          <IDE />
        </div>
      )}

      {showCreateModal && (
        <WorkspaceCreateModal
          onCreate={createWorkspace}
          onCancel={() => setShowCreateModal(false)}
          existingWorkspaces={workspaces}
        />
      )}

      <div className="workspace-status">
        <span>Active: {activeWorkspace?.name}</span>
        <span>Persona: {activeWorkspace?.claudePersona}</span>
        <span>Workspaces: {workspaces.length}/{maxWorkspaces}</span>
      </div>
    </div>
  );
};

interface WorkspaceCreateModalProps {
  onCreate: (config: Partial<Workspace>) => void;
  onCancel: () => void;
  existingWorkspaces: Workspace[];
}

const WorkspaceCreateModal: React.FC<WorkspaceCreateModalProps> = ({
  onCreate,
  onCancel,
  existingWorkspaces
}) => {
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState('react');
  const [claudePersona, setClaudePersona] = useState('analyzer');
  const [rootPath, setRootPath] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Workspace name is required');
      return;
    }

    if (existingWorkspaces.some(ws => ws.name === name.trim())) {
      alert('Workspace name already exists');
      return;
    }

    onCreate({
      name: name.trim(),
      projectType,
      claudePersona,
      rootPath: rootPath.trim() || undefined
    });
  };

  return (
    <div className="workspace-modal-overlay">
      <div className="workspace-modal">
        <h3>Create New Workspace</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Workspace Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
            />
          </div>

          <div className="form-group">
            <label>Project Type:</label>
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              <option value="react">React</option>
              <option value="vue">Vue</option>
              <option value="angular">Angular</option>
              <option value="node">Node.js</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Claude Persona:</label>
            <select value={claudePersona} onChange={(e) => setClaudePersona(e.target.value)}>
              <option value="analyzer">Analyzer</option>
              <option value="architect">Architect</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="security">Security</option>
              <option value="qa">QA</option>
              <option value="performance">Performance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Root Path (optional):</label>
            <input
              type="text"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="/workspace/my-project"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit">Create Workspace</button>
          </div>
        </form>
      </div>
    </div>
  );
};
