/**
 * Claude Code Monitor - Real-time Output Tracking
 * 
 * Monitors Claude Code execution in real-time, capturing all output,
 * detecting patterns that require intervention, and maintaining a
 * comprehensive log of the entire session for supervision analysis.
 */

const { EventEmitter } = require('events');
const readline = require('readline');

class ClaudeCodeMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.sessionId = options.sessionId || `monitor-${Date.now()}`;
        this.logger = options.logger || console;
        
        // Output buffers
        this.outputBuffer = [];
        this.errorBuffer = [];
        this.fullSessionLog = [];
        this.maxBufferSize = options.maxBufferSize || 1000;
        
        // Pattern recognition
        this.patterns = {
            confusion: {
                // High priority confusion patterns
                high: [
                    { pattern: /could you please clarify/i, type: 'clarification_needed' },
                    { pattern: /what specific.*requirements.*referring to/i, type: 'requirements_missing' },
                    { pattern: /cannot find.*claude\.md/i, type: 'claude_md_missing' },
                    { pattern: /no requirements.*found/i, type: 'requirements_not_found' },
                    { pattern: /i don't understand/i, type: 'general_confusion' }
                ],
                // Medium priority confusion patterns
                medium: [
                    { pattern: /i'm not sure/i, type: 'uncertainty' },
                    { pattern: /unclear what/i, type: 'unclear_instructions' },
                    { pattern: /need more information/i, type: 'missing_information' },
                    { pattern: /what.*should.*i.*do/i, type: 'direction_needed' }
                ]
            },
            
            questions: [
                { pattern: /which.*file.*should/i, type: 'file_selection' },
                { pattern: /where.*should.*i.*create/i, type: 'location_question' },
                { pattern: /how.*should.*i.*implement/i, type: 'implementation_question' },
                { pattern: /what.*is.*the.*next.*step/i, type: 'next_step_question' },
                { pattern: /should.*i.*use/i, type: 'choice_question' }
            ],
            
            permissions: [
                { pattern: /permission.*to.*create/i, type: 'create_permission' },
                { pattern: /permission.*to.*modify/i, type: 'modify_permission' },
                { pattern: /permission.*to.*delete/i, type: 'delete_permission' },
                { pattern: /permission.*denied/i, type: 'permission_denied' },
                { pattern: /would you like me to/i, type: 'action_confirmation' }
            ],
            
            errors: [
                { pattern: /error:/i, type: 'error' },
                { pattern: /failed to/i, type: 'failure' },
                { pattern: /command not found/i, type: 'command_not_found' },
                { pattern: /file not found/i, type: 'file_not_found' },
                { pattern: /no such file or directory/i, type: 'path_error' }
            ],
            
            progress: [
                { pattern: /creating.*file/i, type: 'file_creation' },
                { pattern: /implementing/i, type: 'implementation' },
                { pattern: /writing.*code/i, type: 'coding' },
                { pattern: /testing/i, type: 'testing' },
                { pattern: /completed|finished/i, type: 'completion' }
            ]
        };
        
        // State tracking
        this.state = {
            isWaitingForResponse: false,
            lastQuestion: null,
            lastQuestionTime: null,
            unansweredQuestions: [],
            interventionPoints: [],
            progressMarkers: [],
            currentActivity: 'initializing'
        };
        
        // Statistics
        this.stats = {
            linesProcessed: 0,
            patternsDetected: 0,
            confusionDetected: 0,
            questionsDetected: 0,
            errorsDetected: 0,
            interventionsNeeded: 0,
            startTime: Date.now()
        };
        
        this.logger.log('📊 ClaudeCodeMonitor: Initialized real-time output monitoring');
    }

    /**
     * Attach to Claude Code process for monitoring
     */
    attachToProcess(claudeCodeProcess) {
        if (!claudeCodeProcess) {
            this.logger.error('❌ ClaudeCodeMonitor: No process to attach to');
            return false;
        }
        
        this.claudeProcess = claudeCodeProcess;
        
        // Create readline interfaces for better line-by-line processing
        this.stdoutReader = readline.createInterface({
            input: claudeCodeProcess.stdout,
            crlfDelay: Infinity
        });
        
        this.stderrReader = readline.createInterface({
            input: claudeCodeProcess.stderr,
            crlfDelay: Infinity
        });
        
        // Set up monitoring
        this.setupMonitoring();
        
        this.logger.log('✅ ClaudeCodeMonitor: Attached to Claude Code process');
        return true;
    }

    /**
     * Set up monitoring for stdout and stderr
     */
    setupMonitoring() {
        // Monitor stdout line by line
        this.stdoutReader.on('line', (line) => {
            this.processOutputLine(line, 'stdout');
        });
        
        // Monitor stderr line by line
        this.stderrReader.on('line', (line) => {
            this.processOutputLine(line, 'stderr');
        });
        
        // Handle process exit
        this.claudeProcess.on('exit', (code, signal) => {
            this.handleProcessExit(code, signal);
        });
    }

    /**
     * Process a single line of output
     */
    processOutputLine(line, stream) {
        const timestamp = Date.now();
        
        // Add to buffers
        this.addToBuffer(line, stream);
        
        // Log to session
        this.fullSessionLog.push({
            timestamp,
            stream,
            content: line
        });
        
        // Update statistics
        this.stats.linesProcessed++;
        
        // Analyze the line for patterns
        const analysis = this.analyzeLine(line);
        
        // Handle detected patterns
        if (analysis.patterns.length > 0) {
            this.handleDetectedPatterns(analysis, line, timestamp);
        }
        
        // Emit raw output event
        this.emit('outputLine', {
            sessionId: this.sessionId,
            stream,
            line,
            timestamp,
            analysis
        });
        
        // Check if intervention is needed
        if (analysis.interventionNeeded) {
            this.triggerIntervention(analysis, line);
        }
    }

    /**
     * Analyze a line for patterns
     */
    analyzeLine(line) {
        const analysis = {
            patterns: [],
            categories: new Set(),
            priority: 'low',
            interventionNeeded: false,
            confidence: 0
        };
        
        // Check confusion patterns (high priority)
        for (const confusionPattern of this.patterns.confusion.high) {
            if (confusionPattern.pattern.test(line)) {
                analysis.patterns.push({
                    category: 'confusion',
                    type: confusionPattern.type,
                    priority: 'high',
                    pattern: confusionPattern.pattern.source
                });
                analysis.categories.add('confusion');
                analysis.priority = 'high';
                analysis.interventionNeeded = true;
                this.stats.confusionDetected++;
            }
        }
        
        // Check confusion patterns (medium priority)
        for (const confusionPattern of this.patterns.confusion.medium) {
            if (confusionPattern.pattern.test(line)) {
                analysis.patterns.push({
                    category: 'confusion',
                    type: confusionPattern.type,
                    priority: 'medium',
                    pattern: confusionPattern.pattern.source
                });
                analysis.categories.add('confusion');
                if (analysis.priority === 'low') {
                    analysis.priority = 'medium';
                }
                this.stats.confusionDetected++;
            }
        }
        
        // Check question patterns
        for (const questionPattern of this.patterns.questions) {
            if (questionPattern.pattern.test(line)) {
                analysis.patterns.push({
                    category: 'question',
                    type: questionPattern.type,
                    priority: 'medium',
                    pattern: questionPattern.pattern.source
                });
                analysis.categories.add('question');
                analysis.interventionNeeded = true;
                this.stats.questionsDetected++;
                
                // Track unanswered question
                this.state.lastQuestion = line;
                this.state.lastQuestionTime = Date.now();
                this.state.unansweredQuestions.push({
                    question: line,
                    type: questionPattern.type,
                    timestamp: Date.now()
                });
            }
        }
        
        // Check permission patterns
        for (const permissionPattern of this.patterns.permissions) {
            if (permissionPattern.pattern.test(line)) {
                analysis.patterns.push({
                    category: 'permission',
                    type: permissionPattern.type,
                    priority: 'high',
                    pattern: permissionPattern.pattern.source
                });
                analysis.categories.add('permission');
                analysis.priority = 'high';
                analysis.interventionNeeded = true;
            }
        }
        
        // Check error patterns
        for (const errorPattern of this.patterns.errors) {
            if (errorPattern.pattern.test(line)) {
                analysis.patterns.push({
                    category: 'error',
                    type: errorPattern.type,
                    priority: 'high',
                    pattern: errorPattern.pattern.source
                });
                analysis.categories.add('error');
                analysis.priority = 'high';
                this.stats.errorsDetected++;
            }
        }
        
        // Check progress patterns
        for (const progressPattern of this.patterns.progress) {
            if (progressPattern.pattern.test(line)) {
                analysis.patterns.push({
                    category: 'progress',
                    type: progressPattern.type,
                    priority: 'low',
                    pattern: progressPattern.pattern.source
                });
                analysis.categories.add('progress');
                
                // Update current activity
                this.state.currentActivity = progressPattern.type;
                this.state.progressMarkers.push({
                    type: progressPattern.type,
                    timestamp: Date.now(),
                    line: line
                });
            }
        }
        
        // Calculate confidence
        if (analysis.patterns.length > 0) {
            analysis.confidence = this.calculateConfidence(analysis.patterns, line);
            this.stats.patternsDetected += analysis.patterns.length;
        }
        
        return analysis;
    }

    /**
     * Calculate confidence for pattern detection
     */
    calculateConfidence(patterns, line) {
        let confidence = 0.5;
        
        // Higher confidence for multiple patterns
        confidence += patterns.length * 0.1;
        
        // Higher confidence for high priority patterns
        const highPriorityCount = patterns.filter(p => p.priority === 'high').length;
        confidence += highPriorityCount * 0.2;
        
        // Higher confidence for exact matches
        if (line.toLowerCase().includes('could you please clarify')) {
            confidence += 0.3;
        }
        
        // Cap at 1.0
        return Math.min(confidence, 1.0);
    }

    /**
     * Handle detected patterns
     */
    handleDetectedPatterns(analysis, line, timestamp) {
        this.logger.log(`🔍 Patterns detected: ${Array.from(analysis.categories).join(', ')}`);
        
        // Emit pattern detection event
        this.emit('patternsDetected', {
            sessionId: this.sessionId,
            analysis,
            line,
            timestamp,
            currentActivity: this.state.currentActivity
        });
        
        // Track intervention points if needed
        if (analysis.interventionNeeded) {
            this.state.interventionPoints.push({
                timestamp,
                line,
                analysis,
                addressed: false
            });
            this.stats.interventionsNeeded++;
        }
    }

    /**
     * Trigger intervention based on analysis
     */
    triggerIntervention(analysis, line) {
        this.logger.log('🚨 ClaudeCodeMonitor: Intervention needed');
        
        // Determine intervention type
        const interventionType = this.determineInterventionType(analysis);
        
        // Emit intervention request
        this.emit('interventionRequired', {
            sessionId: this.sessionId,
            type: interventionType,
            analysis,
            line,
            context: this.getInterventionContext(),
            timestamp: Date.now()
        });
        
        // Mark as waiting for response
        this.state.isWaitingForResponse = true;
    }

    /**
     * Determine the type of intervention needed
     */
    determineInterventionType(analysis) {
        // Priority order for intervention types
        if (analysis.categories.has('permission')) {
            return 'permission_request';
        }
        
        if (analysis.categories.has('confusion') && analysis.priority === 'high') {
            return 'critical_confusion';
        }
        
        if (analysis.categories.has('question')) {
            return 'question_response';
        }
        
        if (analysis.categories.has('error')) {
            return 'error_recovery';
        }
        
        if (analysis.categories.has('confusion')) {
            return 'general_guidance';
        }
        
        return 'general_intervention';
    }

    /**
     * Get context for intervention
     */
    getInterventionContext() {
        return {
            recentOutput: this.outputBuffer.slice(-10),
            recentErrors: this.errorBuffer.slice(-5),
            unansweredQuestions: this.state.unansweredQuestions,
            currentActivity: this.state.currentActivity,
            progressMarkers: this.state.progressMarkers.slice(-5),
            sessionDuration: Date.now() - this.stats.startTime
        };
    }

    /**
     * Mark intervention as handled
     */
    markInterventionHandled(interventionResponse) {
        this.state.isWaitingForResponse = false;
        
        // Clear answered questions
        if (interventionResponse.type === 'question_response') {
            this.state.unansweredQuestions = [];
            this.state.lastQuestion = null;
        }
        
        // Mark intervention points as addressed
        const recentInterventions = this.state.interventionPoints.filter(
            point => !point.addressed && Date.now() - point.timestamp < 30000
        );
        
        recentInterventions.forEach(point => {
            point.addressed = true;
            point.response = interventionResponse;
        });
        
        this.logger.log('✅ ClaudeCodeMonitor: Intervention handled');
    }

    /**
     * Add line to appropriate buffer
     */
    addToBuffer(line, stream) {
        if (stream === 'stderr') {
            this.errorBuffer.push(line);
            if (this.errorBuffer.length > this.maxBufferSize) {
                this.errorBuffer.shift();
            }
        } else {
            this.outputBuffer.push(line);
            if (this.outputBuffer.length > this.maxBufferSize) {
                this.outputBuffer.shift();
            }
        }
    }

    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            sessionId: this.sessionId,
            state: this.state,
            stats: {
                ...this.stats,
                monitoringDuration: Date.now() - this.stats.startTime,
                linesPerMinute: this.stats.linesProcessed / ((Date.now() - this.stats.startTime) / 60000),
                interventionRate: this.stats.interventionsNeeded / this.stats.linesProcessed
            },
            buffers: {
                outputSize: this.outputBuffer.length,
                errorSize: this.errorBuffer.length,
                sessionLogSize: this.fullSessionLog.length
            }
        };
    }

    /**
     * Get recent output for analysis
     */
    getRecentOutput(lines = 20) {
        return {
            output: this.outputBuffer.slice(-lines),
            errors: this.errorBuffer.slice(-Math.floor(lines / 2)),
            lastActivity: this.state.currentActivity,
            lastQuestion: this.state.lastQuestion
        };
    }

    /**
     * Get full session log
     */
    getSessionLog() {
        return this.fullSessionLog;
    }

    /**
     * Handle process exit
     */
    handleProcessExit(code, signal) {
        this.logger.log(`📌 ClaudeCodeMonitor: Process exited (code: ${code}, signal: ${signal})`);
        
        // Final analysis
        const finalAnalysis = {
            exitCode: code,
            signal: signal,
            stats: this.getStatus().stats,
            unresolvedQuestions: this.state.unansweredQuestions,
            unaddressedInterventions: this.state.interventionPoints.filter(p => !p.addressed),
            finalActivity: this.state.currentActivity
        };
        
        this.emit('processExited', {
            sessionId: this.sessionId,
            analysis: finalAnalysis,
            timestamp: Date.now()
        });
        
        // Clean up
        if (this.stdoutReader) {
            this.stdoutReader.close();
        }
        if (this.stderrReader) {
            this.stderrReader.close();
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.stdoutReader) {
            this.stdoutReader.close();
        }
        if (this.stderrReader) {
            this.stderrReader.close();
        }
        
        this.outputBuffer = [];
        this.errorBuffer = [];
        this.fullSessionLog = [];
        
        this.logger.log('🧹 ClaudeCodeMonitor: Cleaned up resources');
    }
}

module.exports = { ClaudeCodeMonitor };