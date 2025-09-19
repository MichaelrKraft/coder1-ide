import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface ClaudeActivityStatus {
  status: string;
  icon: string;
  color: string;
  details: string;
  file?: string;
  fileName?: string;
  operation?: string;
  duration?: number;
}

interface ClaudeActivityIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
}

const ClaudeActivityIndicator: React.FC<ClaudeActivityIndicatorProps> = ({ 
  className = '',
  style = {}
}) => {
  const [activityStatus, setActivityStatus] = useState<ClaudeActivityStatus>({
    status: 'Ready',
    icon: '🤖',
    color: 'ready',
    details: 'Claude is ready to help'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to update activity status
  const updateActivityStatus = useCallback((activity: any) => {
    try {
      // Convert the raw activity data to display status
      let displayStatus: ClaudeActivityStatus;

      if (activity.operation === 'idle' || !activity.file) {
        displayStatus = {
          status: 'Ready',
          icon: '🤖',
          color: 'ready',
          details: 'Claude is ready to help'
        };
      } else {
        const operationMap: Record<string, { icon: string; color: string; verb: string }> = {
          reading: { icon: '👀', color: 'reading', verb: 'Reading' },
          writing: { icon: '✍️', color: 'writing', verb: 'Writing' },
          editing: { icon: '✏️', color: 'editing', verb: 'Editing' },
          analyzing: { icon: '🔍', color: 'analyzing', verb: 'Analyzing' }
        };

        const op = operationMap[activity.operation] || operationMap.reading;
        const fileName = activity.fileName || activity.file?.split('/').pop() || 'file';

        displayStatus = {
          status: `${op.verb} ${fileName}`,
          icon: op.icon,
          color: op.color,
          details: `Claude is ${activity.operation} ${fileName}`,
          file: activity.file,
          fileName: fileName,
          operation: activity.operation,
          duration: activity.startTime ? Date.now() - activity.startTime : 0
        };
      }

      setActivityStatus(displayStatus);
    } catch (error) {
      console.error('🎯 Claude File Activity: Error updating status:', error);
    }
  }, []);

  // Debounced update function to prevent glitching
  const debouncedUpdateActivity = useCallback((activity: any) => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates by 150ms to prevent rapid flickering
    updateTimeoutRef.current = setTimeout(() => {
      updateActivityStatus(activity);
    }, 150);
  }, [updateActivityStatus]);

  useEffect(() => {
    let mounted = true;

    const connectToFileActivity = async () => {
      try {
        console.log('🎯 Claude File Activity: Attempting to connect...');
        
        // Create socket connection
        const socket = io('http://localhost:3000', {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          withCredentials: false
        });

        socketRef.current = socket;
        console.log('🎯 Claude File Activity: Socket created');

        // Connection event handlers
        socket.on('connect', () => {
          if (!mounted) return;
          console.log('🎯 Claude File Activity: Connected to WebSocket, socket ID:', socket.id);
          setIsConnected(true);
          setConnectionError(null);
          
          // Subscribe to file activity updates
          console.log('🎯 Claude File Activity: Subscribing to updates...');
          socket.emit('subscribe-file-activity');
        });

        socket.on('disconnect', () => {
          if (!mounted) return;
          console.log('🎯 Claude File Activity: Disconnected from WebSocket');
          setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
          if (!mounted) return;
          console.error('🎯 Claude File Activity: Connection error:', error);
          setConnectionError(error.message);
          setIsConnected(false);
        });

        // File activity event handlers
        socket.on('file-activity-subscribed', (data) => {
          if (!mounted) return;
          console.log('🎯 Claude File Activity: Subscribed successfully', data);
          
          // Update with current activity if provided (no debounce for initial state)
          if (data.currentActivity) {
            updateActivityStatus(data.currentActivity);
          }
        });

        socket.on('claude-file-activity', (data) => {
          if (!mounted) return;
          console.log('🎯 Claude File Activity: Received update', data);
          
          if (data.data) {
            debouncedUpdateActivity(data.data);
          }
        });

        socket.on('claude-file-activity-change', (change) => {
          if (!mounted) return;
          console.log('🎯 Claude File Activity: Activity change', change);
          
          if (change.data) {
            debouncedUpdateActivity(change.data);
          }
        });

        // Handle subscription errors
        socket.on('file-activity-subscribed', (response) => {
          if (!mounted) return;
          if (!response.success) {
            console.error('🎯 Claude File Activity: Subscription failed', response);
            setConnectionError(response.message || 'Failed to subscribe');
          }
        });

      } catch (error) {
        console.error('🎯 Claude File Activity: Setup error:', error);
        setConnectionError(error instanceof Error ? error.message : 'Setup failed');
      }
    };

    connectToFileActivity();

    // Cleanup on unmount
    return () => {
      mounted = false;
      
      // Clear any pending debounced updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
      if (socketRef.current) {
        console.log('🎯 Claude File Activity: Cleaning up WebSocket connection');
        socketRef.current.emit('unsubscribe-file-activity');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Get color styles based on activity
  const getColorStyles = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; opacity: number }> = {
      ready: { bg: 'var(--tokyo-bg-dark)', text: 'var(--tokyo-fg-dark)', opacity: 0.6 },
      reading: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', opacity: 0.8 },
      writing: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', opacity: 0.8 },
      editing: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', opacity: 0.8 },
      analyzing: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', opacity: 0.8 }
    };

    return colorMap[color] || colorMap.ready;
  };

  const colorStyles = getColorStyles(activityStatus.color);

  // Fallback to static display if connection fails
  if (connectionError) {
    return (
      <div 
        className={className}
        style={{
          padding: '6px 12px',
          fontSize: '11px',
          color: 'var(--tokyo-fg-dark)',
          borderBottom: '1px solid var(--tokyo-bg-highlight)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--tokyo-bg-dark)',
          minHeight: '24px',
          ...style
        }}
        title="Claude File Activity (Connection Error)"
      >
        <span style={{ opacity: 0.5, fontSize: '12px' }}>🤖</span>
        <span style={{ opacity: 0.4 }}>Claude: Offline</span>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        padding: '6px 12px',
        fontSize: '11px',
        color: colorStyles.text,
        borderBottom: '1px solid var(--tokyo-bg-highlight)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: colorStyles.bg,
        minHeight: '24px',
        transition: 'all 0.3s ease',
        ...style
      }}
      title={activityStatus.details}
    >
      <span 
        style={{ 
          opacity: colorStyles.opacity, 
          fontSize: '12px',
          animation: activityStatus.color !== 'ready' ? 'pulse 2s infinite' : 'none'
        }}
      >
        {activityStatus.icon}
      </span>
      <span style={{ opacity: colorStyles.opacity }}>
        Claude: {activityStatus.status}
      </span>
      {!isConnected && (
        <span 
          style={{ 
            fontSize: '8px', 
            opacity: 0.4,
            marginLeft: 'auto'
          }}
        >
          ⚪
        </span>
      )}
      {isConnected && activityStatus.color !== 'ready' && (
        <span 
          style={{ 
            fontSize: '8px', 
            opacity: 0.6,
            marginLeft: 'auto',
            color: colorStyles.text
          }}
        >
          🔴
        </span>
      )}
    </div>
  );
};

export default ClaudeActivityIndicator;