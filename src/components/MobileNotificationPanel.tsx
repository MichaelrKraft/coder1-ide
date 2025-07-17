import React, { useState, useEffect } from 'react';
import { MobileNotificationService, PushNotification, InterventionRequest } from '../services/MobileNotificationService';
import './MobileNotificationPanel.css';

interface MobileNotificationPanelProps {
  workspaceId?: string;
  notificationService: MobileNotificationService;
}

export const MobileNotificationPanel: React.FC<MobileNotificationPanelProps> = ({
  workspaceId,
  notificationService
}) => {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [interventions, setInterventions] = useState<InterventionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'notifications' | 'interventions'>('notifications');

  useEffect(() => {
    const updateNotifications = () => {
      setNotifications(notificationService.getNotifications(workspaceId));
      setInterventions(notificationService.getPendingInterventions(workspaceId));
    };

    updateNotifications();

    const handleMobileNotification = (event: CustomEvent) => {
      updateNotifications();
    };

    const handleInterventionResponse = (event: CustomEvent) => {
      updateNotifications();
    };

    window.addEventListener('mobile-notification', handleMobileNotification as EventListener);
    window.addEventListener('intervention-response', handleInterventionResponse as EventListener);

    const interval = setInterval(updateNotifications, 5000);

    return () => {
      window.removeEventListener('mobile-notification', handleMobileNotification as EventListener);
      window.removeEventListener('intervention-response', handleInterventionResponse as EventListener);
      clearInterval(interval);
    };
  }, [workspaceId, notificationService]);

  const handleInterventionAction = async (requestId: string, action: 'approve' | 'reject' | 'escalate') => {
    const success = await notificationService.handleInterventionResponse(requestId, action, 'current-user');
    if (success) {
      setInterventions(prev => prev.filter(i => i.id !== requestId));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error': return '🚨';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📱';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="mobile-notification-panel">
      <div className="notification-header">
        <h3>📱 Mobile Notifications</h3>
        <div className="notification-tabs">
          <button
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications ({notifications.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'interventions' ? 'active' : ''}`}
            onClick={() => setActiveTab('interventions')}
          >
            Interventions ({interventions.length})
          </button>
        </div>
      </div>

      {activeTab === 'notifications' && (
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <span>📭</span>
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div key={notification.id} className={`notification-item ${notification.type}`}>
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-meta">
                    <span className="workspace-id">Workspace: {notification.workspaceId}</span>
                    <span className="timestamp">{formatTimeAgo(notification.timestamp)}</span>
                  </div>
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="notification-actions">
                      {notification.actions.map(action => (
                        <button
                          key={action.id}
                          className={`action-button ${action.type}`}
                          onClick={() => {
                            console.log(`Action ${action.type} clicked for notification ${notification.id}`);
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'interventions' && (
        <div className="interventions-list">
          {interventions.length === 0 ? (
            <div className="empty-state">
              <span>✅</span>
              <p>No pending interventions</p>
            </div>
          ) : (
            interventions.map(intervention => (
              <div key={intervention.id} className="intervention-item">
                <div className="intervention-header">
                  <div className="intervention-type">
                    {intervention.type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div 
                    className="urgency-badge"
                    style={{ backgroundColor: getUrgencyColor(intervention.urgency) }}
                  >
                    {intervention.urgency.toUpperCase()}
                  </div>
                </div>
                <div className="intervention-description">
                  {intervention.description}
                </div>
                {intervention.codeChanges && (
                  <div className="code-changes">
                    <details>
                      <summary>View Code Changes</summary>
                      <pre><code>{intervention.codeChanges}</code></pre>
                    </details>
                  </div>
                )}
                {intervention.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h5>Recommendations:</h5>
                    <ul>
                      {intervention.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="intervention-meta">
                  <span>Workspace: {intervention.workspaceId}</span>
                  <span>Expires: {formatTimeAgo(intervention.expiresAt)}</span>
                </div>
                <div className="intervention-actions">
                  <button
                    className="action-button approve"
                    onClick={() => handleInterventionAction(intervention.id, 'approve')}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="action-button reject"
                    onClick={() => handleInterventionAction(intervention.id, 'reject')}
                  >
                    ❌ Reject
                  </button>
                  <button
                    className="action-button escalate"
                    onClick={() => handleInterventionAction(intervention.id, 'escalate')}
                  >
                    🚨 Escalate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
