/**
 * Integrated Supervision System
 * 
 * Combines all supervision components into a cohesive AI-supervising-AI system.
 * This orchestrates the SupervisionEngine, ClaudeCodeMonitor, InterventionManager,
 * and ContextProvider to deliver comprehensive project supervision.
 */

const { EventEmitter } = require('events');
const { SupervisionEngine } = require('./SupervisionEngine');
const { ClaudeCodeMonitor } = require('./ClaudeCodeMonitor');
const { InterventionManager } = require('./InterventionManager');
const { ContextProvider } = require('./ContextProvider');
const { WorkflowTracker } = require('./WorkflowTracker');
const { ErrorDetector } = require('./ErrorDetector');

class IntegratedSupervisionSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.sessionId = options.sessionId || `integrated-${Date.now()}`;
        this.projectPath = options.projectPath || process.cwd();
        this.logger = options.logger || console;
        
        // Initialize all components
        this.supervisionEngine = new SupervisionEngine({
            projectPath: this.projectPath,
            sessionId: this.sessionId,
            logger: this.logger
        });
        
        this.monitor = new ClaudeCodeMonitor({
            sessionId: this.sessionId,
            logger: this.logger
        });
        
        this.interventionManager = new InterventionManager({
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            logger: this.logger
        });
        
        this.contextProvider = new ContextProvider({
            projectPath: this.projectPath,
            sessionId: this.sessionId,
            logger: this.logger
        });
        
        this.workflowTracker = new WorkflowTracker({
            logger: this.logger
        });
        
        this.errorDetector = new ErrorDetector({
            logger: this.logger
        });
        
        // System state
        this.state = {
            isActive: false,
            claudeCodeProcess: null,
            currentWorkflow: null,
            prdContent: null,
            supervisionMode: 'comprehensive',
            autoIntervention: true
        };
        
        // Statistics
        this.stats = {
            sessionsSupervised: 0,
            interventionsPerformed: 0,
            questionsAnswered: 0,
            contextsProvided: 0,
            approvalsHandled: 0,
            successfulCompletions: 0
        };
        
        // Set up component integration
        this.setupComponentIntegration();
        
        this.logger.log('🎯 IntegratedSupervisionSystem: All components initialized and integrated');
    }

    /**
     * Start comprehensive supervision
     */
    async startSupervision(prdContent, options = {}) {
        try {
            this.state.isActive = true;
            this.state.prdContent = prdContent;
            this.stats.sessionsSupervised++;
            
            this.logger.log('🚀 IntegratedSupervisionSystem: Starting comprehensive AI supervision');
            
            // Initialize context from PRD
            await this.contextProvider.initializeContext(prdContent, options);
            
            // Start workflow tracking
            this.state.currentWorkflow = this.workflowTracker.startWorkflow(
                'prd-to-claude',
                this.sessionId,
                { prdContent: prdContent.substring(0, 500) }
            );
            
            // Start supervision engine
            const supervisionResult = await this.supervisionEngine.startSupervision(prdContent, options);
            
            // Make supervision engine globally accessible for terminal integration
            console.log('🌍 [SUPERVISION] Setting global supervisionEngine and supervisionSystem');
            global.supervisionEngine = this.supervisionEngine;
            global.supervisionSystem = this;
            console.log('🌍 [SUPERVISION] Global engine set. Available methods:', Object.getOwnPropertyNames(this.supervisionEngine.__proto__).filter(name => name !== 'constructor').slice(0, 5));
            
            // Get Claude Code process from supervision engine (null for terminal monitoring)
            this.state.claudeCodeProcess = this.supervisionEngine.claudeCodeProcess;
            
            // For terminal monitoring, we don't have a process to attach
            // The terminal will send us output directly
            
            this.emit('supervisionStarted', {
                sessionId: this.sessionId,
                workflowId: this.state.currentWorkflow,
                context: this.contextProvider.getContextSummary()
            });
            
            return {
                success: true,
                sessionId: this.sessionId,
                message: 'Comprehensive AI supervision active - monitoring and guiding Claude Code',
                status: this.getStatus()
            };
            
        } catch (error) {
            this.logger.error('❌ IntegratedSupervisionSystem: Failed to start supervision:', error);
            this.state.isActive = false;
            
            return {
                success: false,
                error: error.message,
                sessionId: this.sessionId
            };
        }
    }

    /**
     * Set up integration between components
     */
    setupComponentIntegration() {
        // Monitor → Error Detector integration
        this.monitor.on('outputLine', async (data) => {
            const errorAnalysis = this.errorDetector.analyzeOutput(data.line, {
                sessionId: this.sessionId,
                stream: data.stream
            });
            
            if (errorAnalysis) {
                await this.handleDetectedError(errorAnalysis);
            }
        });
        
        // Monitor → Intervention trigger
        this.monitor.on('interventionRequired', async (data) => {
            await this.handleInterventionRequest(data);
        });
        
        // Monitor → Workflow tracking
        this.monitor.on('patternsDetected', (data) => {
            if (data.analysis.categories.has('progress')) {
                this.updateWorkflowProgress(data);
            }
        });
        
        // Error Detector → Intervention
        this.errorDetector.on('interventionRequired', async (data) => {
            await this.handleInterventionRequest(data);
        });
        
        // Error Detector → Claude Code confusion
        this.errorDetector.on('claudeCodeConfusion', async (data) => {
            await this.handleClaudeCodeConfusion(data);
        });
        
        // Workflow Tracker → Intervention
        this.workflowTracker.on('interventionNeeded', async (data) => {
            await this.handleWorkflowIntervention(data);
        });
        
        // Workflow Tracker → Claude Code confusion
        this.workflowTracker.on('claudeCodeConfusion', async (data) => {
            await this.handleClaudeCodeConfusion(data);
        });
        
        // Supervision Engine → Context updates
        this.supervisionEngine.on('contextUpdate', async (data) => {
            await this.contextProvider.refreshContext();
        });
        
        // Intervention Manager → Response delivery
        this.interventionManager.on('interventionReady', async (data) => {
            await this.deliverIntervention(data.intervention);
        });
        
        // Intervention Manager → Permission requests
        this.interventionManager.on('permissionRequested', (data) => {
            this.handlePermissionRequest(data);
        });
    }

    /**
     * Handle intervention request from any component
     */
    async handleInterventionRequest(request) {
        if (!this.state.autoIntervention) {
            this.logger.log('⏸️ Auto-intervention disabled - queuing request');
            return this.queueIntervention(request);
        }
        
        this.logger.log(`🔄 Processing intervention request: ${request.type}`);
        this.stats.interventionsPerformed++;
        
        // Get context for the intervention
        const context = await this.contextProvider.getContextForScenario(
            request.type || 'general_confusion',
            request.context
        );
        
        // Process intervention through manager
        const response = await this.interventionManager.processInterventionRequest({
            ...request,
            enrichedContext: context
        });
        
        // Deliver intervention to Claude Code
        await this.deliverIntervention(response);
        
        // Update workflow tracker
        if (this.state.currentWorkflow) {
            this.workflowTracker.detectStepFailure(
                this.state.currentWorkflow,
                'intervention_needed',
                { type: request.type, handled: true },
                request.context
            );
        }
    }

    /**
     * Handle Claude Code confusion specifically
     */
    async handleClaudeCodeConfusion(confusionData) {
        this.logger.log('🤔 Handling Claude Code confusion');
        this.stats.questionsAnswered++;
        
        // Get appropriate context based on confusion type
        const scenario = this.mapConfusionToScenario(confusionData.interventionType);
        const context = await this.contextProvider.getContextForScenario(scenario);
        
        // Inject context directly to Claude Code
        if (this.state.claudeCodeProcess && !this.state.claudeCodeProcess.killed) {
            const injected = await this.contextProvider.injectContext(
                scenario,
                this.state.claudeCodeProcess
            );
            
            if (injected) {
                this.stats.contextsProvided++;
                
                // Mark intervention as handled in monitor
                this.monitor.markInterventionHandled({
                    type: 'confusion_resolution',
                    scenario: scenario
                });
            }
        }
        
        // Track in workflow
        if (this.state.currentWorkflow) {
            this.workflowTracker.handleClaudeCodeConfusion(
                this.state.currentWorkflow,
                confusionData.signal || confusionData.confusion?.signal || 'unknown confusion',
                confusionData.context
            );
        }
    }

    /**
     * Handle workflow intervention
     */
    async handleWorkflowIntervention(data) {
        this.logger.log(`🔧 Handling workflow intervention: ${data.stepName}`);
        
        const { recommendedAction } = data;
        
        if (recommendedAction.automated) {
            // Execute automated intervention
            switch (recommendedAction.type) {
            case 'inject_requirements':
                await this.injectRequirements();
                break;
                    
            case 'provide_context':
                await this.provideComprehensiveContext();
                break;
                    
            case 'fix_permissions':
                await this.handlePermissionIssue(data);
                break;
                    
            default:
                await this.provideGeneralAssistance(data);
            }
        } else {
            // Queue for manual intervention
            this.queueIntervention(data);
        }
    }

    /**
     * Deliver intervention to Claude Code
     */
    async deliverIntervention(intervention) {
        if (!this.state.claudeCodeProcess || this.state.claudeCodeProcess.killed) {
            this.logger.error('❌ Cannot deliver intervention - Claude Code not running');
            return false;
        }
        
        try {
            // Format intervention as message
            let message = '\n' + '='.repeat(60) + '\n';
            message += '🤖 SUPERVISION ASSISTANCE\n';
            message += '='.repeat(60) + '\n\n';
            
            if (typeof intervention === 'string') {
                message += intervention;
            } else if (intervention.content) {
                message += intervention.content;
            } else if (intervention.response && intervention.response.content) {
                message += intervention.response.content;
            } else {
                message += JSON.stringify(intervention, null, 2);
            }
            
            message += '\n' + '='.repeat(60) + '\n\n';
            
            // Send to Claude Code stdin
            this.state.claudeCodeProcess.stdin.write(message);
            
            this.logger.log('✅ Intervention delivered to Claude Code');
            
            // Track successful intervention
            this.emit('interventionDelivered', {
                sessionId: this.sessionId,
                type: intervention.type || 'general',
                timestamp: Date.now()
            });
            
            return true;
            
        } catch (error) {
            this.logger.error('❌ Failed to deliver intervention:', error);
            return false;
        }
    }

    /**
     * Handle permission request
     */
    handlePermissionRequest(data) {
        this.logger.log('🔐 Permission request received');
        this.stats.approvalsHandled++;
        
        // Emit to UI for user approval
        this.emit('permissionRequest', {
            sessionId: this.sessionId,
            details: data.details,
            recommendation: data.recommendation,
            timestamp: Date.now()
        });
        
        // If auto-approve is enabled for this type
        if (this.shouldAutoApprove(data.details)) {
            this.approvePermission(data.details);
        }
    }

    /**
     * Approve a permission request
     */
    approvePermission(details) {
        if (this.state.claudeCodeProcess && !this.state.claudeCodeProcess.killed) {
            const approval = '\n✅ PERMISSION GRANTED: ' + details.action + '\n';
            this.state.claudeCodeProcess.stdin.write(approval);
            
            this.logger.log('✅ Permission approved: ' + details.action);
        }
    }

    /**
     * Inject requirements directly
     */
    async injectRequirements() {
        const context = await this.contextProvider.getContextForScenario('requirements_missing');
        
        if (this.state.claudeCodeProcess) {
            let message = '\n📋 REQUIREMENTS PROVIDED:\n\n';
            
            if (context.requirements && context.requirements.main) {
                context.requirements.main.forEach((req, index) => {
                    message += `${index + 1}. ${req}\n`;
                });
            }
            
            message += '\nPlease proceed with implementation.\n';
            
            this.state.claudeCodeProcess.stdin.write(message);
            this.stats.contextsProvided++;
        }
    }

    /**
     * Provide comprehensive context
     */
    async provideComprehensiveContext() {
        const context = await this.contextProvider.getContextForScenario('general_confusion');
        await this.deliverIntervention({
            type: 'comprehensive_context',
            content: JSON.stringify(context, null, 2)
        });
    }

    /**
     * Update workflow progress
     */
    updateWorkflowProgress(data) {
        if (this.state.currentWorkflow && data.analysis.patterns) {
            const progressPattern = data.analysis.patterns.find(p => p.category === 'progress');
            
            if (progressPattern) {
                const stepMap = {
                    'file_creation': 'implementation_started',
                    'implementation': 'implementation_started',
                    'coding': 'implementation_started',
                    'testing': 'validation',
                    'completion': 'completion'
                };
                
                const step = stepMap[progressPattern.type];
                if (step) {
                    this.workflowTracker.trackStepCompletion(
                        this.state.currentWorkflow,
                        step,
                        { source: 'monitor', pattern: progressPattern.type }
                    );
                }
            }
        }
    }

    /**
     * Map confusion type to context scenario
     */
    mapConfusionToScenario(confusionType) {
        const mapping = {
            'missing_requirements': 'requirements_missing',
            'missing_files': 'file_confusion',
            'needs_clarification': 'implementation_stuck',
            'general_assistance': 'general_confusion'
        };
        
        return mapping[confusionType] || 'general_confusion';
    }

    /**
     * Check if permission should be auto-approved
     */
    shouldAutoApprove(details) {
        // Auto-approve file creation in development
        if (details.action === 'Create files' && process.env.NODE_ENV !== 'production') {
            return true;
        }
        
        // Don't auto-approve deletions
        if (details.action === 'Delete files') {
            return false;
        }
        
        return false;
    }

    /**
     * Queue intervention for later handling
     */
    queueIntervention(intervention) {
        // This could be expanded to maintain a queue of interventions
        this.emit('interventionQueued', {
            sessionId: this.sessionId,
            intervention: intervention,
            timestamp: Date.now()
        });
    }

    /**
     * Provide general assistance
     */
    async provideGeneralAssistance(data) {
        const context = await this.contextProvider.getContextForScenario('general_confusion');
        const response = await this.interventionManager.processInterventionRequest({
            type: 'general_guidance',
            context: context
        });
        
        await this.deliverIntervention(response);
    }

    /**
     * Handle permission issue
     */
    async handlePermissionIssue(data) {
        const message = `
⚠️ PERMISSION ISSUE DETECTED

The supervision system detected a permission issue. Here are the recommended solutions:

1. Check file and directory permissions
2. Ensure you have write access to the project directory
3. Try running with appropriate permissions
4. Use a different location if needed

The supervision system will help guide you through resolving this issue.
`;
        
        await this.deliverIntervention({
            type: 'permission_resolution',
            content: message
        });
    }

    /**
     * Get comprehensive system status
     */
    getStatus() {
        return {
            sessionId: this.sessionId,
            isActive: this.state.isActive,
            supervisionMode: this.state.supervisionMode,
            autoIntervention: this.state.autoIntervention,
            
            components: {
                supervisionEngine: this.supervisionEngine.getSupervisionStatus(),
                monitor: this.monitor.getStatus(),
                interventionManager: this.interventionManager.getStats(),
                contextProvider: this.contextProvider.getStats(),
                workflowTracker: this.workflowTracker.getStats(),
                errorDetector: this.errorDetector.getStats()
            },
            
            stats: {
                ...this.stats,
                monitorStats: this.monitor.getStatus().stats,
                workflowStats: this.workflowTracker.getStats()
            },
            
            context: this.contextProvider.getContextSummary()
        };
    }

    /**
     * Stop supervision
     */
    async stopSupervision() {
        this.logger.log('🛑 IntegratedSupervisionSystem: Stopping supervision');
        
        this.state.isActive = false;
        
        // Stop supervision engine
        if (this.supervisionEngine) {
            await this.supervisionEngine.stopSupervision();
        }
        
        // Complete workflow tracking
        if (this.state.currentWorkflow) {
            this.workflowTracker.completeWorkflow(
                this.state.currentWorkflow,
                'stopped'
            );
        }
        
        // Clean up components
        this.monitor.cleanup();
        this.interventionManager.cleanup();
        this.contextProvider.cleanup();
        
        // Emit completion event
        this.emit('supervisionStopped', {
            sessionId: this.sessionId,
            stats: this.getStatus().stats,
            timestamp: Date.now()
        });
        
        return this.getStatus();
    }

    /**
     * Set supervision mode
     */
    setSupervisionMode(mode) {
        const validModes = ['comprehensive', 'minimal', 'monitoring-only'];
        
        if (validModes.includes(mode)) {
            this.state.supervisionMode = mode;
            
            // Adjust auto-intervention based on mode
            this.state.autoIntervention = mode !== 'monitoring-only';
            
            this.logger.log(`🔧 Supervision mode set to: ${mode}`);
            
            this.emit('modeChanged', {
                sessionId: this.sessionId,
                mode: mode,
                autoIntervention: this.state.autoIntervention
            });
        }
    }

    /**
     * Toggle auto-intervention
     */
    toggleAutoIntervention() {
        this.state.autoIntervention = !this.state.autoIntervention;
        
        this.logger.log(`🔄 Auto-intervention: ${this.state.autoIntervention ? 'ENABLED' : 'DISABLED'}`);
        
        this.emit('autoInterventionToggled', {
            sessionId: this.sessionId,
            enabled: this.state.autoIntervention
        });
        
        return this.state.autoIntervention;
    }
}

module.exports = { IntegratedSupervisionSystem };