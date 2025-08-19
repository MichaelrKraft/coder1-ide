/**
 * SubAgentManager - Manages Claude Code sub-agents
 * 
 * Handles agent lifecycle, configuration, and preset management
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const EventEmitter = require('events');

class SubAgentManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        this.projectRoot = options.projectRoot || process.cwd();
        this.agentsDir = path.join(this.projectRoot, '.claude', 'agents');
        this.userAgentsDir = path.join(process.env.HOME, '.claude', 'agents');
        
        // Cache for loaded agent configurations
        this.agentCache = new Map();
        
        // Preset configurations
        this.presets = {
            'frontend-trio': ['frontend-specialist', 'architect', 'optimizer'],
            'backend-squad': ['backend-specialist', 'architect', 'optimizer'],
            'full-stack': ['architect', 'frontend-specialist', 'backend-specialist'],
            'debug-force': ['debugger', 'implementer', 'optimizer'],
            'default': ['architect', 'implementer', 'optimizer']
        };
        
        // Context detection patterns
        this.contextPatterns = {
            frontend: /\.(jsx?|tsx?|css|scss|sass)$/i,
            backend: /\.(js|ts|py|go|java|rb)$/i,
            database: /\.(sql|prisma|schema)$/i,
            config: /\.(json|yaml|yml|toml|env)$/i,
            test: /\.(test|spec)\.(js|ts|jsx|tsx)$/i
        };
    }

    /**
     * Initialize the manager and load available agents
     */
    async initialize() {
        try {
            // Ensure agents directory exists
            await this.ensureAgentsDirectory();
            
            // Load all available agents
            await this.loadAvailableAgents();
            
            this.logger.info('✅ SubAgentManager initialized');
            this.emit('initialized');
        } catch (error) {
            this.logger.error('Failed to initialize SubAgentManager:', error);
            throw error;
        }
    }

    /**
     * Ensure the agents directory exists
     */
    async ensureAgentsDirectory() {
        try {
            await fs.access(this.agentsDir);
        } catch {
            await fs.mkdir(this.agentsDir, { recursive: true });
            this.logger.info(`Created agents directory: ${this.agentsDir}`);
        }
    }

    /**
     * Load all available agents from project and user directories
     */
    async loadAvailableAgents() {
        const agents = new Map();
        
        // Load project-level agents
        try {
            const projectAgents = await this.loadAgentsFromDirectory(this.agentsDir);
            projectAgents.forEach((config, name) => {
                agents.set(name, { ...config, source: 'project' });
            });
        } catch (error) {
            this.logger.warn('Failed to load project agents:', error.message);
        }
        
        // Load user-level agents (lower priority)
        try {
            const userAgents = await this.loadAgentsFromDirectory(this.userAgentsDir);
            userAgents.forEach((config, name) => {
                if (!agents.has(name)) {
                    agents.set(name, { ...config, source: 'user' });
                }
            });
        } catch (error) {
            this.logger.warn('Failed to load user agents:', error.message);
        }
        
        this.agentCache = agents;
        this.logger.info(`Loaded ${agents.size} agents`);
        return agents;
    }

    /**
     * Load agents from a specific directory
     */
    async loadAgentsFromDirectory(directory) {
        const agents = new Map();
        
        try {
            const files = await fs.readdir(directory);
            const mdFiles = files.filter(f => f.endsWith('.md'));
            
            for (const file of mdFiles) {
                const filePath = path.join(directory, file);
                const config = await this.loadAgentConfig(filePath);
                if (config) {
                    agents.set(config.name, config);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to load agents from ${directory}:`, error);
        }
        
        return agents;
    }

    /**
     * Load a single agent configuration from a markdown file
     */
    async loadAgentConfig(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Parse YAML frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (!frontmatterMatch) {
                this.logger.warn(`No frontmatter found in ${filePath}`);
                return null;
            }
            
            const frontmatter = yaml.load(frontmatterMatch[1]);
            const systemPrompt = content.replace(frontmatterMatch[0], '').trim();
            
            return {
                name: frontmatter.name,
                description: frontmatter.description,
                tools: frontmatter.tools ? frontmatter.tools.split(',').map(t => t.trim()) : null,
                systemPrompt: systemPrompt,
                filePath: filePath
            };
        } catch (error) {
            this.logger.error(`Failed to load agent config from ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Get agent configuration by name
     */
    getAgent(name) {
        return this.agentCache.get(name);
    }

    /**
     * Get all available agents
     */
    getAvailableAgents() {
        return Array.from(this.agentCache.keys());
    }

    /**
     * Get agents for a preset configuration
     */
    getPresetAgents(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }
        
        return preset.map(agentName => {
            const agent = this.getAgent(agentName);
            return agent || { name: agentName, description: 'Standard agent' };
        });
    }

    /**
     * Get available presets
     */
    getAvailablePresets() {
        return Object.keys(this.presets).map(key => ({
            id: key,
            name: this.getPresetDisplayName(key),
            agents: this.presets[key],
            icon: this.getPresetIcon(key)
        }));
    }

    /**
     * Get display name for preset
     */
    getPresetDisplayName(presetId) {
        const names = {
            'frontend-trio': 'Frontend Trio',
            'backend-squad': 'Backend Squad',
            'full-stack': 'Full Stack Team',
            'debug-force': 'Debug Force',
            'default': 'Default Agents'
        };
        return names[presetId] || presetId;
    }

    /**
     * Get icon for preset
     */
    getPresetIcon(presetId) {
        const icons = {
            'frontend-trio': '🎨',
            'backend-squad': '⚙️',
            'full-stack': '🚀',
            'debug-force': '🔍',
            'default': '🤖'
        };
        return icons[presetId] || '📦';
    }

    /**
     * Detect appropriate agents based on context
     */
    detectAgentsForContext(filePath, recentCommands = []) {
        const suggestedAgents = new Set();
        
        // Check file extension
        if (filePath) {
            const ext = path.extname(filePath);
            
            if (this.contextPatterns.frontend.test(ext)) {
                suggestedAgents.add('frontend-specialist');
                suggestedAgents.add('architect');
            }
            
            if (this.contextPatterns.backend.test(ext)) {
                suggestedAgents.add('backend-specialist');
                suggestedAgents.add('architect');
            }
            
            if (this.contextPatterns.database.test(ext)) {
                suggestedAgents.add('backend-specialist');
                suggestedAgents.add('optimizer');
            }
            
            if (this.contextPatterns.test.test(ext)) {
                suggestedAgents.add('debugger');
                suggestedAgents.add('implementer');
            }
        }
        
        // Check recent commands for context clues
        const commandText = recentCommands.join(' ').toLowerCase();
        
        if (commandText.includes('debug') || commandText.includes('error') || commandText.includes('fix')) {
            suggestedAgents.add('debugger');
        }
        
        if (commandText.includes('optimize') || commandText.includes('performance')) {
            suggestedAgents.add('optimizer');
        }
        
        if (commandText.includes('component') || commandText.includes('ui') || commandText.includes('style')) {
            suggestedAgents.add('frontend-specialist');
        }
        
        if (commandText.includes('api') || commandText.includes('database') || commandText.includes('server')) {
            suggestedAgents.add('backend-specialist');
        }
        
        // Default to standard agents if none detected
        if (suggestedAgents.size === 0) {
            return ['architect', 'implementer', 'optimizer'];
        }
        
        // Always include architect for coordination
        if (suggestedAgents.size > 1 && !suggestedAgents.has('architect')) {
            suggestedAgents.add('architect');
        }
        
        return Array.from(suggestedAgents);
    }

    /**
     * Create a custom agent configuration
     */
    async createCustomAgent(name, description, systemPrompt, tools = null) {
        const config = {
            name: name.toLowerCase().replace(/\s+/g, '-'),
            description,
            tools: tools ? tools.join(', ') : undefined
        };
        
        const frontmatter = yaml.dump(config);
        const content = `---\n${frontmatter}---\n\n${systemPrompt}`;
        
        const filePath = path.join(this.agentsDir, `${config.name}.md`);
        await fs.writeFile(filePath, content, 'utf-8');
        
        // Reload agents
        await this.loadAvailableAgents();
        
        this.logger.info(`Created custom agent: ${config.name}`);
        this.emit('agent-created', config);
        
        return config;
    }

    /**
     * Save user preferences
     */
    async savePreferences(preferences) {
        const prefsPath = path.join(this.projectRoot, '.claude', 'agent-preferences.json');
        await fs.writeFile(prefsPath, JSON.stringify(preferences, null, 2), 'utf-8');
        this.emit('preferences-saved', preferences);
    }

    /**
     * Load user preferences
     */
    async loadPreferences() {
        try {
            const prefsPath = path.join(this.projectRoot, '.claude', 'agent-preferences.json');
            const content = await fs.readFile(prefsPath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return {
                recentConfigurations: [],
                favoritePresets: [],
                defaultPreset: 'default'
            };
        }
    }
}

module.exports = SubAgentManager;