/**
 * Scheduler Service - Automated Trial Reminders
 * Uses node-cron to send trial reminder emails at scheduled times
 */

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';
import { trialService } from './trial-service';
import { emailService } from './email-service';
import { memoryService } from './memory-service';

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private readonly upgradeUrl: string;

  constructor() {
    this.upgradeUrl = process.env.UPGRADE_URL || 'http://localhost:3001/upgrade';
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    logger.info('📅 Starting scheduled tasks...');

    // Check for expiring trials every day at 9 AM
    const trialRemindersTask = cron.schedule('0 9 * * *', async () => {
      await this.checkTrialReminders();
    });
    this.tasks.set('trialReminders', trialRemindersTask);
    logger.info('✅ Trial reminders task scheduled (9 AM daily)');

    // Clean up expired memory every day at 2 AM
    const memoryCleanupTask = cron.schedule('0 2 * * *', async () => {
      await this.cleanupExpiredMemory();
    });
    this.tasks.set('memoryCleanup', memoryCleanupTask);
    logger.info('✅ Memory cleanup task scheduled (2 AM daily)');

    // Check for expiring preserved memory every day at 10 AM
    const memoryWarningsTask = cron.schedule('0 10 * * *', async () => {
      await this.checkMemoryExpirations();
    });
    this.tasks.set('memoryWarnings', memoryWarningsTask);
    logger.info('✅ Memory expiration warnings task scheduled (10 AM daily)');

    // Development: Run trial reminders every hour (comment out in production)
    if (process.env.NODE_ENV === 'development') {
      const devTrialTask = cron.schedule('0 * * * *', async () => {
        logger.info('🔧 [DEV] Running hourly trial reminder check...');
        await this.checkTrialReminders();
      });
      this.tasks.set('devTrialReminders', devTrialTask);
      logger.info('✅ [DEV] Hourly trial reminders enabled');
    }

    logger.info(`📅 ${this.tasks.size} scheduled tasks started`);
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    logger.info('Stopping scheduled tasks...');
    for (const [name, task] of this.tasks.entries()) {
      task.stop();
      logger.info(`Stopped task: ${name}`);
    }
    this.tasks.clear();
  }

  /**
   * Check for expiring trials and send reminder emails
   */
  private async checkTrialReminders(): Promise<void> {
    try {
      logger.info('Checking for expiring trials...');

      // Get trials expiring in 2 days (day 5 of trial)
      const day5Trials = await trialService.getExpiringTrials(2);
      logger.info(`Found ${day5Trials.length} trials expiring in 2 days`);

      for (const trial of day5Trials) {
        const email = await this.getUserEmail(trial.userId);
        if (email) {
          await emailService.sendTrialDay5Email(email, {
            daysRemaining: 2,
            trialEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            upgradeUrl: this.upgradeUrl,
          });
          logger.info(`Sent day 5 reminder to ${email}`);
        }
      }

      // Get trials expiring tomorrow (last day)
      const lastDayTrials = await trialService.getExpiringTrials(1);
      logger.info(`Found ${lastDayTrials.length} trials expiring tomorrow`);

      for (const trial of lastDayTrials) {
        const email = await this.getUserEmail(trial.userId);
        if (email) {
          await emailService.sendTrialLastDayEmail(email, {
            daysRemaining: 1,
            trialEndDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            upgradeUrl: this.upgradeUrl,
          });
          logger.info(`Sent last day reminder to ${email}`);
        }
      }

      // Get trials that expired today
      const expiredTrials = await trialService.getExpiringTrials(0);
      logger.info(`Found ${expiredTrials.length} trials expired today`);

      for (const trial of expiredTrials) {
        const email = await this.getUserEmail(trial.userId);
        if (email) {
          // Preserve memory for 30 days
          await memoryService.preserveMemoryData(trial.userId);
          
          // Send expired email
          await emailService.sendTrialExpiredEmail(email, {
            daysRemaining: 0,
            trialEndDate: new Date().toLocaleDateString(),
            upgradeUrl: this.upgradeUrl,
          });
          logger.info(`Sent trial expired email to ${email} and preserved memory`);
        }
      }

      logger.info('Trial reminder check complete');
    } catch (error) {
      logger.error('Error checking trial reminders', error);
    }
  }

  /**
   * Clean up expired preserved memory
   */
  private async cleanupExpiredMemory(): Promise<void> {
    try {
      logger.info('Cleaning up expired preserved memory...');
      const deletedCount = await memoryService.cleanupExpiredMemory();
      logger.info(`Cleaned up ${deletedCount} expired memory archives`);
    } catch (error) {
      logger.error('Error cleaning up expired memory', error);
    }
  }

  /**
   * Check for expiring preserved memory and send warnings
   */
  private async checkMemoryExpirations(): Promise<void> {
    try {
      logger.info('Checking for expiring preserved memory...');

      // TODO: Implement query to get users with memory expiring in X days
      // For now, this is a placeholder
      // In production, you'd query memory_archive table for approaching expiration dates

      logger.info('Memory expiration check complete');
    } catch (error) {
      logger.error('Error checking memory expirations', error);
    }
  }

  /**
   * Get user email from userId
   * TODO: Implement user lookup from users table
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    // Placeholder: In production, query users table
    // For now, assume userId is email format for testing
    if (userId.includes('@')) {
      return userId;
    }
    
    logger.warn(`No email found for userId: ${userId}`);
    return null;
  }

  /**
   * Manually trigger trial reminder check (for testing)
   */
  async triggerTrialReminders(): Promise<void> {
    logger.info('Manually triggering trial reminder check...');
    await this.checkTrialReminders();
  }

  /**
   * Manually trigger memory cleanup (for testing)
   */
  async triggerMemoryCleanup(): Promise<void> {
    logger.info('Manually triggering memory cleanup...');
    await this.cleanupExpiredMemory();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    tasksRunning: number;
    tasks: Array<{
      name: string;
      active: boolean;
    }>;
  } {
    return {
      tasksRunning: this.tasks.size,
      tasks: Array.from(this.tasks.entries()).map(([name, task]) => ({
        name,
        active: true, // cron tasks don't expose active status easily
      })),
    };
  }
}

export const schedulerService = new SchedulerService();
