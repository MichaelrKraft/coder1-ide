/**
 * EXPERIMENTAL TMUX ORCHESTRATOR API
 * This is an isolated test environment for multi-agent orchestration
 * Zero modifications to existing codebase - completely removable
 */

const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Function to clean tmux output for better display
function cleanTmuxOutput(lines) {
    if (!Array.isArray(lines)) {
        lines = String(lines).split('\n');
    }
    
    // Special handling for permission dialog
    const isPermissionDialog = lines.some(line => 
        line.includes('Do you trust') || 
        line.includes('Yes, proceed') ||
        line.includes('No, exit')
    );
    
    if (isPermissionDialog) {
        // Format the permission dialog in a readable way
        const cleanedDialog = [];
        cleanedDialog.push('========== PERMISSION REQUEST ==========');
        cleanedDialog.push('');
        cleanedDialog.push('Do you trust the files in this folder?');
        cleanedDialog.push('/Users/michaelkraft/autonomous_vibe_interface');
        cleanedDialog.push('');
        cleanedDialog.push('Claude Code may read, write, or execute files contained in this directory.');
        cleanedDialog.push('This can pose security risks, so only use files and bash commands from trusted sources.');
        cleanedDialog.push('');
        cleanedDialog.push('Execution allowed by:');
        cleanedDialog.push('• .claude/settings.local.json');
        cleanedDialog.push('');
        cleanedDialog.push('Learn more: https://docs.anthropic.com/s/claude-code-security');
        cleanedDialog.push('');
        cleanedDialog.push('OPTIONS:');
        cleanedDialog.push('  1. Yes, proceed');
        cleanedDialog.push('  2. No, exit');
        cleanedDialog.push('');
        cleanedDialog.push('👉 Type "1" in the input field below and press Send to accept');
        cleanedDialog.push('');
        cleanedDialog.push('=========================================');
        return cleanedDialog;
    }
    
    // For regular output, clean aggressively
    const processedLines = lines
        .map(line => {
            // Remove ANSI escape codes
            let cleaned = line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
            
            // Remove control characters
            cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1f\x7f-\x9f]/g, '');
            
            // Remove ALL box drawing characters
            cleaned = cleaned.replace(/[│┌┐└┘├┤┬┴┼─═║╔╗╚╝╠╣╦╩╬╭╮╯╰|]/g, '');
            
            // Clean up whitespace
            cleaned = cleaned.replace(/\s+/g, ' ').trim();
            
            return cleaned;
        })
        .filter(line => {
            // Keep only lines with actual content
            const trimmed = line.trim();
            return trimmed.length > 0 && 
                   !trimmed.match(/^[\s\-=_*]+$/) && // Remove separator lines
                   !trimmed.match(/^Enter to confirm/); // Remove UI hints
        })
        .slice(-50); // Keep last 50 lines
    
    // Additional cleanup for common patterns
    const finalLines = [];
    for (let i = 0; i < processedLines.length; i++) {
        const line = processedLines[i];
        
        // Skip duplicate lines
        if (i > 0 && line === processedLines[i - 1]) {
            continue;
        }
        
        // Format specific patterns
        if (line.includes('Welcome to Claude Code')) {
            finalLines.push('========== CLAUDE CODE STARTED ==========');
            finalLines.push('Welcome to Claude Code!');
            finalLines.push('/help for help, /status for your current setup');
        } else if (line.includes('cwd:')) {
            finalLines.push(`Working Directory: ${line.replace('cwd:', '').trim()}`);
        } else if (line.startsWith('>')) {
            finalLines.push(`Task: ${line.substring(1).trim()}`);
        } else {
            finalLines.push(line);
        }
    }
    
    return finalLines;
}

// Debug route - test if experimental routing works
router.get('/', (req, res) => {
    res.json({
        message: 'Experimental orchestrator API active',
        timestamp: new Date().toISOString(),
        endpoints: ['/status', '/check-cli', '/spawn-team', '/emergency-stop']
    });
});

// In-memory storage for experimental orchestrator (no database changes)
let orchestratorState = {
    agents: new Map(),
    sessions: new Map(),
    tmuxSessions: new Map(),
    isClaudeCodeAvailable: false,
    systemLogs: []
};

// Utility functions
function log(message) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const logEntry = `[${timestamp}] ${message}`;
    orchestratorState.systemLogs.push(logEntry);
    console.log(`[ORCHESTRATOR] ${logEntry}`);
    
    // Keep only last 100 log entries
    if (orchestratorState.systemLogs.length > 100) {
        orchestratorState.systemLogs.shift();
    }
}

function generateSessionId() {
    return 'orc_' + Math.random().toString(36).substring(2, 15);
}

