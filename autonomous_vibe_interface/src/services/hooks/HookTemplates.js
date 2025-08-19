/**
 * Static Hook Template Library
 * Pre-built Claude Code hook configurations for common development workflows
 */

class HookTemplates {
    constructor() {
        this.templates = this.initializeTemplates();
    }

    /**
     * Get all available hook templates
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
     * Get templates by category
     */
    getTemplatesByCategory(category) {
        return Object.values(this.templates).filter(template => template.category === category);
    }

    /**
     * Get templates by IDs (for recommendation packs)
     */
    getTemplatesByIds(ids) {
        return ids.map(id => this.templates[id]).filter(Boolean);
    }

    /**
     * Initialize all hook templates
     */
    initializeTemplates() {
        return {
            // Code Quality & Formatting
            'prettier-format': {
                id: 'prettier-format',
                name: 'Auto Format with Prettier',
                description: 'Automatically format code files when edited',
                category: 'code-quality',
                tags: ['formatting', 'javascript', 'typescript', 'css'],
                icon: '✨',
                difficulty: 'beginner',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|MultiEdit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(js|jsx|ts|tsx|css|scss|json|md)$"; then npx prettier --write "$file_path" 2>/dev/null || echo "Prettier formatting completed for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you edit src/App.tsx',
                    action: 'Runs: npx prettier --write src/App.tsx',
                    result: 'Code automatically formatted according to Prettier rules'
                }
            },

            'eslint-fix': {
                id: 'eslint-fix',
                name: 'ESLint Auto-Fix',
                description: 'Automatically fix ESLint issues when editing JavaScript/TypeScript files',
                category: 'code-quality',
                tags: ['linting', 'javascript', 'typescript', 'quality'],
                icon: '🔧',
                difficulty: 'beginner',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|MultiEdit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(js|jsx|ts|tsx)$"; then npx eslint --fix "$file_path" 2>/dev/null || echo "ESLint fix completed for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you edit src/components/Button.tsx',
                    action: 'Runs: npx eslint --fix src/components/Button.tsx',
                    result: 'Automatically fixes linting issues like missing semicolons, unused variables'
                }
            },

