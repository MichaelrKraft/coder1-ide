const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const ClaudeCodeExec = require('../integrations/claude-code-exec');
const ClaudeCodeAPI = require('../integrations/claude-code-api');
const SubAgentManager = require('../services/sub-agent-manager');

// In-memory session storage
const taskDelegationSessions = new Map();

// Research mode configuration
const isResearchMode = process.env.RESEARCH_MODE === 'true';

// Initialize SubAgentManager for research prompts
const subAgentManager = new SubAgentManager();

// Check if Claude Code is available
const checkClaudeCodeAvailability = async () => {
    try {
    // Check for API key in environment
        const hasAPIKey = !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
    
        // Check for Claude CLI availability
        const { execSync } = require('child_process');
        let hasCLI = false;
        try {
            execSync('which claude', { stdio: 'ignore' });
            hasCLI = true;
        } catch {
            hasCLI = false;
        }
    
        return {
            available: hasAPIKey || hasCLI,
            mode: hasCLI ? 'cli' : (hasAPIKey ? 'api' : 'demo'),
            hasAPIKey,
            hasCLI
        };
    } catch (error) {
        console.error('Error checking Claude Code availability:', error);
        return { available: false, mode: 'demo' };
    }
};

// Available agent presets (from SubAgentManager.js)
const agentPresets = {
    'frontend-trio': {
        name: 'Frontend Trio',
        agents: ['frontend-specialist', 'architect', 'optimizer'],
        description: 'UI/UX specialists for React, styling, and user experience'
    },
    'backend-squad': {
        name: 'Backend Squad',
        agents: ['backend-specialist', 'architect', 'optimizer'],
        description: 'Server-side specialists for APIs, databases, and infrastructure'
    },
    'full-stack': {
        name: 'Full Stack Team',
        agents: ['architect', 'frontend-specialist', 'backend-specialist'],
        description: 'Complete development team for end-to-end features'
    },
    'debug-force': {
        name: 'Debug Force',
        agents: ['debugger', 'implementer', 'optimizer'],
        description: 'Problem-solving specialists for bugs and optimization'
    },
    'default': {
        name: 'Default Agents',
        agents: ['architect', 'implementer', 'optimizer'],
        description: 'General-purpose development team'
    }
};

// Start task delegation session
router.post('/start', async (req, res) => {
    const { taskDescription, preset = 'default', context = [] } = req.body;
  
    if (!taskDescription || !taskDescription.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Task description is required'
        });
    }
  
    const sessionId = uuidv4();
    const selectedPreset = agentPresets[preset] || agentPresets['default'];
  
    // Check Claude Code availability
    const claudeStatus = await checkClaudeCodeAvailability();
  
    console.log('🎯 Starting Task Delegation session:', sessionId);
    console.log('   Task:', taskDescription);
    console.log('   Preset:', preset);
    console.log('   Context:', context);
    console.log('   Claude Mode:', claudeStatus.mode);
  
    // Create session with agent team
    const session = {
        id: sessionId,
        status: 'active',
        startTime: Date.now(),
        taskDescription,
        preset,
        context,
        mode: claudeStatus.mode, // 'cli', 'api', or 'demo'
        isRealExecution: claudeStatus.available,
        isResearchMode: isResearchMode,
        research: {}, // Store research results from each agent
        agents: selectedPreset.agents.map((agentName, index) => ({
            id: `agent_${index}`,
            name: agentName.charAt(0).toUpperCase() + agentName.slice(1).replace('-', ' '),
            role: agentName,
            status: index === 0 ? 'analyzing' : 'waiting',
            progress: index === 0 ? 15 : 0,
            currentTask: index === 0 ? (isResearchMode ? 'Researching task requirements and architecture' : 'Analyzing task requirements and planning approach') : null,
            tasksCompleted: 0
        })),
        progress: 5,
        estimatedTimeRemaining: claudeStatus.available ? 600 : 300 // 10 minutes for real, 5 for demo
    };
  
    taskDelegationSessions.set(sessionId, session);
  
    // Execute real Claude Code if available
    if (claudeStatus.available) {
        executeRealTaskDelegation(session, claudeStatus);
    } else {
    // Simulate progress for demo mode
        simulateDemoProgress(session);
    }
  
    res.json({
        success: true,
        sessionId: sessionId,
        message: isResearchMode ? 'Research-based task delegation initiated' : 'Task delegation initiated',
        preset: selectedPreset.name,
        agentCount: selectedPreset.agents.length,
        mode: claudeStatus.mode,
        isRealExecution: claudeStatus.available,
        isResearchMode: isResearchMode
    });
});

