/**
 * Hooks Management Service
 * Handles automation hooks storage, execution, and management
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@/lib/logger';

export interface Hook {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  prompt: string;
  enabled: boolean;
  frequency?: number;
  lastTriggered?: string;
  tokensSaved?: number;
  timeSaved?: number;
  category?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HookStats {
  totalHooks: number;
  activeHooks: number;
  totalExecutions: number;
  totalTokensSaved: number;
  totalTimeSaved: number;
  weeklyTokenSavings: number;
  topPerformingHooks: Hook[];
  recentExecutions: HookExecution[];
}

export interface HookExecution {
  hookId: string;
  hookName: string;
  timestamp: string;
  success: boolean;
  tokensSaved: number;
  timeSaved: number;
  error?: string;
}

export interface AIRecommendation {
  name: string;
  description: string;
  suggestedPrompt: string;
  estimatedSavings: number;
  confidence: number;
  pattern: string;
  frequency: number;
  lastSeen?: string;
}

class HooksService extends EventEmitter {
  private static instance: HooksService;
  private hooks: Map<string, Hook> = new Map();
  private executions: HookExecution[] = [];
  private dataDir: string;
  private readonly maxExecutions = 1000;

  private constructor() {
    super();
    this.dataDir = path.join(process.cwd(), 'data', 'hooks');
    this.initialize();
  }

  static getInstance(): HooksService {
    if (!HooksService.instance) {
      HooksService.instance = new HooksService();
    }
    return HooksService.instance;
  }

  private async initialize() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load existing hooks
      await this.loadHooks();
      
      // Load execution history
      await this.loadExecutions();
      
      logger.info('🪝 Hooks service initialized');
    } catch (error) {
      logger.error('Failed to initialize hooks service:', error);
    }
  }

  private async loadHooks() {
    try {
      const hooksFile = path.join(this.dataDir, 'hooks.json');
      const data = await fs.readFile(hooksFile, 'utf-8');
      const hooksArray = JSON.parse(data) as Hook[];
      
      this.hooks.clear();
      hooksArray.forEach(hook => {
        this.hooks.set(hook.id, hook);
      });
      
      logger.info(`Loaded ${this.hooks.size} hooks`);
    } catch (error) {
      // File doesn't exist yet, start with default hooks
      await this.initializeDefaultHooks();
    }
  }

  private async initializeDefaultHooks() {
    const defaultHooks: Hook[] = [
      {
        id: 'fix-typescript-errors',
        name: 'Fix TypeScript Errors',
        description: 'Automatically fix TypeScript compilation errors',
        trigger: 'on-typescript-error',
        prompt: 'Fix all TypeScript compilation errors in this file and explain the issues found.',
        enabled: true,
        frequency: 0,
        tokensSaved: 0,
        timeSaved: 0,
        category: 'error-fixing',
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'format-code',
        name: 'Format Code',
        description: 'Format code according to project standards',
        trigger: 'on-save',
        prompt: 'Format this code according to best practices and add helpful comments.',
        enabled: false,
        frequency: 0,
        tokensSaved: 0,
        timeSaved: 0,
        category: 'formatting',
        confidence: 0.85,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'generate-tests',
        name: 'Generate Tests',
        description: 'Generate comprehensive unit tests for functions',
        trigger: 'on-function-complete',
        prompt: 'Generate comprehensive unit tests for this function with edge cases.',
        enabled: false,
        frequency: 0,
        tokensSaved: 0,
        timeSaved: 0,
        category: 'testing',
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultHooks.forEach(hook => {
      this.hooks.set(hook.id, hook);
    });

    await this.saveHooks();
  }

  private async saveHooks() {
    try {
      const hooksFile = path.join(this.dataDir, 'hooks.json');
      const hooksArray = Array.from(this.hooks.values());
      await fs.writeFile(hooksFile, JSON.stringify(hooksArray, null, 2));
      
      this.emit('hooks:saved', hooksArray);
    } catch (error) {
      logger.error('Failed to save hooks:', error);
    }
  }

  private async loadExecutions() {
    try {
      const executionsFile = path.join(this.dataDir, 'executions.json');
      const data = await fs.readFile(executionsFile, 'utf-8');
      this.executions = JSON.parse(data) as HookExecution[];
      
      // Keep only recent executions
      if (this.executions.length > this.maxExecutions) {
        this.executions = this.executions.slice(-this.maxExecutions);
      }
    } catch (error) {
      // File doesn't exist yet
      this.executions = [];
    }
  }

  private async saveExecutions() {
    try {
      const executionsFile = path.join(this.dataDir, 'executions.json');
      await fs.writeFile(executionsFile, JSON.stringify(this.executions, null, 2));
    } catch (error) {
      logger.error('Failed to save executions:', error);
    }
  }

  /**
   * Get all hooks
   */
  async getAllHooks(): Promise<Hook[]> {
    return Array.from(this.hooks.values());
  }

  /**
   * Get a specific hook
   */
  async getHook(id: string): Promise<Hook | null> {
    return this.hooks.get(id) || null;
  }

  /**
   * Create a new hook
   */
  async createHook(hookData: Partial<Hook>): Promise<Hook> {
    const id = hookData.id || this.generateHookId(hookData.name || 'hook');
    
    const hook: Hook = {
      id,
      name: hookData.name || 'New Hook',
      description: hookData.description,
      trigger: hookData.trigger || 'manual',
      prompt: hookData.prompt || '',
      enabled: hookData.enabled !== false,
      frequency: 0,
      tokensSaved: 0,
      timeSaved: 0,
      category: hookData.category || 'custom',
      confidence: hookData.confidence || 0.7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...hookData
    };

    this.hooks.set(id, hook);
    await this.saveHooks();
    
    this.emit('hook:created', hook);
    logger.info(`Created hook: ${hook.name} (${id})`);
    
    return hook;
  }

  /**
   * Update an existing hook
   */
  async updateHook(id: string, updates: Partial<Hook>): Promise<Hook | null> {
    const hook = this.hooks.get(id);
    if (!hook) return null;

    const updatedHook: Hook = {
      ...hook,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    this.hooks.set(id, updatedHook);
    await this.saveHooks();
    
    this.emit('hook:updated', updatedHook);
    logger.info(`Updated hook: ${updatedHook.name} (${id})`);
    
    return updatedHook;
  }

  /**
   * Delete a hook
   */
  async deleteHook(id: string): Promise<boolean> {
    const hook = this.hooks.get(id);
    if (!hook) return false;

    this.hooks.delete(id);
    await this.saveHooks();
    
    this.emit('hook:deleted', { id, name: hook.name });
    logger.info(`Deleted hook: ${hook.name} (${id})`);
    
    return true;
  }

  /**
   * Toggle hook enabled state
   */
  async toggleHook(id: string): Promise<Hook | null> {
    const hook = this.hooks.get(id);
    if (!hook) return null;

    hook.enabled = !hook.enabled;
    hook.updatedAt = new Date().toISOString();
    
    await this.saveHooks();
    
    this.emit('hook:toggled', hook);
    logger.info(`Toggled hook: ${hook.name} is now ${hook.enabled ? 'enabled' : 'disabled'}`);
    
    return hook;
  }

  /**
   * Execute a hook
   */
  async executeHook(id: string): Promise<HookExecution> {
    const hook = this.hooks.get(id);
    if (!hook) {
      throw new Error(`Hook not found: ${id}`);
    }

    if (!hook.enabled) {
      throw new Error(`Hook is disabled: ${hook.name}`);
    }

    const startTime = Date.now();
    
    try {
      // TODO: Integrate with Claude API for actual execution
      // For now, simulate execution
      const execution: HookExecution = {
        hookId: id,
        hookName: hook.name,
        timestamp: new Date().toISOString(),
        success: true,
        tokensSaved: Math.floor(Math.random() * 500) + 100, // Simulated
        timeSaved: Math.floor(Math.random() * 300) + 30 // Seconds
      };

      // Update hook statistics
      hook.frequency = (hook.frequency || 0) + 1;
      hook.tokensSaved = (hook.tokensSaved || 0) + execution.tokensSaved;
      hook.timeSaved = (hook.timeSaved || 0) + execution.timeSaved;
      hook.lastTriggered = execution.timestamp;

      await this.saveHooks();

      // Record execution
      this.executions.push(execution);
      if (this.executions.length > this.maxExecutions) {
        this.executions.shift();
      }
      await this.saveExecutions();

      this.emit('hook:executed', execution);
      logger.info(`Executed hook: ${hook.name}, saved ${execution.tokensSaved} tokens`);

      return execution;
    } catch (error: any) {
      const execution: HookExecution = {
        hookId: id,
        hookName: hook.name,
        timestamp: new Date().toISOString(),
        success: false,
        tokensSaved: 0,
        timeSaved: 0,
        error: error.message
      };

      this.executions.push(execution);
      await this.saveExecutions();

      this.emit('hook:error', execution);
      logger.error(`Failed to execute hook ${hook.name}:`, error);

      throw error;
    }
  }

  /**
   * Get hooks statistics
   */
  async getStats(): Promise<HookStats> {
    const hooks = Array.from(this.hooks.values());
    const activeHooks = hooks.filter(h => h.enabled);
    
    // Calculate totals
    const totalTokensSaved = hooks.reduce((sum, h) => sum + (h.tokensSaved || 0), 0);
    const totalTimeSaved = hooks.reduce((sum, h) => sum + (h.timeSaved || 0), 0);
    
    // Get weekly savings (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyExecutions = this.executions.filter(e => 
      new Date(e.timestamp) > weekAgo
    );
    const weeklyTokenSavings = weeklyExecutions.reduce((sum, e) => sum + e.tokensSaved, 0);
    
    // Get top performing hooks
    const topPerformingHooks = hooks
      .filter(h => (h.tokensSaved || 0) > 0)
      .sort((a, b) => (b.tokensSaved || 0) - (a.tokensSaved || 0))
      .slice(0, 5);
    
    // Get recent executions
    const recentExecutions = this.executions
      .slice(-10)
      .reverse();

    return {
      totalHooks: hooks.length,
      activeHooks: activeHooks.length,
      totalExecutions: this.executions.length,
      totalTokensSaved,
      totalTimeSaved,
      weeklyTokenSavings,
      topPerformingHooks,
      recentExecutions
    };
  }

  /**
   * Get AI recommendations based on usage patterns
   */
  async getAIRecommendations(): Promise<AIRecommendation[]> {
    // TODO: Integrate with pattern analysis service
    // For now, return mock recommendations
    return [
      {
        name: 'Auto-Fix Import Errors',
        description: 'You frequently fix import path errors manually',
        suggestedPrompt: 'Fix all import errors and update paths to match the project structure.',
        estimatedSavings: 600,
        confidence: 0.92,
        pattern: 'import-errors',
        frequency: 12,
        lastSeen: '2 hours ago'
      },
      {
        name: 'Add JSDoc Comments',
        description: 'You often add documentation to functions',
        suggestedPrompt: 'Add comprehensive JSDoc comments to all functions in this file.',
        estimatedSavings: 450,
        confidence: 0.85,
        pattern: 'documentation',
        frequency: 8,
        lastSeen: '1 day ago'
      },
      {
        name: 'Convert to TypeScript',
        description: 'You\'ve been converting JavaScript files to TypeScript',
        suggestedPrompt: 'Convert this JavaScript file to TypeScript with proper type definitions.',
        estimatedSavings: 800,
        confidence: 0.78,
        pattern: 'typescript-conversion',
        frequency: 5,
        lastSeen: '3 days ago'
      }
    ];
  }

  /**
   * Generate a unique hook ID
   */
  private generateHookId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let id = base;
    let counter = 1;
    
    while (this.hooks.has(id)) {
      id = `${base}-${counter}`;
      counter++;
    }
    
    return id;
  }

  /**
   * Calculate health score for hooks system
   */
  async getHealthScore(): Promise<number> {
    const stats = await this.getStats();
    
    // Score based on multiple factors
    let score = 50; // Base score
    
    // Active hooks (up to 20 points)
    score += Math.min(stats.activeHooks * 4, 20);
    
    // Recent executions (up to 15 points)
    const recentCount = this.executions.filter(e => {
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 24);
      return new Date(e.timestamp) > hourAgo;
    }).length;
    score += Math.min(recentCount * 3, 15);
    
    // Token savings (up to 15 points)
    if (stats.weeklyTokenSavings > 10000) score += 15;
    else if (stats.weeklyTokenSavings > 5000) score += 10;
    else if (stats.weeklyTokenSavings > 1000) score += 5;
    
    return Math.min(score, 100);
  }
}

// Export singleton instance
export const hooksService = HooksService.getInstance();