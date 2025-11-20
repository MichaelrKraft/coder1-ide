/**
 * Progressive Disclosure Architecture (PDA) - Skills Service
 * 
 * Implements a 3-tier loading system to reduce AI context by 80-90%:
 * - Tier 1: Metadata (~100 tokens, always loaded)
 * - Tier 2: Instructions (~1-3K tokens, loaded on invocation)
 * - Tier 3: References (variable, loaded on-demand)
 * 
 * @see /docs/PDA_SKILLS_SERVICE_SPEC.md for complete specification
 */

import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Tier 1: Metadata (always loaded, ~100 tokens)
 */
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: 'agents' | 'productivity' | 'debugging' | 'analysis';
  tools: string[];
  version: string;
  estimatedTokens: number;
  lastUpdated: string;
  author: string;
  tags: string[];
}

/**
 * Tier 2: Instructions (loaded on invocation, ~1-3K tokens)
 */
export interface SkillInstructions {
  skillId: string;
  content: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  process?: string[];
  validationRules?: string[];
  bestPractices?: string[];
  references?: string[];
}

/**
 * Tier 3: Reference (loaded on-demand, variable tokens)
 */
export interface SkillReference {
  skillId: string;
  referencePath: string;
  content: string;
  estimatedTokens: number;
}

/**
 * Context for skill execution
 */
export interface SkillContext {
  [key: string]: any;
}

/**
 * Result from skill execution
 */
export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed: number;
  executionTime: number;
}

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
}

/**
 * Performance metrics
 */
export interface SkillMetrics {
  skillId: string;
  loadTime: number;
  tokensLoaded: number;
  cacheHit: boolean;
  tier: 1 | 2 | 3;
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 50, ttl: number = 3600000) { // 1 hour default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access count and move to end (most recently used)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: string, value: T): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Add new entry
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// ============================================================================
// Skills Service
// ============================================================================

export class SkillsService {
  private skillsDir: string;
  private metadataCache: Map<string, SkillMetadata>;
  private instructionsCache: LRUCache<SkillInstructions>;
  private referenceCache: LRUCache<SkillReference>;
  private initialized: boolean;
  private metrics: SkillMetrics[];

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || path.join(process.cwd(), 'skills');
    this.metadataCache = new Map();
    this.instructionsCache = new LRUCache<SkillInstructions>(50, 3600000);
    this.referenceCache = new LRUCache<SkillReference>(100, 3600000);
    this.initialized = false;
    this.metrics = [];
  }

  /**
   * Initialize the service by loading all Tier 1 metadata
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const startTime = Date.now();
    const skills = await this.discoverSkills();

    for (const skillPath of skills) {
      try {
        const metadata = await this.loadMetadata(skillPath);
        this.metadataCache.set(metadata.id, metadata);
      } catch (error) {
        console.error(`Failed to load skill metadata: ${skillPath}`, error);
      }
    }

    this.initialized = true;
    console.log(`✅ SkillsService initialized: ${this.metadataCache.size} skills loaded in ${Date.now() - startTime}ms`);
  }

  /**
   * Discover all skills in the skills directory
   */
  private async discoverSkills(): Promise<string[]> {
    const skillPaths: string[] = [];

    try {
      const categories = await fs.readdir(this.skillsDir);

      for (const category of categories) {
        const categoryPath = path.join(this.skillsDir, category);
        const stat = await fs.stat(categoryPath);

        if (!stat.isDirectory()) continue;

        const skills = await fs.readdir(categoryPath);

        for (const skill of skills) {
          const skillPath = path.join(categoryPath, skill);
          const skillStat = await fs.stat(skillPath);

          if (skillStat.isDirectory()) {
            const metadataPath = path.join(skillPath, 'metadata.json');
            try {
              await fs.access(metadataPath);
              skillPaths.push(skillPath);
            } catch {
              // No metadata.json, skip
            }
          }
        }
      }
    } catch (error) {
      console.error('Error discovering skills:', error);
    }

    return skillPaths;
  }

  /**
   * Load Tier 1 metadata from a skill directory
   */
  private async loadMetadata(skillPath: string): Promise<SkillMetadata> {
    const metadataPath = path.join(skillPath, 'metadata.json');
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get all available skill metadata (Tier 1)
   */
  getAllSkills(): SkillMetadata[] {
    return Array.from(this.metadataCache.values());
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: SkillMetadata['category']): SkillMetadata[] {
    return this.getAllSkills().filter(skill => skill.category === category);
  }

  /**
   * Get skills by tag
   */
  getSkillsByTag(tag: string): SkillMetadata[] {
    return this.getAllSkills().filter(skill => skill.tags.includes(tag));
  }

  /**
   * Load Tier 2 instructions for a skill
   */
  async loadSkillInstructions(skillId: string): Promise<SkillInstructions> {
    const startTime = Date.now();

    // Check cache first
    const cached = this.instructionsCache.get(skillId);
    if (cached) {
      this.recordMetric({
        skillId,
        loadTime: Date.now() - startTime,
        tokensLoaded: 0,
        cacheHit: true,
        tier: 2
      });
      return cached;
    }

    // Load from disk
    const metadata = this.metadataCache.get(skillId);
    if (!metadata) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const skillPath = this.getSkillPath(metadata);
    const instructionsPath = path.join(skillPath, 'SKILL.md');
    const content = await fs.readFile(instructionsPath, 'utf-8');

    const instructions: SkillInstructions = {
      skillId,
      content,
      references: this.extractReferences(content)
    };

    // Cache for future use
    this.instructionsCache.set(skillId, instructions);

    this.recordMetric({
      skillId,
      loadTime: Date.now() - startTime,
      tokensLoaded: this.estimateTokens(content),
      cacheHit: false,
      tier: 2
    });

    return instructions;
  }

  /**
   * Load Tier 3 reference for a skill
   */
  async loadReference(skillId: string, referencePath: string): Promise<SkillReference> {
    const startTime = Date.now();
    const cacheKey = `${skillId}:${referencePath}`;

    // Check cache first
    const cached = this.referenceCache.get(cacheKey);
    if (cached) {
      this.recordMetric({
        skillId,
        loadTime: Date.now() - startTime,
        tokensLoaded: 0,
        cacheHit: true,
        tier: 3
      });
      return cached;
    }

    // Load from disk
    const metadata = this.metadataCache.get(skillId);
    if (!metadata) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const skillPath = this.getSkillPath(metadata);
    const fullPath = path.join(skillPath, 'references', referencePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    const reference: SkillReference = {
      skillId,
      referencePath,
      content,
      estimatedTokens: this.estimateTokens(content)
    };

    // Cache for future use
    this.referenceCache.set(cacheKey, reference);

    this.recordMetric({
      skillId,
      loadTime: Date.now() - startTime,
      tokensLoaded: reference.estimatedTokens,
      cacheHit: false,
      tier: 3
    });

    return reference;
  }

  /**
   * Execute a skill with given context
   */
  async executeSkill(skillId: string, context: SkillContext): Promise<SkillResult> {
    const startTime = Date.now();
    let tokensUsed = 0;

    try {
      // Load Tier 1 metadata (already cached)
      const metadata = this.metadataCache.get(skillId);
      if (!metadata) {
        throw new Error(`Skill not found: ${skillId}`);
      }
      tokensUsed += 100; // Metadata tokens

      // Load Tier 2 instructions
      const instructions = await this.loadSkillInstructions(skillId);
      tokensUsed += this.estimateTokens(instructions.content);

      // Load Tier 3 references if needed
      if (context.loadReferences && instructions.references) {
        for (const refPath of instructions.references) {
          if (context.neededReferences?.includes(refPath)) {
            const reference = await this.loadReference(skillId, refPath);
            tokensUsed += reference.estimatedTokens;
          }
        }
      }

      return {
        success: true,
        data: { metadata, instructions },
        tokensUsed,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensUsed,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get skill path from metadata
   */
  private getSkillPath(metadata: SkillMetadata): string {
    return path.join(this.skillsDir, metadata.category, metadata.id);
  }

  /**
   * Extract reference file paths from skill content
   */
  private extractReferences(content: string): string[] {
    const refRegex = /\[ref:([^\]]+)\]/g;
    const matches = content.matchAll(refRegex);
    return Array.from(matches).map(match => match[1]);
  }

  /**
   * Estimate tokens in text (rough approximation: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Record performance metric
   */
  private recordMetric(metric: SkillMetrics): void {
    this.metrics.push(metric);
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): SkillMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    tier2Size: number;
    tier3Size: number;
    tier2Keys: string[];
    tier3Keys: string[];
  } {
    return {
      tier2Size: this.instructionsCache.size(),
      tier3Size: this.referenceCache.size(),
      tier2Keys: this.instructionsCache.keys(),
      tier3Keys: this.referenceCache.keys()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.instructionsCache.clear();
    this.referenceCache.clear();
  }

  /**
   * Preload commonly used skills
   */
  async preloadSkills(skillIds: string[]): Promise<void> {
    const promises = skillIds.map(id => this.loadSkillInstructions(id));
    await Promise.all(promises);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: SkillsService | null = null;

export function getSkillsService(): SkillsService {
  if (!instance) {
    instance = new SkillsService();
  }
  return instance;
}

export async function initializeSkillsService(): Promise<SkillsService> {
  const service = getSkillsService();
  await service.initialize();
  return service;
}