// Execute real task delegation with Claude Code
async function executeRealTaskDelegation(session, claudeStatus) {
    try {
        const { taskDescription, preset, agents, isResearchMode } = session;
    
        if (isResearchMode) {
            // Research mode: coordinate research from each agent sequentially
            await executeResearchModeDelegation(session, claudeStatus);
        } else {
            // Original implementation mode
            await executeImplementationMode(session, claudeStatus);
        }
    
    } catch (error) {
        console.error('Error in real task delegation:', error);
        session.status = 'error';
        session.error = error.message;
    
        // Fall back to demo mode on error
        simulateDemoProgress(session);
    }
}

// Execute research-based delegation
async function executeResearchModeDelegation(session, claudeStatus) {
    const { taskDescription, agents } = session;
  
    console.log('🔬 Executing research-mode task delegation...');
  
    // Process agents sequentially for research
    for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
    
        // Update agent status
        agent.status = 'researching';
        agent.currentTask = `Researching ${agent.role} aspects of: ${taskDescription}`;
        agent.progress = 10;
    
        // Get research prompt for this agent
        const researchPrompt = subAgentManager.getResearchPrompt(agent.role);
    
        // Construct task-specific research prompt
        const fullPrompt = `${researchPrompt}

TASK TO RESEARCH: ${taskDescription}

Please provide detailed research based on the format above.`;

        console.log(`🔍 Agent ${agent.name} starting research...`);
    
        try {
            let researchResult;
      
            if (claudeStatus.mode === 'cli') {
                // Use Claude CLI
                const claudeExec = new ClaudeCodeExec({ 
                    implementationMode: false, // Research only
                    timeout: 300000 // 5 minutes for research
                });
        
                researchResult = await claudeExec.executePrompt(fullPrompt);
        
            } else if (claudeStatus.mode === 'api') {
                // Use Claude API
                const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
                const claudeAPI = new ClaudeCodeAPI(apiKey);
        
                researchResult = await claudeAPI.sendMessage(fullPrompt, {
                    model: 'claude-3-opus-20240229',
                    maxTokens: 2000, // Smaller token limit for research
                    temperature: 0.3 // Lower temperature for more focused research
                });
            }
      
            // Store research result in session
            session.research[agent.role] = researchResult;
      
            // Update agent completion
            agent.status = 'completed';
            agent.progress = 100;
            agent.currentTask = `Research completed for ${agent.role}`;
            agent.tasksCompleted = 1;
      
            console.log(`✅ Agent ${agent.name} research completed`);
      
        } catch (error) {
            console.error(`❌ Research failed for agent ${agent.name}:`, error);
            agent.status = 'error';
            agent.currentTask = `Research failed: ${error.message}`;
        }
    
        // Update overall session progress
        const completedAgents = agents.filter(a => a.status === 'completed').length;
        session.progress = (completedAgents / agents.length) * 80; // Reserve 20% for final implementation
    }
  
    // After all research is complete, trigger final implementation
    if (session.research && Object.keys(session.research).length > 0) {
        await executeFinalImplementation(session, claudeStatus);
    }
}

