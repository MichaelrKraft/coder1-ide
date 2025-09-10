const express = require('express');
const router = express.Router();

// Placeholder for Anthropic API routes
router.post('/chat', async (req, res) => {
    res.status(501).json({ 
        error: 'Anthropic endpoint not implemented',
        message: 'This endpoint needs to be configured with proper Anthropic integration'
    });
});

module.exports = router;