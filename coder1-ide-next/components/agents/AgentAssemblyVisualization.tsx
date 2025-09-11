'use client';

import React, { useState, useEffect } from 'react';
import { Users, Zap, CheckCircle } from '@/lib/icons';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'assembling' | 'ready' | 'working' | 'completed';
  progress: number;
}

interface AgentAssemblyVisualizationProps {
  isAssembling: boolean;
  teamSuggestion?: {
    recommendedTeam: {
      name: string;
      agents: string[];
      description: string;
    };
    confidence: number;
  };
  onAssemblyComplete?: () => void;
}

const AgentAssemblyVisualization: React.FC<AgentAssemblyVisualizationProps> = ({
  isAssembling,
  teamSuggestion,
  onAssemblyComplete,
}) => {
  const [assemblyStage, setAssemblyStage] = useState<'suggestion' | 'assembling' | 'completed'>('suggestion');
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Mock agent data based on team suggestion
  useEffect(() => {
    if (teamSuggestion) {
      const mockAgents: Agent[] = teamSuggestion.recommendedTeam.agents.map((agentName, index) => ({
        id: `agent-${index}`,
        name: agentName,
        role: agentName.includes('Frontend') ? 'UI/UX Expert' :
              agentName.includes('Backend') ? 'API Specialist' :
              agentName.includes('QA') ? 'Testing Expert' : 'Specialist',
        avatar: agentName.includes('Frontend') ? '🎨' :
                agentName.includes('Backend') ? '⚙️' :
                agentName.includes('QA') ? '🧪' : '🤖',
        status: 'assembling',
        progress: 0,
      }));
      setAgents(mockAgents);
    }
  }, [teamSuggestion]);

  // Assembly animation sequence
  useEffect(() => {
    if (isAssembling && assemblyStage === 'suggestion') {
      setAssemblyStage('assembling');
      
      // Animate agent assembly over 3 seconds
      const animationDuration = 3000;
      const interval = 100;
      const steps = animationDuration / interval;
      let currentStep = 0;
      
      const animation = setInterval(() => {
        currentStep++;
        const progressPercent = (currentStep / steps) * 100;
        
        setAgents(prev => prev.map((agent, index) => ({
          ...agent,
          status: progressPercent < 50 ? 'assembling' : 
                  progressPercent < 100 ? 'ready' : 'working',
          progress: Math.min(100, progressPercent + (index * 10)), // Stagger progress
        })));
        
        if (currentStep >= steps) {
          clearInterval(animation);
          setAssemblyStage('completed');
          onAssemblyComplete?.();
        }
      }, interval);
      
      return () => clearInterval(animation);
    }
  }, [isAssembling, assemblyStage, onAssemblyComplete]);

  if (!teamSuggestion) return null;

  return (
    <div className="space-y-4">
      {/* Team Suggestion Header */}
      <div className="bg-gradient-to-r from-coder1-purple/20 to-coder1-cyan/20 border border-coder1-cyan/30 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-coder1-cyan animate-pulse" />
            <h3 className="text-lg font-semibold text-coder1-cyan">
              {teamSuggestion.recommendedTeam.name}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-text-muted">
            <span>{Math.round(teamSuggestion.confidence * 100)}% confidence</span>
          </div>
        </div>
        
        <p className="text-text-secondary text-sm mb-3">
          {teamSuggestion.recommendedTeam.description}
        </p>
        
        {/* Assembly Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            assemblyStage === 'suggestion' ? 'bg-yellow-400 animate-pulse' :
            assemblyStage === 'assembling' ? 'bg-coder1-cyan animate-pulse' :
            'bg-green-400'
          }`} />
          <span className="text-text-muted">
            {assemblyStage === 'suggestion' ? 'Team suggested' :
             assemblyStage === 'assembling' ? 'Assembling agents...' :
             'Team assembled and ready'}
          </span>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Users className="w-4 h-4" />
          Agent Assembly ({agents.length} agents)
        </h4>
        
        {agents.map((agent, index) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            delay={index * 200}
            isAnimating={assemblyStage === 'assembling'}
          />
        ))}
      </div>
      
      {assemblyStage === 'completed' && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>All agents assembled and synchronized! Ready to coordinate on your request.</span>
          </div>
        </div>
      )}
    </div>
  );
};

const AgentCard: React.FC<{
  agent: Agent;
  delay: number;
  isAnimating: boolean;
}> = ({ agent, delay, isAnimating }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isAnimating, delay]);

  const statusColors = {
    assembling: 'border-yellow-500/50 bg-yellow-900/20',
    ready: 'border-coder1-cyan/50 bg-coder1-cyan/10',
    working: 'border-coder1-purple/50 bg-coder1-purple/10',
    completed: 'border-green-500/50 bg-green-900/20',
  };

  const statusIcons = {
    assembling: <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />,
    ready: <div className="w-3 h-3 bg-coder1-cyan rounded-full animate-pulse" />,
    working: <Zap className="w-3 h-3 text-coder1-purple animate-pulse" />,
    completed: <CheckCircle className="w-3 h-3 text-green-400" />,
  };

  return (
    <div
      className={`
        transition-all duration-500 ease-out transform
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
        ${statusColors[agent.status]}
        border rounded-lg p-3
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{agent.avatar}</div>
          <div>
            <h5 className="text-sm font-medium text-text-primary">{agent.name}</h5>
            <p className="text-xs text-text-muted">{agent.role}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {statusIcons[agent.status]}
          <span className="text-xs text-text-secondary font-mono">
            {agent.progress}%
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 w-full h-1 bg-bg-primary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            agent.status === 'completed' 
              ? 'bg-green-400' 
              : agent.status === 'working'
                ? 'bg-coder1-purple'
                : 'bg-coder1-cyan'
          }`}
          style={{ width: `${agent.progress}%` }}
        />
      </div>
    </div>
  );
};

export default AgentAssemblyVisualization;