// Execute final implementation based on research
async function executeFinalImplementation(session, claudeStatus) {
    const { taskDescription, research } = session;
  
    console.log('🛠️ Executing final implementation based on research...');
  
    // Compile all research into implementation prompt
    const researchSummary = Object.entries(research).map(([role, content]) => 
        `## ${role.toUpperCase()} RESEARCH:\n${content}\n`
    ).join('\n');
  
    const implementationPrompt = `
Based on the following expert research, please implement the requested task.

TASK: ${taskDescription}

EXPERT RESEARCH:
${researchSummary}

IMPLEMENTATION INSTRUCTIONS:
- Use the research findings to guide your implementation
- Follow the patterns and recommendations from the specialists
- Implement clean, production-ready code
- Include error handling and best practices as recommended

Please proceed with implementation based on this expert guidance.
`;

    try {
        let implementationResult;
    
        if (claudeStatus.mode === 'cli') {
            const claudeExec = new ClaudeCodeExec({ 
                implementationMode: true,
                timeout: 600000 // 10 minutes for implementation
            });
      
            implementationResult = await claudeExec.executePrompt(implementationPrompt);
      
        } else if (claudeStatus.mode === 'api') {
            const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
            const claudeAPI = new ClaudeCodeAPI(apiKey);
      
            implementationResult = await claudeAPI.sendMessage(implementationPrompt, {
                model: 'claude-3-opus-20240229',
                maxTokens: 4000,
                temperature: 0.7
            });
        }
    
        // Store implementation result
        session.implementationResult = implementationResult;
        session.status = 'completed';
        session.progress = 100;
    
        console.log('✅ Research-based implementation completed');
    
    } catch (error) {
        console.error('❌ Final implementation failed:', error);
        session.status = 'error';
        session.error = `Implementation failed: ${error.message}`;
    }
}

// Execute original implementation mode
async function executeImplementationMode(session, claudeStatus) {
    const { taskDescription, preset, agents } = session;
  
    // Construct a comprehensive prompt for Claude Code Task tool
    const taskPrompt = `
You are coordinating a team of specialized AI agents to complete this task: "${taskDescription}"

Team Configuration: ${preset}
Agents:
${agents.map(a => `- ${a.name} (${a.role})`).join('\n')}

Please use the Task tool to delegate this task to the appropriate sub-agents. 
Break down the task into subtasks for each agent based on their specialization.
Coordinate their work to achieve the best outcome.

Report progress updates as agents complete their work.
`;

    console.log('🤖 Executing real Claude Code task delegation...');
  
    // Update session to show real execution
    session.agents[0].currentTask = 'Coordinating with Claude Code Task tool...';
    session.agents[0].progress = 25;
  
    if (claudeStatus.mode === 'cli') {
    // Use Claude CLI
        const claudeExec = new ClaudeCodeExec({ 
            implementationMode: true,
            timeout: 600000 // 10 minutes for complex tasks
        });
    
        claudeExec.on('data', (chunk) => {
            // Update session with real progress from Claude
            if (session.status === 'active') {
                session.agents[0].currentTask = 'Receiving Claude Code response...';
                session.agents[0].progress = Math.min(session.agents[0].progress + 5, 90);
            }
        });
    
        const response = await claudeExec.executePrompt(taskPrompt);
    
        // Update session with completion
        session.agents.forEach(agent => {
            agent.status = 'completed';
            agent.progress = 100;
            agent.currentTask = 'Task completed via Claude Code';
        });
        session.status = 'completed';
        session.claudeResponse = response;
    
    } else if (claudeStatus.mode === 'api') {
    // Use Claude API
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
        const claudeAPI = new ClaudeCodeAPI(apiKey);
    
        const response = await claudeAPI.sendMessage(taskPrompt, {
            model: 'claude-3-opus-20240229', // Use best model for task delegation
            maxTokens: 4000,
            temperature: 0.7
        });
    
        // Update session with completion
        session.agents.forEach(agent => {
            agent.status = 'completed';
            agent.progress = 100;
            agent.currentTask = 'Task completed via Claude API';
        });
        session.status = 'completed';
        session.claudeResponse = response;
    }
}

