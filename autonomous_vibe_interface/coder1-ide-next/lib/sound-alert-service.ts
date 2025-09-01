/**
 * Sound Alert Service
 * 
 * Provides reusable sound generation functionality for Claude Code completion notifications
 * and other system alerts using the Web Audio API.
 */

export type SoundPreset = 'gentle' | 'chime' | 'bell' | 'chirp' | 'pop';

export interface SoundOptions {
  frequency?: number;
  duration?: number;
  volume?: number;
  type?: 'success' | 'error' | 'completion' | 'notification';
  preset?: SoundPreset;
}

export class SoundAlertService {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private selectedPreset: SoundPreset = 'gentle';

  constructor() {
    this.initializeAudioContext();
    this.loadUserPreference();
  }

  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      // Use vendor-prefixed versions for broader compatibility
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    } catch (error) {
      console.warn('🔇 SoundAlertService: Failed to initialize audio context:', error);
      this.audioContext = null;
    }
  }

  /**
   * Load user sound preferences from localStorage
   */
  private loadUserPreference(): void {
    try {
      const savedEnabled = localStorage.getItem('soundAlertsEnabled');
      if (savedEnabled !== null) {
        this.isEnabled = JSON.parse(savedEnabled);
      }
      
      const savedPreset = localStorage.getItem('soundAlertPreset');
      if (savedPreset && this.isValidPreset(savedPreset)) {
        this.selectedPreset = savedPreset as SoundPreset;
      }
    } catch (error) {
      console.warn('🔇 SoundAlertService: Failed to load user preferences:', error);
      this.isEnabled = true; // Default to enabled
      this.selectedPreset = 'gentle'; // Default preset
    }
  }

  /**
   * Save user sound preferences to localStorage
   */
  private saveUserPreferences(): void {
    try {
      localStorage.setItem('soundAlertsEnabled', JSON.stringify(this.isEnabled));
      localStorage.setItem('soundAlertPreset', this.selectedPreset);
    } catch (error) {
      console.warn('🔇 SoundAlertService: Failed to save user preferences:', error);
    }
  }

  /**
   * Enable or disable sound alerts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveUserPreferences();
  }

  /**
   * Set sound preset
   */
  setPreset(preset: SoundPreset): void {
    this.selectedPreset = preset;
    this.saveUserPreferences();
  }

  /**
   * Get current preset
   */
  getPreset(): SoundPreset {
    return this.selectedPreset;
  }

  /**
   * Get current enabled state
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Play a sound alert with specified options
   */
  async playAlert(options: SoundOptions = {}): Promise<void> {
    // Early return if sound is disabled or no audio context
    if (!this.isEnabled || !this.audioContext) {
      return;
    }

    try {
      // Resume audio context if it's suspended (required by many browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Use preset if specified, otherwise use individual options
      const preset = options.preset || this.selectedPreset;
      const presetConfig = this.getPresetConfig(preset);
      
      const {
        frequency = presetConfig.frequency,
        duration = presetConfig.duration,
        volume = presetConfig.volume,
      } = { ...presetConfig, ...options };

      // Create oscillator and gain nodes
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Connect the nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure the sound
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Create smooth fade in and out to prevent audio pops
      const currentTime = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

      // Start and stop the oscillator
      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration);

      console.log('🔊 SoundAlertService: Played alert sound');
    } catch (error) {
      console.warn('🔇 SoundAlertService: Failed to play sound:', error);
    }
  }

  /**
   * Get preset configuration
   */
  private getPresetConfig(preset: SoundPreset): { frequency: number; duration: number; volume: number } {
    switch (preset) {
      case 'gentle':
        return { frequency: 520, duration: 0.4, volume: 0.15 }; // Softer, lower tone
      case 'chime':
        return { frequency: 800, duration: 0.6, volume: 0.2 }; // Classic chime
      case 'bell':
        return { frequency: 1000, duration: 0.8, volume: 0.25 }; // Higher bell tone
      case 'chirp':
        return { frequency: 1200, duration: 0.3, volume: 0.2 }; // Quick chirp
      case 'pop':
        return { frequency: 400, duration: 0.2, volume: 0.3 }; // Quick pop sound
      default:
        return { frequency: 520, duration: 0.4, volume: 0.15 }; // Default to gentle
    }
  }

  /**
   * Play completion alert
   */
  async playCompletionAlert(): Promise<void> {
    return this.playAlert({
      type: 'completion',
      preset: this.selectedPreset
    });
  }

  /**
   * Test current selected sound
   */
  async testSound(): Promise<void> {
    // Temporarily enable for testing, even if disabled
    const wasEnabled = this.isEnabled;
    this.isEnabled = true;
    
    await this.playAlert({
      preset: this.selectedPreset
    });

    // Restore previous state
    this.isEnabled = wasEnabled;
  }

  /**
   * Sample a specific preset sound
   */
  async samplePreset(preset: SoundPreset): Promise<void> {
    // Temporarily enable for testing, even if disabled
    const wasEnabled = this.isEnabled;
    this.isEnabled = true;
    
    await this.playAlert({
      preset: preset
    });

    // Restore previous state
    this.isEnabled = wasEnabled;
  }

  /**
   * Validate if a string is a valid preset
   */
  private isValidPreset(preset: string): preset is SoundPreset {
    return ['gentle', 'chime', 'bell', 'chirp', 'pop'].includes(preset);
  }

  /**
   * Get available presets
   */
  getAvailablePresets(): Array<{key: SoundPreset, name: string, description: string}> {
    return [
      { key: 'gentle', name: 'Gentle', description: 'Soft, low tone - least intrusive' },
      { key: 'chime', name: 'Chime', description: 'Classic notification chime' },
      { key: 'bell', name: 'Bell', description: 'Higher bell tone' },
      { key: 'chirp', name: 'Chirp', description: 'Quick bird-like chirp' },
      { key: 'pop', name: 'Pop', description: 'Quick pop sound' }
    ];
  }
}

// Export singleton instance
export const soundAlertService = new SoundAlertService();