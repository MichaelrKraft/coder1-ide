/**
 * Component History Service - Phase 3.1 Enhancement
 * Manages history of generated components with versioning and metadata
 */

interface ComponentHistoryItem {
  id: string;
  name: string;
  code: string;
  prompt: string;
  timestamp: Date;
  version: number;
  metadata: {
    type: string;
    framework: string;
    category: string;
    tags: string[];
    accessibilityScore?: number;
    performanceScore?: number;
    optimized?: boolean;
    customizations?: Record<string, any>;
  };
  stats: {
    usageCount: number;
    lastUsed?: Date;
    rating?: number;
    favorite?: boolean;
  };
}

interface ComponentCollection {
  id: string;
  name: string;
  description: string;
  components: string[]; // Component IDs
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isPublic: boolean;
}

class ComponentHistoryService {
  private history: Map<string, ComponentHistoryItem> = new Map();
  private collections: Map<string, ComponentCollection> = new Map();
  private maxHistorySize = 100;
  private storageKey = 'magicComponentHistory';
  private collectionsKey = 'magicComponentCollections';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load history from localStorage
   */
  private loadFromStorage() {
    try {
      const historyData = localStorage.getItem(this.storageKey);
      if (historyData) {
        const parsed = JSON.parse(historyData);
        parsed.forEach((item: ComponentHistoryItem) => {
          item.timestamp = new Date(item.timestamp);
          if (item.stats.lastUsed) {
            item.stats.lastUsed = new Date(item.stats.lastUsed);
          }
          this.history.set(item.id, item);
        });
      }

      const collectionsData = localStorage.getItem(this.collectionsKey);
      if (collectionsData) {
        const parsed = JSON.parse(collectionsData);
        parsed.forEach((collection: ComponentCollection) => {
          collection.createdAt = new Date(collection.createdAt);
          collection.updatedAt = new Date(collection.updatedAt);
          this.collections.set(collection.id, collection);
        });
      }

      console.log('✅ Component history loaded:', {
        components: this.history.size,
        collections: this.collections.size
      });
    } catch (error) {
      console.error('Failed to load component history:', error);
    }
  }

  /**
   * Save history to localStorage
   */
  private saveToStorage() {
    try {
      const historyArray = Array.from(this.history.values());
      localStorage.setItem(this.storageKey, JSON.stringify(historyArray));

      const collectionsArray = Array.from(this.collections.values());
      localStorage.setItem(this.collectionsKey, JSON.stringify(collectionsArray));
    } catch (error) {
      console.error('Failed to save component history:', error);
    }
  }

  /**
   * Add a new component to history
   */
  addComponent(
    code: string,
    prompt: string,
    metadata?: Partial<ComponentHistoryItem['metadata']>
  ): ComponentHistoryItem {
    const id = this.generateId();
    const name = this.extractComponentName(code) || `Component_${id.slice(0, 8)}`;
    
    // Check if similar component exists
    const existingId = this.findSimilarComponent(code);
    let version = 1;
    
    if (existingId) {
      const existing = this.history.get(existingId)!;
      version = existing.version + 1;
    }

    const item: ComponentHistoryItem = {
      id,
      name,
      code,
      prompt,
      timestamp: new Date(),
      version,
      metadata: {
        type: this.detectComponentType(code),
        framework: 'react',
        category: this.categorizeComponent(prompt),
        tags: this.generateTags(prompt, code),
        ...metadata
      },
      stats: {
        usageCount: 0,
        favorite: false
      }
    };

    this.history.set(id, item);
    this.pruneHistoryIfNeeded();
    this.saveToStorage();

    return item;
  }

  /**
   * Get component by ID
   */
  getComponent(id: string): ComponentHistoryItem | undefined {
    const component = this.history.get(id);
    if (component) {
      // Update usage stats
      component.stats.usageCount++;
      component.stats.lastUsed = new Date();
      this.saveToStorage();
    }
    return component;
  }