// Check if Claude Code CLI is available
async function checkClaudeCodeCLI() {
    return new Promise((resolve) => {
        exec('which claude', (error, stdout, stderr) => {
            if (error) {
                log('Claude Code CLI not found in PATH');
                resolve(false);
            } else {
                log(`Claude Code CLI found at: ${stdout.trim()}`);
                resolve(true);
            }
        });
    });
}

// Check if tmux is available
async function checkTmux() {
    return new Promise((resolve) => {
        exec('which tmux', (error, stdout, stderr) => {
            if (error) {
                log('Tmux not found in PATH');
                resolve(false);
            } else {
                log(`Tmux found at: ${stdout.trim()}`);
                resolve(true);
            }
        });
    });
}

// Create tmux session for orchestrator
async function createTmuxSession(sessionName) {
    return new Promise((resolve, reject) => {
        // Create session with wider dimensions to prevent text wrapping
        const command = `tmux new-session -d -s ${sessionName} -x 120 -y 40`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                log(`Failed to create tmux session: ${error.message}`);
                reject(error);
            } else {
                log(`Created tmux session: ${sessionName} with dimensions 120x40`);
                
                // Set the pane layout to ensure equal distribution
                exec(`tmux set-window-option -t ${sessionName}:0 synchronize-panes off`, () => {
                    resolve(sessionName);
                });
            }
        });
    });
}

// Spawn Claude Code agent in tmux pane
async function spawnClaudeAgent(sessionName, agentId, spec, role, paneIndex) {
    return new Promise((resolve, reject) => {
        // Pre-register agent BEFORE starting Claude so it's available for permission dialog
        const paneTarget = `${sessionName}:0.${paneIndex}`;
        
        orchestratorState.agents.set(agentId, {
            id: agentId,
            role: role,
            name: role, // Add name field for TmuxAgentView
            status: 'starting',
            sessionName: sessionName,
            paneIndex: paneIndex,
            paneTarget: paneTarget,
            spec: spec,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });
        
        log(`Pre-registered agent ${agentId} for ${paneTarget}`);
        
        // Determine pane creation command based on index
        let createPaneCommand;
        if (paneIndex === 0) {
            // First agent uses the main window
            createPaneCommand = `echo "Using main pane for first agent"`;
        } else {
            // Create new panes for additional agents with equal distribution
            createPaneCommand = `tmux split-window -t ${sessionName}:0 -h -p 50`;
        }
        
        exec(createPaneCommand, (error, stdout, stderr) => {
            if (error && paneIndex !== 0) {
                log(`Failed to create pane for ${agentId}: ${error.message}`);
                // Remove pre-registered agent on failure
                orchestratorState.agents.delete(agentId);
                reject(error);
                return;
            }
            
            log(`Targeting pane ${paneTarget} for ${agentId}`);
            
            // Clear the pane first
            exec(`tmux send-keys -t ${paneTarget} C-c`, () => {
                // Send Claude Code command with --dangerously-skip-permissions for sub-agents
                // This flag auto-accepts permissions so agents can start immediately
                const claudeCommand = `tmux send-keys -t ${paneTarget} "claude --dangerously-skip-permissions" Enter`;
                
                exec(claudeCommand, (claudeError, claudeStdout, claudeStderr) => {
                    if (claudeError) {
                        log(`Failed to start Claude in pane ${paneTarget} for ${agentId}: ${claudeError.message}`);
                        // Remove pre-registered agent on failure
                        orchestratorState.agents.delete(agentId);
                        reject(claudeError);
                        return;
                    }
                    
                    log(`Claude command sent to ${paneTarget} with auto-permissions`);
                    
                    // Auto-accept permissions after a short delay
                    setTimeout(() => {
                        const acceptCommand = `tmux send-keys -t ${paneTarget} "1" Enter`;
                        exec(acceptCommand, (acceptError) => {
                            if (acceptError) {
                                log(`Warning: Could not auto-accept permissions for ${agentId}: ${acceptError.message}`);
                            } else {
                                log(`Auto-accepted permissions for ${agentId}`);
                            }
                        });
                    }, 2000); // Wait 2 seconds for permission dialog to appear
                    
                    // Wait a moment for Claude to fully start, then send the initial task with role context
                    if (spec && spec.trim()) {
                        setTimeout(() => {
                            // Add role-specific context to the task
                            let contextualTask = spec;
                            if (role.includes('Frontend')) {
                                contextualTask = `As a Frontend Developer, focus on the UI/UX aspects of this task: ${spec}. Create React components, handle user interactions, and ensure responsive design.`;
                            } else if (role.includes('Backend')) {
                                contextualTask = `As a Backend Developer, focus on the server-side logic for this task: ${spec}. Handle API endpoints, data processing, and database operations.`;
                            } else if (role.includes('QA')) {
                                contextualTask = `As a QA Tester, create tests for: ${spec}. Write unit tests, integration tests, and ensure code quality.`;
                            }
                            
                            const taskCommand = `tmux send-keys -t ${paneTarget} "${contextualTask.replace(/"/g, '\\"')}" Enter`;
                            exec(taskCommand, (taskError) => {
                                if (taskError) {
                                    log(`Failed to send initial task to ${agentId}: ${taskError.message}`);
                                } else {
                                    log(`Sent role-specific task to ${agentId} (${role}): ${spec}`);
                                }
                            });
                        }, 5000); // Wait 5 seconds for Claude to fully initialize after permission acceptance
                    }
                    
                    log(`Spawned Claude Code agent ${agentId} in ${paneTarget}`);
                    
                    resolve(agentId);
                });
            });
        });
    });
}

