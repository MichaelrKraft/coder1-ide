const express = require('express');
const router = express.Router();

// Placeholder for Voice API routes
router.post('/transcribe', async (req, res) => {
    res.status(501).json({ 
        error: 'Voice endpoint not implemented',
        message: 'This endpoint needs to be configured with proper voice services'
    });
});

module.exports = router;