/**
 * Error Doctor API Routes
 * 
 * Provides endpoints for AI-powered error analysis and automatic fix suggestions
 * Integrated with VibeCoach for real-time learning insights
 */

const express = require('express');
const router = express.Router();
const ErrorDoctorService = require('../services/error-analysis/ErrorDoctorService');

// Initialize Error Doctor service
const errorDoctor = new ErrorDoctorService({
    logger: console
});

// Feature flag check middleware
const checkFeatureFlag = (req, res, next) => {
    if (process.env.ENABLE_ERROR_DOCTOR === 'false') {
        return res.status(503).json({
            success: false,
            error: 'Error Doctor is currently disabled',
            message: 'This feature can be enabled by setting ENABLE_ERROR_DOCTOR=true'
        });
    }
    next();
};

/**
 * POST /api/error-doctor/analyze
 * Analyze an error and provide fix suggestions
 */
router.post('/analyze', checkFeatureFlag, async (req, res) => {
    try {
        const {
            errorText,
            errorType,
            context,
            filePath,
            lineNumber,
            columnNumber,
            stackTrace,
            workingDirectory
        } = req.body;

        console.log('🔍 Error Doctor API: Analyzing error from terminal');
        console.log('Error preview:', errorText?.substring(0, 100) + '...');

        // Validate required fields
        if (!errorText) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: errorText'
            });
        }

        // Get additional context if not provided
        let errorContext = context;
        if (!errorContext && workingDirectory) {
            errorContext = await errorDoctor.getErrorContext(workingDirectory);
        }

        // Analyze the error
        const analysisResult = await errorDoctor.analyzeError({
            errorText,
            errorType: errorType || 'terminal',
            context: errorContext || {},
            filePath,
            lineNumber,
            columnNumber,
            stackTrace
        });

        // Track error with VibeCoach for learning insights
        const vibeCoach = global.vibeCoachService;
        if (vibeCoach && analysisResult.success) {
            try {
                await vibeCoach.trackError(errorType || 'terminal', errorText, false);
                console.log('📊 Error tracked with VibeCoach for learning insights');
            } catch (coachError) {
                console.warn('⚠️ Failed to track error with VibeCoach:', coachError.message);
            }
        }

        // Add metadata
        analysisResult.metadata = {
            timestamp: new Date().toISOString(),
            analysisTime: Date.now(),
            errorLength: errorText.length,
            contextProvided: !!errorContext,
            vibeCoachTracked: !!vibeCoach
        };

        console.log('✅ Error analysis completed:', {
            success: analysisResult.success,
            fixCount: analysisResult.fixes?.length || 0,
            source: analysisResult.source || 'unknown',
            vibeCoachIntegration: !!vibeCoach
        });

        res.json(analysisResult);

    } catch (error) {
        console.error('❌ Error Doctor API error:', error);
        res.status(500).json({
            success: false,
            error: 'Error analysis failed',
            message: 'An unexpected error occurred during analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/error-doctor/apply-fix
 * Apply a suggested fix
 */
router.post('/apply-fix', checkFeatureFlag, async (req, res) => {
    try {
        const {
            fixId,
            command,
            filePath,
            fileContent,
            type,
            workingDirectory
        } = req.body;

        console.log('🔧 Error Doctor API: Applying fix:', { type, command: command?.substring(0, 50) });

        // Validate required fields
        if (!type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: type'
            });
        }

        // Apply the fix
        const result = await errorDoctor.applyFix({
            fixId,
            command,
            filePath,
            fileContent,
            type,
            workingDirectory
        });

        // Track error resolution with VibeCoach for learning insights
        const vibeCoach = global.vibeCoachService;
        if (vibeCoach && result.success) {
            try {
                await vibeCoach.trackError(type || 'fix-applied', result.message || 'Fix applied successfully', true);
                console.log('🎉 Error resolution tracked with VibeCoach');
            } catch (coachError) {
                console.warn('⚠️ Failed to track error resolution with VibeCoach:', coachError.message);
            }
        }

        // Add metadata
        result.metadata = {
            timestamp: new Date().toISOString(),
            fixId,
            type,
            vibeCoachTracked: !!vibeCoach
        };

        console.log('✅ Fix application result:', {
            success: result.success,
            action: result.action,
            command: result.command?.substring(0, 50),
            vibeCoachIntegration: !!vibeCoach
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Error Doctor fix application failed:', error);
        res.status(500).json({
            success: false,
            error: 'Fix application failed',
            message: 'An unexpected error occurred while applying the fix',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/error-doctor/status
 * Get Error Doctor status and configuration
 */
router.get('/status', (req, res) => {
    try {
        const status = {
            enabled: process.env.ENABLE_ERROR_DOCTOR !== 'false',
            aiServices: {
                openai: !!process.env.OPENAI_API_KEY,
                anthropic: !!process.env.ANTHROPIC_API_KEY
            },
            features: {
                quickFix: true,
                aiAnalysis: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
                autoApply: true
            },
            version: '1.0.0',
            uptime: process.uptime()
        };

        console.log('📊 Error Doctor status requested:', {
            enabled: status.enabled,
            aiServices: status.aiServices
        });

        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('❌ Error Doctor status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get status'
        });
    }
});

/**
 * POST /api/error-doctor/context
 * Get error context for a working directory
 */
router.post('/context', checkFeatureFlag, async (req, res) => {
    try {
        const { workingDirectory } = req.body;

        if (!workingDirectory) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: workingDirectory'
            });
        }

        console.log('📁 Error Doctor: Getting context for:', workingDirectory);

        const context = await errorDoctor.getErrorContext(workingDirectory);

        res.json({
            success: true,
            context
        });

    } catch (error) {
        console.error('❌ Error Doctor context error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get context',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/error-doctor/test
 * Test endpoint for development and debugging
 */
router.post('/test', checkFeatureFlag, async (req, res) => {
    try {
        const { testType = 'syntax-error' } = req.body;

        console.log('🧪 Error Doctor: Running test:', testType);

        // Common test errors for validation
        const testErrors = {
            'syntax-error': 'SyntaxError: Unexpected token ) in JSON at position 10',
            'module-not-found': 'Error: Cannot find module \'express\'',
            'port-in-use': 'Error: listen EADDRINUSE: address already in use :::3000',
            'reference-error': 'ReferenceError: myVariable is not defined',
            'type-error': 'TypeError: Cannot read property \'name\' of undefined',
            'file-not-found': 'ENOENT: no such file or directory, open \'./missing-file.txt\'',
            'permission-denied': 'Error: EACCES: permission denied, mkdir \'/usr/local/test\'',
            'command-not-found': 'bash: python3: command not found'
        };

        const testError = testErrors[testType] || testErrors['syntax-error'];

        const result = await errorDoctor.analyzeError({
            errorText: testError,
            errorType: 'test',
            context: {
                workingDirectory: process.cwd(),
                hasPackageJson: true,
                nodeVersion: process.version,
                isTest: true
            }
        });

        console.log('✅ Test completed:', {
            testType,
            success: result.success,
            fixCount: result.fixes?.length || 0
        });

        res.json({
            success: true,
            testType,
            testError,
            analysis: result
        });

    } catch (error) {
        console.error('❌ Error Doctor test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Test failed',
            details: error.message
        });
    }
});

module.exports = router;