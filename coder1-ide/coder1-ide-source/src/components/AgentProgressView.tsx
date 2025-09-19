import React from 'react';

interface AgentProgress {
  id: string;
  name: string;
  role: string;
  progress: number; // 0-100
  status: string;
  currentTask: string;
}

interface AgentProgressViewProps {
  agents: AgentProgress[];
  magicMode: boolean;
}

export const AgentProgressView: React.FC<AgentProgressViewProps> = ({ agents, magicMode }) => {
  if (!magicMode) return null;
  
  return (
    <div className="agent-progress-view" style={{
      padding: '20px',
      background: 'linear-gradient(135deg, rgba(30, 30, 46, 0.95) 0%, rgba(42, 42, 60, 0.95) 100%)',
      borderRadius: '12px',
      margin: '16px'
    }}>
      <h3 style={{ color: '#7aa2f7', marginBottom: '20px', fontSize: '18px' }}>
        🎨 Your AI Team is Building Your Project
      </h3>
      
      <div className="progress-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {agents.map((agent) => (
          <div key={agent.id} className="agent-progress-item" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(122, 162, 247, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#c0caf5', fontWeight: 'bold' }}>
                {agent.role === 'Frontend' ? '🎨' : agent.role === 'Backend' ? '🔧' : '💻'} {agent.name}
              </span>
              <span style={{ color: '#9aa5ce', fontSize: '14px' }}>
                {agent.progress}%
              </span>
            </div>
            
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              height: '24px', 
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative' as const
            }}>
              <div style={{
                background: agent.progress === 100 
                  ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                  : 'linear-gradient(90deg, #7aa2f7, #89b4fa)',
                width: `${agent.progress}%`,
                height: '100%',
                borderRadius: '12px',
                transition: 'width 0.5s ease',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '12px',
                position: 'relative' as const
              }}>
                {agent.progress > 20 && (
                  <span style={{ 
                    color: 'white', 
                    fontSize: '12px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    {agent.currentTask}
                  </span>
                )}
              </div>
            </div>
            
            {agent.progress === 100 && (
              <div style={{ marginTop: '8px', color: '#4caf50', fontSize: '14px' }}>
                ✅ Completed
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '12px',
        background: 'rgba(122, 162, 247, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(122, 162, 247, 0.3)'
      }}>
        <p style={{ color: '#9aa5ce', fontSize: '14px', margin: 0 }}>
          💡 <strong>Tip:</strong> Your agents are working simultaneously on different parts of your project. 
          This parallel processing makes development much faster!
        </p>
      </div>
    </div>
  );
};

export default AgentProgressView;