// Get tmux session output
async function getTmuxOutput(sessionName) {
    return new Promise((resolve) => {
        const command = `tmux capture-pane -t ${sessionName} -p`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve('Error capturing tmux output');
            } else {
                resolve(stdout);
            }
        });
    });
}

// API Routes

// GET /api/experimental/orchestrator/status
router.get('/status', async (req, res) => {
    const claudeAvailable = await checkClaudeCodeCLI();
    const tmuxAvailable = await checkTmux();
    
    orchestratorState.isClaudeCodeAvailable = claudeAvailable;
    
    res.json({
        status: 'operational',
        claudeCodeAvailable: claudeAvailable,
        tmuxAvailable: tmuxAvailable,
        activeAgents: orchestratorState.agents.size,
        activeSessions: orchestratorState.sessions.size,
        agents: Array.from(orchestratorState.agents.values()),
        systemLogs: orchestratorState.systemLogs.slice(-20) // Last 20 logs
    });
});

// POST /api/experimental/orchestrator/check-cli
router.post('/check-cli', async (req, res) => {
    try {
        const claudeAvailable = await checkClaudeCodeCLI();
        const tmuxAvailable = await checkTmux();
        
        orchestratorState.isClaudeCodeAvailable = claudeAvailable;
        
        if (!claudeAvailable) {
            return res.json({
                success: false,
                message: 'Claude Code CLI not found. Please install Claude Code CLI first.',
                claudeCodeAvailable: false,
                tmuxAvailable: tmuxAvailable
            });
        }
        
        if (!tmuxAvailable) {
            return res.json({
                success: false,
                message: 'Tmux not found. Please install tmux first.',
                claudeCodeAvailable: claudeAvailable,
                tmuxAvailable: false
            });
        }
        
        log('CLI dependencies check passed');
        res.json({
            success: true,
            message: 'All dependencies available',
            claudeCodeAvailable: true,
            tmuxAvailable: true
        });
        
    } catch (error) {
        log(`CLI check error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Helper function to pre-authenticate Claude in main session
async function preAuthenticateClaude(sessionName) {
    return new Promise((resolve, reject) => {
        log(`Pre-authenticating Claude in session ${sessionName}`);
        
        // Start Claude in the main pane
        const startCommand = `tmux send-keys -t ${sessionName}:0.0 "claude" Enter`;
        
        exec(startCommand, (error) => {
            if (error) {
                log(`Failed to start Claude for pre-authentication: ${error.message}`);
                reject(error);
                return;
            }
            
            log('Claude started, waiting for permission prompt...');
            
            // Wait for Claude to load and show permission prompt
            setTimeout(() => {
                // Send "2" to accept permissions
                exec(`tmux send-keys -t ${sessionName}:0.0 "2"`, (acceptError) => {
                    if (acceptError) {
                        log(`Failed to send acceptance key: ${acceptError.message}`);
                    } else {
                        log('Sent "2" for permission acceptance');
                        
                        // Send Enter
                        setTimeout(() => {
                            exec(`tmux send-keys -t ${sessionName}:0.0 Enter`, (enterError) => {
                                if (enterError) {
                                    log(`Failed to send Enter: ${enterError.message}`);
                                } else {
                                    log('Permissions accepted - Claude authenticated');
                                    
                                    // Give Claude a moment to fully initialize
                                    setTimeout(() => {
                                        // Just send Ctrl+C to stop Claude but keep the session alive
                                        exec(`tmux send-keys -t ${sessionName}:0.0 C-c`, () => {
                                            log('Claude authenticated - keeping session alive');
                                            resolve(true);
                                        });
                                    }, 2000);
                                }
                            });
                        }, 500);
                    }
                });
            }, 5000); // Wait 5 seconds for Claude to load
        });
    });
}

// POST /api/experimental/orchestrator/spawn-team
router.post('/spawn-team', async (req, res) => {
    // Accept both old format (teamType, projectSpec) and new format (agentCount, description)
    let { teamType, projectSpec, agentCount, description } = req.body;
    
    // Map agentCount to teamType if provided
    if (agentCount && !teamType) {
        const countToTypeMap = {
            1: 'debug-force',
            2: 'fullstack-team',
            3: 'backend-squad'
        };
        teamType = countToTypeMap[agentCount] || 'fullstack-team';
    }
    
    // Use description as projectSpec if provided
    if (description && !projectSpec) {
        projectSpec = description;
    }
    
    // Always check Claude Code availability when spawning a team
    const claudeAvailable = await checkClaudeCodeCLI();
    const tmuxAvailable = await checkTmux();
    
    orchestratorState.isClaudeCodeAvailable = claudeAvailable;
    
    if (!claudeAvailable) {
        return res.status(400).json({
            success: false,
            message: 'Claude Code CLI not available'
        });
    }
    
    if (!tmuxAvailable) {
        return res.status(400).json({
            success: false,
            message: 'Tmux not available'
        });
    }
    
    try {
        const sessionId = generateSessionId();
        const sessionName = `orchestrator_${sessionId}`;
        
        // Create main tmux session
        await createTmuxSession(sessionName);
        orchestratorState.tmuxSessions.set(sessionId, sessionName);
        
        // Skip pre-authentication - we'll authenticate each agent individually
        log('Tmux session created, spawning agents...');
        
        // Define team configurations
        const teamConfigs = {
            'frontend-trio': [
                { role: 'Frontend PM', id: `pm_${sessionId}` },
                { role: 'Frontend Dev 1', id: `dev1_${sessionId}` },
                { role: 'Frontend Dev 2', id: `dev2_${sessionId}` }
            ],
            'backend-squad': [
                { role: 'Backend PM', id: `pm_${sessionId}` },
                { role: 'Backend Dev', id: `dev_${sessionId}` },
                { role: 'QA Tester', id: `qa_${sessionId}` }
            ],
            'fullstack-team': [
                { role: 'Frontend Dev', id: `fe_${sessionId}` },
                { role: 'Backend Dev', id: `be_${sessionId}` }
            ],
            'debug-force': [
                { role: 'Debug Specialist 1', id: `debug1_${sessionId}` },
                { role: 'Debug Specialist 2', id: `debug2_${sessionId}` }
            ]
        };
        
        const agentConfigs = teamConfigs[teamType] || teamConfigs['fullstack-team'];
        const spawnedAgents = [];
        
        // Spawn agents with delay to prevent overwhelming
        for (let i = 0; i < agentConfigs.length; i++) {
            const agentConfig = agentConfigs[i];
            
            try {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                const agentId = await spawnClaudeAgent(sessionName, agentConfig.id, projectSpec, agentConfig.role, i);
                spawnedAgents.push(agentId);
                log(`Successfully spawned agent: ${agentConfig.role} in pane ${i}`);
            } catch (agentError) {
                log(`Failed to spawn agent ${agentConfig.role}: ${agentError.message}`);
            }
        }
        
        orchestratorState.sessions.set(sessionId, {
            id: sessionId,
            teamType: teamType,
            projectSpec: projectSpec,
            agents: spawnedAgents,
            createdAt: new Date().toISOString(),
            status: 'active'
        });
        
        log(`Team spawned: ${teamType} with ${spawnedAgents.length} agents`);
        
        // After all agents are spawned, rebalance the panes for equal space
        if (spawnedAgents.length > 1) {
            setTimeout(() => {
                exec(`tmux select-layout -t ${sessionName}:0 even-horizontal`, (layoutError) => {
                    if (layoutError) {
                        log(`Failed to balance panes: ${layoutError.message}`);
                    } else {
                        log(`Panes rebalanced for equal distribution`);
                    }
                });
            }, 1000);
        }
        
        res.json({
            success: true,
            sessionId: sessionId,
            teamType: teamType,
            spawnedAgents: spawnedAgents,
            message: `Successfully spawned ${spawnedAgents.length} agents`
        });
        
    } catch (error) {
        log(`Team spawn error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/experimental/orchestrator/session/:sessionId/output
router.get('/session/:sessionId/output', async (req, res) => {
    const { sessionId } = req.params;
    const sessionName = orchestratorState.tmuxSessions.get(sessionId);
    
    if (!sessionName) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    try {
        const output = await getTmuxOutput(sessionName);
        res.json({
            success: true,
            sessionId: sessionId,
            output: output
        });
    } catch (error) {
        log(`Output capture error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/experimental/orchestrator/agent-status/:sessionId
router.get('/agent-status/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = orchestratorState.sessions.get(sessionId);
    const sessionName = orchestratorState.tmuxSessions.get(sessionId);
    
    if (!session || !sessionName) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    const agentStatuses = [];
    
    // Get status for each agent
    for (const agentId of session.agents) {
        const agent = orchestratorState.agents.get(agentId);
        if (agent) {
            try {
                // Capture output from the agent's specific pane
                const paneTarget = agent.paneTarget || `${sessionName}:0.${agent.paneIndex || 0}`;
                const captureCommand = `tmux capture-pane -t ${paneTarget} -p | tail -20`;
                
                const output = await new Promise((resolve) => {
                    exec(captureCommand, (error, stdout, stderr) => {
                        if (error) {
                            resolve(`Error capturing output: ${error.message}`);
                        } else {
                            resolve(stdout);
                        }
                    });
                });
                
                // Determine agent status based on output
                let status = 'unknown';
                if (output.includes('Enter to confirm') || output.includes('Yes, I accept')) {
                    status = 'waiting_permission';
                } else if (output.includes('I\'ll help') || output.includes('Let me') || output.includes('I can')) {
                    status = 'working';
                } else if (output.includes('michaelkraft@')) {
                    status = 'idle';
                } else if (output.includes('Error') || output.includes('Failed')) {
                    status = 'error';
                } else if (output.trim().length > 0) {
                    status = 'active';
                }
                
                agentStatuses.push({
                    id: agentId,
                    role: agent.role,
                    status: status,
                    paneIndex: agent.paneIndex,
                    lastOutput: output.split('\n').slice(-5).join('\n'), // Last 5 lines
                    createdAt: agent.createdAt,
                    lastActivity: new Date().toISOString()
                });
            } catch (err) {
                agentStatuses.push({
                    id: agentId,
                    role: agent.role,
                    status: 'error',
                    error: err.message,
                    paneIndex: agent.paneIndex
                });
            }
        }
    }
    
    res.json({
        success: true,
        sessionId: sessionId,
        sessionName: sessionName,
        teamType: session.teamType,
        agents: agentStatuses,
        timestamp: new Date().toISOString()
    });
});

// POST /api/experimental/orchestrator/emergency-stop
router.post('/emergency-stop', async (req, res) => {
    try {
        // Kill all tmux sessions
        for (const [sessionId, sessionName] of orchestratorState.tmuxSessions) {
            exec(`tmux kill-session -t ${sessionName}`, (error) => {
                if (error) {
                    log(`Failed to kill session ${sessionName}: ${error.message}`);
                } else {
                    log(`Killed session: ${sessionName}`);
                }
            });
        }
        
        // Clear state
        orchestratorState.agents.clear();
        orchestratorState.sessions.clear();
        orchestratorState.tmuxSessions.clear();
        
        log('Emergency stop executed - all agents terminated');
        
        res.json({
            success: true,
            message: 'All agents stopped and sessions cleared'
        });
        
    } catch (error) {
        log(`Emergency stop error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/experimental/orchestrator/logs
router.get('/logs', (req, res) => {
    res.json({
        success: true,
        logs: orchestratorState.systemLogs
    });
});

// Development helper - reset state
router.post('/reset', (req, res) => {
    orchestratorState.agents.clear();
    orchestratorState.sessions.clear();
    orchestratorState.tmuxSessions.clear();
    orchestratorState.systemLogs = [];
    log('Orchestrator state reset');
    
    res.json({
        success: true,
        message: 'Orchestrator state reset'
    });
});

// POST /api/experimental/distribute-spec
router.post('/distribute-spec', async (req, res) => {
    try {
        const { sessionId, projectSpec } = req.body;
        
        if (!sessionId || !projectSpec) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and project specification are required'
            });
        }
        
        const session = orchestratorState.sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        
        const tmuxSessionName = orchestratorState.tmuxSessions.get(sessionId);
        if (!tmuxSessionName) {
            return res.status(404).json({
                success: false,
                message: 'Tmux session not found'
            });
        }
        
        // Break down spec by team type
        const agentTasks = [];
        const teamType = session.teamType;
        
        if (teamType === 'frontend-trio') {
            agentTasks.push(
                { role: 'UI Developer', task: `Create the user interface components: ${projectSpec}` },
                { role: 'UX Developer', task: `Design the user experience and interactions: ${projectSpec}` },
                { role: 'React Specialist', task: `Implement React components and state management: ${projectSpec}` }
            );
        } else if (teamType === 'backend-squad') {
            agentTasks.push(
                { role: 'API Developer', task: `Build the API endpoints and server logic: ${projectSpec}` },
                { role: 'Database Developer', task: `Design database schema and data layer: ${projectSpec}` },
                { role: 'DevOps Specialist', task: `Set up deployment and infrastructure: ${projectSpec}` }
            );
        } else { // fullstack-team
            agentTasks.push(
                { role: 'Frontend Developer', task: `Build the frontend UI and components: ${projectSpec}` },
                { role: 'Backend Developer', task: `Create API endpoints and server logic: ${projectSpec}` }
            );
        }
        
        // Send commands to each tmux pane
        let distributedCount = 0;
        for (let i = 0; i < agentTasks.length; i++) {
            const task = agentTasks[i];
            const paneIndex = i;
            
            // Send the task specification to the specific pane
            const command = `tmux send-keys -t ${tmuxSessionName}.${paneIndex} "${task.task}" Enter`;
            
            await new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        log(`Failed to send task to pane ${paneIndex}: ${error.message}`);
                    } else {
                        log(`Sent task to ${task.role} (pane ${paneIndex})`);
                        distributedCount++;
                    }
                    resolve();
                });
            });
            
            // Small delay between commands
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        log(`Distributed specification to ${distributedCount} agents in session ${sessionId}`);
        
        res.json({
            success: true,
            agentCount: distributedCount,
            agentTasks: agentTasks,
            message: `Specification distributed to ${distributedCount} agents`
        });
        
    } catch (error) {
        log(`Distribute spec error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/experimental/agent-output/:sessionId - Get agent output for polling
router.get('/agent-output/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = orchestratorState.sessions.get(sessionId);
    const sessionName = orchestratorState.tmuxSessions.get(sessionId);
    
    if (!session || !sessionName) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    const agents = [];
    
    // Get output from each pane
    for (let i = 0; i < session.agents.length; i++) {
        const agentId = session.agents[i];
        const agent = orchestratorState.agents.get(agentId);
        
        if (agent) {
            try {
                // Capture output from specific pane with line joining and wider width
                const output = await new Promise((resolve, reject) => {
                    exec(`tmux capture-pane -t ${sessionName}:0.${i} -p -S -100 -J`, (error, stdout) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(stdout);
                        }
                    });
                });
                
                // Parse output to determine status
                let status = 'idle';
                const lines = output.split('\n');
                
                if (output.includes('Claude Code CLI')) {
                    status = 'authenticating';
                } else if (output.includes('Working on') || output.includes('Building')) {
                    status = 'working';
                } else if (output.includes('Completed') || output.includes('Done')) {
                    status = 'completed';
                } else if (output.includes('Error') || output.includes('Failed')) {
                    status = 'error';
                }
                
                // Clean up tmux output for better display
                const cleanedLines = cleanTmuxOutput(lines);
                
                agents.push({
                    id: agentId,
                    name: agent.name || agent.role || 'Agent',  // Ensure name is always present
                    role: agent.role,
                    status: status,
                    output: cleanedLines,
                    paneIndex: i,  // Include pane index for proper targeting
                    lastActivity: new Date().toISOString()
                });
            } catch (err) {
                log(`Failed to get output for agent ${agentId}: ${err.message}`);
                agents.push({
                    id: agentId,
                    name: agent.role || 'Unknown',
                    status: 'error',
                    output: [`Error: ${err.message}`],
                    lastActivity: new Date().toISOString()
                });
            }
        }
    }
    
    res.json({
        success: true,
        sessionId: sessionId,
        agents: agents
    });
});

// POST /api/experimental/agent-input/:sessionId/:agentId - Send input to specific agent
router.post('/agent-input/:sessionId/:agentId', async (req, res) => {
    const { sessionId, agentId } = req.params;
    const { input } = req.body;
    
    console.log(`📥 [Agent Input] Received request:`, { sessionId, agentId, input });
    
    if (!input || !input.trim()) {
        console.log(`❌ [Agent Input] No input provided`);
        return res.status(400).json({
            success: false,
            message: 'Input is required'
        });
    }
    
    const session = orchestratorState.sessions.get(sessionId);
    const sessionName = orchestratorState.tmuxSessions.get(sessionId);
    
    console.log(`🔍 [Agent Input] Session lookup:`, { 
        sessionFound: !!session, 
        sessionName,
        agentCount: session?.agents?.length 
    });
    
    if (!session || !sessionName) {
        console.log(`❌ [Agent Input] Session not found: ${sessionId}`);
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    const agent = orchestratorState.agents.get(agentId);
    if (!agent) {
        console.log(`❌ [Agent Input] Agent not found: ${agentId}`);
        return res.status(404).json({
            success: false,
            message: 'Agent not found'
        });
    }
    
    try {
        // Get the agent's actual pane index
        const agentPaneIndex = agent.paneIndex;
        console.log(`📍 [Agent Input] Agent pane info:`, { 
            agentId,
            agentName: agent.name,
            paneIndex: agentPaneIndex,
            sessionAgents: session.agents 
        });
        
        if (agentPaneIndex === undefined || agentPaneIndex === null) {
            return res.status(500).json({
                success: false,
                message: 'Agent pane index not found'
            });
        }
        
        // Send input to the specific tmux pane using the correct pane index
        const command = `tmux send-keys -t ${sessionName}:0.${agentPaneIndex} "${input.trim()}" Enter`;
        console.log(`🚀 [Agent Input] Executing tmux command:`, command);
        
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ [Agent Input] tmux error:`, error.message, stderr);
                    log(`Failed to send input to agent ${agentId}: ${error.message}`);
                    reject(error);
                } else {
                    console.log(`✅ [Agent Input] Successfully sent to tmux pane ${agentPaneIndex}`);
                    log(`Sent input to ${agent.role} (${agentId}): "${input.trim()}"`);
                    resolve();
                }
            });
        });
        
        res.json({
            success: true,
            message: `Input sent to ${agent.role}`,
            agentId: agentId,
            input: input.trim()
        });
        
    } catch (error) {
        log(`Agent input error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// POST /api/experimental/broadcast/:sessionId - Broadcast message from Queen to all workers
router.post('/broadcast/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { message, taskUpdate } = req.body;
    
    const session = orchestratorState.sessions.get(sessionId);
    const sessionName = orchestratorState.tmuxSessions.get(sessionId);
    
    if (!session || !sessionName) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    log(`Broadcasting message from Queen to all agents in session ${sessionId}`);
    
    const broadcastResults = [];
    
    // Send message to each agent in the session
    for (const agentId of session.agents) {
        const agent = orchestratorState.agents.get(agentId);
        if (agent) {
            const paneTarget = agent.paneTarget;
            const broadcastMessage = taskUpdate 
                ? `UPDATE FROM QUEEN: ${message}` 
                : message;
            
            const command = `tmux send-keys -t ${paneTarget} "${broadcastMessage.replace(/"/g, '\\"')}" Enter`;
            
            try {
                await new Promise((resolve, reject) => {
                    exec(command, (error) => {
                        if (error) {
                            log(`Failed to broadcast to ${agentId}: ${error.message}`);
                            reject(error);
                        } else {
                            log(`Broadcast sent to ${agentId} (${agent.role})`);
                            broadcastResults.push({
                                agentId,
                                role: agent.role,
                                success: true
                            });
                            resolve();
                        }
                    });
                });
            } catch (err) {
                broadcastResults.push({
                    agentId,
                    role: agent.role,
                    success: false,
                    error: err.message
                });
            }
        }
    }
    
    res.json({
        success: true,
        sessionId,
        broadcastResults,
        message: `Broadcast sent to ${broadcastResults.length} agents`
    });
});

