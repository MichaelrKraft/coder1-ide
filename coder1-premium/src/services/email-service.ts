/**
 * Email Service - GoHighLevel Workflow Integration
 * Sends trial notification emails using GHL automated workflows
 */

import { ghlService } from './ghl-service';
import { logger } from '../utils/logger';

interface TrialEmailData {
  userName?: string;
  daysRemaining: number;
  trialEndDate: string;
  upgradeUrl: string;
}

class EmailService {
  private readonly WORKFLOW_TRIAL_START: string;
  private readonly WORKFLOW_TRIAL_DAY5: string;
  private readonly WORKFLOW_TRIAL_LAST_DAY: string;
  private readonly WORKFLOW_TRIAL_EXPIRED: string;
  private readonly WORKFLOW_MEMORY_EXPIRING: string;

  constructor() {
    // Load workflow IDs from environment
    this.WORKFLOW_TRIAL_START = process.env.GHL_WORKFLOW_TRIAL_START || '';
    this.WORKFLOW_TRIAL_DAY5 = process.env.GHL_WORKFLOW_TRIAL_DAY5 || '';
    this.WORKFLOW_TRIAL_LAST_DAY = process.env.GHL_WORKFLOW_TRIAL_LAST_DAY || '';
    this.WORKFLOW_TRIAL_EXPIRED = process.env.GHL_WORKFLOW_TRIAL_EXPIRED || '';
    this.WORKFLOW_MEMORY_EXPIRING = process.env.GHL_WORKFLOW_MEMORY_EXPIRING || '';

    if (!ghlService.isReady()) {
      logger.warn('⚠️ GoHighLevel not configured - email service disabled');
      logger.warn('Set GHL_API_KEY and GHL_LOCATION_ID to enable email automation');
    } else {
      logger.info('✅ Email service initialized with GoHighLevel workflows');
    }
  }

  /**
   * Send trial start email via GHL workflow
   */
  async sendTrialStartEmail(email: string, data: TrialEmailData): Promise<boolean> {
    if (!ghlService.isReady()) {
      logger.warn('GHL not configured. Skipping trial start email.');
      return false;
    }

    try {
      // Create or update contact in GHL
      const contactId = await ghlService.upsertContact({
        email,
        name: data.userName || email.split('@')[0],
        firstName: data.userName || email.split('@')[0],
        tags: ['Coder1 Premium Trial', 'Trial Day 0'],
        customFields: {
          trialStartDate: new Date().toISOString(),
          trialEndDate: data.trialEndDate,
          upgradeUrl: data.upgradeUrl,
        },
        source: 'Coder1 Premium Backend',
      });

      if (!contactId) {
        throw new Error('Failed to create/update GHL contact');
      }

      // Add note about trial start
      await ghlService.createContactNote(
        contactId,
        `🎉 Started 7-day Coder1 Pro trial. Expires: ${data.trialEndDate}`
      );

      // Trigger trial start workflow
      if (this.WORKFLOW_TRIAL_START) {
        await ghlService.triggerWorkflow(contactId, this.WORKFLOW_TRIAL_START, {
          userName: data.userName,
          daysRemaining: data.daysRemaining,
          trialEndDate: data.trialEndDate,
          upgradeUrl: data.upgradeUrl,
        });
        logger.info(`✉️ Triggered trial start workflow for ${email}`);
      } else {
        logger.warn('GHL_WORKFLOW_TRIAL_START not configured - workflow not triggered');
      }

      return true;
    } catch (error) {
      logger.error(`❌ Failed to send trial start email to ${email}`, error);
      return false;
    }
  }

  /**
   * Send trial day 5 reminder email via GHL workflow
   */
  async sendTrialDay5Email(email: string, data: TrialEmailData): Promise<boolean> {
    if (!ghlService.isReady()) {
      logger.warn('GHL not configured. Skipping trial day 5 email.');
      return false;
    }

    try {
      const contact = await ghlService.getContactByEmail(email);
      if (!contact?.id) {
        throw new Error('Contact not found in GHL');
      }

      // Update tags
      await ghlService.addContactTags(contact.id, ['Trial Day 5', 'Reminder Sent']);

      // Add note
      await ghlService.createContactNote(
        contact.id,
        `⏰ Sent 2-day reminder email. Trial expires: ${data.trialEndDate}`
      );

      // Trigger day 5 workflow
      if (this.WORKFLOW_TRIAL_DAY5) {
        await ghlService.triggerWorkflow(contact.id, this.WORKFLOW_TRIAL_DAY5, {
          userName: data.userName,
          daysRemaining: data.daysRemaining,
          trialEndDate: data.trialEndDate,
          upgradeUrl: data.upgradeUrl,
        });
        logger.info(`✉️ Triggered trial day 5 workflow for ${email}`);
      } else {
        logger.warn('GHL_WORKFLOW_TRIAL_DAY5 not configured - workflow not triggered');
      }

      return true;
    } catch (error) {
      logger.error(`❌ Failed to send trial day 5 email to ${email}`, error);
      return false;
    }
  }

