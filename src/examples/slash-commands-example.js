/**
 * Slash Commands Example - Session Sharing System
 * 
 * This example demonstrates how to use the new slash command system
 * for sharing sessions, patterns, and solutions between agents.
 */

const { TerminalSlashCommands } = require('../services/terminal-slash-commands');
const { SessionSharingService } = require('../services/session-sharing-service');
const { ShareableSessionLoader } = require('../services/shareable-session-loader');

class SlashCommandsExample {
    constructor() {
        this.terminalCommands = new TerminalSlashCommands();
        this.sharingService = new SessionSharingService();
        this.sessionLoader = new ShareableSessionLoader();
    }

    /**
     * Example: Sharing a session with slash command
     */
    async demonstrateSessionSharing() {
        console.log('🎯 DEMO: Session Sharing with Slash Commands\n');

        // Simulate user typing in terminal
        const command = '/share-session "authentication-implementation" backend frontend security';
        console.log(`Terminal Input: ${command}\n`);

        // Mock session data (would normally come from current session)
        const mockSessionData = {
            id: `session-${Date.now()}`,
            startTime: Date.now() - 3600000, // 1 hour ago
            duration: 3600000,
            totalAgents: 3,
            tasksCompleted: 8,
            agents: {
                'backend-specialist': {
                    workCompleted: [
                        'Created JWT authentication middleware',
                        'Implemented user registration endpoint',
                        'Added password hashing with bcrypt'
                    ],
                    currentState: 'Authentication API 90% complete',
                    nextSteps: [
                        'Add refresh token mechanism',
                        'Implement role-based access control'
                    ],
                    keyDecisions: ['Used JWT for stateless auth', 'Chose bcrypt for password hashing'],
                    lessonsLearned: ['JWT secret rotation is critical', 'Always validate token expiration']
                },
                'frontend-specialist': {
                    workCompleted: [
                        'Built login/signup forms',
                        'Implemented token storage',
                        'Added protected route wrapper'
                    ],
                    currentState: 'Frontend auth flow 80% complete',
                    nextSteps: [
                        'Add password reset flow',
                        'Implement remember me functionality'
                    ]
                },
                'security-specialist': {
                    workCompleted: [
                        'Security audit of auth flow',
                        'Implemented rate limiting',
                        'Added CSRF protection'
                    ],
                    currentState: 'Security hardening complete',
                    nextSteps: [
                        'Add monitoring for failed login attempts'
                    ]
                }
            },
            summary: 'Complete authentication implementation with security hardening'
        };

        // Process the command
        const result = await this.terminalCommands.processCommand(command, { sessionData: mockSessionData });
        
        console.log('Terminal Output:');
        console.log(result.formatted);
        console.log('\n' + '='.repeat(80) + '\n');

        return result;
    }

    /**
     * Example: Sharing a code pattern
     */
    async demonstratePatternSharing() {
        console.log('🧩 DEMO: Pattern Sharing with Slash Commands\n');

        const command = '/share-pattern "jwt-auth-middleware" "Express middleware for JWT token validation"';
        console.log(`Terminal Input: ${command}\n`);

        // Mock pattern data
        const mockPatternData = {
            files: [
                'src/middleware/auth.js',
                'src/utils/jwt.js',
                'tests/auth.test.js'
            ],
            codeSnippets: [
                {
                    file: 'src/middleware/auth.js',
                    content: 'const jwt = require("jsonwebtoken");...'
                }
            ],
            dependencies: ['jsonwebtoken', 'bcryptjs']
        };

        const result = await this.terminalCommands.processCommand(command, { patternData: mockPatternData });
        
        console.log('Terminal Output:');
        console.log(result.formatted);
        console.log('\n' + '='.repeat(80) + '\n');

        return result;
    }

    /**
     * Example: Sharing a solution
     */
    async demonstrateSolutionSharing() {
        console.log('🔧 DEMO: Solution Sharing with Slash Commands\n');

        const command = '/share-solution "cors-production-fix" "Fixed CORS errors in production deployment"';
        console.log(`Terminal Input: ${command}\n`);

        // Mock solution data
        const mockSolutionData = {
            symptoms: [
                'CORS errors in production only',
                'API calls failing from frontend'
            ],
            context: {
                environment: 'production',
                frontend: 'React on Vercel',
                backend: 'Express on Heroku'
            },
            steps: [
                'Updated CORS configuration to include production domain',
                'Added environment-specific CORS origins',
                'Verified preflight request handling'
            ],
            codeChanges: [
                {
                    file: 'src/app.js',
                    change: 'Updated cors({ origin: process.env.FRONTEND_URL })'
                }
            ],
            reasoning: 'Production domain was not in CORS whitelist'
        };

        const result = await this.terminalCommands.processCommand(command, { solutionData: mockSolutionData });
        
        console.log('Terminal Output:');
        console.log(result.formatted);
        console.log('\n' + '='.repeat(80) + '\n');

        return result;
    }

    /**
     * Example: Listing shared items
     */
    async demonstrateListingShared() {
        console.log('📚 DEMO: Listing Shared Items\n');

        // List all items
        let command = '/list-shared';
        console.log(`Terminal Input: ${command}\n`);

        let result = await this.terminalCommands.processCommand(command);
        console.log('Terminal Output:');
        console.log(result.formatted);
        console.log('\n' + '-'.repeat(60) + '\n');

        // List filtered items
        command = '/list-shared backend authentication';
        console.log(`Terminal Input: ${command}\n`);

        result = await this.terminalCommands.processCommand(command);
        console.log('Terminal Output:');
        console.log(result.formatted);
        console.log('\n' + '='.repeat(80) + '\n');

        return result;
    }

    /**
     * Example: Loading a shared item
     */
    async demonstrateLoadingShared() {
        console.log('📖 DEMO: Loading Shared Items\n');

        // First, get list to find an item ID
        const listResult = await this.terminalCommands.processCommand('/list-shared');
        
        if (listResult.success && listResult.items && listResult.items.length > 0) {
            const firstItem = listResult.items[0];
            const command = `/load-shared ${firstItem.id} ${firstItem.type}`;
            
            console.log(`Terminal Input: ${command}\n`);

            const result = await this.terminalCommands.processCommand(command);
            console.log('Terminal Output:');
            console.log(result.formatted);
        } else {
            console.log('No shared items available to load yet.\n');
            console.log('Terminal Input: /load-shared example-123\n');
            console.log('Terminal Output: ❌ Shared item \'example-123\' not found\n');
        }

        console.log('\n' + '='.repeat(80) + '\n');
    }

    /**
     * Example: Getting help
     */
    async demonstrateHelp() {
        console.log('❓ DEMO: Getting Help\n');

        const command = '/help-sharing';
        console.log(`Terminal Input: ${command}\n`);

        const result = await this.terminalCommands.processCommand(command);
        console.log('Terminal Output:');
        console.log(result.formatted);
        console.log('\n' + '='.repeat(80) + '\n');

        return result;
    }

    /**
     * Example: Agent discovering relevant sessions
     */
    async demonstrateAgentDiscovery() {
        console.log('🤖 DEMO: Agent Discovering Relevant Sessions\n');

        // Simulate a frontend agent starting work
        const agentType = 'frontend-specialist';
        const context = {
            task: 'Build user authentication interface',
            technologies: ['react', 'jwt', 'authentication'],
            problemDomain: 'user management'
        };

        console.log(`Agent: ${agentType}`);
        console.log(`Task: ${context.task}`);
        console.log(`Technologies: ${context.technologies.join(', ')}`);
        console.log(`Problem Domain: ${context.problemDomain}\n`);

        // Find relevant sessions
        const relevantItems = await this.sessionLoader.findRelevantSessions(agentType, context);
        
        console.log(`Found ${relevantItems.length} relevant items:\n`);
        
        relevantItems.forEach((item, i) => {
            console.log(`${i + 1}. ${item.label} (${item.type})`);
            console.log(`   Relevance Score: ${item.relevanceScore.toFixed(2)}`);
            console.log(`   Tags: ${item.tags ? item.tags.join(', ') : 'none'}`);
            console.log(`   Created: ${new Date(item.created).toLocaleDateString()}\n`);
        });

        // Get learning prompts
        const learningPrompts = await this.sessionLoader.getSessionLearningPrompts(agentType, context);
        
        if (learningPrompts.hasLearnings) {
            console.log('🧠 Generated Learning Context for Agent:\n');
            console.log(learningPrompts.prompt);
        } else {
            console.log('No relevant learning context found for this agent/task combination.\n');
        }

        console.log('\n' + '='.repeat(80) + '\n');

        return { relevantItems, learningPrompts };
    }

    /**
     * Example: Command parsing and validation
     */
    async demonstrateCommandParsing() {
        console.log('⚙️  DEMO: Command Parsing and Validation\n');

        const testCommands = [
            '/share-session "test-session" frontend backend',
            '/share-pattern "test-pattern"',
            '/share-solution "test-solution" Problem description here',
            '/invalid-command test',
            'regular terminal command',
            '/help-sharing'
        ];

        for (const cmd of testCommands) {
            console.log(`Input: ${cmd}`);
            
            const isSlash = this.terminalCommands.isSlashCommand(cmd);
            console.log(`Is Slash Command: ${isSlash}`);
            
            if (isSlash) {
                try {
                    const result = await this.terminalCommands.processCommand(cmd);
                    console.log(`Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
                    if (!result.success) {
                        console.log(`Error: ${result.message}`);
                    }
                } catch (error) {
                    console.log(`Error: ${error.message}`);
                }
            } else {
                console.log('Result: Not a slash command - would be processed normally');
            }
            
            console.log('');
        }

        console.log('='.repeat(80) + '\n');
    }

    /**
     * Run complete demonstration
     */
    async runCompleteDemo() {
        try {
            console.log('🚀 Session Sharing Slash Commands - Complete Demonstration\n');
            console.log('This demo shows how users can type slash commands in the terminal');
            console.log('to share sessions, patterns, and solutions with other agents.\n');
            console.log('='.repeat(80) + '\n');

            // Run all demonstrations
            await this.demonstrateSessionSharing();
            await this.demonstratePatternSharing();
            await this.demonstrateSolutionSharing();
            await this.demonstrateListingShared();
            await this.demonstrateLoadingShared();
            await this.demonstrateHelp();
            await this.demonstrateAgentDiscovery();
            await this.demonstrateCommandParsing();

            console.log('✅ Complete demonstration finished successfully!');
            console.log('\n🎯 Key Benefits Demonstrated:');
            console.log('• Users can share sessions with simple slash commands');
            console.log('• Agents can discover and load relevant shared knowledge');
            console.log('• Pattern and solution sharing for code reusability');
            console.log('• Intelligent relevance scoring for agent context');
            console.log('• Terminal integration with user-friendly commands');
            console.log('• Comprehensive help system and error handling');

        } catch (error) {
            console.error('❌ Demo failed:', error);
            throw error;
        }
    }
}

// Integration example for terminal/IDE
class TerminalIntegrationExample {
    constructor() {
        this.slashCommands = new TerminalSlashCommands();
    }

    /**
     * Example of how this would integrate with the terminal
     */
    async processTerminalInput(userInput, terminalContext = {}) {
        // Check if it's a slash command
        if (this.slashCommands.isSlashCommand(userInput)) {
            console.log('🎯 Detected slash command, processing...');
            
            // Process the command
            const result = await this.slashCommands.processCommand(userInput, terminalContext);
            
            // Display result in terminal
            if (result.success) {
                console.log(result.formatted);
            } else {
                console.error(result.formatted);
            }
            
            return result;
        } else {
            // Process as normal terminal command
            console.log('Processing as normal terminal command:', userInput);
            return null; // Would be handled by normal terminal processing
        }
    }
}

// Export classes
module.exports = { 
    SlashCommandsExample, 
    TerminalIntegrationExample 
};

// Run example if called directly
if (require.main === module) {
    const example = new SlashCommandsExample();
    example.runCompleteDemo().catch(console.error);
}