// Simulate progress for demo mode
function simulateDemoProgress(session) {
    const { taskDescription } = session;
  
    setTimeout(() => {
        const currentSession = taskDelegationSessions.get(session.id);
        if (currentSession && currentSession.status === 'active') {
            // Start second agent
            currentSession.agents[1].status = 'working';
            currentSession.agents[1].currentTask = getTaskForAgent(currentSession.agents[1].role, taskDescription);
            currentSession.progress = 25;
            currentSession.estimatedTimeRemaining = 240;
        }
    }, 10000); // 10 seconds
  
    // Continue simulating progress
    setTimeout(() => {
        const currentSession = taskDelegationSessions.get(session.id);
        if (currentSession && currentSession.status === 'active') {
            currentSession.agents.forEach((agent, index) => {
                if (index < 2) {
                    agent.status = 'completed';
                    agent.progress = 100;
                } else {
                    agent.status = 'working';
                    agent.progress = 50;
                }
            });
            currentSession.progress = 60;
        }
    }, 20000);
}

// Get task delegation session status
router.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = taskDelegationSessions.get(sessionId);
  
    if (!session) {
        return res.json({
            success: false,
            message: 'Session not found'
        });
    }
  
    // Simulate realistic progress
    if (session.status === 'active') {
        const timeElapsed = Date.now() - session.startTime;
        const progressIncrement = Math.random() * 5; // 0-5% progress per check
    
        session.agents.forEach((agent, index) => {
            if (agent.status === 'working') {
                agent.progress = Math.min(agent.progress + progressIncrement, 100);
        
                // Complete agent when progress reaches 100%
                if (agent.progress >= 100 && agent.status !== 'completed') {
                    agent.status = 'completed';
                    agent.currentTask = 'Task completed successfully';
                    agent.tasksCompleted++;
          
                    // Start next agent if available
                    const nextAgent = session.agents[index + 1];
                    if (nextAgent && nextAgent.status === 'waiting') {
                        nextAgent.status = 'working';
                        nextAgent.currentTask = getTaskForAgent(nextAgent.role, session.taskDescription);
                        nextAgent.progress = 10;
                    }
                }
            } else if (agent.status === 'analyzing') {
                agent.progress = Math.min(agent.progress + progressIncrement, 50);
        
                // Move from analyzing to working
                if (agent.progress >= 30) {
                    agent.status = 'working';
                    agent.currentTask = getTaskForAgent(agent.role, session.taskDescription);
                }
            }
        });
    
        // Calculate overall progress
        const totalProgress = session.agents.reduce((sum, agent) => sum + agent.progress, 0);
        session.progress = totalProgress / session.agents.length;
    
        // Update time remaining
        session.estimatedTimeRemaining = Math.max(0, session.estimatedTimeRemaining - 10);
    
        // Complete session when all agents are done
        const allCompleted = session.agents.every(agent => agent.status === 'completed');
        if (allCompleted) {
            session.status = 'completed';
            session.completedTime = Date.now();
        }
    }
  
    // Include research data if available
    const sessionData = {
        id: session.id,
        status: session.status,
        taskDescription: session.taskDescription,
        agents: session.agents,
        progress: Math.round(session.progress),
        estimatedTimeRemaining: session.estimatedTimeRemaining,
        runtime: Date.now() - session.startTime,
        isResearchMode: session.isResearchMode || false
    };

    // Add research results if they exist
    if (session.research && Object.keys(session.research).length > 0) {
        sessionData.researchAvailable = true;
        sessionData.researchCount = Object.keys(session.research).length;
    }

    // Add implementation result if it exists
    if (session.implementationResult) {
        sessionData.implementationComplete = true;
    }

    res.json({
        success: true,
        session: sessionData
    });
});

