/**
 * Licensing API Routes for Coder1 IDE
 * Handles trial activation, license validation, and status checks
 */

const express = require('express');
const router = express.Router();
const LicenseManager = require('../licensing/license-manager');

const licenseManager = new LicenseManager();

/**
 * Start a new trial
 * POST /api/license/trial/start
 */
router.post('/trial/start', async (req, res) => {
    try {
        // Check if already has license
        const status = await licenseManager.getStatus();
        if (status.type === 'licensed') {
            return res.json({
                success: false,
                message: 'You already have a valid license',
                status
            });
        }

        // Check if trial already exists
        if (status.type === 'trial' && status.status === 'active') {
            return res.json({
                success: false,
                message: 'Trial already active',
                status
            });
        }

        // Start new trial
        const trial = await licenseManager.startTrial();
        
        res.json({
            success: true,
            message: 'Trial started successfully!',
            trial: {
                daysLeft: 7,
                commandsLeft: 50,
                endDate: trial.endDate
            }
        });
    } catch (error) {
        console.error('Error starting trial:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start trial'
        });
    }
});

/**
 * Validate and activate a license key
 * POST /api/license/validate
 */
router.post('/validate', async (req, res) => {
    try {
        const { licenseKey } = req.body;

        if (!licenseKey) {
            return res.status(400).json({
                success: false,
                error: 'License key is required'
            });
        }

        const validation = await licenseManager.validate(licenseKey);

        if (validation.valid) {
            // Store the license
            await licenseManager.storeLicense({
                key: licenseKey,
                validatedAt: Date.now(),
                type: validation.type,
                features: validation.features
            });

            res.json({
                success: true,
                message: 'License activated successfully!',
                license: {
                    type: validation.type,
                    features: validation.features
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: validation.reason || 'Invalid license key'
            });
        }
    } catch (error) {
        console.error('Error validating license:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate license'
        });
    }
});

/**
 * Get current license/trial status
 * GET /api/license/status
 */
router.get('/status', async (req, res) => {
    try {
        const status = await licenseManager.getStatus();
        
        res.json({
            success: true,
            status
        });
    } catch (error) {
        console.error('Error getting license status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get license status'
        });
    }
});

/**
 * Track command usage (for trial users)
 * POST /api/license/track
 */
router.post('/track', async (req, res) => {
    try {
        const status = await licenseManager.getStatus();
        
        if (status.type === 'trial') {
            const used = await licenseManager.incrementTrialUsage();
            const trialStatus = await licenseManager.checkTrial();
            
            res.json({
                success: true,
                commandsUsed: used,
                commandsLeft: trialStatus.commandsLeft,
                trialValid: trialStatus.valid
            });
        } else {
            res.json({
                success: true,
                unlimited: true
            });
        }
    } catch (error) {
        console.error('Error tracking usage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track usage'
        });
    }
});

/**
 * Generate a license key (admin endpoint - would be protected in production)
 * POST /api/license/generate
 */
router.post('/generate', async (req, res) => {
    try {
        const { email, type = 'monthly' } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const licenseKey = LicenseManager.generateKey(email, type);

        res.json({
            success: true,
            licenseKey,
            email,
            type
        });
    } catch (error) {
        console.error('Error generating license:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate license'
        });
    }
});

module.exports = router;