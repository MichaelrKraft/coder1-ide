/**
 * Client-Safe Memory Preferences Service
 * Uses API calls instead of direct database access for browser compatibility
 * Phase II: SQLite Persistence - Client Layer
 */

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

class ClientMemoryPreferencesService {
  private static instance: ClientMemoryPreferencesService;
  private preferences: MemoryPreferences | null = null;
  private isInitialized = false;

  private constructor() {
    this.initializePreferences();
  }

  public static getInstance(): ClientMemoryPreferencesService {
    if (!ClientMemoryPreferencesService.instance) {
      ClientMemoryPreferencesService.instance = new ClientMemoryPreferencesService();
    }
    return ClientMemoryPreferencesService.instance;
  }

  /**
   * Initialize preferences from API or localStorage fallback
   */
  private async initializePreferences(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // First try migration from localStorage if needed
      await this.migrateFromLocalStorage();
      
      // Load from API
      this.preferences = await this.loadPreferencesFromAPI();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load preferences from API:', error);
      // Fallback to localStorage for offline usage
      this.preferences = this.loadPreferencesFromLocalStorage();
      this.isInitialized = true;
    }
  }

  /**
   * Load preferences from API
   */
  private async loadPreferencesFromAPI(): Promise<MemoryPreferences> {
    // 🔧 FIX (Feb 1, 2025): Only make API calls in browser environment
    // SSR (server-side) cannot use relative URLs, causes "Failed to parse URL" errors
    if (typeof window === 'undefined') {
      console.log('📝 Server-side rendering detected, using localStorage defaults');
      return this.loadPreferencesFromLocalStorage();
    }

    try {
      const response = await fetch('/api/preferences/memory');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { ...DEFAULT_PREFERENCES, ...data };
    } catch (error) {
      console.error('API load failed, using localStorage fallback:', error);
      return this.loadPreferencesFromLocalStorage();
    }
  }

  /**
   * Save preferences to API
   */
  private async savePreferencesToAPI(preferences: MemoryPreferences): Promise<void> {
    try {
      const response = await fetch('/api/preferences/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        throw new Error(`API save failed: ${response.status}`);
      }
      
      console.log('✅ Memory preferences saved to SQLite database via API');
    } catch (error) {
      console.error('API save failed, falling back to localStorage:', error);
      // Fallback to localStorage
      this.savePreferencesToLocalStorage(preferences);
    }
  }

  /**
   * Load preferences from localStorage (fallback)
   */
  private loadPreferencesFromLocalStorage(): MemoryPreferences {
    if (typeof window === 'undefined') {
      return DEFAULT_PREFERENCES;
    }

    try {
      const stored = localStorage.getItem('coder1-memory-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load memory preferences from localStorage:', error);
    }

    return DEFAULT_PREFERENCES;
  }

  /**
   * Save preferences to localStorage (fallback)
   */
  private savePreferencesToLocalStorage(preferences: MemoryPreferences): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('coder1-memory-preferences', JSON.stringify(preferences));
        console.log('✅ Memory preferences saved to localStorage (fallback)');
      } catch (error) {
        console.error('Failed to save preferences to localStorage:', error);
      }
    }
  }

  /**
   * Migrate from localStorage to API/database
   */
  public async migrateFromLocalStorage(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem('coder1-memory-preferences');
      if (!stored) return false;

      const localStoragePrefs = JSON.parse(stored);
      const migratedPrefs = { ...DEFAULT_PREFERENCES, ...localStoragePrefs };
      
      // Save to API/database
      await this.savePreferencesToAPI(migratedPrefs);
      
      // Remove from localStorage after successful migration
      localStorage.removeItem('coder1-memory-preferences');
      
      console.log('✅ Successfully migrated preferences from localStorage to SQLite via API');
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
    if (!this.isInitialized) {
      await this.initializePreferences();
    }

    this.preferences = { ...this.preferences!, ...preferences };
    await this.savePreferencesToAPI(this.preferences);
    
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
    if (!this.isInitialized) {
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
    
    // Save to API asynchronously
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
      type: 'SQLite Database (via API)',
      location: 'Server-side SQLite with API access',
      migrated: true
    };
  }
}

export const clientMemoryPreferences = ClientMemoryPreferencesService.getInstance();