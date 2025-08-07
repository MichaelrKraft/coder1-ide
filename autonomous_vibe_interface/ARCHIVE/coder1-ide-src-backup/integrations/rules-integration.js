/**
 * Rules Integration Layer for Coder1
 * Connects GitHub Rules Manager with Coder1 systems
 */

const GitHubRulesManager = require('./github-rules-manager');
const { rulesConfig, getEnvironmentConfig } = require('../config/rules-config');
const path = require('path');
const fs = require('fs').promises;

class RulesIntegration {
    constructor() {
        this.rulesManager = new GitHubRulesManager();
        this.config = getEnvironmentConfig(process.env.NODE_ENV || 'development');
        this.isInitialized = false;
        this.activeRules = null;
        this.sessionRules = new Map(); // Store rules per session
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('[RulesIntegration] Initializing rules integration...');
            
            // Configure repositories from config
            this.config.repositories.forEach(repo => {
                if (repo.enabled) {
                    this.rulesManager.configureRepository(repo);
                    console.log(`[RulesIntegration] Configured repository: ${repo.owner}/${repo.repo}`);
                }
            });
            
            // Load initial rules if configured
            if (this.config.updates.onStartup && this.config.repositories.length > 0) {
                await this.loadInitialRules();
            }
            
            // Update CLAUDE.md files if enabled
            if (this.config.integration.claudeCode.appendToClaudeMd) {
                await this.updateAllClaudeMdFiles();
            }
            
            this.isInitialized = true;
            console.log('[RulesIntegration] Rules integration initialized successfully');
            
        } catch (error) {
            console.error('[RulesIntegration] Failed to initialize:', error);
        }
    }
    
    async loadInitialRules() {
        try {
            if (this.config.repositories.length > 0) {
                const defaultRepo = this.config.repositories.find(r => r.priority === 1) || this.config.repositories[0];
                this.activeRules = await this.rulesManager.fetchRules(`${defaultRepo.owner}/${defaultRepo.repo}`);
                console.log('[RulesIntegration] Initial rules loaded');
            }
        } catch (error) {
            console.error('[RulesIntegration] Failed to load initial rules:', error);
        }
    }
    
    /**
     * Get rules for a new session
     * @param {string} sessionId - Session identifier
     * @param {Object} sessionData - Session data (project info, etc.)
     * @returns {Promise<string>} - Formatted rules context
     */
    async getRulesForSession(sessionId, sessionData = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            console.log(`[RulesIntegration] Getting rules for session: ${sessionId}`);
            
            // Determine project type from session data
            const projectType = this.detectProjectType(sessionData);
            
            // Get rules from manager
            const rulesContext = await this.rulesManager.getRulesForSession(sessionId, projectType);
            
            // Cache rules for this session
            this.sessionRules.set(sessionId, {
                context: rulesContext,
                projectType: projectType,
                timestamp: Date.now()
            });
            
            // Format for Claude Code
            const formattedRules = this.formatRulesForClaudeCode(rulesContext, sessionData);
            
            return formattedRules;
            
        } catch (error) {
            console.error(`[RulesIntegration] Failed to get rules for session ${sessionId}:`, error);
            return this.getDefaultRules();
        }
    }
    
    /**
     * Detect project type from session data
     * @param {Object} sessionData - Session data
     * @returns {string} - Project type
     */
    detectProjectType(sessionData) {
        const projectName = sessionData.projectName || sessionData.name || '';
        const description = sessionData.description || '';
        const combined = `${projectName} ${description}`.toLowerCase();
        
        if (combined.includes('web') || combined.includes('frontend') || combined.includes('react') || combined.includes('vue')) {
            return 'web';
        } else if (combined.includes('api') || combined.includes('backend') || combined.includes('server')) {
            return 'api';
        } else if (combined.includes('mobile') || combined.includes('app') || combined.includes('ios') || combined.includes('android')) {
            return 'mobile';
        } else if (combined.includes('data') || combined.includes('analytics') || combined.includes('ml') || combined.includes('ai')) {
            return 'data';
        }
        
        return 'general';
    }
    
    /**
     * Format rules for Claude Code consumption
     * @param {string} rulesContext - Raw rules context
     * @param {Object} sessionData - Session data
     * @returns {string} - Formatted rules
     */
    formatRulesForClaudeCode(rulesContext, sessionData) {
        const template = this.config.integration.claudeCode.contextTemplate;
        const projectName = sessionData.projectName || sessionData.name || 'Unknown Project';
        
        let formatted = '';
        
        if (template === 'detailed') {
            formatted = `# Project Development Guidelines\\n\\n`;
            formatted += `**Project**: ${projectName}\\n`;
            formatted += `**Generated**: ${new Date().toISOString()}\\n\\n`;
            formatted += `## Important: Follow These Rules During Development\\n\\n`;
            formatted += `${rulesContext}\\n\\n`;
            formatted += `## Autonomous Development Instructions\\n\\n`;
            formatted += `- Apply these guidelines to all code changes\\n`;
            formatted += `- Prioritize code quality and maintainability\\n`;
            formatted += `- Ask for clarification if rules conflict\\n`;
            formatted += `- Document any deviations with reasoning\\n\\n`;
        } else {
            // Summary template
            formatted = `# Development Guidelines for ${projectName}\\n\\n`;
            formatted += this.extractKeyRules(rulesContext);
        }
        
        return formatted;
    }
    
    /**
     * Extract key rules for summary template
     * @param {string} rulesContext - Full rules context
     * @returns {string} - Key rules summary
     */
    extractKeyRules(rulesContext) {
        const lines = rulesContext.split('\\n');
        const keyRules = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') && (
                trimmed.includes('must') || 
                trimmed.includes('always') || 
                trimmed.includes('never') ||
                trimmed.includes('required')
            )) {
                keyRules.push(trimmed);
            }
        });
        
        return keyRules.length > 0 ? keyRules.join('\\n') + '\\n' : rulesContext;
    }
    
    /**
     * Get default rules when GitHub rules are unavailable
     * @returns {string} - Default rules
     */
    getDefaultRules() {
        return `# Default Development Guidelines\\n\\n` +
               `## Code Quality\\n` +
               `- Write clean, readable, and maintainable code\\n` +
               `- Follow consistent naming conventions\\n` +
               `- Add comments for complex logic\\n` +
               `- Handle errors gracefully\\n\\n` +
               `## Security\\n` +
               `- Never commit secrets or API keys\\n` +
               `- Validate all user inputs\\n` +
               `- Use HTTPS for all communications\\n\\n` +
               `## Testing\\n` +
               `- Write unit tests for new functionality\\n` +
               `- Test edge cases and error conditions\\n` +
               `- Maintain good test coverage\\n\\n`;
    }
    
    /**
     * Update all CLAUDE.md files in the project
     */
    async updateAllClaudeMdFiles() {
        try {
            const claudeMdPaths = [
                path.join(__dirname, '../../CLAUDE.md'),
                path.join(__dirname, '../../../CLAUDE.md'),
                // Add project-specific paths as needed
            ];
            
            for (const claudeMdPath of claudeMdPaths) {
                try {
                    await this.rulesManager.updateClaudeMd(claudeMdPath);
                } catch (error) {
                    console.log(`[RulesIntegration] Skipped ${claudeMdPath}: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('[RulesIntegration] Failed to update CLAUDE.md files:', error);
        }
    }
    
    /**
     * Inject rules into Claude Code session
     * @param {string} sessionId - Session ID
     * @param {Object} sessionData - Session data
     * @returns {Promise<boolean>} - Success status
     */
    async injectRulesIntoSession(sessionId, sessionData) {
        try {
            if (!this.config.integration.claudeCode.injectIntoSessions) {
                return false;
            }
            
            const rules = await this.getRulesForSession(sessionId, sessionData);
            
            // Here you would integrate with your WebSocket or session management
            // to send the rules to the Claude Code session
            
            console.log(`[RulesIntegration] Rules injected into session ${sessionId}`);
            return true;
            
        } catch (error) {
            console.error(`[RulesIntegration] Failed to inject rules into session ${sessionId}:`, error);
            return false;
        }
    }
    
    /**
     * Get rules summary for web interface
     * @param {string} sessionId - Session ID
     * @returns {Object} - Rules summary
     */
    getRulesSummary(sessionId) {
        const sessionRules = this.sessionRules.get(sessionId);
        
        if (!sessionRules) {
            return {
                available: false,
                message: 'No rules loaded for this session'
            };
        }
        
        return {
            available: true,
            projectType: sessionRules.projectType,
            lastUpdated: new Date(sessionRules.timestamp).toISOString(),
            ruleCount: this.countRules(sessionRules.context),
            categories: this.extractCategories(sessionRules.context)
        };
    }
    
    /**
     * Count rules in context
     * @param {string} context - Rules context
     * @returns {number} - Number of rules
     */
    countRules(context) {
        const lines = context.split('\\n');
        return lines.filter(line => line.trim().startsWith('- ')).length;
    }
    
    /**
     * Extract rule categories from context
     * @param {string} context - Rules context
     * @returns {Array} - Category names
     */
    extractCategories(context) {
        const categories = [];
        const lines = context.split('\\n');
        
        lines.forEach(line => {
            if (line.startsWith('## ') && !line.includes('Guidelines')) {
                categories.push(line.replace('## ', '').trim());
            }
        });
        
        return categories;
    }
    
    /**
     * Refresh rules for all active sessions
     */
    async refreshAllSessionRules() {
        try {
            console.log('[RulesIntegration] Refreshing rules for all active sessions');
            
            for (const [sessionId, sessionRules] of this.sessionRules.entries()) {
                try {
                    // Re-fetch rules for each session
                    const updatedRules = await this.rulesManager.getRulesForSession(sessionId, sessionRules.projectType);
                    
                    this.sessionRules.set(sessionId, {
                        context: updatedRules,
                        projectType: sessionRules.projectType,
                        timestamp: Date.now()
                    });
                    
                    console.log(`[RulesIntegration] Refreshed rules for session: ${sessionId}`);
                } catch (error) {
                    console.error(`[RulesIntegration] Failed to refresh rules for session ${sessionId}:`, error);
                }
            }
        } catch (error) {
            console.error('[RulesIntegration] Failed to refresh session rules:', error);
        }
    }
    
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiration = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [sessionId, sessionRules] of this.sessionRules.entries()) {
            if (now - sessionRules.timestamp > expiration) {
                this.sessionRules.delete(sessionId);
                console.log(`[RulesIntegration] Cleaned up expired session: ${sessionId}`);
            }
        }
    }
    
    /**
     * Get integration status
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            repositoriesConfigured: this.config.repositories.length,
            activeRepositories: this.config.repositories.filter(r => r.enabled).length,
            activeSessions: this.sessionRules.size,
            rulesLoaded: this.activeRules !== null,
            lastRulesUpdate: this.activeRules?.fetchedAt || null
        };
    }
}

// Create singleton instance
const rulesIntegration = new RulesIntegration();

module.exports = rulesIntegration;