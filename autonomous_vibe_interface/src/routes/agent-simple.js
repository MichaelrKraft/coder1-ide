/**
 * Refactored Agent Routes
 * 
 * Main routing file that delegates to specialized modules
 * This replaces the monolithic agent-simple.js file
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Import specialized route modules
const tasksRoutes = require('./modules/tasks');
const requirementsRoutes = require('./modules/requirements');
const healthRoutes = require('./modules/health');

// Chat endpoint (simplified version)
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a string'
            });
        }
        
        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Message must be less than 1000 characters'
            });
        }

        console.log(`💬 Chat message received: "${message.substring(0, 50)}..."`);
        
        // Simple response generation (placeholder for more sophisticated AI integration)
        const response = generateChatResponse(message);
        
        res.json({
            success: true,
            response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Specialized Agent Execution endpoint
router.post('/execute', async (req, res) => {
    try {
        const { agent, prompt, context } = req.body;
        
        if (!agent || typeof agent !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Agent name is required and must be a string'
            });
        }
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required and must be a string'
            });
        }
        
        console.log(`🤖 Executing specialized agent: ${agent}`);
        console.log(`📝 Prompt: "${prompt.substring(0, 100)}..."`);
        
        // Load agent configuration
        const agentConfig = await loadAgentConfig(agent);
        if (!agentConfig) {
            return res.status(404).json({
                success: false,
                error: `Agent '${agent}' not found. Available agents: product-manager, ux-designer, devops-engineer, architecture, frontend-engineer, backend-engineer, qa-testing, security-analyst`
            });
        }
        
        // Execute agent with specialized instructions
        const result = await executeSpecializedAgent(agentConfig, prompt, context);
        
        res.json({
            success: true,
            agent: agentConfig.name,
            result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Agent execution error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Agent list endpoint
router.get('/agents', async (req, res) => {
    try {
        const agentsDir = path.join(__dirname, '../../.coder1/agents');
        const agentFiles = await fs.readdir(agentsDir);
        const agents = [];
        
        for (const file of agentFiles) {
            if (file.endsWith('.json')) {
                try {
                    const agentPath = path.join(agentsDir, file);
                    const agentData = await fs.readFile(agentPath, 'utf8');
                    const agent = JSON.parse(agentData);
                    agents.push({
                        id: file.replace('.json', ''),
                        name: agent.name,
                        description: agent.description,
                        color: agent.color
                    });
                } catch (parseError) {
                    console.warn(`⚠️ Error parsing agent file ${file}:`, parseError.message);
                }
            }
        }
        
        res.json({
            success: true,
            agents,
            count: agents.length
        });
        
    } catch (error) {
        console.error('❌ Error listing agents:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Load agent configuration from JSON file
 */
async function loadAgentConfig(agentName) {
    try {
        const agentPath = path.join(__dirname, '../../.coder1/agents', `${agentName}.json`);
        const agentData = await fs.readFile(agentPath, 'utf8');
        return JSON.parse(agentData);
    } catch (error) {
        console.error(`❌ Error loading agent ${agentName}:`, error.message);
        return null;
    }
}

/**
 * Execute specialized agent with given prompt and context
 */
async function executeSpecializedAgent(agentConfig, prompt, context = {}) {
    // For now, return a structured response that follows the agent's format
    // In a full implementation, this would integrate with the AI service
    
    const response = {
        agent: agentConfig.name,
        role: agentConfig.description,
        analysis: `As a ${agentConfig.name}, I would analyze this request: "${prompt.substring(0, 100)}..."`,
        recommendations: [
            'This is a placeholder response demonstrating the specialized agent framework',
            'In production, this would use the agent\'s specific instructions and model',
            'The response would follow the structured format defined in the agent template'
        ],
        nextSteps: [
            'Implement AI service integration (Claude, OpenAI, etc.)',
            'Process the agent\'s specialized instructions',
            'Return structured output based on agent template'
        ],
        metadata: {
            model: agentConfig.model,
            tools: agentConfig.tools,
            processingTime: '0.5s (placeholder)'
        }
    };
    
    return response;
}

/**
 * Generate a simple chat response (placeholder)
 */
function generateChatResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('build') || lowerMessage.includes('create')) {
        return 'I can help you build that! Let me gather some requirements first. What type of project are you looking to create?';
    }
    
    if (lowerMessage.includes('help')) {
        return 'I\'m here to help! I can assist with building websites, writing code, debugging issues, and deploying applications. What would you like to work on?';
    }
    
    if (lowerMessage.includes('status') || lowerMessage.includes('health')) {
        return 'System is running smoothly! All services are operational. You can check detailed status at /api/agent/health';
    }
    
    return 'I understand you want to work on something. Could you provide more details about what you\'d like to build or accomplish?';
}

// Delegate to specialized modules
router.use('/tasks', tasksRoutes);
router.use('/requirements', requirementsRoutes);
router.use('/health', healthRoutes);