  /**
   * Get all components
   */
  getAllComponents(): ComponentHistoryItem[] {
    return Array.from(this.history.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Search components
   */
  searchComponents(query: string): ComponentHistoryItem[] {
    const queryLower = query.toLowerCase();
    return this.getAllComponents().filter(item => 
      item.name.toLowerCase().includes(queryLower) ||
      item.prompt.toLowerCase().includes(queryLower) ||
      item.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
      item.metadata.category.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: string): ComponentHistoryItem[] {
    return this.getAllComponents().filter(item => 
      item.metadata.category === category
    );
  }

  /**
   * Get favorite components
   */
  getFavoriteComponents(): ComponentHistoryItem[] {
    return this.getAllComponents().filter(item => 
      item.stats.favorite === true
    );
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(id: string): boolean {
    const component = this.history.get(id);
    if (component) {
      component.stats.favorite = !component.stats.favorite;
      this.saveToStorage();
      return component.stats.favorite;
    }
    return false;
  }

  /**
   * Rate component
   */
  rateComponent(id: string, rating: number) {
    const component = this.history.get(id);
    if (component && rating >= 1 && rating <= 5) {
      component.stats.rating = rating;
      this.saveToStorage();
    }
  }

  /**
   * Delete component
   */
  deleteComponent(id: string): boolean {
    const deleted = this.history.delete(id);
    if (deleted) {
      // Remove from collections
      this.collections.forEach(collection => {
        const index = collection.components.indexOf(id);
        if (index !== -1) {
          collection.components.splice(index, 1);
        }
      });
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Create collection
   */
  createCollection(
    name: string,
    description: string,
    componentIds: string[] = []
  ): ComponentCollection {
    const id = this.generateId();
    const collection: ComponentCollection = {
      id,
      name,
      description,
      components: componentIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      isPublic: false
    };

    this.collections.set(id, collection);
    this.saveToStorage();
    return collection;
  }

  /**
   * Add component to collection
   */
  addToCollection(collectionId: string, componentId: string): boolean {
    const collection = this.collections.get(collectionId);
    const component = this.history.get(componentId);
    
    if (collection && component && !collection.components.includes(componentId)) {
      collection.components.push(componentId);
      collection.updatedAt = new Date();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Get collection
   */
  getCollection(id: string): ComponentCollection | undefined {
    return this.collections.get(id);
  }

  /**
   * Get all collections
   */
  getAllCollections(): ComponentCollection[] {
    return Array.from(this.collections.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Export component as file
   */
  exportComponent(id: string): string | null {
    const component = this.history.get(id);
    if (!component) return null;

    const exportData = {
      name: component.name,
      code: component.code,
      prompt: component.prompt,
      metadata: component.metadata,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import component from file
   */
  importComponent(jsonData: string): ComponentHistoryItem | null {
    try {
      const parsed = JSON.parse(jsonData);
      return this.addComponent(
        parsed.code,
        parsed.prompt,
        parsed.metadata
      );
    } catch (error) {
      console.error('Failed to import component:', error);
      return null;
    }
  }

  /**
   * Get component statistics
   */
  getStatistics() {
    const components = this.getAllComponents();
    const categories = new Map<string, number>();
    const tags = new Map<string, number>();
    
    components.forEach(component => {
      // Count categories
      const category = component.metadata.category;
      categories.set(category, (categories.get(category) || 0) + 1);
      
      // Count tags
      component.metadata.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
    });

    return {
      totalComponents: components.length,
      totalCollections: this.collections.size,
      favoriteCount: components.filter(c => c.stats.favorite).length,
      averageRating: this.calculateAverageRating(components),
      mostUsedComponent: this.getMostUsedComponent(components),
      categoriesBreakdown: Object.fromEntries(categories),
      popularTags: Array.from(tags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }))
    };
  }

  /**
   * Clear all history
   */
  clearHistory() {
    this.history.clear();
    this.collections.clear();
    this.saveToStorage();
  }

  // Helper methods

  private generateId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractComponentName(code: string): string | null {
    const patterns = [
      /(?:const|let|var)\s+(\w+)\s*=/,
      /(?:function)\s+(\w+)\s*\(/,
      /(?:class)\s+(\w+)\s+extends/
    ];

    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  private detectComponentType(code: string): string {
    if (code.includes('button') || code.includes('Button')) return 'button';
    if (code.includes('form') || code.includes('Form')) return 'form';
    if (code.includes('card') || code.includes('Card')) return 'card';
    if (code.includes('nav') || code.includes('Nav')) return 'navigation';
    if (code.includes('hero') || code.includes('Hero')) return 'hero';
    if (code.includes('modal') || code.includes('Modal')) return 'modal';
    if (code.includes('table') || code.includes('Table')) return 'table';
    if (code.includes('list') || code.includes('List')) return 'list';
    return 'component';
  }

  private categorizeComponent(prompt: string): string {
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes('button') || promptLower.includes('cta')) return 'buttons';
    if (promptLower.includes('form') || promptLower.includes('input')) return 'forms';
    if (promptLower.includes('card') || promptLower.includes('pricing')) return 'cards';
    if (promptLower.includes('nav') || promptLower.includes('menu')) return 'navigation';
    if (promptLower.includes('hero') || promptLower.includes('header')) return 'heroes';
    if (promptLower.includes('modal') || promptLower.includes('dialog')) return 'modals';
    if (promptLower.includes('dashboard') || promptLower.includes('chart')) return 'dashboards';
    if (promptLower.includes('landing') || promptLower.includes('page')) return 'pages';
    return 'general';
  }

  private generateTags(prompt: string, code: string): string[] {
    const tags = new Set<string>();
    
    // Extract from prompt
    const promptWords = prompt.toLowerCase().split(/\s+/);
    const keywords = ['gradient', 'animated', 'responsive', 'dark', 'light', 'modern', 'minimal'];
    keywords.forEach(keyword => {
      if (promptWords.includes(keyword)) {
        tags.add(keyword);
      }
    });

    // Extract from code
    if (code.includes('useState')) tags.add('stateful');
    if (code.includes('useEffect')) tags.add('effects');
    if (code.includes('async') || code.includes('await')) tags.add('async');
    if (code.includes('tailwindcss') || code.includes('className')) tags.add('tailwind');
    if (code.includes('styled-components')) tags.add('styled-components');
    if (code.includes('framer-motion')) tags.add('animated');
    if (code.includes('@media') || code.includes('responsive')) tags.add('responsive');

    return Array.from(tags);
  }

  private findSimilarComponent(code: string): string | null {
    const codeNormalized = code.replace(/\s+/g, '').toLowerCase();
    
    const entries = Array.from(this.history.entries());
    for (const [id, component] of entries) {
      const existingNormalized = component.code.replace(/\s+/g, '').toLowerCase();
      if (existingNormalized === codeNormalized) {
        return id;
      }
    }
    return null;
  }

  private pruneHistoryIfNeeded() {
    if (this.history.size > this.maxHistorySize) {
      // Remove oldest non-favorite components
      const components = this.getAllComponents()
        .filter(c => !c.stats.favorite)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const toRemove = components.slice(0, this.history.size - this.maxHistorySize);
      toRemove.forEach(component => {
        this.deleteComponent(component.id);
      });
    }
  }

  private calculateAverageRating(components: ComponentHistoryItem[]): number {
    const rated = components.filter(c => c.stats.rating);
    if (rated.length === 0) return 0;
    
    const sum = rated.reduce((acc, c) => acc + (c.stats.rating || 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  }

  private getMostUsedComponent(components: ComponentHistoryItem[]): ComponentHistoryItem | null {
    if (components.length === 0) return null;
    
    return components.reduce((most, current) => 
      current.stats.usageCount > most.stats.usageCount ? current : most
    );
  }
}

// Create singleton instance
const componentHistory = new ComponentHistoryService();

export default componentHistory;
export type { ComponentHistoryItem, ComponentCollection };