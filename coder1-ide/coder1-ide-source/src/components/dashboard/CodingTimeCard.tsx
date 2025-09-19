import React from 'react';

interface CodingTimeCardProps {
  timeToday: number; // in minutes
  loading?: boolean;
}

const CodingTimeCard: React.FC<CodingTimeCardProps> = ({ timeToday, loading = false }) => {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    }
    return `${hours}h ${mins}m`;
  };

  const getEncouragement = (minutes: number): string => {
    if (minutes === 0) return "Ready to start coding?";
    if (minutes < 30) return "Great start!";
    if (minutes < 120) return "You're in the zone!";
    if (minutes < 240) return "Impressive focus!";
    return "Coding machine! 🔥";
  };

  return (
    <div className={`dashboard-card ${loading ? 'card-loading' : ''}`}>
      <span className="card-icon">📊</span>
      <div className="card-title">Coding Time Today</div>
      <div className="card-value">
        {loading ? '...' : formatTime(timeToday)}
      </div>
      <div className="card-subtitle">
        {loading ? 'Calculating...' : getEncouragement(timeToday)}
      </div>
      
      {/* Simple progress indicator */}
      {!loading && (
        <div style={{ 
          marginTop: '12px', 
          height: '4px', 
          background: '#f3f4f6', 
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: timeToday > 0 ? '#10b981' : '#e5e7eb',
            width: `${Math.min((timeToday / 480) * 100, 100)}%`, // 8 hours = 100%
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
    </div>
  );
};

export default CodingTimeCard;