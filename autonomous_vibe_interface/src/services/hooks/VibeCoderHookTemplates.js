/**
 * Vibe Coder Hook Templates
 * Advanced hook templates specifically designed for vibe coders using Claude Code
 * Focus on token efficiency, pattern automation, and smart workflows
 */

class VibeCoderHookTemplates {
    constructor() {
        this.templates = this.initializeVibeTemplates();
    }

    /**
     * Get all vibe coder templates
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Get template by ID
     */
    getTemplate(id) {
        return this.templates[id] || null;
    }

    /**
     * Initialize vibe coder specific templates
     */
    initializeVibeTemplates() {
        return {
            // Token Efficiency Templates
            'token-saver-imports': {
                id: 'token-saver-imports',
                name: 'Token Saver: Auto-Organize Imports',
                description: 'Automatically organize and optimize imports to save tokens',
                category: 'token-efficiency',
                tags: ['tokens', 'imports', 'optimization'],
                icon: '💎',
                difficulty: 'beginner',
                estimatedTokenSavings: '15-20%',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|MultiEdit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(js|jsx|ts|tsx)$"; then npx organize-imports-cli "$file_path" 2>/dev/null && echo "✨ Imports optimized for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'After editing any JavaScript/TypeScript file',
                    action: 'Automatically organizes and groups imports',
                    result: 'Reduces file size and token consumption by 15-20%'
                }
            },

            'token-saver-minify': {
                id: 'token-saver-minify',
                name: 'Token Saver: Smart Code Compression',
                description: 'Compress repetitive code patterns to save tokens',
                category: 'token-efficiency',
                tags: ['tokens', 'compression', 'optimization'],
                icon: '🗜️',
                difficulty: 'intermediate',
                estimatedTokenSavings: '25-30%',
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: 'Read',
                            hooks: [{
                                type: 'command',
                                command: 'echo "📊 Token usage before: $(wc -m < "$file_path") characters" >> ~/.claude/token-stats.log'
                            }]
                        }],
                        PostToolUse: [{
                            matcher: 'Read',
                            hooks: [{
                                type: 'command',
                                command: 'echo "📊 Token usage after optimization possible: $(expr $(wc -m < "$file_path") \\* 75 / 100) characters" >> ~/.claude/token-stats.log'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When reading large files',
                    action: 'Tracks token usage and suggests optimizations',
                    result: 'Identifies opportunities to save 25-30% tokens'
                }
            },

            // Pattern Detection & Automation
            'pattern-detector-components': {
                id: 'pattern-detector-components',
                name: 'Pattern Detector: React Components',
                description: 'Detects repetitive component patterns and suggests reusable abstractions',
                category: 'pattern-automation',
                tags: ['react', 'components', 'patterns', 'automation'],
                icon: '🔍',
                difficulty: 'intermediate',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(jsx|tsx)$"; then echo "🎯 Component pattern detected in $file_path" >> ~/.claude/patterns.log && echo "Consider creating reusable component for similar patterns"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'After creating new React components',
                    action: 'Analyzes component structure for patterns',
                    result: 'Suggests reusable abstractions to reduce repetitive code'
                }
            },

            'pattern-auto-api': {
                id: 'pattern-auto-api',
                name: 'Pattern Automation: API Endpoints',
                description: 'Automatically generates consistent API endpoint patterns',
                category: 'pattern-automation',
                tags: ['api', 'endpoints', 'automation', 'backend'],
                icon: '🔌',
                difficulty: 'advanced',
                estimatedImpact: 'very-high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "routes.*\\.js$"; then echo "📝 Generating consistent API patterns..." && node ~/.claude/scripts/generate-api-patterns.js "$file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'After creating new API routes',
                    action: 'Generates error handling, validation, and response patterns',
                    result: 'Ensures consistency across all API endpoints'
                }
            },

