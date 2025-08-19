/**
 * Repository Pre-loader Service
 * 
 * Strategically pre-loads popular repositories on server startup
 * Creates instant AI intelligence for users with zero wait time
 * Hidden competitive advantage through stealth implementation
 */

const { getInstance: getRepositoryEngine } = require('../integrations/repository-intelligence-engine');
const os = require('os');
const { EventEmitter } = require('events');

class RepositoryPreloader extends EventEmitter {
    constructor() {
        super();
        this.engine = null;
        this.preloadQueue = [];
        this.isPreloading = false;
        this.preloadedRepos = new Set();
        this.failedRepos = new Map();
        this.startTime = null;
        this.stats = {
            totalAttempted: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            totalTime: 0
        };
        
        // Resource management configurations
        this.config = {
            batchSize: 3,
            maxConcurrent: 2,
            delayBetweenBatches: 15000, // 15 seconds
            delayBetweenRepos: 5000, // 5 seconds
            retryAttempts: 2,
            retryDelay: 10000, // 10 seconds
            maxMemoryUsage: 0.8, // 80% threshold
            maxCpuUsage: 0.7, // 70% threshold
            minDiskSpace: 1024 * 1024 * 1024, // 1GB
            timeout: 60000, // 60 seconds per repository
            lightweight: true // Use lightweight analysis for pre-loading
        };
    }

