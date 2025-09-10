/**
 * Workflow Tracker for Supervision Intervention
 * 
 * Monitors multi-step workflows (PRD → Transfer → Claude Code → Implementation)
 * and detects when steps fail or get stuck, enabling intelligent intervention.
 */

const { EventEmitter } = require('events');

class WorkflowTracker extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.activeWorkflows = new Map();
        this.completedWorkflows = [];
        this.failurePatterns = new Map();
        
        // Workflow step definitions
        this.workflowSteps = {
            'prd-to-claude': {
                steps: [
                    'prd_generated',
                    'prd_transferred_to_ide', 
                    'claude_md_created',
                    'claude_code_launched',
                    'requirements_found',
                    'implementation_started'
                ],
                timeouts: {
                    'prd_transferred_to_ide': 30000,    // 30 seconds
                    'claude_md_created': 10000,         // 10 seconds
                    'claude_code_launched': 15000,      // 15 seconds
                    'requirements_found': 20000,        // 20 seconds
                    'implementation_started': 45000     // 45 seconds
                },
                criticalSteps: ['claude_md_created', 'requirements_found']
            }
        };
        
        console.log('✅ WorkflowTracker: Monitoring multi-step workflows for intervention opportunities');
    }

    /**
     * Start tracking a new workflow
     */
    startWorkflow(workflowType, sessionId, metadata = {}) {
        const workflowId = `${workflowType}-${sessionId}-${Date.now()}`;
        
        const workflow = {
            id: workflowId,
            type: workflowType,
            sessionId,
            startTime: Date.now(),
            currentStep: 0,
            steps: this.workflowSteps[workflowType]?.steps || [],
            status: 'active',
            completedSteps: [],
            failedSteps: [],
            metadata,
            interventions: []
        };
        
        this.activeWorkflows.set(workflowId, workflow);
        
        console.log(`🔄 WorkflowTracker: Started tracking ${workflowType} workflow (${workflowId})`);
        this.emit('workflowStarted', workflow);
        
        return workflowId;
    }

    /**
     * Track completion of a workflow step
     */
    trackStepCompletion(workflowId, stepName, data = {}) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            console.warn(`WorkflowTracker: Unknown workflow ${workflowId}`);
            return false;
        }

        const stepIndex = workflow.steps.indexOf(stepName);
        if (stepIndex === -1) {
            console.warn(`WorkflowTracker: Unknown step ${stepName} for workflow ${workflow.type}`);
            return false;
        }

        // Mark step as completed
        if (!workflow.completedSteps.includes(stepName)) {
            workflow.completedSteps.push(stepName);
            workflow.currentStep = Math.max(workflow.currentStep, stepIndex + 1);
        }

        console.log(`✅ WorkflowTracker: Step completed - ${stepName} (${workflowId})`);
        
        this.emit('stepCompleted', {
            workflowId,
            stepName,
            workflow,
            data
        });

        // Check if workflow is complete
        if (workflow.completedSteps.length === workflow.steps.length) {
            this.completeWorkflow(workflowId, 'completed');
        }

        return true;
    }

    /**
     * Detect and track step failure
     */
    detectStepFailure(workflowId, stepName, error, context = {}) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            console.warn(`WorkflowTracker: Cannot track failure for unknown workflow ${workflowId}`);
            return false;
        }

        const failure = {
            step: stepName,
            error: error.message || error,
            timestamp: Date.now(),
            context,
            interventionNeeded: this.assessInterventionNeed(stepName, error, context)
        };

        workflow.failedSteps.push(failure);
        workflow.status = 'failed';

        console.log(`❌ WorkflowTracker: Step failed - ${stepName}: ${failure.error}`);
        
        // Record failure pattern for learning
        this.recordFailurePattern(workflow.type, stepName, error);

        this.emit('stepFailed', {
            workflowId,
            stepName,
            workflow,
            failure
        });

        // Emit intervention request if needed
        if (failure.interventionNeeded) {
            this.emit('interventionNeeded', {
                workflowId,
                stepName,
                failure,
                workflow,
                recommendedAction: this.getRecommendedIntervention(stepName, error, context)
            });
        }

        return true;
    }

    /**
     * Detect workflow getting stuck (no progress within timeout)
     */
    detectStuckWorkflow(workflowId, currentStepName, timeElapsed) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) return false;

        const timeouts = this.workflowSteps[workflow.type]?.timeouts || {};
        const maxTime = timeouts[currentStepName] || 60000; // Default 1 minute

        if (timeElapsed > maxTime) {
            console.log(`⏰ WorkflowTracker: Workflow stuck on step ${currentStepName} (${timeElapsed}ms > ${maxTime}ms)`);
            
            this.emit('workflowStuck', {
                workflowId,
                stepName: currentStepName,
                timeElapsed,
                maxTime,
                workflow,
                interventionNeeded: true
            });

            return true;
        }

        return false;
    }

    /**
     * Handle Claude Code confusion signals
     */
    handleClaudeCodeConfusion(workflowId, confusionSignal, context = {}) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) return false;

        console.log(`🤔 WorkflowTracker: Claude Code confusion detected - ${confusionSignal}`);

        const confusion = {
            signal: confusionSignal,
            timestamp: Date.now(),
            context,
            currentStep: workflow.steps[workflow.currentStep] || 'unknown'
        };

        // Determine intervention type based on confusion signal
        let interventionType = 'generic';
        if (confusionSignal.includes('requirements') || confusionSignal.includes('CLAUDE.md')) {
            interventionType = 'missing_requirements';
        } else if (confusionSignal.includes('file not found') || confusionSignal.includes('cannot find')) {
            interventionType = 'missing_files';
        } else if (confusionSignal.includes('unclear') || confusionSignal.includes('clarify')) {
            interventionType = 'needs_clarification';
        }

        this.emit('claudeCodeConfusion', {
            workflowId,
            confusion,
            workflow,
            interventionType,
            recommendedAction: this.getConfusionIntervention(interventionType, confusionSignal, context)
        });

        return true;
    }

    /**
     * Assess if intervention is needed for a failure
     */
    assessInterventionNeed(stepName, error, context) {
        const criticalSteps = this.workflowSteps[Object.keys(this.workflowSteps)[0]]?.criticalSteps || [];
        
        // Always intervene for critical step failures
        if (criticalSteps.includes(stepName)) {
            return true;
        }

        // Intervene for known recoverable errors
        const recoverableErrors = [
            'file not found',
            'claude.md',
            'requirements',
            'permission denied',
            'connection',
            'timeout'
        ];

        const errorStr = (error.message || error).toLowerCase();
        return recoverableErrors.some(pattern => errorStr.includes(pattern));
    }

    /**
     * Get recommended intervention for step failure
     */
    getRecommendedIntervention(stepName, error, context) {
        const errorStr = (error.message || error).toLowerCase();

        if (stepName === 'claude_md_created' || errorStr.includes('claude.md')) {
            return {
                type: 'inject_requirements',
                action: 'Create CLAUDE.md file with PRD contents',
                priority: 'high',
                automated: true,
                description: 'The CLAUDE.md file failed to transfer. I\'ll inject the PRD requirements directly.'
            };
        }

        if (stepName === 'requirements_found' || errorStr.includes('requirements')) {
            return {
                type: 'provide_context',
                action: 'Supply missing requirements context to Claude Code',
                priority: 'high',
                automated: true,
                description: 'Claude Code cannot find requirements. I\'ll provide the necessary context and files.'
            };
        }

        if (errorStr.includes('permission') || errorStr.includes('access')) {
            return {
                type: 'fix_permissions',
                action: 'Resolve file access permissions',
                priority: 'medium',
                automated: false,
                description: 'File permission issues detected. Manual intervention may be needed.'
            };
        }

        return {
            type: 'generic_help',
            action: 'Provide general assistance',
            priority: 'low',
            automated: false,
            description: 'General workflow issue detected. Supervision agent will analyze and assist.'
        };
    }

    /**
     * Get intervention for Claude Code confusion
     */
    getConfusionIntervention(interventionType, confusionSignal, context) {
        const interventions = {
            missing_requirements: {
                type: 'inject_context',
                action: 'Inject missing requirements and context',
                message: 'I notice Claude Code is looking for requirements. Let me provide the necessary context.',
                automated: true
            },
            missing_files: {
                type: 'create_files',
                action: 'Create missing files or fix paths',
                message: 'I\'ll help locate or create the missing files Claude Code needs.',
                automated: true
            },
            needs_clarification: {
                type: 'provide_clarification', 
                action: 'Clarify requirements and next steps',
                message: 'I\'ll provide clearer guidance on what needs to be done.',
                automated: true
            },
            generic: {
                type: 'general_assistance',
                action: 'Provide general help and guidance',
                message: 'I\'ll analyze the situation and provide appropriate assistance.',
                automated: false
            }
        };

        return interventions[interventionType] || interventions.generic;
    }

    /**
     * Complete workflow tracking
     */
    completeWorkflow(workflowId, finalStatus = 'completed') {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) return false;

        workflow.status = finalStatus;
        workflow.endTime = Date.now();
        workflow.duration = workflow.endTime - workflow.startTime;

        // Move to completed workflows
        this.completedWorkflows.push(workflow);
        this.activeWorkflows.delete(workflowId);

        console.log(`🏁 WorkflowTracker: Workflow ${finalStatus} (${workflowId}) in ${workflow.duration}ms`);
        
        this.emit('workflowCompleted', workflow);

        return true;
    }

    /**
     * Record failure patterns for learning
     */
    recordFailurePattern(workflowType, stepName, error) {
        const pattern = `${workflowType}:${stepName}`;
        const errorStr = (error.message || error).toLowerCase();

        if (!this.failurePatterns.has(pattern)) {
            this.failurePatterns.set(pattern, []);
        }

        this.failurePatterns.get(pattern).push({
            error: errorStr,
            timestamp: Date.now()
        });

        // Keep only recent patterns (last 50)
        const patterns = this.failurePatterns.get(pattern);
        if (patterns.length > 50) {
            this.failurePatterns.set(pattern, patterns.slice(-50));
        }
    }

    /**
     * Get active workflows for session
     */
    getActiveWorkflows(sessionId = null) {
        const workflows = Array.from(this.activeWorkflows.values());
        return sessionId ? 
            workflows.filter(w => w.sessionId === sessionId) : 
            workflows;
    }

    /**
     * Get workflow statistics
     */
    getStats() {
        const stats = {
            active: this.activeWorkflows.size,
            completed: this.completedWorkflows.length,
            totalInterventions: 0,
            successRate: 0,
            commonFailures: []
        };

        // Calculate success rate
        const totalWorkflows = stats.active + stats.completed;
        if (totalWorkflows > 0) {
            const successful = this.completedWorkflows.filter(w => w.status === 'completed').length;
            stats.successRate = successful / totalWorkflows;
        }

        // Count interventions
        this.completedWorkflows.forEach(workflow => {
            stats.totalInterventions += workflow.interventions.length;
        });

        // Get common failure patterns
        const failureCount = new Map();
        this.failurePatterns.forEach((failures, pattern) => {
            failureCount.set(pattern, failures.length);
        });

        stats.commonFailures = Array.from(failureCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pattern, count]) => ({ pattern, count }));

        return stats;
    }
}

module.exports = { WorkflowTracker };