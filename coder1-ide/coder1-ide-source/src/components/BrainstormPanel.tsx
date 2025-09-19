import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './BrainstormPanel.css';

interface AgentMessage {
  agent: string;
  message: string;
  timestamp: number;
  type: 'message' | 'question' | 'convergence' | 'synthesis';
}

interface BrainstormSession {
  sessionId: string;
  query: string;
  active: boolean;
  startTime?: number;
  duration?: number;
  currentRound?: number;
  maxRounds?: number;
  totalMessages?: number;
}

interface BrainstormPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface UserInput {
  message: string;
  timestamp: number;
}

const BrainstormPanel: React.FC<BrainstormPanelProps> = ({ visible, onClose }) => {
  const [session, setSession] = useState<BrainstormSession | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Debug logging
  console.log('[BrainstormPanel] Render - session:', session, 'visible:', visible);
  
  // Available agent options
  const availableAgents = [
    { id: 'frontend-specialist', name: 'Frontend Specialist', icon: '🎨' },
    { id: 'backend-specialist', name: 'Backend Specialist', icon: '⚙️' },
    { id: 'database-specialist', name: 'Database Expert', icon: '🗄️' },
    { id: 'security-specialist', name: 'Security Expert', icon: '🔐' },
    { id: 'architect', name: 'System Architect', icon: '🏗️' },
    { id: 'devops-specialist', name: 'DevOps Engineer', icon: '🔧' }
  ];
  
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['frontend-specialist', 'backend-specialist']);
  const [brainstormMode, setBrainstormMode] = useState('collaborative');
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [maxRounds, setMaxRounds] = useState(3);
  const [userInput, setUserInput] = useState('');
  const [canInteract, setCanInteract] = useState(true); // Enable user interaction from the start
  
  useEffect(() => {
    if (!visible) return;
    
    // Connect to Socket.IO with better configuration
    const socketUrl = 'http://localhost:3000'; // Hardcode the server port
    console.log('[BrainstormPanel] Attempting Socket.IO connection to:', socketUrl);
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });
    
    // Set socket immediately, don't wait for connect event
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('[BrainstormPanel] Socket.IO connected successfully:', newSocket.id);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('[BrainstormPanel] Socket.IO connection error:', error);
    });
    
    // Handle brainstorm events
    newSocket.on('brainstorm:started', (data) => {
      console.log('[BrainstormPanel] Socket.IO received brainstorm:started:', data);
      setSession({
        sessionId: data.sessionId,
        query: data.query || query,
        active: true,
        startTime: Date.now(),
        currentRound: 1,
        maxRounds: data.maxRounds || maxRounds,
        totalMessages: 0
      });
      setIsLoading(false);
    });
    
    newSocket.on('brainstorm:agent-message', (data) => {
      console.log('[BrainstormPanel] Agent message:', data);
      setMessages(prev => [...prev, {
        agent: data.agent,
        message: data.message,
        timestamp: data.timestamp,
        type: 'message'
      }]);
      
      // Update session with round and message count info
      setSession(prev => prev ? {
        ...prev,
        currentRound: data.round || prev.currentRound,
        totalMessages: (prev.totalMessages || 0) + 1
      } : null);
      
      // User interaction is always enabled (removed the 2-message requirement)
    });
    
    newSocket.on('brainstorm:question', (data) => {
      setMessages(prev => [...prev, {
        agent: data.agent || 'System',
        message: `Questions: ${data.questions ? data.questions.join(', ') : data.message}`,
        timestamp: data.timestamp,
        type: 'question'
      }]);
    });
    
    newSocket.on('brainstorm:convergence', (data) => {
      setMessages(prev => [...prev, {
        agent: 'System',
        message: `Convergence detected: ${data.reason} (Round ${data.round})`,
        timestamp: Date.now(),
        type: 'convergence'
      }]);
    });
    
    newSocket.on('brainstorm:synthesis', (data) => {
      setMessages(prev => [...prev, {
        agent: 'System',
        message: `Synthesis: ${data.synthesis}`,
        timestamp: Date.now(),
        type: 'synthesis'
      }]);
      
      // Update session to show synthesis phase
      setSession(prev => prev ? {
        ...prev,
        currentRound: prev.maxRounds || maxRounds
      } : null);
    });
    
    // New: Handle round progression events
    newSocket.on('brainstorm:round-started', (data) => {
      console.log('[BrainstormPanel] Round started:', data.round);
      setSession(prev => prev ? {
        ...prev,
        currentRound: data.round
      } : null);
      
      // Add a system message for round progression
      setMessages(prev => [...prev, {
        agent: 'System',
        message: `🔄 Starting Round ${data.round} of ${maxRounds}...`,
        timestamp: Date.now(),
        type: 'convergence'
      }]);
    });
    
    newSocket.on('brainstorm:session-complete', (data) => {
      console.log('[BrainstormPanel] Session completed:', data);
      setSession(prev => prev ? { ...prev, active: false } : null);
      setMessages(prev => [...prev, {
        agent: 'System',
        message: data.stopped ? 'Brainstorm session stopped.' : 'Brainstorm session completed.',
        timestamp: Date.now(),
        type: 'synthesis'
      }]);
    });
    
    newSocket.on('brainstorm:error', (data) => {
      console.error('[BrainstormPanel] Brainstorm error:', data.error);
      setIsLoading(false);
      setSession(prev => prev ? { ...prev, active: false } : null);
      alert(`Brainstorm error: ${data.error}`);
    });
    
    newSocket.on('error', (error) => {
      console.error('[BrainstormPanel] Socket.IO error:', error);
    });
    
    newSocket.on('disconnect', () => {
      console.log('[BrainstormPanel] Socket.IO disconnected');
      setSocket(null);
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, [visible, query]); // Added query to dependencies since it's used in the started event handler
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startBrainstorm = () => {
    console.log('[BrainstormPanel] startBrainstorm called - query:', query, 'agents:', selectedAgents);
    console.log('[BrainstormPanel] Socket state:', socket ? `Connected: ${socket.connected}, ID: ${socket.id}` : 'No socket');
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setMessages([]);
    
    // Always try to use Socket.IO first, with better connection checking
    if (socket) {
      console.log('[BrainstormPanel] Attempting to start live brainstorm session via Socket.IO');
      
      // Add connection status message
      setMessages([{
        agent: 'System',
        message: socket.connected 
          ? `Starting AI Mastermind with ${selectedAgents.length} agents...` 
          : 'Connecting to AI backend...',
        timestamp: Date.now(),
        type: 'message'
      }]);
      
      // Force connection if not connected
      if (!socket.connected) {
        console.log('[BrainstormPanel] Socket not connected, attempting to reconnect...');
        socket.connect();
        
        // Wait a moment for connection then emit
        setTimeout(() => {
          if (socket.connected) {
            console.log('[BrainstormPanel] Reconnected successfully, starting brainstorm');
            emitBrainstormStart();
          } else {
            console.log('[BrainstormPanel] Reconnection failed, but trying anyway');
            emitBrainstormStart();
          }
        }, 1000);
      } else {
        // Already connected, emit immediately
        emitBrainstormStart();
      }
      
      // Initialize session state
      setSession({
        sessionId: `pending-${Date.now()}`, // Will be updated by server
        active: true,
        query,
        startTime: Date.now()
      });
      
      setIsLoading(false);
    } else {
      console.log('[BrainstormPanel] No socket available, falling back to simulation');
      // Fallback: Simulate AI Mastermind session
      setIsLoading(false);
      simulateBrainstormSession();
    }
  };

  const emitBrainstormStart = () => {
    console.log('[BrainstormPanel] Emitting brainstorm:start event');
    socket?.emit('brainstorm:start', {
      query,
      options: {
        agents: selectedAgents,
        maxRounds,
        includeQuestions,
        mode: brainstormMode
      }
    });
  };

  const simulateBrainstormSession = () => {
    console.log('[BrainstormPanel] Starting simulation mode');
    // Create session when simulation starts
    const newSession = {
      sessionId: `brainstorm-${Date.now()}`,
      query: query.trim(),
      active: true,
      startTime: Date.now()
    };
    setSession(newSession);
    console.log('[BrainstormPanel] Session activated for simulation:', newSession);
    
    const simulatedMessages: AgentMessage[] = [
      {
        agent: 'System',
        message: 'AI Mastermind session started with mock agents. Connect to Socket.IO server for full functionality.',
        timestamp: Date.now(),
        type: 'message'
      },
      {
        agent: 'Frontend Specialist',
        message: `For the query "${query}", I suggest focusing on user interface patterns and component architecture.`,
        timestamp: Date.now() + 1000,
        type: 'message'
      },
      {
        agent: 'Backend Specialist', 
        message: `From a backend perspective, we should consider API design, data modeling, and scalability requirements.`,
        timestamp: Date.now() + 2000,
        type: 'message'
      },
      {
        agent: 'System',
        message: 'This is a demonstration of the AI Mastermind interface. Connect to a Socket.IO server for full functionality.',
        timestamp: Date.now() + 3000,
        type: 'synthesis'
      }
    ];

    // Add messages progressively to simulate real-time conversation
    simulatedMessages.forEach((message, index) => {
      setTimeout(() => {
        setMessages(prev => [...prev, message]);
        
        // Mark session as complete after last message
        if (index === simulatedMessages.length - 1) {
          setTimeout(() => {
            setSession(prev => prev ? { ...prev, active: false } : null);
          }, 2000);
        }
      }, index * 1500);
    });
  };

  const stopBrainstorm = () => {
    if (!socket || !session?.sessionId) return;
    
    console.log('[BrainstormPanel] Stopping brainstorm session:', session.sessionId);
    socket.emit('brainstorm:stop', {
      sessionId: session.sessionId
    });
  };

  const sendUserInput = () => {
    if (!socket || !session?.sessionId || !userInput.trim()) return;
    
    console.log('[BrainstormPanel] Sending user input:', userInput);
    
    // Add user message to local display
    const userMessage: AgentMessage = {
      agent: '👤 You',
      message: userInput.trim(),
      timestamp: Date.now(),
      type: 'message'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send to server
    socket.emit('brainstorm:user-input', {
      sessionId: session.sessionId,
      message: userInput.trim(),
      timestamp: Date.now()
    });
    
    setUserInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserInput();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'question': return '❓';
      case 'convergence': return '🎯';
      case 'synthesis': return '💡';
      default: return '💬';
    }
  };

  if (!visible) return null;

  return (
    <div className="brainstorm-panel">
      <div className="brainstorm-panel-header">
        <div className="header-title">
          <h3>🧠 AI Mastermind</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {session?.active && (
          <div className="session-status">
            <div className="status-indicator active"></div>
            <span>Session Active • {selectedAgents.length} agents</span>
          </div>
        )}
      </div>

      <div className="brainstorm-panel-content">
        {!session?.active ? (
          <div className="brainstorm-setup">
            <div className="input-group">
              <label>Brainstorming Query:</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like the agents to brainstorm about?"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <label>Select Agents:</label>
              <div className="agent-selector">
                {availableAgents.map(agent => (
                  <label key={agent.id} className="agent-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAgents([...selectedAgents, agent.id]);
                        } else {
                          setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                        }
                      }}
                      disabled={isLoading}
                    />
                    <span className="agent-label">
                      {agent.icon} {agent.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label>Brainstorm Mode:</label>
              <select
                value={brainstormMode}
                onChange={(e) => setBrainstormMode(e.target.value)}
                disabled={isLoading}
              >
                <option value="collaborative">Collaborative</option>
                <option value="debate">Debate</option>
                <option value="exploratory">Exploratory</option>
              </select>
            </div>

            <div className="advanced-options">
              <h4>Advanced Options</h4>
              
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={includeQuestions}
                  onChange={(e) => setIncludeQuestions(e.target.checked)}
                  disabled={isLoading}
                />
                Include Clarifying Questions
              </label>

              <div className="input-group">
                <label>Max Rounds:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxRounds}
                  onChange={(e) => setMaxRounds(parseInt(e.target.value) || 3)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              className="start-button"
              onClick={startBrainstorm}
              disabled={!query.trim() || selectedAgents.length === 0 || isLoading}
            >
              {isLoading ? 'Starting...' : '🚀 Activate AI Mastermind'}
            </button>
          </div>
        ) : (
          <>
            <div className="messages-container">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.type} ${message.agent === '👤 You' ? 'user-message' : ''}`}>
                  <div className="message-header">
                    <span className="message-icon">{getMessageIcon(message.type)}</span>
                    <span className="agent-name">{message.agent}</span>
                    <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                  </div>
                  <div className="message-content">{message.message}</div>
                </div>
              ))}
              
              {session?.active && (
                <div className="user-input-section">
                  <div className="input-prompt">
                    💬 <strong>Join the conversation!</strong> Share your thoughts, ask questions, or provide direction:
                  </div>
                  <div className="user-input-controls">
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your input here... (Press Enter to send, Shift+Enter for new line)"
                      rows={2}
                      className="user-input-field"
                    />
                    <button 
                      onClick={sendUserInput}
                      disabled={!userInput.trim()}
                      className="send-input-button"
                    >
                      🚀 Send
                    </button>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="session-controls">
              <div className="session-progress">
                <div className="progress-info">
                  <span className="progress-text">Round {session?.currentRound || 1} of {maxRounds}</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${((session?.currentRound || 1) / maxRounds) * 100}%`}}
                    ></div>
                  </div>
                </div>
                <div className="session-phase">
                  {(session?.currentRound || 1) < maxRounds ? 
                    '🧠 AI agents collaborating...' : 
                    '✨ Generating synthesis...'}
                </div>
              </div>
              
              <div className="control-buttons">
                <button 
                  className="stop-button-warning" 
                  onClick={() => {
                    if (window.confirm(`⚠️ This will stop the session before synthesis is complete. You'll miss the final summary and insights. Are you sure?`)) {
                      stopBrainstorm();
                    }
                  }}
                  title="Stop session early (not recommended)"
                >
                  ⏸ Stop Early
                </button>
              </div>
              
              <div className="session-info">
                <span>Query: "{session.query}"</span>
                <div className="session-status">
                  <span className="status-dot active"></span>
                  <span>Session will auto-complete {maxRounds} rounds + synthesis</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BrainstormPanel;