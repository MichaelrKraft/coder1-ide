/**
 * Pattern Engine - Core system for repository pattern analysis and matching
 * 
 * This engine forms the heart of the Smart Repository Patterns PRD Generator.
 * It's designed to be scalable from 15 curated patterns to 100+ automated patterns.
 * 
 * Architecture:
 * - PatternAnalyzer: Analyzes and validates pattern data
 * - PatternMatcher: Intelligent pattern selection based on user needs
 * - PatternValidator: Ensures pattern quality and completeness
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class PatternEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        this.patternsDir = options.patternsDir || path.join(__dirname, '../../data/patterns');
        this.cacheDir = options.cacheDir || path.join(__dirname, '../../data/cache/patterns');
        
        // Pattern cache for performance
        this.patterns = new Map();
        this.patternIndex = new Map(); // For fast lookups
        this.lastUpdateTime = null;
        
        // Configuration
        this.config = {
            maxPatterns: 1000, // Future scalability
            cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
            validatePatterns: true,
            enableAnalytics: true
        };
        
        this.logger.info('🧬 Pattern Engine initialized');
    }

    /**
     * Initialize the pattern engine
     * Loads all patterns and builds search index
     */
    async initialize() {
        try {
            await this.ensureDirectories();
            await this.loadPatterns();
            await this.buildSearchIndex();
            
            this.logger.info(`✅ Pattern Engine ready with ${this.patterns.size} patterns`);
            this.emit('ready', { patternCount: this.patterns.size });
            
            return true;
        } catch (error) {
            this.logger.error('❌ Pattern Engine initialization failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [this.patternsDir, this.cacheDir];
        
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                this.logger.info(`📁 Created directory: ${dir}`);
            }
        }
    }

    /**
     * Load all patterns from the patterns directory
     */
    async loadPatterns() {
        try {
            const files = await fs.readdir(this.patternsDir);
            const patternFiles = files.filter(file => file.endsWith('.json'));
            
            this.logger.info(`📖 Loading ${patternFiles.length} pattern files...`);
            
            for (const file of patternFiles) {
                try {
                    const filePath = path.join(this.patternsDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const pattern = JSON.parse(content);
                    
                    // Validate pattern structure
                    if (this.config.validatePatterns) {
                        this.validatePattern(pattern);
                    }
                    
                    // Add metadata
                    pattern.loadedAt = new Date().toISOString();
                    pattern.source = file;
                    
                    this.patterns.set(pattern.id, pattern);
                    this.logger.info(`  ✓ Loaded pattern: ${pattern.id}`);
                    
                } catch (error) {
                    this.logger.error(`  ❌ Failed to load pattern ${file}:`, error.message);
                }
            }
            
            this.lastUpdateTime = Date.now();
            
        } catch (error) {
            this.logger.error('Failed to load patterns:', error);
            throw error;
        }
    }

    /**
     * Validate pattern structure and required fields
     */
    validatePattern(pattern) {
        const required = ['id', 'metadata', 'architecture', 'questions', 'outcomes'];
        const missing = required.filter(field => !pattern[field]);
        
        if (missing.length > 0) {
            throw new Error(`Pattern missing required fields: ${missing.join(', ')}`);
        }

        // Validate metadata
        if (!pattern.metadata.name || !pattern.metadata.category) {
            throw new Error('Pattern metadata must include name and category');
        }

        // Validate architecture
        if (!pattern.architecture.frontend || !pattern.architecture.backend) {
            throw new Error('Pattern architecture must include frontend and backend');
        }

        // Validate questions array
        if (!Array.isArray(pattern.questions) || pattern.questions.length === 0) {
            throw new Error('Pattern must include questions array');
        }

        return true;
    }

    /**
     * Build search index for fast pattern matching
     */
    async buildSearchIndex() {
        this.patternIndex.clear();
        
        // Index by category
        const categories = new Map();
        
        // Index by tags
        const tags = new Map();
        
        // Index by complexity
        const complexity = new Map();
        
        for (const [id, pattern] of this.patterns) {
            // Category index
            const category = pattern.metadata.category;
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push(id);
            
            // Tags index
            if (pattern.metadata.tags) {
                for (const tag of pattern.metadata.tags) {
                    if (!tags.has(tag)) {
                        tags.set(tag, []);
                    }
                    tags.get(tag).push(id);
                }
            }
            
            // Complexity index
            const comp = pattern.metadata.complexity || 'medium';
            if (!complexity.has(comp)) {
                complexity.set(comp, []);
            }
            complexity.get(comp).push(id);
        }
        
        this.patternIndex.set('categories', categories);
        this.patternIndex.set('tags', tags);
        this.patternIndex.set('complexity', complexity);
        
        this.logger.info(`🔍 Built search index with ${categories.size} categories, ${tags.size} tags`);
    }

    /**
     * Find patterns matching user requirements
     */
    async findPatterns(requirements = {}) {
        const {
            category,
            tags = [],
            complexity,
            businessModel,
            userScale,
            limit = 10
        } = requirements;

        let candidates = new Set();
        
        // Start with category filter if specified
        if (category) {
            const categoryPatterns = this.patternIndex.get('categories')?.get(category) || [];
            categoryPatterns.forEach(id => candidates.add(id));
        } else {
            // Include all patterns if no category specified
            for (const id of this.patterns.keys()) {
                candidates.add(id);
            }
        }

        // Filter by tags
        if (tags.length > 0) {
            const tagIndex = this.patternIndex.get('tags');
            const tagMatches = new Set();
            
            for (const tag of tags) {
                const tagPatterns = tagIndex?.get(tag) || [];
                tagPatterns.forEach(id => {
                    if (candidates.has(id)) {
                        tagMatches.add(id);
                    }
                });
            }
            
            if (tagMatches.size > 0) {
                candidates = tagMatches;
            }
        }

        // Filter by complexity
        if (complexity) {
            const complexityIndex = this.patternIndex.get('complexity');
            const complexityPatterns = new Set(complexityIndex?.get(complexity) || []);
            candidates = new Set([...candidates].filter(id => complexityPatterns.has(id)));
        }

        // Convert to pattern objects and add scoring
        const results = [];
        for (const id of candidates) {
            const pattern = this.patterns.get(id);
            if (pattern) {
                const score = this.calculatePatternScore(pattern, requirements);
                results.push({
                    ...pattern,
                    matchScore: score
                });
            }
        }

        // Sort by score and limit results
        results.sort((a, b) => b.matchScore - a.matchScore);
        
        const limitedResults = results.slice(0, limit);
        
        this.logger.info(`🎯 Found ${limitedResults.length} matching patterns for requirements`);
        
        return limitedResults;
    }

    /**
     * Calculate how well a pattern matches user requirements
     */
    calculatePatternScore(pattern, requirements) {
        let score = 0;
        
        // Base score
        score += 50;
        
        // Category match
        if (requirements.category === pattern.metadata.category) {
            score += 30;
        }
        
        // Tags match
        if (requirements.tags && pattern.metadata.tags) {
            const tagMatches = requirements.tags.filter(tag => 
                pattern.metadata.tags.includes(tag)
            ).length;
            score += tagMatches * 10;
        }
        
        // Complexity preference
        if (requirements.complexity === pattern.metadata.complexity) {
            score += 20;
        }
        
        // Business model alignment
        if (requirements.businessModel && pattern.metadata.businessModel) {
            if (requirements.businessModel === pattern.metadata.businessModel) {
                score += 25;
            }
        }
        
        // Success rate bonus
        if (pattern.metadata.successRate) {
            score += pattern.metadata.successRate * 20;
        }
        
        // Popularity bonus (if we track usage)
        if (pattern.metadata.popularity) {
            score += pattern.metadata.popularity * 5;
        }
        
        return Math.min(score, 100); // Cap at 100
    }

    /**
     * Get a specific pattern by ID
     */
    async getPattern(patternId) {
        const pattern = this.patterns.get(patternId);
        
        if (!pattern) {
            throw new Error(`Pattern not found: ${patternId}`);
        }
        
        // Deep clone to prevent modifications
        return JSON.parse(JSON.stringify(pattern));
    }

    /**
     * Get all available patterns with optional filtering
     */
    async getAllPatterns(filter = {}) {
        const patterns = Array.from(this.patterns.values());
        
        if (Object.keys(filter).length === 0) {
            return patterns;
        }
        
        return patterns.filter(pattern => {
            if (filter.category && pattern.metadata.category !== filter.category) {
                return false;
            }
            
            if (filter.complexity && pattern.metadata.complexity !== filter.complexity) {
                return false;
            }
            
            if (filter.tags && filter.tags.length > 0) {
                const hasMatchingTag = filter.tags.some(tag => 
                    pattern.metadata.tags?.includes(tag)
                );
                if (!hasMatchingTag) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Get pattern statistics for analytics
     */
    getStatistics() {
        const categories = new Map();
        const complexities = new Map();
        let totalSuccessRate = 0;
        let patternsWithSuccessRate = 0;
        
        for (const pattern of this.patterns.values()) {
            // Category stats
            const category = pattern.metadata.category;
            categories.set(category, (categories.get(category) || 0) + 1);
            
            // Complexity stats
            const complexity = pattern.metadata.complexity || 'unknown';
            complexities.set(complexity, (complexities.get(complexity) || 0) + 1);
            
            // Success rate stats
            if (pattern.metadata.successRate) {
                totalSuccessRate += pattern.metadata.successRate;
                patternsWithSuccessRate++;
            }
        }
        
        return {
            totalPatterns: this.patterns.size,
            categories: Object.fromEntries(categories),
            complexities: Object.fromEntries(complexities),
            averageSuccessRate: patternsWithSuccessRate > 0 ? 
                totalSuccessRate / patternsWithSuccessRate : 0,
            lastUpdate: this.lastUpdateTime
        };
    }

    /**
     * Reload patterns from disk (for development)
     */
    async reloadPatterns() {
        this.logger.info('🔄 Reloading patterns...');
        this.patterns.clear();
        this.patternIndex.clear();
        
        await this.loadPatterns();
        await this.buildSearchIndex();
        
        this.emit('reloaded', { patternCount: this.patterns.size });
        return true;
    }
}

module.exports = PatternEngine;