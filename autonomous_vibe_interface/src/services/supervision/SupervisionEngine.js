/**
 * Supervision Engine - Comprehensive AI Project Supervisor
 * 
 * The core orchestrator that transforms supervision from passive monitoring
 * into active AI-supervising-AI project management. Monitors Claude Code
 * execution, provides real-time guidance, handles approvals, and ensures
 * successful project completion from start to finish.
 */

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class SupervisionEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Core configuration
        this.projectPath = options.projectPath || process.cwd();
        this.sessionId = options.sessionId || `supervision-${Date.now()}`;
        this.logger = options.logger || console;
        
        // Supervision state
        this.isActive = false;
        this.claudeCodeProcess = null;
        this.projectContext = {
            prdContent: null,
            claudeMdContent: null,
            requirements: [],
            fileStructure: {},
            currentPhase: 'initializing'
        };
        
        // Workflow tracking
        this.workflow = {
            phases: [
                'prd_analysis',
                'claude_md_creation', 
                'claude_code_launch',
                'requirements_resolution',
                'implementation',
                'validation',
                'completion'
            ],
            currentPhase: 0,
            phaseStartTime: Date.now(),
            interventions: [],
            approvals: []
        };
        
        // Monitoring configuration
        this.monitoringConfig = {
            confusionPatterns: [
                /could you please clarify/i,
                /i'm not sure what you mean/i,
                /what specific.*requirements/i,
                /cannot find.*claude\.md/i,
                /no requirements.*found/i,
                /unclear what/i,
                /need more information/i,
                /don't understand/i
            ],
            questionPatterns: [
                /what.*should.*i.*do/i,
                /which.*file/i,
                /where.*should.*i/i,
                /how.*should.*i/i,
                /what.*next/i
            ],
            errorPatterns: [
                /error/i,
                /failed/i,
                /permission denied/i,
                /file not found/i,
                /command not found/i
            ]
        };
        
        // Intervention statistics
        this.stats = {
            interventionsCount: 0,
            questionsAnswered: 0,
            approvalsHandled: 0,
            contextInjections: 0,
            successfulGuidance: 0,
            sessionStartTime: Date.now()
        };
        
        this.logger.log('🔍 SupervisionEngine: Initialized comprehensive AI project supervisor');
    }

    /**
     * Start supervising a project from PRD to completion
     */
    async startSupervision(prdContent, options = {}) {
        try {
            this.isActive = true;
            this.workflow.currentPhase = 0;
            this.workflow.phaseStartTime = Date.now();
            
            this.logger.log(`👁️ SupervisionEngine: Starting comprehensive project supervision`);
            
            // Phase 1: Analyze PRD and prepare context
            await this.analyzePRD(prdContent);
            
            // Phase 2: Ensure CLAUDE.md exists or create it
            await this.ensureClaudeFileExists();
            
            // Phase 3: Launch Claude Code with monitoring
            await this.launchClaudeCodeWithMonitoring(options);
            
            // Phase 4: Begin active supervision loop
            this.beginActiveSupervision();
            
            this.emit('supervisionStarted', {
                sessionId: this.sessionId,
                projectPath: this.projectPath,
                workflow: this.workflow
            });
            
            return {
                success: true,
                sessionId: this.sessionId,
                message: 'Comprehensive supervision active - monitoring Claude Code execution',
                workflow: this.workflow
            };
            
        } catch (error) {
            this.logger.error('❌ SupervisionEngine: Failed to start supervision:', error);
            this.isActive = false;
            
            return {
                success: false,
                error: error.message,
                sessionId: this.sessionId
            };
        }
    }

    /**
     * Phase 1: Analyze PRD and extract requirements
     */
    async analyzePRD(prdContent) {
        this.logger.log('📋 SupervisionEngine: Analyzing PRD content');
        
        this.projectContext.prdContent = prdContent;
        
        // Extract key requirements from PRD
        this.projectContext.requirements = this.extractRequirements(prdContent);
        
        // Identify project type and framework
        this.projectContext.projectType = this.identifyProjectType(prdContent);
        this.projectContext.framework = this.identifyFramework(prdContent);
        
        // Mark phase complete
        this.advanceWorkflowPhase('prd_analysis_complete');
        
        this.logger.log(`✅ PRD Analysis: Found ${this.projectContext.requirements.length} requirements`);
        this.logger.log(`📁 Project Type: ${this.projectContext.projectType}`);
        this.logger.log(`⚡ Framework: ${this.projectContext.framework}`);
    }

    /**
     * Phase 2: Ensure CLAUDE.md file exists with proper content
     */
    async ensureClaudeFileExists() {
        this.logger.log('📄 SupervisionEngine: Ensuring CLAUDE.md file exists');
        
        const claudeFilePath = path.join(this.projectPath, 'CLAUDE.md');
        
        try {
            // Check if CLAUDE.md already exists
            await fs.access(claudeFilePath);
            
            // Read existing content
            this.projectContext.claudeMdContent = await fs.readFile(claudeFilePath, 'utf8');
            this.logger.log('✅ CLAUDE.md file found and loaded');
            
        } catch (error) {
            // CLAUDE.md doesn't exist - create it with PRD content
            this.logger.log('🔧 CLAUDE.md not found - creating with PRD content');
            
            const claudeContent = this.generateClaudeMdContent();
            await fs.writeFile(claudeFilePath, claudeContent, 'utf8');
            
            this.projectContext.claudeMdContent = claudeContent;
            this.stats.contextInjections++;
            
            this.logger.log('✅ CLAUDE.md file created successfully');
        }
        
        this.advanceWorkflowPhase('claude_md_ready');
    }

    /**
     * Phase 3: Launch Claude Code with real-time monitoring
     */
    async launchClaudeCodeWithMonitoring(options = {}) {
        this.logger.log('🚀 SupervisionEngine: Launching Claude Code with monitoring');
        
        // Prepare Claude Code command
        const claudeArgs = [
            '--project-path', this.projectPath,
            '--dangerously-skip-permissions', // We'll handle permissions through supervision
            ...(options.additionalArgs || [])
        ];
        
        // Launch Claude Code process
        this.claudeCodeProcess = spawn('claude-code', claudeArgs, {
            cwd: this.projectPath,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
                NODE_ENV: 'production'
            }
        });
        
        // Handle launch errors
        this.claudeCodeProcess.on('error', (error) => {
            if (error.code === 'ENOENT') {
                this.handleClaudeCodeNotFound();
            } else {
                this.handleClaudeCodeError(error);
            }
        });
        
        // Set up real-time output monitoring
        this.setupOutputMonitoring();
        
        // Send initial prompt to Claude Code
        await this.sendInitialPrompt();
        
        this.advanceWorkflowPhase('claude_code_launched');
        this.logger.log('✅ Claude Code launched with active supervision');
    }

    /**
     * Phase 4: Begin active supervision loop
     */
    beginActiveSupervision() {
        this.logger.log('👁️ SupervisionEngine: Beginning active supervision loop');
        
        // Set up periodic supervision checks
        this.supervisionInterval = setInterval(() => {
            this.performSupervisionCheck();
        }, 2000); // Check every 2 seconds
        
        // Set up workflow timeout monitoring
        this.setupWorkflowTimeouts();
        
        this.advanceWorkflowPhase('active_supervision');
    }

    /**
     * Set up real-time output monitoring for Claude Code
     */
    setupOutputMonitoring() {
        this.claudeCodeProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.handleClaudeCodeOutput(output);
        });
        
        this.claudeCodeProcess.stderr.on('data', (data) => {
            const error = data.toString();
            this.handleClaudeCodeError(error);
        });
        
        this.claudeCodeProcess.on('close', (code) => {
            this.handleClaudeCodeExit(code);
        });
    }

    /**
     * Handle real-time Claude Code output and intervene when needed
     */
    handleClaudeCodeOutput(output) {
        this.logger.log('📺 Claude Code Output:', output.substring(0, 200) + '...');
        
        // Emit raw output for other systems
        this.emit('claudeCodeOutput', {
            sessionId: this.sessionId,
            output,
            timestamp: Date.now()
        });
        
        // Check for confusion patterns
        if (this.detectConfusion(output)) {
            this.handleClaudeCodeConfusion(output);
        }
        
        // Check for questions
        if (this.detectQuestion(output)) {
            this.handleClaudeCodeQuestion(output);
        }
        
        // Check for permission requests
        if (this.detectPermissionRequest(output)) {
            this.handlePermissionRequest(output);
        }
        
        // Check for errors
        if (this.detectError(output)) {
            this.handleClaudeCodeError(output);
        }
        
        // Track progress
        this.trackWorkflowProgress(output);
    }

    /**
     * Detect when Claude Code is confused and needs intervention
     */
    detectConfusion(output) {
        return this.monitoringConfig.confusionPatterns.some(pattern => 
            pattern.test(output)
        );
    }

    /**
     * Handle Claude Code confusion with intelligent intervention
     */
    async handleClaudeCodeConfusion(output) {
        this.logger.log('🤔 SupervisionEngine: Claude Code confusion detected');
        this.stats.interventionsCount++;
        
        // Determine the type of confusion
        const confusionType = this.classifyConfusion(output);
        
        // Provide intelligent response based on confusion type
        const intervention = await this.generateIntervention(confusionType, output);
        
        // Send intervention to Claude Code
        await this.sendInterventionToClaudeCode(intervention);
        
        // Record intervention
        this.workflow.interventions.push({
            type: 'confusion_resolution',
            confusionType,
            timestamp: Date.now(),
            intervention,
            originalOutput: output.substring(0, 500)
        });
        
        this.emit('interventionPerformed', {
            sessionId: this.sessionId,
            type: 'confusion_resolution',
            intervention
        });
    }

    /**
     * Classify the type of confusion Claude Code is experiencing
     */
    classifyConfusion(output) {
        const lowerOutput = output.toLowerCase();
        
        if (lowerOutput.includes('claude.md') || lowerOutput.includes('requirements')) {
            return 'missing_requirements';
        }
        
        if (lowerOutput.includes('file') || lowerOutput.includes('directory')) {
            return 'file_not_found';
        }
        
        if (lowerOutput.includes('clarify') || lowerOutput.includes('specific')) {
            return 'needs_clarification';
        }
        
        if (lowerOutput.includes('understand') || lowerOutput.includes('sure')) {
            return 'general_confusion';
        }
        
        return 'unknown_confusion';
    }

    /**
     * Generate intelligent intervention based on confusion type
     */
    async generateIntervention(confusionType, originalOutput) {
        switch (confusionType) {
            case 'missing_requirements':
                return await this.generateRequirementsIntervention();
                
            case 'file_not_found':
                return await this.generateFilePathIntervention();
                
            case 'needs_clarification':
                return await this.generateClarificationIntervention(originalOutput);
                
            case 'general_confusion':
                return await this.generateGeneralGuidanceIntervention();
                
            default:
                return await this.generateDefaultIntervention(originalOutput);
        }
    }

    /**
     * Generate intervention for missing requirements
     */
    async generateRequirementsIntervention() {
        this.stats.contextInjections++;
        
        const intervention = {
            type: 'context_injection',
            action: 'provide_requirements',
            message: 'I can provide the missing requirements. Here are the project requirements:',
            content: {
                requirements: this.projectContext.requirements,
                prdSummary: this.projectContext.prdContent.substring(0, 1000),
                projectType: this.projectContext.projectType,
                framework: this.projectContext.framework
            }
        };
        
        return intervention;
    }

    /**
     * Generate intervention for file path issues
     */
    async generateFilePathIntervention() {
        // Scan current directory structure
        const fileStructure = await this.scanProjectStructure();
        
        const intervention = {
            type: 'file_guidance',
            action: 'provide_file_structure', 
            message: 'I can help you locate the files. Here\'s the current project structure:',
            content: {
                structure: fileStructure,
                workingDirectory: this.projectPath,
                keyFiles: this.identifyKeyFiles(fileStructure)
            }
        };
        
        return intervention;
    }

    /**
     * Generate clarification intervention
     */
    async generateClarificationIntervention(originalOutput) {
        const intervention = {
            type: 'clarification',
            action: 'provide_specific_guidance',
            message: 'Let me provide specific guidance for what you need to do:',
            content: {
                specificSteps: this.generateSpecificSteps(),
                currentPhase: this.workflow.phases[this.workflow.currentPhase],
                nextActions: this.getRecommendedNextActions()
            }
        };
        
        return intervention;
    }

    /**
     * Send intervention message to Claude Code process
     */
    async sendInterventionToClaudeCode(intervention) {
        if (!this.claudeCodeProcess || this.claudeCodeProcess.killed) {
            this.logger.error('❌ Cannot send intervention - Claude Code process not available');
            return false;
        }
        
        // Format intervention as input to Claude Code
        const interventionMessage = this.formatInterventionMessage(intervention);
        
        // Send to Claude Code stdin
        this.claudeCodeProcess.stdin.write(interventionMessage + '\n');
        
        this.logger.log('💬 SupervisionEngine: Sent intervention to Claude Code');
        this.stats.successfulGuidance++;
        
        return true;
    }

    /**
     * Format intervention message for Claude Code consumption
     */
    formatInterventionMessage(intervention) {
        let message = intervention.message + '\n\n';
        
        if (intervention.content) {
            if (intervention.content.requirements) {
                message += 'Requirements:\n';
                intervention.content.requirements.forEach((req, index) => {
                    message += `${index + 1}. ${req}\n`;
                });
                message += '\n';
            }
            
            if (intervention.content.structure) {
                message += 'Project Structure:\n';
                message += JSON.stringify(intervention.content.structure, null, 2) + '\n\n';
            }
            
            if (intervention.content.specificSteps) {
                message += 'Next Steps:\n';
                intervention.content.specificSteps.forEach((step, index) => {
                    message += `${index + 1}. ${step}\n`;
                });
                message += '\n';
            }
        }
        
        return message;
    }

    /**
     * Track workflow progress based on Claude Code output
     */
    trackWorkflowProgress(output) {
        const lowerOutput = output.toLowerCase();
        
        // Check for progress indicators
        if (lowerOutput.includes('creating') && lowerOutput.includes('file')) {
            this.updateWorkflowProgress('file_creation');
        }
        
        if (lowerOutput.includes('implementing') || lowerOutput.includes('writing code')) {
            this.updateWorkflowProgress('implementation');
        }
        
        if (lowerOutput.includes('testing') || lowerOutput.includes('running tests')) {
            this.updateWorkflowProgress('testing');
        }
        
        if (lowerOutput.includes('complete') || lowerOutput.includes('finished')) {
            this.updateWorkflowProgress('completion');
        }
    }

    /**
     * Update workflow progress
     */
    updateWorkflowProgress(progressType) {
        this.logger.log(`📈 SupervisionEngine: Workflow progress - ${progressType}`);
        
        this.emit('workflowProgress', {
            sessionId: this.sessionId,
            progressType,
            currentPhase: this.workflow.phases[this.workflow.currentPhase],
            timestamp: Date.now()
        });
    }

    /**
     * Advance to next workflow phase
     */
    advanceWorkflowPhase(completedPhase) {
        const previousPhase = this.workflow.phases[this.workflow.currentPhase];
        this.workflow.currentPhase = Math.min(this.workflow.currentPhase + 1, this.workflow.phases.length - 1);
        const currentPhase = this.workflow.phases[this.workflow.currentPhase];
        
        this.workflow.phaseStartTime = Date.now();
        
        this.logger.log(`🔄 SupervisionEngine: Advanced from ${previousPhase} to ${currentPhase}`);
        
        this.emit('workflowPhaseAdvanced', {
            sessionId: this.sessionId,
            completedPhase,
            currentPhase,
            progress: (this.workflow.currentPhase / this.workflow.phases.length) * 100
        });
    }

    /**
     * Helper methods for content generation
     */
    extractRequirements(prdContent) {
        const requirements = [];
        const lines = prdContent.split('\n');
        
        for (const line of lines) {
            // Look for requirement patterns
            if (line.match(/^\d+\./) || line.match(/^[-•*]/) || line.toLowerCase().includes('must') || line.toLowerCase().includes('should')) {
                const requirement = line.replace(/^\d+\.|\s*[-•*]\s*/, '').trim();
                if (requirement.length > 10) { // Filter out very short items
                    requirements.push(requirement);
                }
            }
        }
        
        return requirements.slice(0, 20); // Limit to top 20 requirements
    }

    identifyProjectType(prdContent) {
        const content = prdContent.toLowerCase();
        
        if (content.includes('react') || content.includes('component')) return 'react';
        if (content.includes('api') || content.includes('backend')) return 'api';
        if (content.includes('website') || content.includes('web app')) return 'webapp';
        if (content.includes('mobile') || content.includes('app')) return 'mobile';
        if (content.includes('database') || content.includes('data')) return 'database';
        
        return 'general';
    }

    identifyFramework(prdContent) {
        const content = prdContent.toLowerCase();
        
        if (content.includes('react')) return 'React';
        if (content.includes('vue')) return 'Vue';
        if (content.includes('angular')) return 'Angular';
        if (content.includes('express')) return 'Express';
        if (content.includes('next')) return 'Next.js';
        
        return 'JavaScript';
    }

    generateClaudeMdContent() {
        const content = `# Project Requirements

## Overview
${this.projectContext.prdContent.split('\n').slice(0, 5).join('\n')}

## Requirements
${this.projectContext.requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}

## Project Details
- **Type**: ${this.projectContext.projectType}
- **Framework**: ${this.projectContext.framework}
- **Working Directory**: ${this.projectPath}

## Supervision Context
This project is under active AI supervision. The supervision agent will provide guidance, context, and handle approvals as needed.

Generated by SupervisionEngine on ${new Date().toISOString()}
`;
        
        return content;
    }

    async scanProjectStructure() {
        try {
            const structure = {};
            const items = await fs.readdir(this.projectPath, { withFileTypes: true });
            
            for (const item of items) {
                if (item.isDirectory() && !item.name.startsWith('.')) {
                    structure[item.name] = 'directory';
                } else if (item.isFile()) {
                    structure[item.name] = 'file';
                }
            }
            
            return structure;
        } catch (error) {
            this.logger.error('❌ Failed to scan project structure:', error);
            return {};
        }
    }

    generateSpecificSteps() {
        const phase = this.workflow.phases[this.workflow.currentPhase];
        
        switch (phase) {
            case 'implementation':
                return [
                    'Start by creating the main application file',
                    'Implement the core functionality based on requirements',
                    'Add proper error handling and validation',
                    'Test the functionality as you build'
                ];
                
            case 'validation':
                return [
                    'Review the implemented code for completeness',
                    'Test all major functionality',
                    'Check that requirements are met',
                    'Fix any issues found during testing'
                ];
                
            default:
                return [
                    'Continue with the current task',
                    'Ask for specific help if needed',
                    'Follow the requirements provided',
                    'Test your work as you go'
                ];
        }
    }

    getRecommendedNextActions() {
        return [
            'Focus on implementing one requirement at a time',
            'Create files in a logical order',
            'Test functionality as you build',
            'Ask for clarification if requirements are unclear'
        ];
    }

    /**
     * Get supervision status and statistics
     */
    getSupervisionStatus() {
        return {
            sessionId: this.sessionId,
            isActive: this.isActive,
            workflow: {
                ...this.workflow,
                currentPhaseName: this.workflow.phases[this.workflow.currentPhase],
                progress: (this.workflow.currentPhase / this.workflow.phases.length) * 100
            },
            stats: {
                ...this.stats,
                sessionDuration: Date.now() - this.stats.sessionStartTime,
                interventionsPerMinute: this.stats.interventionsCount / ((Date.now() - this.stats.sessionStartTime) / 60000)
            },
            context: {
                hasRequirements: this.projectContext.requirements.length > 0,
                hasClaudeMd: !!this.projectContext.claudeMdContent,
                projectType: this.projectContext.projectType,
                framework: this.projectContext.framework
            }
        };
    }

    /**
     * Stop supervision
     */
    async stopSupervision() {
        this.logger.log('🛑 SupervisionEngine: Stopping supervision');
        
        this.isActive = false;
        
        // Clear intervals
        if (this.supervisionInterval) {
            clearInterval(this.supervisionInterval);
        }
        
        // Terminate Claude Code if running
        if (this.claudeCodeProcess && !this.claudeCodeProcess.killed) {
            this.claudeCodeProcess.kill('SIGTERM');
        }
        
        // Emit completion event
        this.emit('supervisionComplete', {
            sessionId: this.sessionId,
            stats: this.getSupervisionStatus().stats,
            finalPhase: this.workflow.phases[this.workflow.currentPhase]
        });
        
        return this.getSupervisionStatus();
    }
}

module.exports = { SupervisionEngine };