    /**
     * Initialize the pre-loader
     */
    async initialize() {
        try {
            console.log('🚀 [PRELOADER] Initializing Repository Pre-loader...');
            this.engine = getRepositoryEngine();
            await this.engine.initialize();
            
            // Load pre-load configuration
            await this.loadPreloadConfiguration();
            
            console.log('✅ [PRELOADER] Repository Pre-loader initialized');
            console.log(`📊 [PRELOADER] ${this.preloadQueue.length} repositories queued for pre-loading`);
            
            return true;
        } catch (error) {
            console.error('❌ [PRELOADER] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Load pre-load configuration from file or defaults
     */
    async loadPreloadConfiguration() {
        try {
            // Try to load from config file
            const config = require('../config/preload-repositories.json');
            
            // Check if we should use smart queue building
            if (config.sources && (config.sources.dynamic || config.sources.userPatterns)) {
                console.log('🧠 [PRELOADER] Building smart repository queue...');
                this.preloadQueue = await this.buildSmartQueue(config);
            } else {
                // Use static list (existing behavior)
                console.log('📋 [PRELOADER] Using static repository list');
                this.preloadQueue = [...config.repositories];
            }
        } catch (error) {
            // Use default strategic repositories if config doesn't exist
            console.log('📋 [PRELOADER] Using default repository list');
            this.preloadQueue = this.getDefaultRepositories();
        }
    }

    /**
     * Build smart queue combining multiple sources
     */
    async buildSmartQueue(config) {
        const repositories = new Map(); // Use Map to deduplicate
        const maxRepos = config.settings?.maxRepositories || 50;

        try {
            // 1. Add static repositories (if enabled)
            if (config.sources.static && config.repositories) {
                console.log('📚 [PRELOADER] Adding static repositories...');
                config.repositories.forEach(repo => {
                    const repoId = this.extractRepositoryId(repo);
                    repositories.set(repoId, {
                        url: repo,
                        source: 'static',
                        priority: 1
                    });
                });
            }

            // 2. Add dynamically fetched popular repositories (if enabled)
            if (config.sources.dynamic) {
                console.log('🌟 [PRELOADER] Fetching popular repositories...');
                try {
                    const { getInstance: getPopularityService } = require('./repository-popularity-service');
                    const popularityService = getPopularityService();
                    
                    const popularRepos = await popularityService.getPopularRepositories({
                        minStars: config.dynamicConfig?.minStars || 5000,
                        languages: config.dynamicConfig?.languages || ['javascript', 'typescript'],
                        limit: Math.min(30, maxRepos),
                        includeTrending: config.dynamicConfig?.includeTrending !== false,
                        includeFrameworks: config.dynamicConfig?.includeFrameworks !== false
                    });

                    popularRepos.forEach(repo => {
                        const repoId = repo.full_name;
                        if (!repositories.has(repoId)) {
                            repositories.set(repoId, {
                                url: `https://github.com/${repo.full_name}`,
                                source: 'dynamic',
                                priority: 2,
                                stars: repo.stars
                            });
                        }
                    });

                    console.log(`✅ [PRELOADER] Added ${popularRepos.length} popular repositories`);
                } catch (error) {
                    console.warn('⚠️ [PRELOADER] Failed to fetch popular repos:', error.message);
                }
            }

            // 3. Add user pattern-based repositories (if enabled)
            if (config.sources.userPatterns) {
                console.log('📈 [PRELOADER] Adding user pattern repositories...');
                try {
                    const { getInstance: getUsageTracker } = require('./repository-usage-tracker');
                    const usageTracker = getUsageTracker();
                    
                    const mostUsed = usageTracker.getMostUsedRepositories(20);
                    mostUsed.forEach(usage => {
                        const repoId = this.extractRepositoryId(usage.url);
                        if (!repositories.has(repoId)) {
                            repositories.set(repoId, {
                                url: usage.url.startsWith('http') ? usage.url : `https://github.com/${usage.url}`,
                                source: 'user-patterns',
                                priority: 0, // Highest priority
                                score: usage.score
                            });
                        }
                    });

                    console.log(`✅ [PRELOADER] Added ${mostUsed.length} user pattern repositories`);
                } catch (error) {
                    console.warn('⚠️ [PRELOADER] Failed to get user patterns:', error.message);
                }
            }

            // Convert to array and sort by priority
            let queue = Array.from(repositories.values())
                .sort((a, b) => {
                    // Sort by priority first (lower is better)
                    if (a.priority !== b.priority) {
                        return a.priority - b.priority;
                    }
                    // Then by score/stars
                    const aScore = a.score || a.stars || 0;
                    const bScore = b.score || b.stars || 0;
                    return bScore - aScore;
                })
                .slice(0, maxRepos)
                .map(repo => repo.url);

            console.log(`🎯 [PRELOADER] Smart queue built with ${queue.length} repositories`);
            console.log(`   Sources: Static(${config.sources.static}), Dynamic(${config.sources.dynamic}), UserPatterns(${config.sources.userPatterns})`);

            return queue;

        } catch (error) {
            console.error('❌ [PRELOADER] Failed to build smart queue:', error);
            // Fallback to static list
            return config.repositories || this.getDefaultRepositories();
        }
    }

    /**
     * Extract repository ID from URL
     */
    extractRepositoryId(url) {
        const match = url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
        if (match) {
            return match[1].replace('.git', '');
        }
        // If already in owner/repo format
        if (url.match(/^[^\/]+\/[^\/]+$/)) {
            return url;
        }
        return url;
    }

    /**
     * Get default strategic repositories for pre-loading
     */
    getDefaultRepositories() {
        return [
            // Phase 1: Core Framework Essentials (5 repos)
            'https://github.com/facebook/react',
            'https://github.com/vercel/next.js',
            'https://github.com/expressjs/express',
            'https://github.com/vuejs/vue',
            'https://github.com/tailwindlabs/tailwindcss',
            
            // Phase 2: Popular Templates (10 repos)
            'https://github.com/nodejs/node',
            'https://github.com/microsoft/TypeScript',
            'https://github.com/angular/angular',
            'https://github.com/sveltejs/svelte',
            'https://github.com/remix-run/remix',
            
            // Backend frameworks
            'https://github.com/nestjs/nest',
            'https://github.com/strapi/strapi',
            'https://github.com/fastify/fastify',
            
            // Full-stack templates
            'https://github.com/t3-oss/create-t3-app',
            'https://github.com/vercel/commerce',
            
            // Phase 3: Popular clones and starters (5 repos)
            'https://github.com/shadcn-ui/ui',
            'https://github.com/prisma/prisma',
            'https://github.com/supabase/supabase',
            'https://github.com/clerk/javascript',
            'https://github.com/trpc/trpc'
        ];
    }

    /**
     * Start pre-loading repositories
     */
    async startPreloading(options = {}) {
        if (this.isPreloading) {
            console.log('⚠️ [PRELOADER] Pre-loading already in progress');
            return false;
        }

        this.isPreloading = true;
        this.startTime = Date.now();
        
        // Merge options with defaults
        const config = { ...this.config, ...options };
        
        console.log('🔄 [PRELOADER] Starting repository pre-loading...');
        console.log(`📊 [PRELOADER] Queue size: ${this.preloadQueue.length} repositories`);
        console.log(`⚙️ [PRELOADER] Batch size: ${config.batchSize}, Max concurrent: ${config.maxConcurrent}`);
        
        // Emit start event
        this.emit('preload:start', {
            totalRepositories: this.preloadQueue.length,
            config
        });

        try {
            // Process repositories in batches
            for (let i = 0; i < this.preloadQueue.length; i += config.batchSize) {
                // Check resource usage before processing batch
                if (!await this.checkResources()) {
                    console.log('⚠️ [PRELOADER] Resource limits reached, pausing pre-loading');
                    await this.delay(30000); // Wait 30 seconds
                    
                    // Re-check resources
                    if (!await this.checkResources()) {
                        console.log('❌ [PRELOADER] Resource limits still exceeded, stopping pre-loading');
                        break;
                    }
                }
                
                const batch = this.preloadQueue.slice(i, Math.min(i + config.batchSize, this.preloadQueue.length));
                console.log(`\n🔄 [PRELOADER] Processing batch ${Math.floor(i / config.batchSize) + 1}`);
                
                // Process batch with controlled concurrency
                const results = await this.processBatch(batch, config);
                
                // Update statistics
                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value.success) {
                        this.stats.successful++;
                        this.preloadedRepos.add(result.value.repoUrl);
                    } else if (result.status === 'rejected' || !result.value.success) {
                        this.stats.failed++;
                        const repoUrl = result.value?.repoUrl || batch[results.indexOf(result)];
                        this.failedRepos.set(repoUrl, result.reason || result.value.error);
                    }
                });
                
                // Emit progress event
                this.emit('preload:progress', {
                    processed: i + batch.length,
                    total: this.preloadQueue.length,
                    successful: this.stats.successful,
                    failed: this.stats.failed
                });
                
                // Delay between batches to prevent overload
                if (i + config.batchSize < this.preloadQueue.length) {
                    console.log(`⏱️ [PRELOADER] Waiting ${config.delayBetweenBatches / 1000}s before next batch...`);
                    await this.delay(config.delayBetweenBatches);
                }
            }
            
            // Calculate total time
            this.stats.totalTime = Date.now() - this.startTime;
            
            // Final report
            this.printFinalReport();
            
            // Emit completion event
            this.emit('preload:complete', this.stats);
            
            return true;
            
        } catch (error) {
            console.error('❌ [PRELOADER] Pre-loading failed:', error);
            this.emit('preload:error', error);
            return false;
            
        } finally {
            this.isPreloading = false;
        }
    }

