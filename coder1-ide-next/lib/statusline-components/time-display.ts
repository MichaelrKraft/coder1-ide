/**
 * Time Display Component
 * 
 * Professional time formatting and display with timezone support
 * Based on claude-code-statusline time_display.sh
 */

'use client';

// Mock logger for client-side usage
const logger = {
  debug: (...args: any[]) => console.debug('[TimeDisplay]', ...args),
  info: (...args: any[]) => console.info('[TimeDisplay]', ...args),
  warn: (...args: any[]) => console.warn('[TimeDisplay]', ...args),
  error: (...args: any[]) => console.error('[TimeDisplay]', ...args),
};

export interface TimeDisplayOptions {
  format: '12h' | '24h' | 'iso' | 'relative';
  showSeconds: boolean;
  showTimezone: boolean;
  showDate: boolean;
  timezone?: string;
  updateInterval: number; // milliseconds
}

export interface TimeData {
  timestamp: number;
  formatted: string;
  timezone: string;
  date: string;
  time: string;
  relative?: string;
}

const DEFAULT_OPTIONS: TimeDisplayOptions = {
  format: '24h',
  showSeconds: false,
  showTimezone: false,
  showDate: false,
  updateInterval: 1000, // 1 second
};

export class TimeDisplayComponent {
  private options: TimeDisplayOptions;
  private updateTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<(data: TimeData) => void> = new Set();
  private lastData: TimeData | null = null;

  constructor(options: Partial<TimeDisplayOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    logger.debug('[TimeDisplay] Component initialized with options:', this.options);
  }

  /**
   * Start automatic time updates
   */
  public start(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    // Initial update
    this.update();

    // Set up recurring updates
    this.updateTimer = setInterval(() => {
      this.update();
    }, this.options.updateInterval);

    logger.debug('[TimeDisplay] Started with update interval:', this.options.updateInterval);
  }

  /**
   * Stop automatic updates
   */
  public stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    logger.debug('[TimeDisplay] Stopped');
  }

  /**
   * Update time data and notify subscribers
   */
  private update(): void {
    try {
      const now = new Date();
      const timeData = this.formatTime(now);
      
      this.lastData = timeData;
      
      // Notify all subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(timeData);
        } catch (error) {
          logger.error('[TimeDisplay] Subscriber callback error:', error);
        }
      });
      
    } catch (error) {
      logger.error('[TimeDisplay] Update error:', error);
    }
  }

  /**
   * Format time according to current options
   */
  public formatTime(date: Date = new Date()): TimeData {
    const timezone = this.options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    try {
      // Create formatter with timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: this.options.format === '12h',
        hour: '2-digit',
        minute: '2-digit',
        second: this.options.showSeconds ? '2-digit' : undefined,
      });

      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        year: this.options.showDate ? 'numeric' : undefined,
      });

      const timePart = formatter.format(date);
      const datePart = dateFormatter.format(date);
      
      let formatted = '';
      
      switch (this.options.format) {
        case 'iso':
          formatted = date.toISOString();
          break;
          
        case 'relative':
          formatted = this.getRelativeTime(date);
          break;
          
        default:
          formatted = timePart;
          if (this.options.showDate) {
            formatted = `${datePart} ${timePart}`;
          }
          if (this.options.showTimezone) {
            const tzShort = this.getTimezoneShort(timezone);
            formatted += ` ${tzShort}`;
          }
      }

      return {
        timestamp: date.getTime(),
        formatted,
        timezone,
        date: datePart,
        time: timePart,
        relative: this.options.format === 'relative' ? formatted : undefined
      };

    } catch (error) {
      logger.error('[TimeDisplay] Format error:', error);
      
      // Fallback to simple format
      return {
        timestamp: date.getTime(),
        formatted: date.toLocaleTimeString(),
        timezone,
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString()
      };
    }
  }

  /**
   * Get relative time string (e.g., "2m ago", "just now")
   */
  private getRelativeTime(date: Date): string {
    const now = new Date().getTime();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return seconds < 10 ? 'just now' : `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Get short timezone abbreviation
   */
  private getTimezoneShort(timezone: string): string {
    try {
      const date = new Date();
      const long = date.toLocaleDateString('en-US', {
        timeZone: timezone,
        timeZoneName: 'long'
      });
      
      const short = date.toLocaleDateString('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      
      // Extract timezone abbreviation
      const match = short.match(/([A-Z]{3,4})$/);
      return match ? match[1] : timezone.split('/').pop() || 'UTC';
      
    } catch (error) {
      return 'UTC';
    }
  }

  /**
   * Subscribe to time updates
   */
  public subscribe(callback: (data: TimeData) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately if available
    if (this.lastData) {
      try {
        callback(this.lastData);
      } catch (error) {
        logger.error('[TimeDisplay] Immediate callback error:', error);
      }
    }
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Update options and restart if running
   */
  public updateOptions(newOptions: Partial<TimeDisplayOptions>): void {
    const wasRunning = this.updateTimer !== null;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.options = { ...this.options, ...newOptions };
    logger.debug('[TimeDisplay] Options updated:', this.options);
    
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Get current options
   */
  public getOptions(): TimeDisplayOptions {
    return { ...this.options };
  }

  /**
   * Get current time data without subscribing
   */
  public getCurrentTime(): TimeData {
    return this.formatTime();
  }

  /**
   * Format display string with template
   */
  public formatDisplay(template: string = '{time}', data?: TimeData): string {
    const timeData = data || this.lastData || this.formatTime();
    
    return template
      .replace('{time}', timeData.time)
      .replace('{date}', timeData.date)
      .replace('{formatted}', timeData.formatted)
      .replace('{timezone}', timeData.timezone)
      .replace('{timestamp}', timeData.timestamp.toString())
      .replace('{relative}', timeData.relative || '');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    this.subscribers.clear();
    this.lastData = null;
  }
}

// Export singleton instance with default options
export const timeDisplayComponent = new TimeDisplayComponent();