/**
 * Context Provider - Missing Information Injection System
 * 
 * Provides missing context, requirements, and information to Claude Code
 * when it gets stuck or confused. Maintains comprehensive project context
 * and intelligently injects it when needed.
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class ContextProvider extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.projectPath = options.projectPath || process.cwd();
        this.sessionId = options.sessionId || `context-${Date.now()}`;
        this.logger = options.logger || console;
        
        // Comprehensive project context
        this.projectContext = {
            // PRD and requirements
            prdContent: null,
            requirements: [],
            userStories: [],
            acceptanceCriteria: [],
            
            // Technical context
            projectType: null,
            framework: null,
            dependencies: [],
            architecture: null,
            
            // File structure
            fileStructure: {},
            keyFiles: [],
            entryPoints: [],
            configFiles: [],
            
            // Implementation context
            claudeMdContent: null,
            todoFiles: [],
            existingCode: {},
            
            // Session context
            completedTasks: [],
            pendingTasks: [],
            currentPhase: null,
            
            // Metadata
            lastUpdated: null,
            contextVersion: '1.0.0'
        };
        
        // Context templates for different scenarios
        this.contextTemplates = {
            initial_setup: {
                priority: ['requirements', 'projectType', 'framework', 'fileStructure'],
                format: 'structured'
            },
            requirements_missing: {
                priority: ['requirements', 'userStories', 'acceptanceCriteria', 'claudeMdContent'],
                format: 'detailed'
            },
            file_confusion: {
                priority: ['fileStructure', 'keyFiles', 'entryPoints', 'configFiles'],
                format: 'tree'
            },
            implementation_stuck: {
                priority: ['currentPhase', 'pendingTasks', 'completedTasks', 'existingCode'],
                format: 'progressive'
            },
            general_confusion: {
                priority: ['requirements', 'projectType', 'fileStructure', 'currentPhase'],
                format: 'comprehensive'
            }
        };
        
        // Statistics
        this.stats = {
            contextInjections: 0,
            contextRefreshes: 0,
            filesScanned: 0,
            requirementsProvided: 0
        };
        
        this.logger.log('📚 ContextProvider: Initialized comprehensive context system');
    }

    /**
     * Initialize context from PRD and project
     */
    async initializeContext(prdContent, options = {}) {
        this.logger.log('🔄 ContextProvider: Initializing project context');
        
        try {
            // Store PRD content
            this.projectContext.prdContent = prdContent;
            
            // Extract requirements and metadata from PRD
            await this.extractFromPRD(prdContent);
            
            // Scan project structure
            await this.scanProjectStructure();
            
            // Load existing CLAUDE.md if present
            await this.loadClaudeMd();
            
            // Scan for TODO files
            await this.scanTodoFiles();
            
            // Identify project characteristics
            await this.identifyProjectCharacteristics();
            
            // Mark context as updated
            this.projectContext.lastUpdated = Date.now();
            
            this.emit('contextInitialized', {
                sessionId: this.sessionId,
                context: this.getContextSummary()
            });
            
            this.logger.log('✅ ContextProvider: Context initialized successfully');
            
            return this.projectContext;
            
        } catch (error) {
            this.logger.error('❌ ContextProvider: Failed to initialize context:', error);
            throw error;
        }
    }

    /**
     * Get context for specific scenario
     */
    async getContextForScenario(scenario, additionalContext = {}) {
        this.logger.log(`📋 ContextProvider: Generating context for ${scenario}`);
        
        // Get template for scenario
        const template = this.contextTemplates[scenario] || this.contextTemplates.general_confusion;
        
        // Build context based on template priorities
        const context = {
            scenario: scenario,
            timestamp: Date.now(),
            content: {}
        };
        
        for (const priority of template.priority) {
            if (this.projectContext[priority]) {
                context.content[priority] = this.projectContext[priority];
            }
        }
        
        // Add additional context if provided
        if (additionalContext) {
            context.additional = additionalContext;
        }
        
        // Format context based on template
        const formattedContext = this.formatContext(context, template.format);
        
        this.stats.contextInjections++;
        
        this.emit('contextProvided', {
            sessionId: this.sessionId,
            scenario: scenario,
            contextSize: JSON.stringify(formattedContext).length
        });
        
        return formattedContext;
    }

    /**
     * Inject context directly to Claude Code
     */
    async injectContext(scenario, claudeCodeProcess) {
        if (!claudeCodeProcess || claudeCodeProcess.killed) {
            this.logger.error('❌ ContextProvider: Cannot inject - process not available');
            return false;
        }
        
        try {
            // Get formatted context for scenario
            const context = await this.getContextForScenario(scenario);
            
            // Convert to message format
            const message = this.convertContextToMessage(context, scenario);
            
            // Send to Claude Code stdin
            claudeCodeProcess.stdin.write(message + '\n');
            
            this.logger.log(`✅ ContextProvider: Injected context for ${scenario}`);
            
            return true;
            
        } catch (error) {
            this.logger.error('❌ ContextProvider: Failed to inject context:', error);
            return false;
        }
    }

    /**
     * Extract information from PRD
     */
    async extractFromPRD(prdContent) {
        // Extract requirements
        this.projectContext.requirements = this.extractRequirements(prdContent);
        
        // Extract user stories
        this.projectContext.userStories = this.extractUserStories(prdContent);
        
        // Extract acceptance criteria
        this.projectContext.acceptanceCriteria = this.extractAcceptanceCriteria(prdContent);
        
        // Identify project type and framework
        this.projectContext.projectType = this.identifyProjectType(prdContent);
        this.projectContext.framework = this.identifyFramework(prdContent);
        
        this.stats.requirementsProvided = this.projectContext.requirements.length;
        
        this.logger.log(`📊 Extracted ${this.projectContext.requirements.length} requirements from PRD`);
    }

    /**
     * Scan project structure
     */
    async scanProjectStructure() {
        this.projectContext.fileStructure = await this.buildFileTree(this.projectPath);
        
        // Identify key files
        this.projectContext.keyFiles = await this.identifyKeyFiles();
        
        // Identify entry points
        this.projectContext.entryPoints = await this.identifyEntryPoints();
        
        // Identify config files
        this.projectContext.configFiles = await this.identifyConfigFiles();
        
        this.stats.filesScanned = await this.countFiles(this.projectContext.fileStructure);
        
        this.logger.log(`📁 Scanned ${this.stats.filesScanned} files in project`);
    }

    /**
     * Build file tree recursively
     */
    async buildFileTree(dirPath, depth = 0, maxDepth = 3) {
        if (depth > maxDepth) return {};
        
        const tree = {};
        
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                // Skip hidden files and node_modules
                if (item.name.startsWith('.') || item.name === 'node_modules') {
                    continue;
                }
                
                const itemPath = path.join(dirPath, item.name);
                
                if (item.isDirectory()) {
                    tree[item.name] = {
                        type: 'directory',
                        children: await this.buildFileTree(itemPath, depth + 1, maxDepth)
                    };
                } else {
                    tree[item.name] = {
                        type: 'file',
                        extension: path.extname(item.name),
                        size: await this.getFileSize(itemPath)
                    };
                }
            }
        } catch (error) {
            this.logger.warn(`⚠️ Could not scan directory: ${dirPath}`);
        }
        
        return tree;
    }

    /**
     * Load CLAUDE.md if it exists
     */
    async loadClaudeMd() {
        const claudeMdPath = path.join(this.projectPath, 'CLAUDE.md');
        
        try {
            this.projectContext.claudeMdContent = await fs.readFile(claudeMdPath, 'utf8');
            this.logger.log('✅ Loaded existing CLAUDE.md file');
            
            // Extract any additional requirements from CLAUDE.md
            const claudeMdRequirements = this.extractRequirements(this.projectContext.claudeMdContent);
            
            // Merge with existing requirements (avoid duplicates)
            const existingReqs = new Set(this.projectContext.requirements);
            claudeMdRequirements.forEach(req => {
                if (!existingReqs.has(req)) {
                    this.projectContext.requirements.push(req);
                }
            });
            
        } catch (error) {
            this.logger.log('📝 CLAUDE.md not found - will be created when needed');
            this.projectContext.claudeMdContent = null;
        }
    }

    /**
     * Scan for TODO files
     */
    async scanTodoFiles() {
        const todoPatterns = ['TODO.md', 'todo.md', 'TASKS.md', 'tasks.md'];
        this.projectContext.todoFiles = [];
        
        for (const pattern of todoPatterns) {
            const todoPath = path.join(this.projectPath, pattern);
            
            try {
                const content = await fs.readFile(todoPath, 'utf8');
                this.projectContext.todoFiles.push({
                    path: pattern,
                    content: content,
                    tasks: this.extractTasks(content)
                });
                
                this.logger.log(`✅ Found TODO file: ${pattern}`);
            } catch (error) {
                // File doesn't exist, continue
            }
        }
    }

    /**
     * Format context based on template format
     */
    formatContext(context, format) {
        switch (format) {
        case 'structured':
            return this.formatStructuredContext(context);
                
        case 'detailed':
            return this.formatDetailedContext(context);
                
        case 'tree':
            return this.formatTreeContext(context);
                
        case 'progressive':
            return this.formatProgressiveContext(context);
                
        case 'comprehensive':
            return this.formatComprehensiveContext(context);
                
        default:
            return context;
        }
    }

    /**
     * Format structured context
     */
    formatStructuredContext(context) {
        const formatted = {
            overview: {},
            requirements: [],
            structure: {},
            nextSteps: []
        };
        
        if (context.content.projectType) {
            formatted.overview.type = context.content.projectType;
        }
        
        if (context.content.framework) {
            formatted.overview.framework = context.content.framework;
        }
        
        if (context.content.requirements) {
            formatted.requirements = context.content.requirements.slice(0, 10);
        }
        
        if (context.content.fileStructure) {
            formatted.structure = this.simplifyFileStructure(context.content.fileStructure);
        }
        
        formatted.nextSteps = [
            'Review the requirements',
            'Create the main application file',
            'Implement core functionality',
            'Test as you build'
        ];
        
        return formatted;
    }

    /**
     * Format detailed context
     */
    formatDetailedContext(context) {
        const formatted = {
            requirements: {
                main: [],
                userStories: [],
                criteria: []
            },
            implementation: {
                guidelines: [],
                bestPractices: []
            }
        };
        
        if (context.content.requirements) {
            formatted.requirements.main = context.content.requirements;
        }
        
        if (context.content.userStories) {
            formatted.requirements.userStories = context.content.userStories;
        }
        
        if (context.content.acceptanceCriteria) {
            formatted.requirements.criteria = context.content.acceptanceCriteria;
        }
        
        formatted.implementation.guidelines = [
            'Follow the requirements exactly',
            'Use clean, modular code',
            'Include error handling',
            'Add appropriate comments'
        ];
        
        formatted.implementation.bestPractices = [
            'Test each feature as you build',
            'Keep functions small and focused',
            'Use meaningful variable names',
            'Follow the project structure'
        ];
        
        return formatted;
    }

    /**
     * Convert context to message for Claude Code
     */
    convertContextToMessage(context, scenario) {
        let message = `\n## Context Update: ${scenario}\n\n`;
        
        if (scenario === 'requirements_missing') {
            message += 'I\'m providing the missing requirements:\n\n';
            
            if (context.requirements && context.requirements.main) {
                message += '### Project Requirements:\n';
                context.requirements.main.forEach((req, index) => {
                    message += `${index + 1}. ${req}\n`;
                });
                message += '\n';
            }
            
            message += 'Please proceed with implementing these requirements.\n';
            
        } else if (scenario === 'file_confusion') {
            message += 'Here\'s the project structure to help you:\n\n';
            
            if (context.structure) {
                message += '```\n';
                message += this.formatFileTreeString(context.structure);
                message += '```\n\n';
            }
            
            message += 'Create new files in the appropriate directories based on their purpose.\n';
            
        } else {
            message += 'Here\'s the context you need:\n\n';
            message += JSON.stringify(context, null, 2);
        }
        
        return message;
    }

    /**
     * Helper methods for extraction
     */
    extractRequirements(content) {
        const requirements = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            // Look for numbered lists
            if (line.match(/^\d+\./)) {
                const req = line.replace(/^\d+\.\s*/, '').trim();
                if (req.length > 10) {
                    requirements.push(req);
                }
            }
            
            // Look for bullet points with substantial content
            if (line.match(/^[-•*]/)) {
                const req = line.replace(/^[-•*]\s*/, '').trim();
                if (req.length > 10 && !req.startsWith('//') && !req.startsWith('#')) {
                    requirements.push(req);
                }
            }
            
            // Look for "must" or "should" statements
            if ((line.includes(' must ') || line.includes(' should ')) && line.length > 20) {
                if (!requirements.includes(line.trim())) {
                    requirements.push(line.trim());
                }
            }
        }
        
        return requirements;
    }

    extractUserStories(content) {
        const stories = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for user story patterns
            if (line.toLowerCase().includes('as a') || line.toLowerCase().includes('user story')) {
                stories.push(line.trim());
                
                // Check next few lines for continuation
                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                    if (lines[j].toLowerCase().includes('i want') || lines[j].toLowerCase().includes('so that')) {
                        stories[stories.length - 1] += ' ' + lines[j].trim();
                    }
                }
            }
        }
        
        return stories;
    }

    extractAcceptanceCriteria(content) {
        const criteria = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.toLowerCase().includes('acceptance') || 
                line.toLowerCase().includes('criteria') ||
                line.toLowerCase().includes('given') ||
                line.toLowerCase().includes('when') ||
                line.toLowerCase().includes('then')) {
                criteria.push(line.trim());
            }
        }
        
        return criteria;
    }

    extractTasks(content) {
        const tasks = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            // Look for task patterns
            if (line.match(/^[-*\[\]]/)) {
                const task = {
                    text: line.replace(/^[-*\[\]]\s*/, '').trim(),
                    completed: line.includes('[x]') || line.includes('[X]')
                };
                
                if (task.text.length > 5) {
                    tasks.push(task);
                }
            }
        }
        
        return tasks;
    }

    identifyProjectType(content) {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('react') || lowerContent.includes('component')) return 'react-app';
        if (lowerContent.includes('api') || lowerContent.includes('rest')) return 'api-server';
        if (lowerContent.includes('website') || lowerContent.includes('landing')) return 'website';
        if (lowerContent.includes('cli') || lowerContent.includes('command')) return 'cli-tool';
        if (lowerContent.includes('library') || lowerContent.includes('package')) return 'library';
        
        return 'general-app';
    }

    identifyFramework(content) {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('react')) return 'React';
        if (lowerContent.includes('vue')) return 'Vue';
        if (lowerContent.includes('angular')) return 'Angular';
        if (lowerContent.includes('express')) return 'Express';
        if (lowerContent.includes('next')) return 'Next.js';
        if (lowerContent.includes('svelte')) return 'Svelte';
        
        return 'Vanilla JavaScript';
    }

    async identifyKeyFiles() {
        const keyFiles = [];
        const importantFiles = [
            'index.js', 'app.js', 'main.js', 'server.js',
            'index.html', 'package.json', 'README.md',
            'src/index.js', 'src/app.js', 'src/main.js'
        ];
        
        for (const file of importantFiles) {
            if (await this.fileExists(path.join(this.projectPath, file))) {
                keyFiles.push(file);
            }
        }
        
        return keyFiles;
    }

    async identifyEntryPoints() {
        const entryPoints = [];
        
        // Check package.json for main entry
        try {
            const packagePath = path.join(this.projectPath, 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            const packageData = JSON.parse(packageContent);
            
            if (packageData.main) {
                entryPoints.push(packageData.main);
            }
            
            if (packageData.scripts) {
                if (packageData.scripts.start) {
                    // Extract file from start script
                    const match = packageData.scripts.start.match(/node\s+(\S+)/);
                    if (match) {
                        entryPoints.push(match[1]);
                    }
                }
            }
        } catch (error) {
            // No package.json or parsing error
        }
        
        // Default entry points if none found
        if (entryPoints.length === 0) {
            const defaults = ['index.js', 'app.js', 'main.js', 'server.js'];
            for (const file of defaults) {
                if (await this.fileExists(path.join(this.projectPath, file))) {
                    entryPoints.push(file);
                    break;
                }
            }
        }
        
        return entryPoints;
    }

    async identifyConfigFiles() {
        const configFiles = [];
        const configPatterns = [
            'package.json', '.env', '.env.example', 'config.js', 'config.json',
            'webpack.config.js', 'babel.config.js', 'tsconfig.json', '.eslintrc'
        ];
        
        for (const pattern of configPatterns) {
            if (await this.fileExists(path.join(this.projectPath, pattern))) {
                configFiles.push(pattern);
            }
        }
        
        return configFiles;
    }

    async identifyProjectCharacteristics() {
        // Check for package.json to get dependencies
        try {
            const packagePath = path.join(this.projectPath, 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            const packageData = JSON.parse(packageContent);
            
            this.projectContext.dependencies = Object.keys(packageData.dependencies || {});
            
            // Refine project type based on dependencies
            if (this.projectContext.dependencies.includes('react')) {
                this.projectContext.projectType = 'react-app';
                this.projectContext.framework = 'React';
            } else if (this.projectContext.dependencies.includes('express')) {
                this.projectContext.projectType = 'api-server';
                this.projectContext.framework = 'Express';
            }
        } catch (error) {
            // No package.json or parsing error
        }
    }

    /**
     * Utility methods
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    async countFiles(tree) {
        let count = 0;
        
        for (const [name, item] of Object.entries(tree)) {
            if (item.type === 'file') {
                count++;
            } else if (item.type === 'directory' && item.children) {
                count += await this.countFiles(item.children);
            }
        }
        
        return count;
    }

    simplifyFileStructure(tree, maxItems = 20) {
        const simplified = {};
        let itemCount = 0;
        
        for (const [name, item] of Object.entries(tree)) {
            if (itemCount >= maxItems) {
                simplified['...'] = 'more files';
                break;
            }
            
            if (item.type === 'file') {
                simplified[name] = 'file';
                itemCount++;
            } else if (item.type === 'directory') {
                simplified[name] = 'directory';
                itemCount++;
            }
        }
        
        return simplified;
    }

    formatFileTreeString(tree, indent = '') {
        let output = '';
        
        for (const [name, item] of Object.entries(tree)) {
            if (typeof item === 'string') {
                output += `${indent}${name}\n`;
            } else if (item.type === 'directory') {
                output += `${indent}${name}/\n`;
                if (item.children) {
                    output += this.formatFileTreeString(item.children, indent + '  ');
                }
            } else {
                output += `${indent}${name}\n`;
            }
        }
        
        return output;
    }

    /**
     * Get context summary for display
     */
    getContextSummary() {
        return {
            hasRequirements: this.projectContext.requirements.length > 0,
            requirementCount: this.projectContext.requirements.length,
            projectType: this.projectContext.projectType,
            framework: this.projectContext.framework,
            fileCount: this.stats.filesScanned,
            hasClaudeMd: !!this.projectContext.claudeMdContent,
            hasTodoFiles: this.projectContext.todoFiles.length > 0,
            keyFiles: this.projectContext.keyFiles,
            lastUpdated: this.projectContext.lastUpdated
        };
    }

    /**
     * Get full context
     */
    getFullContext() {
        return this.projectContext;
    }

    /**
     * Refresh context
     */
    async refreshContext() {
        this.logger.log('🔄 ContextProvider: Refreshing context');
        
        await this.scanProjectStructure();
        await this.loadClaudeMd();
        await this.scanTodoFiles();
        
        this.projectContext.lastUpdated = Date.now();
        this.stats.contextRefreshes++;
        
        this.emit('contextRefreshed', {
            sessionId: this.sessionId,
            summary: this.getContextSummary()
        });
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            contextAge: this.projectContext.lastUpdated ? 
                Date.now() - this.projectContext.lastUpdated : null
        };
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.projectContext = {
            prdContent: null,
            requirements: [],
            userStories: [],
            acceptanceCriteria: [],
            projectType: null,
            framework: null,
            dependencies: [],
            architecture: null,
            fileStructure: {},
            keyFiles: [],
            entryPoints: [],
            configFiles: [],
            claudeMdContent: null,
            todoFiles: [],
            existingCode: {},
            completedTasks: [],
            pendingTasks: [],
            currentPhase: null,
            lastUpdated: null,
            contextVersion: '1.0.0'
        };
        
        this.logger.log('🧹 ContextProvider: Cleaned up resources');
    }
}

module.exports = { ContextProvider };