// POST /api/experimental/agent-permission/:sessionId - Send permission acceptance to first pane
router.post('/agent-permission/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { input } = req.body;
    
    console.log(`🔐 [Agent Permission] Received request:`, { sessionId, input });
    
    if (!input || !input.trim()) {
        console.log(`❌ [Agent Permission] No input provided`);
        return res.status(400).json({
            success: false,
            message: 'Input is required'
        });
    }
    
    const sessionName = orchestratorState.tmuxSessions.get(sessionId);
    
    if (!sessionName) {
        console.log(`❌ [Agent Permission] Session not found: ${sessionId}`);
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    try {
        // Send to first pane (where permission dialog appears)
        const command = `tmux send-keys -t ${sessionName}:0.0 "${input.trim()}" Enter`;
        console.log(`🚀 [Agent Permission] Executing tmux command:`, command);
        
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ [Agent Permission] tmux error:`, error.message, stderr);
                    log(`Failed to send permission input: ${error.message}`);
                    reject(error);
                } else {
                    console.log(`✅ [Agent Permission] Successfully sent permission input to first pane`);
                    log(`Sent permission input: "${input.trim()}"`);
                    resolve();
                }
            });
        });
        
        res.json({
            success: true,
            message: 'Permission input sent to first agent',
            sessionId: sessionId,
            input: input.trim()
        });
        
    } catch (error) {
        log(`Permission input error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Inter-agent communication endpoint
router.post('/agent-message/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { fromAgent, toAgent, message, messageType = 'info' } = req.body;
    
    console.log(`💬 [Inter-Agent] Message from ${fromAgent} to ${toAgent}: ${message}`);
    
    const session = orchestratorState.sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    // Store message in shared context
    if (!session.sharedContext) {
        session.sharedContext = [];
    }
    
    const contextMessage = {
        timestamp: new Date().toISOString(),
        from: fromAgent,
        to: toAgent,
        message: message,
        type: messageType
    };
    
    session.sharedContext.push(contextMessage);
    
    // If toAgent is 'all', broadcast to all agents
    if (toAgent === 'all') {
        for (const agentId of session.agents) {
            const agent = orchestratorState.agents.get(agentId);
            if (agent && agentId !== fromAgent) {
                const formattedMessage = `\n[TEAM MESSAGE from ${fromAgent}]: ${message}\n`;
                const sendCommand = `tmux send-keys -t ${agent.paneTarget} "${formattedMessage}" Enter`;
                
                exec(sendCommand, (error) => {
                    if (!error) {
                        console.log(`📨 Delivered message to ${agent.role}`);
                    }
                });
            }
        }
    } else {
        // Send to specific agent
        const targetAgent = orchestratorState.agents.get(toAgent);
        if (targetAgent) {
            const formattedMessage = `\n[MESSAGE from ${fromAgent}]: ${message}\n`;
            const sendCommand = `tmux send-keys -t ${targetAgent.paneTarget} "${formattedMessage}" Enter`;
            
            exec(sendCommand, (error) => {
                if (!error) {
                    console.log(`📨 Delivered message to ${targetAgent.role}`);
                }
            });
        }
    }
    
    res.json({
        success: true,
        message: 'Message sent',
        context: contextMessage
    });
});

// Get shared context for a session
router.get('/shared-context/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = orchestratorState.sessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    res.json({
        success: true,
        sessionId: sessionId,
        sharedContext: session.sharedContext || [],
        agents: Array.from(session.agents).map(agentId => {
            const agent = orchestratorState.agents.get(agentId);
            return {
                id: agentId,
                role: agent?.role || 'Unknown',
                status: agent?.status || 'Unknown'
            };
        })
    });
});

