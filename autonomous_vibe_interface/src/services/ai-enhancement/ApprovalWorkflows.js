/**
 * One-Click Approval Workflows
 * 
 * Provides user-friendly approval workflows for AI-generated actions.
 * Gives users complete control while maintaining simplicity.
 * 
 * Core Philosophy: Simplicity = Magic
 * - One-click approvals for common actions
 * - Smart approval recommendations
 * - Batch approval capabilities
 * - User preferences learning
 */

const { EventEmitter } = require('events');

class ApprovalWorkflows extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.memorySystem = options.memorySystem;
        this.conversationManager = options.conversationManager;
        
        // Configuration
        this.config = {
            autoApprovalThreshold: options.autoApprovalThreshold || 0.9, // Auto-approve high confidence items
            batchApprovalEnabled: options.batchApprovalEnabled !== false,
            learningEnabled: options.learningEnabled !== false,
            approvalTimeout: options.approvalTimeout || 300000 // 5 minutes
        };
        
        // State
        this.pendingApprovals = new Map();
        this.approvalHistory = [];
        this.userPreferences = new Map();
        this.approvalQueues = new Map(); // sessionId -> queue
        
        // Approval types and their configurations
        this.approvalTypes = {
            // Code changes
            codeChange: {
                title: 'Code Change',
                description: 'AI wants to modify code files',
                icon: '📝',
                category: 'code',
                requiresReview: true,
                autoApprovable: false,
                batchable: true
            },
            
            // File creation
            fileCreation: {
                title: 'Create Files',
                description: 'AI wants to create new files',
                icon: '📄',
                category: 'files',
                requiresReview: false,
                autoApprovable: true,
                batchable: true
            },
            
            // File deletion
            fileDeletion: {
                title: 'Delete Files',
                description: 'AI wants to delete files',
                icon: '🗑️',
                category: 'files',
                requiresReview: true,
                autoApprovable: false,
                batchable: false
            },
            
            // Package installations
            packageInstall: {
                title: 'Install Packages',
                description: 'AI wants to install npm packages',
                icon: '📦',
                category: 'dependencies',
                requiresReview: false,
                autoApprovable: true,
                batchable: true
            },
            
            // Configuration changes
            configChange: {
                title: 'Configuration Change',
                description: 'AI wants to modify configuration files',
                icon: '⚙️',
                category: 'config',
                requiresReview: true,
                autoApprovable: false,
                batchable: true
            },
            
            // Test execution
            testExecution: {
                title: 'Run Tests',
                description: 'AI wants to run test suites',
                icon: '🧪',
                category: 'testing',
                requiresReview: false,
                autoApprovable: true,
                batchable: false
            },
            
            // Build processes
            buildExecution: {
                title: 'Build Project',
                description: 'AI wants to build the project',
                icon: '🔨',
                category: 'build',
                requiresReview: false,
                autoApprovable: true,
                batchable: false
            },
            
            // Database changes
            databaseChange: {
                title: 'Database Changes',
                description: 'AI wants to modify database schema or data',
                icon: '🗄️',
                category: 'database',
                requiresReview: true,
                autoApprovable: false,
                batchable: false
            },
            
            // Security changes
            securityChange: {
                title: 'Security Configuration',
                description: 'AI wants to modify security settings',
                icon: '🔒',
                category: 'security',
                requiresReview: true,
                autoApprovable: false,
                batchable: false
            },
            
            // External API calls
            apiCall: {
                title: 'External API Call',
                description: 'AI wants to make external API requests',
                icon: '🌐',
                category: 'api',
                requiresReview: false,
                autoApprovable: true,
                batchable: true
            }
        };
        
        // Load user preferences
        this.loadUserPreferences();
        
        console.log('✅ Approval Workflows: Initialized with smart approval system');
    }

    /**
     * Request approval for an action
     */
    async requestApproval(actionDetails) {
        const approval = this.createApprovalRequest(actionDetails);
        
        // Check for auto-approval
        if (this.shouldAutoApprove(approval)) {
            return this.autoApprove(approval);
        }
        
        // Add to pending approvals
        this.pendingApprovals.set(approval.id, approval);
        
        // Add to session queue if session exists
        if (approval.sessionId) {
            this.addToQueue(approval.sessionId, approval);
        }
        
        // Emit approval request
        this.emit('approvalRequested', approval);
        
        // Set timeout for approval
        this.setApprovalTimeout(approval);
        
        return approval;
    }

    /**
     * Create approval request object
     */
    createApprovalRequest(actionDetails) {
        const approvalType = this.approvalTypes[actionDetails.type] || this.approvalTypes.codeChange;
        
        const approval = {
            id: this.generateApprovalId(),
            type: actionDetails.type,
            sessionId: actionDetails.sessionId,
            timestamp: Date.now(),
            
            // Action details
            action: actionDetails.action,
            target: actionDetails.target,
            details: actionDetails.details,
            files: actionDetails.files || [],
            commands: actionDetails.commands || [],
            
            // Approval configuration
            ...approvalType,
            
            // Risk assessment
            riskLevel: this.assessRisk(actionDetails, approvalType),
            confidence: actionDetails.confidence || 0.5,
            
            // Status
            status: 'pending',
            
            // User context
            userFriendlyDescription: this.generateUserDescription(actionDetails, approvalType),
            technicalDescription: this.generateTechnicalDescription(actionDetails),
            
            // Smart recommendations
            recommendation: this.generateRecommendation(actionDetails, approvalType),
            alternativeActions: this.generateAlternatives(actionDetails),
            
            // Approval options
            options: this.generateApprovalOptions(actionDetails, approvalType)
        };
        
        return approval;
    }

    /**
     * Check if action should be auto-approved
     */
    shouldAutoApprove(approval) {
        // Never auto-approve high-risk actions
        if (approval.riskLevel === 'high') {
            return false;
        }
        
        // Check confidence threshold
        if (approval.confidence < this.config.autoApprovalThreshold) {
            return false;
        }
        
        // Check type configuration
        if (!approval.autoApprovable) {
            return false;
        }
        
        // Check user preferences
        const userPref = this.getUserPreference(approval.category);
        if (userPref === 'always_ask') {
            return false;
        }
        
        if (userPref === 'auto_approve' && approval.riskLevel === 'low') {
            return true;
        }
        
        // Auto-approve low-risk, high-confidence actions
        return approval.riskLevel === 'low' && approval.confidence >= this.config.autoApprovalThreshold;
    }

    /**
     * Auto-approve an action
     */
    autoApprove(approval) {
        approval.status = 'approved';
        approval.approvedAt = Date.now();
        approval.approvalType = 'auto';
        approval.approvedBy = 'system';
        
        this.recordApproval(approval);
        this.emit('approvalGranted', approval);
        
        console.log(`✅ Auto-approved: ${approval.type} (confidence: ${approval.confidence})`);
        
        return approval;
    }

    /**
     * Approve an action manually
     */
    approveAction(approvalId, options = {}) {
        const approval = this.pendingApprovals.get(approvalId);
        if (!approval) {
            throw new Error(`Approval ${approvalId} not found`);
        }
        
        approval.status = 'approved';
        approval.approvedAt = Date.now();
        approval.approvalType = 'manual';
        approval.approvedBy = options.userId || 'user';
        approval.approvalNotes = options.notes;
        
        // Remove from pending
        this.pendingApprovals.delete(approvalId);
        
        // Remove from queue
        if (approval.sessionId) {
            this.removeFromQueue(approval.sessionId, approvalId);
        }
        
        this.recordApproval(approval);
        this.emit('approvalGranted', approval);
        
        // Learn from approval
        this.learnFromApproval(approval, true);
        
        return approval;
    }

    /**
     * Reject an action
     */
    rejectAction(approvalId, options = {}) {
        const approval = this.pendingApprovals.get(approvalId);
        if (!approval) {
            throw new Error(`Approval ${approvalId} not found`);
        }
        
        approval.status = 'rejected';
        approval.rejectedAt = Date.now();
        approval.rejectedBy = options.userId || 'user';
        approval.rejectionReason = options.reason;
        approval.rejectionNotes = options.notes;
        
        // Remove from pending
        this.pendingApprovals.delete(approvalId);
        
        // Remove from queue
        if (approval.sessionId) {
            this.removeFromQueue(approval.sessionId, approvalId);
        }
        
        this.recordApproval(approval);
        this.emit('approvalRejected', approval);
        
        // Learn from rejection
        this.learnFromApproval(approval, false);
        
        return approval;
    }

    /**
     * Batch approve actions
     */
    batchApprove(approvalIds, options = {}) {
        const results = [];
        
        for (const approvalId of approvalIds) {
            try {
                const approval = this.pendingApprovals.get(approvalId);
                if (approval && approval.batchable) {
                    const result = this.approveAction(approvalId, options);
                    results.push({ id: approvalId, status: 'approved', approval: result });
                } else {
                    results.push({ id: approvalId, status: 'error', error: 'Not batchable or not found' });
                }
            } catch (error) {
                results.push({ id: approvalId, status: 'error', error: error.message });
            }
        }
        
        this.emit('batchApprovalCompleted', { results, approvedBy: options.userId || 'user' });
        
        return results;
    }

    /**
     * Get pending approvals
     */
    getPendingApprovals(sessionId = null) {
        let approvals = Array.from(this.pendingApprovals.values());
        
        if (sessionId) {
            approvals = approvals.filter(a => a.sessionId === sessionId);
        }
        
        return approvals.sort((a, b) => {
            // Sort by priority: high risk first, then by timestamp
            if (a.riskLevel !== b.riskLevel) {
                const riskOrder = { high: 3, medium: 2, low: 1 };
                return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
            }
            return a.timestamp - b.timestamp;
        });
    }

    /**
     * Get approval queue for session
     */
    getApprovalQueue(sessionId) {
        return this.approvalQueues.get(sessionId) || [];
    }

    /**
     * Generate smart approval recommendations
     */
    generateSmartRecommendations(sessionId = null) {
        const pendingApprovals = this.getPendingApprovals(sessionId);
        const recommendations = [];
        
        // Batch approval recommendations
        const batchable = pendingApprovals.filter(a => a.batchable && a.riskLevel === 'low');
        if (batchable.length > 1) {
            recommendations.push({
                type: 'batch_approval',
                title: 'Batch Approve Low-Risk Actions',
                description: `Approve ${batchable.length} low-risk actions at once`,
                approvalIds: batchable.map(a => a.id),
                confidence: 0.8
            });
        }
        
        // Auto-approval setup recommendations
        const autoApprovableTypes = [...new Set(
            pendingApprovals
                .filter(a => a.autoApprovable && a.riskLevel === 'low')
                .map(a => a.category)
        )];
        
        if (autoApprovableTypes.length > 0) {
            recommendations.push({
                type: 'auto_approval_setup',
                title: 'Enable Auto-Approval',
                description: `Set up auto-approval for ${autoApprovableTypes.join(', ')} actions`,
                categories: autoApprovableTypes,
                confidence: 0.7
            });
        }
        
        return recommendations;
    }

    /**
     * Assess risk level of an action
     */
    assessRisk(actionDetails, approvalType) {
        let riskScore = 0;
        
        // Base risk from type
        if (approvalType.requiresReview) {
            riskScore += 30;
        }
        
        // File-based risk assessment
        if (actionDetails.files) {
            const criticalFiles = actionDetails.files.filter(file =>
                file.includes('package.json') ||
                file.includes('config') ||
                file.includes('env') ||
                file.includes('security') ||
                file.includes('auth')
            );
            riskScore += criticalFiles.length * 20;
        }
        
        // Command-based risk assessment
        if (actionDetails.commands) {
            const riskyCommands = actionDetails.commands.filter(cmd =>
                cmd.includes('rm ') ||
                cmd.includes('delete') ||
                cmd.includes('drop') ||
                cmd.includes('sudo')
            );
            riskScore += riskyCommands.length * 40;
        }
        
        // Confidence-based risk adjustment
        if (actionDetails.confidence < 0.5) {
            riskScore += 25;
        }
        
        // Determine risk level
        if (riskScore >= 70) return 'high';
        if (riskScore >= 35) return 'medium';
        return 'low';
    }

    /**
     * Generate user-friendly description
     */
    generateUserDescription(actionDetails, approvalType) {
        let description = approvalType.description;
        
        if (actionDetails.target) {
            description += ` for ${actionDetails.target}`;
        }
        
        if (actionDetails.files && actionDetails.files.length > 0) {
            const fileCount = actionDetails.files.length;
            if (fileCount === 1) {
                description += ` (1 file: ${actionDetails.files[0]})`;
            } else {
                description += ` (${fileCount} files)`;
            }
        }
        
        return description;
    }

    /**
     * Generate technical description
     */
    generateTechnicalDescription(actionDetails) {
        const parts = [];
        
        if (actionDetails.action) {
            parts.push(`Action: ${actionDetails.action}`);
        }
        
        if (actionDetails.files && actionDetails.files.length > 0) {
            parts.push(`Files: ${actionDetails.files.join(', ')}`);
        }
        
        if (actionDetails.commands && actionDetails.commands.length > 0) {
            parts.push(`Commands: ${actionDetails.commands.join('; ')}`);
        }
        
        return parts.join(' | ');
    }

    /**
     * Generate approval recommendation
     */
    generateRecommendation(actionDetails, approvalType) {
        const risk = this.assessRisk(actionDetails, approvalType);
        const confidence = actionDetails.confidence || 0.5;
        
        if (risk === 'low' && confidence >= 0.8) {
            return {
                action: 'approve',
                reason: 'Low risk and high confidence',
                confidence: 0.9
            };
        }
        
        if (risk === 'high' || confidence < 0.4) {
            return {
                action: 'review',
                reason: 'High risk or low confidence - review recommended',
                confidence: 0.8
            };
        }
        
        return {
            action: 'approve',
            reason: 'Moderate risk and confidence',
            confidence: 0.6
        };
    }

    /**
     * Generate alternative actions
     */
    generateAlternatives(actionDetails) {
        const alternatives = [];
        
        if (actionDetails.type === 'codeChange') {
            alternatives.push({
                title: 'Review Changes First',
                description: 'Show me the proposed changes before applying',
                action: 'preview'
            });
            
            alternatives.push({
                title: 'Apply to Test Branch',
                description: 'Create changes in a separate branch first',
                action: 'test_branch'
            });
        }
        
        if (actionDetails.type === 'packageInstall') {
            alternatives.push({
                title: 'Check Package Security',
                description: 'Audit package for security issues first',
                action: 'security_audit'
            });
        }
        
        return alternatives;
    }

    /**
     * Generate approval options
     */
    generateApprovalOptions(actionDetails, approvalType) {
        const options = [
            {
                id: 'approve',
                label: 'Approve',
                description: 'Execute the action as proposed',
                icon: '✅',
                style: 'primary'
            },
            {
                id: 'reject',
                label: 'Reject',
                description: 'Cancel this action',
                icon: '❌',
                style: 'danger'
            }
        ];
        
        if (approvalType.batchable) {
            options.push({
                id: 'approve_all_similar',
                label: 'Approve All Similar',
                description: 'Approve this and all similar pending actions',
                icon: '✅🔄',
                style: 'success'
            });
        }
        
        if (actionDetails.files && actionDetails.files.length > 1) {
            options.push({
                id: 'approve_partial',
                label: 'Approve Selected',
                description: 'Choose which files to include',
                icon: '✅📁',
                style: 'secondary'
            });
        }
        
        return options;
    }

    /**
     * Helper methods
     */
    generateApprovalId() {
        return `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    addToQueue(sessionId, approval) {
        if (!this.approvalQueues.has(sessionId)) {
            this.approvalQueues.set(sessionId, []);
        }
        this.approvalQueues.get(sessionId).push(approval);
    }

    removeFromQueue(sessionId, approvalId) {
        const queue = this.approvalQueues.get(sessionId);
        if (queue) {
            const index = queue.findIndex(a => a.id === approvalId);
            if (index !== -1) {
                queue.splice(index, 1);
            }
        }
    }

    setApprovalTimeout(approval) {
        setTimeout(() => {
            if (this.pendingApprovals.has(approval.id)) {
                approval.status = 'timeout';
                approval.timedOutAt = Date.now();
                
                this.pendingApprovals.delete(approval.id);
                this.recordApproval(approval);
                this.emit('approvalTimeout', approval);
            }
        }, this.config.approvalTimeout);
    }

    recordApproval(approval) {
        this.approvalHistory.push(approval);
        
        // Store in memory system if available
        if (this.memorySystem) {
            this.memorySystem.storeTaskOutcome(
                approval.action,
                'approval-system',
                approval.status,
                approval.status === 'approved' ? 0.8 : 0.3,
                approval.approvedAt ? approval.approvedAt - approval.timestamp : null,
                'approval_workflow',
                approval.files,
                {
                    type: approval.type,
                    riskLevel: approval.riskLevel,
                    approvalType: approval.approvalType
                }
            );
        }
        
        // Trim history
        if (this.approvalHistory.length > 100) {
            this.approvalHistory = this.approvalHistory.slice(-100);
        }
    }

    learnFromApproval(approval, wasApproved) {
        if (!this.config.learningEnabled) return;
        
        // Update user preferences
        const category = approval.category;
        const currentPref = this.userPreferences.get(category) || { approvals: 0, rejections: 0 };
        
        if (wasApproved) {
            currentPref.approvals++;
        } else {
            currentPref.rejections++;
        }
        
        this.userPreferences.set(category, currentPref);
        
        // Store learning in memory system
        if (this.memorySystem) {
            this.memorySystem.storeUserPreference(
                'approval',
                category,
                wasApproved ? 'tends_to_approve' : 'tends_to_reject',
                0.7,
                `learned_from_${approval.type}_approval`
            );
        }
    }

    getUserPreference(category) {
        const pref = this.userPreferences.get(category);
        if (!pref) return 'ask';
        
        const total = pref.approvals + pref.rejections;
        if (total < 3) return 'ask'; // Need more data
        
        const approvalRate = pref.approvals / total;
        if (approvalRate > 0.8) return 'auto_approve';
        if (approvalRate < 0.3) return 'always_ask';
        
        return 'ask';
    }

    loadUserPreferences() {
        if (this.memorySystem) {
            try {
                const prefs = this.memorySystem.getUserPreferences('approval');
                prefs.forEach(pref => {
                    this.userPreferences.set(pref.preferenceKey, {
                        value: pref.preferenceValue,
                        confidence: pref.confidence
                    });
                });
            } catch (error) {
                console.warn('Approval Workflows: Failed to load user preferences:', error);
            }
        }
    }

    /**
     * Get approval statistics
     */
    getStats() {
        const stats = {
            pending: this.pendingApprovals.size,
            totalProcessed: this.approvalHistory.length,
            approvalRate: 0,
            averageResponseTime: 0,
            riskDistribution: { low: 0, medium: 0, high: 0 },
            categoryStats: {}
        };
        
        if (this.approvalHistory.length > 0) {
            const approved = this.approvalHistory.filter(a => a.status === 'approved').length;
            stats.approvalRate = approved / this.approvalHistory.length;
            
            const responseTimes = this.approvalHistory
                .filter(a => a.approvedAt || a.rejectedAt)
                .map(a => (a.approvedAt || a.rejectedAt) - a.timestamp);
            
            if (responseTimes.length > 0) {
                stats.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            }
            
            // Risk distribution
            this.approvalHistory.forEach(approval => {
                stats.riskDistribution[approval.riskLevel]++;
            });
            
            // Category stats
            this.approvalHistory.forEach(approval => {
                if (!stats.categoryStats[approval.category]) {
                    stats.categoryStats[approval.category] = { total: 0, approved: 0 };
                }
                stats.categoryStats[approval.category].total++;
                if (approval.status === 'approved') {
                    stats.categoryStats[approval.category].approved++;
                }
            });
        }
        
        return stats;
    }
}

module.exports = { ApprovalWorkflows };