/**
 * Bulletproof Storage Wrapper
 * 
 * Handles all localStorage edge cases:
 * - Private browsing mode
 * - Quota exceeded errors
 * - Disabled localStorage
 * - JSON parsing errors
 * - Cross-origin restrictions
 */

import { logger } from './logger';

interface StorageOptions {
  prefix?: string;
  fallbackToMemory?: boolean;
  encryptSensitive?: boolean;
}

class SafeStorage {
  private prefix: string;
  private isAvailable: boolean;
  private memoryStorage: Map<string, string>;
  private fallbackToMemory: boolean;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || 'coder1_';
    this.fallbackToMemory = options.fallbackToMemory ?? true;
    this.memoryStorage = new Map();
    this.isAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      const testKey = `${this.prefix}_test_${Date.now()}`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      logger.warn('localStorage not available, using memory fallback', e);
      return false;
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set<T>(key: string, value: T, options?: { ttl?: number }): boolean {
    const fullKey = this.getKey(key);
    
    try {
      const data = {
        value,
        timestamp: Date.now(),
        ttl: options?.ttl
      };
      
      const serialized = JSON.stringify(data);
      
      if (this.isAvailable) {
        try {
          localStorage.setItem(fullKey, serialized);
          return true;
        } catch (e) {
          // Quota exceeded or other storage error
          if (this.isQuotaError(e)) {
            this.handleQuotaExceeded();
          }
          throw e;
        }
      }
      
      // Fallback to memory
      if (this.fallbackToMemory) {
        this.memoryStorage.set(fullKey, serialized);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to set storage key: ${key}`, error);
      
      // Try memory storage as last resort
      if (this.fallbackToMemory) {
        try {
          const data = {
            value,
            timestamp: Date.now(),
            ttl: options?.ttl
          };
          this.memoryStorage.set(fullKey, JSON.stringify(data));
          return true;
        } catch (memError) {
          logger.error('Even memory storage failed', memError);
        }
      }
      
      return false;
    }
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    const fullKey = this.getKey(key);
    
    try {
      let serialized: string | null = null;
      
      if (this.isAvailable) {
        serialized = localStorage.getItem(fullKey);
      }
      
      if (!serialized && this.fallbackToMemory) {
        serialized = this.memoryStorage.get(fullKey) || null;
      }
      
      if (!serialized) {
        return defaultValue;
      }
      
      const data = JSON.parse(serialized);
      
      // Check TTL
      if (data.ttl) {
        const age = Date.now() - data.timestamp;
        if (age > data.ttl) {
          this.remove(key);
          return defaultValue;
        }
      }
      
      return data.value as T;
    } catch (error) {
      logger.warn(`Failed to get storage key: ${key}`, error);
      return defaultValue;
    }
  }

  remove(key: string): boolean {
    const fullKey = this.getKey(key);
    
    try {
      if (this.isAvailable) {
        localStorage.removeItem(fullKey);
      }
      
      if (this.memoryStorage.has(fullKey)) {
        this.memoryStorage.delete(fullKey);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to remove storage key: ${key}`, error);
      return false;
    }
  }

  clear(prefix?: string): boolean {
    try {
      const targetPrefix = prefix ? `${this.prefix}${prefix}` : this.prefix;
      
      if (this.isAvailable) {
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(targetPrefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // Clear memory storage
      const memKeysToRemove: string[] = [];
      this.memoryStorage.forEach((_, key) => {
        if (key.startsWith(targetPrefix)) {
          memKeysToRemove.push(key);
        }
      });
      
      memKeysToRemove.forEach(key => this.memoryStorage.delete(key));
      
      return true;
    } catch (error) {
      logger.error('Failed to clear storage', error);
      return false;
    }
  }

  private isQuotaError(error: any): boolean {
    return error?.name === 'QuotaExceededError' ||
           error?.code === 22 ||
           error?.code === 1014 ||
           error?.message?.includes('quota');
  }

  private handleQuotaExceeded(): void {
    logger.warn('Storage quota exceeded, attempting cleanup...');
    
    try {
      // Remove old items with TTL
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      if (this.isAvailable) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              if (data.ttl && (now - data.timestamp) > data.ttl) {
                keysToRemove.push(key);
              }
            } catch {
              // Invalid data, remove it
              keysToRemove.push(key!);
            }
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        logger.info(`Cleaned up ${keysToRemove.length} expired items`);
      }
    } catch (error) {
      logger.error('Failed to handle quota exceeded', error);
    }
  }

  // Get storage size info
  getStorageInfo(): { used: number; available: boolean; itemCount: number } {
    let used = 0;
    let itemCount = 0;
    
    try {
      if (this.isAvailable) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            itemCount++;
            const value = localStorage.getItem(key);
            if (value) {
              used += key.length + value.length;
            }
          }
        }
      }
      
      // Add memory storage size
      this.memoryStorage.forEach((value, key) => {
        itemCount++;
        used += key.length + value.length;
      });
    } catch (error) {
      logger.error('Failed to get storage info', error);
    }
    
    return {
      used,
      available: this.isAvailable,
      itemCount
    };
  }

  // Migrate data between storage types
  migrateToLocalStorage(): boolean {
    if (!this.isAvailable) {
      logger.warn('Cannot migrate: localStorage not available');
      return false;
    }
    
    try {
      let migrated = 0;
      
      this.memoryStorage.forEach((value, key) => {
        try {
          localStorage.setItem(key, value);
          migrated++;
        } catch (error) {
          logger.warn(`Failed to migrate key ${key}`, error);
        }
      });
      
      logger.info(`Migrated ${migrated} items to localStorage`);
      this.memoryStorage.clear();
      return true;
    } catch (error) {
      logger.error('Migration failed', error);
      return false;
    }
  }
}

// Create default storage instances
export const storage = new SafeStorage();
export const sessionStorage = new SafeStorage({ prefix: 'coder1_session_' });
export const tempStorage = new SafeStorage({ 
  prefix: 'coder1_temp_',
  fallbackToMemory: true 
});

// Export class for custom instances
export default SafeStorage;