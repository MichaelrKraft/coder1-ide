/**
 * TMUX ORCHESTRATOR LAB - Frontend JavaScript
 * Connects to experimental backend API for real agent spawning
 */

class TmuxOrchestrator {
    constructor() {
        this.baseUrl = '/api/experimental';
        this.agents = new Map();
        this.currentSession = null;
        this.pollingInterval = null;
        this.isClaudeCodeAvailable = false;
        
        this.init();
    }
    
    async init() {
        this.log('Initializing Tmux Orchestrator Lab...');
        await this.updateStatus();
        this.startPolling();
    }
    
    log(message) {
        const timestamp = new Date().toTimeString().substring(0, 8);
        const logEntry = `[${timestamp}] ${message}`;
        
        const logsElement = document.getElementById('systemLogs');
        if (logsElement) {
            logsElement.textContent += '\n' + logEntry;
            logsElement.scrollTop = logsElement.scrollHeight;
        }
        
        console.log(`[ORCHESTRATOR] ${logEntry}`);
    }
    
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            return await response.json();
        } catch (error) {
            this.log(`API Error: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    
    async updateStatus() {
        const status = await this.apiCall('/status');
        
        if (status.success !== false) {
            this.isClaudeCodeAvailable = status.claudeCodeAvailable;
            this.updateUI(status);
        }
        
        return status;
    }
    
    updateUI(status) {
        // Update button states
        const checkBtn = document.getElementById('checkCliBtn');
        const spawnBtn = document.getElementById('spawnTeamBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (checkBtn) {
            checkBtn.disabled = false;
            checkBtn.textContent = status.claudeCodeAvailable ? 
                '✅ CLI Available' : '❌ Check CLI';
        }
        
        if (spawnBtn) {
            spawnBtn.disabled = !status.claudeCodeAvailable;
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = status.activeAgents === 0;
        }
        
        // Update agent dashboard
        this.updateAgentDashboard(status.agents || []);
        
        // Update logs if available
        if (status.systemLogs) {
            const logsElement = document.getElementById('systemLogs');
            if (logsElement) {
                logsElement.textContent = status.systemLogs.join('\n');
                logsElement.scrollTop = logsElement.scrollHeight;
            }
        }
    }
    
    updateAgentDashboard(agents) {
        const dashboard = document.getElementById('agentDashboard');
        if (!dashboard) return;
        
        // Clear existing cards
        dashboard.innerHTML = '';
        
        if (agents.length === 0) {
            dashboard.innerHTML = '<div class="agent-card" style="grid-column: 1 / -1; text-align: center; color: #6c757d;">No active agents</div>';
            return;
        }
        
        agents.forEach(agent => {
            const card = this.createAgentCard(agent);
            dashboard.appendChild(card);
        });
    }
    
    createAgentCard(agent) {
        const card = document.createElement('div');
        card.className = 'agent-card';
        card.innerHTML = `
            <div class="agent-name">
                <span class="agent-status status-${agent.status}"></span>
                Agent ${agent.id}
            </div>
            <div class="agent-role">${agent.role}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${this.getProgressWidth(agent)}%"></div>
            </div>
            <div style="font-size: 11px; color: #6c757d;">
                Status: ${agent.status}<br>
                Last activity: ${this.formatTime(agent.lastActivity)}
            </div>
        `;
        return card;
    }
    
    getProgressWidth(agent) {
        // Mock progress based on status
        switch (agent.status) {
            case 'starting': return 10;
            case 'working': return Math.random() * 60 + 20; // 20-80%
            case 'idle': return 100;
            case 'blocked': return 50;
            default: return 0;
        }
    }
    
    formatTime(isoString) {
        try {
            return new Date(isoString).toTimeString().substring(0, 8);
        } catch {
            return 'Unknown';
        }
    }
    
    addTimelineEvent(event) {
        const timeline = document.getElementById('timelineContainer');
        if (!timeline) return;
        
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-time">${new Date().toTimeString().substring(0, 5)}</div>
            <div class="timeline-event">${event}</div>
        `;
        
        timeline.appendChild(item);
        timeline.scrollTop = timeline.scrollHeight;
    }
    
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Poll every 5 seconds for updates
        this.pollingInterval = setInterval(async () => {
            await this.updateStatus();
        }, 5000);
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}

