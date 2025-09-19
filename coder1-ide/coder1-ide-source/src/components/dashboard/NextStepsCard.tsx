import React from 'react';

interface NextStepsSuggestion {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  timeEstimate?: string;
}

interface NextStepsCardProps {
  suggestions: NextStepsSuggestion[];
  loading?: boolean;
}

const NextStepsCard: React.FC<NextStepsCardProps> = ({ suggestions, loading = false }) => {
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority: string): string => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⭐';
      case 'low': return '💡';
      default: return '📝';
    }
  };

  // Show top 2 suggestions only
  const topSuggestions = suggestions.slice(0, 2);

  return (
    <div className={`dashboard-card ${loading ? 'card-loading' : ''}`}>
      <span className="card-icon">💡</span>
      <div className="card-title">Next Steps</div>
      
      {loading ? (
        <div className="card-value" style={{ fontSize: '16px' }}>
          Analyzing...
        </div>
      ) : topSuggestions.length === 0 ? (
        <div className="card-value" style={{ fontSize: '16px', color: '#6b7280' }}>
          You're all caught up! 🎉
        </div>
      ) : (
        <div style={{ marginTop: '8px' }}>
          {topSuggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              style={{
                padding: '8px 0',
                borderBottom: index < topSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px'
              }}>
                <span>{getPriorityIcon(suggestion.priority)}</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937',
                  flex: 1,
                  lineHeight: '1.3'
                }}>
                  {suggestion.title}
                </span>
                {suggestion.timeEstimate && (
                  <span style={{
                    fontSize: '10px',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>
                    {suggestion.timeEstimate}
                  </span>
                )}
              </div>
              {suggestion.description && (
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginLeft: '22px',
                  lineHeight: '1.4'
                }}>
                  {suggestion.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="card-subtitle">
        {loading ? 'Getting recommendations...' : 
         suggestions.length > 2 ? `+${suggestions.length - 2} more suggestions` :
         suggestions.length === 0 ? 'Keep up the great work!' :
         'AI-powered recommendations'}
      </div>
    </div>
  );
};

export default NextStepsCard;