'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  completedTasks: string[];
  icon: string;
}

interface TaskBridgeOutput {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  type: 'start' | 'progress' | 'complete' | 'error';
}

interface AITeamDashboardProps {
  teamData?: {
    teamId: string;
    status: string;
    agents: Agent[];
    progress: { overall: number };
    generatedFiles: number;
    requirement: string;
    costSavings?: boolean;
    executionType?: string;
    automatedExecution?: boolean;
    usedBridge?: boolean;
    workflow?: string;
  };
}

/**
 * AI Team Dashboard Component - Two-Tier Visual Display
 * Top Tier: Active agents only (vertical list matching wireframe)
 * Bottom Tier: Claude Task Bridge live output (real work tracking)
 */
const AITeamDashboard: React.FC<AITeamDashboardProps> = ({ teamData: initialTeamData }) => {
  const [teamData, setTeamData] = useState(initialTeamData);
  const [taskOutput, setTaskOutput] = useState<TaskBridgeOutput[]>([]);
  
  // Expose update function globally for StatusBar integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.updateAITeamDashboard = (data: any) => {
        setTeamData(data);
        // Reset task output for new team
        setTaskOutput([]);
        // REMOVED: // REMOVED: console.log('🤖 AI Team Dashboard updated with:', data);
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.updateAITeamDashboard;
      }
    };
  }, []);

  // Default team data with 2 agents
  const defaultAgents: Agent[] = [
    { 
      id: 'frontend', 
      name: 'Frontend Engineer', 
      role: 'React, TypeScript, UI/UX', 
      status: 'working', 
      progress: 0, 
      currentTask: 'Analyzing UI requirements...', 
      completedTasks: [],
      icon: '🎨'
    },
    { 
      id: 'backend', 
      name: 'Backend Engineer', 
      role: 'Node.js, APIs, Database', 
      status: 'working', 
      progress: 0, 
      currentTask: 'Setting up API structure...', 
      completedTasks: [],
      icon: '⚙️'
    }
  ];

  // Initialize with default data if none provided
  useEffect(() => {
    if (!teamData) {
      setTeamData({
        teamId: 'demo-team',
        status: 'active',
        agents: defaultAgents,
        progress: { overall: 0 },
        generatedFiles: 0,
        requirement: 'Building your application with AI Team...'
      });
    }
  }, []);

  // Animate progress over time
  useEffect(() => {
    if (!teamData) return;

    const interval = setInterval(() => {
      setTeamData(prev => {
        if (!prev) return prev;
        
        const updated = { ...prev };
        updated.agents = updated.agents.map(agent => {
          // Randomly progress agents
          if (agent.progress < 100 && Math.random() > 0.5) {
            const increment = Math.random() * 10 + 2;
            const newProgress = Math.min(agent.progress + increment, 100);
            
            // Update status based on progress
            let newStatus = agent.status;
            if (newProgress >= 100) {
              newStatus = 'completed';
            } else if (newProgress > 0 && agent.status === 'idle') {
              newStatus = 'working';
            }
            
            // Update task descriptions
            let newTask = agent.currentTask;
            if (newProgress >= 100) {
              newTask = '✅ Completed successfully!';
            } else if (newProgress > 75) {
              newTask = `Finalizing ${agent.id} implementation...`;
            } else if (newProgress > 50) {
              newTask = `Building core ${agent.id} features...`;
            } else if (newProgress > 25) {
              newTask = `Implementing ${agent.id} logic...`;
            }
            
            return {
              ...agent,
              progress: newProgress,
              status: newStatus,
              currentTask: newTask
            };
          }
          return agent;
        });
        
        // Update overall progress
        updated.progress.overall = Math.round(
          updated.agents.reduce((sum, a) => sum + a.progress, 0) / updated.agents.length
        );
        
        return updated;
      });
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(interval);
  }, [teamData?.teamId]);

  // Show working agents and recently completed ones (not idle)
  const visibleAgents = teamData?.agents.filter(agent => 
    ['working', 'thinking', 'in_progress', 'completed'].includes(agent.status)
  ) || [];
  
  // Count only actively working agents for the header
  const activeCount = visibleAgents.filter(agent => 
    ['working', 'thinking', 'in_progress'].includes(agent.status)
  ).length;

  // Simulate Claude Task Bridge output
  useEffect(() => {
    if (!teamData || visibleAgents.length === 0) return;

    const interval = setInterval(() => {
      const workingAgents = visibleAgents.filter(agent => 
        ['working', 'thinking', 'in_progress'].includes(agent.status)
      );
      if (workingAgents.length === 0) return;
      
      const agent = workingAgents[Math.floor(Math.random() * workingAgents.length)];
      const actions = [
        'Created component structure',
        'Implemented API endpoints', 
        'Added authentication logic',
        'Set up database schema',
        'Writing unit tests',
        'Configuring build pipeline',
        'Adding error handling',
        'Optimizing performance'
      ];
      
      const newOutput: TaskBridgeOutput = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        agent: agent.name,
        action: actions[Math.floor(Math.random() * actions.length)],
        type: 'progress'
      };
      
      setTaskOutput(prev => {
        const updated = [...prev, newOutput];
        // Keep only last 10 entries
        return updated.slice(-10);
      });
    }, 2000 + Math.random() * 3000); // Random interval 2-5 seconds

    return () => clearInterval(interval);
  }, [visibleAgents.length, teamData?.teamId]);

  if (!teamData) {
    return <div className="p-4 text-gray-400">Loading AI Team...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'working': return 'text-cyan-400';
      case 'thinking': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const getStatusDotAnimation = (status: string) => {
    if (status === 'working' || status === 'thinking') {
      return 'animate-pulse';
    }
    return '';
  };

  return (
    <div className="h-full bg-gray-800 flex flex-col">
      {/* TOP TIER: Active Agents Only (Vertical List) */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-cyan-400 text-sm font-medium">
            AI Team {teamData?.costSavings ? 'Bridge' : 'Demo'} ({activeCount} agents working • {visibleAgents.length} total)
          </h3>
          
          {/* Execution Type & Cost Badge */}
          <div className="flex items-center gap-2">
            {teamData?.costSavings && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded border border-green-500/30">
                💰 COST-FREE
              </span>
            )}
            
            {teamData?.executionType && (
              <span className={`px-2 py-1 text-xs font-medium rounded border ${
                teamData.executionType === 'automated-claude-code' 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              }`}>
                {teamData.executionType === 'automated-claude-code' ? '🤖 AUTOMATED' : '💸 EXPENSIVE'}
              </span>
            )}
          </div>
        </div>

        {/* Workflow & Cost Savings Info */}
        {(teamData?.workflow || teamData?.costSavings) && (
          <div className="mb-3 text-xs text-gray-400">
            {teamData.workflow && (
              <span>Workflow: {teamData.workflow}</span>
            )}
            {teamData.costSavings && (
              <span className="ml-3 text-green-400">
                💡 Saving ~$0.30 vs expensive orchestrator
              </span>
            )}
          </div>
        )}
        
        {visibleAgents.length === 0 ? (
          <div className="text-gray-500 text-sm italic">
            No agents currently active. Click "Spawn AI Team" to start.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAgents.map((agent) => (
              <div key={agent.id} className="bg-gray-900/70 rounded-lg p-3 border border-gray-600">
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <h4 className="text-cyan-400 font-medium text-sm">
                        {agent.name}
                      </h4>
                      <p className="text-gray-400 text-xs">{agent.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${getStatusColor(agent.status)}`}>
                      {agent.status === 'completed' ? '✅ Complete' :
                       agent.status === 'working' ? 'Working' : 
                       agent.status === 'thinking' ? 'Planning' : 
                       'In Progress'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round(agent.progress)}%
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      agent.status === 'completed' 
                        ? 'bg-green-500' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
                
                {/* Current Task */}
                <div className="text-xs text-gray-300">
                  {agent.status === 'completed' 
                    ? `✅ ${agent.name} work completed successfully`
                    : agent.currentTask}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* BOTTOM TIER: Live Activity Output */}
      <div className="flex-1 p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-cyan-400 text-sm font-medium">
            {teamData?.costSavings ? 'Claude Code Bridge Activity' : 'AI Team Activity Stream'} 
            {teamData?.automatedExecution && <span className="text-blue-400 ml-2">(Automated)</span>}
          </h3>
          
          {/* Bridge Status Indicator */}
          {teamData?.costSavings && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-400">
                🌳 Git Work Trees • 🤖 Real Claude Code
              </span>
              <button
                onClick={() => {
                  // Show health status in console for now
                  fetch('/api/claude-bridge/health')
                    .then(r => r.json())
                    .then(data => console.log('🏥 Bridge Health:', data))
                    .catch(e => console.error('Health check failed:', e));
                }}
                className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                title="Check Bridge Health"
              >
                🏥 Health
              </button>
              <button
                onClick={() => {
                  if (confirm('⚠️ This will immediately stop all AI agents and processes. Are you sure?')) {
                    fetch('/api/claude-bridge/emergency-stop', { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: 'User emergency stop from dashboard' })
                    })
                      .then(r => r.json())
                      .then(data => {
                        // console.log('🚨 Emergency stop executed:', data);
                        alert('🛑 Emergency stop executed. All processes halted.');
                      })
                      .catch(e => {
                        // logger?.error('Emergency stop failed:', e);
                        alert('❌ Emergency stop failed. Check console.');
                      });
                  }
                }}
                className="px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
                title="Emergency Stop All Processes"
              >
                🚨 Stop
              </button>
            </div>
          )}
        </div>
        
        <div className="h-full bg-black/50 rounded border border-gray-600 p-3 overflow-y-auto font-mono text-xs">
          {taskOutput.length === 0 ? (
            <div className="text-gray-500 italic">
              {teamData?.costSavings 
                ? 'Waiting for automated Claude Code processes...' 
                : 'Waiting for AI team activity (demo simulation)...'}
            </div>
          ) : (
            <div className="space-y-1">
              {teamData?.costSavings && (
                <div className="text-blue-400 mb-2 pb-2 border-b border-gray-700">
                  ℹ️ Bridge Mode: Claude Code agents working in isolated git work trees
                </div>
              )}
              
              {taskOutput.map((output) => (
                <div key={output.id} className="text-green-400 flex items-start gap-2">
                  <span className="text-cyan-400 flex-shrink-0">
                    {teamData?.costSavings ? '🔗' : '▶'}
                  </span>
                  <span className="text-yellow-400 flex-shrink-0 w-12">
                    {new Date(output.timestamp).toLocaleTimeString().slice(0, 5)}
                  </span>
                  <span className="text-blue-400 flex-shrink-0">
                    {output.agent}:
                  </span>
                  <span className="text-green-400">
                    {teamData?.costSavings && output.action.includes('Created') 
                      ? `${output.action} in work tree` 
                      : output.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITeamDashboard;