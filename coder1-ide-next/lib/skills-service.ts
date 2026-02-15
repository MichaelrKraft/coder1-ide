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
import { homedir } from 'os';

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
  category: 'agents' | 'productivity' | 'debugging' | 'analysis' | 'clawhub' | 'development' | 'research' | 'monitoring';
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
  private skillsDirs: string[];
  private metadataCache: Map<string, SkillMetadata>;
  private skillPathMap: Map<string, string>; // skillId -> absolute path
  private instructionsCache: LRUCache<SkillInstructions>;
  private referenceCache: LRUCache<SkillReference>;
  private initialized: boolean;
  private metrics: SkillMetrics[];

  constructor(skillsDirs?: string[]) {
    this.skillsDirs = skillsDirs || [
      path.join(process.cwd(), 'skills'),       // bundled local skills
      path.join(homedir(), '.coder1', 'skills'), // user-installed skills (including ClawHub)
    ];
    this.metadataCache = new Map();
    this.skillPathMap = new Map();
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
    let successCount = 0;

    for (const skillPath of skills) {
      try {
        const metadata = await this.loadMetadata(skillPath);
        this.metadataCache.set(metadata.id, metadata);
        this.skillPathMap.set(metadata.id, skillPath);
        successCount++;
      } catch (error) {
        console.error(`Failed to load skill metadata: ${skillPath}`, error);
      }
    }

    this.initialized = true;

    if (skills.length > 0 && successCount === 0) {
      console.warn(`⚠️ SkillsService: discovered ${skills.length} skill directories but failed to load any metadata`);
    }

    console.log(`SkillsService initialized: ${successCount}/${skills.length} skills loaded in ${Date.now() - startTime}ms`);
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Discover all skills across all configured directories.
   * Supports both flat (skill-id/metadata.json) and nested (category/skill-id/metadata.json) structures.
   */
  private async discoverSkills(): Promise<string[]> {
    const skillPaths: string[] = [];

    for (const baseDir of this.skillsDirs) {
      try {
        await fs.access(baseDir);
      } catch {
        continue; // Directory doesn't exist, skip
      }

      try {
        const entries = await fs.readdir(baseDir);

        for (const entry of entries) {
          const entryPath = path.join(baseDir, entry);
          const stat = await fs.stat(entryPath);
          if (!stat.isDirectory()) continue;

          // Check for flat structure: baseDir/skill-id/metadata.json
          const flatMetadata = path.join(entryPath, 'metadata.json');
          try {
            await fs.access(flatMetadata);
            skillPaths.push(entryPath);
            continue; // Found at flat level, skip category scanning
          } catch {
            // Not flat, try category structure
          }

          // Check for nested structure: baseDir/category/skill-id/metadata.json
          const subEntries = await fs.readdir(entryPath);
          for (const subEntry of subEntries) {
            const subPath = path.join(entryPath, subEntry);
            const subStat = await fs.stat(subPath);
            if (!subStat.isDirectory()) continue;

            const nestedMetadata = path.join(subPath, 'metadata.json');
            try {
              await fs.access(nestedMetadata);
              skillPaths.push(subPath);
            } catch {
              // No metadata.json, skip
            }
          }
        }
      } catch (error) {
        console.error(`Error discovering skills in ${baseDir}:`, error);
      }
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
    const stored = this.skillPathMap.get(metadata.id);
    if (stored) return stored;
    // Fallback to first directory + category structure
    return path.join(this.skillsDirs[0], metadata.category, metadata.id);
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
   * Re-scan skill directories and refresh the cache
   */
  async refreshSkills(): Promise<void> {
    this.metadataCache.clear();
    this.skillPathMap.clear();
    this.instructionsCache.clear();
    this.referenceCache.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Uninstall a skill by removing it from cache
   * (Filesystem deletion should be handled by the caller)
   */
  uninstallSkill(skillId: string): void {
    this.metadataCache.delete(skillId);
    this.skillPathMap.delete(skillId);
    this.instructionsCache.clear(); // Clear since we can't target a specific key
  }

  /**
   * Get skills filtered by a source directory path
   */
  getSkillsBySource(source: 'local' | 'clawhub'): SkillMetadata[] {
    const localDir = path.join(process.cwd(), 'skills');
    return this.getAllSkills().filter(skill => {
      const skillPath = this.skillPathMap.get(skill.id) || '';
      if (source === 'local') {
        return skillPath.startsWith(localDir);
      }
      return !skillPath.startsWith(localDir);
    });
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
let initPromise: Promise<SkillsService> | null = null;

export function getSkillsService(): SkillsService {
  if (!instance) {
    instance = new SkillsService();
  }
  return instance;
}

export async function initializeSkillsService(): Promise<SkillsService> {
  if (instance?.isInitialized()) return instance;

  if (!initPromise) {
    initPromise = (async () => {
      const service = getSkillsService();
      await service.initialize();
      return service;
    })();
  }
  return initPromise;
}