// Collect project files from completed agents
router.post('/collect-project/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    console.log(`📦 [Project Collection] Collecting project for session: ${sessionId}`);
    
    const session = orchestratorState.sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    const collectedFiles = [];
    const projectPath = path.join('/Users/michaelkraft/autonomous_vibe_interface', 'agent-projects', sessionId);
    
    // Create project directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
    }
    
    // Collect files from each agent's working directory
    for (const agentId of session.agents) {
        const agent = orchestratorState.agents.get(agentId);
        if (agent) {
            try {
                // Get list of files created by agent (simplified for now)
                // In production, we'd scan the agent's working directory
                const agentFiles = {
                    agentId: agentId,
                    role: agent.role,
                    files: []
                };
                
                // Execute command in tmux pane to list created files
                const listCommand = `tmux send-keys -t ${agent.paneTarget} "ls -la" Enter`;
                await new Promise((resolve) => {
                    exec(listCommand, (error) => {
                        if (!error) {
                            console.log(`📂 Listed files for ${agent.role}`);
                        }
                        resolve();
                    });
                });
                
                collectedFiles.push(agentFiles);
            } catch (error) {
                console.error(`❌ Error collecting from ${agentId}:`, error);
            }
        }
    }
    
    // Create a handoff summary
    const handoffSummary = {
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        agents: collectedFiles,
        projectPath: projectPath,
        nextSteps: [
            'Review collected files in ' + projectPath,
            'Continue development in main Claude session',
            'Use collected components in your project'
        ]
    };
    
    // Save handoff summary
    fs.writeFileSync(
        path.join(projectPath, 'handoff-summary.json'),
        JSON.stringify(handoffSummary, null, 2)
    );
    
    console.log(`✅ [Project Collection] Project collected to: ${projectPath}`);
    
    res.json({
        success: true,
        projectPath: projectPath,
        summary: handoffSummary
    });
});

