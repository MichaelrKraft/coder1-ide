import React, { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import type { Socket } from 'socket.io-client';

interface AgentStatus {
  agentId: string;
  role: string;
  status: 'idle' | 'working' | 'complete' | 'error';
  bufferSize: number;
}

export function TeamStatusIndicator() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      try {
        const sock = await getSocket();
        setSocket(sock);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };
    
    initSocket();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for team status updates
    const handleTeamUpdate = (data: { agents: AgentStatus[] }) => {
      setAgents(data.agents);
    };

    socket.on('team:status:update', handleTeamUpdate);

    // Request initial status
    socket.emit('team:status:request');

    return () => {
      socket.off('team:status:update', handleTeamUpdate);
    };
  }, [socket]);

  const activeCount = agents.filter(a => a.status !== 'idle').length;
  const totalCount = agents.length;

  if (totalCount === 0) {
    return null; // Don't show if no agents
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'working': return '⚙️';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '💤';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return '#3b82f6'; // blue
      case 'complete': return '#10b981'; // green
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div className="relative">
      {/* Main indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded transition-colors"
        title="AI Team Status"
      >
        <span className="text-lg">🤖</span>
        <span>
          {activeCount > 0 ? (
            <span className="text-blue-400">
              {activeCount}/{totalCount} active
            </span>
          ) : (
            <span className="text-gray-500">
              {totalCount} agents
            </span>
          )}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 z-50">
          <div className="text-xs font-semibold text-gray-400 mb-2">
            AI Team Status
          </div>
          
          <div className="space-y-2">
            {agents.map(agent => (
              <div key={agent.agentId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{getStatusEmoji(agent.status)}</span>
                  <span className="text-xs text-gray-300">{agent.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getStatusColor(agent.status) }}
                  />
                  {agent.bufferSize > 0 && (
                    <span className="text-xs text-gray-500">
                      {agent.bufferSize} chars
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-500">
              Use /team commands in terminal to control
            </div>
          </div>
        </div>
      )}
    </div>
  );
}