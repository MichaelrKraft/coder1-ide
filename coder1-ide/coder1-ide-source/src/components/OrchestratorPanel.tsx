import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Search, 
  Users, 
  MessageSquare, 
  ClipboardList, 
  Beaker, 
  CheckCircle,
  UserCircle,
  Bot,
  Lightbulb,
  X,
  Settings,
  Rocket,
  Send,
  Terminal,
  Download,
  Plus,
  Info,
  MessagesSquare
} from 'lucide-react';
import { GradientDots } from '@/components/ui/gradient-dots';
import './OrchestratorPanel.css';

interface ConversationMessage {
  id: string;
  agent: string;
  message: string;
  timestamp: number;
  type: 'discovery' | 'team' | 'collaboration' | 'planning' | 'synthesis' | 'user' | 'system';
  phase?: string;
}

interface ConversationSession {
  sessionId: string;
  query: string;
  active: boolean;
  phase: 'discovery' | 'team' | 'collaboration' | 'planning' | 'synthesis' | 'complete';
  startTime: number;
  agents: string[];
  plans?: any[];
  finalPlan?: any;
}

interface OrchestratorPanelProps {
  visible: boolean;
  onClose: () => void;
}

const OrchestratorPanel: React.FC<OrchestratorPanelProps> = ({ visible, onClose }) => {
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Phase configuration with lucide-react icons
  const phases = [
    { key: 'discovery', label: 'Discovery', icon: Search, description: 'Orchestrator analyzes your requirements' },
    { key: 'team', label: 'Team Assembly', icon: Users, description: 'Assembles 3+ expert AI agents' },
    { key: 'collaboration', label: 'Collaboration', icon: MessageSquare, description: 'Experts discuss and ask questions' },
    { key: 'planning', label: 'Individual Planning', icon: ClipboardList, description: 'Each expert creates individual plans' },
    { key: 'synthesis', label: 'Plan Synthesis', icon: Beaker, description: 'Best ideas combined into final plan' },
    { key: 'complete', label: 'Complete', icon: CheckCircle, description: 'Your plan is ready' }
  ];

  useEffect(() => {
    if (!visible) return;

    // Connect to Socket.IO
    const socketUrl = 'http://localhost:3000';
    console.log('[OrchestratorPanel] Connecting to:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    setSocket(newSocket);

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('[OrchestratorPanel] Connected:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[OrchestratorPanel] Connection error:', error);
    });

    // Conversation events
    newSocket.on('conversation:started', (data) => {
      console.log('[OrchestratorPanel] Conversation started:', data);
      setSession({
        sessionId: data.sessionId,
        query: data.query || userQuery,
        active: true,
        phase: 'discovery',
        startTime: Date.now(),
        agents: data.agents || []
      });
      setIsLoading(false);
    });

    newSocket.on('conversation:phase-changed', (data) => {
      console.log('[OrchestratorPanel] Phase changed:', data);
      setSession(prev => prev ? { ...prev, phase: data.phase } : null);
      
      // Add phase transition message
      const phaseData = phases.find(p => p.key === data.phase);
      setMessages(prev => [...prev, {
        id: `phase-${Date.now()}`,
        agent: 'System',
        message: `Entering ${phaseData?.label} phase...`,
        timestamp: Date.now(),
        type: 'system',
        phase: data.phase
      }]);
    });

    newSocket.on('conversation:message', (data) => {
      console.log('[OrchestratorPanel] Message received:', data);
      setMessages(prev => [...prev, {
        id: data.id || `msg-${Date.now()}-${Math.random()}`,
        agent: data.agent || 'Agent',
        message: data.message,
        timestamp: data.timestamp || Date.now(),
        type: data.type || 'collaboration',
        phase: data.phase
      }]);
    });

    newSocket.on('conversation:plans-received', (data) => {
      console.log('[OrchestratorPanel] Plans received:', data);
      setSession(prev => prev ? { ...prev, plans: data.plans } : null);
    });

    newSocket.on('conversation:synthesis-complete', (data) => {
      console.log('[OrchestratorPanel] Synthesis complete:', data);
      setSession(prev => prev ? { 
        ...prev, 
        finalPlan: data.finalPlan,
        phase: 'complete'
      } : null);
      
      setMessages(prev => [...prev, {
        id: `synthesis-${Date.now()}`,
        agent: 'Orchestrator',
        message: 'Expert consultation complete! Final plan has been synthesized from all expert insights.',
        timestamp: Date.now(),
        type: 'synthesis'
      }]);
    });

    newSocket.on('conversation:complete', (data) => {
      console.log('[OrchestratorPanel] Conversation complete:', data);
      setSession(prev => prev ? { ...prev, active: false, phase: 'complete' } : null);
    });

    newSocket.on('conversation:error', (data) => {
      console.error('[OrchestratorPanel] Conversation error:', data);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        agent: 'System',
        message: `Error: ${data.error}`,
        timestamp: Date.now(),
        type: 'system'
      }]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [visible, userQuery]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = () => {
    if (!userQuery.trim() || !socket) return;

    console.log('[OrchestratorPanel] Starting conversation:', userQuery);
    setIsLoading(true);
    setMessages([]);

    // Add initial system message
    setMessages([{
      id: `start-${Date.now()}`,
      agent: 'System',
      message: 'Initializing AI Mastermind consultation...',
      timestamp: Date.now(),
      type: 'system'
    }]);

    // Emit conversation start
    socket.emit('conversation:start', {
      query: userQuery.trim(),
      options: {
        minAgents: 3,
        includeQuestions: true,
        maxDiscussionRounds: 3
      }
    });
  };

  const sendUserMessage = () => {
    if (!userInput.trim() || !socket || !session?.sessionId) return;

    console.log('[OrchestratorPanel] Sending user message:', userInput);

    // Add user message to display
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      agent: 'You',
      message: userInput.trim(),
      timestamp: Date.now(),
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);

    // Send to server
    socket.emit('conversation:message', {
      sessionId: session.sessionId,
      message: userInput.trim(),
      sender: 'user',
      timestamp: Date.now()
    });

    setUserInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'start' | 'send') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (action === 'start') {
        startConversation();
      } else {
        sendUserMessage();
      }
    }
  };

  const generateClaudeCodePrompt = () => {
    if (!socket || !session?.sessionId) return;

    console.log('[OrchestratorPanel] Generating Claude Code prompt');
    socket.emit('conversation:generate-claude-code', {
      sessionId: session.sessionId
    });
  };

  const getCurrentPhaseIndex = () => {
    return phases.findIndex(p => p.key === (session?.phase || 'discovery'));
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'discovery': return Search;
      case 'team': return Users;
      case 'collaboration': return MessageSquare;
      case 'planning': return ClipboardList;
      case 'synthesis': return Beaker;
      case 'user': return UserCircle;
      case 'system': return Bot;
      default: return Lightbulb;
    }
  };

  if (!visible) return null;

  return (
    <div className="orchestrator-panel">
      <div className="orchestrator-header">
        <div className="header-content">
          <div className="header-title">
            <div className="logo-section">
              <div className="logo-icon">
                <Settings className="w-6 h-6" />
              </div>
              <h2>AI Mastermind Consultation</h2>
            </div>
            <button className="close-button" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {session?.active && (
            <div className="session-status">
              <div className="status-indicator"></div>
              <span>Expert consultation in progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Gradient Dots Background */}
      <GradientDots backgroundColor="#0a0a0a" className="opacity-30" />

      <div className="orchestrator-content">
        {!session?.active && !isLoading ? (
          <div className="consultation-setup">
            <div className="setup-header">
              <div className="setup-icon">
                <Lightbulb className="w-8 h-8" />
              </div>
              <h3>Start Expert Consultation</h3>
              <p className="setup-subtitle">
                Transform your idea into an expert-grade development plan through AI-powered collaboration
              </p>
            </div>

            <div className="input-section">
              <label htmlFor="user-query">What would you like to build?</label>
              <div className="query-input-wrapper">
                <textarea
                  id="user-query"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'start')}
                  placeholder="Describe your project idea, challenge, or goal in detail..."
                  rows={4}
                  disabled={isLoading}
                  className="query-input"
                />
                <div className="input-hint">
                  <Info className="w-4 h-4" />
                  <span>The more details you provide, the better the expert consultation</span>
                </div>
              </div>
            </div>

            <div className="process-preview">
              <h4>How it works:</h4>
              <div className="process-steps">
                {phases.slice(0, -1).map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <div key={phase.key} className="process-step">
                      <div className="step-icon-wrapper">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="step-info">
                        <div className="step-title">{phase.label}</div>
                        <div className="step-description">{phase.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="start-consultation-btn"
              onClick={startConversation}
              disabled={!userQuery.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Initializing...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Start Expert Consultation
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="conversation-area">
            <div className="phase-progress">
              <div className="progress-header">
                <h4>Consultation Progress</h4>
                <span className="phase-indicator">{getCurrentPhaseIndex() + 1} of {phases.length - 1}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{
                    width: `${((getCurrentPhaseIndex() + 1) / (phases.length - 1)) * 100}%`
                  }}
                ></div>
              </div>
              <div className="phase-steps">
                {phases.slice(0, -1).map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <div 
                      key={phase.key} 
                      className={`phase-step ${index <= getCurrentPhaseIndex() ? 'completed' : ''} ${phase.key === session?.phase ? 'active' : ''}`}
                    >
                      <div className="phase-icon">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="phase-label">{phase.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="messages-container">
              {messages.map((message) => {
                const MessageIcon = getMessageTypeIcon(message.type);
                return (
                  <div 
                    key={message.id} 
                    className={`message ${message.type} ${message.agent === 'You' ? 'user-message' : ''}`}
                  >
                    <div className="message-header">
                      <div className="message-meta">
                        <span className="message-icon">
                          <MessageIcon className="w-4 h-4" />
                        </span>
                        <span className="agent-name">{message.agent}</span>
                        <span className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {message.phase && (
                        <span className="message-phase">{phases.find(p => p.key === message.phase)?.label}</span>
                      )}
                    </div>
                    <div className="message-content">{message.message}</div>
                  </div>
                );
              })}
              
              {session?.active && (
                <div className="user-interaction-area">
                  <div className="interaction-prompt">
                    <MessagesSquare className="w-4 h-4" />
                    <span>You can join the conversation at any time</span>
                  </div>
                  <div className="interaction-controls">
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'send')}
                      placeholder="Share your thoughts, ask questions, or provide direction..."
                      rows={2}
                      className="user-message-input"
                    />
                    <button 
                      onClick={sendUserMessage}
                      disabled={!userInput.trim()}
                      className="send-message-btn"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {session?.phase === 'complete' && session.finalPlan && (
              <div className="completion-actions">
                <div className="completion-header">
                  <div className="completion-icon">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div className="completion-content">
                    <h3>Expert Consultation Complete!</h3>
                    <p>Your comprehensive development plan is ready</p>
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button 
                    className="claude-code-btn primary"
                    onClick={generateClaudeCodePrompt}
                  >
                    <Terminal className="w-5 h-5" />
                    Generate Claude Code Prompt
                  </button>
                  <button className="export-btn secondary">
                    <Download className="w-5 h-5" />
                    Export Plan
                  </button>
                  <button className="new-consultation-btn secondary" onClick={() => {
                    setSession(null);
                    setMessages([]);
                    setUserQuery('');
                  }}>
                    <Plus className="w-5 h-5" />
                    New Consultation
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrchestratorPanel;