/**
 * GHL User Sync Service
 * Automatically syncs CoderOne users with Go High Level contacts
 */

import { ghlService, GHLContact, GHLActivity } from './gohighlevel-service';
import { getUserById, getUserProjects, trackUsage } from '@/lib/auth/db';
import { logger } from '@/lib/logger';

export interface SyncResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

export interface UserActivityData {
  userId: string;
  action: string;
  details?: any;
}

class GHLUserSyncService {
  private syncQueue: Map<string, any> = new Map();
  private isSyncing = false;

  /**
   * Sync a new user registration with GHL
   */
  async syncNewUser(userData: {
    id: string;
    email: string;
    username: string;
    subscriptionTier?: string;
  }): Promise<SyncResult> {
    try {
      logger.info(`Syncing new user to GHL: ${userData.email}`);

      // Create contact in GHL
      const contact: GHLContact = {
        email: userData.email,
        name: userData.username,
        firstName: userData.username,
        tags: [
          'CoderOne User',
          'Alpha Launch',
          userData.subscriptionTier || 'Free Tier',
          'New Signup',
          `Signup ${new Date().toISOString().split('T')[0]}` // Signup date tag
        ],
        customFields: {
          userId: userData.id,
          subscriptionTier: userData.subscriptionTier || 'free',
          signupDate: new Date().toISOString(),
          totalProjects: 0,
          lastActive: new Date().toISOString(),
        },
        source: 'CoderOne IDE - Alpha Launch',
      };

      const contactId = await ghlService.upsertContact(contact);

      if (contactId) {
        // Trigger welcome workflow in GHL
        await this.triggerOnboardingWorkflow(contactId, userData);

        // Track the signup event
        await ghlService.trackActivity({
          contactId,
          type: 'signup',
          description: `User registered: ${userData.username}`,
          metadata: {
            platform: 'CoderOne IDE',
            version: 'Alpha',
          },
        });

        // Store GHL contact ID in local database (add this field to your users table)
        // await updateUserGHLContactId(userData.id, contactId);

        return {
          success: true,
          contactId,
        };
      } else {
        throw new Error('Failed to create GHL contact');
      }
    } catch (error) {
      logger.error('Failed to sync new user to GHL:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync user login event
   */
  async syncUserLogin(userId: string): Promise<void> {
    try {
      const user = getUserById(userId);
      if (!user) return;

      // Get or create GHL contact
      let contact = await ghlService.getContactByEmail(user.email);
      if (!contact?.id) {
        // User exists locally but not in GHL, create them
        const result = await this.syncNewUser({
          id: user.id,
          email: user.email,
          username: user.username,
          subscriptionTier: user.subscription_tier,
        });
        contact = { id: result.contactId };
      }

      if (contact?.id) {
        // Track login activity
        await ghlService.trackActivity({
          contactId: contact.id,
          type: 'login',
          description: 'User logged in',
          metadata: {
            lastLogin: new Date().toISOString(),
          },
        });

        // Update last active
        await ghlService.upsertContact({
          email: user.email,
          customFields: {
            lastActive: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      logger.error('Failed to sync user login:', error);
    }
  }

  /**
   * Sync project creation
   */
  async syncProjectCreation(userId: string, projectData: {
    name: string;
    description?: string;
  }): Promise<void> {
    try {
      const user = getUserById(userId);
      if (!user) return;

      const contact = await ghlService.getContactByEmail(user.email);
      if (!contact?.id) return;

      // Get total project count
      const projects = getUserProjects(userId);
      const totalProjects = projects.length;

      // Track project creation
      await ghlService.trackActivity({
        contactId: contact.id,
        type: 'project_created',
        description: `Created project: ${projectData.name}`,
        metadata: {
          projectName: projectData.name,
          totalProjects,
        },
      });

      // Update custom fields
      await ghlService.upsertContact({
        email: user.email,
        customFields: {
          lastProject: projectData.name,
          totalProjects,
          lastActive: new Date().toISOString(),
        },
      });

      // Add achievement tags based on milestones
      const tags: string[] = [];
      if (totalProjects === 1) tags.push('First Project Created');
      if (totalProjects === 5) tags.push('5 Projects Milestone');
      if (totalProjects === 10) tags.push('Power User - 10 Projects');
      if (totalProjects === 25) tags.push('Super User - 25 Projects');

      if (tags.length > 0) {
        await ghlService.addContactTags(contact.id, tags);
      }
    } catch (error) {
      logger.error('Failed to sync project creation:', error);
    }
  }

  /**
   * Sync AI usage
   */
  async syncAIUsage(userId: string, usageData: {
    feature: string;
    tokens?: number;
    duration?: number;
  }): Promise<void> {
    try {
      const user = getUserById(userId);
      if (!user) return;

      const contact = await ghlService.getContactByEmail(user.email);
      if (!contact?.id) return;

      // Track AI usage
      await ghlService.trackActivity({
        contactId: contact.id,
        type: 'ai_usage',
        description: `Used AI feature: ${usageData.feature}`,
        metadata: {
          feature: usageData.feature,
          tokens: usageData.tokens,
          duration: usageData.duration,
        },
      });

      // Update AI usage counter (you might want to track this daily/monthly)
      const currentDate = new Date().toISOString().split('T')[0];
      await ghlService.upsertContact({
        email: user.email,
        customFields: {
          [`aiUsage_${currentDate}`]: (usageData.tokens || 0),
          lastActive: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to sync AI usage:', error);
    }
  }

  /**
   * Sync subscription change
   */
  async syncSubscriptionChange(userId: string, newTier: 'free' | 'pro' | 'team'): Promise<void> {
    try {
      const user = getUserById(userId);
      if (!user) return;

      const contact = await ghlService.getContactByEmail(user.email);
      if (!contact?.id) return;

      // Track subscription change
      await ghlService.trackActivity({
        contactId: contact.id,
        type: 'subscription_change',
        description: `Subscription changed to: ${newTier}`,
        metadata: {
          previousTier: user.subscription_tier,
          newTier,
          changeDate: new Date().toISOString(),
        },
      });

      // Update tags
      const tags = [
        `${newTier.charAt(0).toUpperCase() + newTier.slice(1)} Tier`,
      ];

      if (newTier === 'pro' || newTier === 'team') {
        tags.push('Paid Customer');
        tags.push(`Upgraded ${new Date().toISOString().split('T')[0]}`);
      }

      await ghlService.addContactTags(contact.id, tags);

      // Update custom fields
      await ghlService.upsertContact({
        email: user.email,
        customFields: {
          subscriptionTier: newTier,
          subscriptionChangeDate: new Date().toISOString(),
        },
      });

      // Trigger relevant workflow based on tier
      if (newTier === 'pro') {
        await this.triggerProUpgradeWorkflow(contact.id, user);
      } else if (newTier === 'team') {
        await this.triggerTeamUpgradeWorkflow(contact.id, user);
      }
    } catch (error) {
      logger.error('Failed to sync subscription change:', error);
    }
  }

  /**
   * Batch sync all users (for initial setup or recovery)
   */
  async batchSyncAllUsers(): Promise<{
    total: number;
    synced: number;
    failed: number;
  }> {
    if (this.isSyncing) {
      logger.warn('Batch sync already in progress');
      return { total: 0, synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    const stats = { total: 0, synced: 0, failed: 0 };

    try {
      logger.info('Starting batch sync of all users to GHL');

      // Get all users from database
      // This is a placeholder - implement based on your DB structure
      const getAllUsers = async () => {
        // Return array of all users
        return [];
      };

      const users = await getAllUsers();
      stats.total = users.length;

      // Process in batches to avoid overwhelming GHL API
      const batchSize = parseInt(process.env.GHL_BATCH_SIZE || '50');
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (user) => {
            try {
              const result = await this.syncNewUser({
                id: user.id,
                email: user.email,
                username: user.username,
                subscriptionTier: user.subscription_tier,
              });

              if (result.success) {
                stats.synced++;
              } else {
                stats.failed++;
              }
            } catch (error) {
              logger.error(`Failed to sync user ${user.email}:`, error);
              stats.failed++;
            }
          })
        );

        // Add delay between batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info('Batch sync completed:', stats);
    } catch (error) {
      logger.error('Batch sync failed:', error);
    } finally {
      this.isSyncing = false;
    }

    return stats;
  }

  /**
   * Trigger onboarding workflow in GHL
   */
  private async triggerOnboardingWorkflow(contactId: string, userData: any): Promise<void> {
    try {
      // The workflow ID should be configured in your GHL account
      const workflowId = process.env.GHL_WORKFLOW_ONBOARDING;
      if (workflowId) {
        await ghlService.triggerWorkflow(contactId, workflowId, {
          username: userData.username,
          signupDate: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to trigger onboarding workflow:', error);
    }
  }

  /**
   * Trigger pro upgrade workflow
   */
  private async triggerProUpgradeWorkflow(contactId: string, userData: any): Promise<void> {
    try {
      const workflowId = process.env.GHL_WORKFLOW_PRO_UPGRADE;
      if (workflowId) {
        await ghlService.triggerWorkflow(contactId, workflowId, {
          username: userData.username,
          upgradeDate: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to trigger pro upgrade workflow:', error);
    }
  }

  /**
   * Trigger team upgrade workflow
   */
  private async triggerTeamUpgradeWorkflow(contactId: string, userData: any): Promise<void> {
    try {
      const workflowId = process.env.GHL_WORKFLOW_TEAM_UPGRADE;
      if (workflowId) {
        await ghlService.triggerWorkflow(contactId, workflowId, {
          username: userData.username,
          upgradeDate: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to trigger team upgrade workflow:', error);
    }
  }
}

// Export singleton instance
export const ghlUserSync = new GHLUserSyncService();

// Export service
export default ghlUserSync;