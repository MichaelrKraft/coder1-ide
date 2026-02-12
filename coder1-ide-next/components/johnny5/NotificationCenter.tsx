'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Heart, Zap, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  type: 'heartbeat' | 'opportunity' | 'action' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionPayload?: string;
}

interface NotificationCenterProps {
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_NOTIFICATIONS = 50;
const STORAGE_KEY = 'johnny5_notifications';

// ============================================================================
// Component
// ============================================================================

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Notification[];
        // Restore Date objects
        const restored = parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
        setNotifications(restored);
        setUnreadCount(restored.filter(n => !n.read).length);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage when notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
    } catch {
      // Ignore storage errors
    }
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Listen for Socket.IO events via CustomEvents (dispatched from socket listeners)
  useEffect(() => {
    const handleHeartbeat = (e: CustomEvent) => {
      const data = e.detail;
      // Only add notification for health issues, not every pulse
      if (data?.health && (!data.health.database || !data.health.livingFiles)) {
        addNotification({
          type: 'heartbeat',
          title: 'Health Check',
          message: `Issues detected: ${!data.health.database ? 'Database unavailable' : ''} ${!data.health.livingFiles ? 'Living files not loaded' : ''}`.trim(),
        });
      }
    };

    const handleOpportunity = (e: CustomEvent) => {
      const data = e.detail;
      addNotification({
        type: 'opportunity',
        title: data?.title || 'Opportunity Detected',
        message: data?.description || data?.message || 'Johnny5 noticed something.',
        actionLabel: data?.actionLabel,
        actionPayload: data?.actionPayload,
      });
    };

    const handleAction = (e: CustomEvent) => {
      const data = e.detail;
      addNotification({
        type: 'action',
        title: data?.title || 'Action Taken',
        message: data?.message || 'Johnny5 took an action.',
      });
    };

    window.addEventListener('johnny5:heartbeat' as any, handleHeartbeat);
    window.addEventListener('johnny5:opportunity' as any, handleOpportunity);
    window.addEventListener('johnny5:action' as any, handleAction);

    return () => {
      window.removeEventListener('johnny5:heartbeat' as any, handleHeartbeat);
      window.removeEventListener('johnny5:opportunity' as any, handleOpportunity);
      window.removeEventListener('johnny5:action' as any, handleAction);
    };
  }, []);

  const addNotification = useCallback((partial: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...partial,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAction = useCallback((payload?: string) => {
    if (payload) {
      window.dispatchEvent(new CustomEvent('johnny5:sendToTerminal', { detail: { command: payload } }));
    }
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'heartbeat': return <Heart className="w-3.5 h-3.5 text-red-400" />;
      case 'opportunity': return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
      case 'action': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case 'info': return <AlertTriangle className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell icon with badge */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }}
        className="relative p-1 rounded hover:bg-bg-secondary transition-colors"
        title="Johnny5 Notifications"
      >
        <Bell className="w-4 h-4 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-coder1-cyan rounded-full flex items-center justify-center">
            <span className="text-[8px] font-bold text-black">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Notification panel */}
      {isOpen && (
        <div className="absolute right-0 top-8 w-72 bg-bg-primary border border-border-primary rounded-lg shadow-xl z-50 max-h-80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary">
            <span className="text-xs font-medium text-text-primary">Johnny5 Notifications</span>
            <div className="flex gap-1">
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-[10px] text-text-muted hover:text-text-secondary">
                  Clear all
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-0.5 hover:bg-bg-secondary rounded">
                <X className="w-3 h-3 text-text-muted" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-64">
            {notifications.length === 0 ? (
              <div className="p-4 text-center">
                <Heart className="w-6 h-6 text-text-muted mx-auto mb-2" />
                <p className="text-xs text-text-muted">No notifications yet</p>
                <p className="text-[10px] text-text-muted mt-1">Johnny5 will notify you of important events</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`px-3 py-2 border-b border-border-primary/50 hover:bg-bg-secondary/50 transition-colors ${
                    !notification.read ? 'bg-coder1-cyan/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-text-primary truncate">
                          {notification.title}
                        </span>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="p-0.5 hover:bg-bg-secondary rounded flex-shrink-0"
                        >
                          <X className="w-2.5 h-2.5 text-text-muted" />
                        </button>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-text-muted flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(notification.timestamp)}
                        </span>
                        {notification.actionLabel && notification.actionPayload && (
                          <button
                            onClick={() => handleAction(notification.actionPayload)}
                            className="text-[9px] text-coder1-cyan hover:text-coder1-cyan/80"
                          >
                            {notification.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
