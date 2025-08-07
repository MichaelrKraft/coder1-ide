const express = require('express');
const path = require('path');
const router = express.Router();

// Import the InfiniteLoopManager (need to handle ES modules in CommonJS)
let InfiniteLoopManager;
(async () => {
  const module = await import('file:///Users/michaelkraft/autonomous_vibe_interface/coder1-ide/src/services/InfiniteLoopManager.js');
  InfiniteLoopManager = module.default;
})();

// Global instance
let infiniteManager = null;

// Initialize manager
const getManager = async () => {
  if (!infiniteManager && InfiniteLoopManager) {
    infiniteManager = new InfiniteLoopManager();
  }
  return infiniteManager;
};

// Test Claude API connection
router.get('/test-connection', async (req, res) => {
  try {
    const manager = await getManager();
    if (!manager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Infinite Loop Manager not initialized' 
      });
    }

    const result = await manager.testClaudeConnection();
    res.json(result);
  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start infinite loop
router.post('/start', async (req, res) => {
  try {
    const manager = await getManager();
    if (!manager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Infinite Loop Manager not initialized' 
      });
    }

    const { specPath, outputDirectory, count } = req.body;
    
    // Create command string
    const command = `/infinite ${specPath || 'specs/ui-spec-v3.md'} ${outputDirectory || 'source_infinite'} ${count || 'infinite'}`;
    
    // Start the infinite loop
    const sessionInfo = await manager.startInfiniteLoop(command);
    
    res.json({
      success: true,
      sessionId: sessionInfo.id,
      sessionInfo
    });
  } catch (error) {
    console.error('Failed to start infinite loop:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Generate a wave
router.post('/wave/:sessionId/:waveNumber', async (req, res) => {
  try {
    const manager = await getManager();
    if (!manager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Infinite Loop Manager not initialized' 
      });
    }

    const { sessionId, waveNumber } = req.params;
    
    // Generate the wave
    const waveResult = await manager.generateWave(sessionId, parseInt(waveNumber, 10));
    
    res.json({
      success: true,
      waveResult
    });
  } catch (error) {
    console.error('Failed to generate wave:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get session status
router.get('/status/:sessionId', async (req, res) => {
  try {
    const manager = await getManager();
    if (!manager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Infinite Loop Manager not initialized' 
      });
    }

    const { sessionId } = req.params;
    const sessionInfo = manager.getSessionStatus(sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }
    
    res.json({
      success: true,
      sessionInfo
    });
  } catch (error) {
    console.error('Failed to get session status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Stop session
router.delete('/stop/:sessionId', async (req, res) => {
  try {
    const manager = await getManager();
    if (!manager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Infinite Loop Manager not initialized' 
      });
    }

    const { sessionId } = req.params;
    const sessionInfo = manager.stopSession(sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Session stopped',
      sessionInfo
    });
  } catch (error) {
    console.error('Failed to stop session:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// List active sessions
router.get('/sessions', async (req, res) => {
  try {
    const manager = await getManager();
    if (!manager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Infinite Loop Manager not initialized' 
      });
    }

    const sessions = manager.listActiveSessions();
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Run full infinite loop (automated)
router.post('/run', async (req, res) => {
  try {
    const manager = await getManager();
    if (!manager) {
      return res.status(503).json({ 
        success: false, 
        error: 'Infinite Loop Manager not initialized' 
      });
    }

    const { specPath, outputDirectory, count } = req.body;
    
    // Start the session
    const command = `/infinite ${specPath || 'specs/ui-spec-v3.md'} ${outputDirectory || 'source_infinite'} ${count || 'infinite'}`;
    const sessionInfo = await manager.startInfiniteLoop(command);
    
    // Run waves until completion or limit
    const maxWaves = count === 'infinite' ? 3 : Math.ceil(parseInt(count, 10) / 5); // Limit to 3 waves for infinite in demo
    const results = [];
    
    for (let wave = 1; wave <= maxWaves; wave++) {
      try {
        const waveResult = await manager.generateWave(sessionInfo.id, wave);
        results.push(waveResult);
        
        // Send progress update (if using WebSocket)
        if (global.terminalEmitter) {
          global.terminalEmitter.emit('infinite-progress', {
            sessionId: sessionInfo.id,
            wave: wave,
            result: waveResult
          });
        }
        
        // Stop if count reached
        if (waveResult.status === 'completed') {
          break;
        }
      } catch (waveError) {
        console.error(`Wave ${wave} failed:`, waveError);
        results.push({
          waveNumber: wave,
          error: waveError.message,
          success: false
        });
        break;
      }
    }
    
    res.json({
      success: true,
      sessionId: sessionInfo.id,
      waves: results,
      totalGenerated: results.reduce((sum, wave) => sum + (wave.results || 0), 0)
    });
    
  } catch (error) {
    console.error('Failed to run infinite loop:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;