  /**
   * Send trial last day email via GHL workflow
   */
  async sendTrialLastDayEmail(email: string, data: TrialEmailData): Promise<boolean> {
    if (!ghlService.isReady()) {
      logger.warn('GHL not configured. Skipping trial last day email.');
      return false;
    }

    try {
      const contact = await ghlService.getContactByEmail(email);
      if (!contact?.id) {
        throw new Error('Contact not found in GHL');
      }

      // Update tags
      await ghlService.addContactTags(contact.id, ['Trial Last Day', 'Final Reminder Sent']);

      // Add note
      await ghlService.createContactNote(
        contact.id,
        `🚨 Sent final day reminder. Trial expires TOMORROW: ${data.trialEndDate}`
      );

      // Trigger last day workflow
      if (this.WORKFLOW_TRIAL_LAST_DAY) {
        await ghlService.triggerWorkflow(contact.id, this.WORKFLOW_TRIAL_LAST_DAY, {
          userName: data.userName,
          daysRemaining: data.daysRemaining,
          trialEndDate: data.trialEndDate,
          upgradeUrl: data.upgradeUrl,
        });
        logger.info(`✉️ Triggered trial last day workflow for ${email}`);
      } else {
        logger.warn('GHL_WORKFLOW_TRIAL_LAST_DAY not configured - workflow not triggered');
      }

      return true;
    } catch (error) {
      logger.error(`❌ Failed to send trial last day email to ${email}`, error);
      return false;
    }
  }

  /**
   * Send trial expired email via GHL workflow
   */
  async sendTrialExpiredEmail(email: string, data: TrialEmailData): Promise<boolean> {
    if (!ghlService.isReady()) {
      logger.warn('GHL not configured. Skipping trial expired email.');
      return false;
    }

    try {
      const contact = await ghlService.getContactByEmail(email);
      if (!contact?.id) {
        throw new Error('Contact not found in GHL');
      }

      // Update tags
      await ghlService.addContactTags(contact.id, ['Trial Expired', 'Memory Preserved']);

      // Add note
      const preservationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await ghlService.createContactNote(
        contact.id,
        `📦 Trial expired. Memory preserved until ${preservationDate.toLocaleDateString()}`
      );

      // Trigger expired workflow
      if (this.WORKFLOW_TRIAL_EXPIRED) {
        await ghlService.triggerWorkflow(contact.id, this.WORKFLOW_TRIAL_EXPIRED, {
          userName: data.userName,
          trialEndDate: data.trialEndDate,
          upgradeUrl: data.upgradeUrl,
          memoryPreservationDate: preservationDate.toISOString(),
        });
        logger.info(`✉️ Triggered trial expired workflow for ${email}`);
      } else {
        logger.warn('GHL_WORKFLOW_TRIAL_EXPIRED not configured - workflow not triggered');
      }

      return true;
    } catch (error) {
      logger.error(`❌ Failed to send trial expired email to ${email}`, error);
      return false;
    }
  }

  /**
   * Send memory expiring warning email via GHL workflow
   */
  async sendMemoryExpiringEmail(email: string, daysUntilExpiry: number): Promise<boolean> {
    if (!ghlService.isReady()) {
      logger.warn('GHL not configured. Skipping memory expiring email.');
      return false;
    }

    try {
      const contact = await ghlService.getContactByEmail(email);
      if (!contact?.id) {
        throw new Error('Contact not found in GHL');
      }

      // Update tags
      await ghlService.addContactTags(contact.id, [
        'Memory Expiring',
        `${daysUntilExpiry} Days Until Deletion`,
      ]);

      // Add note
      await ghlService.createContactNote(
        contact.id,
        `⚠️ Memory expiring in ${daysUntilExpiry} days - sent warning email`
      );

      // Trigger memory expiring workflow
      if (this.WORKFLOW_MEMORY_EXPIRING) {
        await ghlService.triggerWorkflow(contact.id, this.WORKFLOW_MEMORY_EXPIRING, {
          daysUntilExpiry,
          upgradeUrl: 'http://localhost:3001/upgrade', // TODO: Update with production URL
        });
        logger.info(`✉️ Triggered memory expiring workflow for ${email} (${daysUntilExpiry} days)`);
      } else {
        logger.warn('GHL_WORKFLOW_MEMORY_EXPIRING not configured - workflow not triggered');
      }

      return true;
    } catch (error) {
      logger.error(`❌ Failed to send memory expiring email to ${email}`, error);
      return false;
    }
  }

  /**
   * Generic send method (kept for compatibility, but uses GHL workflows)
   */
  async send(options: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
    logger.warn('Generic send() called - consider using specific workflow methods instead');
    
    if (!ghlService.isReady()) {
      return false;
    }

    try {
      // Create contact and add note with email content
      const contact = await ghlService.getContactByEmail(options.to);
      if (contact?.id) {
        await ghlService.createContactNote(contact.id, `Email: ${options.subject}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to send generic email', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
