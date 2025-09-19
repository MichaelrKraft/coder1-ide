/**
 * HooksStatusIndicator - Shows current hooks status in terminal header
 * Displays active hooks count and provides visual status feedback
 */

import React, { useState, useEffect } from 'react';
import hooksService, { HooksStatus } from '../../services/hooks/HooksService';

interface HooksStatusIndicatorProps {
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
}

const HooksStatusIndicator: React.FC<HooksStatusIndicatorProps> = ({
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const [status, setStatus] = useState<HooksStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load hooks status
  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const hooksStatus = await hooksService.getStatus();
      setStatus(hooksStatus);
    } catch (err) {
      console.warn('Failed to load hooks status:', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    loadStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate total active hooks
  const totalHooks = status 
    ? (status.project.hookCount || 0) + (status.user.hookCount || 0)
    : 0;

  // Determine status color and text
  const getStatusProps = () => {
    if (loading) {
      return {
        color: '#6b7280',
        text: '⏳',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        borderColor: 'rgba(107, 114, 128, 0.3)'
      };
    }
    
    if (error) {
      return {
        color: '#ef4444',
        text: '❌',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)'
      };
    }
    
    if (totalHooks === 0) {
      return {
        color: '#6b7280',
        text: '🪝 0',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        borderColor: 'rgba(107, 114, 128, 0.3)'
      };
    }
    
    if (totalHooks > 0) {
      return {
        color: '#22c55e',
        text: `🪝 ${totalHooks}`,
        bgColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.3)'
      };
    }
    
    return {
      color: '#f59e0b',
      text: '🪝 ?',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)'
    };
  };

  const statusProps = getStatusProps();

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        backgroundColor: statusProps.bgColor,
        borderRadius: '4px',
        border: `1px solid ${statusProps.borderColor}`,
        marginRight: '8px',
        fontSize: '11px',
        fontWeight: '500',
        color: statusProps.color,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
    >
      <span>{statusProps.text}</span>
      {!loading && !error && status && (
        <span style={{ 
          fontSize: '10px', 
          opacity: 0.7,
          marginLeft: '2px'
        }}>
          {totalHooks > 0 ? 'active' : 'none'}
        </span>
      )}
    </div>
  );
};

export default HooksStatusIndicator;