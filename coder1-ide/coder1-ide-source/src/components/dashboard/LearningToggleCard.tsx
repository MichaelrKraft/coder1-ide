import React from 'react';

interface LearningToggleCardProps {
  isEnabled: boolean;
  onToggle: () => void;
}

const LearningToggleCard: React.FC<LearningToggleCardProps> = ({ isEnabled, onToggle }) => {
  return (
    <div className="dashboard-card" style={{ cursor: 'pointer' }} onClick={onToggle}>
      <span className="card-icon">🎓</span>
      <div className="card-title">Learning Helper</div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div className="card-value" style={{ 
          fontSize: '20px',
          color: isEnabled ? '#10b981' : '#6b7280'
        }}>
          {isEnabled ? 'ON' : 'OFF'}
        </div>
        
        {/* Toggle switch */}
        <div style={{
          width: '48px',
          height: '24px',
          background: isEnabled ? '#10b981' : '#d1d5db',
          borderRadius: '12px',
          position: 'relative',
          transition: 'background 0.2s ease',
          cursor: 'pointer'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            background: '#ffffff',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: isEnabled ? '26px' : '2px',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
          }} />
        </div>
      </div>
      
      <div className="card-subtitle">
        {isEnabled ? (
          <>
            <div style={{ marginBottom: '4px', color: '#10b981' }}>
              ✓ Help overlay active
            </div>
            <div style={{ fontSize: '12px' }}>
              Coding tips and definitions available
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '4px', color: '#6b7280' }}>
              Click to enable coding help
            </div>
            <div style={{ fontSize: '12px' }}>
              Get tips, definitions, and guidance
            </div>
          </>
        )}
      </div>
      
      {/* Feature list */}
      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        <div>• Command explanations</div>
        <div>• Coding term definitions</div>
        <div>• Helpful tips & tricks</div>
      </div>
      
      {/* Hover effect indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        opacity: 0.6,
        fontSize: '12px'
      }}>
        {isEnabled ? '👆 Click to disable' : '👆 Click to enable'}
      </div>
    </div>
  );
};

export default LearningToggleCard;