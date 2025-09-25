/**
 * Model Info Component
 * 
 * Displays current Claude model with enhanced visual indicators
 * Based on claude-code-statusline model_info.sh
 */

'use client';

// Mock logger for client-side usage
const logger = {
  debug: (...args: any[]) => console.debug('[ModelInfo]', ...args),
  info: (...args: any[]) => console.info('[ModelInfo]', ...args),
  warn: (...args: any[]) => console.warn('[ModelInfo]', ...args),
  error: (...args: any[]) => console.error('[ModelInfo]', ...args),
};

export interface ModelInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  version?: string;
  capabilities?: string[];
}

const MODEL_DATABASE: Record<string, ModelInfo> = {
  'claude-opus-4.1': {
    id: 'claude-opus-4.1',
    name: 'Opus 4.1',
    icon: '👑',
    color: '#8B5CF6', // purple-500
    capabilities: ['reasoning', 'coding', 'analysis', 'creative']
  },
  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    name: 'Sonnet 4',
    icon: '🎭',
    color: '#3B82F6', // blue-500
    capabilities: ['balanced', 'coding', 'analysis']
  },
  'claude-sonnet-3.7': {
    id: 'claude-sonnet-3.7',
    name: 'Sonnet 3.7',
    icon: '🎼',
    color: '#06B6D4', // cyan-500
    capabilities: ['hybrid', 'reasoning']
  },
  'claude-3.5-haiku': {
    id: 'claude-3.5-haiku',
    name: 'Haiku 3.5',
    icon: '🌸',
    color: '#EC4899', // pink-500
    capabilities: ['fast', 'economical']
  },
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    name: 'Sonnet 3.5',
    icon: '🎵',
    color: '#10B981', // emerald-500
    capabilities: ['balanced', 'coding']
  }
};

export class ModelInfoComponent {
  private cachedModel: ModelInfo | null = null;
  private lastUpdate = 0;
  private cacheTimeout = 30000; // 30 seconds

  constructor() {
    logger.debug('[ModelInfo] Component initialized');
  }

  /**
   * Detect current Claude model from various sources
   */
  public async detectCurrentModel(): Promise<ModelInfo> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.cachedModel && (now - this.lastUpdate) < this.cacheTimeout) {
      return this.cachedModel;
    }

    try {
      let detectedModel: ModelInfo | null = null;

      // Method 1: Check localStorage for preferred model (browser only)
      if (typeof window !== 'undefined') {
        const preferredModel = localStorage.getItem('preferredAIModel');
        if (preferredModel && MODEL_DATABASE[preferredModel]) {
          detectedModel = MODEL_DATABASE[preferredModel];
          logger.debug('[ModelInfo] Detected from localStorage:', preferredModel);
        }
      }

      // Method 2: Check IDE store if available (browser only)
      if (!detectedModel && typeof window !== 'undefined') {
        try {
          // Try to access useIDEStore data from localStorage
          const ideState = localStorage.getItem('ide-store');
          if (ideState) {
            const parsed = JSON.parse(ideState);
            const currentModel = parsed?.aiState?.currentModel;
            if (currentModel && MODEL_DATABASE[currentModel]) {
              detectedModel = MODEL_DATABASE[currentModel];
              logger.debug('[ModelInfo] Detected from IDE store:', currentModel);
            }
          }
        } catch (error) {
          // Silent fail - IDE store might not be available
        }
      }

      // Method 3: Check environment or API
      if (!detectedModel) {
        detectedModel = await this.detectFromAPI();
      }

      // Method 4: Fallback to default
      if (!detectedModel) {
        detectedModel = MODEL_DATABASE['claude-sonnet-4'];
        logger.debug('[ModelInfo] Using fallback model');
      }

      // Cache the result
      this.cachedModel = detectedModel;
      this.lastUpdate = now;

      return detectedModel;

    } catch (error) {
      logger.error('[ModelInfo] Detection error:', error);
      
      // Return cached model or fallback
      return this.cachedModel || MODEL_DATABASE['claude-sonnet-4'];
    }
  }

  /**
   * Try to detect model from API or environment
   */
  private async detectFromAPI(): Promise<ModelInfo | null> {
    try {
      // Check if we can detect from Claude CLI environment
      const claudeVersion = await this.getClaudeVersion();
      if (claudeVersion) {
        // Parse version to determine model
        const modelId = this.parseVersionToModel(claudeVersion);
        if (modelId && MODEL_DATABASE[modelId]) {
          logger.debug('[ModelInfo] Detected from Claude version:', modelId);
          return MODEL_DATABASE[modelId];
        }
      }

      // Check API endpoint if available
      const response = await fetch('/api/claude/model-info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.model && MODEL_DATABASE[data.model]) {
          logger.debug('[ModelInfo] Detected from API:', data.model);
          return MODEL_DATABASE[data.model];
        }
      }

    } catch (error) {
      // Silent fail - API might not be available
      logger.debug('[ModelInfo] API detection failed:', error);
    }

    return null;
  }

  /**
   * Get Claude CLI version if available
   */
  private async getClaudeVersion(): Promise<string | null> {
    // This would typically run a CLI command, but we'll simulate for now
    // In a real implementation, this might use Node.js child_process
    return null;
  }

  /**
   * Parse Claude version string to determine model
   */
  private parseVersionToModel(version: string): string | null {
    // Example version parsing logic
    if (version.includes('opus-4')) return 'claude-opus-4.1';
    if (version.includes('sonnet-4')) return 'claude-sonnet-4';
    if (version.includes('sonnet-3.7')) return 'claude-sonnet-3.7';
    if (version.includes('haiku-3.5')) return 'claude-3.5-haiku';
    if (version.includes('sonnet-3.5')) return 'claude-3.5-sonnet';
    
    return null;
  }

  /**
   * Format model info for display
   */
  public formatDisplay(model: ModelInfo, format: string = '{icon} {name}'): string {
    return format
      .replace('{icon}', model.icon)
      .replace('{name}', model.name)
      .replace('{id}', model.id)
      .replace('{color}', model.color)
      .replace('{capabilities}', model.capabilities?.join(', ') || '');
  }

  /**
   * Get all available models
   */
  public getAvailableModels(): ModelInfo[] {
    return Object.values(MODEL_DATABASE);
  }

  /**
   * Get model by ID
   */
  public getModel(id: string): ModelInfo | null {
    return MODEL_DATABASE[id] || null;
  }

  /**
   * Clear cache to force refresh
   */
  public clearCache(): void {
    this.cachedModel = null;
    this.lastUpdate = 0;
  }
}

// Export singleton instance
export const modelInfoComponent = new ModelInfoComponent();