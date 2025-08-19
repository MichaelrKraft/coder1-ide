/**
 * Hook Configuration Generator
 * Creates properly formatted Claude Code hook configurations in JSON format
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class HookConfigGenerator {
    constructor() {
        this.userSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
        this.projectSettingsPath = path.join(process.cwd(), '.claude', 'settings.json');
        this.projectLocalSettingsPath = path.join(process.cwd(), '.claude', 'settings.local.json');
    }

    /**
     * Generate hook configuration from selected templates
     */
    generateConfiguration(selectedHooks, options = {}) {
        const {
            scope = 'project', // 'user' | 'project' | 'project-local'
            mergeWithExisting = true,
            backupExisting = true
        } = options;

        try {
            // Get the appropriate settings file path
            const settingsPath = this.getSettingsPath(scope);
            
            // Read existing configuration if merging
            let existingConfig = {};
            if (mergeWithExisting && fs.existsSync(settingsPath)) {
                const existingContent = fs.readFileSync(settingsPath, 'utf8');
                existingConfig = JSON.parse(existingContent);
            }

            // Generate new hook configuration
            const hookConfig = this.buildHookConfiguration(selectedHooks);
            
            // Merge configurations
            const finalConfig = this.mergeConfigurations(existingConfig, hookConfig);
            
            // Validate configuration
            const validation = this.validateConfiguration(finalConfig);
            if (!validation.valid) {
                throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
            }

            return {
                success: true,
                config: finalConfig,
                path: settingsPath,
                preview: this.generatePreview(finalConfig),
                instructions: this.generateInstructions(settingsPath, scope)
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                config: null
            };
        }
    }

    /**
     * Build hook configuration from selected hook templates
     */
    buildHookConfiguration(selectedHooks) {
        const HookTemplates = require('./HookTemplates');
        const templates = new HookTemplates();
        
        const config = {
            hooks: {}
        };

        // Initialize hook event types
        const eventTypes = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'];
        eventTypes.forEach(eventType => {
            config.hooks[eventType] = [];
        });

        // Process each selected hook
        selectedHooks.forEach(hookId => {
            const template = templates.getTemplate(hookId);
            if (!template || !template.config || !template.config.hooks) {
                console.warn(`Template ${hookId} not found or invalid`);
                return;
            }

            // Merge hook configurations
            Object.keys(template.config.hooks).forEach(eventType => {
                if (config.hooks[eventType]) {
                    config.hooks[eventType] = config.hooks[eventType].concat(template.config.hooks[eventType]);
                }
            });
        });

        // Remove empty event types
        Object.keys(config.hooks).forEach(eventType => {
            if (config.hooks[eventType].length === 0) {
                delete config.hooks[eventType];
            }
        });

        return config;
    }

    /**
     * Merge new hook configuration with existing settings
     */
    mergeConfigurations(existing, hookConfig) {
        const merged = { ...existing };
        
        if (hookConfig.hooks) {
            if (!merged.hooks) {
                merged.hooks = {};
            }

            Object.keys(hookConfig.hooks).forEach(eventType => {
                if (merged.hooks[eventType]) {
                    // Merge arrays, avoiding duplicates based on matcher
                    const existingMatchers = merged.hooks[eventType].map(h => h.matcher);
                    const newHooks = hookConfig.hooks[eventType].filter(h => 
                        !existingMatchers.includes(h.matcher)
                    );
                    merged.hooks[eventType] = merged.hooks[eventType].concat(newHooks);
                } else {
                    merged.hooks[eventType] = hookConfig.hooks[eventType];
                }
            });
        }

        return merged;
    }

    /**
     * Validate hook configuration
     */
    validateConfiguration(config) {
        const errors = [];

        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be a valid object');
            return { valid: false, errors };
        }

        if (config.hooks) {
            if (typeof config.hooks !== 'object') {
                errors.push('hooks must be an object');
            } else {
                // Validate hook structure
                const validEventTypes = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'];
                
                Object.keys(config.hooks).forEach(eventType => {
                    if (!validEventTypes.includes(eventType)) {
                        errors.push(`Invalid event type: ${eventType}`);
                    }

                    if (!Array.isArray(config.hooks[eventType])) {
                        errors.push(`${eventType} must be an array`);
                    } else {
                        config.hooks[eventType].forEach((hook, index) => {
                            if (!hook.hooks || !Array.isArray(hook.hooks)) {
                                errors.push(`${eventType}[${index}] must have a hooks array`);
                            }
                            
                            if (hook.hooks) {
                                hook.hooks.forEach((subHook, subIndex) => {
                                    if (!subHook.type || !subHook.command) {
                                        errors.push(`${eventType}[${index}].hooks[${subIndex}] must have type and command`);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Get settings file path based on scope
     */
    getSettingsPath(scope) {
        switch (scope) {
            case 'user':
                return this.userSettingsPath;
            case 'project-local':
                return this.projectLocalSettingsPath;
            case 'project':
            default:
                return this.projectSettingsPath;
        }
    }

    /**
     * Generate preview of configuration
     */
    generatePreview(config) {
        const preview = {
            summary: {
                totalHooks: 0,
                eventTypes: [],
                affectedTools: new Set()
            },
            details: []
        };

        if (config.hooks) {
            Object.keys(config.hooks).forEach(eventType => {
                preview.summary.eventTypes.push(eventType);
                
                config.hooks[eventType].forEach(hook => {
                    preview.summary.totalHooks++;
                    
                    if (hook.matcher) {
                        hook.matcher.split('|').forEach(tool => {
                            preview.summary.affectedTools.add(tool.trim());
                        });
                    }

                    preview.details.push({
                        eventType,
                        matcher: hook.matcher || 'All tools',
                        commandCount: hook.hooks ? hook.hooks.length : 0,
                        commands: hook.hooks ? hook.hooks.map(h => h.command) : []
                    });
                });
            });
        }

        preview.summary.affectedTools = Array.from(preview.summary.affectedTools);
        
        return preview;
    }

    /**
     * Generate user instructions for applying the configuration
     */
    generateInstructions(settingsPath, scope) {
        const instructions = {
            steps: [],
            warnings: [],
            tips: []
        };

        // Create directory if needed
        const settingsDir = path.dirname(settingsPath);
        instructions.steps.push(`Ensure directory exists: ${settingsDir}`);
        
        // Backup existing configuration
        if (fs.existsSync(settingsPath)) {
            instructions.steps.push(`Backup existing configuration from: ${settingsPath}`);
            instructions.warnings.push('This will modify your existing Claude Code settings');
        }

        // Apply configuration
        instructions.steps.push(`Save new configuration to: ${settingsPath}`);
        instructions.steps.push('Restart Claude Code to apply changes');

        // Scope-specific instructions
        switch (scope) {
            case 'user':
                instructions.tips.push('User settings apply to all projects');
                instructions.tips.push('Use user settings for personal preferences');
                break;
            case 'project':
                instructions.tips.push('Project settings are shared with team members');
                instructions.tips.push('Commit .claude/settings.json to version control');
                break;
            case 'project-local':
                instructions.tips.push('Local settings are personal and not shared');
                instructions.tips.push('Add .claude/settings.local.json to .gitignore');
                break;
        }

        instructions.tips.push('You can disable individual hooks by editing the configuration');
        instructions.tips.push('Use the Claude Code command /hooks to manage hooks interactively');

        return instructions;
    }

    /**
     * Save configuration to file
     */
    async saveConfiguration(config, settingsPath, options = {}) {
        const { createBackup = true } = options;

        try {
            // Ensure directory exists
            const settingsDir = path.dirname(settingsPath);
            if (!fs.existsSync(settingsDir)) {
                fs.mkdirSync(settingsDir, { recursive: true });
            }

            // Create backup if file exists
            if (createBackup && fs.existsSync(settingsPath)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupPath = `${settingsPath}.backup.${timestamp}`;
                fs.copyFileSync(settingsPath, backupPath);
            }

            // Write new configuration
            const jsonContent = JSON.stringify(config, null, 2);
            fs.writeFileSync(settingsPath, jsonContent, 'utf8');

            return {
                success: true,
                path: settingsPath,
                backup: createBackup ? `${settingsPath}.backup.${Date.now()}` : null
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Read existing configuration
     */
    readConfiguration(scope = 'project') {
        const settingsPath = this.getSettingsPath(scope);
        
        try {
            if (fs.existsSync(settingsPath)) {
                const content = fs.readFileSync(settingsPath, 'utf8');
                return {
                    success: true,
                    config: JSON.parse(content),
                    path: settingsPath
                };
            } else {
                return {
                    success: true,
                    config: {},
                    path: settingsPath
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: settingsPath
            };
        }
    }

    /**
     * Remove specific hooks from configuration
     */
    removeHooks(hookIds, scope = 'project') {
        const HookTemplates = require('./HookTemplates');
        const templates = new HookTemplates();
        
        try {
            const { config, path: settingsPath } = this.readConfiguration(scope);
            
            if (!config.hooks) {
                return { success: true, message: 'No hooks to remove' };
            }

            // Get hook configurations to remove
            const hooksToRemove = hookIds.map(id => templates.getTemplate(id)).filter(Boolean);
            
            // Remove hooks from each event type
            Object.keys(config.hooks).forEach(eventType => {
                config.hooks[eventType] = config.hooks[eventType].filter(hook => {
                    // Check if this hook should be removed
                    return !hooksToRemove.some(removeHook => {
                        const removeEventHooks = removeHook.config?.hooks?.[eventType];
                        return removeEventHooks?.some(rh => rh.matcher === hook.matcher);
                    });
                });

                // Remove empty event types
                if (config.hooks[eventType].length === 0) {
                    delete config.hooks[eventType];
                }
            });

            // Save updated configuration
            const saveResult = this.saveConfiguration(config, settingsPath);
            
            return {
                success: saveResult.success,
                config,
                removedHooks: hookIds,
                message: `Removed ${hookIds.length} hook(s)`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = HookConfigGenerator;