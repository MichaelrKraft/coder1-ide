/**
 * Error Detector for Supervision Intervention
 * 
 * Analyzes terminal output and Claude Code responses to detect confusion,
 * errors, and situations requiring supervision intervention.
 */

const { EventEmitter } = require('events');

class ErrorDetector extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.confidenceThreshold = options.confidenceThreshold || 0.7;
        this.patternHistory = [];
        this.maxHistorySize = 1000;
        
        // Pattern definitions for different types of problems
        this.errorPatterns = {
            // Claude Code confusion signals
            confusion: [
                /could you please clarify/i,
                /i'm not sure what you mean/i,
                /can you provide more details/i,
                /i don't understand/i,
                /unclear what/i,
                /need more information/i,
                /what specific.*do you want/i,
                /which.*are you referring to/i
            ],

            // File and path errors
            fileErrors: [
                /no such file or directory/i,
                /file not found/i,
                /cannot find.*file/i,
                /failed to read.*file/i,
                /claude\.md.*not found/i,
                /claude\.md.*does not exist/i,
                /permission denied.*file/i,
                /access denied.*file/i
            ],

            // Requirements and context missing
            requirementsMissing: [
                /cannot find.*requirements/i,
                /no requirements.*found/i,
                /missing requirements/i,
                /requirements.*not specified/i,
                /unclear requirements/i,
                /requirements.*file.*missing/i,
                /todo.*files.*empty/i,
                /no.*todo.*found/i
            ],

            // Command execution errors
            commandErrors: [
                /command not found/i,
                /bash:.*command not found/i,
                /permission denied/i,
                /access denied/i,
                /operation not permitted/i,
                /no such command/i,
                /failed to execute/i
            ],

            // Network and connectivity issues
            networkErrors: [
                /connection.*failed/i,
                /network.*error/i,
                /timeout.*error/i,
                /unable to connect/i,
                /connection refused/i,
                /dns.*error/i,
                /host.*unreachable/i
            ],

            // Installation and dependency errors
            dependencyErrors: [
                /npm.*error/i,
                /package.*not found/i,
                /dependency.*missing/i,
                /installation.*failed/i,
                /module.*not found/i,
                /cannot resolve.*module/i,
                /peer.*dependency/i
            ],

            // Build and compilation errors
            buildErrors: [
                /build.*failed/i,
                /compilation.*error/i,
                /syntax.*error/i,
                /type.*error/i,
                /typescript.*error/i,
                /eslint.*error/i,
                /webpack.*error/i
            ],

            // Claude Code process issues  
            claudeCodeErrors: [
                /claude.*code.*not.*installed/i,
                /claude.*code.*failed/i,
                /anthropic.*api.*error/i,
                /authentication.*failed/i,
                /api.*key.*invalid/i,
                /quota.*exceeded/i,
                /rate.*limit/i
            ]
        };

        // Severity levels for different error types
        this.errorSeverity = {
            confusion: 'high',           // Requires immediate intervention
            requirementsMissing: 'high', // Critical workflow blocker  
            fileErrors: 'medium',        // Often recoverable
            commandErrors: 'medium',     // Usually fixable
            claudeCodeErrors: 'high',    // System-level issue
            buildErrors: 'low',          // Development process
            dependencyErrors: 'medium',  // Environment issue
            networkErrors: 'low'         // External dependency
        };

        console.log('🔍 ErrorDetector: Monitoring output for intervention opportunities');
    }

    /**
     * Analyze terminal output for errors and confusion
     */
    analyzeOutput(output, context = {}) {
        if (!output || typeof output !== 'string') {
            return null;
        }

        const detectedIssues = [];
        
        // Check each error pattern category
        Object.entries(this.errorPatterns).forEach(([category, patterns]) => {
            patterns.forEach(pattern => {
                const match = output.match(pattern);
                if (match) {
                    const issue = {
                        type: category,
                        severity: this.errorSeverity[category] || 'medium',
                        pattern: pattern.source,
                        matchedText: match[0],
                        fullOutput: output.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
                        timestamp: Date.now(),
                        context,
                        confidence: this.calculateConfidence(category, match, output),
                        interventionRequired: this.shouldIntervene(category, match, context)
                    };

                    detectedIssues.push(issue);

                    if (issue.interventionRequired) {
                        console.log(`🚨 ErrorDetector: Intervention needed - ${category}: ${match[0]}`);
                    } else {
                        console.log(`⚠️  ErrorDetector: Issue detected - ${category}: ${match[0]}`);
                    }
                }
            });
        });

        // Record pattern history for learning
        if (detectedIssues.length > 0) {
            this.recordPatternHistory(detectedIssues, output, context);
        }

        // Emit events for detected issues
        detectedIssues.forEach(issue => {
            this.emit('issueDetected', issue);
            
            if (issue.interventionRequired) {
                this.emit('interventionRequired', {
                    ...issue,
                    recommendedAction: this.getRecommendedAction(issue)
                });
            }
        });

        return detectedIssues.length > 0 ? detectedIssues : null;
    }

    /**
     * Analyze Claude Code specific responses for confusion signals
     */
    analyzeClaudeCodeResponse(response, sessionContext = {}) {
        if (!response || typeof response !== 'string') {
            return null;
        }

        const confusionSignals = [];

        // Look for confusion patterns specifically in Claude Code responses
        this.errorPatterns.confusion.forEach(pattern => {
            const match = response.match(pattern);
            if (match) {
                confusionSignals.push({
                    type: 'claude_code_confusion',
                    severity: 'high',
                    signal: match[0],
                    fullResponse: response,
                    timestamp: Date.now(),
                    context: sessionContext,
                    confidence: 0.9, // High confidence for direct Claude responses
                    interventionRequired: true,
                    recommendedAction: this.getConfusionIntervention(match[0], response, sessionContext)
                });
            }
        });

        // Analyze response for missing context indicators
        const contextMissingPatterns = [
            /what.*project.*working.*on/i,
            /need.*more.*context/i,
            /don't.*see.*any.*files/i,
            /project.*directory.*empty/i,
            /no.*code.*files.*found/i
        ];

        contextMissingPatterns.forEach(pattern => {
            const match = response.match(pattern);
            if (match) {
                confusionSignals.push({
                    type: 'missing_context',
                    severity: 'high',
                    signal: match[0],
                    fullResponse: response,
                    timestamp: Date.now(),
                    context: sessionContext,
                    confidence: 0.8,
                    interventionRequired: true,
                    recommendedAction: this.getContextIntervention(match[0], response, sessionContext)
                });
            }
        });

        if (confusionSignals.length > 0) {
            console.log(`🤔 ErrorDetector: Claude Code confusion detected (${confusionSignals.length} signals)`);
            
            confusionSignals.forEach(signal => {
                this.emit('claudeCodeConfusion', signal);
            });
        }

        return confusionSignals.length > 0 ? confusionSignals : null;
    }

    /**
     * Calculate confidence level for detected issue
     */
    calculateConfidence(category, match, fullOutput) {
        let confidence = 0.5;

        // Boost confidence for exact pattern matches
        if (match[0].length > 10) {
            confidence += 0.2;
        }

        // Boost confidence for context-specific categories
        if (category === 'confusion' && fullOutput.toLowerCase().includes('claude')) {
            confidence += 0.3;
        }

        if (category === 'requirementsMissing' && fullOutput.toLowerCase().includes('requirements')) {
            confidence += 0.2;
        }

        // Reduce confidence if the pattern appears in a comment or log message
        if (fullOutput.includes('//') || fullOutput.includes('/*') || fullOutput.includes('console.log')) {
            confidence -= 0.2;
        }

        return Math.max(0.1, Math.min(1.0, confidence));
    }

    /**
     * Determine if intervention is required
     */
    shouldIntervene(category, match, context) {
        // Always intervene for high-severity issues
        if (this.errorSeverity[category] === 'high') {
            return true;
        }

        // Intervene for medium-severity issues in active sessions
        if (this.errorSeverity[category] === 'medium' && context.sessionId) {
            return true;
        }

        // Intervene for repeated issues
        const recentSimilar = this.patternHistory
            .filter(p => p.category === category && Date.now() - p.timestamp < 300000) // 5 minutes
            .length;

        return recentSimilar >= 2;
    }

    /**
     * Get recommended action for detected issue
     */
    getRecommendedAction(issue) {
        const actions = {
            confusion: {
                type: 'provide_clarification',
                message: 'Claude Code needs clarification. I\'ll provide more specific guidance.',
                automated: true,
                priority: 'immediate'
            },
            requirementsMissing: {
                type: 'inject_requirements',
                message: 'Requirements are missing. I\'ll create the necessary context files.',
                automated: true,
                priority: 'immediate'
            },
            fileErrors: {
                type: 'fix_file_paths',
                message: 'File path issues detected. I\'ll resolve the missing files.',
                automated: true,
                priority: 'high'
            },
            commandErrors: {
                type: 'fix_command_issues',
                message: 'Command execution failed. I\'ll provide alternative approaches.',
                automated: false,
                priority: 'medium'
            },
            claudeCodeErrors: {
                type: 'fix_claude_code_setup',
                message: 'Claude Code setup issue detected. I\'ll help resolve the configuration.',
                automated: false,
                priority: 'high'
            }
        };

        return actions[issue.type] || {
            type: 'general_assistance',
            message: 'Issue detected. I\'ll analyze and provide appropriate help.',
            automated: false,
            priority: 'low'
        };
    }

    /**
     * Get intervention for Claude Code confusion
     */
    getConfusionIntervention(signal, fullResponse, context) {
        if (signal.toLowerCase().includes('requirements') || signal.toLowerCase().includes('clarify')) {
            return {
                type: 'inject_requirements_context',
                action: 'Provide clear requirements and project context',
                message: 'I\'ll inject the missing requirements directly into the conversation.',
                priority: 'immediate',
                automated: true
            };
        }

        if (signal.toLowerCase().includes('file') || signal.toLowerCase().includes('directory')) {
            return {
                type: 'create_missing_files',
                action: 'Create or locate missing files',
                message: 'I\'ll create the necessary files and directory structure.',
                priority: 'high',
                automated: true
            };
        }

        return {
            type: 'provide_detailed_guidance',
            action: 'Give specific step-by-step guidance',
            message: 'I\'ll provide clearer, more specific instructions.',
            priority: 'high',
            automated: true
        };
    }

    /**
     * Get intervention for missing context
     */
    getContextIntervention(signal, fullResponse, context) {
        return {
            type: 'inject_project_context',
            action: 'Provide comprehensive project context',
            message: 'I\'ll supply the missing project context and files.',
            priority: 'immediate',
            automated: true,
            contextData: {
                projectStructure: true,
                requirements: true,
                existingFiles: true
            }
        };
    }

    /**
     * Record pattern history for learning
     */
    recordPatternHistory(issues, output, context) {
        issues.forEach(issue => {
            this.patternHistory.push({
                category: issue.type,
                timestamp: issue.timestamp,
                confidence: issue.confidence,
                context: context.sessionId || 'unknown',
                outputLength: output.length
            });
        });

        // Trim history to max size
        if (this.patternHistory.length > this.maxHistorySize) {
            this.patternHistory = this.patternHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Get error detection statistics
     */
    getStats() {
        const stats = {
            totalDetections: this.patternHistory.length,
            recentDetections: 0,
            categoryBreakdown: {},
            averageConfidence: 0,
            interventionRate: 0
        };

        const recentTime = Date.now() - 3600000; // 1 hour
        let totalConfidence = 0;
        let interventions = 0;

        this.patternHistory.forEach(pattern => {
            // Count recent detections
            if (pattern.timestamp > recentTime) {
                stats.recentDetections++;
            }

            // Category breakdown
            stats.categoryBreakdown[pattern.category] = 
                (stats.categoryBreakdown[pattern.category] || 0) + 1;

            // Confidence calculation
            totalConfidence += pattern.confidence;

            // Count interventions (high confidence detections)
            if (pattern.confidence >= this.confidenceThreshold) {
                interventions++;
            }
        });

        if (this.patternHistory.length > 0) {
            stats.averageConfidence = totalConfidence / this.patternHistory.length;
            stats.interventionRate = interventions / this.patternHistory.length;
        }

        return stats;
    }

    /**
     * Clear pattern history (for testing or reset)
     */
    clearHistory() {
        this.patternHistory = [];
        console.log('🧹 ErrorDetector: Pattern history cleared');
    }
}

module.exports = { ErrorDetector };