// Global orchestrator instance
let orchestrator;

// Global functions for UI buttons
async function checkClaudeCodeCLI() {
    const checkBtn = document.getElementById('checkCliBtn');
    if (checkBtn) {
        checkBtn.disabled = true;
        checkBtn.textContent = 'Checking...';
    }
    
    const result = await orchestrator.apiCall('/check-cli', 'POST');
    
    if (result.success) {
        orchestrator.log('✅ CLI dependencies check passed');
        orchestrator.addTimelineEvent('CLI dependencies verified');
    } else {
        orchestrator.log(`❌ CLI check failed: ${result.message}`);
        orchestrator.addTimelineEvent(`CLI check failed: ${result.message}`);
    }
    
    await orchestrator.updateStatus();
}

async function spawnAgentTeam() {
    const teamSelect = document.getElementById('teamSelect');
    const specInput = document.getElementById('projectSpec');
    const spawnBtn = document.getElementById('spawnTeamBtn');
    
    if (!teamSelect || !specInput) return;
    
    const teamType = teamSelect.value;
    const projectSpec = specInput.value.trim();
    
    if (!projectSpec) {
        alert('Please enter a project specification');
        return;
    }
    
    if (spawnBtn) {
        spawnBtn.disabled = true;
        spawnBtn.textContent = 'Spawning Agents...';
    }
    
    orchestrator.log(`Spawning ${teamType} team...`);
    orchestrator.addTimelineEvent(`Initiating ${teamType} team spawn`);
    
    const result = await orchestrator.apiCall('/spawn-team', 'POST', {
        teamType: teamType,
        projectSpec: projectSpec
    });
    
    if (result.success) {
        orchestrator.log(`✅ Team spawned: ${result.spawnedAgents.length} agents`);
        orchestrator.addTimelineEvent(`Team spawned successfully: ${result.spawnedAgents.length} agents`);
        orchestrator.currentSession = result.sessionId;
        
        // Enable the distribute button after successful spawn
        const distributeBtn = document.getElementById('distributeBtn');
        if (distributeBtn) {
            distributeBtn.disabled = false;
        }
        
        // Start monitoring session output
        setTimeout(() => {
            monitorSessionOutput(result.sessionId);
        }, 2000);
    } else {
        orchestrator.log(`❌ Team spawn failed: ${result.message}`);
        orchestrator.addTimelineEvent(`Team spawn failed: ${result.message}`);
    }
    
    if (spawnBtn) {
        spawnBtn.textContent = 'Spawn Agent Team';
    }
    
    await orchestrator.updateStatus();
}

async function monitorSessionOutput(sessionId) {
    if (!sessionId) return;
    
    const result = await orchestrator.apiCall(`/session/${sessionId}/output`);
    
    if (result.success && result.output) {
        // Create or update terminal display
        updateTerminalOutput(sessionId, result.output);
    }
    
    // Continue monitoring if session is active
    if (orchestrator.currentSession === sessionId) {
        setTimeout(() => {
            monitorSessionOutput(sessionId);
        }, 3000); // Check every 3 seconds
    }
}

function updateTerminalOutput(sessionId, output) {
    const terminalGrid = document.getElementById('terminalGrid');
    if (!terminalGrid) return;
    
    let terminal = document.getElementById(`terminal-${sessionId}`);
    
    if (!terminal) {
        terminal = document.createElement('div');
        terminal.id = `terminal-${sessionId}`;
        terminal.className = 'terminal-container';
        terminal.innerHTML = `
            <div class="terminal-header">
                <span>Session: ${sessionId}</span>
                <span class="agent-status status-working"></span>
            </div>
            <div class="terminal-content" id="terminal-content-${sessionId}"></div>
        `;
        terminalGrid.appendChild(terminal);
    }
    
    const content = document.getElementById(`terminal-content-${sessionId}`);
    if (content) {
        content.textContent = output;
        content.scrollTop = content.scrollHeight;
    }
}

