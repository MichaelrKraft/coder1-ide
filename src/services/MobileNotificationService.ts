export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  workspaceId: string;
  timestamp: Date;
  actionRequired: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'approve' | 'reject' | 'escalate' | 'pause' | 'resume';
  data?: any;
}

export interface InterventionRequest {
  id: string;
  workspaceId: string;
  type: 'code_approval' | 'security_concern' | 'performance_issue' | 'test_failure';
  description: string;
  codeChanges: string;
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  expiresAt: Date;
}

export class MobileNotificationService {
  private notifications: Map<string, PushNotification> = new Map();
  private interventionRequests: Map<string, InterventionRequest> = new Map();
  private subscribers: Set<string> = new Set();

  async sendPushNotification(notification: Omit<PushNotification, 'id' | 'timestamp'>): Promise<string> {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: PushNotification = {
      ...notification,
      id,
      timestamp: new Date()
    };

    this.notifications.set(id, fullNotification);

    console.log(`📱 Push Notification Sent: ${notification.title}`);
    console.log(`   Message: ${notification.message}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Workspace: ${notification.workspaceId}`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mobile-notification', {
        detail: fullNotification
      }));
    }

    return id;
  }

  async requestIntervention(request: Omit<InterventionRequest, 'id' | 'timestamp' | 'expiresAt'>): Promise<string> {
    const id = `intervention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullRequest: InterventionRequest = {
      ...request,
      id,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + (request.urgency === 'critical' ? 15 * 60 * 1000 : 60 * 60 * 1000))
    };

    this.interventionRequests.set(id, fullRequest);

    await this.sendPushNotification({
      title: `🚨 Intervention Required - ${request.type.replace('_', ' ').toUpperCase()}`,
      message: request.description,
      type: request.urgency === 'critical' ? 'error' : 'warning',
      workspaceId: request.workspaceId,
      actionRequired: true,
      actions: [
        { id: 'approve', label: 'Approve', type: 'approve', data: { requestId: id } },
        { id: 'reject', label: 'Reject', type: 'reject', data: { requestId: id } },
        { id: 'escalate', label: 'Escalate', type: 'escalate', data: { requestId: id } }
      ]
    });

    return id;
  }

  async handleInterventionResponse(requestId: string, action: 'approve' | 'reject' | 'escalate', userId: string): Promise<boolean> {
    const request = this.interventionRequests.get(requestId);
    if (!request) {
      console.error(`Intervention request ${requestId} not found`);
      return false;
    }

    if (new Date() > request.expiresAt) {
      console.warn(`Intervention request ${requestId} has expired`);
      return false;
    }

    console.log(`📱 Intervention Response: ${action} for ${request.type} by ${userId}`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('intervention-response', {
        detail: {
          requestId,
          action,
          userId,
          request
        }
      }));
    }

    this.interventionRequests.delete(requestId);

    return true;
  }

  async sendSleepModeUpdate(workspaceId: string, status: 'enabled' | 'disabled' | 'paused', details: string): Promise<void> {
    await this.sendPushNotification({
      title: `🌙 Sleep Mode ${status.toUpperCase()}`,
      message: details,
      type: status === 'enabled' ? 'info' : status === 'paused' ? 'warning' : 'success',
      workspaceId,
      actionRequired: false
    });
  }

  async sendQualityAlert(workspaceId: string, metric: string, value: number, threshold: number): Promise<void> {
    const severity = value < threshold * 0.5 ? 'critical' : value < threshold * 0.8 ? 'high' : 'medium';
    
    await this.sendPushNotification({
      title: `⚠️ Quality Alert: ${metric}`,
      message: `${metric} dropped to ${value}% (threshold: ${threshold}%)`,
      type: severity === 'critical' ? 'error' : 'warning',
      workspaceId,
      actionRequired: severity === 'critical',
      actions: severity === 'critical' ? [
        { id: 'pause', label: 'Pause Sleep Mode', type: 'pause' },
        { id: 'escalate', label: 'Escalate to Human', type: 'escalate' }
      ] : undefined
    });
  }

  getNotifications(workspaceId?: string): PushNotification[] {
    const notifications = Array.from(this.notifications.values());
    return workspaceId 
      ? notifications.filter(n => n.workspaceId === workspaceId)
      : notifications;
  }

  getPendingInterventions(workspaceId?: string): InterventionRequest[] {
    const requests = Array.from(this.interventionRequests.values());
    const pending = requests.filter(r => new Date() <= r.expiresAt);
    return workspaceId 
      ? pending.filter(r => r.workspaceId === workspaceId)
      : pending;
  }

  clearNotifications(workspaceId?: string): void {
    if (workspaceId) {
      const idsToDelete: string[] = [];
      this.notifications.forEach((notification, id) => {
        if (notification.workspaceId === workspaceId) {
          idsToDelete.push(id);
        }
      });
      idsToDelete.forEach(id => this.notifications.delete(id));
    } else {
      this.notifications.clear();
    }
  }

  subscribeToNotifications(userId: string): void {
    this.subscribers.add(userId);
  }

  unsubscribeFromNotifications(userId: string): void {
    this.subscribers.delete(userId);
  }
}
