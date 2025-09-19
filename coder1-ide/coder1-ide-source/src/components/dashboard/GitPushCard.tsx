import React from 'react';

interface GitPushCardProps {
  pushCount: number;
  trend: 'up' | 'down' | 'stable';
  loading?: boolean;
}

const GitPushCard: React.FC<GitPushCardProps> = ({ pushCount, trend, loading = false }) => {
  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '📊';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getMilestoneMessage = (count: number): string => {
    if (count === 0) return "Ready for your first push!";
    if (count === 1) return "First push! 🎉";
    if (count === 5) return "5 pushes milestone! 🌟";
    if (count === 10) return "Double digits! 💫";
    if (count === 25) return "Quarter century! 🏆";
    if (count === 50) return "Half century! 🚀";
    if (count === 100) return "Century club! 👑";
    
    if (count < 5) return "Building momentum!";
    if (count < 20) return "Getting the hang of it!";
    if (count < 50) return "Consistent contributor!";
    return "Git master! 🔥";
  };

  return (
    <div className={`dashboard-card ${loading ? 'card-loading' : ''}`}>
      <span className="card-icon">🚀</span>
      <div className="card-title">Git Pushes</div>
      <div className="card-value">
        {loading ? '...' : pushCount}
      </div>
      <div className="card-subtitle">
        {loading ? 'Counting...' : getMilestoneMessage(pushCount)}
      </div>
      
      {/* Trend indicator */}
      {!loading && pushCount > 0 && (
        <div style={{ 
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: getTrendColor(trend),
          fontWeight: '600'
        }}>
          <span>{getTrendIcon(trend)}</span>
          <span style={{ textTransform: 'capitalize' }}>{trend}</span>
        </div>
      )}
      
      {/* Achievement indicators */}
      {!loading && (
        <div style={{ 
          marginTop: '12px',
          display: 'flex',
          gap: '4px'
        }}>
          {[1, 5, 10, 25, 50].map(milestone => (
            <div
              key={milestone}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: pushCount >= milestone ? '#10b981' : '#e5e7eb',
                transition: 'background 0.3s ease'
              }}
              title={`${milestone} pushes milestone`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GitPushCard;