// Legacy compatibility routes (redirect to new structure)
router.post('/analyze-requirements', (req, res) => {
    console.log('🔄 Redirecting to new requirements endpoint');
    res.redirect(307, '/api/agent/requirements/analyze');
});

router.post('/generate-enhanced-brief', (req, res) => {
    console.log('🔄 Redirecting to new requirements endpoint');
    req.url = '/requirements/generate-brief';
    requirementsRoutes(req, res);
});

// API documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        title: 'Autonomous Vibe Interface API',
        version: '2.0.0',
        description: 'AI-powered autonomous coding assistant API',
        endpoints: {
            chat: {
                method: 'POST',
                path: '/api/agent/chat',
                description: 'Send a chat message to the AI assistant',
                body: { message: 'string (required, max 1000 chars)' }
            },
            execute: {
                method: 'POST',
                path: '/api/agent/execute',
                description: 'Execute a specialized agent with a specific prompt',
                body: { 
                    agent: 'string (required, agent name)',
                    prompt: 'string (required, user prompt)',
                    context: 'object (optional, additional context)'
                }
            },
            agents: {
                method: 'GET',
                path: '/api/agent/agents',
                description: 'List all available specialized agents'
            },
            tasks: {
                create: { method: 'POST', path: '/api/agent/tasks' },
                list: { method: 'GET', path: '/api/agent/tasks' },
                delete: { method: 'DELETE', path: '/api/agent/tasks' },
                updateStatus: { method: 'PATCH', path: '/api/agent/tasks/:id/status' }
            },
            requirements: {
                analyze: { method: 'POST', path: '/api/agent/requirements/analyze' },
                generateBrief: { method: 'POST', path: '/api/agent/requirements/generate-brief' },
                samples: { method: 'GET', path: '/api/agent/requirements/sample-questions' }
            },
            health: {
                main: { method: 'GET', path: '/api/agent/health' },
                system: { method: 'GET', path: '/api/agent/health/system' },
                dependencies: { method: 'GET', path: '/api/agent/health/dependencies' },
                claudeApi: { method: 'GET', path: '/api/agent/health/claude-api' }
            }
        },
        timestamp: new Date().toISOString()
    });
});

// Template and workflow endpoints
const SubAgentManager = require('../services/sub-agent-manager');
const JournalExportService = require('../services/journal-export');
const MemoryArchiverService = require('../services/memory-archiver');

const subAgentManager = new SubAgentManager();
const journalExporter = new JournalExportService();
const memoryArchiver = new MemoryArchiverService();

// Initialize services
subAgentManager.initialize().catch(console.error);
memoryArchiver.initialize().catch(console.error);

// Template system endpoints
router.get('/templates', async (req, res) => {
    try {
        const templates = await subAgentManager.getAvailableWorkflows();
        res.json({
            success: true,
            templates,
            count: templates.length
        });
    } catch (error) {
        console.error('❌ Error fetching templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/templates/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
        }
        
        const results = await subAgentManager.searchTemplates(q);
        res.json({
            success: true,
            results,
            count: results.length,
            query: q
        });
    } catch (error) {
        console.error('❌ Error searching templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/workflows/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const workflow = await subAgentManager.getSuggestedTeamForWorkflow(name);
        
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }
        
        res.json({
            success: true,
            workflow
        });
    } catch (error) {
        console.error('❌ Error fetching workflow:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Journal export endpoints
router.get('/journal/export', async (req, res) => {
    try {
        const { format = 'markdown' } = req.query;
        const journal = await journalExporter.exportJournal(format);
        
        if (format === 'markdown') {
            res.set({
                'Content-Type': 'text/markdown',
                'Content-Disposition': 'attachment; filename="JOURNAL.md"'
            });
            res.send(journal);
        } else {
            res.json({
                success: true,
                journal,
                format
            });
        }
    } catch (error) {
        console.error('❌ Error exporting journal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/journal/save', async (req, res) => {
    try {
        const { filename = 'JOURNAL.md' } = req.body;
        const journal = await journalExporter.exportJournal('markdown');
        const filePath = await journalExporter.saveJournalToFile(journal, filename);
        
        res.json({
            success: true,
            message: 'Journal saved successfully',
            filePath
        });
    } catch (error) {
        console.error('❌ Error saving journal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Memory archiving endpoints
router.get('/memory/status', async (req, res) => {
    try {
        const checkResults = await memoryArchiver.checkAndArchiveAll();
        const stats = await memoryArchiver.getArchiveStats();
        
        res.json({
            success: true,
            files: checkResults,
            archiveStats: stats
        });
    } catch (error) {
        console.error('❌ Error checking memory status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/memory/archive', async (req, res) => {
    try {
        const results = await memoryArchiver.checkAndArchiveAll();
        
        res.json({
            success: true,
            message: 'Memory archiving completed',
            results
        });
    } catch (error) {
        console.error('❌ Error archiving memory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/memory/archives', async (req, res) => {
    try {
        const archives = await memoryArchiver.listArchives();
        
        res.json({
            success: true,
            archives,
            count: archives.length
        });
    } catch (error) {
        console.error('❌ Error listing archives:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;