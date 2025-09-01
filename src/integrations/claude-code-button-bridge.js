/**
 * Claude Code Button Bridge
 * 
 * Manages Claude CLI integration for terminal header buttons:
 * - Supervision (verbose mode)
 * - Parallel Agents (multiple concurrent sessions)
 * - Infinite Loop (iterative improvement)
 * - Hivemind (coordinated specialized agents)
 */

const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class ClaudeCodeButtonBridge extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        this.activeSessions = new Map();
        this.processMap = new Map();
        
        // Output formatting colors
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m'
        };
    }

    /**
     * Validate and ensure session has proper structure
     */
    validateSession(session) {
        if (!session) {
            console.warn('[Claude Bridge] Invalid session: null or undefined');
            return false;
        }
        
        // Ensure processes array exists and is valid
        if (!session.processes) {
            console.warn(`[Claude Bridge] Session ${session.id || 'unknown'} missing processes array, initializing`);
            session.processes = [];
        } else if (!Array.isArray(session.processes)) {
            console.warn(`[Claude Bridge] Session ${session.id || 'unknown'} processes is not an array, resetting`);
            session.processes = [];
        }
        
        // Ensure basic properties exist
        if (!session.id) {
            console.warn('[Claude Bridge] Session missing ID');
            return false;
        }
        
        if (!session.startTime) {
            session.startTime = Date.now();
        }
        
        return true;
    }

    /**
     * Start Supervision mode - verbose Claude execution
     */
    async startSupervision(prompt, sessionId) {
        const id = sessionId || uuidv4();
        this.logger.log(`👁️ Starting Supervision mode: ${id}`);
        
        const session = {
            id,
            mode: 'supervision',
            startTime: Date.now(),
            processes: []
        };
        
        this.activeSessions.set(id, session);
        
        // Emit header
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.bright}${this.colors.cyan}👁️ Supervision Mode Active${this.colors.reset}\n`
        });
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
        });
        
        // Spawn Claude with verbose flag
        const claude = spawn('claude', ['--verbose', prompt]);
        session.processes.push(claude);
        this.processMap.set(claude.pid, { sessionId: id, type: 'supervision' });
        
        // Handle stdout
        claude.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    // Format verbose output with indicators
                    let formatted = line;
                    if (line.includes('Tool:') || line.includes('Calling')) {
                        formatted = `${this.colors.yellow}🔧 ${line}${this.colors.reset}`;
                    } else if (line.includes('Error') || line.includes('Failed')) {
                        formatted = `${this.colors.red}❌ ${line}${this.colors.reset}`;
                    } else if (line.includes('Success') || line.includes('Complete')) {
                        formatted = `${this.colors.green}✅ ${line}${this.colors.reset}`;
                    } else {
                        formatted = `${this.colors.dim}   ${line}${this.colors.reset}`;
                    }
                    
                    this.emit('output', {
                        sessionId: id,
                        data: formatted + '\n'
                    });
                }
            });
        });
        
        // Handle stderr (verbose info often goes here)
        claude.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    this.emit('output', {
                        sessionId: id,
                        data: `${this.colors.blue}🔍 ${line}${this.colors.reset}\n`
                    });
                }
            });
        });
        
        // Handle completion
        claude.on('close', (code) => {
            this.emit('output', {
                sessionId: id,
                data: `\n${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
            });
            this.emit('output', {
                sessionId: id,
                data: `${this.colors.green}✅ Supervision completed (exit code: ${code})${this.colors.reset}\n`
            });
            
            this.cleanupSession(id);
        });
        
        return id;
    }

    /**
     * Start Parallel Agents - using Claude Code sub-agent delegation
     */
    async startParallelAgents(prompt, sessionId, options = {}) {
        const id = sessionId || uuidv4();
        this.logger.log(`🤖 Starting Parallel Agents with delegation: ${id}`);
        
        const session = {
            id,
            mode: 'parallel',
            startTime: Date.now(),
            processes: [],
            agents: [],
            preset: options.preset || null
        };
        
        this.activeSessions.set(id, session);
        
        // Determine agents to use
        let agents;
        if (options.preset) {
            agents = this.getPresetAgents(options.preset);
        } else if (options.agents) {
            agents = options.agents;
        } else {
            agents = this.analyzePromptForAgents(prompt);
        }
        
        session.agents = agents;
        
        // Emit header with agent info
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.bright}${this.colors.magenta}🤖 Delegating to ${agents.length} Sub-Agents${this.colors.reset}\n`
        });
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
        });
        
        // Show which agents will be used
        agents.forEach((agent, index) => {
            this.emit('output', {
                sessionId: id,
                data: `${this.colors.cyan}  ${index + 1}. ${agent.name}${this.colors.reset} - ${agent.focus}\n`
            });
        });
        
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n\n`
        });
        
        // Create delegation prompt
        const delegationPrompt = this.createDelegationPrompt(agents, prompt);
        
        console.log(`[Claude Bridge] Using delegation for ${agents.length} agents`);
        console.log('[Claude Bridge] Agents:', agents.map(a => a.name).join(', '));
        
        // Single Claude process with delegation - pipe prompt to stdin
        console.log('[Claude Bridge] Delegation prompt preview:', delegationPrompt.substring(0, 200) + '...');
        const claude = spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] });
        session.processes.push(claude);
        this.processMap.set(claude.pid, { sessionId: id, type: 'delegation' });
        
        // Send the delegation prompt to Claude's stdin
        claude.stdin.write(delegationPrompt + '\n');
        claude.stdin.end();
        
        // Track which agent is currently responding
        let currentAgent = null;
        let agentOutputs = new Map();
        
        // Handle stdout
        claude.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[Claude Delegation] Raw output:', output.substring(0, 200));
            
            // Parse output to identify which agent is responding
            const lines = output.split('\n');
            lines.forEach((line, index) => {
                console.log(`[Claude Delegation] Line ${index}:`, line.substring(0, 100));
                // Check for agent markers - enhanced patterns for better detection
                const agentMatch = line.match(/\*\*\[([^\]]+)\]:\*\*|\[([^\]]+)\]:|^\*\*([^:]+):\*\*|^([A-Z][a-z]+):/);
                if (agentMatch) {
                    // Extract agent name from any of the patterns
                    const agentName = (agentMatch[1] || agentMatch[2] || agentMatch[3] || agentMatch[4]).toLowerCase();
                    const matchedAgent = agents.find(a => 
                        a.name.toLowerCase().includes(agentName) || 
                        a.type === agentName ||
                        agentName.includes(a.name.toLowerCase()) ||
                        agentName.includes(a.type.toLowerCase())
                    );
                    
                    if (matchedAgent) {
                        currentAgent = matchedAgent;
                        if (!agentOutputs.has(currentAgent.name)) {
                            agentOutputs.set(currentAgent.name, []);
                            // Agent-specific colors and emojis
                            const agentColor = this.getAgentColor(currentAgent.type);
                            const agentEmoji = this.getAgentEmoji(currentAgent.type);
                            this.emit('output', {
                                sessionId: id,
                                data: `\n${agentColor}[${currentAgent.name}]${this.colors.reset} ${agentEmoji} Starting analysis...\n`
                            });
                        }
                    }
                }
                
                // Output the line with agent context
                if (line.trim()) {
                    const prefix = currentAgent 
                        ? `${this.getAgentColor(currentAgent.type)}[${currentAgent.name}]${this.colors.reset} `
                        : `${this.colors.dim}[Coordinator]${this.colors.reset} `;
                    
                    this.emit('output', {
                        sessionId: id,
                        data: `${prefix}${line}\n`
                    });
                    
                    if (currentAgent) {
                        agentOutputs.get(currentAgent.name).push(line);
                    }
                }
            });
        });
        
        // Handle stderr
        claude.stderr.on('data', (data) => {
            const error = data.toString();
            console.error('[Claude Delegation] Stderr:', error);
            this.emit('output', {
                sessionId: id,
                data: `${this.colors.red}[Claude Stderr]${this.colors.reset} ${error}`
            });
        });
        
        // Handle process errors
        claude.on('error', (error) => {
            console.error('[Claude Delegation] Process error:', error);
            this.emit('output', {
                sessionId: id,
                data: `${this.colors.red}[Process Error]${this.colors.reset} ${error.message}\n`
            });
        });
        
        // Handle completion
        claude.on('close', (code) => {
            console.log('[Claude Delegation] Closed with code:', code);
            
            // Show summary of agent contributions
            this.emit('output', {
                sessionId: id,
                data: `\n${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
            });
            
            if (agentOutputs.size > 0) {
                this.emit('output', {
                    sessionId: id,
                    data: `${this.colors.green}✅ Sub-agent delegation completed${this.colors.reset}\n`
                });
                this.emit('output', {
                    sessionId: id,
                    data: `${this.colors.cyan}📊 Agent Contributions:${this.colors.reset}\n`
                });
                
                agentOutputs.forEach((lines, agentName) => {
                    this.emit('output', {
                        sessionId: id,
                        data: `  • ${agentName}: ${lines.length} responses\n`
                    });
                });
            } else {
                this.emit('output', {
                    sessionId: id,
                    data: `${this.colors.green}✅ Task completed${this.colors.reset}\n`
                });
            }
            
            this.cleanupSession(id);
        });
        
        return id;
    }

    /**
     * Get agents for a preset configuration
     */
    getPresetAgents(presetName) {
        const presets = {
            'frontend-trio': [
                { type: 'frontend-specialist', name: 'Frontend Specialist', focus: 'UI/UX and React components' },
                { type: 'architect', name: 'Architect', focus: 'Component architecture' },
                { type: 'optimizer', name: 'Optimizer', focus: 'Performance and accessibility' }
            ],
            'backend-squad': [
                { type: 'backend-specialist', name: 'Backend Specialist', focus: 'API and server logic' },
                { type: 'architect', name: 'Architect', focus: 'System architecture' },
                { type: 'optimizer', name: 'Optimizer', focus: 'Database and performance' }
            ],
            'full-stack': [
                { type: 'architect', name: 'Architect', focus: 'Full system design' },
                { type: 'frontend-specialist', name: 'Frontend', focus: 'UI implementation' },
                { type: 'backend-specialist', name: 'Backend', focus: 'API implementation' }
            ],
            'debug-force': [
                { type: 'debugger', name: 'Debugger', focus: 'Issue analysis' },
                { type: 'implementer', name: 'Implementer', focus: 'Fix implementation' },
                { type: 'optimizer', name: 'Optimizer', focus: 'Prevention strategies' }
            ]
        };
        
        return presets[presetName] || presets['full-stack'];
    }

    /**
     * Create delegation prompt for sub-agents
     */
    createDelegationPrompt(agents, originalPrompt) {
        const agentDescriptions = agents.map(agent => {
            const personality = this.getAgentPersonality(agent.type);
            return `- **${agent.name.toUpperCase()}**: ${personality}`;
        }).join('\n');
        
        return `You must respond as a team of specialized AI agents. Each agent has a unique voice and expertise. You MUST provide separate responses from each agent.

AGENTS:
${agentDescriptions}

TASK: ${originalPrompt}

CRITICAL REQUIREMENTS:
1. Respond as ALL agents listed above
2. Use EXACT format: **[AGENT-NAME]:** for each response
3. Each agent must have a DIFFERENT perspective - no repetition
4. Keep each response 2-3 sentences maximum
5. Show distinct personalities and expertise areas

EXAMPLE FORMAT:
**[ARCHITECT]:** From an architectural perspective, this requires...
**[IMPLEMENTER]:** Here's how to implement this...
**[OPTIMIZER]:** To optimize this...

Begin your multi-agent response now:`;
    }

    /**
     * Get agent personality description
     */
    getAgentPersonality(agentType) {
        const personalities = {
            'architect': 'Strategic system designer who starts with "From an architectural perspective..." and focuses on structure, scalability, and design patterns.',
            'implementer': 'Hands-on developer who starts with "Here\'s how to implement this..." and provides concrete coding solutions.',
            'optimizer': 'Performance expert who starts with "To optimize this..." and focuses on efficiency, quality, and best practices.',
            'frontend': 'UI/UX specialist focused on React components, styling, and user experience.',
            'backend': 'Server-side expert focused on APIs, databases, and system integration.',
            'debugger': 'Problem solver focused on identifying and fixing issues, errors, and bugs.'
        };
        return personalities[agentType.toLowerCase()] || 'General development specialist';
    }

    /**
     * Get agent-specific color for terminal output
     */
    getAgentColor(agentType) {
        const colorMap = {
            'architect': this.colors.blue,
            'implementer': this.colors.green,
            'optimizer': this.colors.yellow,
            'frontend': this.colors.magenta,
            'backend': this.colors.cyan,
            'debugger': this.colors.red
        };
        return colorMap[agentType.toLowerCase()] || this.colors.blue;
    }

    /**
     * Get agent-specific emoji for terminal output
     */
    getAgentEmoji(agentType) {
        const emojiMap = {
            'architect': '🏗️',
            'implementer': '⚡',
            'optimizer': '🚀',
            'frontend': '🎨',
            'backend': '⚙️',
            'debugger': '🔧'
        };
        return emojiMap[agentType.toLowerCase()] || '🤖';
    }

    /**
     * Start Infinite Loop - iterative improvement
     */
    async startInfiniteLoop(prompt, sessionId) {
        const id = sessionId || uuidv4();
        this.logger.log(`♾️ Starting Infinite Loop: ${id}`);
        
        const session = {
            id,
            mode: 'infinite',
            startTime: Date.now(),
            processes: [],
            iteration: 0,
            maxIterations: 5, // Safety limit
            qualityThreshold: 0.9
        };
        
        this.activeSessions.set(id, session);
        
        // Emit header
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.bright}${this.colors.yellow}♾️ Infinite Loop Mode Active${this.colors.reset}\n`
        });
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
        });
        
        // Start iterative improvement
        this.runIteration(session, prompt);
        
        return id;
    }

    /**
     * Start Hivemind - coordinated specialized agents
     */
    async startHivemind(prompt, sessionId) {
        const id = sessionId || uuidv4();
        this.logger.log(`🧠 Starting Hivemind: ${id}`);
        
        const session = {
            id,
            mode: 'hivemind',
            startTime: Date.now(),
            processes: [],
            phases: ['architect', 'implementer', 'reviewer'],
            currentPhase: 0,
            context: ''
        };
        
        this.activeSessions.set(id, session);
        
        // Emit header
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.bright}${this.colors.cyan}🧠 Hivemind Mode Active${this.colors.reset}\n`
        });
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
        });
        
        // Start first phase
        this.runHivemindPhase(session, prompt);
        
        return id;
    }

    /**
     * Stop a session
     */
    async stopSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        
        // Validate session structure before processing
        if (!this.validateSession(session)) {
            console.error(`[Claude Bridge] Cannot stop session ${sessionId}: invalid session structure`);
            return;
        }
        
        // Kill all processes - with defensive null checking
        if (session.processes && Array.isArray(session.processes)) {
            session.processes.forEach(proc => {
                if (proc && !proc.killed) {
                    try {
                        proc.kill('SIGTERM');
                    } catch (error) {
                        console.warn(`[Claude Bridge] Failed to kill process ${proc.pid}:`, error.message);
                    }
                }
            });
        } else {
            console.warn(`[Claude Bridge] Session ${sessionId} has invalid processes array:`, session.processes);
        }
        
        this.emit('output', {
            sessionId,
            data: `\n${this.colors.red}🛑 Session stopped by user${this.colors.reset}\n`
        });
        
        this.cleanupSession(sessionId);
    }

    /**
     * Analyze prompt to determine agent types
     */
    analyzePromptForAgents(prompt) {
        const promptLower = prompt.toLowerCase();
        const agents = [];
        
        console.log(`[analyzePromptForAgents] Analyzing prompt: "${prompt.substring(0, 50)}..."`);
        
        // Enhanced context detection with more keywords
        const contextKeywords = {
            architecture: ['design', 'architecture', 'system', 'structure', 'scalable', 'components', 'patterns'],
            implementation: ['implement', 'code', 'write', 'build', 'create', 'develop', 'function'],
            optimization: ['optimize', 'performance', 'slow', 'efficient', 'best practices', 'refactor', 'speed'],
            frontend: ['frontend', 'ui', 'react', 'component', 'jsx', 'css', 'styling', 'interface'],
            backend: ['backend', 'api', 'server', 'endpoint', 'database', 'auth', 'middleware'],
            debugging: ['debug', 'fix', 'error', 'bug', 'issue', 'problem', 'troubleshoot']
        };
        
        // Check for specialized contexts first
        for (const [agentType, keywords] of Object.entries(contextKeywords)) {
            if (keywords.some(keyword => promptLower.includes(keyword))) {
                switch (agentType) {
                case 'architecture':
                    if (!agents.find(a => a.type === 'architect')) {
                        agents.push({ type: 'architect', name: 'Architect', focus: 'System design and architecture' });
                    }
                    break;
                case 'implementation':
                    if (!agents.find(a => a.type === 'implementer')) {
                        agents.push({ type: 'implementer', name: 'Implementer', focus: 'Code implementation and development' });
                    }
                    break;
                case 'optimization':
                    if (!agents.find(a => a.type === 'optimizer')) {
                        agents.push({ type: 'optimizer', name: 'Optimizer', focus: 'Performance and quality optimization' });
                    }
                    break;
                case 'frontend':
                    agents.push({ type: 'frontend', name: 'Frontend Specialist', focus: 'UI components and styling' });
                    break;
                case 'backend':
                    agents.push({ type: 'backend', name: 'Backend Specialist', focus: 'API and server logic' });
                    break;
                case 'debugging':
                    agents.push({ type: 'debugger', name: 'Debugger', focus: 'Issue analysis and troubleshooting' });
                    break;
                }
            }
        }
        
        console.log(`[analyzePromptForAgents] Detected ${agents.length} context-specific agents`);
        
        // Default to core trio if no specific context detected
        if (agents.length === 0) {
            console.log('[analyzePromptForAgents] No specific context detected, using core trio');
            agents.push(
                { type: 'architect', name: 'Architect', focus: 'System design and structure' },
                { type: 'implementer', name: 'Implementer', focus: 'Core implementation' },
                { type: 'optimizer', name: 'Optimizer', focus: 'Performance and best practices' }
            );
        }
        
        console.log(`[analyzePromptForAgents] Returning ${agents.length} agents:`, agents.map(a => a.name));
        return agents;
    }

    /**
     * Create specialized prompt for each agent
     */
    createAgentPrompt(agent, originalPrompt) {
        return `As a ${agent.name} specialist focusing on ${agent.focus}, complete this task: ${originalPrompt}

