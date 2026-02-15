/**
 * Database-Backed Memory Preferences Service
 * Uses SQLite instead of localStorage for persistent user preferences
 * Phase II: Full SQLite Persistence Implementation
 */

import { memoryDb } from './db/memory-database';

export interface MemoryPreferences {
  enabled: boolean;
  threshold: number;
  autoGeneration: boolean;
  eventTypes: {
    bugFix: boolean;
    featureCompletion: boolean;
    breakthrough: boolean;
    learning: boolean;
    architectureDecision: boolean;
    solutionDiscovery: boolean;
  };
  notifications: boolean;
  notificationSound: boolean;
  templateType: 'default' | 'detailed' | 'minimal' | 'technical' | 'learning';
}

const DEFAULT_PREFERENCES: MemoryPreferences = {
  enabled: true,
  threshold: 70,
  autoGeneration: true,
  eventTypes: {
    bugFix: true,
    featureCompletion: true,
    breakthrough: true,
    learning: true,
    architectureDecision: false,
    solutionDiscovery: false,
  },
  notifications: false,  // Disabled by default - was causing unwanted popups
  notificationSound: false,
  templateType: 'default',
};

class DatabaseMemoryPreferencesService {
  private static instance: DatabaseMemoryPreferencesService;
  private preferences: MemoryPreferences | null = null;

  private constructor() {
    this.initializePreferences();
  }

  public static getInstance(): DatabaseMemoryPreferencesService {
    if (!DatabaseMemoryPreferencesService.instance) {
      DatabaseMemoryPreferencesService.instance = new DatabaseMemoryPreferencesService();
    }
    return DatabaseMemoryPreferencesService.instance;
  }

  /**
   * Initialize preferences from database
   */
  private async initializePreferences(): Promise<void> {
    try {
      this.preferences = await this.loadPreferencesFromDatabase();
    } catch (error) {
      console.error('Failed to load preferences from database:', error);
      this.preferences = DEFAULT_PREFERENCES;
    }
  }

