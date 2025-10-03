/**
 * Preference Service - User preference management
 * Phase II Implementation
 */

import { executeQuery, executeRun } from './database';
import { logger } from '@/lib/logger';

export interface UserPreferences {
  detectionThreshold: number;
  autoGenerationEnabled: boolean;
  eventTypesEnabled: string[];
  notificationEnabled: boolean;
  exportFormat: 'json' | 'markdown' | 'html';
}

class PreferenceService {
  /**
   * Get a preference value
   */
  get<T>(key: string): T | null {
    try {
      const row = executeQuery<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        [key]
      );

      if (!row) {
        return null;
      }

      try {
        return JSON.parse(row.value) as T;
      } catch {
        return row.value as T;
      }
    } catch (error) {
      logger.error(`❌ Failed to get preference: ${key}`, error);
      return null;
    }
  }

  /**
   * Set a preference value
   */
  set<T>(key: string, value: T): boolean {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      executeRun(
        `INSERT INTO user_preferences (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
        [key, stringValue, stringValue]
      );

      logger.debug(`✅ Preference set: ${key}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to set preference: ${key}`, error);
      return false;
    }
  }

  /**
   * Get all preferences
   */
  getAll(): Record<string, any> {
    try {
      const rows = executeQuery<any[]>(
        'SELECT key, value FROM user_preferences',
        []
      );

      if (!rows || !Array.isArray(rows)) {
        return {};
      }

      const preferences: Record<string, any> = {};
      rows.forEach((row: any) => {
        try {
          preferences[row.key] = JSON.parse(row.value);
        } catch {
          preferences[row.key] = row.value;
        }
      });

      return preferences;
    } catch (error) {
      logger.error('❌ Failed to get all preferences:', error);
      return {};
    }
  }

  /**
   * Reset all preferences to defaults
   */
  reset(): boolean {
    try {
      executeRun('DELETE FROM user_preferences', []);
      
      // Re-insert defaults (will be handled by schema)
      const defaults = [
        ['detection_threshold', '0.7'],
        ['auto_generation_enabled', 'true'],
        ['event_types_enabled', JSON.stringify(['bug-fix', 'feature', 'breakthrough', 'refactor', 'optimization', 'learning', 'milestone'])],
        ['notification_enabled', 'true'],
        ['export_format', 'markdown']
      ];

      defaults.forEach(([key, value]) => {
        executeRun(
          'INSERT INTO user_preferences (key, value) VALUES (?, ?)',
          [key, value]
        );
      });

      logger.info('✅ Preferences reset to defaults');
      return true;
    } catch (error) {
      logger.error('❌ Failed to reset preferences:', error);
      return false;
    }
  }

  /**
   * Get typed user preferences
   */
  getUserPreferences(): UserPreferences {
    return {
      detectionThreshold: this.get<number>('detection_threshold') || 0.7,
      autoGenerationEnabled: this.get<boolean>('auto_generation_enabled') ?? true,
      eventTypesEnabled: this.get<string[]>('event_types_enabled') || [],
      notificationEnabled: this.get<boolean>('notification_enabled') ?? true,
      exportFormat: this.get<'json' | 'markdown' | 'html'>('export_format') || 'markdown'
    };
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): boolean {
    try {
      if (preferences.detectionThreshold !== undefined) {
        this.set('detection_threshold', preferences.detectionThreshold);
      }
      if (preferences.autoGenerationEnabled !== undefined) {
        this.set('auto_generation_enabled', preferences.autoGenerationEnabled);
      }
      if (preferences.eventTypesEnabled) {
        this.set('event_types_enabled', preferences.eventTypesEnabled);
      }
      if (preferences.notificationEnabled !== undefined) {
        this.set('notification_enabled', preferences.notificationEnabled);
      }
      if (preferences.exportFormat) {
        this.set('export_format', preferences.exportFormat);
      }

      return true;
    } catch (error) {
      logger.error('❌ Failed to update user preferences:', error);
      return false;
    }
  }
}

// Export singleton instance
export const preferenceService = new PreferenceService();
export default preferenceService;
