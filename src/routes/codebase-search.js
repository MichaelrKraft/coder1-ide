const express = require('express');
const CodebaseWiki = require('../services/codebase-wiki');
const path = require('path');

const router = express.Router();

// Initialize codebase wiki service
const codebaseWiki = new CodebaseWiki({
    projectRoot: path.resolve(__dirname, '../..'),
    logger: console
});

// Track indexing status
let indexingStatus = {
    isIndexing: false,
    progress: { processed: 0, total: 0 },
    lastIndexed: null,
    error: null
};

// Listen to wiki events
codebaseWiki.on('indexing-start', () => {
    indexingStatus.isIndexing = true;
    indexingStatus.error = null;
    console.log('🔍 [API] Codebase indexing started');
});

codebaseWiki.on('indexing-progress', (progress) => {
    indexingStatus.progress = progress;
});

codebaseWiki.on('indexing-complete', (stats) => {
    indexingStatus.isIndexing = false;
    indexingStatus.lastIndexed = new Date().toISOString();
    indexingStatus.progress = { processed: stats.filesProcessed, total: stats.filesProcessed };
    console.log('✅ [API] Codebase indexing completed');
});

codebaseWiki.on('indexing-error', (error) => {
    indexingStatus.isIndexing = false;
    indexingStatus.error = error.message;
    console.error('❌ [API] Codebase indexing failed:', error);
});

/**
 * GET /api/codebase/search?q=query&limit=20
 * Search the codebase for functions, classes, variables, files
 */
