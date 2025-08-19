/**
 * Repository Popularity Service
 * 
 * Dynamically fetches the most popular GitHub repositories
 * Provides intelligent repository selection based on real-time data
 * Falls back gracefully to static lists if APIs are unavailable
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class RepositoryPopularityService {
    constructor() {
        this.cache = null;
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.cachePath = path.join(__dirname, '../../data/popular-repositories-cache.json');
        this.githubToken = process.env.GITHUB_TOKEN || null;
        
        // Rate limiting
        this.lastApiCall = 0;
        this.minApiInterval = 2000; // 2 seconds between calls
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Get popular repositories from multiple sources
     */
    async getPopularRepositories(options = {}) {
        const {
            minStars = 5000,
            languages = ['javascript', 'typescript', 'python', 'java', 'go'],
            limit = 50,
            includeFrameworks = true,
            includeTrending = true,
            useCache = true
        } = options;

        try {
            // Check cache first
            if (useCache) {
                const cached = await this.getCachedRepositories();
                if (cached) {
                    console.log('📋 [POPULARITY] Using cached popular repositories');
                    return cached;
                }
            }

            console.log('🔍 [POPULARITY] Fetching fresh popular repositories...');
            const repositories = new Map(); // Use Map to prevent duplicates

            // 1. Get most starred repositories overall
            const mostStarred = await this.fetchMostStarred(minStars, 30);
            mostStarred.forEach(repo => repositories.set(repo.full_name, repo));

            // 2. Get trending by language
            if (includeTrending) {
                for (const language of languages) {
                    const trending = await this.fetchTrendingByLanguage(language, 10);
                    trending.forEach(repo => repositories.set(repo.full_name, repo));
                    
                    // Rate limit protection
                    await this.delay(this.minApiInterval);
                }
            }

            // 3. Add essential frameworks (always include these)
            if (includeFrameworks) {
                const essentials = this.getEssentialFrameworks();
                essentials.forEach(repo => {
                    if (!repositories.has(repo.full_name)) {
                        repositories.set(repo.full_name, {
                            full_name: repo.full_name,
                            url: `https://github.com/${repo.full_name}`,
                            stars: repo.stars || 0,
                            language: repo.language || 'JavaScript',
                            category: 'essential'
                        });
                    }
                });
            }

            // 4. Get NPM popular packages (for JavaScript ecosystem)
            const npmPopular = await this.fetchNpmPopular();
            npmPopular.forEach(repo => repositories.set(repo.full_name, repo));

            // Convert to array and sort by stars
            let popularRepos = Array.from(repositories.values())
                .sort((a, b) => (b.stars || 0) - (a.stars || 0))
                .slice(0, limit);

            // Cache the results
            await this.cacheRepositories(popularRepos);

            console.log(`✅ [POPULARITY] Found ${popularRepos.length} popular repositories`);
            return popularRepos;

        } catch (error) {
            console.error('❌ [POPULARITY] Failed to fetch popular repositories:', error.message);
            
            // Fallback to static list
            return this.getFallbackRepositories();
        }
    }

    /**
     * Fetch most starred repositories from GitHub
     */
    async fetchMostStarred(minStars = 5000, limit = 30) {
        try {
            await this.enforceRateLimit();

            const response = await axios.get('https://api.github.com/search/repositories', {
                params: {
                    q: `stars:>${minStars}`,
                    sort: 'stars',
                    order: 'desc',
                    per_page: limit
                },
                headers: this.getGithubHeaders(),
                timeout: 10000
            });

            return response.data.items.map(repo => ({
                full_name: repo.full_name,
                url: repo.html_url,
                stars: repo.stargazers_count,
                language: repo.language,
                description: repo.description,
                topics: repo.topics || [],
                category: 'most-starred'
            }));

        } catch (error) {
            console.warn('⚠️ [POPULARITY] Failed to fetch most starred:', error.message);
            return [];
        }
    }

    /**
     * Fetch trending repositories by language
     */
    async fetchTrendingByLanguage(language, limit = 10) {
        try {
            await this.enforceRateLimit();

            const response = await axios.get('https://api.github.com/search/repositories', {
                params: {
                    q: `language:${language} stars:>1000 pushed:>${this.getDateWeekAgo()}`,
                    sort: 'stars',
                    order: 'desc',
                    per_page: limit
                },
                headers: this.getGithubHeaders(),
                timeout: 10000
            });

            return response.data.items.map(repo => ({
                full_name: repo.full_name,
                url: repo.html_url,
                stars: repo.stargazers_count,
                language: repo.language || language,
                description: repo.description,
                topics: repo.topics || [],
                category: `trending-${language.toLowerCase()}`
            }));

        } catch (error) {
            console.warn(`⚠️ [POPULARITY] Failed to fetch trending for ${language}:`, error.message);
            return [];
        }
    }

    /**
     * Fetch popular NPM packages and map to GitHub repos
     */
    async fetchNpmPopular() {
        try {
            // Top packages that have GitHub repos
            const packages = [
                'react', 'vue', 'angular', 'next', 'express',
                'axios', 'lodash', 'typescript', 'webpack', 'vite',
                'tailwindcss', 'prisma', 'jest', 'eslint', 'prettier'
            ];

            const repos = [];
            for (const pkg of packages.slice(0, 10)) { // Limit to avoid too many requests
                try {
                    const response = await axios.get(`https://registry.npmjs.org/${pkg}`, {
                        timeout: 5000
                    });

                    if (response.data.repository?.url) {
                        const repoUrl = response.data.repository.url
                            .replace('git+', '')
                            .replace('.git', '')
                            .replace('git://', 'https://')
                            .replace('github.com:', 'github.com/');

                        const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
                        if (match) {
                            repos.push({
                                full_name: match[1],
                                url: `https://github.com/${match[1]}`,
                                stars: 0, // Will be updated if we fetch from GitHub
                                language: 'JavaScript',
                                category: 'npm-popular',
                                npmDownloads: response.data.downloads || 0
                            });
                        }
                    }
                } catch (error) {
                    // Skip packages that fail
                }

                await this.delay(500); // Be nice to NPM
            }

            return repos;

        } catch (error) {
            console.warn('⚠️ [POPULARITY] Failed to fetch NPM popular:', error.message);
            return [];
        }
    }

    /**
     * Get essential framework repositories
     */
    getEssentialFrameworks() {
        return [
            { full_name: 'facebook/react', stars: 220000, language: 'JavaScript' },
            { full_name: 'vuejs/vue', stars: 207000, language: 'JavaScript' },
            { full_name: 'angular/angular', stars: 94000, language: 'TypeScript' },
            { full_name: 'vercel/next.js', stars: 119000, language: 'JavaScript' },
            { full_name: 'nuxt/nuxt', stars: 51000, language: 'JavaScript' },
            { full_name: 'sveltejs/svelte', stars: 76000, language: 'JavaScript' },
            { full_name: 'remix-run/remix', stars: 27000, language: 'TypeScript' },
            { full_name: 'nodejs/node', stars: 103000, language: 'JavaScript' },
            { full_name: 'expressjs/express', stars: 63000, language: 'JavaScript' },
            { full_name: 'nestjs/nest', stars: 64000, language: 'TypeScript' },
            { full_name: 'microsoft/TypeScript', stars: 97000, language: 'TypeScript' },
            { full_name: 'tailwindlabs/tailwindcss', stars: 78000, language: 'JavaScript' },
            { full_name: 'webpack/webpack', stars: 64000, language: 'JavaScript' },
            { full_name: 'vitejs/vite', stars: 64000, language: 'JavaScript' },
            { full_name: 'prisma/prisma', stars: 37000, language: 'TypeScript' },
            { full_name: 'supabase/supabase', stars: 66000, language: 'TypeScript' },
            { full_name: 'trpc/trpc', stars: 32000, language: 'TypeScript' },
            { full_name: 'shadcn-ui/ui', stars: 58000, language: 'TypeScript' },
            { full_name: 'axios/axios', stars: 104000, language: 'JavaScript' },
            { full_name: 'reduxjs/redux', stars: 60000, language: 'TypeScript' }
        ];
    }

    /**
     * Get fallback repositories if API fails
     */
    getFallbackRepositories() {
        console.log('📋 [POPULARITY] Using fallback repository list');
        const essentials = this.getEssentialFrameworks();
        
        return essentials.map(repo => ({
            full_name: repo.full_name,
            url: `https://github.com/${repo.full_name}`,
            stars: repo.stars || 0,
            language: repo.language || 'JavaScript',
            category: 'fallback'
        }));
    }

    /**
     * Cache repositories to file
     */
    async cacheRepositories(repositories) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                expiry: Date.now() + this.cacheExpiry,
                repositories
            };

            await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
            await fs.writeFile(this.cachePath, JSON.stringify(cacheData, null, 2));
            console.log('💾 [POPULARITY] Cached popular repositories');

        } catch (error) {
            console.warn('⚠️ [POPULARITY] Failed to cache repositories:', error.message);
        }
    }

    /**
     * Get cached repositories if valid
     */
    async getCachedRepositories() {
        try {
            const data = await fs.readFile(this.cachePath, 'utf8');
            const cache = JSON.parse(data);

            if (cache.expiry > Date.now()) {
                return cache.repositories;
            }

            console.log('🕒 [POPULARITY] Cache expired');
            return null;

        } catch (error) {
            // Cache doesn't exist or is invalid
            return null;
        }
    }

    /**
     * Get GitHub API headers
     */
    getGithubHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Coder1-IDE-Preloader'
        };

        if (this.githubToken) {
            headers['Authorization'] = `token ${this.githubToken}`;
        }

        return headers;
    }

    /**
     * Enforce rate limiting
     */
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;

        if (timeSinceLastCall < this.minApiInterval) {
            await this.delay(this.minApiInterval - timeSinceLastCall);
        }

        this.lastApiCall = Date.now();
    }

    /**
     * Get date one week ago (ISO format)
     */
    getDateWeekAgo() {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    }

    /**
     * Helper: Delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get repository statistics for analytics
     */
    async getPopularityStats() {
        try {
            const repositories = await this.getPopularRepositories();
            
            const stats = {
                total: repositories.length,
                byLanguage: {},
                byCategory: {},
                averageStars: 0,
                topRepositories: repositories.slice(0, 10).map(r => ({
                    name: r.full_name,
                    stars: r.stars,
                    language: r.language
                }))
            };

            // Calculate statistics
            let totalStars = 0;
            repositories.forEach(repo => {
                totalStars += repo.stars || 0;
                
                // By language
                const lang = repo.language || 'Unknown';
                stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
                
                // By category
                const cat = repo.category || 'other';
                stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
            });

            stats.averageStars = Math.round(totalStars / repositories.length);

            return stats;

        } catch (error) {
            console.error('❌ [POPULARITY] Failed to get statistics:', error);
            return null;
        }
    }
}

// Export singleton instance
let globalService = null;

function getInstance() {
    if (!globalService) {
        globalService = new RepositoryPopularityService();
    }
    return globalService;
}

module.exports = {
    RepositoryPopularityService,
    getInstance
};