  /**
   * Load preferences from SQLite database
   */
  private async loadPreferencesFromDatabase(): Promise<MemoryPreferences> {
    try {
      // Access the private database instance through reflection
      const db = (memoryDb as any).db;
      if (!db) {
        throw new Error('Database not initialized');
      }
      
      // Get all preference values from database
      const stmt = db.prepare('SELECT key, value FROM user_preferences');
      const rows = stmt.all() as Array<{ key: string; value: string }>;
      
      const dbPrefs: Record<string, any> = {};
      rows.forEach(row => {
        try {
          dbPrefs[row.key] = JSON.parse(row.value);
        } catch {
          dbPrefs[row.key] = row.value;
        }
      });

      // Map database keys to our preference structure
      const preferences: MemoryPreferences = {
        enabled: dbPrefs.memory_detection_enabled === 'true' || dbPrefs.memory_detection_enabled === true,
        threshold: parseInt(dbPrefs.memory_detection_threshold || '70'),
        autoGeneration: dbPrefs.memory_auto_generation === 'true' || dbPrefs.memory_auto_generation === true,
        notifications: dbPrefs.memory_notifications === 'true' || dbPrefs.memory_notifications === true,
        notificationSound: dbPrefs.memory_notification_sound === 'true' || dbPrefs.memory_notification_sound === true,
        templateType: dbPrefs.memory_template_type || 'default',
        eventTypes: dbPrefs.memory_event_types ? 
          (typeof dbPrefs.memory_event_types === 'string' ? 
            JSON.parse(dbPrefs.memory_event_types) : 
            dbPrefs.memory_event_types) : 
          DEFAULT_PREFERENCES.eventTypes
      };

      return preferences;
    } catch (error) {
      console.error('Error loading preferences from database:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Save preferences to SQLite database
   */
  private async savePreferencesToDatabase(preferences: MemoryPreferences): Promise<void> {
    try {
      // Access the private database instance through reflection
      const db = (memoryDb as any).db;
      if (!db) {
        throw new Error('Database not initialized');
      }
      const updates = [
        { key: 'memory_detection_enabled', value: preferences.enabled.toString() },
        { key: 'memory_detection_threshold', value: preferences.threshold.toString() },
        { key: 'memory_auto_generation', value: preferences.autoGeneration.toString() },
        { key: 'memory_notifications', value: preferences.notifications.toString() },
        { key: 'memory_notification_sound', value: preferences.notificationSound.toString() },
        { key: 'memory_template_type', value: preferences.templateType },
        { key: 'memory_event_types', value: JSON.stringify(preferences.eventTypes) }
      ];

      // Use upsert (INSERT OR REPLACE) for each preference
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO user_preferences (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      const transaction = db.transaction((updates: Array<{key: string, value: string}>) => {
        for (const update of updates) {
          stmt.run(update.key, update.value);
        }
      });

      transaction(updates);
      
      console.log('✅ Memory preferences saved to SQLite database');
    } catch (error) {
      console.error('Failed to save preferences to database:', error);
      throw error;
    }
  }

  /**
   * Migrate from localStorage to database
   */
  public async migrateFromLocalStorage(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem('coder1-memory-preferences');
      if (!stored) return false;

      const localStoragePrefs = JSON.parse(stored);
      const migratedPrefs = { ...DEFAULT_PREFERENCES, ...localStoragePrefs };
      
      await this.savePreferences(migratedPrefs);
      
      // Remove from localStorage after successful migration
      localStorage.removeItem('coder1-memory-preferences');
      
      console.log('✅ Successfully migrated preferences from localStorage to SQLite');
      return true;
    } catch (error) {
      console.error('Failed to migrate preferences from localStorage:', error);
      return false;
    }
  }

  /**
   * Save preferences (async version)
   */
  public async savePreferences(preferences: Partial<MemoryPreferences>): Promise<void> {
    if (!this.preferences) {
      await this.initializePreferences();
    }

    this.preferences = { ...this.preferences!, ...preferences };
    await this.savePreferencesToDatabase(this.preferences);
    
    // Emit event for other components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memoryPreferencesChanged', {
        detail: this.preferences
      }));
    }
  }

  /**
   * Get current preferences (async version)
   */
  public async getPreferences(): Promise<MemoryPreferences> {
    if (!this.preferences) {
      await this.initializePreferences();
    }
    return { ...this.preferences! };
  }

  /**
   * Synchronous methods for backward compatibility
   */
  
  public savePreferencesSync(preferences: Partial<MemoryPreferences>): void {
    // For immediate UI updates, update in-memory first
    if (this.preferences) {
      this.preferences = { ...this.preferences, ...preferences };
    }
    
    // Save to database asynchronously
    this.savePreferences(preferences).catch(error => {
      console.error('Background preference save failed:', error);
    });
  }

  public getPreferencesSync(): MemoryPreferences {
    return this.preferences || DEFAULT_PREFERENCES;
  }

  /**
   * Check if memory detection is enabled
   */
  public isEnabled(): boolean {
    return this.getPreferencesSync().enabled;
  }

  /**
   * Get detection threshold
   */
  public getThreshold(): number {
    return this.getPreferencesSync().threshold;
  }

  /**
   * Check if auto-generation is enabled
   */
  public isAutoGenerationEnabled(): boolean {
    return this.getPreferencesSync().autoGeneration;
  }

  /**
   * Check if a specific event type is enabled
   */
  public isEventTypeEnabled(eventType: keyof MemoryPreferences['eventTypes']): boolean {
    return this.getPreferencesSync().eventTypes[eventType];
  }

  /**
   * Get enabled event types
   */
  public getEnabledEventTypes(): string[] {
    const prefs = this.getPreferencesSync();
    return Object.entries(prefs.eventTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type, _]) => type);
  }

  /**
   * Check if notifications are enabled
   */
  public areNotificationsEnabled(): boolean {
    return this.getPreferencesSync().notifications;
  }

  /**
   * Check if notification sound is enabled
   */
  public isNotificationSoundEnabled(): boolean {
    const prefs = this.getPreferencesSync();
    return prefs.notifications && prefs.notificationSound;
  }

  /**
   * Get template type
   */
  public getTemplateType(): string {
    return this.getPreferencesSync().templateType;
  }

  /**
   * Generate memory template based on preferences
   */
  public generateTemplate(data: {
    title: string;
    description: string;
    type: string;
    tags: string[];
    context?: any;
  }): any {
    const template = this.getTemplateType();

    switch (template) {
      case 'minimal':
        return {
          title: data.title,
          type: data.type,
          tags: data.tags.slice(0, 3),
        };
      
      case 'detailed':
        return {
          ...data,
          metadata: {
            timestamp: new Date().toISOString(),
            confidence: data.context?.confidence || 0,
            events: data.context?.events || [],
          },
        };
      
      case 'technical':
        return {
          title: data.title,
          description: data.description,
          type: data.type,
          tags: data.tags,
          technical: {
            files: data.context?.files || [],
            commands: data.context?.commands || [],
            errors: data.context?.errors || [],
          },
        };
      
      case 'learning':
        return {
          title: data.title,
          description: data.description,
          type: data.type,
          tags: [...data.tags, 'learning'],
          insights: {
            whatILearned: '',
            howToApply: '',
            relatedConcepts: [],
          },
        };
      
      default: // 'default'
        return {
          title: data.title,
          description: data.description,
          type: data.type,
          tags: data.tags,
        };
    }
  }

  /**
   * Show notification if enabled
   */
  public async showNotification(message: string, type: 'success' | 'info' | 'warning' = 'info'): Promise<void> {
    if (!this.areNotificationsEnabled()) {
      return;
    }

    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded z-50 transition-all transform translate-y-0`;
    
    switch (type) {
      case 'success':
        toast.className += ' bg-green-500/20 border border-green-500/50 text-green-400';
        break;
      case 'warning':
        toast.className += ' bg-yellow-500/20 border border-yellow-500/50 text-yellow-400';
        break;
      default:
        toast.className += ' bg-orange-500/20 border border-orange-500/50 text-orange-400';
    }
    
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">🧠 Memory System</span>
        <span class="text-sm">${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);

    // Play sound if enabled
    if (this.isNotificationSoundEnabled()) {
      try {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = type === 'success' ? 880 : 440; // A5 for success, A4 for others
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }

    // Remove after 4 seconds
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 4000);
  }

  /**
   * Apply preferences to detection result
   */
  public filterDetectionResult(result: any): any {
    const prefs = this.getPreferencesSync();
    
    if (!prefs.enabled) {
      return {
        isMemoryWorthy: false,
        confidence: 0,
        events: [],
        reason: 'Memory detection is disabled',
      };
    }

    // Filter out disabled event types
    const filteredEvents = (result.events || []).filter((event: any) => {
      const eventTypeMap: { [key: string]: keyof MemoryPreferences['eventTypes'] } = {
        'bug-fix': 'bugFix',
        'feature-completion': 'featureCompletion',
        'breakthrough': 'breakthrough',
        'learning': 'learning',
        'architecture-decision': 'architectureDecision',
        'solution-discovery': 'solutionDiscovery',
      };
      
      const mappedType = eventTypeMap[event.type];
      return mappedType ? prefs.eventTypes[mappedType] : false;
    });

    // Recalculate confidence based on enabled events
    const confidence = filteredEvents.length > 0
      ? filteredEvents.reduce((sum: number, e: any) => sum + e.confidence, 0) / filteredEvents.length
      : 0;

    // Apply threshold
    const isMemoryWorthy = confidence * 100 >= prefs.threshold;

    return {
      ...result,
      events: filteredEvents,
      confidence: confidence,
      isMemoryWorthy: isMemoryWorthy,
      autoGenerate: isMemoryWorthy && prefs.autoGeneration,
    };
  }

  /**
   * Reset preferences to defaults
   */
  public async resetToDefaults(): Promise<void> {
    await this.savePreferences(DEFAULT_PREFERENCES);
  }

  /**
   * Get storage type information
   */
  public getStorageInfo(): { type: string; location: string; migrated: boolean } {
    return {
      type: 'SQLite Database',
      location: 'data/db/memories.db',
      migrated: true
    };
  }
}

export const databaseMemoryPreferences = DatabaseMemoryPreferencesService.getInstance();