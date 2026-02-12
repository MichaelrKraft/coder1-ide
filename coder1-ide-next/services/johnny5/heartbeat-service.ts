/**
 * Johnny5 Heartbeat Service
 *
 * Makes Johnny5 "alive" by periodically checking health, user presence,
 * and triggering proactive actions via the Opportunity Engine.
 *
 * Two heartbeat intervals:
 * - Pulse (30s): Lightweight alive indicator emitted via Socket.IO
 * - Deep check (5min): Health checks, opportunity scanning, memory quality
 */

import { logger } from '@/lib/logger';
import { isLivingFilesEnabled, loadLivingFile, writeLivingFile } from '@/lib/living-files';

// ============================================================================
// Types
// ============================================================================

export interface HeartbeatStatus {
  isAlive: boolean;
  lastPulse: Date | null;
  lastDeepCheck: Date | null;
  health: {
    database: boolean;
    livingFiles: boolean;
    providers: boolean;
  };
  userPresence: {
    isActive: boolean;
    lastActivity: Date | null;
    connectedSockets: number;
  };
}

export interface HeartbeatConfig {
  pulseIntervalMs: number;   // Default: 30000 (30s)
  deepCheckIntervalMs: number; // Default: 300000 (5min)
  quietHoursStart: number;    // Default: 22 (10pm)
  quietHoursEnd: number;      // Default: 7 (7am)
  onPulse?: (status: HeartbeatStatus) => void;
  onOpportunity?: (event: { type: string; data: Record<string, unknown> }) => void;
}

// ============================================================================
// HeartbeatService
// ============================================================================

class HeartbeatService {
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private deepCheckTimer: ReturnType<typeof setInterval> | null = null;
  private config: HeartbeatConfig;
  private status: HeartbeatStatus;
  private started = false;

  constructor(config: Partial<HeartbeatConfig> = {}) {
    this.config = {
      pulseIntervalMs: config.pulseIntervalMs ?? 30000,
      deepCheckIntervalMs: config.deepCheckIntervalMs ?? 300000,
      quietHoursStart: config.quietHoursStart ?? 22,
      quietHoursEnd: config.quietHoursEnd ?? 7,
      onPulse: config.onPulse,
      onOpportunity: config.onOpportunity,
    };

    this.status = {
      isAlive: false,
      lastPulse: null,
      lastDeepCheck: null,
      health: { database: false, livingFiles: false, providers: false },
      userPresence: { isActive: false, lastActivity: null, connectedSockets: 0 },
    };
  }

  /**
   * Start the heartbeat service
   */
  start(): void {
    if (this.started) {
      logger.warn('[Heartbeat] Already started');
      return;
    }

    logger.info('[Heartbeat] Starting heartbeat service...');
    this.started = true;
    this.status.isAlive = true;

    // Load config from HEARTBEAT.md if available
    this.loadHeartbeatConfig();

    // Start pulse timer (lightweight, frequent)
    this.pulseTimer = setInterval(() => this.pulse(), this.config.pulseIntervalMs);

    // Start deep check timer (heavy, infrequent)
    this.deepCheckTimer = setInterval(() => this.deepCheck(), this.config.deepCheckIntervalMs);

    // Run initial deep check
    this.deepCheck();

    logger.info('[Heartbeat] Service started', {
      pulseInterval: `${this.config.pulseIntervalMs / 1000}s`,
      deepCheckInterval: `${this.config.deepCheckIntervalMs / 1000}s`,
    });
  }

  /**
   * Stop the heartbeat service
   */
  stop(): void {
    if (!this.started) return;

    logger.info('[Heartbeat] Stopping heartbeat service...');

    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.deepCheckTimer) {
      clearInterval(this.deepCheckTimer);
      this.deepCheckTimer = null;
    }