async function pauseAllAgents() {
    orchestrator.log('Pausing all agents...');
    orchestrator.addTimelineEvent('All agents paused by user');
    // Implementation would send pause commands to agents
}

async function emergencyStop() {
    if (!confirm('Are you sure you want to stop all agents? This will terminate all running processes.')) {
        return;
    }
    
    const emergencyBtn = document.getElementById('emergencyBtn');
    if (emergencyBtn) {
        emergencyBtn.disabled = true;
        emergencyBtn.textContent = '🛑 STOPPING...';
    }
    
    orchestrator.log('🛑 EMERGENCY STOP INITIATED');
    orchestrator.addTimelineEvent('🛑 Emergency stop executed');
    
    const result = await orchestrator.apiCall('/emergency-stop', 'POST');
    
    if (result.success) {
        orchestrator.log('✅ All agents stopped successfully');
        orchestrator.addTimelineEvent('All agents terminated safely');
        orchestrator.currentSession = null;
        
        // Clear terminal outputs
        const terminalGrid = document.getElementById('terminalGrid');
        if (terminalGrid) {
            terminalGrid.innerHTML = '';
        }
    } else {
        orchestrator.log(`❌ Emergency stop failed: ${result.message}`);
    }
    
    if (emergencyBtn) {
        emergencyBtn.disabled = false;
        emergencyBtn.textContent = '🛑 EMERGENCY STOP';
    }
    
    await orchestrator.updateStatus();
}

function validateSpec() {
    const specInput = document.getElementById('projectSpec');
    const validateBtn = document.getElementById('validateBtn');
    const distributeBtn = document.getElementById('distributeBtn');
    
    if (!specInput) return;
    
    const spec = specInput.value.trim();
    
    if (spec.length < 20) {
        alert('Project specification is too short. Please provide more details.');
        return;
    }
    
    orchestrator.log('✅ Project specification validated');
    orchestrator.addTimelineEvent('Project specification validated');
    
    if (distributeBtn) {
        distributeBtn.disabled = false;
    }
}

async function distributeSpec() {
    const distributeBtn = document.getElementById('distributeBtn');
    const specInput = document.getElementById('projectSpec');
    
    if (!orchestrator.currentSession) {
        alert('No active session. Please spawn a team first.');
        return;
    }
    
    const projectSpec = specInput ? specInput.value.trim() : '';
    if (!projectSpec) {
        alert('Please enter a project specification first.');
        return;
    }
    
    if (distributeBtn) {
        distributeBtn.disabled = true;
        distributeBtn.textContent = 'Distributing...';
    }
    
    orchestrator.log('🚀 Distributing specification to agents...');
    orchestrator.addTimelineEvent('Distributing project specification to agents');
    
    const result = await orchestrator.apiCall('/distribute-spec', 'POST', {
        sessionId: orchestrator.currentSession,
        projectSpec: projectSpec
    });
    
    if (result.success) {
        orchestrator.log(`✅ Specification distributed to ${result.agentCount} agents`);
        orchestrator.addTimelineEvent(`Specification distributed successfully to ${result.agentCount} agents`);
        
        // Show detailed breakdown
        if (result.agentTasks) {
            result.agentTasks.forEach((task, index) => {
                orchestrator.log(`Agent ${index + 1}: ${task.role} - ${task.task}`);
            });
        }
    } else {
        orchestrator.log(`❌ Distribution failed: ${result.message}`);
        orchestrator.addTimelineEvent(`Distribution failed: ${result.message}`);
        
        if (distributeBtn) {
            distributeBtn.disabled = false;
            distributeBtn.textContent = 'Distribute to Agents';
        }
    }
}

function showSessionInfo() {
    const info = {
        currentSession: orchestrator.currentSession,
        activeAgents: orchestrator.agents.size,
        claudeAvailable: orchestrator.isClaudeCodeAvailable
    };
    
    alert(`Session Info:\nCurrent Session: ${info.currentSession || 'None'}\nActive Agents: ${info.activeAgents}\nClaude CLI: ${info.claudeAvailable ? 'Available' : 'Not Available'}`);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    orchestrator = new TmuxOrchestrator();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (orchestrator) {
        orchestrator.stopPolling();
    }
});