    /**
     * Process a batch of repositories
     */
    async processBatch(batch, config) {
        const promises = batch.map(async (repoUrl) => {
            try {
                // Skip if already pre-loaded
                if (this.preloadedRepos.has(repoUrl)) {
                    console.log(`⏭️ [PRELOADER] Skipping ${this.extractRepoName(repoUrl)} (already loaded)`);
                    this.stats.skipped++;
                    return { success: true, repoUrl, skipped: true };
                }
                
                // Attempt to pre-load with retries
                let lastError = null;
                for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
                    try {
                        console.log(`📥 [PRELOADER] Loading ${this.extractRepoName(repoUrl)} (attempt ${attempt}/${config.retryAttempts})`);
                        
                        const result = await this.preloadRepository(repoUrl, config);
                        
                        if (result.success) {
                            console.log(`✅ [PRELOADER] Successfully loaded ${this.extractRepoName(repoUrl)}`);
                            return { success: true, repoUrl, result };
                        } else {
                            lastError = result.error;
                            throw new Error(result.error);
                        }
                        
                    } catch (error) {
                        lastError = error;
                        if (attempt < config.retryAttempts) {
                            console.log(`⚠️ [PRELOADER] Retry ${attempt} failed for ${this.extractRepoName(repoUrl)}, waiting...`);
                            await this.delay(config.retryDelay);
                        }
                    }
                }
                
                throw lastError;
                
            } catch (error) {
                console.error(`❌ [PRELOADER] Failed to load ${this.extractRepoName(repoUrl)}:`, error.message);
                return { success: false, repoUrl, error: error.message };
            }
        });
        
