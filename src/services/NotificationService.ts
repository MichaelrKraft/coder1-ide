export interface NotificationConfig {
  type: 'sleep_mode_active' | 'auto_approved' | 'auto_rejected' | 'intervention_required' | 'escalation' | 'sleep_summary' | 'sleep_mode_paused';
  message: string;
  channels: ('email' | 'sms' | 'push')[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresAction?: boolean;
  actionButtons?: ActionButton[];
}

export interface ActionButton {
  id: string;
  title: string;
  action?: string;
}

export class NotificationService {
  private subscribers: Map<string, NotificationSubscriber[]> = new Map();

  async send(config: NotificationConfig): Promise<void> {
    console.log(`📱 Notification [${config.priority}]: ${config.message}`);
    
    for (const channel of config.channels) {
      await this.sendToChannel(channel, config);
    }

    this.notifySubscribers(config);
  }

  subscribe(type: string, callback: NotificationSubscriber): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    this.subscribers.get(type)!.push(callback);
  }

  unsubscribe(type: string, callback: NotificationSubscriber): void {
    const subscribers = this.subscribers.get(type);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  private async sendToChannel(channel: string, config: NotificationConfig): Promise<void> {
    switch (channel) {
      case 'push':
        await this.sendPushNotification(config);
        break;
      case 'email':
        await this.sendEmailNotification(config);
        break;
      case 'sms':
        await this.sendSMSNotification(config);
        break;
    }
  }

  private async sendPushNotification(config: NotificationConfig): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Coder1 IDE - ${config.type}`, {
        body: config.message,
        icon: '/favicon.ico',
        tag: config.type
      });
    }
  }

  private async sendEmailNotification(config: NotificationConfig): Promise<void> {
    console.log(`📧 Email notification: ${config.message}`);
  }

  private async sendSMSNotification(config: NotificationConfig): Promise<void> {
    console.log(`📱 SMS notification: ${config.message}`);
  }

  private notifySubscribers(config: NotificationConfig): void {
    const subscribers = this.subscribers.get(config.type);
    if (subscribers) {
      subscribers.forEach(callback => callback(config));
    }
  }
}

type NotificationSubscriber = (config: NotificationConfig) => void;