    this.started = false;
    this.status.isAlive = false;
    logger.info('[Heartbeat] Service stopped');
  }

  /**
   * Lightweight pulse — just signals "alive" and checks user presence
   */
  private pulse(): void {
    this.status.lastPulse = new Date();

    // Emit pulse to registered callback (Socket.IO in server.js)
    if (this.config.onPulse) {
      try {
        this.config.onPulse(this.getStatus());
      } catch (err) {
        logger.warn('[Heartbeat] Pulse callback failed:', err);
      }
    }
  }

  /**
   * Deep check — health, opportunities, memory quality
   */
  private async deepCheck(): Promise<void> {
    if (this.isQuietHours()) {
      logger.debug('[Heartbeat] Quiet hours — skipping deep check');
      return;
    }

    this.status.lastDeepCheck = new Date();

    // 1. Check living files health
    try {
      if (isLivingFilesEnabled()) {
        const soul = loadLivingFile('SOUL.md');
        this.status.health.livingFiles = soul !== null;
      } else {
        this.status.health.livingFiles = false;
      }
    } catch {
      this.status.health.livingFiles = false;
    }

    // 2. Check database health
    try {
      const { initializeDb } = require('@/lib/johnny5-db');
      const db = initializeDb();
      this.status.health.database = !!db;
    } catch {
      this.status.health.database = false;
    }

    // 3. Check provider availability
    this.status.health.providers = !!(
      process.env.GEMINI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY
    );

    // 4. Emit opportunity events for detected situations
    if (this.config.onOpportunity) {
      // Check for user inactivity
      if (this.status.userPresence.isActive && this.status.userPresence.lastActivity) {
        const inactiveMinutes = (Date.now() - this.status.userPresence.lastActivity.getTime()) / 60000;
        if (inactiveMinutes > 30) {
          this.config.onOpportunity({
            type: 'user_inactive',
            data: { inactiveMinutes: Math.round(inactiveMinutes) },
          });
        }
      }

      // Check health issues
      if (!this.status.health.database) {
        this.config.onOpportunity({
          type: 'health_issue',
          data: { component: 'database', status: 'unavailable' },
        });
      }
    }

    logger.debug('[Heartbeat] Deep check complete', {
      health: this.status.health,
      userActive: this.status.userPresence.isActive,
    });
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(): boolean {
    const hour = new Date().getHours();
    const { quietHoursStart, quietHoursEnd } = this.config;

    if (quietHoursStart > quietHoursEnd) {
      // Spans midnight (e.g., 22 to 7)
      return hour >= quietHoursStart || hour < quietHoursEnd;
    }
    return hour >= quietHoursStart && hour < quietHoursEnd;
  }

  /**
   * Load heartbeat config from HEARTBEAT.md if available
   */
  private loadHeartbeatConfig(): void {
    if (!isLivingFilesEnabled()) return;

    try {
      const content = loadLivingFile('HEARTBEAT.md');
      if (!content) return;

      // Parse proactivity level from HEARTBEAT.md
      const proactivityMatch = content.match(/Current:\s*(low|medium|high)/i);
      if (proactivityMatch) {
        logger.info('[Heartbeat] Proactivity level from HEARTBEAT.md:', proactivityMatch[1]);
      }

      // Parse quiet hours
      const startMatch = content.match(/Start:\s*(\d{1,2}):?\d{0,2}\s*(AM|PM)?/i);
      const endMatch = content.match(/End:\s*(\d{1,2}):?\d{0,2}\s*(AM|PM)?/i);
      if (startMatch) {
        let hour = parseInt(startMatch[1]);
        if (startMatch[2]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
        this.config.quietHoursStart = hour;
      }
      if (endMatch) {
        let hour = parseInt(endMatch[1]);
        if (endMatch[2]?.toUpperCase() === 'AM' && hour < 12) { /* already correct */ }
        this.config.quietHoursEnd = hour;
      }
    } catch (err) {
      logger.warn('[Heartbeat] Failed to load HEARTBEAT.md config:', err);
    }
  }

  /**
   * Update user presence (called from Socket.IO connection events)
   */
  updateUserPresence(isActive: boolean, connectedSockets: number): void {
    this.status.userPresence.isActive = isActive;
    this.status.userPresence.connectedSockets = connectedSockets;
    if (isActive) {
      this.status.userPresence.lastActivity = new Date();
    }
  }

  /**
   * Record user activity (called on any user interaction)
   */
  recordActivity(): void {
    this.status.userPresence.lastActivity = new Date();
    this.status.userPresence.isActive = true;
  }

  /**
   * Get current heartbeat status
   */
  getStatus(): HeartbeatStatus {
    return { ...this.status };
  }

  /**
   * Check if the service is running
   */
  isRunning(): boolean {
    return this.started;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: HeartbeatService | null = null;

/**
 * Get the HeartbeatService singleton
 */
export function getHeartbeatService(config?: Partial<HeartbeatConfig>): HeartbeatService {
  if (!instance) {
    instance = new HeartbeatService(config);
  }
  return instance;
}

export { HeartbeatService };
