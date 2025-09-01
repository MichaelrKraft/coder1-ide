/**
 * Smart Slash Command Auto-Suggester
 * Monitors terminal usage and automatically suggests creating slash commands
 * when it detects repeated patterns (5+ uses in 10 minutes)
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SmartSlashCommandSuggester extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            frequencyThreshold: 5,        // 5 times
            timeWindow: 10 * 60 * 1000,   // 10 minutes
            minCommandLength: 3,          // Ignore very short commands
            maxSuggestions: 3,            // Max suggestions per session
            enableAutoSuggest: true,
            ...options
        };
        
        // In-memory tracking
        this.commandFrequency = new Map();
        this.timeWindows = new Map();
        this.suggestedCommands = new Set();
        this.createdSlashCommands = new Map();
        
        // Persistence paths
        this.dataDir = path.join(process.cwd(), 'data');
        this.slashCommandsFile = path.join(this.dataDir, 'slash-commands.json');
        this.suggestionsFile = path.join(this.dataDir, 'command-suggestions.json');
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Ensure data directory exists
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Load existing slash commands
            await this.loadSlashCommands();
            
            console.log('🎯 Smart Slash Command Suggester initialized');
            this.emit('initialized');
        } catch (error) {
            console.error('❌ SmartSlashCommandSuggester initialization failed:', error);
            this.emit('error', error);
        }
    }
    
    /**
     * Track a command execution
     */
    trackCommand(command, sessionId = 'default') {
        if (!command || command.length < this.options.minCommandLength) {
            return null;
        }
        
        // Clean and normalize command
        const cleanCommand = this.normalizeCommand(command);
        if (!cleanCommand) return null;
        
        // Skip if already suggested or created
        if (this.suggestedCommands.has(cleanCommand) || this.createdSlashCommands.has(cleanCommand)) {
            return null;
        }
        
        // Update frequency tracking
        const currentCount = this.commandFrequency.get(cleanCommand) || 0;
        this.commandFrequency.set(cleanCommand, currentCount + 1);
        
        // Update time window tracking
        if (!this.timeWindows.has(cleanCommand)) {
            this.timeWindows.set(cleanCommand, []);
        }
        
        const now = Date.now();
        const times = this.timeWindows.get(cleanCommand);
        times.push(now);
        
        // Clean old timestamps outside time window
        const cutoff = now - this.options.timeWindow;
        const recentTimes = times.filter(time => time > cutoff);
        this.timeWindows.set(cleanCommand, recentTimes);
        
        // Check if threshold met
        if (this.shouldSuggestSlashCommand(cleanCommand, recentTimes)) {
            return this.generateSuggestion(cleanCommand, recentTimes.length);
        }
        
        return null;
    }
    
    /**
     * Normalize command for tracking
     */
    normalizeCommand(command) {
        const cleaned = command.trim().toLowerCase();
        
        // Skip very common/basic commands
        const skipCommands = ['ls', 'cd', 'pwd', 'clear', 'exit', 'help', 'man'];
        if (skipCommands.includes(cleaned)) {
            return null;
        }
        
        // Skip commands that are already slash commands
        if (cleaned.startsWith('/')) {
            return null;
        }
        
        // Skip very long commands (likely one-time use)
        if (cleaned.length > 100) {
            return null;
        }
        
        return cleaned;
    }
    
    /**
     * Check if we should suggest a slash command
     */
    shouldSuggestSlashCommand(command, recentTimes) {
        return (
            this.options.enableAutoSuggest &&
            recentTimes.length >= this.options.frequencyThreshold &&
            this.suggestedCommands.size < this.options.maxSuggestions
        );
    }
    
    /**
     * Generate a slash command suggestion
     */
    generateSuggestion(originalCommand, usageCount) {
        const shortName = this.generateShortName(originalCommand);
        const slashCommand = `/${shortName}`;
        
        const suggestion = {
            id: this.generateId(),
            type: 'slash-command-suggestion',
            originalCommand,
            suggestedName: slashCommand,
            shortName,
            usageCount,
            timeWindow: this.options.timeWindow / (1000 * 60), // minutes
            timestamp: new Date().toISOString(),
            message: `🎯 You've used "${originalCommand}" ${usageCount} times in ${this.options.timeWindow / (1000 * 60)} minutes!`,
            suggestion: `Create '${slashCommand}' slash command?`,
            benefits: this.calculateBenefits(originalCommand, usageCount)
        };
        
        // Mark as suggested to prevent duplicate suggestions
        this.suggestedCommands.add(originalCommand);
        
        // Emit suggestion event
        this.emit('suggestion', suggestion);
        
        return suggestion;
    }
    
    /**
     * Generate smart short name for slash command
     */
    generateShortName(command) {
        // Common patterns and their abbreviations
        const patterns = [
            { pattern: /^git commit -m/, short: 'gc' },
            { pattern: /^git push/, short: 'gp' },
            { pattern: /^git status/, short: 'gs' },
            { pattern: /^git pull/, short: 'gl' },
            { pattern: /^git add/, short: 'ga' },
            { pattern: /^npm test/, short: 'test' },
            { pattern: /^npm run dev/, short: 'dev' },
            { pattern: /^npm run build/, short: 'build' },
            { pattern: /^npm start/, short: 'start' },
            { pattern: /^npm install/, short: 'install' },
            { pattern: /^docker build/, short: 'dbuild' },
            { pattern: /^docker run/, short: 'drun' },
            { pattern: /^kubectl/, short: 'k' },
            { pattern: /^python/, short: 'py' },
            { pattern: /^node/, short: 'n' }
        ];
        
        // Check for known patterns
        for (const { pattern, short } of patterns) {
            if (pattern.test(command)) {
                return short;
            }
        }
        
        // Generate from first letters of words
        const words = command.split(/[\s-_]+/).filter(w => w.length > 0);
        if (words.length > 1) {
            return words.map(w => w[0]).join('').substring(0, 4);
        }
        
        // Use first few characters
        return command.replace(/[^a-z0-9]/g, '').substring(0, 4);
    }
    
    /**
     * Calculate benefits of creating slash command
     */
    calculateBenefits(command, usageCount) {
        const savings = {
            charactersPerUse: Math.max(0, command.length - 4), // Assume 4 char slash command
            totalCharactersSaved: 0,
            timePerUse: command.length * 0.1, // Rough estimate: 100ms per character
            totalTimeSaved: 0
        };
        
        savings.totalCharactersSaved = savings.charactersPerUse * usageCount;
        savings.totalTimeSaved = savings.timePerUse * usageCount;
        
        return {
            ...savings,
            efficiency: `${Math.round((savings.charactersPerUse / command.length) * 100)}% fewer keystrokes`,
            timeUnit: savings.totalTimeSaved < 1000 ? 'milliseconds' : 'seconds'
        };
    }
    
    /**
     * Create a slash command from suggestion
     */
    async createSlashCommand(suggestion, userInput = {}) {
        const { originalCommand, suggestedName, shortName } = suggestion;
        
        // Allow user to customize the name
        const finalName = userInput.customName || suggestedName;
        const finalShortName = finalName.replace('/', '');
        
        const slashCommand = {
            id: this.generateId(),
            name: finalName,
            shortName: finalShortName,
            command: originalCommand,
            description: userInput.description || `Quick access to: ${originalCommand}`,
            created: new Date().toISOString(),
            usageCount: 0,
            originalSuggestion: suggestion,
            parameters: this.detectParameters(originalCommand),
            tags: this.generateTags(originalCommand)
        };
        
        // Store the slash command
        this.createdSlashCommands.set(originalCommand, slashCommand);
        
        // Save to persistence
        await this.saveSlashCommands();
        
        // Remove from suggestions
        this.suggestedCommands.delete(originalCommand);
        
        console.log(`✅ Created slash command '${finalName}' for '${originalCommand}'`);
        this.emit('slash-command-created', slashCommand);
        
        return slashCommand;
    }
    
    /**
     * Detect parameters in command for templating
     */
    detectParameters(command) {
        const parameters = [];
        
        // Common parameter patterns
        const patterns = [
            { regex: /(-m\s+["'](.+?)["'])/g, name: 'message', type: 'string' },
            { regex: /(-p\s+\d+)/g, name: 'port', type: 'number' },
            { regex: /(-f\s+\S+)/g, name: 'file', type: 'string' },
            { regex: /(--\w+(?:=\S+)?)/g, name: 'flag', type: 'flag' }
        ];
        
        patterns.forEach(({ regex, name, type }) => {
            const matches = [...command.matchAll(regex)];
            matches.forEach((match, index) => {
                parameters.push({
                    name: `${name}${index > 0 ? index + 1 : ''}`,
                    pattern: match[0],
                    type,
                    placeholder: `{${name}}`
                });
            });
        });
        
        return parameters;
    }
    
    /**
     * Generate tags for categorization
     */
    generateTags(command) {
        const tags = [];
        
        if (command.startsWith('git')) tags.push('git', 'vcs');
        if (command.startsWith('npm')) tags.push('npm', 'node');
        if (command.startsWith('docker')) tags.push('docker', 'container');
        if (command.includes('test')) tags.push('testing');
        if (command.includes('build')) tags.push('build');
        if (command.includes('deploy')) tags.push('deployment');
        
        return tags;
    }
    
    /**
     * Execute a slash command
     */
    async executeSlashCommand(slashName, parameters = {}) {
        // Find the slash command
        const slashCommand = Array.from(this.createdSlashCommands.values())
            .find(cmd => cmd.name === slashName || cmd.shortName === slashName.replace('/', ''));
        
        if (!slashCommand) {
            throw new Error(`Slash command '${slashName}' not found`);
        }
        
        // Build command with parameters
        let command = slashCommand.command;
        
        // Replace parameters if template exists
        if (slashCommand.parameters.length > 0) {
            slashCommand.parameters.forEach(param => {
                if (parameters[param.name]) {
                    command = command.replace(param.pattern, parameters[param.name]);
                }
            });
        }
        
        // Update usage count
        slashCommand.usageCount++;
        await this.saveSlashCommands();
        
        this.emit('slash-command-executed', { slashCommand, command, parameters });
        
        return command;
    }
    
    /**
     * Get all created slash commands
     */
    getSlashCommands() {
        return Array.from(this.createdSlashCommands.values());
    }
    
    /**
     * Get usage statistics
     */
    getStats() {
        const commands = this.getSlashCommands();
        
        return {
            totalSlashCommands: commands.length,
            totalUsage: commands.reduce((sum, cmd) => sum + cmd.usageCount, 0),
            mostUsed: commands.sort((a, b) => b.usageCount - a.usageCount)[0],
            categories: this.getCategorizedCommands(),
            suggestionsOffered: this.suggestedCommands.size
        };
    }
    
    /**
     * Get commands by category
     */
    getCategorizedCommands() {
        const commands = this.getSlashCommands();
        const categories = {};
        
        commands.forEach(cmd => {
            cmd.tags.forEach(tag => {
                if (!categories[tag]) categories[tag] = [];
                categories[tag].push(cmd);
            });
        });
        
        return categories;
    }
    
    /**
     * Load slash commands from persistence
     */
    async loadSlashCommands() {
        try {
            const data = await fs.readFile(this.slashCommandsFile, 'utf8');
            const commands = JSON.parse(data);
            
            // Rebuild the Map from stored data
            this.createdSlashCommands.clear();
            commands.forEach(cmd => {
                this.createdSlashCommands.set(cmd.command, cmd);
            });
            
            console.log(`📚 Loaded ${commands.length} existing slash commands`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn('Warning: Could not load slash commands:', error.message);
            }
        }
    }
    
    /**
     * Save slash commands to persistence
     */
    async saveSlashCommands() {
        try {
            const commands = Array.from(this.createdSlashCommands.values());
            await fs.writeFile(this.slashCommandsFile, JSON.stringify(commands, null, 2));
        } catch (error) {
            console.error('Error saving slash commands:', error);
        }
    }
    
    /**
     * Generate unique ID
     */
    generateId() {
        return crypto.randomBytes(8).toString('hex');
    }
    
    /**
     * Reset tracking (for testing)
     */
    reset() {
        this.commandFrequency.clear();
        this.timeWindows.clear();
        this.suggestedCommands.clear();
    }
    
    /**
     * Clean up old data
     */
    cleanup() {
        const now = Date.now();
        const cutoff = now - this.options.timeWindow;
        
        // Clean time windows
        for (const [command, times] of this.timeWindows.entries()) {
            const recentTimes = times.filter(time => time > cutoff);
            if (recentTimes.length === 0) {
                this.timeWindows.delete(command);
                this.commandFrequency.delete(command);
            } else {
                this.timeWindows.set(command, recentTimes);
            }
        }
    }
}

module.exports = SmartSlashCommandSuggester;