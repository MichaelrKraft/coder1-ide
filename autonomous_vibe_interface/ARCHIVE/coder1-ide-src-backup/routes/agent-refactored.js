/**
 * Refactored Agent Routes
 * 
 * Main routing file that delegates to specialized modules
 * This replaces the monolithic agent-simple.js file
 */

const express = require('express');
const router = express.Router();

// Import specialized route modules
const tasksRoutes = require('./modules/tasks');
const requirementsRoutes = require('./modules/requirements');
const healthRoutes = require('./modules/health');

// Chat endpoint (simplified version)
router.post("/chat", async (req, res) => {
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

/**
 * Generate a simple chat response (placeholder)
 */
function generateChatResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('build') || lowerMessage.includes('create')) {
        return "I can help you build that! Let me gather some requirements first. What type of project are you looking to create?";
    }
    
    if (lowerMessage.includes('help')) {
        return "I'm here to help! I can assist with building websites, writing code, debugging issues, and deploying applications. What would you like to work on?";
    }
    
    if (lowerMessage.includes('status') || lowerMessage.includes('health')) {
        return "System is running smoothly! All services are operational. You can check detailed status at /api/agent/health";
    }
    
    return "I understand you want to work on something. Could you provide more details about what you'd like to build or accomplish?";
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

module.exports = router;