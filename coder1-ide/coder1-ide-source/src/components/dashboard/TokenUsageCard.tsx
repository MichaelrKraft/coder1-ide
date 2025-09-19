import React from 'react';

interface TokenUsageCardProps {
  used: number;
  limit: number;
  loading?: boolean;
}

const TokenUsageCard: React.FC<TokenUsageCardProps> = ({ used, limit, loading = false }) => {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const remaining = Math.max(0, limit - used);
  
  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return '#10b981';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  const getUsageMessage = (percentage: number, remaining: number): string => {
    if (percentage < 25) return 'Plenty of AI assistance available';
    if (percentage < 50) return 'Good amount of tokens remaining';
    if (percentage < 75) return 'Moderate usage this month';
    if (percentage < 90) return 'Consider managing usage';
    if (remaining === 0) return 'Monthly limit reached';
    return 'Almost at monthly limit';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={`dashboard-card ${loading ? 'card-loading' : ''}`} style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>📱</span>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              AI Token Usage This Month
            </span>
          </div>
          
          {loading ? (
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Calculating usage...
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: getUsageColor(percentage)
                }}>
                  {formatNumber(used)}
                </span>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  / {formatNumber(limit)} tokens
                </span>
                <span style={{
                  fontSize: '12px',
                  background: getUsageColor(percentage),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: '600'
                }}>
                  {percentage.toFixed(0)}%
                </span>
              </div>
              
              {/* Usage bar */}
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{
                  height: '100%',
                  background: getUsageColor(percentage),
                  width: `${Math.min(percentage, 100)}%`,
                  borderRadius: '4px',
                  transition: 'all 0.5s ease'
                }} />
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                {getUsageMessage(percentage, remaining)}
                {remaining > 0 && (
                  <div style={{ marginTop: '2px' }}>
                    <strong style={{ color: '#1f2937' }}>
                      {formatNumber(remaining)}
                    </strong> tokens remaining
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Visual indicator */}
        {!loading && (
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `conic-gradient(${getUsageColor(percentage)} ${percentage * 3.6}deg, #e5e7eb 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
              color: getUsageColor(percentage)
            }}>
              {percentage.toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenUsageCard;