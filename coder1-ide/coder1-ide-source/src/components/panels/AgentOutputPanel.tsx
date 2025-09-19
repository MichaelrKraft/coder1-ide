import React, { useState, useEffect, useRef } from 'react';
import './AgentOutputPanel.css';

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'authenticating' | 'working' | 'completed' | 'error';
  output: string[];
  lastActivity: Date;
}

interface AgentOutputPanelProps {
  sessionId?: string;
  visible: boolean;
  onClose: () => void;
}

export const AgentOutputPanel: React.FC<AgentOutputPanelProps> = ({ 
  sessionId, 
  visible, 
  onClose 
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!visible || !sessionId) return;

    // Connect to WebSocket for live agent output
    const ws = new WebSocket(`ws://localhost:3000/api/experimental/agent-stream/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to agent output stream');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'agent-list') {
          // Initial agent list
          setAgents(data.agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            status: a.status || 'idle',
            output: [],
            lastActivity: new Date()
          })));
          
          // Auto-select first agent
          if (data.agents.length > 0 && !selectedAgent) {
            setSelectedAgent(data.agents[0].id);
          }
        } else if (data.type === 'agent-output') {
          // Live output from an agent
          setAgents(prev => prev.map(agent => 
            agent.id === data.agentId 
              ? {
                  ...agent,
                  output: [...agent.output, data.line],
                  lastActivity: new Date()
                }
              : agent
          ));
          
          // Auto-scroll if viewing this agent
          if (data.agentId === selectedAgent && outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        } else if (data.type === 'agent-status') {
          // Status update for an agent
          setAgents(prev => prev.map(agent =>
            agent.id === data.agentId
              ? { ...agent, status: data.status }
              : agent
          ));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected from agent output stream');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [visible, sessionId, selectedAgent]);

  // Poll for tmux output if WebSocket not available
  useEffect(() => {
    if (!visible || !sessionId || isConnected) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/experimental/agent-output/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.agents) {
            setAgents(data.agents.map((a: any) => ({
              id: a.id,
              name: a.name,
              status: a.status || 'idle',
              output: a.output || [],
              lastActivity: new Date(a.lastActivity || Date.now())
            })));
            
            // Auto-select first agent
            if (data.agents.length > 0 && !selectedAgent) {
              setSelectedAgent(data.agents[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error polling agent output:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [visible, sessionId, selectedAgent, isConnected]);

  if (!visible) return null;

  const currentAgent = agents.find(a => a.id === selectedAgent);

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return '⏸';
      case 'authenticating': return '🔐';
      case 'working': return '⚡';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '•';
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return '#6b7280';
      case 'authenticating': return '#f59e0b';
      case 'working': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="agent-output-panel">
      <div className="panel-header">
        <h3>Live Agent Output</h3>
        <div className="panel-controls">
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Live' : '🔴 Polling'}
          </span>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
      </div>
      
      <div className="panel-body">
        <div className="agent-tabs">
          {agents.map(agent => (
            <button
              key={agent.id}
              className={`agent-tab ${selectedAgent === agent.id ? 'active' : ''}`}
              onClick={() => setSelectedAgent(agent.id)}
              style={{ borderColor: getStatusColor(agent.status) }}
            >
              <span className="status-icon">{getStatusIcon(agent.status)}</span>
              <span className="agent-name">{agent.name}</span>
            </button>
          ))}
          {agents.length === 0 && (
            <div className="no-agents">No agents spawned yet...</div>
          )}
        </div>
        
        <div className="output-container" ref={outputRef}>
          {currentAgent ? (
            currentAgent.output.length > 0 ? (
              currentAgent.output.map((line, idx) => (
                <div key={idx} className="output-line">
                  {line}
                </div>
              ))
            ) : (
              <div className="no-output">
                Waiting for output from {currentAgent.name}...
              </div>
            )
          ) : (
            <div className="no-selection">
              Select an agent to view output
            </div>
          )}
        </div>
      </div>
      
      {sessionId && (
        <div className="panel-footer">
          <span className="session-id">Session: {sessionId}</span>
          <button 
            className="refresh-button"
            onClick={() => {
              // Force refresh by reconnecting
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
            }}
          >
            🔄 Refresh
          </button>
        </div>
      )}
    </div>
  );
};