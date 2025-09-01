/**
 * Natural Language Commands API
 * 
 * Provides endpoints for processing natural language commands
 * and converting them into structured actions.
 */

const express = require('express');
const router = express.Router();
const { CommandParser } = require('../services/ai-enhancement/CommandParser');
const { EnhancedClaudeCodeButtonBridge } = require('../integrations/enhanced-claude-bridge');

// Initialize command parser
const commandParser = new CommandParser({
    confidence: 0.7
});

// Get enhanced bridge instance (same one used by claude-buttons)
let claudeBridge = null;

// Initialize bridge when available
const initializeBridge = () => {
    if (!claudeBridge) {
        claudeBridge = new EnhancedClaudeCodeButtonBridge({
            logger: console,
            watchPaths: ['src', 'coder1-ide', 'public']
        });
    }
    return claudeBridge;
};

/**
 * Parse natural language command
 */
router.post('/parse', (req, res) => {
    try {
        const { command, context = {} } = req.body;
        
        if (!command || typeof command !== 'string') {
            return res.status(400).json({
                error: 'Command is required and must be a string'
            });
        }
        
        // Parse the command
        const parsedCommand = commandParser.parseCommand(command, context);
        
        res.json({
            success: true,
            command: parsedCommand,
            suggestions: commandParser.getSuggestions(command.substring(0, 20))
        });
    } catch (error) {
        console.error('Natural Commands: Parse error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Execute parsed command
 */
router.post('/execute', async (req, res) => {
    try {
        const { command: rawCommand, context = {} } = req.body;
        
        let parsedCommand;
        
        // If command is already parsed, use it directly
        if (typeof rawCommand === 'object' && rawCommand.type) {
            parsedCommand = rawCommand;
        } else if (typeof rawCommand === 'string') {
            // Parse the command first
            parsedCommand = commandParser.parseCommand(rawCommand, context);
        } else {
            return res.status(400).json({
                error: 'Command must be a string or parsed command object'
            });
        }
        
        // Execute the command based on its type
        const result = await executeCommand(parsedCommand, req);
        
        res.json({
            success: true,
            command: parsedCommand,
            result: result,
            executionTime: Date.now() - (parsedCommand.startTime || Date.now())
        });
    } catch (error) {
        console.error('Natural Commands: Execute error:', error);
        res.status(500).json({ 
            error: error.message,
            command: req.body.command 
        });
    }
});

/**
 * Get command suggestions
 */
router.get('/suggestions', (req, res) => {
    try {
        const { input = '', limit = 5 } = req.query;
        
        const suggestions = commandParser.getSuggestions(input)
            .slice(0, parseInt(limit));
        
        res.json({
            success: true,
            suggestions: suggestions,
            input: input
        });
    } catch (error) {
        console.error('Natural Commands: Suggestions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Parse and execute in one call (convenience endpoint)
 */
router.post('/do', async (req, res) => {
    try {
        const { command, context = {} } = req.body;
        
        if (!command || typeof command !== 'string') {
            return res.status(400).json({
                error: 'Command is required and must be a string'
            });
        }
        
        // Parse the command
        const parsedCommand = commandParser.parseCommand(command, context);
        parsedCommand.startTime = Date.now();
        
        // Execute it
        const result = await executeCommand(parsedCommand, req);
        
        res.json({
            success: true,
            originalCommand: command,
            parsedCommand: parsedCommand,
            result: result,
            executionTime: Date.now() - parsedCommand.startTime,
            confidence: parsedCommand.confidence
        });
    } catch (error) {
        console.error('Natural Commands: Do error:', error);
        res.status(500).json({ 
            error: error.message,
            command: req.body.command 
        });
    }
});

/**
 * Execute a parsed command
 */
async function executeCommand(parsedCommand, req) {
    const bridge = initializeBridge();
    
    switch (parsedCommand.category) {
    case 'agents':
        return executeAgentCommand(parsedCommand, bridge);
            
    case 'files':
        return executeFileCommand(parsedCommand, req);
            
    case 'testing':
        return executeTestCommand(parsedCommand, req);
            
    case 'deployment':
        return executeDeploymentCommand(parsedCommand, req);
            
    case 'help':
        return executeHelpCommand(parsedCommand);
            
    case 'config':
        return executeConfigCommand(parsedCommand);
            
    case 'automation':
    case 'documentation':
    case 'security':
    case 'performance':
    case 'database':
    case 'api':
    case 'ui':
        return executeAdvancedCommand(parsedCommand, req);
            
    case 'general':
    case 'fallback_command':
        return executeGeneralCommand(parsedCommand, req);
            
    default:
        throw new Error(`Unknown command category: ${parsedCommand.category}`);
    }
}

/**
 * Execute agent-related commands
 */
async function executeAgentCommand(parsedCommand, bridge) {
    const { action, parameters } = parsedCommand;
    
    switch (action) {
    case 'parallel':
        const parallelId = await bridge.startParallelAgents(parameters.prompt, parameters.sessionId);
        return {
            type: 'agent_started',
            mode: 'parallel',
            sessionId: parallelId,
            message: `Started parallel agents for: ${parameters.prompt}`
        };
            
    case 'hivemind':
        const hivemindId = await bridge.startHivemind(parameters.prompt, parameters.sessionId);
        return {
            type: 'agent_started',
            mode: 'hivemind',
            sessionId: hivemindId,
            message: `Started hivemind coordination for: ${parameters.prompt}`
        };
            
    case 'infinite':
        const infiniteId = await bridge.startInfiniteLoop(parameters.prompt, parameters.sessionId);
        return {
            type: 'agent_started',
            mode: 'infinite',
            sessionId: infiniteId,
            message: `Started infinite loop for: ${parameters.prompt}`
        };
            
    case 'supervision':
        const supervisionId = await bridge.startSupervision(parameters.prompt, parameters.sessionId);
        return {
            type: 'agent_started',
            mode: 'supervision',
            sessionId: supervisionId,
            message: `Started supervision for: ${parameters.prompt}`
        };
            
    default:
        throw new Error(`Unknown agent action: ${action}`);
    }
}

/**
 * Execute file-related commands
 */
async function executeFileCommand(parsedCommand, req) {
    // For file operations, we'll use the existing agent API
    const response = await fetch('http://localhost:3000/api/agent/analyze-requirements', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            request: `${parsedCommand.action} ${parsedCommand.target}`
        })
    });
    
    const result = await response.json();
    
    return {
        type: 'file_operation',
        action: parsedCommand.action,
        target: parsedCommand.target,
        result: result
    };
}

/**
 * Execute test commands
 */
async function executeTestCommand(parsedCommand, req) {
    const testCommand = parsedCommand.target ? 
        `npm test ${parsedCommand.target}` : 
        'npm test';
    
    return {
        type: 'test_command',
        command: testCommand,
        message: `Would execute: ${testCommand}`,
        note: 'Test execution would be implemented via terminal API'
    };
}

/**
 * Execute deployment commands
 */
async function executeDeploymentCommand(parsedCommand, req) {
    const deployCommand = parsedCommand.action === 'build' ? 
        'npm run build' : 
        'npm run deploy';
    
    return {
        type: 'deployment_command',
        command: deployCommand,
        message: `Would execute: ${deployCommand}`,
        note: 'Deployment execution would be implemented via terminal API'
    };
}

/**
 * Execute help commands
 */
async function executeHelpCommand(parsedCommand) {
    const helpResponses = {
        'agents': 'The AI agent system includes parallel agents, hivemind coordination, infinite loops, and supervision modes. Each provides different collaboration patterns.',
        'system': 'This is an enhanced AI development environment with intelligent agents, memory systems, and natural language command processing.',
        'commands': 'You can use natural language commands like "run parallel agents to build a feature", "create a new component", "analyze the code", etc.',
        'features': 'Key features include: AI agent coordination, persistent memory, conversation threading, file watching, and natural language processing.',
        'memory': 'The Memory System provides persistent storage across sessions using JSON files. It tracks conversations, patterns, insights, and decisions. The system includes: 1) Conversation history with threading support, 2) Pattern recognition for repeated tasks, 3) Insight extraction from code analysis, 4) Decision tracking for approvals and choices. Memory is stored in memory.json and automatically loaded on startup.',
        'memory system': 'The Memory System provides persistent storage across sessions using JSON files. It tracks conversations, patterns, insights, and decisions. The system includes: 1) Conversation history with threading support, 2) Pattern recognition for repeated tasks, 3) Insight extraction from code analysis, 4) Decision tracking for approvals and choices. Memory is stored in memory.json and automatically loaded on startup.',
        'context': 'The Context Builder uses file watching to maintain real-time awareness of your project. It monitors changes in src/, coder1-ide/, and public/ directories, building a comprehensive understanding of your codebase structure, dependencies, and recent modifications.',
        'threading': 'Conversation Threading maintains context across multiple interactions. Each conversation has a unique ID and can span multiple messages. The system tracks the flow of discussions, preserving context for better AI responses and allowing you to resume previous conversations.',
        'approvals': 'The Approval Workflows system ensures you maintain control over AI actions. Before executing significant changes, the system presents them for your review. You can approve, modify, or reject proposed actions. All decisions are tracked in the memory system for future reference.',
        'performance': 'The Performance Optimizer uses smart hibernation and caching. It monitors system resource usage, hibernates inactive components after 30 seconds, caches frequently accessed data, and uses lazy loading for better responsiveness. This ensures the enhanced system runs efficiently without impacting your development workflow.',
        'natural language': 'The Natural Language Command Parser understands plain English commands and converts them to structured actions. It recognizes patterns like "run parallel agents", "create component", "analyze code", etc. The parser has 70%+ confidence thresholds and provides suggestions as you type.',
        'intelligence': 'The Proactive Intelligence System monitors your workflow and provides contextual suggestions. It analyzes your recent actions, recognizes patterns, and offers helpful next steps. Suggestions appear every 5 minutes or when significant events occur.'
    };
    
    const topic = parsedCommand.target.toLowerCase();
    let response = helpResponses[topic];
    
    if (!response) {
        // Try to find a partial match
        for (const [key, value] of Object.entries(helpResponses)) {
            if (topic.includes(key) || key.includes(topic)) {
                response = value;
                break;
            }
        }
    }
    
    return {
        type: 'help_response',
        topic: topic,
        response: response || 'I can help with: agents, system, commands, features, memory, context, threading, approvals, performance, natural language, and intelligence. What would you like to know more about?',
        availableTopics: Object.keys(helpResponses).sort()
    };
}

/**
 * Execute config commands
 */
async function executeConfigCommand(parsedCommand) {
    return {
        type: 'config_operation',
        action: parsedCommand.action,
        target: parsedCommand.target,
        message: `Configuration changes for ${parsedCommand.target} would be applied here`,
        note: 'Configuration management would be implemented based on specific needs'
    };
}

/**
 * Execute general/fallback commands
 */
async function executeGeneralCommand(parsedCommand, req) {
    // Use the existing agent analysis API for general commands
    const response = await fetch('http://localhost:3000/api/agent/analyze-requirements', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            request: parsedCommand.target || parsedCommand.originalInput
        })
    });
    
    const result = await response.json();
    
    return {
        type: 'general_analysis',
        input: parsedCommand.originalInput,
        result: result
    };
}

/**
 * Execute advanced AI commands (automation, documentation, security, etc.)
 */
async function executeAdvancedCommand(parsedCommand, req) {
    const { category, action, target } = parsedCommand;
    
    // Create enhanced prompt based on command category and action
    let enhancedPrompt = `${action} ${target}`;
    
    // Add category-specific context
    switch (category) {
    case 'automation':
        enhancedPrompt = `As an automation specialist, ${enhancedPrompt}. Focus on scaffolding, refactoring, or optimization as requested.`;
        break;
            
    case 'documentation':
        enhancedPrompt = `As a documentation expert, ${enhancedPrompt}. Provide clear, comprehensive documentation.`;
        break;
            
    case 'security':
        enhancedPrompt = `As a security specialist, ${enhancedPrompt}. Focus on security best practices and vulnerability assessment.`;
        break;
            
    case 'performance':
        enhancedPrompt = `As a performance optimization expert, ${enhancedPrompt}. Focus on efficiency and speed improvements.`;
        break;
            
    case 'database':
        enhancedPrompt = `As a database architect, ${enhancedPrompt}. Focus on data modeling and query optimization.`;
        break;
            
    case 'api':
        enhancedPrompt = `As an API developer, ${enhancedPrompt}. Focus on REST/GraphQL design and integration.`;
        break;
            
    case 'ui':
        enhancedPrompt = `As a UI/UX designer, ${enhancedPrompt}. Focus on user experience and responsive design.`;
        break;
    }
    
    // Route to appropriate analysis API
    const response = await fetch('http://localhost:3000/api/agent/analyze-requirements', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            request: enhancedPrompt,
            context: {
                category: category,
                action: action,
                specialization: `${category}-${action}`
            }
        })
    });
    
    const result = await response.json();
    
    return {
        type: 'advanced_command',
        category: category,
        action: action,
        target: target,
        enhancedPrompt: enhancedPrompt,
        result: result,
        message: `Advanced ${category} command processed: ${action} ${target}`
    };
}

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('Natural Commands API Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;