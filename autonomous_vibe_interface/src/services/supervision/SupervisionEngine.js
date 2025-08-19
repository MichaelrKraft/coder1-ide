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
                /what.*next/i,
                /does.*this.*look.*good/i,
                /does.*this.*plan/i,
                /is.*this.*okay/i,
                /would.*you.*like/i,
                /shall.*i.*proceed/i,
                /should.*i.*continue/i,
                /any.*preferences/i,
                /what.*do.*you.*think/i,
                /\?$/  // Any line ending with a question mark
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
        
        // Rate limiting for policy compliance
        this.lastResponseTime = 0;
        this.MIN_RESPONSE_INTERVAL = 3000; // 3 seconds minimum between responses
        
        // Track recent questions to avoid duplicates and loops
        this.recentQuestions = new Set();
        this.recentQuestionTimeout = 5000; // 5 seconds
        
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
     * Phase 3: Monitor existing Claude session instead of launching new one
     */
    async launchClaudeCodeWithMonitoring(options = {}) {
        this.logger.log('🚀 SupervisionEngine: Monitoring existing Claude session');
        
        // Don't spawn a new process - Claude is already running in terminal
        // Instead, we'll monitor the terminal output through the existing connection
        this.claudeCodeProcess = null; // No separate process needed
        
        // Skip trying to send initial prompt since Claude is already interactive
        this.logger.log('✅ Monitoring Claude session in terminal');
        
        // Mark as launched since Claude is already running
        this.advanceWorkflowPhase('claude_code_launched');
        
        // Emit event to indicate supervision is ready
        this.emit('supervisionReady', {
            sessionId: this.sessionId,
            mode: 'terminal_monitoring'
        });
        
        return true;
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
        // this.setupWorkflowTimeouts(); // Removed - function not implemented yet
        
        this.advanceWorkflowPhase('active_supervision');
    }
    
    /**
     * Perform periodic supervision check
     */
    performSupervisionCheck() {
        // Check if Claude Code is still running
        if (!this.claudeCodeProcess || this.claudeCodeProcess.killed) {
            this.logger.log('⚠️ Claude Code process not running');
            clearInterval(this.supervisionInterval);
            return;
        }
        
        // Log that supervision is active
        // Additional checks can be added here
    }
    
    /**
     * Handle Claude Code process exit
     */
    handleClaudeCodeExit(code) {
        this.logger.log(`📍 Claude Code exited with code: ${code}`);
        
        // Clear supervision interval
        if (this.supervisionInterval) {
            clearInterval(this.supervisionInterval);
        }
        
        // Emit exit event
        this.emit('claudeCodeExit', {
            sessionId: this.sessionId,
            exitCode: code,
            timestamp: Date.now()
        });
        
        // Mark session as complete
        this.isActive = false;
    }

    /**
     * Set up real-time output monitoring for Claude Code
     */
    setupOutputMonitoring() {
        // When monitoring terminal session, we don't have a separate process
        // Output monitoring happens through the terminal WebSocket connection
        this.logger.log('📺 Output monitoring through terminal connection');
        
        // The terminal will send us Claude's output through the existing connection
        // No need to set up separate stdout/stderr listeners
    }

    /**
     * Handle real-time Claude Code output and intervene when needed
     */
    handleClaudeCodeOutput(output) {
        // Don't log every character, only meaningful output
        if (output.trim().length > 5) {
            this.logger.log('📺 Monitoring:', output.substring(0, 50));
        }
        
        // Emit raw output for other systems
        this.emit('claudeCodeOutput', {
            sessionId: this.sessionId,
            output,
            timestamp: Date.now()
        });
        
        // Check for confusion patterns
        if (this.detectConfusion(output)) {
            this.logger.log('🤔 Detected confusion');
            this.handleClaudeCodeConfusion(output);
        }
        
        // Check for questions
        if (this.detectQuestion(output)) {
            this.logger.log('❓ Detected question:', output.substring(0, 100));
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
        // For terminal monitoring, we would display interventions in the terminal
        // But we can't directly write to Claude's input when it's interactive
        this.logger.log('💬 SupervisionEngine: Intervention ready (manual input required)');
        
        // Format intervention for display
        const interventionMessage = this.formatInterventionMessage(intervention);
        
        // Emit intervention event so UI can display it
        this.emit('interventionReady', {
            sessionId: this.sessionId,
            intervention: interventionMessage,
            type: intervention.type
        });
        
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

    /**
     * Handle Claude Code CLI not found error
     */
    handleClaudeCodeNotFound() {
        this.logger.error('❌ Claude Code CLI not found on system');
        this.logger.error('Please install Claude Code CLI with: npm install -g @anthropic/claude-code');
        
        // Emit error event for UI notification
        this.emit('error', {
            type: 'claude_not_found',
            message: 'Claude Code CLI is not installed. Please install it to use supervision features.',
            sessionId: this.sessionId
        });
        
        // Gracefully stop supervision
        this.stopSupervision();
    }

    /**
     * Handle Claude Code errors
     */
    handleClaudeCodeError(error) {
        this.logger.error('❌ Claude Code Error:', error);
        this.stats.interventionsCount++;
        
        // Classify error type
        const errorType = this.classifyError(error);
        
        // Emit error event
        this.emit('claudeCodeError', {
            sessionId: this.sessionId,
            error: error.toString(),
            errorType,
            timestamp: Date.now()
        });
        
        // Attempt recovery based on error type
        if (errorType === 'recoverable') {
            this.attemptErrorRecovery(error);
        }
    }

    /**
     * Send initial prompt to Claude Code (only for spawned processes)
     */
    async sendInitialPrompt() {
        // When monitoring terminal, we don't send prompts automatically
        // User interacts directly with Claude in the terminal
        this.logger.log('📨 User will interact directly with Claude in terminal');
        return true;
    }

    /**
     * Detect if output contains a question
     */
    detectQuestion(output) {
        // Skip ANSI escape sequences and UI elements
        if (output.includes('? for shortcuts') || 
            output.includes('╭') || 
            output.includes('│') || 
            output.includes('╰') ||
            output.match(/^\[.*?m.*?$/)) {
            return false;
        }
        
        // Look for actual questions with substance
        if (output.includes('?') && output.length > 15) {
            // Check if it's a meaningful question
            const meaningfulQuestionPatterns = [
                /what.*?/i,
                /how.*?/i,
                /which.*?/i,
                /where.*?/i,
                /when.*?/i,
                /why.*?/i,
                /do you.*?/i,
                /would you.*?/i,
                /should.*?/i,
                /any.*?/i,
                /purpose.*?/i,
                /audience.*?/i,
                /style.*?/i,
                /functionality.*?/i
            ];
            
            const isMeaningful = meaningfulQuestionPatterns.some(pattern => pattern.test(output));
            if (isMeaningful) {
                console.log('❓ [SUPERVISION ENGINE] Meaningful question detected:', output.substring(0, 100));
                return true;
            }
        }
        
        // Also check against other question patterns
        const patternMatch = this.monitoringConfig.questionPatterns.some(pattern => 
            pattern.test(output)
        );
        
        if (patternMatch) {
            console.log('❓ [SUPERVISION ENGINE] Question detected by pattern match:', output.substring(0, 100));
        }
        
        return patternMatch;
    }

    /**
     * Detect if output contains a permission request
     */
    detectPermissionRequest(output) {
        const permissionPatterns = [
            /permission.*to/i,
            /may.*i/i,
            /can.*i.*proceed/i,
            /should.*i.*continue/i,
            /is it.*okay/i,
            /do you.*approve/i,
            /waiting.*for.*approval/i,
            /need.*permission/i
        ];
        
        return permissionPatterns.some(pattern => pattern.test(output));
    }

    /**
     * Detect if output contains an error
     */
    detectError(output) {
        // Check against error patterns
        return this.monitoringConfig.errorPatterns.some(pattern => 
            pattern.test(output)
        );
    }

    /**
     * Handle questions from Claude Code
     */
    async handleClaudeCodeQuestion(output) {
        this.logger.log('❓ SupervisionEngine: Claude Code asked a question');
        
        // Check rate limiting to prevent policy violations
        const now = Date.now();
        if (now - this.lastResponseTime < this.MIN_RESPONSE_INTERVAL) {
            this.logger.log('⏳ SupervisionEngine: Rate limit - waiting before responding');
            // Wait for the remaining time before responding
            const waitTime = this.MIN_RESPONSE_INTERVAL - (now - this.lastResponseTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.stats.questionsAnswered++;
        this.lastResponseTime = Date.now();
        
        // Analyze question context
        const questionContext = this.analyzeQuestionContext(output);
        
        // Generate intelligent answer
        const answer = await this.generateAnswer(questionContext, output);
        
        // Send answer to Claude Code
        if (this.claudeCodeProcess && !this.claudeCodeProcess.killed) {
            this.claudeCodeProcess.stdin.write(answer + '\n');
            this.logger.log('💬 SupervisionEngine: Answered Claude Code question via subprocess');
        } else {
            // When monitoring existing terminal, emit event for PTY adapter
            this.logger.log('💬 SupervisionEngine: Emitting response for PTY delivery');
            this.emit('responseGenerated', {
                sessionId: this.sessionId,
                response: answer,
                questionContext: output,
                timestamp: Date.now()
            });
        }
        
        // Record intervention
        this.workflow.interventions.push({
            type: 'question_answered',
            question: output.substring(0, 200),
            answer: answer.substring(0, 200),
            timestamp: Date.now()
        });
        
        this.emit('questionAnswered', {
            sessionId: this.sessionId,
            question: output,
            answer
        });
    }

    /**
     * Handle permission requests from Claude Code
     */
    async handlePermissionRequest(output) {
        this.logger.log('🔐 SupervisionEngine: Claude Code requested permission');
        this.stats.approvalsHandled++;
        
        // Auto-approve common safe operations
        const approval = this.generateApproval(output);
        
        // Send approval to Claude Code
        if (this.claudeCodeProcess && !this.claudeCodeProcess.killed) {
            this.claudeCodeProcess.stdin.write(approval + '\n');
            this.logger.log('✅ SupervisionEngine: Granted permission to Claude Code');
        }
        
        // Record approval
        this.workflow.approvals.push({
            request: output.substring(0, 200),
            approval,
            timestamp: Date.now()
        });
        
        this.emit('permissionGranted', {
            sessionId: this.sessionId,
            request: output,
            approval
        });
    }

    // Helper methods for the new implementations
    classifyError(error) {
        const errorStr = error.toString().toLowerCase();
        
        if (errorStr.includes('permission') || errorStr.includes('access')) {
            return 'recoverable';
        }
        if (errorStr.includes('not found') || errorStr.includes('enoent')) {
            return 'recoverable';
        }
        if (errorStr.includes('syntax') || errorStr.includes('parse')) {
            return 'critical';
        }
        
        return 'unknown';
    }

    attemptErrorRecovery(error) {
        this.logger.log('🔧 SupervisionEngine: Attempting error recovery');
        
        // Send recovery guidance to Claude Code
        const recoveryMessage = `
I noticed an error occurred. Let me help you recover:

Error: ${error.toString().substring(0, 200)}

Suggested recovery steps:
1. Check if the file or directory exists
2. Verify you have the correct permissions
3. Try the operation again with the correct path
4. If the issue persists, try an alternative approach

Please continue with the task, and I'll assist if needed.
`;
        
        if (this.claudeCodeProcess && !this.claudeCodeProcess.killed) {
            this.claudeCodeProcess.stdin.write(recoveryMessage + '\n');
        }
    }

    analyzeQuestionContext(output) {
        const lowerOutput = output.toLowerCase();
        
        if (lowerOutput.includes('file') || lowerOutput.includes('directory')) {
            return 'file_structure';
        }
        if (lowerOutput.includes('implement') || lowerOutput.includes('code')) {
            return 'implementation';
        }
        if (lowerOutput.includes('test') || lowerOutput.includes('verify')) {
            return 'testing';
        }
        if (lowerOutput.includes('next') || lowerOutput.includes('continue')) {
            return 'workflow';
        }
        
        return 'general';
    }

    /**
     * Detect if a question is asking about preferences/choices
     */
    isPreferenceQuestion(questionText) {
        const lowerQuestion = questionText.toLowerCase();
        
        // All landing page questions should be treated as preference questions
        // since they ask for user choices/preferences about design/content
        const preferencePatterns = [
            // Target audience questions
            /who.*target.*audience/i,
            /target.*audience/i,
            
            // Goal/purpose questions
            /main.*goal/i,
            /goal.*of.*landing/i,
            /purpose.*landing/i,
            
            // Style/design questions
            /brand.*colors/i,
            /fonts/i,
            /visual.*style/i,
            /style.*preferences/i,
            /tone.*should/i,
            /tone.*copy/i,
            
            // Content questions
            /key.*features/i,
            /features.*benefits/i,
            /what.*highlight/i,
            /include.*testimonials/i,
            /pricing/i,
            /demo.*sections/i,
            
            // CTA questions
            /call-to-action/i,
            /cta.*button/i,
            /should.*there.*be/i,
            
            // Integration questions
            /should.*landing.*page.*be.*integrated/i,
            /integrated.*with.*existing/i,
            /standalone.*page/i,
            
            // Functionality questions
            /need.*specific.*functionality/i,
            /contact.*forms/i,
            /newsletter.*signup/i,
            /user.*registration/i,
            
            // Inspiration questions
            /existing.*landing.*pages/i,
            /admire.*or.*want.*to.*emulate/i,
            /inspiration/i,
            
            // General preference patterns
            /what.*prefer/i,
            /which.*would.*you/i,
            /what.*should/i,
            /what.*do.*you.*think/i,
            /do.*you.*want/i,
            /would.*you.*like/i
        ];
        
        return preferencePatterns.some(pattern => pattern.test(questionText));
    }

    async generateAnswer(questionContext, originalQuestion) {
        let answer = '';
        const lowerQuestion = originalQuestion.toLowerCase();
        
        // Check if this is a procedural "shall I proceed" type question - auto-approve these
        if (this.isProceduralQuestion(originalQuestion)) {
            // Just say yes/1 to keep things moving
            if (this.detectMultipleChoiceQuestion(originalQuestion)) {
                return "1"; // Choose option 1 (usually "proceed")
            }
            return "yes"; // Simple approval
        }
        
        // Check if this is a technical choice question (TypeScript vs JavaScript, framework choice, etc.)
        if (this.isTechnicalChoiceQuestion(originalQuestion)) {
            // Use the collaborative "I'm thinking" pattern for technical decisions
            const choice = this.pickBestTechnicalOption(originalQuestion, questionContext);
            answer = `[Coder1 Supervision]: I'm thinking... ${choice.reasoning}. I'd go with ${choice.option}. What do you think?`;
            return answer;
        }
        
        // Use a clear AI assistant disclosure that won't trigger policy violations
        const DISCLOSURE = "[AI Assistant Response]: This is an automated suggestion from the project supervision system. ";
        
        // Check if this is a preference question first
        if (this.isPreferenceQuestion(originalQuestion)) {
            // For preference questions, provide context-aware but non-directive answers
            if (lowerQuestion.includes('primary goal') || lowerQuestion.includes('target audience')) {
                answer = "AI-powered coding platform targeting developers building AI applications";
            } else if (lowerQuestion.includes('key features') || lowerQuestion.includes('unique selling')) {
                answer = "Dual-mode system with intelligent requirements gathering and autonomous coding";
            } else if (lowerQuestion.includes('design') || lowerQuestion.includes('style')) {
                answer = "Modern minimal interface consistent with the existing Coder1 IDE design";
            } else {
                // Generic preference response
                answer = "Based on project context, either approach would be suitable";
            }
            
            // Add disclosure ONLY at the beginning, not in every response
            return DISCLOSURE + answer;
        }
        
        // For non-preference questions, provide helpful technical guidance
        if (lowerQuestion.includes('error') || lowerQuestion.includes('failed') || lowerQuestion.includes('not working')) {
            answer = "Review the error output above. Check logs in server.log for details. Verify dependencies are installed.";
        } else {
            // Context-based responses - more helpful while staying factual
            switch (questionContext) {
                case 'file_structure':
                    answer = `Working directory: ${this.projectPath}. Standard ${this.projectContext.framework || 'JavaScript'} structure recommended.`;
                    break;
                    
                case 'implementation':
                    answer = `Implement using ${this.projectContext.framework || 'standard'} patterns. Start with core functionality first.`;
                    break;
                    
                case 'testing':
                    answer = "Run tests after implementation. Use npm test or appropriate testing command.";
                    break;
                    
                case 'workflow':
                    answer = "Proceed with next requirement. Reference project documentation if needed.";
                    break;
                    
                default:
                    answer = "Continue implementation. Check project requirements for guidance.";
            }
        }
        
        // Add disclosure for technical questions too
        return DISCLOSURE + answer;
    }
    
    /**
     * Detect procedural questions that should be auto-approved
     */
    isProceduralQuestion(question) {
        const lowerQuestion = question.toLowerCase();
        
        const proceduralPatterns = [
            /shall i proceed/i,
            /should i continue/i,
            /would you like me to proceed/i,
            /may i create/i,
            /should i create/i,
            /shall i implement/i,
            /can i proceed/i,
            /is it okay to/i,
            /permission to/i,
            /ready to continue/i,
            /move forward/i,
            /next step/i,
            /continue with/i
        ];
        
        return proceduralPatterns.some(pattern => pattern.test(question));
    }
    
    /**
     * Detect technical choice questions that need thoughtful consideration
     */
    isTechnicalChoiceQuestion(question) {
        const lowerQuestion = question.toLowerCase();
        
        const technicalChoicePatterns = [
            /typescript.*javascript|javascript.*typescript/i,
            /react.*vue.*angular|vue.*react.*angular/i,
            /framework.*choice|choose.*framework/i,
            /library.*prefer|prefer.*library/i,
            /approach.*better|which.*approach/i,
            /design.*pattern|pattern.*use/i,
            /architecture.*prefer|prefer.*architecture/i,
            /database.*choice|choose.*database/i,
            /styling.*approach|css.*framework/i,
            /testing.*framework|test.*approach/i,
            /deployment.*option|hosting.*choice/i,
            /build.*tool|bundler.*prefer/i,
            /state management|store.*solution/i
        ];
        
        return technicalChoicePatterns.some(pattern => pattern.test(question));
    }
    
    /**
     * Detect if a question has multiple choice options
     */
    detectMultipleChoiceQuestion(question) {
        // Patterns for multiple choice questions
        const patterns = [
            /\b1\.\s+.+\s+2\.\s+.+/s,  // 1. option 2. option
            /\b1\)\s+.+\s+2\)\s+.+/s,  // 1) option 2) option
            /\ba\)\s+.+\s+b\)\s+.+/si, // a) option b) option
            /\bA\.\s+.+\s+B\.\s+.+/s,  // A. option B. option
            /option 1.*option 2/si,     // option 1 ... option 2
            /first option.*second option/si
        ];
        
        return patterns.some(pattern => pattern.test(question));
    }
    
    /**
     * Pick the best technical option with reasoning
     */
    pickBestTechnicalOption(question, context) {
        const lowerQuestion = question.toLowerCase();
        
        // TypeScript vs JavaScript
        if (lowerQuestion.includes('typescript') && lowerQuestion.includes('javascript')) {
            return {
                option: 'TypeScript',
                reasoning: 'TypeScript provides better type safety and developer experience for larger projects'
            };
        }
        
        // React vs Vue vs Angular
        if (lowerQuestion.includes('react') || lowerQuestion.includes('vue') || lowerQuestion.includes('angular')) {
            return {
                option: 'React',
                reasoning: 'React has the largest ecosystem and community support'
            };
        }
        
        // CSS frameworks
        if (lowerQuestion.includes('tailwind') || lowerQuestion.includes('bootstrap') || lowerQuestion.includes('css')) {
            return {
                option: 'Tailwind CSS',
                reasoning: 'Tailwind offers more flexibility and better maintainability'
            };
        }
        
        // Testing frameworks
        if (lowerQuestion.includes('jest') || lowerQuestion.includes('vitest') || lowerQuestion.includes('test')) {
            return {
                option: 'Jest',
                reasoning: 'Jest is the most established testing framework with excellent tooling'
            };
        }
        
        // Database choices
        if (lowerQuestion.includes('postgresql') || lowerQuestion.includes('mysql') || lowerQuestion.includes('mongodb')) {
            return {
                option: 'PostgreSQL',
                reasoning: 'PostgreSQL offers the best balance of features and reliability'
            };
        }
        
        // Build tools
        if (lowerQuestion.includes('webpack') || lowerQuestion.includes('vite') || lowerQuestion.includes('rollup')) {
            return {
                option: 'Vite',
                reasoning: 'Vite provides faster development builds and better DX'
            };
        }
        
        // Default reasoning for unknown technical choices
        return {
            option: 'the first option',
            reasoning: 'it aligns well with modern development practices'
        };
    }
    
    /**
     * Pick the best option from a multiple choice question (legacy method)
     */
    pickBestOption(question, context) {
        const lowerQuestion = question.toLowerCase();
        
        // Extract options if possible
        let options = [];
        let optionPattern = /\b([1-3])[.)]?\s+([^1-3\n]+)/g;
        let match;
        while ((match = optionPattern.exec(question)) !== null) {
            options.push({
                number: match[1],
                text: match[2].trim()
            });
        }
        
        // Default choice logic based on context
        let chosenOption = '1'; // Default to first option
        let reasoning = "this seems like the most straightforward approach";
        
        // Smart selection based on content
        if (options.length > 0) {
            // Look for keywords in options
            for (let opt of options) {
                const optText = opt.text.toLowerCase();
                
                // Prefer options that mention proceeding or continuing
                if (optText.includes('proceed') || optText.includes('continue') || optText.includes('yes')) {
                    chosenOption = opt.number;
                    reasoning = "we should keep moving forward with the implementation";
                    break;
                }
                
                // Avoid options that stop or cancel
                if (optText.includes('stop') || optText.includes('cancel') || optText.includes('no')) {
                    // Skip this option
                    continue;
                }
                
                // For implementation choices, prefer simpler options
                if (optText.includes('simple') || optText.includes('basic') || optText.includes('standard')) {
                    chosenOption = opt.number;
                    reasoning = "simpler implementations are usually better to start with";
                }
            }
        }
        
        // Context-specific reasoning
        if (lowerQuestion.includes('file') || lowerQuestion.includes('create')) {
            reasoning = "creating the necessary files makes sense";
        } else if (lowerQuestion.includes('test')) {
            reasoning = "testing is important for reliability";
        } else if (lowerQuestion.includes('error') || lowerQuestion.includes('fix')) {
            reasoning = "fixing errors should be prioritized";
        }
        
        return {
            option: chosenOption,
            reasoning: reasoning
        };
    }

    generateApproval(request) {
        const lowerRequest = request.toLowerCase();
        
        // Auto-approve safe operations
        if (lowerRequest.includes('create') && lowerRequest.includes('file')) {
            return 'Yes, approved. Please proceed with creating the file.';
        }
        if (lowerRequest.includes('install') && lowerRequest.includes('package')) {
            return 'Yes, approved. Please install the necessary packages.';
        }
        if (lowerRequest.includes('modify') || lowerRequest.includes('update')) {
            return 'Yes, approved. Please proceed with the modifications.';
        }
        if (lowerRequest.includes('continue') || lowerRequest.includes('proceed')) {
            return 'Yes, please continue with your current approach.';
        }
        
        // Default approval
        return 'Yes, approved. Please proceed with caution and follow best practices.';
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