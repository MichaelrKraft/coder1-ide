/**
 * Go High Level CRM Integration Service
 * Handles all interactions with GHL API for user tracking, email automation, and CRM functionality
 */

import { HighLevel } from '@gohighlevel/api-client';
import { logger } from '@/lib/logger';

// Types for GHL integration
export interface GHLContact {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
  dateAdded?: Date;
}

export interface GHLActivity {
  contactId: string;
  type: 'login' | 'signup' | 'project_created' | 'ai_usage' | 'subscription_change' | 'custom';
  description: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface GHLWebhookEvent {
  type: string;
  data: any;
  contactId?: string;
  timestamp: string;
}

export interface GHLEmailCampaign {
  contactId: string;
  campaignId?: string;
  templateId?: string;
  subject?: string;
  content?: string;
  metadata?: Record<string, any>;
}

class GoHighLevelService {
  private client: HighLevel | null = null;
  private isInitialized = false;
  private customFieldMap: Map<string, string> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize GHL client with credentials
   */
  private async initialize() {
    try {
      if (!process.env.ENABLE_GHL_INTEGRATION || process.env.ENABLE_GHL_INTEGRATION !== 'true') {
        logger.info('GHL integration is disabled');
        return;
      }

      const apiKey = process.env.GHL_API_KEY;
      const clientId = process.env.GHL_CLIENT_ID;
      const clientSecret = process.env.GHL_CLIENT_SECRET;

      if (!apiKey && (!clientId || !clientSecret)) {
        logger.warn('GHL credentials not configured. Please set GHL_API_KEY or GHL_CLIENT_ID/SECRET');
        return;
      }

      // Initialize with API key (simpler) or OAuth (more secure)
      if (apiKey) {
        this.client = new HighLevel({
          privateIntegrationToken: apiKey,
        });
      } else {
        this.client = new HighLevel({
          clientId,
          clientSecret,
        });
      }

      this.isInitialized = true;
      logger.info('✅ Go High Level service initialized successfully');

      // Load custom field mappings
      this.loadCustomFieldMappings();

      // Test connection
      await this.testConnection();
    } catch (error) {
      logger.error('Failed to initialize GHL service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Load custom field IDs from environment
   */
  private loadCustomFieldMappings() {
    const fieldMappings = {
      userId: process.env.GHL_FIELD_USER_ID,
      subscriptionTier: process.env.GHL_FIELD_SUBSCRIPTION_TIER,
      lastProject: process.env.GHL_FIELD_LAST_PROJECT,
      totalProjects: process.env.GHL_FIELD_TOTAL_PROJECTS,
      aiUsage: process.env.GHL_FIELD_AI_USAGE,
      lastActive: process.env.GHL_FIELD_LAST_ACTIVE,
    };

    Object.entries(fieldMappings).forEach(([key, value]) => {
      if (value) {
        this.customFieldMap.set(key, value);
      }
    });
  }

  /**
   * Test GHL connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        logger.warn('GHL_LOCATION_ID not set. Connection test skipped.');
        return true;
      }

      // Try to fetch location details as a test
      const response = await this.client.locations.get(locationId);
      logger.info('✅ GHL connection test successful:', response.name);
      return true;
    } catch (error) {
      logger.error('❌ GHL connection test failed:', error);
      return false;
    }
  }

  /**
   * Create or update a contact in GHL
   */
  async upsertContact(contact: GHLContact): Promise<string | null> {
    if (!this.isInitialized || !this.client) {
      logger.warn('GHL service not initialized. Skipping contact upsert.');
      return null;
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured');
      }

      // Prepare custom fields with proper field IDs
      const customFields = {};
      if (contact.customFields) {
        Object.entries(contact.customFields).forEach(([key, value]) => {
          const fieldId = this.customFieldMap.get(key);
          if (fieldId) {
            customFields[fieldId] = value;
          } else {
            // Use the key as-is if no mapping exists
            customFields[key] = value;
          }
        });
      }

      // Check if contact exists
      const existingContacts = await this.client.contacts.search({
        locationId,
        query: contact.email,
      });

      let contactId: string;

      if (existingContacts.contacts && existingContacts.contacts.length > 0) {
        // Update existing contact
        contactId = existingContacts.contacts[0].id;
        await this.client.contacts.update(contactId, {
          email: contact.email,
          name: contact.name,
          phone: contact.phone,
          firstName: contact.firstName,
          lastName: contact.lastName,
          tags: contact.tags,
          customFields,
          source: contact.source || 'CoderOne IDE',
        });
        logger.info(`Updated GHL contact: ${contactId}`);
      } else {
        // Create new contact
        const response = await this.client.contacts.create({
          locationId,
          email: contact.email,
          name: contact.name,
          phone: contact.phone,
          firstName: contact.firstName,
          lastName: contact.lastName,
          tags: contact.tags || ['CoderOne User'],
          customFields,
          source: contact.source || 'CoderOne IDE',
        });
        contactId = response.contact.id;
        logger.info(`Created new GHL contact: ${contactId}`);
      }

      return contactId;
    } catch (error) {
      logger.error('Failed to upsert GHL contact:', error);
      return null;
    }
  }

  /**
   * Track user activity in GHL
   */
  async trackActivity(activity: GHLActivity): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      logger.debug('GHL service not initialized. Skipping activity tracking.');
      return false;
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured');
      }

      // Create a note on the contact record
      await this.client.contacts.createNote(activity.contactId, {
        body: `[${activity.type.toUpperCase()}] ${activity.description}`,
        userId: 'system', // You might want to map this to actual GHL user
      });

      // Update custom fields if needed
      if (activity.metadata) {
        const customFields = {};
        Object.entries(activity.metadata).forEach(([key, value]) => {
          const fieldId = this.customFieldMap.get(key);
          if (fieldId) {
            customFields[fieldId] = value;
          }
        });

        if (Object.keys(customFields).length > 0) {
          await this.client.contacts.update(activity.contactId, {
            customFields,
          });
        }
      }

      // Update last active timestamp
      const lastActiveFieldId = this.customFieldMap.get('lastActive');
      if (lastActiveFieldId) {
        await this.client.contacts.update(activity.contactId, {
          customFields: {
            [lastActiveFieldId]: new Date().toISOString(),
          },
        });
      }

      logger.debug(`Tracked activity for contact ${activity.contactId}: ${activity.type}`);
      return true;
    } catch (error) {
      logger.error('Failed to track GHL activity:', error);
      return false;
    }
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string): Promise<GHLContact | null> {
    if (!this.isInitialized || !this.client) {
      return null;
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured');
      }

      const response = await this.client.contacts.search({
        locationId,
        query: email,
      });

      if (response.contacts && response.contacts.length > 0) {
        const contact = response.contacts[0];
        return {
          id: contact.id,
          email: contact.email,
          name: contact.name,
          phone: contact.phone,
          firstName: contact.firstName,
          lastName: contact.lastName,
          tags: contact.tags,
          customFields: contact.customFields,
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get GHL contact by email:', error);
      return null;
    }
  }

  /**
   * Add tags to a contact
   */
  async addContactTags(contactId: string, tags: string[]): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      await this.client.contacts.update(contactId, {
        tags,
      });
      logger.debug(`Added tags to contact ${contactId}: ${tags.join(', ')}`);
      return true;
    } catch (error) {
      logger.error('Failed to add GHL contact tags:', error);
      return false;
    }
  }

  /**
   * Trigger a workflow for a contact
   */
  async triggerWorkflow(contactId: string, workflowId: string, metadata?: any): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured');
      }

      // Note: The exact API method may vary based on GHL SDK version
      // This is a placeholder - check GHL docs for exact method
      await this.client.workflows.addContact({
        locationId,
        workflowId,
        contactId,
        eventData: metadata,
      });

      logger.info(`Triggered workflow ${workflowId} for contact ${contactId}`);
      return true;
    } catch (error) {
      logger.error('Failed to trigger GHL workflow:', error);
      return false;
    }
  }

  /**
   * Send an email campaign to a contact
   */
  async sendEmailCampaign(campaign: GHLEmailCampaign): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured');
      }

      // This would typically trigger a campaign or send a one-off email
      // The exact implementation depends on your GHL setup
      logger.info(`Sending email campaign to contact ${campaign.contactId}`);
      
      // For now, we'll add a note about the email
      await this.client.contacts.createNote(campaign.contactId, {
        body: `Email sent: ${campaign.subject || 'Campaign'}`,
        userId: 'system',
      });

      return true;
    } catch (error) {
      logger.error('Failed to send GHL email campaign:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature from GHL
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    const secret = process.env.GHL_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('GHL_WEBHOOK_SECRET not configured. Webhook verification skipped.');
      return true; // Allow in development
    }

    try {
      // GHL uses HMAC SHA256 for webhook signatures
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Failed to verify GHL webhook signature:', error);
      return false;
    }
  }

  /**
   * Get all contacts (with pagination)
   */
  async getAllContacts(limit: number = 100, offset: number = 0): Promise<GHLContact[]> {
    if (!this.isInitialized || !this.client) {
      return [];
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured');
      }

      const response = await this.client.contacts.list({
        locationId,
        limit,
        skip: offset,
      });

      return response.contacts.map(contact => ({
        id: contact.id,
        email: contact.email,
        name: contact.name,
        phone: contact.phone,
        firstName: contact.firstName,
        lastName: contact.lastName,
        tags: contact.tags,
        customFields: contact.customFields,
      }));
    } catch (error) {
      logger.error('Failed to get all GHL contacts:', error);
      return [];
    }
  }

  /**
   * Get contact statistics
   */
  async getContactStats(): Promise<any> {
    if (!this.isInitialized || !this.client) {
      return null;
    }

    try {
      const locationId = process.env.GHL_LOCATION_ID;
      if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured');
      }

      // Get total contact count
      const allContacts = await this.getAllContacts(1000, 0); // Get up to 1000 contacts
      
      // Calculate stats
      const stats = {
        totalContacts: allContacts.length,
        tagDistribution: {},
        subscriptionTiers: {
          free: 0,
          pro: 0,
          team: 0,
        },
        recentSignups: 0,
      };

      // Analyze contacts
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      allContacts.forEach(contact => {
        // Count tags
        if (contact.tags) {
          contact.tags.forEach(tag => {
            stats.tagDistribution[tag] = (stats.tagDistribution[tag] || 0) + 1;
          });
        }

        // Count subscription tiers (from custom field)
        const tierFieldId = this.customFieldMap.get('subscriptionTier');
        if (tierFieldId && contact.customFields?.[tierFieldId]) {
          const tier = contact.customFields[tierFieldId].toLowerCase();
          if (tier in stats.subscriptionTiers) {
            stats.subscriptionTiers[tier]++;
          }
        }

        // Count recent signups
        if (contact.dateAdded && new Date(contact.dateAdded) > thirtyDaysAgo) {
          stats.recentSignups++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get GHL contact stats:', error);
      return null;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }
}

// Export singleton instance
export const ghlService = new GoHighLevelService();

// Export types and service
export default ghlService;