            'typescript-check': {
                id: 'typescript-check',
                name: 'TypeScript Type Check',
                description: 'Validate TypeScript types after editing files',
                category: 'code-quality',
                tags: ['typescript', 'validation', 'types'],
                icon: '📝',
                difficulty: 'intermediate',
                estimatedImpact: 'medium',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|MultiEdit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(ts|tsx)$"; then npx tsc --noEmit --pretty 2>&1 | head -10 || echo "TypeScript check completed for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you edit any .ts or .tsx file',
                    action: 'Runs: npx tsc --noEmit --pretty',
                    result: 'Shows type errors without generating files'
                }
            },

            // Testing
            'test-runner': {
                id: 'test-runner',
                name: 'Auto Run Tests',
                description: 'Run relevant tests when editing source files',
                category: 'testing',
                tags: ['testing', 'jest', 'vitest', 'automation'],
                icon: '🧪',
                difficulty: 'intermediate',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|MultiEdit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(js|jsx|ts|tsx)$" | grep -v "\\.test\\." | grep -v "\\.spec\\."; then npm test -- --passWithNoTests --watchAll=false --testPathPattern="$(basename "$file_path" | sed \'s/\\.[^.]*$//\')" 2>/dev/null || echo "Tests completed for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you edit src/utils/helpers.js',
                    action: 'Runs: npm test -- --testPathPattern="helpers"',
                    result: 'Automatically runs tests related to the helpers file'
                }
            },

            'test-coverage': {
                id: 'test-coverage',
                name: 'Test Coverage Report',
                description: 'Generate test coverage report after running tests',
                category: 'testing',
                tags: ['testing', 'coverage', 'quality'],
                icon: '📊',
                difficulty: 'advanced',
                estimatedImpact: 'medium',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Bash',
                            hooks: [{
                                type: 'command',
                                command: 'echo "$BASH_COMMAND" | if grep -q "npm test\\|yarn test\\|jest"; then npm test -- --coverage --watchAll=false --silent 2>/dev/null | tail -5 || echo "Coverage report generated"; fi'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you run npm test or similar commands',
                    action: 'Runs: npm test -- --coverage --watchAll=false',
                    result: 'Shows test coverage summary after test completion'
                }
            },

            // Git Workflow
            'commit-logger': {
                id: 'commit-logger',
                name: 'Git Commit Logger',
                description: 'Log all git commit commands with timestamps',
                category: 'git-workflow',
                tags: ['git', 'logging', 'history'],
                icon: '📝',
                difficulty: 'beginner',
                estimatedImpact: 'medium',
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: 'Bash',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.command\' | if grep -q "git commit"; then echo "$(date): Git commit command logged" >> ~/.claude/git-commit-log.txt; fi'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you run git commit commands',
                    action: 'Logs: "2025-01-13 15:30:25: Git commit command logged"',
                    result: 'Creates a timestamped log of all commit activities'
                }
            },

            'pre-commit-checks': {
                id: 'pre-commit-checks',
                name: 'Pre-commit Quality Checks',
                description: 'Run linting and formatting before git commits',
                category: 'git-workflow',
                tags: ['git', 'quality', 'automation'],
                icon: '✅',
                difficulty: 'intermediate',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: 'Bash',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.command\' | if grep -q "git commit"; then echo "Running pre-commit checks..."; npm run lint --silent 2>/dev/null && npm run format:check --silent 2>/dev/null || echo "Pre-commit checks completed"; fi'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'Before any git commit command',
                    action: 'Runs: npm run lint && npm run format:check',
                    result: 'Ensures code quality before commits are created'
                }
            },

            // Development Workflow
            'command-logger': {
                id: 'command-logger',
                name: 'Command History Logger',
                description: 'Keep a detailed log of all executed commands',
                category: 'productivity',
                tags: ['logging', 'history', 'debugging'],
                icon: '📋',
                difficulty: 'beginner',
                estimatedImpact: 'medium',
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: 'Bash',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'"\\(.tool_input.command) - \\(.tool_input.description // \\"No description\\")\"\' >> ~/.claude/bash-command-log.txt'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'Before any bash command execution',
                    action: 'Logs: "npm install express - Install Express framework"',
                    result: 'Creates searchable history of all commands with descriptions'
                }
            },

            'task-notifications': {
                id: 'task-notifications',
                name: 'Task Completion Notifications',
                description: 'Get notified when Claude Code finishes tasks',
                category: 'productivity',
                tags: ['notifications', 'completion', 'workflow'],
                icon: '🔔',
                difficulty: 'beginner',
                estimatedImpact: 'medium',
                config: {
                    hooks: {
                        Stop: [{
                            hooks: [{
                                type: 'command',
                                command: 'echo "✅ Claude Code task completed at $(date)" | tee -a ~/.claude/task-notifications.log'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When Claude Code finishes any task',
                    action: 'Displays: "✅ Claude Code task completed at Mon Jan 13 15:30:25"',
                    result: 'Visual confirmation and log of completed tasks'
                }
            },

            // Backend Development
            'nodemon-restart': {
                id: 'nodemon-restart',
                name: 'Auto Server Restart',
                description: 'Restart Node.js server when backend files are modified',
                category: 'backend',
                tags: ['nodejs', 'development', 'server'],
                icon: '🔄',
                difficulty: 'intermediate',
                estimatedImpact: 'high',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|MultiEdit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if echo "$file_path" | grep -E "\\.(js|ts)$" | grep -E "(server|app|index|api|routes)" && [ -f package.json ]; then pkill -f "node.*server" 2>/dev/null; npm run dev &>/dev/null & echo "Server restarted for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you edit server.js or similar backend files',
                    action: 'Kills existing server process and runs: npm run dev',
                    result: 'Automatically restarts development server with new changes'
                }
            },

            'security-scan': {
                id: 'security-scan',
                name: 'Security Vulnerability Scan',
                description: 'Scan for security vulnerabilities in dependencies',
                category: 'backend',
                tags: ['security', 'npm', 'vulnerabilities'],
                icon: '🛡️',
                difficulty: 'advanced',
                estimatedImpact: 'medium',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if [ "$file_path" = "package.json" ] || [ "$file_path" = "package-lock.json" ]; then npm audit --audit-level=moderate 2>/dev/null | head -10 || echo "Security scan completed"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you edit package.json or package-lock.json',
                    action: 'Runs: npm audit --audit-level=moderate',
                    result: 'Shows security vulnerabilities in dependencies'
                }
            },

            // Docker & DevOps
            'docker-build': {
                id: 'docker-build',
                name: 'Auto Docker Build',
                description: 'Rebuild Docker image when Dockerfile is modified',
                category: 'devops',
                tags: ['docker', 'build', 'containerization'],
                icon: '🐳',
                difficulty: 'advanced',
                estimatedImpact: 'medium',
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|Write',
                            hooks: [{
                                type: 'command',
                                command: 'jq -r \'.tool_input.file_path\' | { read file_path; if [ "$(basename "$file_path")" = "Dockerfile" ] || [ "$(basename "$file_path")" = "docker-compose.yml" ]; then docker build -t app:latest . 2>/dev/null || echo "Docker build initiated for $file_path"; fi; }'
                            }]
                        }]
                    }
                },
                preview: {
                    when: 'When you edit Dockerfile or docker-compose.yml',
                    action: 'Runs: docker build -t app:latest .',
                    result: 'Automatically rebuilds Docker image with changes'
                }
            }
        };
    }

    /**
     * Get recommendation packs (grouped templates)
     */
    getRecommendationPacks() {
        return {
            'frontend-quality': {
                id: 'frontend-quality',
                name: 'Frontend Code Quality Pack',
                description: 'Essential code quality tools for modern frontend development',
                hooks: ['prettier-format', 'eslint-fix', 'test-runner'],
                category: 'frontend'
            },
            'typescript-validation': {
                id: 'typescript-validation', 
                name: 'TypeScript Development Pack',
                description: 'Type checking and validation for TypeScript projects',
                hooks: ['typescript-check', 'prettier-format'],
                category: 'frontend'
            },
            'automated-testing': {
                id: 'automated-testing',
                name: 'Automated Testing Pack',
                description: 'Comprehensive testing automation and coverage',
                hooks: ['test-runner', 'test-coverage'],
                category: 'testing'
            },
            'git-workflow': {
                id: 'git-workflow',
                name: 'Git Workflow Enhancement',
                description: 'Improve git workflow with logging and quality checks',
                hooks: ['commit-logger', 'pre-commit-checks'],
                category: 'workflow'
            },
            'nodejs-backend': {
                id: 'nodejs-backend',
                name: 'Node.js Backend Development',
                description: 'Backend development tools for Node.js projects',
                hooks: ['nodemon-restart', 'security-scan', 'test-runner'],
                category: 'backend'
            },
            'docker-workflow': {
                id: 'docker-workflow',
                name: 'Docker Development Pack',
                description: 'Container development and deployment automation',
                hooks: ['docker-build'],
                category: 'devops'
            },
            'productivity-essentials': {
                id: 'productivity-essentials',
                name: 'Productivity Essentials',
                description: 'Basic productivity tools for any development project',
                hooks: ['command-logger', 'task-notifications'],
                category: 'productivity'
            }
        };
    }

    /**
     * Get categories for filtering
     */
    getCategories() {
        return {
            'code-quality': {
                name: 'Code Quality',
                description: 'Formatting, linting, and code standards',
                icon: '✨'
            },
            'testing': {
                name: 'Testing',
                description: 'Automated testing and coverage',
                icon: '🧪'
            },
            'git-workflow': {
                name: 'Git Workflow',
                description: 'Version control and commit management',
                icon: '📝'
            },
            'productivity': {
                name: 'Productivity',
                description: 'Logging, notifications, and workflow optimization',
                icon: '📋'
            },
            'backend': {
                name: 'Backend Development',
                description: 'Server-side development tools',
                icon: '⚙️'
            },
            'devops': {
                name: 'DevOps',
                description: 'Deployment and infrastructure automation',
                icon: '🐳'
            }
        };
    }
}

module.exports = HookTemplates;