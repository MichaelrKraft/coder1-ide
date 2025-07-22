/**
 * GitHub Rules Manager for Coder1
 * Fetches and processes rules/guidelines from GitHub repository
 * Integrates with Claude Code sessions for autonomous development
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class GitHubRulesManager {
    constructor() {
        this.githubToken = process.env.GITHUB_TOKEN || null;
        this.rulesCache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
        this.rulesConfig = {
            repositories: [],
            defaultRepo: null,
            cacheDir: path.join(__dirname, '../cache/rules'),
            updateInterval: 15 * 60 * 1000 // 15 minutes
        };
        
        this.initializeCache();
        this.startPeriodicUpdates();
    }
    
    async initializeCache() {
        try {
            await fs.mkdir(this.rulesConfig.cacheDir, { recursive: true });
            console.log('[GitHubRules] Cache directory initialized');
        } catch (error) {
            console.error('[GitHubRules] Failed to initialize cache directory:', error);
        }
    }
    
    /**
     * Configure GitHub repository for rules
     * @param {Object} config - Repository configuration
     * @param {string} config.owner - Repository owner
     * @param {string} config.repo - Repository name
     * @param {string} config.branch - Branch to fetch from (default: main)
     * @param {Array} config.paths - Paths to rule documents
     * @param {string} config.type - Repository type (public/private)
     */
    configureRepository(config) {
        const repoConfig = {
            owner: config.owner,
            repo: config.repo,
            branch: config.branch || 'main',
            paths: config.paths || ['README.md', 'docs/', '.cursorrules', '.github/copilot-instructions.md'],
            type: config.type || 'public',
            lastUpdate: null,
            rules: null
        };
        
        this.rulesConfig.repositories.push(repoConfig);
        
        if (!this.rulesConfig.defaultRepo) {
            this.rulesConfig.defaultRepo = repoConfig;
        }
        
        console.log(`[GitHubRules] Repository configured: ${config.owner}/${config.repo}`);
        return repoConfig;
    }
    
    /**
     * Fetch rules from configured GitHub repository
     * @param {string} repoId - Repository identifier (owner/repo)
     * @returns {Promise<Object>} - Rules content and metadata
     */
    async fetchRules(repoId = null) {
        try {
            const repo = repoId ? 
                this.rulesConfig.repositories.find(r => `${r.owner}/${r.repo}` === repoId) :
                this.rulesConfig.defaultRepo;
                
            if (!repo) {
                throw new Error('No repository configured for rules fetching');
            }
            
            // Check cache first
            const cacheKey = `${repo.owner}/${repo.repo}/${repo.branch}`;
            const cached = this.rulesCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
                console.log(`[GitHubRules] Using cached rules for ${cacheKey}`);
                return cached.data;
            }
            
            console.log(`[GitHubRules] Fetching fresh rules from ${cacheKey}`);
            
            const rules = await this.fetchRepositoryRules(repo);
            
            // Update cache
            this.rulesCache.set(cacheKey, {
                data: rules,
                timestamp: Date.now()
            });
            
            // Save to disk cache
            await this.saveToDiskCache(cacheKey, rules);
            
            repo.lastUpdate = Date.now();
            repo.rules = rules;
            
            return rules;
            
        } catch (error) {
            console.error('[GitHubRules] Failed to fetch rules:', error);
            
            // Try to load from disk cache as fallback
            try {
                const fallbackRules = await this.loadFromDiskCache(repoId);
                if (fallbackRules) {
                    console.log('[GitHubRules] Using fallback cache');
                    return fallbackRules;
                }
            } catch (fallbackError) {
                console.error('[GitHubRules] Fallback cache also failed:', fallbackError);
            }
            
            throw error;
        }
    }
    
    /**
     * Fetch rules from specific repository
     * @param {Object} repo - Repository configuration
     * @returns {Promise<Object>} - Rules content
     */
    async fetchRepositoryRules(repo) {
        const rules = {
            repository: `${repo.owner}/${repo.repo}`,
            branch: repo.branch,
            fetchedAt: new Date().toISOString(),
            documents: [],
            processedRules: {
                codingStandards: [],
                architecturePatterns: [],
                securityGuidelines: [],
                projectStructure: [],
                documentation: [],
                general: []
            }
        };
        
        for (const filePath of repo.paths) {
            try {
                const content = await this.fetchFileContent(repo, filePath);
                if (content) {
                    const document = {
                        path: filePath,
                        content: content.content,
                        encoding: content.encoding,
                        size: content.size,
                        sha: content.sha
                    };
                    
                    rules.documents.push(document);
                    
                    // Process and categorize rules
                    const processedContent = this.processRuleDocument(document);
                    this.categorizeRules(processedContent, rules.processedRules);
                }
            } catch (error) {
                console.warn(`[GitHubRules] Failed to fetch ${filePath}:`, error.message);
            }
        }
        
        // Generate Claude Code optimized format
        rules.claudeCodeContext = this.generateClaudeCodeContext(rules);
        
        return rules;
    }
    
    /**
     * Fetch file content from GitHub API
     * @param {Object} repo - Repository configuration
     * @param {string} filePath - File path in repository
     * @returns {Promise<Object>} - File content
     */
    async fetchFileContent(repo, filePath) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Coder1-Rules-Manager'
        };
        
        if (this.githubToken) {
            headers['Authorization'] = `token ${this.githubToken}`;
        }
        
        try {
            // Handle directory paths
            if (filePath.endsWith('/')) {
                return await this.fetchDirectoryContents(repo, filePath, headers);
            }
            
            const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${filePath}?ref=${repo.branch}`;
            const response = await axios.get(url, { headers });
            
            if (response.data.type === 'file') {
                // Decode base64 content
                const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                return {
                    ...response.data,
                    content: content
                };
            }
            
            return null;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`[GitHubRules] File not found: ${filePath}`);
                return null;
            }
            throw error;
        }
    }
    
    /**
     * Fetch directory contents recursively
     * @param {Object} repo - Repository configuration
     * @param {string} dirPath - Directory path
     * @param {Object} headers - Request headers
     * @returns {Promise<Object>} - Combined directory content
     */
    async fetchDirectoryContents(repo, dirPath, headers) {
        try {
            const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${dirPath}?ref=${repo.branch}`;
            const response = await axios.get(url, { headers });
            
            let combinedContent = `# Directory: ${dirPath}\n\n`;
            
            for (const item of response.data) {
                if (item.type === 'file' && this.isRuleFile(item.name)) {
                    const fileContent = await this.fetchFileContent(repo, item.path);
                    if (fileContent) {
                        combinedContent += `## ${item.name}\n\n${fileContent.content}\n\n`;
                    }
                }
            }
            
            return {
                path: dirPath,
                content: combinedContent,
                type: 'directory',
                size: combinedContent.length
            };
        } catch (error) {
            console.error(`[GitHubRules] Failed to fetch directory ${dirPath}:`, error);
            return null;
        }
    }
    
    /**
     * Check if file is likely to contain rules
     * @param {string} filename - File name
     * @returns {boolean} - Whether file likely contains rules
     */
    isRuleFile(filename) {
        const ruleExtensions = ['.md', '.txt', '.rst'];
        const ruleKeywords = ['rule', 'guide', 'standard', 'convention', 'style', 'readme', 'doc'];
        
        const ext = path.extname(filename).toLowerCase();
        const name = filename.toLowerCase();
        
        return ruleExtensions.includes(ext) && 
               ruleKeywords.some(keyword => name.includes(keyword));
    }
    
    /**
     * Process rule document and extract structured information
     * @param {Object} document - Document object
     * @returns {Object} - Processed rule content
     */
    processRuleDocument(document) {
        const content = document.content;
        const processed = {
            path: document.path,
            sections: [],
            rules: [],
            codeExamples: [],
            guidelines: []
        };
        
        // Extract sections (headers)
        const sectionRegex = /^#{1,6}\\s+(.+)$/gm;
        let match;
        while ((match = sectionRegex.exec(content)) !== null) {
            processed.sections.push({
                level: match[0].indexOf(' ') - 1,
                title: match[1].trim(),
                content: this.extractSectionContent(content, match.index)
            });
        }
        
        // Extract rules (numbered lists, bullet points)
        const ruleRegex = /^(?:\\d+\\.|[-*+])\\s+(.+)$/gm;
        while ((match = ruleRegex.exec(content)) !== null) {
            processed.rules.push(match[1].trim());
        }
        
        // Extract code examples
        const codeRegex = /```(\\w*)\\n([\\s\\S]*?)```/g;
        while ((match = codeRegex.exec(content)) !== null) {
            processed.codeExamples.push({
                language: match[1] || 'text',
                code: match[2].trim()
            });
        }
        
        // Extract guidelines (sentences with "should", "must", "avoid", etc.)
        const guidelineRegex = /[^.!?]*(?:should|must|avoid|never|always|prefer|use|don't)[^.!?]*[.!?]/gi;
        const guidelines = content.match(guidelineRegex);
        if (guidelines) {
            processed.guidelines = guidelines.map(g => g.trim());
        }
        
        return processed;
    }
    
    /**
     * Extract content for a specific section
     * @param {string} content - Full document content
     * @param {number} startIndex - Start index of section header
     * @returns {string} - Section content
     */
    extractSectionContent(content, startIndex) {
        const lines = content.split('\\n');
        const startLineIndex = content.substring(0, startIndex).split('\\n').length - 1;
        
        let endLineIndex = lines.length;
        for (let i = startLineIndex + 1; i < lines.length; i++) {
            if (lines[i].match(/^#{1,6}\\s+/)) {
                endLineIndex = i;
                break;
            }
        }
        
        return lines.slice(startLineIndex + 1, endLineIndex).join('\\n').trim();
    }
    
    /**
     * Categorize rules into different types
     * @param {Object} processed - Processed rule content
     * @param {Object} categories - Rule categories to populate
     */
    categorizeRules(processed, categories) {
        const categoryKeywords = {
            codingStandards: ['code', 'style', 'format', 'syntax', 'naming', 'convention'],
            architecturePatterns: ['architecture', 'pattern', 'design', 'structure', 'component'],
            securityGuidelines: ['security', 'auth', 'permission', 'token', 'key', 'secret'],
            projectStructure: ['project', 'folder', 'directory', 'file', 'organization'],
            documentation: ['doc', 'comment', 'readme', 'guide', 'instruction']
        };
        
        // Categorize sections
        processed.sections.forEach(section => {
            const titleLower = section.title.toLowerCase();
            let categorized = false;
            
            for (const [category, keywords] of Object.entries(categoryKeywords)) {
                if (keywords.some(keyword => titleLower.includes(keyword))) {
                    categories[category].push({
                        type: 'section',
                        title: section.title,
                        content: section.content,
                        source: processed.path
                    });
                    categorized = true;
                    break;
                }
            }
            
            if (!categorized) {
                categories.general.push({
                    type: 'section',
                    title: section.title,
                    content: section.content,
                    source: processed.path
                });
            }
        });
        
        // Categorize individual rules
        processed.rules.forEach(rule => {
            const ruleLower = rule.toLowerCase();
            let categorized = false;
            
            for (const [category, keywords] of Object.entries(categoryKeywords)) {
                if (keywords.some(keyword => ruleLower.includes(keyword))) {
                    categories[category].push({
                        type: 'rule',
                        content: rule,
                        source: processed.path
                    });
                    categorized = true;
                    break;
                }
            }
            
            if (!categorized) {
                categories.general.push({
                    type: 'rule',
                    content: rule,
                    source: processed.path
                });
            }
        });
    }
    
    /**
     * Generate Claude Code optimized context
     * @param {Object} rules - Rules object
     * @returns {string} - Formatted context for Claude Code
     */
    generateClaudeCodeContext(rules) {
        let context = `# Development Rules and Guidelines\\n`;
        context += `Repository: ${rules.repository}\\n`;
        context += `Last Updated: ${rules.fetchedAt}\\n\\n`;
        
        // Add coding standards
        if (rules.processedRules.codingStandards.length > 0) {
            context += `## Coding Standards\\n`;
            rules.processedRules.codingStandards.forEach(rule => {
                context += `- ${rule.content}\\n`;
            });
            context += `\\n`;
        }
        
        // Add architecture patterns
        if (rules.processedRules.architecturePatterns.length > 0) {
            context += `## Architecture Patterns\\n`;
            rules.processedRules.architecturePatterns.forEach(rule => {
                context += `- ${rule.content}\\n`;
            });
            context += `\\n`;
        }
        
        // Add security guidelines
        if (rules.processedRules.securityGuidelines.length > 0) {
            context += `## Security Guidelines\\n`;
            rules.processedRules.securityGuidelines.forEach(rule => {
                context += `- ${rule.content}\\n`;
            });
            context += `\\n`;
        }
        
        // Add project structure rules
        if (rules.processedRules.projectStructure.length > 0) {
            context += `## Project Structure\\n`;
            rules.processedRules.projectStructure.forEach(rule => {
                context += `- ${rule.content}\\n`;
            });
            context += `\\n`;
        }
        
        // Add general guidelines
        if (rules.processedRules.general.length > 0) {
            context += `## General Guidelines\\n`;
            rules.processedRules.general.forEach(rule => {
                context += `- ${rule.content}\\n`;
            });
            context += `\\n`;
        }
        
        context += `\\n---\\n`;
        context += `These guidelines should be followed throughout the development process.\\n`;
        context += `Always prioritize code quality, security, and maintainability.\\n`;
        
        return context;
    }
    
    /**
     * Save rules to disk cache
     * @param {string} cacheKey - Cache key
     * @param {Object} rules - Rules object
     */
    async saveToDiskCache(cacheKey, rules) {
        try {
            const filename = `${cacheKey.replace(/\//g, '_')}.json`;
            const filepath = path.join(this.rulesConfig.cacheDir, filename);
            await fs.writeFile(filepath, JSON.stringify(rules, null, 2));
        } catch (error) {
            console.error('[GitHubRules] Failed to save to disk cache:', error);
        }
    }
    
    /**
     * Load rules from disk cache
     * @param {string} cacheKey - Cache key
     * @returns {Promise<Object>} - Cached rules
     */
    async loadFromDiskCache(cacheKey) {
        try {
            const filename = `${cacheKey.replace(/\//g, '_')}.json`;
            const filepath = path.join(this.rulesConfig.cacheDir, filename);
            const data = await fs.readFile(filepath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Start periodic rule updates
     */
    startPeriodicUpdates() {
        setInterval(async () => {
            try {
                for (const repo of this.rulesConfig.repositories) {
                    const cacheKey = `${repo.owner}/${repo.repo}`;
                    console.log(`[GitHubRules] Updating rules for ${cacheKey}`);
                    await this.fetchRules(cacheKey);
                }
            } catch (error) {
                console.error('[GitHubRules] Periodic update failed:', error);
            }
        }, this.rulesConfig.updateInterval);
    }
    
    /**
     * Get rules for Claude Code session
     * @param {string} sessionId - Session identifier
     * @param {string} projectType - Type of project (web, api, etc.)
     * @returns {Promise<string>} - Formatted rules context
     */
    async getRulesForSession(sessionId, projectType = 'general') {
        try {
            const rules = await this.fetchRules();
            
            if (!rules) {
                return 'No specific rules configured. Follow general best practices.';
            }
            
            // Customize rules based on project type
            let context = rules.claudeCodeContext;
            
            if (projectType === 'web') {
                context += `\\n## Web Development Specific Guidelines\\n`;
                context += `- Follow responsive design principles\\n`;
                context += `- Ensure accessibility compliance\\n`;
                context += `- Optimize for performance\\n`;
            } else if (projectType === 'api') {
                context += `\\n## API Development Specific Guidelines\\n`;
                context += `- Follow RESTful principles\\n`;
                context += `- Implement proper error handling\\n`;
                context += `- Add comprehensive validation\\n`;
            }
            
            console.log(`[GitHubRules] Rules provided for session ${sessionId} (${projectType})`);
            return context;
            
        } catch (error) {
            console.error('[GitHubRules] Failed to get rules for session:', error);
            return 'Error loading custom rules. Follow general best practices.';
        }
    }
    
    /**
     * Update CLAUDE.md files with GitHub rules
     * @param {string} claudeMdPath - Path to CLAUDE.md file
     * @returns {Promise<void>}
     */
    async updateClaudeMd(claudeMdPath) {
        try {
            const rules = await this.fetchRules();
            if (!rules) return;
            
            // Read existing CLAUDE.md
            let existingContent = '';
            try {
                existingContent = await fs.readFile(claudeMdPath, 'utf-8');
            } catch (error) {
                // File doesn't exist, create new one
                existingContent = `# CLAUDE.md\\n\\nThis file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.\\n\\n`;
            }
            
            // Add GitHub rules section
            const rulesSection = `\\n## GitHub Repository Rules Integration\\n\\n`;
            const rulesContent = rules.claudeCodeContext;
            
            // Remove existing rules section if present
            const rulesSectionRegex = /\\n## GitHub Repository Rules Integration[\\s\\S]*?(?=\\n## |$)/;
            existingContent = existingContent.replace(rulesSectionRegex, '');
            
            // Append new rules section
            const updatedContent = existingContent + rulesSection + rulesContent;
            
            // Write updated CLAUDE.md
            await fs.writeFile(claudeMdPath, updatedContent);
            console.log(`[GitHubRules] Updated CLAUDE.md at ${claudeMdPath}`);
            
        } catch (error) {
            console.error('[GitHubRules] Failed to update CLAUDE.md:', error);
        }
    }
}

module.exports = GitHubRulesManager;