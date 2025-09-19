/**
 * Hooks Service - Interface to Claude Code Hooks Management API
 * Provides integration with existing /api/hooks/* endpoints
 */

import { authenticatedFetch } from '../../utils/api';

export interface HookTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedImpact: 'low' | 'medium' | 'high';
  config: any;
  preview?: {
    when: string;
    action: string;
    result: string;
  };
}

export interface HookRecommendation {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  hooks: string[];
}

export interface ProjectAnalysis {
  projectType: string;
  recommendations: HookRecommendation[];
  detectedTechnologies: string[];
  confidence: number;
}

export interface HooksStatus {
  project: {
    hasConfig: boolean;
    path: string;
    hookCount: number;
  };
  user: {
    hasConfig: boolean;
    path: string;
    hookCount: number;
  };
  totalTemplates: number;
  categories: number;
}

export interface HookConfiguration {
  hooks?: Record<string, any[]>;
  [key: string]: any;
}

class HooksService {
  private baseUrl = '/api/hooks';

  /**
   * Get current hooks status (active hooks count, etc.)
   */
  async getStatus(): Promise<HooksStatus> {
    const response = await authenticatedFetch(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch hooks status');
    }
    const data = await response.json();
    return data.status;
  }

  /**
   * Analyze current project and get hook recommendations
   */
  async analyzeProject(): Promise<ProjectAnalysis> {
    const response = await authenticatedFetch(`${this.baseUrl}/detect-project`);
    if (!response.ok) {
      throw new Error('Failed to analyze project');
    }
    const data = await response.json();
    return data.analysis;
  }

  /**
   * Get all available hook templates
   */
  async getTemplates(category?: string): Promise<Record<string, HookTemplate>> {
    const url = category 
      ? `${this.baseUrl}/templates?category=${encodeURIComponent(category)}`
      : `${this.baseUrl}/templates`;
    
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch hook templates');
    }
    const data = await response.json();
    return data.templates;
  }

  /**
   * Get specific hook template by ID
   */
  async getTemplate(id: string): Promise<HookTemplate> {
    const response = await authenticatedFetch(`${this.baseUrl}/templates/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${id}`);
    }
    const data = await response.json();
    return data.template;
  }

  /**
   * Get current hook configuration
   */
  async getCurrentConfig(scope: 'project' | 'user' = 'project'): Promise<HookConfiguration> {
    const response = await authenticatedFetch(`${this.baseUrl}/current-config?scope=${scope}`);
    if (!response.ok) {
      throw new Error('Failed to fetch current configuration');
    }
    const data = await response.json();
    return data.config || {};
  }

  /**
   * Generate configuration from selected hook templates
   */
  async generateConfig(
    selectedHooks: string[], 
    options: {
      scope?: 'project' | 'user';
      mergeWithExisting?: boolean;
      preview?: boolean;
    } = {}
  ): Promise<{ config: HookConfiguration; preview?: string; success: boolean }> {
    const response = await authenticatedFetch(`${this.baseUrl}/generate-config`, {
      method: 'POST',
      body: JSON.stringify({
        selectedHooks,
        scope: options.scope || 'project',
        mergeWithExisting: options.mergeWithExisting ?? true,
        preview: options.preview || false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate configuration');
    }

    return await response.json();
  }

  /**
   * Save hook configuration
   */
  async saveConfig(
    config: HookConfiguration,
    options: {
      scope?: 'project' | 'user';
      createBackup?: boolean;
    } = {}
  ): Promise<{ success: boolean; path: string; backup?: string }> {
    const response = await authenticatedFetch(`${this.baseUrl}/save-config`, {
      method: 'POST',
      body: JSON.stringify({
        config,
        scope: options.scope || 'project',
        createBackup: options.createBackup ?? true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save configuration');
    }

    return await response.json();
  }

  /**
   * Install a recommendation pack (group of related hooks)
   */
  async installPack(
    packId: string,
    scope: 'project' | 'user' = 'project'
  ): Promise<{ success: boolean; pack: any; installedHooks: string[]; config: HookConfiguration }> {
    const response = await authenticatedFetch(`${this.baseUrl}/install-pack`, {
      method: 'POST',
      body: JSON.stringify({ packId, scope })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to install pack');
    }

    return await response.json();
  }

  /**
   * Remove specific hooks from configuration
   */
  async removeHooks(
    hookIds: string[],
    scope: 'project' | 'user' = 'project'
  ): Promise<{ success: boolean; removedHooks: string[]; config: HookConfiguration }> {
    const response = await authenticatedFetch(`${this.baseUrl}/remove`, {
      method: 'DELETE',
      body: JSON.stringify({ hookIds, scope })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove hooks');
    }

    return await response.json();
  }

  /**
   * Get available categories for filtering
   */
  async getCategories(): Promise<Record<string, { name: string; description: string; icon: string }>> {
    const response = await authenticatedFetch(`${this.baseUrl}/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    return data.categories;
  }

  /**
   * Get recommendation packs
   */
  async getRecommendationPacks(): Promise<Record<string, any>> {
    const response = await authenticatedFetch(`${this.baseUrl}/packs`);
    if (!response.ok) {
      throw new Error('Failed to fetch recommendation packs');
    }
    const data = await response.json();
    return data.packs;
  }

  /**
   * Get hooks that are relevant to current file context
   * @param fileExtension - Current file extension (e.g., 'ts', 'js', 'jsx')
   * @param projectType - Detected project type
   */
  async getContextualRecommendations(
    fileExtension?: string,
    projectType?: string
  ): Promise<HookRecommendation[]> {
    try {
      const analysis = await this.analyzeProject();
      
      // Filter recommendations based on context
      let recommendations = analysis.recommendations || [];
      
      if (fileExtension) {
        // Filter by file type relevance
        recommendations = recommendations.filter(rec => {
          const relevantExtensions: Record<string, string[]> = {
            'js': ['prettier-format', 'eslint-fix', 'test-runner'],
            'jsx': ['prettier-format', 'eslint-fix', 'test-runner'],
            'ts': ['prettier-format', 'eslint-fix', 'typescript-check', 'test-runner'],
            'tsx': ['prettier-format', 'eslint-fix', 'typescript-check', 'test-runner'],
            'json': ['prettier-format'],
            'css': ['prettier-format'],
            'scss': ['prettier-format'],
            'md': ['prettier-format'],
            'dockerfile': ['docker-build'],
            'docker-compose.yml': ['docker-build']
          };
          
          const relevantHooks = relevantExtensions[fileExtension.toLowerCase()] || [];
          return rec.hooks.some(hook => relevantHooks.includes(hook));
        });
      }
      
      return recommendations.slice(0, 3); // Top 3 contextual recommendations
    } catch (error) {
      console.warn('Failed to get contextual recommendations:', error);
      return [];
    }
  }
}

export const hooksService = new HooksService();
export default hooksService;