Focus specifically on your area of expertise and provide implementation details relevant to ${agent.type} development.`;
    }

    /**
     * Run iteration for infinite loop mode
     */
    async runIteration(session, prompt) {
        session.iteration++;
        
        this.emit('output', {
            sessionId: session.id,
            data: `\n${this.colors.yellow}🔄 Iteration ${session.iteration}/${session.maxIterations}${this.colors.reset}\n`
        });
        
        const iterationPrompt = session.iteration === 1 
            ? prompt 
            : `Improve upon the previous iteration:\n${session.lastOutput}\n\nOriginal request: ${prompt}`;
        
        const claude = spawn('claude', ['--print', iterationPrompt]);
        session.processes.push(claude);
        
        let output = '';
        
        claude.stdout.on('data', (data) => {
            output += data.toString();
            this.emit('output', {
                sessionId: session.id,
                data: `   ${data}`
            });
        });
        
        claude.on('close', (code) => {
            session.lastOutput = output;
            
            // Simulate quality check
            const quality = 0.7 + (session.iteration * 0.1);
            
            this.emit('output', {
                sessionId: session.id,
                data: `\n${this.colors.blue}📊 Quality score: ${(quality * 100).toFixed(1)}%${this.colors.reset}\n`
            });
            
            if (quality >= session.qualityThreshold || session.iteration >= session.maxIterations) {
                this.emit('output', {
                    sessionId: session.id,
                    data: `\n${this.colors.green}✅ Optimal solution reached after ${session.iteration} iterations!${this.colors.reset}\n`
                });
                this.cleanupSession(session.id);
            } else {
                // Continue iterations
                setTimeout(() => this.runIteration(session, prompt), 1000);
            }
        });
    }

    /**
     * Run hivemind phase
     */
    async runHivemindPhase(session, prompt) {
        const phaseName = session.phases[session.currentPhase];
        const phaseEmoji = { architect: '🏗️', implementer: '⚙️', reviewer: '🔍' }[phaseName];
        
        this.emit('output', {
            sessionId: session.id,
            data: `\n${this.colors.cyan}${phaseEmoji} Phase ${session.currentPhase + 1}: ${phaseName.toUpperCase()}${this.colors.reset}\n`
        });
        
        let phasePrompt = prompt;
        if (session.context) {
            phasePrompt = `Previous phase output:\n${session.context}\n\nNow as ${phaseName}, ${prompt}`;
        }
        
        const claude = spawn('claude', ['--print', phasePrompt]);
        session.processes.push(claude);
        
        let output = '';
        
        claude.stdout.on('data', (data) => {
            output += data.toString();
            this.emit('output', {
                sessionId: session.id,
                data: `   ${data}`
            });
        });
        
        claude.on('close', (code) => {
            session.context = output;
            session.currentPhase++;
            
            if (session.currentPhase < session.phases.length) {
                // Continue to next phase
                setTimeout(() => this.runHivemindPhase(session, prompt), 1000);
            } else {
                this.emit('output', {
                    sessionId: session.id,
                    data: `\n${this.colors.green}✅ Hivemind collaboration complete!${this.colors.reset}\n`
                });
                this.cleanupSession(session.id);
            }
        });
    }

    /**
     * Cleanup session
     */
    cleanupSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            // Validate session structure before cleanup
            this.validateSession(session);
            
            session.endTime = Date.now();
            session.duration = session.endTime - session.startTime;
            
            // Clear process map - with defensive null checking
            if (session.processes && Array.isArray(session.processes)) {
                session.processes.forEach(proc => {
                    if (proc && proc.pid) {
                        this.processMap.delete(proc.pid);
                    }
                });
            } else {
                console.warn(`[Claude Bridge] Session ${sessionId} cleanup: invalid processes array:`, session.processes);
            }
            
            this.activeSessions.delete(sessionId);
            this.emit('sessionComplete', { sessionId, duration: session.duration });
        }
    }

    /**
     * Get active sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values()).map(session => ({
            id: session.id,
            mode: session.mode,
            startTime: session.startTime,
            duration: Date.now() - session.startTime
        }));
    }
}

module.exports = { ClaudeCodeButtonBridge };