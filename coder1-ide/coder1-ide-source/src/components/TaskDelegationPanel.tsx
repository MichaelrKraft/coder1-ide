import React, { useState, useEffect } from 'react';
import { fileSystemService } from '../services/fileSystem';
import './TaskDelegationPanel.css';

interface Agent {
  id: string;
  name: string;
  description: string;
  specialization: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string | null;
  tasksCompleted: number;
}

interface TaskDelegationSession {
  id: string;
  status: 'active' | 'completed' | 'stopped';
  taskDescription: string;
  selectedPreset: string;
  agents: Agent[];
  startTime: number;
  progress: number;
  estimatedTimeRemaining: number;
}

interface AgentsFileInfo {
  path: string;
  content: string;
  parsedSections: {
    overview?: string;
    buildCommands?: string[];
    projectStructure?: string;
    guidelines?: string;
    context?: string;
  };
}

interface TaskDelegationPanelProps {
  onClose: () => void;
  sessionId?: string;
  currentFilePath?: string; // For context-aware AGENTS.md detection
}

const TaskDelegationPanel: React.FC<TaskDelegationPanelProps> = ({ onClose, sessionId, currentFilePath = '/' }) => {
  // Existing task delegation state
  const [session, setSession] = useState<TaskDelegationSession | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [isStarting, setIsStarting] = useState(false);
  const [contextDetection, setContextDetection] = useState<string[]>([]);
  const [executionMode, setExecutionMode] = useState<'demo' | 'cli' | 'api'>('demo');
  const [isRealExecution, setIsRealExecution] = useState(false);

  // New AGENTS.md context state
  const [activeView, setActiveView] = useState<'delegation' | 'context'>('delegation');
  const [agentsFileInfo, setAgentsFileInfo] = useState<AgentsFileInfo | null>(null);
  const [loadingAgentsFile, setLoadingAgentsFile] = useState(false);
  const [showQuickCommands, setShowQuickCommands] = useState(true);

  // Available agent presets from SubAgentManager
  const agentPresets = [
    {
      id: 'frontend-trio',
      name: 'Frontend Trio',
      description: 'UI/UX specialists for React, styling, and user experience',
      agents: ['frontend-specialist', 'architect', 'optimizer'],
      icon: '🎨'
    },
    {
      id: 'backend-squad',
      name: 'Backend Squad', 
      description: 'Server-side specialists for APIs, databases, and infrastructure',
      agents: ['backend-specialist', 'architect', 'optimizer'],
      icon: '⚙️'
    },
    {
      id: 'full-stack',
      name: 'Full Stack Team',
      description: 'Complete development team for end-to-end features',
      agents: ['architect', 'frontend-specialist', 'backend-specialist'],
      icon: '🚀'
    },
    {
      id: 'debug-force',
      name: 'Debug Force',
      description: 'Problem-solving specialists for bugs and optimization',
      agents: ['debugger', 'implementer', 'optimizer'],
      icon: '🔍'
    },
    {
      id: 'default',
      name: 'Default Agents',
      description: 'General-purpose development team',
      agents: ['architect', 'implementer', 'optimizer'],
      icon: '🤖'
    }
  ];

  // Check Claude Code availability on mount
  useEffect(() => {
    checkClaudeAvailability();
    loadAgentsFileForContext();
  }, []);

  // Reload AGENTS.md when current file path changes
  useEffect(() => {
    loadAgentsFileForContext();
  }, [currentFilePath]);

  const checkClaudeAvailability = async () => {
    try {
      const response = await fetch('/api/task-delegation/check-availability');
      if (response.ok) {
        const data = await response.json();
        setExecutionMode(data.mode as 'demo' | 'cli' | 'api');
        setIsRealExecution(data.available);
        console.log('🎯 Task Delegation Mode:', data.mode, 'Real:', data.available);
      }
    } catch (error) {
      console.error('Failed to check Claude availability:', error);
      setExecutionMode('demo');
      setIsRealExecution(false);
    }
  };

  const loadAgentsFileForContext = async () => {
    setLoadingAgentsFile(true);
    try {
      const agentsFilePath = await fileSystemService.findNearestAgentsFile(currentFilePath);
      if (agentsFilePath) {
        const content = await fileSystemService.readFile(agentsFilePath);
        const parsedSections = parseAgentsFile(content);
        
        setAgentsFileInfo({
          path: agentsFilePath,
          content,
          parsedSections
        });
      } else {
        setAgentsFileInfo(null);
      }
    } catch (error) {
      console.error('Failed to load AGENTS.md:', error);
      setAgentsFileInfo(null);
    } finally {
      setLoadingAgentsFile(false);
    }
  };

  const parseAgentsFile = (content: string) => {
    const sections: AgentsFileInfo['parsedSections'] = {};
    
    // Extract build commands
    const buildCommandsMatch = content.match(/##\s*Build Commands\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
    if (buildCommandsMatch) {
      const commandLines = buildCommandsMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.trim().replace(/^[-*]\s*/, '').replace(/`([^`]+)`.*/, '$1'));
      sections.buildCommands = commandLines;
    }

    // Extract other sections
    const extractSection = (sectionName: string, key: keyof typeof sections) => {
      const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|\\n#|$)`, 'i');
      const match = content.match(regex);
      if (match) {
        sections[key] = match[1].trim() as any;
      }
    };

    extractSection('Project Overview', 'overview');
    extractSection('Project Structure', 'projectStructure');
    extractSection('Coding Guidelines', 'guidelines');
    extractSection('Context', 'context');

    return sections;
  };

  const executeCommand = async (command: string) => {
    console.log('Executing command from AGENTS.md:', command);
    // Here we could integrate with the terminal to actually run the command
    // For now, just show a notification
    const notification = document.createElement('div');
    notification.innerHTML = `⚡ Executing: <code>${command}</code>`;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95));
      color: white; padding: 12px 16px; border-radius: 8px;
      font-size: 14px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      animation: slideInFade 0.3s ease-out;
      font-family: -apple-system, system-ui, sans-serif;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  // Context detection based on task description
  useEffect(() => {
    if (taskInput) {
      const detected = detectContextFromTask(taskInput);
      setContextDetection(detected);
      
      // Auto-select best preset based on context
      const suggestedPreset = suggestPresetFromContext(detected);
      if (suggestedPreset) {
        setSelectedPreset(suggestedPreset);
      }
    }
  }, [taskInput]);

  const detectContextFromTask = (task: string): string[] => {
    const contexts: string[] = [];
    const taskLower = task.toLowerCase();

    if (taskLower.includes('ui') || taskLower.includes('component') || taskLower.includes('react') || taskLower.includes('style')) {
      contexts.push('Frontend Development');
    }
    if (taskLower.includes('api') || taskLower.includes('backend') || taskLower.includes('database') || taskLower.includes('server')) {
      contexts.push('Backend Development');
    }
    if (taskLower.includes('bug') || taskLower.includes('fix') || taskLower.includes('debug') || taskLower.includes('error')) {
      contexts.push('Debugging');
    }
    if (taskLower.includes('optimize') || taskLower.includes('performance') || taskLower.includes('refactor')) {
      contexts.push('Optimization');
    }
    if (taskLower.includes('test') || taskLower.includes('testing')) {
      contexts.push('Testing');
    }

    return contexts;
  };

  const suggestPresetFromContext = (contexts: string[]): string | null => {
    if (contexts.includes('Frontend Development') && !contexts.includes('Backend Development')) {
      return 'frontend-trio';
    }
    if (contexts.includes('Backend Development') && !contexts.includes('Frontend Development')) {
      return 'backend-squad';
    }
    if (contexts.includes('Frontend Development') && contexts.includes('Backend Development')) {
      return 'full-stack';
    }
    if (contexts.includes('Debugging') || contexts.includes('Optimization')) {
      return 'debug-force';
    }
    return null;
  };

  const startTaskDelegation = async () => {
    if (!taskInput.trim()) return;

    setIsStarting(true);

    try {
      // Call Claude Code Task tool with selected agent preset
      const response = await fetch('/api/task-delegation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription: taskInput,
          preset: selectedPreset,
          context: contextDetection
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create session with mock agents for now
        const mockSession: TaskDelegationSession = {
          id: data.sessionId || `task_${Date.now()}`,
          status: 'active',
          taskDescription: taskInput,
          selectedPreset,
          startTime: Date.now(),
          progress: 0,
          estimatedTimeRemaining: 300, // 5 minutes
          agents: agentPresets.find(p => p.id === selectedPreset)?.agents.map((agentName, index) => ({
            id: `agent_${index}`,
            name: agentName.charAt(0).toUpperCase() + agentName.slice(1).replace('-', ' '),
            description: getAgentDescription(agentName),
            specialization: getAgentSpecialization(agentName),
            status: index === 0 ? 'working' : 'idle',
            progress: index === 0 ? 25 : 0,
            currentTask: index === 0 ? 'Analyzing task requirements' : null,
            tasksCompleted: 0
          })) || []
        };

        setSession(mockSession);
        
        // Simulate progress updates
        simulateProgress(mockSession);
        
      } else {
        console.error('Failed to start task delegation');
      }
    } catch (error) {
      console.error('Task delegation error:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const simulateProgress = (session: TaskDelegationSession) => {
    let updateCount = 0;
    const interval = setInterval(() => {
      setSession(prevSession => {
        if (!prevSession || prevSession.status !== 'active') {
          clearInterval(interval);
          return prevSession;
        }

        const updatedAgents = prevSession.agents.map((agent, index) => {
          const newProgress = Math.min(agent.progress + Math.random() * 15, 100);
          let newStatus = agent.status;
          let newTask = agent.currentTask;

          if (newProgress > 90 && agent.status === 'working') {
            newStatus = 'completed';
            newTask = 'Task completed successfully';
          } else if (newProgress > 25 && agent.status === 'idle') {
            newStatus = 'working';
            newTask = getTaskForAgent(agent.specialization);
          }

          return {
            ...agent,
            progress: newProgress,
            status: newStatus,
            currentTask: newTask,
            tasksCompleted: newStatus === 'completed' ? agent.tasksCompleted + 1 : agent.tasksCompleted
          };
        });

        const overallProgress = updatedAgents.reduce((sum, agent) => sum + agent.progress, 0) / updatedAgents.length;
        const allCompleted = updatedAgents.every(agent => agent.status === 'completed');

        return {
          ...prevSession,
          agents: updatedAgents,
          progress: overallProgress,
          status: allCompleted ? 'completed' : 'active',
          estimatedTimeRemaining: Math.max(0, prevSession.estimatedTimeRemaining - 30)
        };
      });

      updateCount++;
      if (updateCount > 20) { // Stop after ~10 minutes
        clearInterval(interval);
      }
    }, 3000);
  };

  const getAgentDescription = (agentName: string): string => {
    const descriptions: { [key: string]: string } = {
      'frontend-specialist': 'React, TypeScript, and UI/UX expert',
      'backend-specialist': 'Server, API, and database expert',
      'architect': 'System design and architecture expert',
      'optimizer': 'Performance and code quality expert',
      'debugger': 'Problem diagnosis and debugging expert',
      'implementer': 'Code implementation and development expert'
    };
    return descriptions[agentName] || 'Development specialist';
  };

  const getAgentSpecialization = (agentName: string): string => {
    const specializations: { [key: string]: string } = {
      'frontend-specialist': 'Frontend Development',
      'backend-specialist': 'Backend Development',
      'architect': 'System Architecture',
      'optimizer': 'Performance Optimization',
      'debugger': 'Debugging & Troubleshooting',
      'implementer': 'Code Implementation'
    };
    return specializations[agentName] || 'General Development';
  };

  const getTaskForAgent = (specialization: string): string => {
    const tasks: { [key: string]: string[] } = {
      'Frontend Development': ['Building React components', 'Styling with CSS', 'Implementing user interactions'],
      'Backend Development': ['Creating API endpoints', 'Database schema design', 'Server configuration'],
      'System Architecture': ['Designing system structure', 'Planning component relationships', 'Defining interfaces'],
      'Performance Optimization': ['Analyzing performance bottlenecks', 'Optimizing code efficiency', 'Memory usage optimization'],
      'Debugging & Troubleshooting': ['Investigating error logs', 'Testing edge cases', 'Code review and validation'],
      'Code Implementation': ['Writing core functionality', 'Implementing business logic', 'Adding error handling']
    };
    
    const taskList = tasks[specialization] || tasks['Code Implementation'];
    return taskList[Math.floor(Math.random() * taskList.length)];
  };

  const stopSession = () => {
    setSession(null);
    setTaskInput('');
    setContextDetection([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'error': return '#F44336';
      case 'idle': return '#9E9E9E';
      default: return '#FFC107';
    }
  };

  return (
    <div className="task-delegation-panel">
      <div className="panel-header">
        <button className="back-to-terminal-button" onClick={onClose} title="Back to Terminal">
          ← Terminal
        </button>
        <div className="header-center">
          <h2>
            {activeView === 'delegation' ? '🎯 Task Delegation Center' : '🤖 Agent Context'}
          </h2>
          <div className="view-switcher">
            <button
              className={`view-tab ${activeView === 'delegation' ? 'active' : ''}`}
              onClick={() => setActiveView('delegation')}
            >
              Task Delegation
            </button>
            <button
              className={`view-tab ${activeView === 'context' ? 'active' : ''}`}
              onClick={() => setActiveView('context')}
            >
              Agent Context {agentsFileInfo ? '🤖' : ''}
            </button>
          </div>
          {activeView === 'delegation' && (
            <div className="mode-indicator">
              {isRealExecution ? (
                <span className="mode-badge real">
                  ✅ Claude Code {executionMode === 'cli' ? 'CLI' : 'API'} Active
                </span>
              ) : (
                <span className="mode-badge demo">
                  🎭 Demo Mode (Claude Code not configured)
                </span>
              )}
            </div>
          )}
        </div>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {activeView === 'context' ? (
        <div className="agent-context-view">
          {loadingAgentsFile ? (
            <div className="loading-section">
              <div className="loading-spinner">🤖</div>
              <div>Loading AGENTS.md context...</div>
            </div>
          ) : agentsFileInfo ? (
            <div className="agents-context-content">
              <div className="agents-file-header">
                <h3>📄 {agentsFileInfo.path}</h3>
                <div className="agents-actions">
                  <button 
                    className="refresh-button"
                    onClick={loadAgentsFileForContext}
                    title="Refresh AGENTS.md"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* Quick Commands Section */}
              {agentsFileInfo.parsedSections.buildCommands && (
                <div className="quick-commands-section">
                  <div className="section-header">
                    <h4>⚡ Quick Commands</h4>
                    <button 
                      className="toggle-button"
                      onClick={() => setShowQuickCommands(!showQuickCommands)}
                    >
                      {showQuickCommands ? '▼' : '▶'}
                    </button>
                  </div>
                  {showQuickCommands && (
                    <div className="commands-grid">
                      {agentsFileInfo.parsedSections.buildCommands.map((command, index) => (
                        <button
                          key={index}
                          className="command-button"
                          onClick={() => executeCommand(command)}
                          title={`Execute: ${command}`}
                        >
                          <span className="command-icon">⚡</span>
                          <span className="command-text">{command}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Project Overview */}
              {agentsFileInfo.parsedSections.overview && (
                <div className="context-section">
                  <h4>📋 Project Overview</h4>
                  <div className="section-content">
                    {agentsFileInfo.parsedSections.overview}
                  </div>
                </div>
              )}

              {/* Project Structure */}
              {agentsFileInfo.parsedSections.projectStructure && (
                <div className="context-section">
                  <h4>📁 Project Structure</h4>
                  <div className="section-content structure-content">
                    <pre>{agentsFileInfo.parsedSections.projectStructure}</pre>
                  </div>
                </div>
              )}

              {/* Coding Guidelines */}
              {agentsFileInfo.parsedSections.guidelines && (
                <div className="context-section">
                  <h4>📝 Coding Guidelines</h4>
                  <div className="section-content">
                    {agentsFileInfo.parsedSections.guidelines}
                  </div>
                </div>
              )}

              {/* Additional Context */}
              {agentsFileInfo.parsedSections.context && (
                <div className="context-section">
                  <h4>🧠 Context for AI Agents</h4>
                  <div className="section-content context-content">
                    {agentsFileInfo.parsedSections.context}
                  </div>
                </div>
              )}

              {/* AI Integration Status */}
              <div className="ai-integration-status">
                <h4>🤖 AI Agent Status</h4>
                <div className="status-grid">
                  <div className="status-item">
                    <span className="status-label">Claude Code:</span>
                    <span className={`status-value ${isRealExecution ? 'active' : 'inactive'}`}>
                      {isRealExecution ? 'Connected' : 'Not configured'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Context File:</span>
                    <span className="status-value active">Loaded</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Quick Commands:</span>
                    <span className="status-value active">
                      {agentsFileInfo.parsedSections.buildCommands?.length || 0} available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-agents-file">
              <div className="empty-state">
                <div className="empty-icon">🤖</div>
                <h3>No AGENTS.md file found</h3>
                <p>Create an AGENTS.md file to provide context for AI agents working with this project.</p>
                <div className="empty-actions">
                  <button className="create-agents-button">
                    📝 Create AGENTS.md
                  </button>
                  <button 
                    className="refresh-button"
                    onClick={loadAgentsFileForContext}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !session ? (
        <div className="task-setup">
          <div className="task-input-section">
            <h3>What would you like to accomplish?</h3>
            <textarea
              className="task-input"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Describe your task... (e.g., 'Refactor the authentication system', 'Build a responsive header component', 'Debug the API connection issues')"
              rows={4}
            />
            
            {contextDetection.length > 0 && (
              <div className="context-detection">
                <span className="context-label">Detected context:</span>
                {contextDetection.map((context, index) => (
                  <span key={index} className="context-tag">{context}</span>
                ))}
              </div>
            )}
          </div>

          <div className="preset-selection">
            <h3>Choose AI Agent Team</h3>
            <div className="presets-grid">
              {agentPresets.map((preset) => (
                <div
                  key={preset.id}
                  className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset(preset.id)}
                >
                  <div className="preset-icon">{preset.icon}</div>
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-description">{preset.description}</div>
                  <div className="preset-agents">
                    {preset.agents.map((agent, index) => (
                      <span key={index} className="agent-badge">{agent}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="start-section">
            <button 
              className="start-delegation-button"
              onClick={startTaskDelegation}
              disabled={isStarting || !taskInput.trim()}
            >
              {isStarting ? 'Delegating Task...' : 
               isRealExecution ? '🚀 Start Real Task Delegation' : '🎭 Start Demo Delegation'}
            </button>
            {isRealExecution && (
              <p className="execution-note">
                Using Claude Code {executionMode === 'cli' ? 'CLI' : 'API'} for real agent execution
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="active-session">
          <div className="session-header">
            <div className="session-info">
              <h3>{session.taskDescription}</h3>
              <div className="session-meta">
                <span>Team: {agentPresets.find(p => p.id === session.selectedPreset)?.name}</span>
                <span>Progress: {Math.round(session.progress)}%</span>
                <span>Status: {session.status}</span>
              </div>
            </div>
            <button className="stop-button" onClick={stopSession}>
              Stop Session
            </button>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${session.progress}%` }} />
          </div>

          <div className="agents-container">
            <h4>AI Agents Progress</h4>
            <div className="agents-grid">
              {session.agents.map((agent) => (
                <div key={agent.id} className="agent-card">
                  <div className="agent-header">
                    <h5>{agent.name}</h5>
                    <div 
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(agent.status) }}
                    />
                  </div>
                  <div className="agent-specialization">{agent.specialization}</div>
                  <div className="agent-progress">
                    <div className="progress-container">
                      <div 
                        className="progress-fill"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                    <span className="progress-text">{Math.round(agent.progress)}%</span>
                  </div>
                  <div className="agent-task">
                    {agent.currentTask ? (
                      <span className="current-task">{agent.currentTask}</span>
                    ) : (
                      <span className="idle-text">Waiting for task...</span>
                    )}
                  </div>
                  <div className="agent-stats">
                    Tasks completed: {agent.tasksCompleted}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {session.status === 'completed' && (
            <div className="completion-summary">
              <h4>✅ Task Delegation Complete!</h4>
              <p>All agents have finished their work. Check the terminal for detailed results.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDelegationPanel;