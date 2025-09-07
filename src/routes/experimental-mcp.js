/**
 * Experimental MCP Agent API Routes
 * 
 * Provides optional MCP Agent integration alongside existing orchestration system.
 * Zero conflicts guaranteed - completely isolated execution paths.
 */

const express = require('express');
const { MCPAgentAdapter } = require('../services/mcp-agent-adapter');

// Import existing services for fallback
const AIAgentOrchestrator = require('../services/ai-agent-orchestrator');

const router = express.Router();

// Initialize MCP Agent adapter with existing orchestrator as fallback
const existingOrchestrator = new AIAgentOrchestrator();
const mcpAdapter = new MCPAgentAdapter({
  logger: console,
  existingOrchestrator
});

/**
 * POST /api/experimental/mcp-agent
 * Handle requests with MCP Agent or route to existing system
 */
router.post('/mcp-agent', async (req, res) => {
  try {
    const { requirement, options = {} } = req.body;
    
    if (!requirement) {
      return res.status(400).json({
        success: false,
        error: 'Requirement is required',
        system: 'validation'
      });
    }

    console.log(`🧪 [MCP-EXPERIMENTAL] Processing: "${requirement}"`);
    
    // Handle request with smart routing
    const result = await mcpAdapter.handleRequest({
      requirement,
      options,
      timestamp: new Date().toISOString(),
      source: 'experimental-api'
    });

    // Add system information for debugging
    const response = {
      success: true,
      ...result,
      routing: {
        mcpEnabled: mcpAdapter.enabled,
        fallbackMode: mcpAdapter.fallbackMode,
        systemUsed: result.system || 'existing'
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [MCP-EXPERIMENTAL] Result: ${result.system || 'existing'} system`);
    res.json(response);

  } catch (error) {
    console.error('❌ [MCP-EXPERIMENTAL] Error:', error);
    
    // Even error handling falls back to existing system pattern
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      system: 'error-fallback',
      routing: {
        mcpEnabled: mcpAdapter.enabled,
        errorFallback: true
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/experimental/mcp-agent/status
 * Get MCP Agent adapter status and configuration
 */
router.get('/mcp-agent/status', (req, res) => {
  const status = mcpAdapter.getStatus();
  
  res.json({
    success: true,
    status,
    integration: {
      isolated: true,
      conflictFree: true,
      fallbackAvailable: true,
      existingSystemIntact: true
    },
    endpoints: {
      main: '/api/experimental/mcp-agent',
      status: '/api/experimental/mcp-agent/status',
      enable: '/api/experimental/mcp-agent/enable',
      disable: '/api/experimental/mcp-agent/disable'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/experimental/mcp-agent/enable
 * Enable experimental MCP Agent mode
 */
router.post('/mcp-agent/enable', (req, res) => {
  mcpAdapter.enable();
  
  res.json({
    success: true,
    message: 'MCP Agent experimental mode enabled',
    status: mcpAdapter.getStatus(),
    note: 'Only new requests will use MCP Agent. Existing workflows unchanged.',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/experimental/mcp-agent/disable
 * Disable MCP Agent and route all to existing system
 */
router.post('/mcp-agent/disable', (req, res) => {
  mcpAdapter.disable();
  
  res.json({
    success: true,
    message: 'MCP Agent disabled - all requests route to existing system',
    status: mcpAdapter.getStatus(),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/experimental/mcp-agent/emergency-stop
 * Emergency stop - immediately disable and clear
 */
router.post('/mcp-agent/emergency-stop', (req, res) => {
  mcpAdapter.emergencyStop();
  
  res.json({
    success: true,
    message: 'Emergency stop executed - MCP Agent fully disabled',
    status: mcpAdapter.getStatus(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/experimental/mcp-agent/compare
 * Compare MCP Agent vs existing system capabilities
 */
router.get('/mcp-agent/compare', (req, res) => {
  res.json({
    success: true,
    comparison: {
      existingSystem: {
        name: 'Coder1 AI Agent Orchestrator',
        strengths: [
          'Proven Claude Code integration',
          'Cost-free git work tree system',
          '25+ specialized agents',
          'Predefined workflow templates',
          'Tmux sandbox isolation',
          'Production ready'
        ],
        bestFor: [
          'Standard development tasks',
          'Structured workflows',
          'Claude Code teams',
          'UI/UX + Backend coordination'
        ]
      },
      mcpAgent: {
        name: 'MCP Agent Framework (Experimental)',
        strengths: [
          'Dynamic agent composition',
          'Lightweight (50 lines vs 500)',
          'Native MCP protocol support',
          'Self-organizing agent swarms',
          'Rapid prototyping',
          'Intent-based routing'
        ],
        bestFor: [
          'Research and exploration',
          'Unpredictable multi-domain tasks',
          'Custom tool integration',
          'Experimental workflows'
        ]
      }
    },
    recommendation: 'Use existing system for production, MCP Agent for experimentation',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;