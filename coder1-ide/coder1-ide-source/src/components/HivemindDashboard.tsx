import React, { useState } from 'react';
import './HivemindDashboard.css';

interface Agent {
  id: number;
  name: string;
  role: string;
  status: 'idle' | 'working';
  currentTask: any;
  progress: number;
  specialization: string;
  tasksCompleted: number;
}

interface HivemindSession {
  id: string;
  status: string;
  agents: Agent[];
  queen: number;
  taskQueue: any[];
  completedTasks: any[];
  metrics: {
    tasksCompleted: number;
    discoveryCount: number;
    patternsIdentified: number;
    contextSize: number;
  };
}

interface HivemindDashboardProps {
  onClose: () => void;
  sessionId?: string;
}

const HivemindDashboard: React.FC<HivemindDashboardProps> = ({ onClose, sessionId }) => {
  const [session, setSession] = useState<HivemindSession | null>(null);
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const startHivemindSession = async () => {
    setIsStarting(true);
    
    // Simulate session creation
    setTimeout(() => {
      const mockSession: HivemindSession = {
        id: `session_${Date.now()}`,
        status: 'active',
        queen: 0,
        taskQueue: [
          { description: 'Analyze project requirements' },
          { description: 'Generate component structure' },
          { description: 'Implement core functionality' }
        ],
        completedTasks: [],
        metrics: {
          tasksCompleted: 0,
          discoveryCount: 0,
          patternsIdentified: 0,
          contextSize: 1024
        },
        agents: [
          {
            id: 0,
            name: 'Queen Agent',
            role: 'Coordinator',
            specialization: 'Task Coordination & Strategy',
            status: 'working',
            currentTask: { description: 'Coordinating team efforts' },
            progress: 75,
            tasksCompleted: 3
          },
          {
            id: 1,
            name: 'Worker Agent Alpha',
            role: 'Implementation',
            specialization: 'Frontend Development',
            status: 'working',
            currentTask: { description: 'Building React components' },
            progress: 60,
            tasksCompleted: 2
          },
          {
            id: 2,
            name: 'Worker Agent Beta',
            role: 'Analysis',
            specialization: 'Code Review & Testing',
            status: 'idle',
            currentTask: null,
            progress: 0,
            tasksCompleted: 1
          }
        ]
      };
      
      setSession(mockSession);
      setDiscoveries([
        { agentName: 'Queen Agent', content: 'Identified optimal task distribution strategy' },
        { agentName: 'Worker Alpha', content: 'Discovered reusable component pattern' },
        { agentName: 'Worker Beta', content: 'Found potential optimization opportunity' }
      ]);
      setIsStarting(false);
    }, 2000);
  };

  const stopSession = () => {
    setSession(null);
    setDiscoveries([]);
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'working': return '#4CAF50';
      case 'idle': return '#9E9E9E';
      default: return '#FFC107';
    }
  };

  return (
    <div className="hivemind-dashboard">
      <div className="hivemind-header">
        <h2>🧠 Hivemind Control Center</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {!session ? (
        <div className="hivemind-start">
          <h3>Start a Hivemind Session</h3>
          <p>Coordinate 3 AI agents with shared context and memory</p>
          <button 
            className="start-button"
            onClick={startHivemindSession}
            disabled={isStarting}
          >
            {isStarting ? 'Starting...' : '🚀 Start Hivemind'}
          </button>
        </div>
      ) : (
        <>
          <div className="hivemind-controls">
            <div className="session-info">
              <span>Session: {session.id}</span>
              <span>Status: {session.status}</span>
            </div>
            <button className="stop-button" onClick={stopSession}>
              Stop Session
            </button>
          </div>

          <div className="agents-grid">
            {session.agents.map((agent, index) => (
              <div key={agent.id} className="agent-card">
                <div className="agent-header">
                  <h4>{agent.name}</h4>
                  <span 
                    className="status-indicator"
                    style={{ backgroundColor: getAgentStatusColor(agent.status) }}
                  />
                </div>
                <div className="agent-role">{agent.specialization}</div>
                <div className="progress-container">
                  <div 
                    className="progress-bar"
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
                <div className="agent-task">
                  {agent.currentTask ? (
                    <>
                      <span className="task-label">Task:</span>
                      <span className="task-description">
                        {agent.currentTask.description}
                      </span>
                    </>
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

          <div className="hivemind-info">
            <div className="task-queue">
              <h4>Task Queue</h4>
              <div className="queue-items">
                {session.taskQueue.length > 0 ? (
                  session.taskQueue.map((task, index) => (
                    <div key={index} className="queue-item">
                      {index > 0 && <span className="arrow">→</span>}
                      <span className="task-item">{task.description}</span>
                    </div>
                  ))
                ) : (
                  <span className="empty-queue">No pending tasks</span>
                )}
              </div>
            </div>

            <div className="metrics">
              <h4>Session Metrics</h4>
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-value">{session.metrics.tasksCompleted}</span>
                  <span className="metric-label">Tasks Completed</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{session.metrics.discoveryCount}</span>
                  <span className="metric-label">Discoveries</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{session.metrics.patternsIdentified}</span>
                  <span className="metric-label">Patterns</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{session.metrics.contextSize}</span>
                  <span className="metric-label">Context Size</span>
                </div>
              </div>
            </div>
          </div>

          {discoveries.length > 0 && (
            <div className="discoveries-feed">
              <h4>Recent Discoveries</h4>
              <div className="discoveries-list">
                {discoveries.map((discovery, index) => (
                  <div key={index} className="discovery-item">
                    <span className="discovery-agent">[{discovery.agentName}]</span>
                    <span className="discovery-content">{discovery.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HivemindDashboard;