/**
 * Template Loader Service
 * Loads and manages Claude Code config templates
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  ConfigTemplate,
  TemplatesData,
  TemplateLoadResult,
  FilterOptions,
  SortOptions,
  ConfigType
} from './types';

// Use filesystem paths for server-side loading (not fetch with relative URLs)
const TEMPLATES_BASE_PATH = join(process.cwd(), 'public', 'claude-config-templates');
const TEMPLATES_JSON_PATH = join(TEMPLATES_BASE_PATH, 'templates.json');

export class TemplateLoader {
  private static instance: TemplateLoader;
  private templatesData: TemplatesData | null = null;
  private templatesCache: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): TemplateLoader {
    if (!TemplateLoader.instance) {
      TemplateLoader.instance = new TemplateLoader();
    }
    return TemplateLoader.instance;
  }

  /**
   * Load templates.json metadata
   */
  public async loadTemplatesData(): Promise<TemplatesData> {
    if (this.templatesData) {
      return this.templatesData;
    }

    try {
      if (!existsSync(TEMPLATES_JSON_PATH)) {
        throw new Error(`Templates file not found: ${TEMPLATES_JSON_PATH}`);
      }

      const fileContent = readFileSync(TEMPLATES_JSON_PATH, 'utf-8');
      this.templatesData = JSON.parse(fileContent);
      return this.templatesData;
    } catch (error) {
      console.error('Error loading templates data:', error);
      throw new Error('Failed to load templates. Please try again.');
    }
  }

  /**
   * Get all available templates
   */
  public async getTemplates(): Promise<ConfigTemplate[]> {
    const data = await this.loadTemplatesData();
    return data.templates;
  }

  /**
   * Get template by ID
   */
  public async getTemplateById(id: string): Promise<ConfigTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === id) || null;
  }

  /**
   * Get templates by type
   */
  public async getTemplatesByType(type: ConfigType): Promise<ConfigTemplate[]> {
    const templates = await this.getTemplates();
    return templates.filter(t => t.type === type);
  }

  /**
   * Get templates by category
   */
  public async getTemplatesByCategory(category: string): Promise<ConfigTemplate[]> {
    const templates = await this.getTemplates();
    return templates.filter(t => t.category === category);
  }

  /**
   * Load template content from file
   */
  public async loadTemplateContent(template: ConfigTemplate): Promise<string> {
    // Check cache first
    if (this.templatesCache.has(template.id)) {
      return this.templatesCache.get(template.id)!;
    }

    try {
      const contentPath = join(TEMPLATES_BASE_PATH, template.file);

      if (!existsSync(contentPath)) {
        throw new Error(`Template file not found: ${contentPath}`);
      }

      const content = readFileSync(contentPath, 'utf-8');

      // Cache the content
      this.templatesCache.set(template.id, content);

      return content;
    } catch (error) {
      console.error(`Error loading template content for ${template.id}:`, error);
      throw new Error(`Failed to load template content for ${template.name}`);
    }
  }

  /**
   * Load template with content
   */
  public async loadTemplate(templateId: string): Promise<TemplateLoadResult> {
    const template = await this.getTemplateById(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const content = await this.loadTemplateContent(template);

    return {
      template,
      content
    };
  }

  /**
   * Search templates by query
   */
  public async searchTemplates(query: string): Promise<ConfigTemplate[]> {
    if (!query.trim()) {
      return this.getTemplates();
    }

    const templates = await this.getTemplates();
    const lowerQuery = query.toLowerCase();

    return templates.filter(template => {
      const matchName = template.name.toLowerCase().includes(lowerQuery);
      const matchDescription = template.description.toLowerCase().includes(lowerQuery);
      const matchTags = template.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      const matchCapabilities = template.capabilities.some(cap => 
        cap.toLowerCase().includes(lowerQuery)
      );

      return matchName || matchDescription || matchTags || matchCapabilities;
    });
  }

  /**
   * Filter templates with advanced options
   */
  public async filterTemplates(options: FilterOptions): Promise<ConfigTemplate[]> {
    let templates = await this.getTemplates();

    if (options.type && options.type.length > 0) {
      templates = templates.filter(t => options.type!.includes(t.type));
    }

    if (options.category && options.category.length > 0) {
      templates = templates.filter(t => 
        options.category!.some(cat => cat === t.category)
      );
    }

    if (options.tags && options.tags.length > 0) {
      templates = templates.filter(t =>
        options.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (options.search) {
      const lowerSearch = options.search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(lowerSearch) ||
        t.description.toLowerCase().includes(lowerSearch) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
      );
    }

    return templates;
  }

  /**
   * Sort templates
   */
  public sortTemplates(
    templates: ConfigTemplate[], 
    options: SortOptions
  ): ConfigTemplate[] {
    const sorted = [...templates];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (options.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'cost':
          comparison = a.estimatedCost - b.estimatedCost;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return options.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Get all categories
   */
  public async getCategories() {
    const data = await this.loadTemplatesData();
    return data.categories;
  }

  /**
   * Get templates metadata
   */
  public async getMetadata() {
    const data = await this.loadTemplatesData();
    return data.metadata;
  }

  /**
   * Get templates count by type
   */
  public async getTemplatesCountByType(): Promise<Record<ConfigType, number>> {
    const templates = await this.getTemplates();
    
    const counts: Record<ConfigType, number> = {
      agent: 0,
      hook: 0,
      skill: 0,
      command: 0
    };

    templates.forEach(template => {
      counts[template.type]++;
    });

    return counts;
  }

  /**
   * Get total estimated cost for all templates
   */
  public async getTotalEstimatedCost(): Promise<number> {
    const templates = await this.getTemplates();
    return templates.reduce((sum, template) => sum + template.estimatedCost, 0);
  }

  /**
   * Prefetch all template contents (for performance)
   */
  public async prefetchAllTemplates(): Promise<void> {
    const templates = await this.getTemplates();
    
    const loadPromises = templates.map(template =>
      this.loadTemplateContent(template).catch(err => {
        console.warn(`Failed to prefetch template ${template.id}:`, err);
        return null;
      })
    );

    await Promise.all(loadPromises);
    console.log(`Prefetched ${templates.length} templates`);
  }

  /**
   * Clear templates cache
   */
  public clearCache(): void {
    this.templatesCache.clear();
    this.templatesData = null;
  }

  /**
   * Get recommended templates based on user preferences
   */
  public async getRecommendedTemplates(
    preferences?: {
      preferredTypes?: ConfigType[];
      recentlyUsedTags?: string[];
      skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<ConfigTemplate[]> {
    const templates = await this.getTemplates();

    if (!preferences) {
      return templates.slice(0, 6);
    }

    let scored = templates.map(template => {
      let score = 0;

      if (preferences.preferredTypes?.includes(template.type)) {
        score += 10;
      }

      if (preferences.recentlyUsedTags) {
        const matchingTags = template.tags.filter(tag =>
          preferences.recentlyUsedTags!.includes(tag)
        );
        score += matchingTags.length * 5;
      }

      if (preferences.skillLevel) {
        const complexityKeywords = {
          beginner: ['quick-fix', 'explain', 'guide'],
          intermediate: ['debugging', 'testing', 'frontend', 'backend'],
          advanced: ['architecture', 'performance', 'security']
        };

        const keywords = complexityKeywords[preferences.skillLevel];
        const matchesLevel = keywords.some(keyword =>
          template.tags.includes(keyword) ||
          template.description.toLowerCase().includes(keyword)
        );

        if (matchesLevel) {
          score += 8;
        }
      }

      return { template, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 6).map(item => item.template);
  }

  /**
   * Get popular templates (by estimated usage)
   */
  public async getPopularTemplates(limit: number = 5): Promise<ConfigTemplate[]> {
    const templates = await this.getTemplates();
    
    const popularIds = [
      'agent-frontend-engineer',
      'agent-backend-engineer',
      'command-quick-fix',
      'agent-debugging-assistant',
      'hook-pre-commit'
    ];

    const popular = popularIds
      .map(id => templates.find(t => t.id === id))
      .filter((t): t is ConfigTemplate => t !== undefined)
      .slice(0, limit);

    return popular;
  }

  /**
   * Validate template structure
   */
  public async validateTemplate(template: ConfigTemplate): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!template.id || template.id.trim() === '') {
      errors.push('Template ID is required');
    }

    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    }

    if (!template.description || template.description.length < 10) {
      errors.push('Template description must be at least 10 characters');
    }

    if (!template.file || template.file.trim() === '') {
      errors.push('Template file path is required');
    }

    if (!['agent', 'hook', 'skill', 'command'].includes(template.type)) {
      errors.push('Invalid template type');
    }

    if (template.estimatedCost < 0) {
      errors.push('Estimated cost cannot be negative');
    }

    if (!template.capabilities || template.capabilities.length === 0) {
      errors.push('Template must have at least one capability');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const templateLoader = TemplateLoader.getInstance();

// Export convenience functions
export async function getAllTemplates(): Promise<ConfigTemplate[]> {
  return templateLoader.getTemplates();
}

export async function getTemplateById(id: string): Promise<ConfigTemplate | null> {
  return templateLoader.getTemplateById(id);
}

export async function loadTemplate(id: string): Promise<TemplateLoadResult> {
  return templateLoader.loadTemplate(id);
}

export async function searchTemplates(query: string): Promise<ConfigTemplate[]> {
  return templateLoader.searchTemplates(query);
}

export async function getCategories() {
  return templateLoader.getCategories();
}