// Check if all agents in a session have completed their tasks
router.get('/check-completion/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = orchestratorState.sessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    let allCompleted = true;
    const agentStatuses = [];
    
    for (const agentId of session.agents) {
        const agent = orchestratorState.agents.get(agentId);
        if (agent) {
            // Check agent output for completion indicators
            const paneTarget = agent.paneTarget || `${session.name}:0.${agent.paneIndex || 0}`;
            const captureCommand = `tmux capture-pane -t ${paneTarget} -p | tail -10`;
            
            try {
                const output = await new Promise((resolve, reject) => {
                    exec(captureCommand, (error, stdout) => {
                        if (error) reject(error);
                        else resolve(stdout);
                    });
                });
                
                // Check for completion keywords
                const isCompleted = output.includes('Task completed') || 
                                  output.includes('✅ Done') ||
                                  output.includes('Finished') ||
                                  output.includes('Complete');
                
                agentStatuses.push({
                    agentId: agentId,
                    role: agent.role,
                    completed: isCompleted
                });
                
                if (!isCompleted) {
                    allCompleted = false;
                }
            } catch (error) {
                console.error(`Error checking ${agentId} completion:`, error);
                allCompleted = false;
            }
        }
    }
    
    res.json({
        success: true,
        allCompleted: allCompleted,
        agentStatuses: agentStatuses,
        sessionId: sessionId
    });
});

module.exports = router;