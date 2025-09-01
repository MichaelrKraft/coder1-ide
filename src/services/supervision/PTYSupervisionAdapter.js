/**
 * PTY Supervision Adapter - Bridge between Terminal PTY and Supervision System
 * 
 * This is the core component that enables actual AI-supervising-AI intervention.
 * It monitors PTY output for Claude questions/confusion and injects responses
 * directly into the PTY stream, allowing seamless supervision of Claude Code CLI.
 */

const { EventEmitter } = require('events');
const { SmartResponseEngine } = require('./SmartResponseEngine');

class PTYSupervisionAdapter extends EventEmitter {
    constructor(ptyProcess, supervisionSystem, options = {}) {
        super();
        
        this.pty = ptyProcess;
        this.supervision = supervisionSystem;
        this.sessionId = options.sessionId || `pty-${Date.now()}`;
        this.logger = options.logger || console;
        
        // Supervision state
        this.isActive = false;
        this.interventionCount = 0;
        this.lastIntervention = null;
        
        // Pattern detection for Claude Code CLI questions and confusion
        this.patterns = {
            // Claude Code CLI specific questions with 1/2/3 option system
            questions: [
                // Direct Claude Code CLI patterns
                { pattern: /shall i proceed/i, response: '1', confidence: 0.95, type: 'claude_cli_proceed' },
                { pattern: /should i continue/i, response: '1', confidence: 0.95, type: 'claude_cli_proceed' },
                { pattern: /would you like me to/i, response: '1', confidence: 0.9, type: 'claude_cli_proceed' },
                { pattern: /may i (create|implement|add|modify|update)/i, response: '1', confidence: 0.9, type: 'claude_cli_proceed' },
                
                // Claude Code CLI option detection (multiline support)
                { pattern: /1\.\s*(means?\s*)?proceed(?:\s|$)/i, response: '1', confidence: 0.98, type: 'claude_cli_options' },
                { pattern: /2\.\s*(means?\s*)?proceed.*don'?t ask/is, response: '1', confidence: 0.95, type: 'claude_cli_options' },
                { pattern: /3\.\s*(means?\s*)?don'?t proceed/i, response: '1', confidence: 0.95, type: 'claude_cli_options' },
                
                // Detect when all three options are presented together
                { pattern: /1\.\s*means.*2\.\s*means.*3\.\s*means/is, response: '1', confidence: 0.99, type: 'claude_cli_full_options' },
                
                // Generic approval patterns (lower confidence)
                { pattern: /is this correct/i, response: '1', confidence: 0.8, type: 'generic_approval' },
                { pattern: /can i (create|modify|update)/i, response: '1', confidence: 0.8, type: 'generic_approval' },
                
                // Auto-approve patterns (use option 2 - proceed and don't ask again)
                { pattern: /shall i create.*tests?/i, response: '2', confidence: 0.85, type: 'auto_approve' },
                { pattern: /should i add.*comment/i, response: '2', confidence: 0.85, type: 'auto_approve' },
                { pattern: /may i format.*code/i, response: '2', confidence: 0.85, type: 'auto_approve' },
                { pattern: /shall i create.*documentation/i, response: '2', confidence: 0.85, type: 'auto_approve' }
            ],
            
            // Confusion patterns that need help
            confusion: [
                // Claude Code CLI specific confusion patterns
                { pattern: /i'm not sure/i, type: 'uncertainty', priority: 'medium' },
                { pattern: /could you (clarify|help)/i, type: 'needs_clarification', priority: 'high' },
                { pattern: /i don't understand/i, type: 'general_confusion', priority: 'medium' },
                { pattern: /what (should|do) i/i, type: 'direction_needed', priority: 'high' },
                { pattern: /cannot find.*requirements/i, type: 'missing_requirements', priority: 'high' },
                { pattern: /no.*claude\.md/i, type: 'missing_claude_md', priority: 'high' },
                
                // Claude Code CLI specific patterns
                { pattern: /unclear.*context/i, type: 'context_confusion', priority: 'high' },
                { pattern: /not confident.*approach/i, type: 'approach_uncertainty', priority: 'medium' },
                { pattern: /should i.*instead/i, type: 'alternative_needed', priority: 'medium' },
                { pattern: /missing.*information/i, type: 'incomplete_context', priority: 'high' }
            ],
            
            // Error patterns that might need intervention
            errors: [
                // Standard error patterns
                { pattern: /error:/i, type: 'error', priority: 'high' },
                { pattern: /failed to/i, type: 'failure', priority: 'medium' },
                { pattern: /permission denied/i, type: 'permission_error', priority: 'high' },
                { pattern: /command not found/i, type: 'command_error', priority: 'medium' },
                
                // Claude Code CLI specific error patterns
                { pattern: /claude.* not found/i, type: 'claude_cli_missing', priority: 'high' },
                { pattern: /api.*key.*invalid/i, type: 'api_key_error', priority: 'high' },
                { pattern: /rate.*limit.*exceeded/i, type: 'rate_limit_error', priority: 'medium' },
                { pattern: /authentication.*failed/i, type: 'auth_error', priority: 'high' },
                { pattern: /tool.*execution.*failed/i, type: 'tool_error', priority: 'medium' },
                { pattern: /context.*too.*large/i, type: 'context_error', priority: 'medium' }
            ]
        };
        
        // Output buffer for analysis
        this.outputBuffer = [];
        this.maxBufferSize = 100;
        
        // State tracking
        this.currentActivity = 'initializing';
        this.lastQuestionTime = null;
        this.waitingForResponse = false;
        this.recentResponses = []; // Track recent responses to prevent loops
        
        // Claude Code CLI detection
        this.claudeCliDetected = false;
        this.claudeCliVersion = null;
        this.lastClaudeOutput = null;
        
        // Smart response engine integration
        this.smartEngine = new SmartResponseEngine({
            projectRoot: options.projectRoot || process.cwd(),
            logger: this.logger,
            sessionId: this.sessionId
        });
        
        // Listen for smart engine events
        this.smartEngine.on('smart-decision', (data) => {
            this.emit('smart-decision', data);
        });
        
        this.smartEngine.on('context-initialized', (data) => {
            this.emit('context-initialized', data);
            this.logger.log('🧠 Smart context integrated with PTY supervision');
        });
        
        this.logger.log(`🔗 PTYSupervisionAdapter: Initialized for session ${this.sessionId}`);
    }

    /**
     * Start supervising the PTY process
     */
    startSupervision() {
        if (this.isActive) {
            this.logger.warn('⚠️ Supervision already active');
            return;
        }

        this.isActive = true;
        this.setupMonitoring();
        
        this.emit('supervision-started', {
            sessionId: this.sessionId,
            timestamp: Date.now()
        });
        
        this.logger.log('✅ PTY supervision started - monitoring Claude Code output');
    }

    /**
     * Stop supervising the PTY process
     */
    stopSupervision() {
        this.isActive = false;
        
        this.emit('supervision-stopped', {
            sessionId: this.sessionId,
            interventionCount: this.interventionCount,
            timestamp: Date.now()
        });
        
        this.logger.log('🛑 PTY supervision stopped');
    }

    /**
     * Set up monitoring of PTY output
     */
    setupMonitoring() {
        if (!this.pty) {
            this.logger.error('❌ No PTY process available for monitoring');
            return;
        }

        // Note: Data will be passed directly via processOutput() from terminal-websocket-safepty.js
        // We don't set up our own onData listener to avoid conflicts
        
        // Monitor PTY exit if onExit is available
        if (this.pty.onExit) {
            this.pty.onExit((exitCode, signal) => {
                this.logger.log(`📊 PTY exited with code ${exitCode}, signal ${signal}`);
                this.stopSupervision();
            });
        }

        this.logger.log('👁️ PTY monitoring setup complete - waiting for data via processOutput()');
    }

    /**
     * Process PTY output and detect intervention opportunities
     */
    processOutput(data) {
        const text = data.toString();
        
        // Detect Claude Code CLI
        this.detectClaudeCodeCLI(text);
        
        // Add to buffer for context analysis
        this.outputBuffer.push({
            text: text,
            timestamp: Date.now(),
            claudeCliDetected: this.claudeCliDetected
        });
        
        // Keep buffer size manageable
        if (this.outputBuffer.length > this.maxBufferSize) {
            this.outputBuffer = this.outputBuffer.slice(-this.maxBufferSize);
        }

        // Check for patterns that require intervention
        this.analyzeForIntervention(text);
        
        // Emit raw output for other systems
        this.emit('output', {
            sessionId: this.sessionId,
            text: text,
            claudeCliDetected: this.claudeCliDetected,
            timestamp: Date.now()
        });
    }
    
    /**
     * Detect Claude Code CLI in output
     */
    detectClaudeCodeCLI(text) {
        // Claude Code CLI identification patterns
        const claudePatterns = [
            /claude.*code/i,
            /anthropic.*claude/i,
            />\s*$/,  // Claude Code CLI prompt
            /I'll help you/i,
            /Let me.*analyze/i,
            /I can.*assist/i
        ];
        
        // Version detection
        if (text.includes('claude') && text.match(/v?\d+\.\d+/)) {
            const versionMatch = text.match(/v?(\d+\.\d+(?:\.\d+)?)/);
            if (versionMatch) {
                this.claudeCliVersion = versionMatch[1];
            }
        }
        
        // Check if this looks like Claude Code CLI output
        if (!this.claudeCliDetected) {
            for (const pattern of claudePatterns) {
                if (text.match(pattern)) {
                    this.claudeCliDetected = true;
                    this.logger.log(`🤖 Claude Code CLI detected in session ${this.sessionId}${this.claudeCliVersion ? ` (v${this.claudeCliVersion})` : ''}`);
                    
                    this.emit('claude-cli-detected', {
                        sessionId: this.sessionId,
                        version: this.claudeCliVersion,
                        timestamp: Date.now()
                    });
                    break;
                }
            }
        }
        
        // Track last Claude output for context
        if (this.claudeCliDetected && text.trim().length > 0) {
            this.lastClaudeOutput = {
                text: text,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Analyze text for intervention opportunities
     */
    analyzeForIntervention(text) {
        // Skip analysis if we're currently waiting for a response
        if (this.waitingForResponse) {
            return;
        }

        // Skip if this looks like our own injected response (prevent feedback loops)
        if (this.lastIntervention && Date.now() - this.lastIntervention.timestamp < 5000) {
            const lastResponse = this.lastIntervention.response;
            if (text.includes(lastResponse)) {
                this.logger.log(`🔄 Skipping analysis - detected our own response: "${lastResponse}"`);
                return;
            }
        }

        // Check against recent responses to prevent immediate loops
        for (const recentResponse of this.recentResponses) {
            if (text.includes(recentResponse.text) && Date.now() - recentResponse.timestamp < 10000) {
                this.logger.log(`🔄 Skipping analysis - matches recent response: "${recentResponse.text}"`);
                return;
            }
        }

        // Check for question patterns (auto-approval)
        const questionMatch = this.detectQuestions(text);
        if (questionMatch) {
            this.handleQuestion(questionMatch);
            return;
        }

        // Check for confusion patterns (need help)
        const confusionMatch = this.detectConfusion(text);
        if (confusionMatch) {
            this.handleConfusion(confusionMatch);
            return;
        }

        // Check for error patterns (might need help)
        const errorMatch = this.detectErrors(text);
        if (errorMatch) {
            this.handleError(errorMatch);
            return;
        }

        // Debug: log if no patterns matched (only for non-empty text)
        if (text.trim().length > 0) {
            this.logger.log(`🔍 No intervention patterns matched for: "${text.trim()}"`);
            
            // Debug: Test specific patterns for troubleshooting
            if (text.toLowerCase().includes('shall i create')) {
                this.logger.log('🐛 Debug: "shall i create" detected - checking auto-approve patterns...');
                for (const pattern of this.patterns.questions) {
                    if (pattern.type === 'auto_approve') {
                        const match = text.match(pattern.pattern);
                        this.logger.log(`🐛 Pattern ${pattern.pattern} matches: ${!!match}`);
                    }
                }
            }
            
            if (text.toLowerCase().includes('1. means') || text.toLowerCase().includes('2. means')) {
                this.logger.log('🐛 Debug: Option format detected - checking option patterns...');
                for (const pattern of this.patterns.questions) {
                    if (pattern.type.includes('options')) {
                        const match = text.match(pattern.pattern);
                        this.logger.log(`🐛 Pattern ${pattern.pattern} matches: ${!!match}`);
                    }
                }
            }
        }
    }

    /**
     * Detect question patterns in text
     */
    detectQuestions(text) {
        for (const pattern of this.patterns.questions) {
            const match = text.match(pattern.pattern);
            if (match) {
                return {
                    type: 'question',
                    pattern: pattern,
                    match: match,
                    text: text.trim(),
                    confidence: pattern.confidence
                };
            }
        }
        return null;
    }

    /**
     * Detect confusion patterns in text
     */
    detectConfusion(text) {
        for (const pattern of this.patterns.confusion) {
            const match = text.match(pattern.pattern);
            if (match) {
                return {
                    type: 'confusion',
                    subtype: pattern.type,
                    priority: pattern.priority,
                    match: match,
                    text: text.trim()
                };
            }
        }
        return null;
    }

    /**
     * Detect error patterns in text
     */
    detectErrors(text) {
        for (const pattern of this.patterns.errors) {
            const match = text.match(pattern.pattern);
            if (match) {
                return {
                    type: 'error',
                    subtype: pattern.type,
                    priority: pattern.priority,
                    match: match,
                    text: text.trim()
                };
            }
        }
        return null;
    }

    /**
     * Handle detected questions - use smart response engine for intelligent decisions
     */
    async handleQuestion(questionMatch) {
        this.logger.log(`❓ Question detected [${questionMatch.pattern.type}]: ${questionMatch.text}`);
        
        try {
            // Use smart response engine for intelligent decision making
            const smartDecision = await this.smartEngine.makeSmartDecision(questionMatch);
            
            // Inject the smart response
            await this.injectResponse(smartDecision.option);
            
            this.interventionCount++;
            this.lastIntervention = {
                type: 'smart-decision',
                subtype: questionMatch.pattern.type,
                question: questionMatch.text,
                response: smartDecision.option,
                confidence: smartDecision.confidence,
                reason: smartDecision.reason,
                claudeCliOption: smartDecision.option,
                smartContext: smartDecision.context,
                metadata: smartDecision.metadata,
                timestamp: Date.now()
            };
            
            this.emit('intervention', this.lastIntervention);
            
            // Log the smart decision
            this.logger.log(`🧠 Smart Decision: Option ${smartDecision.option} (${this.getOptionDescription(smartDecision.option)})`);
            this.logger.log(`🧠 Reason: ${smartDecision.reason}`);
            if (smartDecision.shouldExplain) {
                this.logger.log(`⚠️ Low confidence (${smartDecision.confidence.toFixed(2)}) - consider manual review`);
            }
            
        } catch (error) {
            this.logger.error('🧠 Smart engine failed, falling back to pattern matching:', error.message);
            
            // Fallback to original pattern matching logic
            if (questionMatch.confidence >= 0.9) {
                const response = questionMatch.pattern.response;
                await this.injectResponse(response);
                
                this.interventionCount++;
                this.lastIntervention = {
                    type: 'fallback-approval',
                    subtype: questionMatch.pattern.type,
                    question: questionMatch.text,
                    response: response,
                    confidence: questionMatch.confidence,
                    claudeCliOption: response,
                    fallbackReason: error.message,
                    timestamp: Date.now()
                };
                
                this.emit('intervention', this.lastIntervention);
                
            } else {
                // Lower confidence - ask supervision system
                this.requestSupervisionGuidance(questionMatch);
            }
        }
    }
    
    /**
     * Get description for Claude Code CLI options
     */
    getOptionDescription(option) {
        switch (option) {
        case '1': return 'Proceed';
        case '2': return 'Proceed and don\'t ask again';
        case '3': return 'Don\'t proceed, let me tell you';
        default: return `Option ${option}`;
        }
    }

    /**
     * Handle detected confusion - get help from supervision system
     */
    async handleConfusion(confusionMatch) {
        this.logger.log(`🤔 Confusion detected: ${confusionMatch.text}`);
        
        // Emit confusion event with audio alert
        this.emit('confusion-detected', {
            sessionId: this.sessionId,
            type: confusionMatch.subtype,
            priority: confusionMatch.priority,
            text: confusionMatch.text,
            timestamp: Date.now(),
            needsAudio: true
        });

        // Request guidance from supervision system (if available)
        if (this.supervision) {
            this.requestSupervisionGuidance(confusionMatch);
        } else {
            // No supervision system - just log and alert
            this.logger.log('⚠️ Confusion detected but no supervision system available for guidance');
        }
    }

    /**
     * Handle detected errors
     */
    async handleError(errorMatch) {
        this.logger.log(`❌ Error detected: ${errorMatch.text}`);
        
        this.emit('error-detected', {
            sessionId: this.sessionId,
            type: errorMatch.subtype,
            priority: errorMatch.priority,
            text: errorMatch.text,
            timestamp: Date.now()
        });

        // High priority errors get immediate attention (if supervision system available)
        if (errorMatch.priority === 'high' && this.supervision) {
            this.requestSupervisionGuidance(errorMatch);
        }
    }

    /**
     * Request guidance from supervision system
     */
    async requestSupervisionGuidance(detectionMatch) {
        if (this.supervision && typeof this.supervision.generateResponse === 'function') {
            try {
                const response = await this.supervision.generateResponse(detectionMatch);
                if (response && response.message) {
                    await this.injectResponse(response.message);
                    
                    this.interventionCount++;
                    this.lastIntervention = {
                        type: 'supervised-response',
                        detection: detectionMatch,
                        response: response.message,
                        timestamp: Date.now()
                    };
                    
                    this.emit('intervention', this.lastIntervention);
                }
            } catch (error) {
                this.logger.error('❌ Failed to get supervision guidance:', error);
                this.emit('guidance-failed', {
                    sessionId: this.sessionId,
                    error: error.message,
                    detection: detectionMatch
                });
            }
        }
    }

    /**
     * Inject response into PTY stream
     */
    async injectResponse(response) {
        if (!this.pty || !this.isActive) {
            this.logger.error('❌ Cannot inject response - PTY not available or supervision inactive');
            return false;
        }

        try {
            // Add some delay to ensure Claude is ready for input
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if we have access to ClaudeInputHandler
            if (this.claudeInputHandler) {
                // Use ClaudeInputHandler for proper subprocess delivery
                const success = await this.claudeInputHandler.sendToClaudeProcess(
                    this.sessionId,
                    response,
                    this.pty
                );
                
                if (success) {
                    this.logger.log(`💬 Injected response via ClaudeInputHandler: ${response}`);
                } else {
                    // Fallback: Simulate typing character by character
                    this.logger.log('💬 Using character-by-character typing simulation');
                    for (const char of response) {
                        this.pty.write(char);
                        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
                    }
                    this.pty.write('\r'); // Use carriage return for enter
                    this.logger.log(`💬 Typed response via PTY: ${response}`);
                }
            } else {
                // No ClaudeInputHandler - simulate typing
                this.logger.log('💬 No ClaudeInputHandler - simulating typing');
                for (const char of response) {
                    this.pty.write(char);
                    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
                }
                this.pty.write('\r'); // Use carriage return for enter
                this.logger.log(`💬 Typed response directly: ${response}`);
            }
            
            // Track that we sent a response
            this.waitingForResponse = true;
            this.lastQuestionTime = Date.now();
            
            // Add to recent responses list for loop prevention
            this.recentResponses.push({
                text: response,
                timestamp: Date.now()
            });
            
            // Keep recent responses list manageable (last 5 responses only)
            if (this.recentResponses.length > 5) {
                this.recentResponses = this.recentResponses.slice(-5);
            }
            
            // Clear waiting flag after reasonable time (extended for safer loop prevention)
            setTimeout(() => {
                this.waitingForResponse = false;
                this.logger.log('⏰ Response timeout cleared - ready for new interventions');
            }, 8000); // Extended from 3 seconds to 8 seconds
            
            return true;
            
        } catch (error) {
            this.logger.error('❌ Failed to inject response:', error);
            this.emit('injection-failed', {
                sessionId: this.sessionId,
                response: response,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get supervision statistics including smart engine data
     */
    getStats() {
        const smartStats = this.smartEngine ? this.smartEngine.getStats() : null;
        
        return {
            sessionId: this.sessionId,
            isActive: this.isActive,
            interventionCount: this.interventionCount,
            lastIntervention: this.lastIntervention,
            currentActivity: this.currentActivity,
            bufferSize: this.outputBuffer.length,
            waitingForResponse: this.waitingForResponse,
            claudeCliDetected: this.claudeCliDetected,
            claudeCliVersion: this.claudeCliVersion,
            lastClaudeOutput: this.lastClaudeOutput ? {
                preview: this.lastClaudeOutput.text.substring(0, 100) + '...',
                timestamp: this.lastClaudeOutput.timestamp
            } : null,
            smartEngine: smartStats
        };
    }
    
    /**
     * Get current supervision mode from smart engine
     */
    getSupervisionMode() {
        return this.smartEngine ? this.smartEngine.getSupervisionMode() : {
            mode: 'pattern-only',
            error: 'Smart engine not available'
        };
    }
    
    /**
     * Set supervision mode via smart engine
     */
    setSupervisionMode(mode, options = {}) {
        if (this.smartEngine) {
            this.smartEngine.setSupervisionMode(mode, options);
            
            this.emit('supervision-mode-changed', {
                sessionId: this.sessionId,
                mode: mode,
                options: options,
                timestamp: Date.now()
            });
            
            this.logger.log(`🔧 Supervision mode changed to: ${mode}`);
        } else {
            throw new Error('Smart engine not available for mode changes');
        }
    }
    
    /**
     * Get smart engine decision history
     */
    getDecisionHistory() {
        return this.smartEngine ? this.smartEngine.getStats().recentDecisions : [];
    }

    /**
     * Update supervision patterns (for learning/customization)
     */
    updatePatterns(newPatterns) {
        if (newPatterns.questions) {
            this.patterns.questions = [...this.patterns.questions, ...newPatterns.questions];
        }
        if (newPatterns.confusion) {
            this.patterns.confusion = [...this.patterns.confusion, ...newPatterns.confusion];
        }
        if (newPatterns.errors) {
            this.patterns.errors = [...this.patterns.errors, ...newPatterns.errors];
        }
        
        this.logger.log('✅ Supervision patterns updated');
        this.emit('patterns-updated', { sessionId: this.sessionId, patterns: this.patterns });
    }
}

module.exports = { PTYSupervisionAdapter };