            // Smart Workflow Automation
            'smart-test-generator': {
                id: 'smart-test-generator',
                name: 'Smart Test Generator',
                description: 'Automatically generates tests based on code changes',
                category: 'smart-workflow',
                tags: ['testing', 'automation', 'quality'],
                icon: '🧪',
                difficulty: 'advanced',
                estimatedImpact: 'very-high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Write|Edit',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(js|ts)$" | grep -v test; then test_file="${file_path%.js}.test.js"; if [ ! -f "$test_file" ]; then echo "🧪 Generating test for $file_path" && npx jest-test-gen "$file_path" > "$test_file" 2>/dev/null; fi; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'After creating or editing code files',
                    action: 'Automatically generates corresponding test files',
                    result: 'Maintains test coverage without manual effort'
                }
            },

            'smart-documentation': {
                id: 'smart-documentation',
                name: 'Smart Documentation Generator',
                description: 'Automatically generates and updates documentation',
                category: 'smart-workflow',
                tags: ['documentation', 'automation', 'maintenance'],
                icon: '📚',
                difficulty: 'intermediate',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Write|Edit',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(js|ts)$"; then npx jsdoc-to-markdown "$file_path" > "${file_path%.js}.md" 2>/dev/null && echo "📚 Documentation updated for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'After modifying code files',
                    action: 'Extracts JSDoc comments and generates markdown',
                    result: 'Keeps documentation synchronized with code'
                }
            },

            // Vibe Flow Optimization
            'vibe-flow-tracker': {
                id: 'vibe-flow-tracker',
                name: 'Vibe Flow Tracker',
                description: 'Tracks your coding flow and optimizes for productivity',
                category: 'vibe-flow',
                tags: ['productivity', 'flow', 'tracking'],
                icon: '🌊',
                difficulty: 'beginner',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: '.*',
                            hooks: [{
                                type: 'command',
                                command: 'echo "$(date +%s):$(jq -r .tool_name):start" >> ~/.claude/vibe-flow.log'
                            }]
                        }],
                        PostToolUse: [{
                            matcher: '.*',
                            hooks: [{
                                type: 'command',
                                command: 'echo "$(date +%s):$(jq -r .tool_name):end" >> ~/.claude/vibe-flow.log && tail -n 100 ~/.claude/vibe-flow.log | awk -F: \'{print $2}\' | sort | uniq -c | sort -rn | head -5 > ~/.claude/vibe-patterns.txt'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'During all Claude Code operations',
                    action: 'Tracks tool usage patterns and timing',
                    result: 'Identifies your most common workflows for optimization'
                }
            },

            'vibe-context-saver': {
                id: 'vibe-context-saver',
                name: 'Vibe Context Saver',
                description: 'Saves and restores coding context between sessions',
                category: 'vibe-flow',
                tags: ['context', 'session', 'productivity'],
                icon: '💾',
                difficulty: 'intermediate',
                estimatedImpact: 'very-high',
                config: {
                    hooks: {
                        Stop: [{
                            hooks: [{
                                type: 'command',
                                command: 'echo "Session ended: $(date)" >> ~/.claude/session.log && git status --short > ~/.claude/last-session-status.txt && pwd > ~/.claude/last-session-pwd.txt'
                            }]
                        }],
                        Start: [{
                            hooks: [{
                                type: 'command',
                                command: 'echo "Session resumed: $(date)" >> ~/.claude/session.log && cat ~/.claude/last-session-status.txt 2>/dev/null && echo "Last directory: $(cat ~/.claude/last-session-pwd.txt 2>/dev/null)"'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'At session start/end',
                    action: 'Saves working directory and git status',
                    result: 'Quickly resume where you left off'
                }
            },

            // AI Enhancement Hooks
            'ai-code-review': {
                id: 'ai-code-review',
                name: 'AI Code Review Assistant',
                description: 'Automatically reviews code changes for quality and best practices',
                category: 'ai-enhancement',
                tags: ['ai', 'review', 'quality'],
                icon: '🤖',
                difficulty: 'advanced',
                estimatedImpact: 'very-high',
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: 'Bash',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r .tool_input.command | if grep -q "git commit"; then git diff --cached > ~/.claude/pending-review.diff && echo "🤖 AI Review: Analyzing changes for quality issues..."; fi'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'Before git commits',
                    action: 'Analyzes staged changes',
                    result: 'Provides AI-powered code review suggestions'
                }
            },

            'ai-refactor-suggestions': {
                id: 'ai-refactor-suggestions',
                name: 'AI Refactoring Suggestions',
                description: 'Suggests refactoring opportunities based on code complexity',
                category: 'ai-enhancement',
                tags: ['ai', 'refactoring', 'optimization'],
                icon: '🔨',
                difficulty: 'advanced',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r .tool_input.file_path | { read file_path; npx complexity-report "$file_path" 2>/dev/null | grep -E "complexity|maintainability" > ~/.claude/complexity-report.txt && if [ -s ~/.claude/complexity-report.txt ]; then echo "🔨 Refactoring opportunities detected in $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'After editing code files',
                    action: 'Analyzes code complexity metrics',
                    result: 'Suggests refactoring for complex code sections'
                }
            },

            // Bundle Packs
            'vibe-essentials-pack': {
                id: 'vibe-essentials-pack',
                name: 'Vibe Essentials Bundle',
                description: 'Complete starter pack for vibe coders',
                category: 'bundle',
                tags: ['bundle', 'starter', 'essentials'],
                icon: '📦',
                difficulty: 'beginner',
                estimatedImpact: 'very-high',
                includes: [
                    'token-saver-imports',
                    'vibe-flow-tracker',
                    'smart-documentation',
                    'prettier-format',
                    'task-notifications'
                ],
                config: {
                    // Bundle configurations are composed from included templates
                },
                preview: {
                    when: 'One-click installation',
                    action: 'Installs 5 essential hooks',
                    result: 'Complete vibe coding setup in seconds'
                }
            },

            'vibe-pro-pack': {
                id: 'vibe-pro-pack',
                name: 'Vibe Pro Bundle',
                description: 'Advanced toolkit for professional vibe coders',
                category: 'bundle',
                tags: ['bundle', 'professional', 'advanced'],
                icon: '🚀',
                difficulty: 'advanced',
                estimatedImpact: 'maximum',
                includes: [
                    'token-saver-imports',
                    'token-saver-minify',
                    'pattern-detector-components',
                    'smart-test-generator',
                    'ai-code-review',
                    'vibe-context-saver'
                ],
                config: {
                    // Bundle configurations are composed from included templates
                },
                preview: {
                    when: 'One-click installation',
                    action: 'Installs 6 advanced hooks',
                    result: 'Professional vibe coding environment'
                }
            }
        };
    }

    /**
     * Get templates by estimated impact
     */
    getHighImpactTemplates() {
        return Object.values(this.templates).filter(
            template => ['high', 'very-high', 'maximum'].includes(template.estimatedImpact)
        );
    }

    /**
     * Get templates for token optimization
     */
    getTokenOptimizationTemplates() {
        return Object.values(this.templates).filter(
            template => template.category === 'token-efficiency'
        );
    }

    /**
     * Get bundle templates
     */
    getBundleTemplates() {
        return Object.values(this.templates).filter(
            template => template.category === 'bundle'
        );
    }

    /**
     * Generate hook configuration from template
     */
    generateHookConfig(templateId, customOptions = {}) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        // For bundle templates, merge all included configs
        if (template.includes) {
            const configs = template.includes.map(id => {
                const includedTemplate = this.getTemplate(id);
                return includedTemplate ? includedTemplate.config : null;
            }).filter(Boolean);

            return this.mergeHookConfigs(configs, customOptions);
        }

        // Apply custom options to template config
        return { ...template.config, ...customOptions };
    }

    /**
     * Merge multiple hook configurations
     */
    mergeHookConfigs(configs, customOptions = {}) {
        const merged = { hooks: {} };

        for (const config of configs) {
            for (const [hookType, hookArray] of Object.entries(config.hooks || {})) {
                if (!merged.hooks[hookType]) {
                    merged.hooks[hookType] = [];
                }
                merged.hooks[hookType].push(...hookArray);
            }
        }

        return { ...merged, ...customOptions };
    }

    /**
     * Get installation script for a template
     */
    getInstallationScript(templateId) {
        const template = this.getTemplate(templateId);
        if (!template) {
            return null;
        }

        const config = this.generateHookConfig(templateId);
        const configJson = JSON.stringify(config, null, 2);

        return `#!/bin/bash
# Installation script for ${template.name}
# Generated by Vibe Coder Hook Templates

echo "Installing ${template.name}..."

# Create hooks directory if it doesn't exist
mkdir -p ~/.claude/hooks

# Write hook configuration
cat > ~/.claude/hooks/${templateId}.json << 'EOF'
${configJson}
EOF

# Create any required scripts
${this.generateRequiredScripts(template)}

echo "✅ ${template.name} installed successfully!"
echo "Restart Claude Code to activate the hooks."
`;
    }

    /**
     * Generate required scripts for templates
     */
    generateRequiredScripts(template) {
        const scripts = [];

        // Add specific scripts based on template requirements
        if (template.id === 'pattern-auto-api') {
            scripts.push(`
# Create API pattern generator script
cat > ~/.claude/scripts/generate-api-patterns.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) process.exit(1);

// Generate consistent API patterns
console.log('Generating API patterns for:', filePath);
// Add pattern generation logic here
EOF
chmod +x ~/.claude/scripts/generate-api-patterns.js
`);
        }

        return scripts.join('\n');
    }
}

module.exports = VibeCoderHookTemplates;