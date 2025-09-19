import React from 'react';

interface ProjectProgressCardProps {
  progress: number; // 0-100 percentage
  phase: string;
  loading?: boolean;
}

const ProjectProgressCard: React.FC<ProjectProgressCardProps> = ({ 
  progress, 
  phase, 
  loading = false 
}) => {
  const getProgressColor = (percentage: number): string => {
    if (percentage < 25) return '#ef4444';
    if (percentage < 50) return '#f59e0b';
    if (percentage < 75) return '#3b82f6';
    return '#10b981';
  };

  const getProgressEmoji = (percentage: number): string => {
    if (percentage === 0) return '🎯';
    if (percentage < 25) return '🌱';
    if (percentage < 50) return '🚧';
    if (percentage < 75) return '⚡';
    if (percentage < 100) return '🔥';
    return '🎉';
  };

  const getProgressMessage = (percentage: number): string => {
    if (percentage === 0) return 'Ready to begin!';
    if (percentage < 25) return 'Just getting started';
    if (percentage < 50) return 'Making good progress';
    if (percentage < 75) return 'More than halfway there!';
    if (percentage < 100) return 'Almost finished!';
    return 'Project complete! 🎉';
  };

  return (
    <div className={`dashboard-card ${loading ? 'card-loading' : ''}`}>
      <span className="card-icon">📈</span>
      <div className="card-title">Project Progress</div>
      
      {loading ? (
        <div className="card-value">...</div>
      ) : (
        <>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>{getProgressEmoji(progress)}</span>
            <span className="card-value" style={{ fontSize: '28px' }}>
              {progress}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div style={{
            height: '8px',
            background: '#f3f4f6',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}>
            <div style={{
              height: '100%',
              background: getProgressColor(progress),
              width: `${progress}%`,
              borderRadius: '4px',
              transition: 'all 0.5s ease'
            }} />
          </div>
          
          {/* Current phase */}
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '4px'
          }}>
            {phase}
          </div>
        </>
      )}
      
      <div className="card-subtitle">
        {loading ? 'Analyzing project...' : getProgressMessage(progress)}
      </div>
      
      {/* Phase indicators */}
      {!loading && (
        <div style={{ 
          marginTop: '12px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center'
        }}>
          {['Planning', 'Development', 'Testing', 'Deployment'].map((phaseName, index) => {
            const phaseProgress = Math.max(0, Math.min(100, (progress - (index * 25)) / 25 * 100));
            return (
              <div
                key={phaseName}
                style={{
                  flex: 1,
                  height: '4px',
                  background: '#e5e7eb',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
                title={phaseName}
              >
                <div style={{
                  height: '100%',
                  background: phaseProgress > 0 ? getProgressColor(progress) : '#e5e7eb',
                  width: `${phaseProgress}%`,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectProgressCard;