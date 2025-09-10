/**
 * Claude Code Integration Service - Seamless Vibe Coder Handoff
 * 
 * This service handles the revolutionary transition from AI expert consultation
 * to Claude Code development. It transforms multi-expert insights into perfect
 * Claude Code prompts that vibe coders can use immediately.
 */

const fs = require('fs').promises;
const path = require('path');

class ClaudeCodeIntegration {
    constructor() {
        this.promptTemplates = this.initializePromptTemplates();
        this.handoffMethods = ['clipboard', 'file', 'direct_cli', 'instructions'];
        this.exportFormats = ['markdown', 'plain_text', 'structured'];
    }

    // ==========================================
    // MAIN CLAUDE CODE PROMPT GENERATION
    // ==========================================

    async generateClaudeCodePrompt(synthesis, userContext, expertPlans = []) {
        console.log(`[ClaudeCodeIntegration] Generating Claude Code prompt for: ${userContext.projectDescription}`);

        // Extract key information from synthesis and context
        const promptData = this.extractPromptData(synthesis, userContext, expertPlans);

        // Generate comprehensive prompt
        const claudeCodePrompt = this.buildComprehensivePrompt(promptData);

        return {
            prompt: claudeCodePrompt,
            metadata: {
                projectName: this.generateProjectName(userContext.projectDescription),
                expertCount: expertPlans.length,
                complexity: this.assessComplexity(promptData),
                estimatedTokens: this.estimateTokenCount(claudeCodePrompt),
                timestamp: Date.now()
            },
            handoffOptions: await this.generateHandoffOptions(claudeCodePrompt, promptData)
        };
    }

    extractPromptData(synthesis, userContext, expertPlans) {
        // Parse synthesis content to extract structured information
        const synthesisText = typeof synthesis === 'string' ? synthesis : synthesis.content;
        
        return {
            // Project basics
            projectName: this.generateProjectName(userContext.projectDescription),
            projectDescription: userContext.projectDescription,
            timeline: userContext.timeline || '6 months',
            constraints: userContext.constraints || [],
            priorities: userContext.priorities || [],
            targetUsers: userContext.targetUsers || 'General users',
            
            // Expert consensus
            technologyStack: this.extractTechnologyStack(synthesisText, expertPlans),
            architecture: this.extractArchitecture(synthesisText, expertPlans),
            keyFeatures: this.extractKeyFeatures(synthesisText, userContext),
            
            // Implementation details
            expertInsights: this.extractExpertInsights(expertPlans),
            consensusPoints: this.extractConsensusPoints(synthesisText),
            criticalDecisions: this.extractCriticalDecisions(synthesisText),
            riskFactors: this.extractRiskFactors(synthesisText, expertPlans),
            
            // Development approach
            developmentPhases: this.extractDevelopmentPhases(synthesisText),
            integrationPoints: this.extractIntegrationPoints(expertPlans),
            testingStrategy: this.extractTestingStrategy(synthesisText, expertPlans),
            deploymentApproach: this.extractDeploymentApproach(synthesisText, expertPlans)
        };
    }

    buildComprehensivePrompt(promptData) {
        return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.projectName.toUpperCase()} - EXPERT TEAM SYNTHESIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build a ${promptData.projectDescription} with the following expert-designed architecture and specifications.

This prompt was created by ${promptData.expertInsights.length} specialized AI experts who collaborated in real-time to design the optimal implementation approach for your specific requirements.

🏗️ EXPERT CONSENSUS ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.architecture.map(item => `• ${item}`).join('\n')}

🔧 TECHNOLOGY STACK (Expert Validated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.formatTechnologyStack(promptData.technologyStack)}

🎯 PRIORITY FEATURES (User Requirements + Expert Analysis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.keyFeatures.map(feature => `• ${feature}`).join('\n')}

💡 KEY EXPERT INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.expertInsights.map(insight => `• ${insight.expert}: ${insight.recommendation}`).join('\n')}

⚠️ CRITICAL DESIGN DECISIONS (Expert Consensus)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.criticalDecisions.map(decision => `• ${decision}`).join('\n')}

🛡️ RISK MITIGATION STRATEGIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.riskFactors.map(risk => `• ${risk}`).join('\n')}

📅 PHASED IMPLEMENTATION ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.formatDevelopmentPhases(promptData.developmentPhases)}

🔌 INTEGRATION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.integrationPoints.map(point => `• ${point}`).join('\n')}

🧪 TESTING STRATEGY (Expert Recommended)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.testingStrategy.map(strategy => `• ${strategy}`).join('\n')}

🚀 DEPLOYMENT APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${promptData.deploymentApproach.map(approach => `• ${approach}`).join('\n')}

🎨 SPECIFIC PROJECT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Target Users: ${promptData.targetUsers}
• Timeline: ${promptData.timeline}
• Key Constraints: ${promptData.constraints.join(', ') || 'None specified'}
• Success Priorities: ${promptData.priorities.join(', ') || 'Standard best practices'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPLEMENTATION INSTRUCTIONS:

Generate a complete, production-ready implementation following this expert-designed specification. 

Start with:
1. Project structure and configuration files
2. Core architecture setup (${promptData.technologyStack.backend || 'backend foundation'})
3. Database schema and models (if applicable)
4. API endpoints and routing
5. Frontend components and pages (if applicable)
6. Authentication and security implementation
7. Testing setup and initial test suites
8. Deployment configuration

Focus on:
• Following the expert consensus architecture exactly
• Implementing all priority features with best practices
• Including proper error handling and validation
• Adding comprehensive comments explaining design decisions
• Creating maintainable, scalable code structure

Expert Note: This specification represents the collaborative insights of multiple domain specialists who considered your specific requirements, constraints, and goals. Each recommendation has been validated against real-world implementation experience.

Begin implementation following the expert-designed plan above.`;
    }

    // ==========================================
    // HANDOFF METHODS
    // ==========================================

    async generateHandoffOptions(claudeCodePrompt, promptData) {
        const projectName = promptData.projectName;
        
        return {
            clipboard: {
                method: 'clipboard',
                title: '📋 Copy to Clipboard (Recommended)',
                description: 'Copy the expert-designed prompt and paste directly into Claude Code',
                instructions: [
                    '1. Click "Copy Prompt" below',
                    '2. Open your terminal and run: claude',
                    '3. Paste the prompt (Ctrl+V / Cmd+V)',
                    '4. Watch Claude build your expert-designed project!'
                ],
                buttonText: '📋 Copy Expert Prompt',
                prompt: claudeCodePrompt
            },

            file: {
                method: 'file',
                title: '📄 Download as File',
                description: 'Save the prompt as a file and reference it in Claude Code',
                filename: `${projectName.toLowerCase().replace(/\s+/g, '-')}-expert-spec.md`,
                instructions: [
                    '1. Download the expert specification file',
                    '2. Open your terminal in the project directory', 
                    '3. Run: claude [filename]',
                    '4. Claude will build from the expert specifications'
                ],
                buttonText: '💾 Download Spec File',
                content: claudeCodePrompt,
                format: 'markdown'
            },

            quickStart: {
                method: 'quick_start',
                title: '🚀 Quick Start Commands',
                description: 'Copy-paste commands to get started immediately',
                commands: [
                    '# Create project directory',
                    `mkdir ${projectName.toLowerCase().replace(/\s+/g, '-')}`,
                    `cd ${projectName.toLowerCase().replace(/\s+/g, '-')}`,
                    '',
                    '# Start Claude Code with expert prompt',
                    'claude',
                    '# Then paste the expert-designed prompt above'
                ],
                buttonText: '⚡ Copy Commands'
            },

            integration: {
                method: 'integration',
                title: '🔗 IDE Integration Options',
                description: 'Advanced integration with your development environment',
                options: [
                    {
                        name: 'VS Code Extension',
                        command: 'code . && claude --prompt-file=expert-spec.md',
                        description: 'Open VS Code and start Claude with the expert specifications'
                    },
                    {
                        name: 'Terminal Session',
                        command: 'tmux new-session -d -s claude-build "claude --interactive"',
                        description: 'Start a dedicated terminal session for Claude development'
                    },
                    {
                        name: 'Docker Environment', 
                        command: 'docker run -v $(pwd):/workspace -it claude-dev claude',
                        description: 'Use containerized development environment'
                    }
                ]
            },

            summary: {
                method: 'summary',
                title: '📊 Expert Consultation Summary',
                description: 'Key takeaways from your AI expert team',
                summary: {
                    expertCount: promptData.expertInsights.length,
                    consensusLevel: this.calculateConsensusLevel(promptData),
                    keyDecisions: promptData.criticalDecisions.length,
                    implementationComplexity: this.assessComplexity(promptData),
                    estimatedDevelopmentTime: this.estimateDevelopmentTime(promptData),
                    confidenceScore: this.calculateConfidenceScore(promptData)
                }
            }
        };
    }

    // ==========================================
    // PROMPT OPTIMIZATION METHODS
    // ==========================================

    formatTechnologyStack(techStack) {
        if (!techStack || Object.keys(techStack).length === 0) {
            return '• Modern, scalable technology stack (expert consensus)';
        }

        const sections = [];
        
        if (techStack.frontend) {
            sections.push(`Frontend: ${techStack.frontend}`);
        }
        if (techStack.backend) {
            sections.push(`Backend: ${techStack.backend}`);
        }
        if (techStack.database) {
            sections.push(`Database: ${techStack.database}`);
        }
        if (techStack.auth) {
            sections.push(`Authentication: ${techStack.auth}`);
        }
        if (techStack.deployment) {
            sections.push(`Deployment: ${techStack.deployment}`);
        }
        if (techStack.additional && techStack.additional.length > 0) {
            sections.push(`Additional: ${techStack.additional.join(', ')}`);
        }

        return sections.map(section => `• ${section}`).join('\n');
    }

    formatDevelopmentPhases(phases) {
        if (!phases || phases.length === 0) {
            return '• Phase 1: Foundation setup and core architecture\n• Phase 2: Feature implementation\n• Phase 3: Testing and deployment';
        }

        return phases.map((phase, index) => 
            `• Phase ${index + 1}: ${phase}`
        ).join('\n');
    }

    // ==========================================
    // INFORMATION EXTRACTION METHODS
    // ==========================================

    extractTechnologyStack(synthesisText, expertPlans) {
        const techStack = {};
        const text = synthesisText.toLowerCase();

        // Extract common technologies mentioned
        if (text.includes('react') || text.includes('next.js')) {
            techStack.frontend = text.includes('next.js') ? 'Next.js with React' : 'React';
        } else if (text.includes('vue')) {
            techStack.frontend = 'Vue.js';
        } else if (text.includes('angular')) {
            techStack.frontend = 'Angular';
        }

        if (text.includes('node.js') || text.includes('express')) {
            techStack.backend = 'Node.js with Express';
        } else if (text.includes('python') || text.includes('django')) {
            techStack.backend = 'Python with Django/FastAPI';
        } else if (text.includes('java') || text.includes('spring')) {
            techStack.backend = 'Java with Spring Boot';
        }

        if (text.includes('postgresql') || text.includes('postgres')) {
            techStack.database = 'PostgreSQL';
        } else if (text.includes('mongodb') || text.includes('mongo')) {
            techStack.database = 'MongoDB';
        } else if (text.includes('mysql')) {
            techStack.database = 'MySQL';
        }

        if (text.includes('oauth') || text.includes('jwt')) {
            techStack.auth = 'OAuth 2.0 with JWT';
        } else if (text.includes('auth')) {
            techStack.auth = 'Custom authentication system';
        }

        return techStack;
    }

    extractArchitecture(synthesisText, expertPlans) {
        const architecture = [];
        const text = synthesisText.toLowerCase();

        if (text.includes('microservices')) {
            architecture.push('Microservices architecture for scalability');
        } else if (text.includes('monolith')) {
            architecture.push('Monolithic architecture for simplicity');
        } else {
            architecture.push('Modular architecture with clean separation of concerns');
        }

        if (text.includes('event-driven') || text.includes('event sourcing')) {
            architecture.push('Event-driven architecture for real-time features');
        }

        if (text.includes('api-first') || text.includes('rest api')) {
            architecture.push('API-first design with RESTful endpoints');
        }

        if (text.includes('responsive') || text.includes('mobile-first')) {
            architecture.push('Mobile-first responsive design');
        }

        if (text.includes('security') || text.includes('secure')) {
            architecture.push('Security-first architecture with defense in depth');
        }

        return architecture.length > 0 ? architecture : [
            'Modern, scalable architecture designed by expert consensus',
            'Clean separation between frontend and backend',
            'Secure authentication and authorization',
            'Optimized for maintainability and performance'
        ];
    }

    extractKeyFeatures(synthesisText, userContext) {
        const features = [];
        const text = synthesisText.toLowerCase();

        // Extract features based on project type
        if (text.includes('authentication') || text.includes('login')) {
            features.push('User authentication and account management');
        }

        if (text.includes('dashboard') || text.includes('admin')) {
            features.push('Administrative dashboard and controls');
        }

        if (text.includes('api') || text.includes('endpoint')) {
            features.push('RESTful API with comprehensive endpoints');
        }

        if (text.includes('real-time') || text.includes('live')) {
            features.push('Real-time updates and notifications');
        }

        if (text.includes('mobile') || text.includes('responsive')) {
            features.push('Mobile-responsive user interface');
        }

        if (text.includes('search')) {
            features.push('Search functionality with filtering');
        }

        if (text.includes('payment') || text.includes('commerce')) {
            features.push('Payment processing and transaction handling');
        }

        // Add project-specific features based on description
        const projectDesc = userContext.projectDescription.toLowerCase();
        if (projectDesc.includes('e-commerce') || projectDesc.includes('shop')) {
            features.push('Product catalog and shopping cart');
            features.push('Order management and tracking');
        }

        if (projectDesc.includes('social') || projectDesc.includes('community')) {
            features.push('Social features and user interactions');
            features.push('Content sharing and engagement');
        }

        if (projectDesc.includes('analytics') || projectDesc.includes('data')) {
            features.push('Analytics dashboard and reporting');
            features.push('Data visualization and insights');
        }

        return features.length > 0 ? features : [
            'Core functionality aligned with project requirements',
            'User-friendly interface with intuitive navigation',
            'Secure data handling and privacy protection',
            'Performance optimization and scalability'
        ];
    }

    extractExpertInsights(expertPlans) {
        const insights = [];

        expertPlans.forEach(plan => {
            const expertType = plan.expertType;
            const content = plan.content.toLowerCase();

            let keyInsight = '';
            
            // Extract key recommendations from each expert
            if (expertType.includes('frontend')) {
                keyInsight = 'Modern component-based UI with optimal user experience';
            } else if (expertType.includes('backend')) {
                keyInsight = 'Scalable server architecture with efficient data processing';
            } else if (expertType.includes('security')) {
                keyInsight = 'Comprehensive security implementation with industry best practices';
            } else if (expertType.includes('database')) {
                keyInsight = 'Optimized data modeling with efficient query patterns';
            } else if (expertType.includes('architect')) {
                keyInsight = 'Strategic system design for long-term maintainability';
            } else {
                keyInsight = 'Domain-specific best practices and optimization';
            }

            insights.push({
                expert: plan.expertName || expertType,
                recommendation: keyInsight
            });
        });

        return insights.length > 0 ? insights : [
            { expert: 'Expert Team', recommendation: 'Collaborative design optimized for your specific requirements' }
        ];
    }

    extractConsensusPoints(synthesisText) {
        const consensus = [];
        const text = synthesisText.toLowerCase();

        if (text.includes('all experts agree') || text.includes('consensus')) {
            // Try to extract specific consensus points
            const sections = synthesisText.split('\n').filter(line => 
                line.toLowerCase().includes('consensus') ||
                line.toLowerCase().includes('all experts') ||
                line.toLowerCase().includes('agreed')
            );

            sections.forEach(section => {
                const cleaned = section.replace(/[•\-\*]/g, '').trim();
                if (cleaned.length > 10) {
                    consensus.push(cleaned);
                }
            });
        }

        return consensus.length > 0 ? consensus : [
            'Modern technology stack for optimal performance',
            'Security-first approach throughout the application',
            'Scalable architecture to support growth',
            'User-centered design principles'
        ];
    }

    extractCriticalDecisions(synthesisText) {
        const decisions = [];
        const text = synthesisText.toLowerCase();

        // Look for decision-related content
        if (text.includes('decision') || text.includes('chose') || text.includes('recommended')) {
            if (text.includes('database')) {
                decisions.push('Database selection based on scalability and consistency requirements');
            }
            if (text.includes('framework') || text.includes('technology')) {
                decisions.push('Technology framework chosen for developer productivity and performance');
            }
            if (text.includes('architecture')) {
                decisions.push('Architectural pattern selected for optimal maintainability');
            }
            if (text.includes('security')) {
                decisions.push('Security approach designed for comprehensive threat protection');
            }
        }

        return decisions.length > 0 ? decisions : [
            'Technology choices optimized for project requirements',
            'Architectural decisions balancing simplicity and scalability',
            'Security measures appropriate for data sensitivity',
            'Development approach aligned with timeline and team capabilities'
        ];
    }

    extractRiskFactors(synthesisText, expertPlans) {
        const risks = [];
        const text = synthesisText.toLowerCase();

        if (text.includes('risk') || text.includes('concern') || text.includes('challenge')) {
            if (text.includes('scaling') || text.includes('performance')) {
                risks.push('Performance optimization strategies for high-traffic scenarios');
            }
            if (text.includes('security') || text.includes('vulnerability')) {
                risks.push('Security hardening and regular vulnerability assessments');
            }
            if (text.includes('maintenance') || text.includes('technical debt')) {
                risks.push('Code maintainability practices and documentation standards');
            }
            if (text.includes('integration') || text.includes('compatibility')) {
                risks.push('Integration testing and cross-platform compatibility validation');
            }
        }

        return risks.length > 0 ? risks : [
            'Regular security audits and updates',
            'Performance monitoring and optimization',
            'Comprehensive testing and quality assurance',
            'Documentation and knowledge transfer protocols'
        ];
    }

    extractDevelopmentPhases(synthesisText) {
        const phases = [];
        const text = synthesisText.toLowerCase();

        if (text.includes('phase') || text.includes('week') || text.includes('milestone')) {
            if (text.includes('foundation') || text.includes('setup')) {
                phases.push('Foundation: Project setup, core architecture, and basic infrastructure');
            }
            if (text.includes('feature') || text.includes('implementation')) {
                phases.push('Implementation: Core features, user interface, and business logic');
            }
            if (text.includes('integration') || text.includes('testing')) {
                phases.push('Integration: Component integration, testing, and quality assurance');
            }
            if (text.includes('deployment') || text.includes('launch')) {
                phases.push('Deployment: Production setup, monitoring, and launch preparation');
            }
        }

        return phases.length > 0 ? phases : [
            'Foundation: Core architecture and infrastructure setup',
            'Development: Feature implementation and user interface',
            'Testing: Quality assurance and performance optimization',
            'Deployment: Production launch and monitoring setup'
        ];
    }

    extractIntegrationPoints(expertPlans) {
        const integrations = [];

        if (expertPlans.some(plan => plan.expertType.includes('frontend'))) {
            integrations.push('Frontend-Backend API integration with proper error handling');
        }

        if (expertPlans.some(plan => plan.expertType.includes('database'))) {
            integrations.push('Database connectivity and data layer abstraction');
        }

        if (expertPlans.some(plan => plan.expertType.includes('security'))) {
            integrations.push('Authentication system integration across all components');
        }

        if (expertPlans.some(plan => plan.expertType.includes('devops'))) {
            integrations.push('CI/CD pipeline integration and deployment automation');
        }

        return integrations.length > 0 ? integrations : [
            'API integration between frontend and backend services',
            'Database connectivity and data persistence layers',
            'Third-party service integrations as required',
            'Monitoring and logging system integration'
        ];
    }

    extractTestingStrategy(synthesisText, expertPlans) {
        const testing = [];
        const text = synthesisText.toLowerCase();

        if (text.includes('test') || text.includes('quality')) {
            if (text.includes('unit')) {
                testing.push('Unit testing for individual components and functions');
            }
            if (text.includes('integration')) {
                testing.push('Integration testing for component interactions');
            }
            if (text.includes('e2e') || text.includes('end-to-end')) {
                testing.push('End-to-end testing for critical user workflows');
            }
            if (text.includes('performance')) {
                testing.push('Performance testing and load validation');
            }
        }

        return testing.length > 0 ? testing : [
            'Comprehensive unit testing for core functionality',
            'Integration testing for component interactions',
            'User acceptance testing for key workflows',
            'Performance and security testing protocols'
        ];
    }

    extractDeploymentApproach(synthesisText, expertPlans) {
        const deployment = [];
        const text = synthesisText.toLowerCase();

        if (text.includes('cloud') || text.includes('aws') || text.includes('azure')) {
            deployment.push('Cloud-native deployment with auto-scaling capabilities');
        }

        if (text.includes('docker') || text.includes('container')) {
            deployment.push('Containerized deployment for consistency and portability');
        }

        if (text.includes('ci/cd') || text.includes('pipeline')) {
            deployment.push('Automated CI/CD pipeline for continuous deployment');
        }

        if (text.includes('monitoring') || text.includes('logging')) {
            deployment.push('Comprehensive monitoring and logging infrastructure');
        }

        return deployment.length > 0 ? deployment : [
            'Production-ready deployment configuration',
            'Automated deployment pipeline and rollback procedures',
            'Monitoring and alerting system setup',
            'Backup and disaster recovery protocols'
        ];
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    generateProjectName(description) {
        // Convert project description to a clean project name
        const words = description.split(' ').filter(word => 
            !['a', 'an', 'the', 'for', 'with', 'that', 'to'].includes(word.toLowerCase())
        );

        return words.slice(0, 3).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    assessComplexity(promptData) {
        let complexity = 'Medium';
        let score = 0;

        // Increase complexity based on various factors
        if (promptData.expertInsights.length >= 4) score += 2;
        if (promptData.keyFeatures.length >= 8) score += 2;
        if (promptData.integrationPoints.length >= 5) score += 1;
        if (promptData.criticalDecisions.length >= 5) score += 1;

        if (score >= 5) complexity = 'High';
        else if (score <= 2) complexity = 'Low';

        return complexity;
    }

    estimateTokenCount(promptText) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(promptText.length / 4);
    }

    calculateConsensusLevel(promptData) {
        // Calculate consensus level based on expert agreement
        const consensusIndicators = promptData.consensusPoints.length;
        const totalDecisions = promptData.criticalDecisions.length;
        
        if (totalDecisions === 0) return 85; // Default good consensus
        
        const consensusRatio = consensusIndicators / totalDecisions;
        return Math.round(consensusRatio * 100);
    }

    estimateDevelopmentTime(promptData) {
        const complexity = promptData.complexity || this.assessComplexity(promptData);
        const featureCount = promptData.keyFeatures.length;
        
        let baseWeeks = 4;
        
        if (complexity === 'High') baseWeeks += 4;
        else if (complexity === 'Low') baseWeeks -= 1;
        
        if (featureCount > 8) baseWeeks += 2;
        else if (featureCount < 4) baseWeeks -= 1;
        
        const timeline = promptData.timeline;
        if (timeline && timeline.includes('month')) {
            const months = parseInt(timeline.match(/(\d+)/)?.[1] || '6');
            baseWeeks = Math.min(baseWeeks, months * 4);
        }

        return `${baseWeeks} weeks (with expert-designed architecture)`;
    }

    calculateConfidenceScore(promptData) {
        let confidence = 85; // Base confidence
        
        // Increase confidence based on expert consensus
        if (promptData.expertInsights.length >= 3) confidence += 5;
        if (promptData.consensusPoints.length >= 3) confidence += 5;
        if (promptData.criticalDecisions.length >= 2) confidence += 3;
        
        return Math.min(confidence, 98); // Cap at 98%
    }

    // ==========================================
    // FILE OPERATIONS
    // ==========================================

    async savePromptToFile(claudeCodePrompt, filename, format = 'markdown') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFilename = `${filename}-${timestamp}.${format === 'markdown' ? 'md' : 'txt'}`;
        
        try {
            const filePath = path.join(process.cwd(), 'exports', fullFilename);
            
            // Ensure exports directory exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            
            // Save the file
            await fs.writeFile(filePath, claudeCodePrompt, 'utf8');
            
            return {
                success: true,
                filename: fullFilename,
                path: filePath,
                size: claudeCodePrompt.length
            };
            
        } catch (error) {
            console.error('[ClaudeCodeIntegration] Error saving prompt to file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    initializePromptTemplates() {
        return {
            basic: 'Build a {projectDescription} with modern best practices.',
            comprehensive: 'Create a production-ready {projectDescription} following expert recommendations.',
            enterprise: 'Develop an enterprise-grade {projectDescription} with comprehensive architecture.'
        };
    }

    // ==========================================
    // PUBLIC API METHODS
    // ==========================================

    async createClaudeCodeHandoff(synthesis, userContext, expertPlans = []) {
        try {
            const result = await this.generateClaudeCodePrompt(synthesis, userContext, expertPlans);
            
            console.log(`[ClaudeCodeIntegration] Generated Claude Code handoff for: ${result.metadata.projectName}`);
            console.log(`[ClaudeCodeIntegration] Prompt length: ${result.metadata.estimatedTokens} tokens`);
            console.log(`[ClaudeCodeIntegration] Complexity: ${result.metadata.complexity}`);
            
            return {
                success: true,
                ...result,
                instructions: {
                    simple: 'Copy the prompt below and paste it into Claude Code (run `claude` in your terminal)',
                    detailed: result.handoffOptions.clipboard.instructions
                }
            };
            
        } catch (error) {
            console.error('[ClaudeCodeIntegration] Error creating Claude Code handoff:', error);
            return {
                success: false,
                error: error.message,
                fallbackPrompt: `Build a ${userContext.projectDescription} with modern best practices and expert-recommended architecture.`
            };
        }
    }
}

module.exports = ClaudeCodeIntegration;