router.get('/search', async (req, res) => {
    try {
        const { 
            q: query, 
            limit = 20, 
            type,
            minComplexity,
            maxComplexity,
            complexity 
        } = req.query;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query parameter "q" is required',
                example: '/api/codebase/search?q=getUserProfile&complexity=high'
            });
        }
        
        console.log(`🔍 [CODEBASE-API] Searching for: "${query}"`);
        
        const results = codebaseWiki.search(query, {
            maxResults: parseInt(limit),
            type
        });
        
        // Filter by complexity if requested
        if (minComplexity || maxComplexity || complexity) {
            const min = minComplexity ? parseInt(minComplexity) : 0;
            const max = maxComplexity ? parseInt(maxComplexity) : Infinity;
            
            // Handle complexity categories
            let complexityRange = { min, max };
            if (complexity === 'low') {
                complexityRange = { min: 1, max: 5 };
            } else if (complexity === 'medium') {
                complexityRange = { min: 6, max: 10 };
            } else if (complexity === 'high') {
                complexityRange = { min: 11, max: Infinity };
            }
            
            // Filter functions by complexity
            results.functions = results.functions.filter(func => {
                const funcComplexity = func.complexity || 1;
                return funcComplexity >= complexityRange.min && funcComplexity <= complexityRange.max;
            });
        }
        
        // Calculate total results
        const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
        
        res.json({
            success: true,
            query,
            totalResults,
            results,
            searchTime: Date.now() - req.startTime || 0
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/codebase/index
 * Trigger full codebase reindexing
 */
router.post('/index', async (req, res) => {
    try {
        if (indexingStatus.isIndexing) {
            return res.status(409).json({
                success: false,
                error: 'Indexing already in progress',
                status: indexingStatus
            });
        }
        
        console.log('🚀 [CODEBASE-API] Starting codebase indexing...');
        
        // Start indexing asynchronously
        codebaseWiki.indexCodebase().catch(error => {
            console.error('❌ [CODEBASE-API] Indexing failed:', error);
        });
        
        res.json({
            success: true,
            message: 'Codebase indexing started',
            status: 'started'
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Index trigger error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/codebase/status
 * Get indexing status and statistics
 */
router.get('/status', (req, res) => {
    try {
        const stats = codebaseWiki.getStats();
        
        res.json({
            success: true,
            indexing: indexingStatus,
            stats,
            healthy: !indexingStatus.error
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/codebase/file/:path
 * Get detailed information about a specific file
 */
router.get('/file/*', (req, res) => {
    try {
        const filePath = req.params[0]; // Get full path after /file/
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }
        
        const fileInfo = codebaseWiki.index.files.get(filePath);
        
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found in index',
                suggestion: 'Try reindexing the codebase'
            });
        }
        
        // Get related entities in this file
        const fileFunctions = [];
        const fileClasses = [];
        const fileVariables = [];
        
        for (const funcId of fileInfo.functions) {
            const func = codebaseWiki.index.functions.get(funcId);
            if (func) fileFunctions.push(func);
        }
        
        for (const classId of fileInfo.classes) {
            const cls = codebaseWiki.index.classes.get(classId);
            if (cls) fileClasses.push(cls);
        }
        
        for (const varId of fileInfo.variables) {
            const variable = codebaseWiki.index.variables.get(varId);
            if (variable) fileVariables.push(variable);
        }
        
        res.json({
            success: true,
            file: fileInfo,
            entities: {
                functions: fileFunctions,
                classes: fileClasses,
                variables: fileVariables
            }
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] File info error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/codebase/function/:id
 * Get detailed information about a specific function
 */
router.get('/function/:id', (req, res) => {
    try {
        const { id } = req.params;
        const func = codebaseWiki.index.functions.get(decodeURIComponent(id));
        
        if (!func) {
            return res.status(404).json({
                success: false,
                error: 'Function not found'
            });
        }
        
        res.json({
            success: true,
            function: func
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Function info error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/codebase/class/:id
 * Get detailed information about a specific class
 */
router.get('/class/:id', (req, res) => {
    try {
        const { id } = req.params;
        const cls = codebaseWiki.index.classes.get(decodeURIComponent(id));
        
        if (!cls) {
            return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }
        
        res.json({
            success: true,
            class: cls
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Class info error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/codebase/dependencies/:filePath
 * Get dependency graph for a specific file
 */
router.get('/dependencies/*', (req, res) => {
    try {
        const filePath = req.params[0];
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }
        
        const dependencies = [];
        const dependents = [];
        
        // Find files this file imports from (dependencies)
        for (const [key, dep] of codebaseWiki.index.dependencies) {
            if (dep.from === filePath) {
                dependencies.push(dep);
            }
            if (dep.to === filePath) {
                dependents.push(dep);
            }
        }
        
        res.json({
            success: true,
            file: filePath,
            dependencies, // Files this file depends on
            dependents,   // Files that depend on this file
            dependencyCount: dependencies.length,
            dependentCount: dependents.length
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Dependencies error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/codebase/stats
 * Get overall codebase statistics
 */
router.get('/stats', (req, res) => {
    try {
        const stats = codebaseWiki.getStats();
        
        // Calculate additional metrics
        let totalLines = 0;
        let totalSize = 0;
        const fileTypes = {};
        
        for (const [path, fileInfo] of codebaseWiki.index.files) {
            totalLines += fileInfo.lines || 0;
            totalSize += fileInfo.size || 0;
            
            const ext = path.split('.').pop();
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        }
        
        // Function complexity analysis
        const complexityLevels = { low: 0, medium: 0, high: 0 };
        for (const [id, func] of codebaseWiki.index.functions) {
            if (func.complexity <= 5) complexityLevels.low++;
            else if (func.complexity <= 10) complexityLevels.medium++;
            else complexityLevels.high++;
        }
        
        res.json({
            success: true,
            ...stats,
            metrics: {
                totalLines,
                totalSize,
                fileTypes,
                complexityDistribution: complexityLevels,
                avgComplexity: codebaseWiki.index.functions.size > 0 ? 
                    Array.from(codebaseWiki.index.functions.values())
                        .reduce((sum, func) => sum + (func.complexity || 0), 0) / codebaseWiki.index.functions.size 
                    : 0
            }
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/codebase/suggest?q=partial
 * Get search suggestions for autocomplete
 */
router.get('/suggest', (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                suggestions: []
            });
        }
        
        const suggestions = [];
        const queryLower = query.toLowerCase();
        const maxLimit = parseInt(limit);
        
        // Search function names
        for (const [id, func] of codebaseWiki.index.functions) {
            if (func.name.toLowerCase().startsWith(queryLower)) {
                suggestions.push({
                    type: 'function',
                    name: func.name,
                    file: func.file,
                    params: func.params.map(p => p.name).join(', ')
                });
                
                if (suggestions.length >= maxLimit) break;
            }
        }
        
        // Search class names if we have room
        if (suggestions.length < maxLimit) {
            for (const [id, cls] of codebaseWiki.index.classes) {
                if (cls.name.toLowerCase().startsWith(queryLower)) {
                    suggestions.push({
                        type: 'class',
                        name: cls.name,
                        file: cls.file,
                        methods: cls.methods.length
                    });
                    
                    if (suggestions.length >= maxLimit) break;
                }
            }
        }
        
        res.json({
            success: true,
            query,
            suggestions
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Suggest error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/codebase/explain
 * Get AI-powered explanation of code entity
 */
router.post('/explain', async (req, res) => {
    try {
        const { entityId, entityType, code, context } = req.body;
        
        if (!entityId || !entityType) {
            return res.status(400).json({
                success: false,
                error: 'Entity ID and type are required'
            });
        }
        
        let entity = null;
        let sourceCode = code;
        
        // Get entity information from index
        if (entityType === 'function') {
            entity = codebaseWiki.index.functions.get(entityId);
        } else if (entityType === 'class') {
            entity = codebaseWiki.index.classes.get(entityId);
        } else if (entityType === 'variable') {
            entity = codebaseWiki.index.variables.get(entityId);
        }
        
        if (!entity) {
            return res.status(404).json({
                success: false,
                error: 'Entity not found'
            });
        }
        
        // Use existing code or extract from entity
        if (!sourceCode && entity.sourceCode) {
            sourceCode = entity.sourceCode;
        }
        
        // Build context for AI explanation
        const contextInfo = [];
        
        if (entity.file) {
            const fileInfo = codebaseWiki.index.files.get(entity.file);
            if (fileInfo) {
                contextInfo.push(`File: ${entity.file}`);
                contextInfo.push(`File context: ${fileInfo.functions.length} functions, ${fileInfo.classes.length} classes`);
            }
        }
        
        if (entity.params && entity.params.length > 0) {
            contextInfo.push(`Parameters: ${entity.params.map(p => `${p.name}: ${p.type}`).join(', ')}`);
        }
        
        if (entity.complexity) {
            contextInfo.push(`Cyclomatic Complexity: ${entity.complexity}`);
        }
        
        if (entity.methods && entity.methods.length > 0) {
            contextInfo.push(`Methods: ${entity.methods.map(m => `${m.name} (${m.type})`).join(', ')}`);
        }
        
        // Create AI prompt
        const prompt = `Please explain this ${entityType} in a clear, concise way:

${entityType.toUpperCase()}: ${entity.name}

${contextInfo.length > 0 ? 'CONTEXT:\n' + contextInfo.join('\n') + '\n\n' : ''}${sourceCode ? 'CODE:\n```javascript\n' + sourceCode + '\n```\n\n' : ''}Please provide:
1. A brief description of what this ${entityType} does
2. Its purpose and role in the codebase
3. Key implementation details${entityType === 'function' ? '\n4. Parameters and return value' : ''}${entity.complexity > 10 ? '\n5. Suggestions for reducing complexity' : ''}

Keep the explanation developer-friendly and focused on practical understanding.`;

        // Mock AI response for now (replace with actual Claude API call)
        const explanation = await generateAIExplanation(prompt);
        
        res.json({
            success: true,
            entity: {
                id: entityId,
                type: entityType,
                name: entity.name,
                file: entity.file,
                line: entity.line
            },
            explanation,
            context: contextInfo,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Explain error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/codebase/analyze-complexity
 * Analyze and explain code complexity
 */
router.post('/analyze-complexity', async (req, res) => {
    try {
        const { filePath, threshold = 10 } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }
        
        const fileInfo = codebaseWiki.index.files.get(filePath);
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found in index'
            });
        }
        
        // Get high-complexity functions
        const complexFunctions = [];
        for (const funcId of fileInfo.functions) {
            const func = codebaseWiki.index.functions.get(funcId);
            if (func && func.complexity >= threshold) {
                complexFunctions.push(func);
            }
        }
        
        if (complexFunctions.length === 0) {
            return res.json({
                success: true,
                file: filePath,
                message: `No functions with complexity >= ${threshold} found`,
                complexFunctions: [],
                suggestions: []
            });
        }
        
        // Generate AI suggestions for reducing complexity
        const analysisPrompt = `Analyze these high-complexity functions and provide refactoring suggestions:

FILE: ${filePath}

HIGH COMPLEXITY FUNCTIONS:
${complexFunctions.map(func => `
- ${func.name} (Complexity: ${func.complexity})
  Parameters: ${func.params.map(p => p.name).join(', ')}
  ${func.sourceCode ? 'Code Preview:\n```javascript\n' + func.sourceCode.split('\n').slice(0, 5).join('\n') + '\n```' : ''}
`).join('\n')}

Please provide:
1. Why these functions are complex
2. Specific refactoring suggestions for each function
3. General patterns to improve maintainability
4. Priority order for refactoring

Keep suggestions practical and actionable.`;

        const suggestions = await generateAIExplanation(analysisPrompt);
        
        res.json({
            success: true,
            file: filePath,
            threshold,
            complexFunctions: complexFunctions.map(func => ({
                id: func.id,
                name: func.name,
                complexity: func.complexity,
                line: func.line,
                params: func.params
            })),
            suggestions,
            analysisTime: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ [CODEBASE-API] Complexity analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to generate AI explanations
async function generateAIExplanation(prompt) {
    try {
        // Try to use existing Claude API integration
        const anthropic = require('@anthropic-ai/sdk');
        
        if (!process.env.ANTHROPIC_API_KEY) {
            return "AI explanations are not available. Please configure ANTHROPIC_API_KEY to enable intelligent code analysis.";
        }
        
        const client = new anthropic.Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        
        const response = await client.messages.create({
            model: 'claude-3-haiku-20240307', // Use faster model for explanations
            max_tokens: 1000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        
        return response.content[0]?.text || 'Unable to generate explanation';
        
    } catch (error) {
        console.error('AI explanation error:', error);
        
        // Fallback to rule-based explanation
        if (prompt.includes('function')) {
            return "This function performs operations based on its implementation. Consider reviewing the code structure, parameter usage, and return values to understand its purpose. AI-powered explanations require valid API configuration.";
        } else if (prompt.includes('class')) {
            return "This class encapsulates data and methods. Review its properties, methods, and inheritance relationships to understand its role in the codebase. AI-powered explanations require valid API configuration.";
        } else {
            return "Unable to provide detailed explanation without AI analysis. Please check your API configuration or review the code manually.";
        }
    }
}

// Add request timing middleware
router.use((req, res, next) => {
    req.startTime = Date.now();
    next();
});

module.exports = router;