/**
 * Memory Preferences Service
 * Manages user preferences for the memory detection system
 * Part of Phase II: User Control & Persistence
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
  notifications: true,
  notificationSound: false,
  templateType: 'default',
};

class MemoryPreferencesService {
  private static instance: MemoryPreferencesService;
  private preferences: MemoryPreferences;
  private storageKey = 'coder1-memory-preferences';

  private constructor() {
    this.preferences = this.loadPreferences();
  }

  public static getInstance(): MemoryPreferencesService {
    if (!MemoryPreferencesService.instance) {
      MemoryPreferencesService.instance = new MemoryPreferencesService();
    }
    return MemoryPreferencesService.instance;
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): MemoryPreferences {
    if (typeof window === 'undefined') {
      return DEFAULT_PREFERENCES;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load memory preferences:', error);
    }

    return DEFAULT_PREFERENCES;
  }

  /**
   * Save preferences to localStorage
   */
  public savePreferences(preferences: Partial<MemoryPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
        
        // Emit event for other components to react
        window.dispatchEvent(new CustomEvent('memoryPreferencesChanged', {
          detail: this.preferences
        }));
      } catch (error) {
        console.error('Failed to save memory preferences:', error);
      }
    }
  }

  /**
   * Get current preferences
   */
  public getPreferences(): MemoryPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if memory detection is enabled
   */
  public isEnabled(): boolean {
    return this.preferences.enabled;
  }

  /**
   * Get detection threshold
   */
  public getThreshold(): number {
    return this.preferences.threshold;
  }

  /**
   * Check if auto-generation is enabled
   */
  public isAutoGenerationEnabled(): boolean {
    return this.preferences.autoGeneration;
  }

  /**
   * Check if a specific event type is enabled
   */
  public isEventTypeEnabled(eventType: keyof MemoryPreferences['eventTypes']): boolean {
    return this.preferences.eventTypes[eventType];
  }

  /**
   * Get enabled event types
   */
  public getEnabledEventTypes(): string[] {
    return Object.entries(this.preferences.eventTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type, _]) => type);
  }

  /**
   * Check if notifications are enabled
   */
  public areNotificationsEnabled(): boolean {
    return this.preferences.notifications;
  }

  /**
   * Check if notification sound is enabled
   */
  public isNotificationSoundEnabled(): boolean {
    return this.preferences.notifications && this.preferences.notificationSound;
  }

  /**
   * Get template type
   */
  public getTemplateType(): string {
    return this.preferences.templateType;
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
    const template = this.preferences.templateType;

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
    if (!this.preferences.notifications) {
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
    if (this.preferences.notificationSound) {
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
    if (!this.preferences.enabled) {
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
      return mappedType ? this.preferences.eventTypes[mappedType] : false;
    });

    // Recalculate confidence based on enabled events
    const confidence = filteredEvents.length > 0
      ? filteredEvents.reduce((sum: number, e: any) => sum + e.confidence, 0) / filteredEvents.length
      : 0;

    // Apply threshold
    const isMemoryWorthy = confidence * 100 >= this.preferences.threshold;

    return {
      ...result,
      events: filteredEvents,
      confidence: confidence,
      isMemoryWorthy: isMemoryWorthy,
      autoGenerate: isMemoryWorthy && this.preferences.autoGeneration,
    };
  }

  /**
   * Reset preferences to defaults
   */
  public resetToDefaults(): void {
    this.savePreferences(DEFAULT_PREFERENCES);
  }
}

export const memoryPreferences = MemoryPreferencesService.getInstance();