        // Process with controlled concurrency
        return await Promise.allSettled(promises);
    }

    /**
     * Pre-load a single repository
     */
    async preloadRepository(repoUrl, config) {
        try {
            this.stats.totalAttempted++;
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Analysis timeout')), config.timeout);
            });
            
            // Analyze repository with timeout
            const analysisPromise = this.engine.analyzeRepository(repoUrl, {
                lightweight: config.lightweight,
                forceRefresh: false // Use cache if available
            });
            
            // Race between analysis and timeout
            const result = await Promise.race([analysisPromise, timeoutPromise]);
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check system resources
     */
    async checkResources() {
        try {
            // Check memory usage
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const memoryUsage = 1 - (freeMemory / totalMemory);
            
            // More lenient check - only stop if less than 50MB free
            const minFreeMemory = 50 * 1024 * 1024; // 50MB
            if (freeMemory < minFreeMemory) {
                console.log(`⚠️ [PRELOADER] Low memory: ${Math.round(freeMemory / 1024 / 1024)}MB free`);
                return false;
            }
            
            // Check CPU usage (simplified check)
            const loadAverage = os.loadavg()[0]; // 1-minute average
            const cpuCount = os.cpus().length;
            const cpuUsage = loadAverage / cpuCount;
            
            if (cpuUsage > this.config.maxCpuUsage) {
                console.log(`⚠️ [PRELOADER] CPU usage too high: ${Math.round(cpuUsage * 100)}%`);
                return false;
            }
            
            // All checks passed
            return true;
            
        } catch (error) {
            console.error('❌ [PRELOADER] Resource check failed:', error);
            return true; // Continue if check fails
        }
    }

    /**
     * Get pre-loading status
     */
    getStatus() {
        const elapsed = this.isPreloading ? Date.now() - this.startTime : this.stats.totalTime;
        
        return {
            isPreloading: this.isPreloading,
            queue: {
                total: this.preloadQueue.length,
                remaining: this.preloadQueue.length - this.stats.successful - this.stats.failed - this.stats.skipped
            },
            stats: {
                ...this.stats,
                elapsedTime: elapsed,
                averageTime: this.stats.successful > 0 ? Math.round(elapsed / this.stats.successful) : 0
            },
            preloaded: Array.from(this.preloadedRepos).map(url => ({
                url,
                name: this.extractRepoName(url)
            })),
            failed: Array.from(this.failedRepos.entries()).map(([url, error]) => ({
                url,
                name: this.extractRepoName(url),
                error
            }))
        };
    }

    /**
     * Add repository to pre-load queue
     */
    addToQueue(repoUrl) {
        if (!this.preloadQueue.includes(repoUrl)) {
            this.preloadQueue.push(repoUrl);
            console.log(`➕ [PRELOADER] Added ${this.extractRepoName(repoUrl)} to pre-load queue`);
            return true;
        }
        return false;
    }

    /**
     * Stop pre-loading
     */
    stopPreloading() {
        if (this.isPreloading) {
            this.isPreloading = false;
            console.log('🛑 [PRELOADER] Pre-loading stopped by user');
            this.emit('preload:stopped', this.getStatus());
            return true;
        }
        return false;
    }

    /**
     * Print final report
     */
    printFinalReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 REPOSITORY PRE-LOADING COMPLETE');
        console.log('='.repeat(60));
        console.log(`✅ Successful: ${this.stats.successful} repositories`);
        console.log(`❌ Failed: ${this.stats.failed} repositories`);
        console.log(`⏭️ Skipped: ${this.stats.skipped} repositories`);
        console.log(`⏱️ Total time: ${Math.round(this.stats.totalTime / 1000)}s`);
        console.log(`⚡ Average time per repo: ${Math.round(this.stats.totalTime / this.stats.successful / 1000)}s`);
        console.log('='.repeat(60));
        
        if (this.stats.successful > 0) {
            console.log('\n🎯 Pre-loaded repositories ready for instant access:');
            this.preloadedRepos.forEach(url => {
                console.log(`  ✓ ${this.extractRepoName(url)}`);
            });
        }
        
        if (this.failedRepos.size > 0) {
            console.log('\n⚠️ Failed repositories:');
            this.failedRepos.forEach((error, url) => {
                console.log(`  ✗ ${this.extractRepoName(url)}: ${error}`);
            });
        }
    }

    /**
     * Helper: Extract repository name from URL
     */
    extractRepoName(url) {
        const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : url;
    }

    /**
     * Helper: Delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
let globalPreloader = null;

function getInstance() {
    if (!globalPreloader) {
        globalPreloader = new RepositoryPreloader();
    }
    return globalPreloader;
}

module.exports = {
    RepositoryPreloader,
    getInstance
};