// Stop task delegation session
router.post('/stop/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = taskDelegationSessions.get(sessionId);
  
    if (!session) {
        return res.json({
            success: false,
            message: 'Session not found'
        });
    }
  
    session.status = 'stopped';
    session.stopTime = Date.now();
  
    console.log('🛑 Stopping Task Delegation session:', sessionId);
  
    res.json({
        success: true,
        message: 'Task delegation session stopped successfully',
        sessionId: sessionId,
        finalStats: {
            runtime: session.stopTime - session.startTime,
            progress: Math.round(session.progress),
            completedAgents: session.agents.filter(a => a.status === 'completed').length,
            totalAgents: session.agents.length
        }
    });
});

// Get research results for a session
router.get('/research/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = taskDelegationSessions.get(sessionId);
  
    if (!session) {
        return res.json({
            success: false,
            message: 'Session not found'
        });
    }
  
    if (!session.research || Object.keys(session.research).length === 0) {
        return res.json({
            success: false,
            message: 'No research data available for this session'
        });
    }
  
    res.json({
        success: true,
        sessionId: sessionId,
        taskDescription: session.taskDescription,
        research: session.research,
        implementationResult: session.implementationResult || null,
        researchMode: session.isResearchMode || false,
        completedAt: session.completedTime || null
    });
});

// Get available presets
router.get('/presets', (req, res) => {
    res.json({
        success: true,
        presets: Object.keys(agentPresets).map(key => ({
            id: key,
            name: agentPresets[key].name,
            description: agentPresets[key].description,
            agents: agentPresets[key].agents,
            agentCount: agentPresets[key].agents.length
        }))
    });
});

// Check Claude Code availability and research mode status
router.get('/check-availability', async (req, res) => {
    const status = await checkClaudeCodeAvailability();
    res.json({
        success: true,
        ...status,
        researchMode: isResearchMode,
        message: status.available 
            ? `Claude Code is available via ${status.mode}${isResearchMode ? ' (Research Mode Enabled)' : ''}` 
            : 'Running in demo mode (Claude Code not configured)'
    });
});

// Helper function to generate realistic tasks for agents
function getTaskForAgent(agentRole, taskDescription) {
    const tasks = {
        'frontend-specialist': [
            `Building React components for: ${taskDescription}`,
            `Implementing responsive design for: ${taskDescription}`,
            `Creating interactive UI elements for: ${taskDescription}`,
            `Styling components with CSS for: ${taskDescription}`
        ],
        'backend-specialist': [
            `Designing API endpoints for: ${taskDescription}`,
            `Setting up database schema for: ${taskDescription}`,
            `Implementing server logic for: ${taskDescription}`,
            `Creating data models for: ${taskDescription}`
        ],
        'architect': [
            `Designing system architecture for: ${taskDescription}`,
            `Planning component structure for: ${taskDescription}`,
            `Defining interfaces and contracts for: ${taskDescription}`,
            `Creating technical specifications for: ${taskDescription}`
        ],
        'optimizer': [
            `Analyzing performance bottlenecks in: ${taskDescription}`,
            `Optimizing code efficiency for: ${taskDescription}`,
            `Improving memory usage in: ${taskDescription}`,
            `Refactoring code structure for: ${taskDescription}`
        ],
        'debugger': [
            `Investigating issues in: ${taskDescription}`,
            `Testing edge cases for: ${taskDescription}`,
            `Validating implementation of: ${taskDescription}`,
            `Debugging and fixing errors in: ${taskDescription}`
        ],
        'implementer': [
            `Writing core functionality for: ${taskDescription}`,
            `Implementing business logic for: ${taskDescription}`,
            `Adding error handling to: ${taskDescription}`,
            `Creating utility functions for: ${taskDescription}`
        ]
    };
  
    const agentTasks = tasks[agentRole] || tasks['implementer'];
    return agentTasks[Math.floor(Math.random() * agentTasks.length)];
}

module.exports = router;