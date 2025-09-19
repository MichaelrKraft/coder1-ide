import React, { useState, useEffect, useRef } from 'react';
import './TmuxAgentView.css';
import AgentProgressView from './AgentProgressView';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'initializing' | 'thinking' | 'working' | 'waiting' | 'completed' | 'error';
  output: string[];
  progress: number;
  currentTask: string;
  completedTasks: string[];
  files: number;
  lastActivity: Date;
}

interface TmuxAgentViewProps {
  sessionId: string | null;
  isActive: boolean;
}

interface GeneratedFile {
  path: string;
  content: string;
  type: 'component' | 'service' | 'config' | 'test' | 'documentation';
  agent: string;
  timestamp: string;
}

interface TeamData {
  teamId: string;
  sessionId: string;
  status: 'spawning' | 'planning' | 'executing' | 'integrating' | 'completed' | 'error';
  workflow: string;
  requirement: string;
  agents: Agent[];
  progress: {
    overall: number;
    planning: number;
    development: number;
    testing: number;
    deployment: number;
  };
  files: GeneratedFile[];
  generatedFiles: number;
}

export const TmuxAgentView: React.FC<TmuxAgentViewProps> = ({ sessionId, isActive }) => {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Project requirement state (replaces Queen Agent)
  const [selectedTab, setSelectedTab] = useState<'requirement' | string>('requirement');
  const [requirementInput, setRequirementInput] = useState('');
  const [isSpawningTeam, setIsSpawningTeam] = useState(false);
  const [teamSpawned, setTeamSpawned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicMode, setMagicMode] = useState(false);
  const requirementInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-focus requirement input when requirement tab is selected
  useEffect(() => {
    if (selectedTab === 'requirement' && requirementInputRef.current && !teamSpawned) {
      setTimeout(() => {
        requirementInputRef.current?.focus();
      }, 100);
    }
  }, [selectedTab, teamSpawned]);
  
  useEffect(() => {
    console.log('🤖 [AITeamView] State change:', { isActive, teamSpawned });
    
    if (!isActive) {
      console.log('🤖 [AITeamView] Not active, cleaning up...');
      // Clean up when not active
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setTeamData(null);
      setSelectedAgent(null);
      setIsConnected(false);
      return;
    }

    // If team is spawned, start monitoring
    if (teamSpawned && teamData?.teamId) {
      startTeamMonitoring(teamData.teamId);
    }

    function startTeamMonitoring(teamId: string) {
      if (pollIntervalRef.current) return; // Already polling
      
      console.log('🤖 [AITeamView] Starting REAL team monitoring:', teamId);
      
      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/ai-team/${teamId}/status`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('🤖 [AITeamView] Team status:', { 
              success: data.success, 
              status: data.team?.status,
              agentCount: data.team?.agents?.length || 0,
              files: data.team?.generatedFiles || 0
            });
            
            if (data.team) {
              const newTeamData: TeamData = {
                teamId: data.team.teamId,
                sessionId: data.team.sessionId,
                status: data.team.status,
                workflow: data.team.workflow,
                requirement: data.team.requirement,
                agents: data.team.agents.map((a: any) => ({
                  id: a.id,
                  name: a.name,
                  role: a.role,
                  status: a.status,
                  output: a.output || [],
                  progress: a.progress || 0,
                  currentTask: a.currentTask || 'Waiting...',
                  completedTasks: a.completedTasks || [],
                  files: a.files || 0,
                  lastActivity: new Date()
                })),
                progress: data.team.progress,
                files: data.team.files || [],
                generatedFiles: data.team.generatedFiles || 0
              };
              
              setTeamData(newTeamData);
              setIsConnected(true);
              
              // Auto-select first agent if none selected
              if (newTeamData.agents.length > 0 && !selectedAgent) {
                setSelectedAgent(newTeamData.agents[0].id);
                console.log('🤖 [AITeamView] Selected first agent:', newTeamData.agents[0].id);
              }
            }
          } else {
            console.error('🤖 [AITeamView] Poll failed:', response.status, response.statusText);
            setIsConnected(false);
          }
        } catch (err) {
          console.error('🤖 [AITeamView] Team monitoring error:', err);
          setIsConnected(false);
        }
      }, 2000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isActive, teamSpawned, teamData?.teamId, selectedAgent]);

  const spawnAITeam = async () => {
    if (!requirementInput.trim()) {
      setError('Please enter a project requirement');
      return;
    }
    
    setIsSpawningTeam(true);
    setError(null);
    
    try {
      console.log('🚀 [AITeamView] Spawning REAL AI team for:', requirementInput);
      
      const response = await fetch('/api/ai-team/spawn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirement: requirementInput.trim(),
          sessionId: sessionId || `session_${Date.now()}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AITeamView] Team spawned successfully:', data);
        
        const newTeamData: TeamData = {
          teamId: data.teamId,
          sessionId: data.sessionId,
          status: data.status,
          workflow: data.workflow,
          requirement: data.requirement,
          agents: data.agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            status: a.status,
            output: [],
            progress: a.progress || 0,
            currentTask: a.currentTask || 'Initializing...',
            completedTasks: [],
            files: 0,
            lastActivity: new Date()
          })),
          progress: { overall: 0, planning: 0, development: 0, testing: 0, deployment: 0 },
          files: [],
          generatedFiles: 0
        };
        
        setTeamData(newTeamData);
        setTeamSpawned(true);
        setSelectedTab(newTeamData.agents[0]?.id || 'requirement');
        
        // Start the team working
        await startTeamWork(newTeamData.teamId);
        
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to spawn AI team');
      }
    } catch (error) {
      console.error('❌ [AITeamView] Error spawning team:', error);
      setError('Failed to connect to AI team service');
    } finally {
      setIsSpawningTeam(false);
    }
  };

  const startTeamWork = async (teamId: string) => {
    try {
      const response = await fetch(`/api/ai-team/${teamId}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🚀 [AITeamView] Team started successfully:', data);
      } else {
        console.error('❌ [AITeamView] Failed to start team work');
      }
    } catch (error) {
      console.error('❌ [AITeamView] Error starting team work:', error);
    }
  };

  const sendInput = async (input: string) => {
    console.log('🤖 [AITeamView] sendInput called:', { 
      selectedAgent, 
      teamId: teamData?.teamId, 
      input: input.trim(),
      agentsCount: teamData?.agents.length || 0
    });
    
    if (!teamData?.teamId || !selectedAgent || !input.trim()) {
      console.warn('🤖 [AITeamView] sendInput blocked - missing team, agent, or input');
      return;
    }

    try {
      // Note: Real AI orchestrator handles input internally via Claude API
      // This endpoint would need to be implemented for agent interaction
      console.log('🤖 [AITeamView] Note: Agent input via orchestrator not yet implemented');
      console.log('🤖 [AITeamView] Agent communication happens via Claude API internally');
      
      // For now, just clear the input
      setInputValue('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
      // TODO: Implement agent input API when needed for interactive debugging
      
    } catch (error) {
      console.error('🤖 [AITeamView] Error sending input:', error);
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendInput(inputValue);
    }
  };

  const handleRequirementKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      spawnAITeam();
    }
  };
  
  const resetTeam = () => {
    console.log('🔄 [AITeamView] Resetting team');
    setTeamData(null);
    setTeamSpawned(false);
    setRequirementInput('');
    setError(null);
    setSelectedTab('requirement');
    setSelectedAgent(null);
    
    // Focus on requirement input
    setTimeout(() => {
      if (requirementInputRef.current) {
        requirementInputRef.current.focus();
      }
    }, 100);
  };

  if (!isActive) {
    return (
      <div className="tmux-agent-view inactive">
        <div className="inactive-message">
          <div className="icon">🤖</div>
          <h3>AI Team Not Active</h3>
          <p>Click the AI Team button in the terminal to spawn agents</p>
        </div>
      </div>
    );
  }

  const agents = teamData?.agents || [];
  const currentAgent = agents.find(a => a.id === selectedAgent);

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return '⏸';
      case 'initializing': return '🔄';
      case 'thinking': return '🤔';
      case 'working': return '⚡';
      case 'waiting': return '⏳';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '•';
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return '#6b7280';
      case 'initializing': return '#f59e0b';
      case 'thinking': return '#8b5cf6';
      case 'working': return '#10b981';
      case 'waiting': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="tmux-agent-view">
      <div className="agent-header">
        <h2>
          🤖 {teamSpawned 
            ? `${agents.length} AGENTS ${teamData?.status?.toUpperCase() || 'WORKING'}` 
            : 'AI TEAM READY TO SPAWN'}
          {teamData?.generatedFiles ? ` - ${teamData.generatedFiles} FILES GENERATED` : ''}
        </h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Team Status Info */}
          {teamSpawned && teamData && (
            <div style={{ fontSize: '12px', color: '#9aa5ce', display: 'flex', gap: '8px' }}>
              <span>Workflow: {teamData.workflow}</span>
              <span>•</span>
              <span>Progress: {teamData.progress.overall}%</span>
            </div>
          )}
          
          {/* Magic Mode Toggle */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setMagicMode(false)}
              style={{
                padding: '6px 12px',
                background: !magicMode ? '#7aa2f7' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: !magicMode ? 'white' : '#9aa5ce',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: !magicMode ? 'bold' : 'normal'
              }}
            >
              🔧 Technical
            </button>
            <button
              onClick={() => setMagicMode(true)}
              style={{
                padding: '6px 12px',
                background: magicMode ? '#7aa2f7' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: magicMode ? 'white' : '#9aa5ce',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: magicMode ? 'bold' : 'normal'
              }}
            >
              ✨ Magic
            </button>
          </div>
          <div className="connection-indicator">
            <span className={`status-dot ${isConnected ? 'connected' : 'polling'}`}></span>
            <span className="status-text">{isConnected ? 'Live' : 'Polling'}</span>
          </div>
        </div>
      </div>
      
      <div className="agent-tabs">
        {/* Requirement tab - always visible */}
        <button
          className={`agent-tab requirement-tab ${selectedTab === 'requirement' ? 'active' : ''}`}
          onClick={() => {
            setSelectedTab('requirement');
            setSelectedAgent(null);
          }}
          style={{ '--status-color': teamSpawned ? '#10b981' : '#7aa2f7' } as React.CSSProperties}
        >
          <span className="status-icon">{teamSpawned ? '✅' : '📝'}</span>
          <span className="agent-name">{teamSpawned ? 'Project' : 'New Project'}</span>
        </button>
        
        {/* Real Agent tabs */}
        {agents.map(agent => (
          <button
            key={agent.id}
            className={`agent-tab ${selectedTab === agent.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedTab(agent.id);
              setSelectedAgent(agent.id);
            }}
            style={{ '--status-color': getStatusColor(agent.status) } as React.CSSProperties}
          >
            <span className="status-icon">{getStatusIcon(agent.status)}</span>
            <span className="agent-name">{agent.name}</span>
            <span className="agent-progress" style={{ fontSize: '11px', opacity: 0.7 }}>
              {agent.progress}%
            </span>
          </button>
        ))}
        {agents.length === 0 && selectedTab !== 'requirement' && (
          <div className="no-agents">Waiting for agents to spawn...</div>
        )}
      </div>
      
      <div className="agent-output" ref={outputRef}>
        {/* Show progress view in Magic Mode when team is spawned and not on requirement tab */}
        {magicMode && teamSpawned && selectedTab !== 'requirement' ? (
          <AgentProgressView 
            agents={agents.map(agent => ({
              id: agent.id,
              name: agent.name,
              role: agent.role,
              progress: agent.progress,
              status: agent.status,
              currentTask: agent.currentTask || 'Working...'
            }))}
            magicMode={magicMode}
          />
        ) : selectedTab === 'requirement' ? (
          // Project requirement interface
          <div className="requirement-interface">
            <div className="output-header">
              <span className="agent-role">📝 Project Requirements</span>
              <span className="agent-status" style={{ color: '#7aa2f7' }}>
                {isSpawningTeam ? '🚀 Spawning AI Team' : teamSpawned ? '✅ Team Active' : '💡 Ready to Start'}
              </span>
            </div>
            <div className="requirement-content">
              {teamSpawned && teamData ? (
                // Show team status and generated files
                <div className="team-active">
                  <h3>🚀 AI Team Active - {teamData.workflow}</h3>
                  <div className="team-summary">
                    <div className="requirement-display">
                      <strong>Project:</strong> {teamData.requirement}
                    </div>
                    <div className="progress-display">
                      <strong>Overall Progress:</strong> {teamData.progress.overall}%
                      <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '12px' }}>
                        <span>Planning: {teamData.progress.planning}%</span>
                        <span>Development: {teamData.progress.development}%</span>
                        <span>Testing: {teamData.progress.testing}%</span>
                        <span>Deployment: {teamData.progress.deployment}%</span>
                      </div>
                    </div>
                    {teamData.generatedFiles > 0 && (
                      <div className="files-display">
                        <strong>Generated Files:</strong> {teamData.generatedFiles}
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#9aa5ce' }}>
                          Files are being written to the project directory
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    <div className="agent-status-summary">
                      <strong>Agent Status:</strong>
                      <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                        {agents.map(agent => (
                          <div key={agent.id} style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '12px' }}>
                            <div style={{ color: getStatusColor(agent.status) }}>
                              {getStatusIcon(agent.status)} {agent.name}
                            </div>
                            <div style={{ color: '#9aa5ce' }}>{agent.progress}% - {agent.currentTask}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Show completion status */}
                  {teamData.status === 'completed' && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', borderRadius: '8px' }}>
                      <h4 style={{ color: '#4caf50', marginBottom: '8px' }}>🎉 Team Completed!</h4>
                      <p style={{ color: '#c0caf5' }}>
                        All agents have finished their tasks. {teamData.generatedFiles} files have been generated and saved to your project directory.
                      </p>
                    </div>
                  )}
                  
                  <button 
                    onClick={resetTeam} 
                    className="reset-button"
                    style={{ marginTop: '16px', padding: '8px 16px', background: 'rgba(122, 162, 247, 0.2)', border: '1px solid #7aa2f7', borderRadius: '4px', color: '#7aa2f7', cursor: 'pointer' }}
                  >
                    Start New Project
                  </button>
                </div>
              ) : (
                // Show requirement input
                <div className="requirement-input">
                  {/* Introduction for AI team */}
                  <div className="requirement-introduction" style={{ 
                    marginBottom: '24px', 
                    padding: '16px', 
                    background: 'rgba(122, 162, 247, 0.1)', 
                    border: '1px solid rgba(122, 162, 247, 0.3)', 
                    borderRadius: '8px' 
                  }}>
                    <h3 style={{ color: '#7aa2f7', marginBottom: '12px' }}>
                      🚀 Welcome to the AI Team Builder!
                    </h3>
                    <p style={{ marginBottom: '12px', color: '#c0caf5' }}>
                      I'll deploy and coordinate <strong>real Claude AI agents</strong> to build your project:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px', fontSize: '14px' }}>
                      <div><strong>🎨 Frontend Engineer</strong> - React & UI</div>
                      <div><strong>⚙️ Backend Engineer</strong> - APIs & databases</div>
                      <div><strong>🏗️ Security Analyst</strong> - Security & auth</div>
                      <div><strong>🧪 QA Testing</strong> - Testing & validation</div>
                      <div><strong>📐 UX Designer</strong> - Design systems</div>
                      <div><strong>🔧 DevOps Engineer</strong> - Deploy & CI/CD</div>
                    </div>
                    <p style={{ color: '#9aa5ce' }}>
                      Simply describe what you want to build and I'll automatically select the right agents and workflow. 
                      <strong>Real Claude API integration</strong> - no simulation!
                    </p>
                  </div>
                  
                  {error && (
                    <div style={{ 
                      marginBottom: '16px', 
                      padding: '12px', 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid #ef4444', 
                      borderRadius: '8px',
                      color: '#ef4444'
                    }}>
                      ❌ {error}
                    </div>
                  )}
                  
                  <div className="requirement-prompt">
                    <div className="requirement-label" style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                      What would you like to build?
                    </div>
                    <div style={{ fontSize: '12px', color: '#9aa5ce', marginBottom: '12px' }}>
                      Examples: "I want to build a React todo app", "Create a full-stack e-commerce site", "Build a Node.js API with authentication"
                    </div>
                  </div>
                  
                  {isSpawningTeam && (
                    <div className="spawning-status" style={{ marginBottom: '16px' }}>
                      <span className="pulse-dot"></span>
                      Spawning AI team and analyzing requirements...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : currentAgent ? (
          <>
            <div className="output-header">
              <span className="agent-role">{currentAgent.name}</span>
              <span className="agent-status" style={{ color: getStatusColor(currentAgent.status) }}>
                {getStatusIcon(currentAgent.status)} {currentAgent.status}
              </span>
            </div>
            <div className="output-content">
              {currentAgent.output.length > 0 ? (
                currentAgent.output.map((line, idx) => {
                  // Highlight important lines
                  let className = "output-line";
                  if (line.includes('UPDATE FROM QUEEN:')) {
                    className += " queen-message";
                  } else if (line.includes('✅') || line.includes('✓')) {
                    className += " success-message";
                  } else if (line.includes('❌') || line.includes('Error')) {
                    className += " error-message";
                  } else if (line.includes('Working…') || line.includes('⏺')) {
                    className += " working-message";
                  }
                  
                  return (
                    <div key={idx} className={className}>
                      {line}
                    </div>
                  );
                })
              ) : (
                <div className="no-output">
                  <div className="agent-waiting">
                    <span className="pulse-dot"></span>
                    {currentAgent.name} is ready for tasks...
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-selection">
            {agents.length > 0 ? 'Select an agent to view output' : 'No agents spawned yet'}
          </div>
        )}
      </div>
      
      <div className="agent-input-section">
        {selectedTab === 'requirement' ? (
          // Project requirement input
          <>
            <div className="input-label">
              {teamSpawned 
                ? 'AI team is active - check agent tabs for progress' 
                : 'Enter your project requirement:'}
            </div>
            <div className="input-row">
              <input
                ref={requirementInputRef}
                type="text"
                value={requirementInput}
                onChange={(e) => setRequirementInput(e.target.value)}
                onKeyPress={handleRequirementKeyPress}
                placeholder={
                  teamSpawned 
                    ? 'Team active - view agent tabs for progress' 
                    : 'I want to build a React todo app...'
                }
                disabled={teamSpawned || isSpawningTeam}
                className="agent-input"
              />
              <button
                onClick={spawnAITeam}
                disabled={!requirementInput.trim() || teamSpawned || isSpawningTeam}
                className="send-button"
              >
                {isSpawningTeam ? 'Spawning...' : teamSpawned ? 'Active' : 'Spawn AI Team'}
              </button>
            </div>
          </>
        ) : (
          // Regular agent input
          <>
            <div className="input-label">
              {selectedAgent 
                ? `Send input to ${agents.find(a => a.id === selectedAgent)?.name}:` 
                : agents.length === 0 
                  ? 'Waiting for agents to spawn...' 
                  : 'Select an agent to send input'}
            </div>
            <div className="input-row">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleInputKeyPress}
                placeholder={selectedAgent 
                  ? 'Type your response and press Enter...' 
                  : agents.length === 0 
                    ? 'Agents will auto-start with permissions...' 
                    : 'Select an agent first'}
                disabled={!selectedAgent}
                className="agent-input"
              />
              <button
                onClick={() => sendInput(inputValue)}
                disabled={!selectedAgent || !inputValue.trim()}
                className="send-button"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>

      <div className="agent-footer">
        <div className="session-info">
          {teamData ? (
            <>Team ID: <code>{teamData.teamId}</code></>
          ) : sessionId ? (
            <>Session: <code>{sessionId}</code></>
          ) : (
            'No active session'
          )}
        </div>
        <div className="team-count">
          {teamSpawned 
            ? `${agents.length} agent${agents.length !== 1 ? 's' : ''} active • ${teamData?.workflow || 'workflow'} • ${teamData?.generatedFiles || 0} files`
            : 'Ready to spawn AI team'
          }
        </div>
      </div>
    </div>
  );
};

export default TmuxAgentView;