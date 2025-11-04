/**
 * Trial Service - 7-Day Trial Management
 * Handles trial activation, status tracking, and conversion
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { ConflictError, NotFoundError } from '../utils/error-handler';

interface Trial {
  id: string;
  userId: string;
  trialStartDate: Date;
  trialEndDate: Date;
  status: 'active' | 'expired' | 'converted';
  convertedAt: Date | null;
  subscriptionId: string | null;
}

interface TrialStatus {
  userId: string;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  daysRemaining: number;
  status: 'active' | 'expired' | 'never_started';
  isPro: boolean;
}

class TrialService {
  private pool: Pool;
  private readonly TRIAL_DURATION_DAYS: number;
  private readonly PRESERVATION_DAYS: number;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.TRIAL_DURATION_DAYS = parseInt(process.env.TRIAL_DURATION_DAYS || '7');
    this.PRESERVATION_DAYS = parseInt(process.env.MEMORY_PRESERVATION_DAYS || '30');

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', err);
    });
  }

  /**
   * Initialize database tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS trials (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL UNIQUE,
          trial_start_date TIMESTAMP NOT NULL,
          trial_end_date TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          converted_at TIMESTAMP,
          subscription_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_trials_user_id ON trials(user_id);
        CREATE INDEX IF NOT EXISTS idx_trials_status ON trials(status);
        CREATE INDEX IF NOT EXISTS idx_trials_end_date ON trials(trial_end_date);

        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL UNIQUE,
          stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
          stripe_customer_id VARCHAR(255),
          plan VARCHAR(50) DEFAULT 'pro',
          status VARCHAR(50) DEFAULT 'active',
          amount INTEGER DEFAULT 2900,
          currency VARCHAR(3) DEFAULT 'usd',
          current_period_start TIMESTAMP,
          current_period_end TIMESTAMP,
          cancel_at_period_end BOOLEAN DEFAULT false,
          canceled_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      `);

      logger.info('Trial service database tables initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Start a 7-day trial for a user
   */
  async startTrial(userId: string): Promise<Trial> {
    const client = await this.pool.connect();
    try {
      const existingTrial = await client.query(
        `SELECT id FROM trials WHERE user_id = $1`,
        [userId]
      );

      if (existingTrial.rows.length > 0) {
        throw new ConflictError('User already has a trial');
      }

      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

      const result = await client.query(
        `INSERT INTO trials (user_id, trial_start_date, trial_end_date, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, user_id, trial_start_date, trial_end_date, status`,
        [userId, trialStart, trialEnd]
      );

      const row = result.rows[0];
      logger.info(`Trial started for user ${userId}, expires ${trialEnd.toISOString()}`);

      return {
        id: row.id.toString(),
        userId: row.user_id,
        trialStartDate: row.trial_start_date,
        trialEndDate: row.trial_end_date,
        status: row.status,
        convertedAt: null,
        subscriptionId: null,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get trial status for a user
   */
  async getStatus(userId: string): Promise<TrialStatus> {
    const client = await this.pool.connect();
    try {
      const subscriptionResult = await client.query(
        `SELECT status FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (subscriptionResult.rows.length > 0) {
        return {
          userId,
          trialStartDate: null,
          trialEndDate: null,
          daysRemaining: 0,
          status: 'active',
          isPro: true,
        };
      }

      const trialResult = await client.query(
        `SELECT trial_start_date, trial_end_date, status
         FROM trials
         WHERE user_id = $1`,
        [userId]
      );

      if (trialResult.rows.length === 0) {
        return {
          userId,
          trialStartDate: null,
          trialEndDate: null,
          daysRemaining: 0,
          status: 'never_started',
          isPro: false,
        };
      }

      const trial = trialResult.rows[0];
      const now = new Date();
      const endDate = new Date(trial.trial_end_date);
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

      const status = daysRemaining > 0 ? 'active' : 'expired';

      if (status === 'expired' && trial.status !== 'expired') {
        await client.query(
          `UPDATE trials SET status = 'expired' WHERE user_id = $1`,
          [userId]
        );
      }

      return {
        userId,
        trialStartDate: trial.trial_start_date,
        trialEndDate: trial.trial_end_date,
        daysRemaining,
        status,
        isPro: false,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Convert trial to Pro subscription
   */
  async convertToPro(userId: string, stripeSubscriptionId: string, stripeCustomerId?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const trialResult = await client.query(
        `SELECT id FROM trials WHERE user_id = $1`,
        [userId]
      );

      if (trialResult.rows.length === 0) {
        throw new NotFoundError('Trial');
      }

      await client.query(
        `UPDATE trials
         SET status = 'converted', converted_at = NOW(), subscription_id = $2
         WHERE user_id = $1`,
        [userId, stripeSubscriptionId]
      );

      await client.query(
        `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (user_id)
         DO UPDATE SET stripe_subscription_id = $2, stripe_customer_id = $3, status = 'active', updated_at = NOW()`,
        [userId, stripeSubscriptionId, stripeCustomerId]
      );

      await client.query('COMMIT');

      logger.info(`Trial converted to Pro for user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if user has active Pro subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get expiring trials (for reminder emails)
   */
  async getExpiringTrials(daysUntilExpiry: number): Promise<Array<{ userId: string; email?: string; daysRemaining: number }>> {
    const client = await this.pool.connect();
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysUntilExpiry);

      const result = await client.query(
        `SELECT user_id,
                EXTRACT(DAY FROM (trial_end_date - NOW())) as days_remaining
         FROM trials
         WHERE status = 'active'
           AND trial_end_date >= NOW()
           AND trial_end_date <= $1`,
        [targetDate]
      );

      return result.rows.map(row => ({
        userId: row.user_id,
        daysRemaining: Math.ceil(parseFloat(row.days_remaining)),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get trial statistics
   */
  async getStats(): Promise<{
    totalTrials: number;
    activeTrials: number;
    expiredTrials: number;
    convertedTrials: number;
    conversionRate: number;
    activeSubscriptions: number;
  }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM trials) as total_trials,
          (SELECT COUNT(*) FROM trials WHERE status = 'active') as active_trials,
          (SELECT COUNT(*) FROM trials WHERE status = 'expired') as expired_trials,
          (SELECT COUNT(*) FROM trials WHERE status = 'converted') as converted_trials,
          (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions
      `);

      const stats = result.rows[0];
      const totalTrials = parseInt(stats.total_trials) || 0;
      const convertedTrials = parseInt(stats.converted_trials) || 0;

      return {
        totalTrials,
        activeTrials: parseInt(stats.active_trials) || 0,
        expiredTrials: parseInt(stats.expired_trials) || 0,
        convertedTrials,
        conversionRate: totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0,
        activeSubscriptions: parseInt(stats.active_subscriptions) || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Trial service database pool closed');
  }
}

export const trialService = new TrialService();
