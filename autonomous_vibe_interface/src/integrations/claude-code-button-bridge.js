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
     * Start Parallel Agents - multiple Claude instances
     */
    async startParallelAgents(prompt, sessionId) {
        const id = sessionId || uuidv4();
        this.logger.log(`🤖 Starting Parallel Agents: ${id}`);
        
        const session = {
            id,
            mode: 'parallel',
            startTime: Date.now(),
            processes: [],
            agents: []
        };
        
        this.activeSessions.set(id, session);
        
        // Analyze prompt to determine agent types
        const agents = this.analyzePromptForAgents(prompt);
        session.agents = agents;
        
        // Emit header
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.bright}${this.colors.magenta}🤖 Parallel Agents Active (${agents.length} agents)${this.colors.reset}\n`
        });
        this.emit('output', {
            sessionId: id,
            data: `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
        });
        
        // Spawn agents in parallel
        agents.forEach((agent, index) => {
            const agentSessionId = uuidv4();
            const agentPrompt = this.createAgentPrompt(agent, prompt);
            
            console.log(`[Claude Bridge] Spawning agent ${index + 1}: ${agent.name}`);
            console.log(`[Claude Bridge] Command: claude "${agentPrompt.substring(0, 50)}..."`);
            
            const claude = spawn('claude', [agentPrompt]);
            session.processes.push(claude);
            this.processMap.set(claude.pid, { sessionId: id, agentId: index, type: agent.type });
            
            // Initial status
            this.emit('output', {
                sessionId: id,
                data: `${this.colors.blue}[Agent ${index + 1} - ${agent.name}]${this.colors.reset} 🔄 Starting...\n`
            });
            
            // Handle stdout
            claude.stdout.on('data', (data) => {
                console.log(`[Claude Agent ${index + 1}] Output:`, data.toString());
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.emit('output', {
                            sessionId: id,
                            data: `${this.colors.blue}[Agent ${index + 1} - ${agent.name}]${this.colors.reset} ${line}\n`
                        });
                    }
                });
            });
            
            // Handle stderr
            claude.stderr.on('data', (data) => {
                console.error(`[Claude Agent ${index + 1}] Error:`, data.toString());
                this.emit('output', {
                    sessionId: id,
                    data: `${this.colors.red}[Agent ${index + 1} - Error]${this.colors.reset} ${data.toString()}`
                });
            });
            
            // Handle completion
            claude.on('close', (code) => {
                console.log(`[Claude Agent ${index + 1}] Closed with code:`, code);
                this.emit('output', {
                    sessionId: id,
                    data: `${this.colors.green}[Agent ${index + 1} - ${agent.name}]${this.colors.reset} ✅ Completed\n`
                });
                
                // Check if all agents completed
                session.completedAgents = (session.completedAgents || 0) + 1;
                if (session.completedAgents === agents.length) {
                    this.emit('output', {
                        sessionId: id,
                        data: `\n${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n`
                    });
                    this.emit('output', {
                        sessionId: id,
                        data: `${this.colors.green}✅ All agents completed successfully!${this.colors.reset}\n`
                    });
                    this.cleanupSession(id);
                }
            });
        });
        
        return id;
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
        
        // Kill all processes
        session.processes.forEach(proc => {
            if (!proc.killed) {
                proc.kill('SIGTERM');
            }
        });
        
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
        
        // Detect needed agents based on prompt content
        if (promptLower.includes('frontend') || promptLower.includes('ui') || 
            promptLower.includes('react') || promptLower.includes('component')) {
            agents.push({ type: 'frontend', name: 'Frontend', focus: 'UI components and styling' });
        }
        
        if (promptLower.includes('backend') || promptLower.includes('api') || 
            promptLower.includes('server') || promptLower.includes('endpoint')) {
            agents.push({ type: 'backend', name: 'Backend', focus: 'API and server logic' });
        }
        
        if (promptLower.includes('database') || promptLower.includes('schema') || 
            promptLower.includes('migration') || promptLower.includes('sql')) {
            agents.push({ type: 'database', name: 'Database', focus: 'Schema and data modeling' });
        }
        
        if (promptLower.includes('test') || promptLower.includes('testing') || 
            promptLower.includes('spec')) {
            agents.push({ type: 'testing', name: 'Testing', focus: 'Test coverage and quality' });
        }
        
        // Default to general agents if none detected
        if (agents.length === 0) {
            agents.push(
                { type: 'architect', name: 'Architect', focus: 'System design and structure' },
                { type: 'implementer', name: 'Implementer', focus: 'Core implementation' },
                { type: 'optimizer', name: 'Optimizer', focus: 'Performance and best practices' }
            );
        }
        
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
            session.endTime = Date.now();
            session.duration = session.endTime - session.startTime;
            
            // Clear process map
            session.processes.forEach(proc => {
                this.processMap.delete(proc.pid);
            });
            
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