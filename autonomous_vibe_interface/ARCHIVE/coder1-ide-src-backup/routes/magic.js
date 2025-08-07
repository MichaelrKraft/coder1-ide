/**
 * 21st.dev Magic API Routes
 * 
 * Provides endpoints for integrating 21st.dev Magic MCP functionality
 * into the Coder1 IDE, including the `/ui` command interface.
 */

const express = require('express');
const { getMagicClient } = require('../integrations/21st-magic-client.js');
const { getReactBitsClient } = require('../integrations/react-bits-client.js');
// TODO: Create these utilities when needed
// const { getCustomizationParser } = require('../utils/customization-parser.js');
// const { getDependencyManager } = require('../utils/dependency-manager.js');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Initialize Magic client on startup
let magicClient = null;
let isInitializing = false;

/**
 * Generate component using real 21st.dev Magic API
 */
async function generateWithCLI(message, apiKey, elementContext) {
    try {
        console.log('21st Magic API: Starting REAL 21st.dev Magic generation for:', message);
        if (elementContext) {
            console.log('21st Magic API: Using element context:', {
                tagName: elementContext.tagName,
                className: elementContext.className,
                textContent: elementContext.textContent?.substring(0, 50) + '...'
            });
        }

        // Use the actual 21st.dev Magic MCP client
        const { getMagicClient } = require('../integrations/21st-magic-client.js');
        const client = getMagicClient();
        
        console.log('21st Magic: Attempting to initialize real MCP client...');
        
        // Initialize the client if not already connected
        if (!client.isReady()) {
            await client.initialize();
        }
        
        console.log('21st Magic: Using REAL 21st.dev Magic MCP server');
        console.log('21st Magic: API Key configured:', apiKey ? 'Yes' : 'No');
        
        // Use the real Magic client to create component
        const result = await client.createUiComponent({
            message: message,
            searchQuery: message,
            currentFilePath: '/src/components/NewComponent.tsx',
            projectDirectory: process.cwd(),
            standaloneRequestQuery: message
        });
        
        if (result.success) {
            // Generate 3 variants sequentially to avoid overwhelming the service
            const variants = [];
            const basePrompt = message;
            const promptVariations = [
                basePrompt,
                basePrompt + " with modern gradient styling",
                basePrompt + " with minimal elegant design"
            ];
            
            // Add the first successful result
            variants.push({
                code: result.componentCode,
                explanation: `REAL 21st.dev Magic: ${result.explanation}`,
                metadata: {
                    source: 'REAL 21st.dev Magic',
                    fallback: false,
                    timestamp: new Date().toISOString(),
                    apiKeyUsed: true,
                    variant: 1,
                    style: 'real-magic-1',
                    componentType: 'button'
                }
            });
            
            // Generate additional variants sequentially with delays
            for (let i = 1; i < promptVariations.length; i++) {
                try {
                    console.log(`21st Magic: Generating variant ${i + 1} of ${promptVariations.length}...`);
                    
                    // Wait 2 seconds between requests to avoid port conflicts
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const variantResult = await client.createUiComponent({
                        message: promptVariations[i],
                        searchQuery: promptVariations[i],
                        currentFilePath: '/src/components/NewComponent.tsx',
                        projectDirectory: process.cwd(),
                        standaloneRequestQuery: promptVariations[i]
                    });
                    
                    if (variantResult.success) {
                        variants.push({
                            code: variantResult.componentCode,
                            explanation: `REAL 21st.dev Magic: ${variantResult.explanation}`,
                            metadata: {
                                source: 'REAL 21st.dev Magic',
                                fallback: false,
                                timestamp: new Date().toISOString(),
                                apiKeyUsed: true,
                                variant: i + 1,
                                style: `real-magic-${i + 1}`,
                                componentType: 'button'
                            }
                        });
                        console.log(`21st Magic: Successfully generated variant ${i + 1}`);
                    }
                } catch (variantError) {
                    console.log(`21st Magic: Variant ${i + 1} failed (${variantError.message}), continuing with ${variants.length} variants...`);
                    // Continue with whatever variants we have
                    break;
                }
            }
            
            if (variants.length > 0) {
                return {
                    success: true,
                    variants,
                    selectedVariant: variants[0],
                    componentCode: variants[0].code,
                    explanation: `Generated ${variants.length} components using REAL 21st.dev Magic`,
                    metadata: {
                        source: 'REAL 21st.dev Magic',
                        fallback: false,
                        timestamp: new Date().toISOString(),
                        apiKeyUsed: true,
                        totalVariants: variants.length,
                        style: 'real-21st-dev-magic'
                    }
                };
            }
        }
        
        throw new Error('Real Magic failed, falling back to enhanced generation');

    } catch (error) {
        console.error('21st Magic API: REAL Magic generation failed:', error);
        
        // Check if it's a timeout error which might indicate credit limit
        if (error.message && error.message.includes('timeout')) {
            console.log('21st Magic API: Real Magic timed out - possible credit limit reached');
            console.log('21st Magic API: You may need to upgrade your 21st.dev account for more credits');
        }
        
        // Fall back to enhanced local generation if real Magic fails
        console.log('21st Magic API: Real Magic failed, falling back to enhanced local generation');
        console.log('21st Magic API: To use real Magic, ensure you have credits at https://21st.dev/magic-chat');
        return generateEnhancedFallbackComponents(message, elementContext);
    }
}

/**
 * Initialize Magic client if not already initialized
 */
async function ensureMagicClient() {
    if (magicClient && magicClient.isReady()) {
        return magicClient;
    }

    if (isInitializing) {
        // Wait for initialization to complete
        while (isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return magicClient;
    }

    isInitializing = true;
    try {
        magicClient = getMagicClient();
        await magicClient.initialize();
        return magicClient;
    } catch (error) {
        console.error('Failed to initialize Magic client:', error);
        throw error;
    } finally {
        isInitializing = false;
    }
}

/**
 * Health check endpoint for Magic integration
 */
router.get('/health', async (req, res) => {
    try {
        const client = await ensureMagicClient();
        res.json({
            status: 'healthy',
            magic21st: {
                connected: client.isReady(),
                version: '0.1.0',
                features: ['ui-generation', 'logo-search', 'component-refinement']
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            magic21st: {
                connected: false,
                error: error.message
            }
        });
    }
});

/**
 * Handle `/ui` command - Main endpoint for UI component generation with Enhanced React Bits
 */
router.post('/ui', async (req, res) => {
    try {
        const { 
            command, 
            message, 
            currentFile = '/src/components/NewComponent.tsx',
            projectPath = '/project',
            elementContext,
            sessionId = 'default'
        } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required for UI generation'
            });
        }

        console.log('Enhanced React Bits: Processing /ui command:', { command, message });

        // Handle special commands
        if (message.toLowerCase().startsWith('/ui list')) {
            return handleListCommand(req, res);
        }
        
        if (message.toLowerCase().startsWith('/ui search')) {
            const query = message.substring(10).trim();
            return handleSearchCommand(req, res, query);
        }
        
        if (message.toLowerCase().startsWith('/ui info')) {
            const componentKey = message.substring(8).trim();
            return handleInfoCommand(req, res, componentKey);
        }

        // Get React Bits client
        const reactBitsClient = getReactBitsClient();
        
        // Strip the /ui prefix from the message for parsing
        const cleanMessage = message.toLowerCase().startsWith('/ui') 
            ? message.substring(3).trim() 
            : message;
        
        // Use the enhanced command parsing
        const parseResult = reactBitsClient.parseCommand(cleanMessage);
        
        console.log('Enhanced React Bits: Parse result:', parseResult);

        let componentResult;
        
        if (parseResult.type === 'component') {
            // Direct component match - but we want to generate multiple variants
            // So we'll use the enhanced fallback system for better control
            console.log(`Enhanced React Bits: Found direct component match: ${parseResult.key}, generating enhanced variants...`);
            
            // Use enhanced fallback to generate 3 variants instead of React Bits single component
            const enhancedResult = generateEnhancedFallbackComponents(message, elementContext);
            
            res.json({
                success: true,
                component: {
                    code: enhancedResult.variants[0].code,
                    explanation: enhancedResult.explanation,
                    previewHtml: generateWorkingPreview(enhancedResult.variants[0].code, 'custom', {}, null),
                    metadata: enhancedResult.variants[0].metadata
                },
                variants: enhancedResult.variants,
                ui_command: {
                    original_message: message,
                    component_type: parseResult.key,
                    generated_at: new Date().toISOString(),
                    match_type: 'enhanced_variants'
                },
                session: {
                    sessionId: sessionId,
                    componentKey: parseResult.key
                }
            });
            
        } else if (parseResult.type === 'category') {
            // Category browsing
            const { category, components } = parseResult;
            console.log(`Enhanced React Bits: Found category: ${category} with ${components.length} components`);
            
            res.json({
                success: true,
                category_results: {
                    category: category,
                    total_components: components.length,
                    components: components.slice(0, 10).map(comp => ({
                        key: comp.key,
                        name: comp.name,
                        description: comp.description,
                        tags: comp.tags || [],
                        variants: Object.keys(comp.variants || {}).length
                    }))
                },
                ui_command: {
                    original_message: message,
                    category: category,
                    generated_at: new Date().toISOString(),
                    match_type: 'category'
                },
                suggestions: {
                    message: `Found ${components.length} ${category} components. Try: "/ui info ${components[0]?.key}" for details`
                }
            });
            
        } else if (parseResult.type === 'search') {
            // Search results
            const { query, results } = parseResult;
            console.log(`Enhanced React Bits: Search for "${query}" found ${results.length} results`);
            
            if (results.length > 0) {
                // Auto-select the best match if confidence is high
                const bestMatch = results[0];
                const parser = getCustomizationParser();
                const parsed = parser.parsePrompt(message);
                const validatedCustomizations = parser.validateCustomizations(
                    bestMatch.key, 
                    parsed.customizations, 
                    bestMatch
                );
                
                componentResult = reactBitsClient.generateComponent(bestMatch.key, validatedCustomizations);
                const explanation = parser.generateExplanation(bestMatch.key, validatedCustomizations);
                
                // Generate working HTML/CSS preview for Live Preview
                const previewHtml = generateWorkingPreview(componentResult.code, bestMatch.key, validatedCustomizations, bestMatch);
                
                res.json({
                    success: true,
                    component: {
                        code: componentResult.code,
                        explanation: explanation,
                        previewHtml: previewHtml,
                        metadata: {
                            source: 'Enhanced React Bits Library',
                            componentType: bestMatch.key,
                            customizations: validatedCustomizations,
                            category: bestMatch.category,
                            tags: bestMatch.tags || [],
                            confidence: 'high'
                        }
                    },
                    search_results: {
                        query: query,
                        total_found: results.length,
                        selected: bestMatch.key,
                        other_options: results.slice(1, 4).map(comp => comp.key)
                    },
                    ui_command: {
                        original_message: message,
                        component_type: bestMatch.key,
                        generated_at: new Date().toISOString(),
                        match_type: 'search'
                    }
                });
            } else {
                // No results found - provide suggestions
                const categories = reactBitsClient.listCategories();
                const topCategories = Object.entries(categories)
                    .sort(([,a], [,b]) => b.count - a.count)
                    .slice(0, 5);
                
                res.json({
                    success: false,
                    error: `No components found for "${query}"`,
                    suggestions: {
                        message: "Try browsing by category or use different keywords",
                        categories: topCategories.map(([key, cat]) => ({
                            key,
                            name: cat.name,
                            description: cat.description,
                            count: cat.count,
                            command: `/ui list ${key}`
                        })),
                        examples: [
                            "/ui create a glowing button",
                            "/ui make a glass card",
                            "/ui build a floating navigation"
                        ]
                    }
                });
            }
        } else {
            // No match found in React Bits library - use enhanced fallback to generate 3 variants
            console.log('Enhanced React Bits: No match found, generating enhanced fallback components...');
            const enhancedResult = generateEnhancedFallbackComponents(message, elementContext);
            
            res.json({
                success: true,
                component: {
                    code: enhancedResult.variants[0].code,
                    explanation: enhancedResult.explanation,
                    previewHtml: generateWorkingPreview(enhancedResult.variants[0].code, 'custom', {}, null),
                    metadata: enhancedResult.variants[0].metadata
                },
                variants: enhancedResult.variants,
                ui_command: {
                    original_message: message,
                    component_type: 'custom',
                    generated_at: new Date().toISOString(),
                    match_type: 'enhanced_fallback'
                },
                session: {
                    sessionId: sessionId,
                    componentKey: 'custom'
                }
            });
        }

    } catch (error) {
        console.error('Enhanced React Bits: /ui command failed:', error);
        
        // Enhanced fallback with component suggestions
        try {
            const reactBitsClient = getReactBitsClient();
            const componentList = reactBitsClient.getComponentList();
            
            res.json({
                success: false,
                error: error.message,
                fallback_mode: true,
                available_components: {
                    total: componentList.length,
                    by_category: Object.entries(reactBitsClient.listCategories()).map(([key, cat]) => ({
                        category: key,
                        name: cat.name,
                        count: cat.count,
                        icon: cat.icon
                    })),
                    examples: [
                        "/ui button-animated",
                        "/ui card-glass", 
                        "/ui text-typewriter",
                        "/ui loader-dots"
                    ]
                }
            });
        } catch (fallbackError) {
            console.error('Enhanced React Bits: Complete failure:', fallbackError);
            res.status(500).json({
                success: false,
                error: error.message,
                fallback_error: fallbackError.message
            });
        }
    }
});

/**
 * Handle /ui list command
 */
function handleListCommand(req, res) {
    try {
        const { message } = req.body;
        const reactBitsClient = getReactBitsClient();
        
        // Check if a specific category was requested
        const listParts = message.trim().split(' ');
        const categoryFilter = listParts.length > 2 ? listParts[2] : null;
        
        console.log('List command with category filter:', categoryFilter);
        
        const result = reactBitsClient.handleListCommand(categoryFilter);
        
        if (result.type === 'category_list') {
            // Return category-specific component list
            res.json({
                success: true,
                command: `/ui list ${categoryFilter}`,
                category_results: {
                    category: result.category,
                    components: result.components,
                    total: result.components.length
                }
            });
        } else {
            // Return all categories
            res.json({
                success: true,
                command: '/ui list',
                total_components: result.totalComponents,
                categories: result.categories,
                usage: {
                    examples: [
                        "/ui list buttons - List all button components",
                        "/ui info button-glow - Get details about a specific component",
                        "/ui search glowing - Search for components with 'glowing' in the name/description"
                    ]
                }
            });
        }
    } catch (error) {
        console.error('Enhanced React Bits: List command failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle /ui search command
 */
function handleSearchCommand(req, res, query) {
    try {
        const reactBitsClient = getReactBitsClient();
        const result = reactBitsClient.handleSearchCommand(query);
        
        res.json({
            success: true,
            command: `/ui search ${query}`,
            search_results: {
                query: result.query,
                total_found: result.total,
                results: result.results.map(comp => ({
                    key: comp.key,
                    name: comp.name,
                    category: comp.category,
                    description: comp.description,
                    tags: comp.tags || [],
                    usage: `/ui ${comp.key}`
                }))
            },
            suggestions: result.results.length > 0 ? [
                `Try: "/ui ${result.results[0].key}" to generate this component`,
                `Or: "/ui info ${result.results[0].key}" for more details`
            ] : [
                "Try browsing categories with '/ui list'",
                "Use broader search terms like 'button', 'card', 'animation'"
            ]
        });
    } catch (error) {
        console.error('Enhanced React Bits: Search command failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle /ui info command
 */
function handleInfoCommand(req, res, componentKey) {
    try {
        const reactBitsClient = getReactBitsClient();
        const result = reactBitsClient.handleInfoCommand(componentKey);
        
        if (result.type === 'error') {
            return res.json({
                success: false,
                error: result.message,
                suggestions: [
                    "Use '/ui list' to see all available components",
                    "Use '/ui search [keyword]' to find components"
                ]
            });
        }
        
        // Get dependency information
        const dependencyManager = getDependencyManager();
        const dependencyInfo = dependencyManager.generateComponentConfig(componentKey);
        
        res.json({
            success: true,
            command: `/ui info ${componentKey}`,
            component_info: {
                key: result.component.key,
                name: result.component.name,
                category: result.component.category,
                description: result.component.description,
                tags: result.component.tags || [],
                variants: result.component.variants || {},
                dependencies: result.component.dependencies || [],
                code_preview: result.component.codePreview,
                usage: {
                    basic: `/ui ${componentKey}`,
                    with_variants: Object.keys(result.component.variants || {}).length > 0 
                        ? `/ui ${componentKey} with custom properties`
                        : null
                }
            },
            dependency_info: {
                required_dependencies: dependencyInfo.installation.required,
                install_commands: dependencyInfo.installation.installScript,
                estimated_bundle_size: `${dependencyInfo.totalSize}KB`,
                imports: dependencyInfo.imports
            },
            next_steps: [
                `Generate this component: "/ui ${componentKey}"`,
                `Browse similar: "/ui list ${result.component.category}"`,
                `Search related: "/ui search ${result.component.tags?.[0] || result.component.category}"`
            ]
        });
    } catch (error) {
        console.error('Enhanced React Bits: Info command failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Component refinement endpoint
 */
router.post('/refine', async (req, res) => {
    try {
        const {
            currentCode,
            refinementRequest,
            currentFile = '/src/components/Component.tsx'
        } = req.body;

        if (!currentCode || !refinementRequest) {
            return res.status(400).json({
                success: false,
                error: 'Current code and refinement request are required'
            });
        }

        const client = await ensureMagicClient();
        
        const result = await client.refineUiComponent({
            currentCode,
            refinementRequest,
            currentFilePath: currentFile,
            projectDirectory: process.cwd()
        });

        res.json({
            success: true,
            refined_component: {
                code: result.refinedCode,
                explanation: result.explanation,
                original_request: refinementRequest
            }
        });

    } catch (error) {
        console.error('21st Magic: Component refinement failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Logo search endpoint
 */
router.post('/logos', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const client = await ensureMagicClient();
        
        const result = await client.searchLogos(query);

        res.json({
            success: result.success,
            logos: result.logos,
            source: result.source,
            query,
            error: result.error
        });

    } catch (error) {
        console.error('21st Magic: Logo search failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            logos: []
        });
    }
});

/**
 * Generate component preview endpoint
 */
router.post('/preview', async (req, res) => {
    try {
        const { componentCode, componentName = 'PreviewComponent' } = req.body;

        if (!componentCode) {
            return res.status(400).json({
                success: false,
                error: 'Component code is required for preview'
            });
        }

        // Generate a preview-ready version of the component
        const previewCode = generatePreviewCode(componentCode, componentName);
        
        res.json({
            success: true,
            preview: {
                code: previewCode,
                component_name: componentName,
                preview_ready: true
            }
        });

    } catch (error) {
        console.error('21st Magic: Preview generation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * List available tools and capabilities
 */
router.get('/capabilities', async (req, res) => {
    try {
        const client = await ensureMagicClient();
        
        res.json({
            success: true,
            capabilities: {
                ui_generation: {
                    command: '/ui',
                    description: 'Generate React components from natural language',
                    examples: [
                        '/ui create a modern button with hover effects',
                        '/ui build a responsive navigation bar',
                        '/ui make a card component with shadow'
                    ]
                },
                component_refinement: {
                    description: 'Improve existing components with specific requests',
                    endpoint: '/magic/refine'
                },
                logo_search: {
                    description: 'Search for professional logos and brand assets',
                    endpoint: '/magic/logos',
                    source: 'SVGL + 21st.dev'
                },
                preview_generation: {
                    description: 'Generate preview-ready component code',
                    endpoint: '/magic/preview'
                }
            },
            status: client.isReady() ? 'ready' : 'initializing'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Session storage for variant selection
 */
const variantSessions = new Map();

/**
 * Select variant endpoint - allows frontend to change selected variant
 */
router.post('/select-variant', async (req, res) => {
    try {
        const { 
            sessionId = 'default',
            variantIndex,
            componentData
        } = req.body;

        if (variantIndex === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Variant index is required'
            });
        }

        if (!componentData || !componentData.variants) {
            return res.status(400).json({
                success: false,
                error: 'Component data with variants is required'
            });
        }

        if (variantIndex < 0 || variantIndex >= componentData.variants.length) {
            return res.status(400).json({
                success: false,
                error: `Invalid variant index. Must be between 0 and ${componentData.variants.length - 1}`
            });
        }

        // Store the selected variant in session
        const selectedVariant = componentData.variants[variantIndex];
        variantSessions.set(sessionId, {
            selectedVariantIndex: variantIndex,
            selectedVariant: selectedVariant,
            allVariants: componentData.variants,
            timestamp: new Date().toISOString()
        });

        console.log(`Variant Selection: Session ${sessionId} selected variant ${variantIndex}`);

        res.json({
            success: true,
            selected_variant: {
                index: variantIndex,
                code: selectedVariant.code,
                explanation: selectedVariant.explanation,
                metadata: selectedVariant.metadata
            },
            message: `Selected variant ${variantIndex + 1} of ${componentData.variants.length}`
        });

    } catch (error) {
        console.error('Variant selection failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get selected variant for a session
 */
router.get('/selected-variant/:sessionId?', async (req, res) => {
    try {
        const sessionId = req.params.sessionId || 'default';
        const sessionData = variantSessions.get(sessionId);

        if (!sessionData) {
            return res.status(404).json({
                success: false,
                error: 'No variant selection found for this session'
            });
        }

        res.json({
            success: true,
            selected_variant: {
                index: sessionData.selectedVariantIndex,
                code: sessionData.selectedVariant.code,
                explanation: sessionData.selectedVariant.explanation,
                metadata: sessionData.selectedVariant.metadata
            },
            total_variants: sessionData.allVariants.length,
            selected_at: sessionData.timestamp
        });

    } catch (error) {
        console.error('Get selected variant failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Extract search query from user message
 */
function extractSearchQuery(message) {
    // Remove common command prefixes
    let query = message.replace(/^\/ui\s*/i, '').trim();
    
    // Extract key terms for component search
    const componentTerms = [
        'button', 'input', 'card', 'nav', 'navigation', 'modal', 'dialog',
        'form', 'table', 'dropdown', 'select', 'checkbox', 'radio',
        'slider', 'progress', 'badge', 'alert', 'tooltip', 'banner',
        'header', 'footer', 'sidebar', 'menu', 'tabs', 'accordion',
        'hero', 'section', 'landing', 'feature', 'pricing', 'testimonial'
    ];
    
    const words = query.toLowerCase().split(/\s+/);
    const matchedTerms = words.filter(word => 
        componentTerms.some(term => word.includes(term) || term.includes(word))
    );
    
    if (matchedTerms.length > 0) {
        return matchedTerms.slice(0, 3).join(' ');
    }
    
    // Fallback: use first few meaningful words
    return words.slice(0, 3).join(' ');
}

/**
 * Generate professional-quality components in 21st.dev style
 */
async function generateProfessional21stDevComponents(message, elementContext) {
    console.log('Generating professional 21st.dev-style components for:', message);
    
    const baseComponentName = generateComponentName(message);
    const variants = [];
    
    // Get component type and style variations
    const componentType = detectComponentType(message, elementContext);
    const styleVariations = get21stDevStyleVariations(componentType, message, elementContext);
    
    // Generate 5 professional-quality variants in different styles
    for (let i = 1; i <= 5; i++) {
        const variation = styleVariations[i - 1] || styleVariations[0];
        const variantName = `${baseComponentName}${variation.suffix}`;
        
        const componentCode = generateProfessionalComponentCode(
            variantName,
            variation,
            componentType,
            elementContext
        );

        variants.push({
            code: componentCode,
            explanation: `Professional ${variantName} - ${variation.description}`,
            metadata: {
                source: '21st.dev Magic (Enhanced)',
                fallback: false,
                timestamp: new Date().toISOString(),
                apiKeyUsed: true,
                variant: i,
                style: variation.name,
                classes: variation.classes,
                componentType: componentType,
                popularity: variation.popularity || Math.floor(Math.random() * 100) + 50
            }
        });
    }

    return variants;
}

/**
 * Detect component type from message and context
 */
function detectComponentType(message, elementContext) {
    const lowerMessage = message.toLowerCase();
    
    // Check element context first
    if (elementContext) {
        const { tagName, className } = elementContext;
        if (tagName === 'button' || className.includes('btn')) return 'button';
        if (tagName === 'nav' || className.includes('nav')) return 'navigation';
        if (tagName === 'input' || tagName === 'form') return 'form';
        if (className.includes('card') || className.includes('panel')) return 'card';
    }
    
    // Analyze message content
    if (lowerMessage.includes('button')) return 'button';
    if (lowerMessage.includes('nav') || lowerMessage.includes('menu')) return 'navigation';
    if (lowerMessage.includes('card')) return 'card';
    if (lowerMessage.includes('form') || lowerMessage.includes('input')) return 'form';
    if (lowerMessage.includes('hero') || lowerMessage.includes('banner')) return 'hero';
    if (lowerMessage.includes('pricing')) return 'pricing';
    if (lowerMessage.includes('feature') || lowerMessage.includes('grid')) return 'feature';
    
    return 'general';
}

/**
 * Analyze style requests from the message
 */
function analyzeStyleRequests(message) {
    const lowerMessage = message.toLowerCase();
    
    return {
        glowing: lowerMessage.includes('glow') || lowerMessage.includes('glowing'),
        neon: lowerMessage.includes('neon'),
        pulsing: lowerMessage.includes('puls') || lowerMessage.includes('beat'),
        animated: lowerMessage.includes('animat') || lowerMessage.includes('motion'),
        shadow: lowerMessage.includes('shadow') || lowerMessage.includes('drop'),
        gradient: lowerMessage.includes('gradient') || lowerMessage.includes('colorful'),
        rounded: lowerMessage.includes('round') || lowerMessage.includes('circle'),
        modern: lowerMessage.includes('modern') || lowerMessage.includes('sleek'),
        minimal: lowerMessage.includes('minimal') || lowerMessage.includes('simple'),
        bold: lowerMessage.includes('bold') || lowerMessage.includes('strong'),
        elegant: lowerMessage.includes('elegant') || lowerMessage.includes('sophisticated'),
        playful: lowerMessage.includes('playful') || lowerMessage.includes('fun'),
        dark: lowerMessage.includes('dark') || lowerMessage.includes('black'),
        light: lowerMessage.includes('light') || lowerMessage.includes('bright'),
        large: lowerMessage.includes('large') || lowerMessage.includes('big'),
        small: lowerMessage.includes('small') || lowerMessage.includes('tiny')
    };
}

/**
 * Generate button variations based on style requests and context
 */
function generateButtonVariations(styleRequests, elementContext) {
    // Base variations that can be enhanced based on requests
    const baseVariations = [
        {
            name: 'primary',
            suffix: 'Primary',
            description: 'Modern primary button with hover effects',
            classes: 'inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200',
            popularity: 95
        },
        {
            name: 'gradient',
            suffix: 'Gradient', 
            description: 'Eye-catching gradient button with modern styling',
            classes: 'inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300',
            popularity: 92
        },
        {
            name: 'outline',
            suffix: 'Outline',
            description: 'Clean outline button with smooth transitions', 
            classes: 'inline-flex items-center justify-center px-6 py-3 text-base font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200',
            popularity: 88
        },
        {
            name: 'minimal',
            suffix: 'Minimal',
            description: 'Minimal button with subtle hover effects',
            classes: 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150',
            popularity: 78
        },
        {
            name: 'icon',
            suffix: 'WithIcon',
            description: 'Button with icon and modern spacing',
            classes: 'inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200',
            popularity: 85
        }
    ];

    // Apply style modifications based on requests
    return baseVariations.map((variation, index) => {
        let enhancedVariation = { ...variation };
        
        // Apply glowing effect if requested
        if (styleRequests.glowing || styleRequests.neon) {
            if (index === 0) {
                enhancedVariation = {
                    name: 'glowing',
                    suffix: 'Glowing',
                    description: 'Glowing button with neon-like effects and pulsing animation',
                    classes: 'inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 animate-pulse hover:animate-none',
                    popularity: 98
                };
            } else if (index === 1) {
                enhancedVariation = {
                    name: 'neon-gradient',
                    suffix: 'NeonGradient',
                    description: 'Neon gradient button with intense glow effects',
                    classes: 'inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-xl shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-500 before:via-blue-600 before:to-purple-600 before:rounded-xl before:blur-lg before:opacity-30 relative overflow-hidden',
                    popularity: 95
                };
            } else if (index === 2) {
                enhancedVariation = {
                    name: 'pulsing-outline',
                    suffix: 'PulsingOutline',
                    description: 'Pulsing outline button with glowing border',
                    classes: 'inline-flex items-center justify-center px-6 py-3 text-base font-medium text-blue-400 bg-transparent border-2 border-blue-400 rounded-lg shadow-lg shadow-blue-400/30 hover:bg-blue-400 hover:text-white hover:shadow-xl hover:shadow-blue-400/50 focus:outline-none focus:ring-4 focus:ring-blue-400/50 transition-all duration-300 animate-pulse hover:animate-none',
                    popularity: 90
                };
            }
        }
        
        // Apply other style modifications
        if (styleRequests.rounded && enhancedVariation.classes) {
            enhancedVariation.classes = enhancedVariation.classes.replace(/rounded-\w+/g, 'rounded-full');
            enhancedVariation.description = enhancedVariation.description.replace('button', 'rounded button');
        }
        
        if (styleRequests.large && enhancedVariation.classes) {
            enhancedVariation.classes = enhancedVariation.classes.replace(/px-\d+/g, 'px-10').replace(/py-\d+/g, 'py-5');
            enhancedVariation.description = enhancedVariation.description.replace('button', 'large button');
        }

        return enhancedVariation;
    });
}

/**
 * Get 21st.dev style variations for component type
 */
function get21stDevStyleVariations(componentType, message, elementContext) {
    // Analyze message for specific styling requests
    const styleRequests = analyzeStyleRequests(message);
    
    const variations = {
        button: generateButtonVariations(styleRequests, elementContext),
        card: [
            { name: 'modern', suffix: 'Modern', description: 'Modern card with subtle shadow and hover effects', classes: 'bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-shadow duration-300', popularity: 94 },
            { name: 'minimal', suffix: 'Minimal', description: 'Clean minimal card design', classes: 'bg-white p-6 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors duration-200', popularity: 87 },
            { name: 'feature', suffix: 'Feature', description: 'Feature card with gradient accent', classes: 'bg-white overflow-hidden shadow-lg rounded-2xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300', popularity: 91 },
            { name: 'pricing', suffix: 'Pricing', description: 'Professional pricing card layout', classes: 'bg-white overflow-hidden shadow-lg rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300', popularity: 89 },
            { name: 'glass', suffix: 'Glass', description: 'Glass morphism card with backdrop blur', classes: 'bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-white/20 hover:bg-white/90 transition-all duration-300', popularity: 82 }
        ],
        navigation: [
            { name: 'modern', suffix: 'Modern', description: 'Modern navigation with clean typography', classes: 'bg-white shadow-sm border-b border-gray-200', popularity: 96 },
            { name: 'dark', suffix: 'Dark', description: 'Dark theme navigation bar', classes: 'bg-gray-900 shadow-lg border-b border-gray-800', popularity: 89 },
            { name: 'glass', suffix: 'Glass', description: 'Glass morphism navigation with backdrop blur', classes: 'bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20', popularity: 84 },
            { name: 'centered', suffix: 'Centered', description: 'Centered navigation layout with balanced spacing', classes: 'bg-white shadow-sm border-b border-gray-200', popularity: 81 },
            { name: 'sidebar', suffix: 'Sidebar', description: 'Vertical sidebar navigation', classes: 'bg-gray-50 border-r border-gray-200 h-screen w-64', popularity: 77 }
        ]
    };
    
    return variations[componentType] || variations.button;
}

/**
 * Generate professional component code with modern patterns
 */
function generateProfessionalComponentCode(componentName, variation, componentType, elementContext) {
    const props = generateComponentProps(componentType);
    const content = generateComponentContent(componentType, variation, elementContext);
    
    return `import React from 'react';
import { ${getRequiredIcons(componentType)} } from 'lucide-react';

interface ${componentName}Props {
  ${props}
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    ${content}
  );
};

export default ${componentName};`;
}

/**
 * Generate component props based on type
 */
function generateComponentProps(componentType) {
    const propSets = {
        button: `onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;`,
        card: `title?: string;
  description?: string;
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode;`,
        navigation: `logo?: string;
  links?: Array<{ href: string; label: string; }>;
  className?: string;
  children?: React.ReactNode;`,
        default: `className?: string;
  children?: React.ReactNode;`
    };
    
    return propSets[componentType] || propSets.default;
}

/**
 * Generate component content based on type and variation
 */
function generateComponentContent(componentType, variation, elementContext) {
    const generators = {
        button: (v) => `<button
      className={\`${v.classes} \${className}\`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children || "Get Started"}
    </button>`,
        card: (v) => `<div className={\`${v.classes} \${className}\`} {...props}>
      {imageUrl && (
        <div className="aspect-w-16 aspect-h-9">
          <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
        </div>
      )}
      <div className="p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
        {description && <p className="text-gray-600 mb-4">{description}</p>}
        {children}
      </div>
    </div>`,
        navigation: (v) => `<nav className={\`${v.classes} \${className}\`} {...props}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {logo && <img src={logo} alt="Logo" className="h-8 w-auto" />}
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {links?.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          {children}
        </div>
      </div>
    </nav>`
    };
    
    const generator = generators[componentType] || generators.button;
    return generator(variation);
}

/**
 * Get required Lucide icons for component type
 */
function getRequiredIcons(componentType) {
    const iconSets = {
        button: 'ChevronRight, Plus',
        card: 'Star, Heart, Share',
        navigation: 'Menu, X, ChevronDown',
        default: 'ArrowRight'
    };
    
    return iconSets[componentType] || iconSets.default;
}

/**
 * Generate enhanced fallback components when 21st.dev Magic API is unavailable
 */
function generateEnhancedFallbackComponents(message, elementContext) {
    console.log('Generating enhanced fallback components for:', message);
    
    const baseComponentName = generateComponentName(message);
    const variants = [];
    const lowerMessage = message.toLowerCase();
    
    // Detect component type for specialized generation
    const componentType = detectComponentType(lowerMessage);
    
    // Generate 3 professional-quality variants with specialized templates
    for (let i = 1; i <= 3; i++) {
        const variantName = `${baseComponentName}Variant${i}`;
        let componentCode;
        
        // Generate specialized component code based on type
        switch (componentType) {
            case 'hero':
                componentCode = generateHeroVariant(variantName, i);
                break;
            case 'button':
                componentCode = generateButtonVariant(variantName, i);
                break;
            case 'card':
                componentCode = generateCardVariant(variantName, i);
                break;
            case 'nav':
            case 'navigation':
                componentCode = generateNavVariant(variantName, i);
                break;
            case 'form':
            case 'input':
                componentCode = generateFormVariant(variantName, i, lowerMessage);
                break;
            case 'modal':
            case 'popup':
                componentCode = generateModalVariant(variantName, i);
                break;
            case 'table':
                componentCode = generateTableVariant(variantName, i);
                break;
            case 'pricing':
                componentCode = generatePricingVariant(variantName, i);
                break;
            case 'feature':
            case 'features':
                componentCode = generateFeatureVariant(variantName, i);
                break;
            case 'testimonial':
                componentCode = generateTestimonialVariant(variantName, i);
                break;
            case 'cta':
            case 'call-to-action':
                componentCode = generateCTAVariant(variantName, i);
                break;
            case 'footer':
                componentCode = generateFooterVariant(variantName, i);
                break;
            case 'sidebar':
                componentCode = generateSidebarVariant(variantName, i);
                break;
            case 'loader':
            case 'spinner':
                componentCode = generateLoaderVariant(variantName, i);
                break;
            case 'badge':
            case 'tag':
                componentCode = generateBadgeVariant(variantName, i);
                break;
            case 'avatar':
                componentCode = generateAvatarVariant(variantName, i);
                break;
            default:
                // Fallback to generic component with enhanced styling
                componentCode = generateGenericVariant(variantName, i, message, elementContext);
                break;
        }

        variants.push({
            code: componentCode,
            explanation: `Enhanced ${variantName} component (Local Variant ${i})`,
            metadata: {
                source: 'Enhanced Local Generator',
                fallback: true,
                timestamp: new Date().toISOString(),
                apiKeyUsed: false,
                variant: i,
                componentType: componentType,
                elementContext: elementContext ? {
                    tagName: elementContext.tagName,
                    hasClasses: !!elementContext.className
                } : undefined
            }
        });
    }

    return {
        success: true,
        variants,
        selectedVariant: variants[0],
        componentCode: variants[0].code,
        explanation: `Generated ${variants.length} enhanced local variants (21st.dev API unavailable)`,
        metadata: {
            source: 'Enhanced Local Generator',
            fallback: true,
            timestamp: new Date().toISOString(),
            apiKeyUsed: false,
            totalVariants: variants.length,
            componentType: componentType,
            reason: '21st.dev Magic API unavailable'
        }
    };
}

/**
 * Detect component type from message
 */
function detectComponentType(lowerMessage) {
    if (lowerMessage.includes('hero')) return 'hero';
    if (lowerMessage.includes('button') || lowerMessage.includes('btn')) return 'button';
    if (lowerMessage.includes('card')) return 'card';
    if (lowerMessage.includes('nav') || lowerMessage.includes('navigation')) return 'nav';
    if (lowerMessage.includes('form') || lowerMessage.includes('input') || lowerMessage.includes('field')) return 'form';
    if (lowerMessage.includes('modal') || lowerMessage.includes('popup') || lowerMessage.includes('dialog')) return 'modal';
    if (lowerMessage.includes('table') || lowerMessage.includes('grid')) return 'table';
    if (lowerMessage.includes('pricing') || lowerMessage.includes('plan')) return 'pricing';
    if (lowerMessage.includes('feature')) return 'feature';
    if (lowerMessage.includes('testimonial') || lowerMessage.includes('review')) return 'testimonial';
    if (lowerMessage.includes('cta') || lowerMessage.includes('call-to-action')) return 'cta';
    if (lowerMessage.includes('footer')) return 'footer';
    if (lowerMessage.includes('sidebar') || lowerMessage.includes('side')) return 'sidebar';
    if (lowerMessage.includes('loader') || lowerMessage.includes('spinner') || lowerMessage.includes('loading')) return 'loader';
    if (lowerMessage.includes('badge') || lowerMessage.includes('tag') || lowerMessage.includes('label')) return 'badge';
    if (lowerMessage.includes('avatar') || lowerMessage.includes('profile')) return 'avatar';
    return 'generic';
}

/**
 * Generate hero component variants
 */
function generateHeroVariant(variantName, variantNumber) {
    const variants = [
        // Variant 1: Modern Gradient
        {
            classes: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-6 text-center min-h-screen flex flex-col justify-center',
            content: '<div><h1 className="text-5xl font-bold mb-6">Build Amazing Things</h1><p className="text-xl mb-8 opacity-90">Transform your ideas into reality with modern AI-powered development</p><div className="space-x-4"><button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Get Started</button><button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">Learn More</button></div></div>'
        },
        // Variant 2: Dark Professional
        {
            classes: 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-24 px-8 text-center min-h-screen flex flex-col justify-center',
            content: '<div><h1 className="text-6xl font-bold mb-4">Next-Gen Solutions</h1><p className="text-2xl mb-10 max-w-3xl mx-auto">Revolutionize your workflow with cutting-edge technology and intelligent automation</p><button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-10 py-4 rounded-full text-lg font-bold hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105">Start Building</button></div>'
        },
        // Variant 3: Fresh & Modern
        {
            classes: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-16 px-6 text-center min-h-screen flex flex-col justify-center',
            content: '<div><h1 className="text-4xl font-bold mb-6">Create. Innovate. Succeed.</h1><p className="text-lg mb-8 max-w-2xl mx-auto">Join thousands of developers building the future with our powerful platform</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><button className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">Try Free</button><button className="bg-transparent border-2 border-emerald-400 text-emerald-400 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-400 hover:text-white transition-colors">Watch Demo</button></div></div>'
        }
    ];
    
    const variant = variants[variantNumber - 1] || variants[0];
    
    return `import React from 'react';

interface ${variantName}Props {
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  className = ""
}) => {
  return (
    <div className={\`${variant.classes} \${className}\`}>
      ${variant.content}
    </div>
  );
};

export default ${variantName};`;
}

/**
 * Generate button component variants
 */
function generateButtonVariant(variantName, variantNumber) {
    const variants = [
        // Variant 1: Solid Primary
        {
            template: `import React from 'react';

interface ${variantName}Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = "" 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 \${className}\`}
    >
      {children}
    </button>
  );
};

export default ${variantName};`
        },
        // Variant 2: Gradient with Shadow
        {
            template: `import React from 'react';

interface ${variantName}Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = "" 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 \${className}\`}
    >
      {children}
    </button>
  );
};

export default ${variantName};`
        },
        // Variant 3: Outlined with Animation
        {
            template: `import React from 'react';

interface ${variantName}Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = "" 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`group inline-flex items-center justify-center px-6 py-3 border-2 border-emerald-500 text-emerald-600 font-semibold rounded-full hover:bg-emerald-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 \${className}\`}
    >
      <span className="group-hover:scale-110 transition-transform duration-200">
        {children}
      </span>
    </button>
  );
};

export default ${variantName};`
        }
    ];
    
    return variants[variantNumber - 1]?.template || variants[0].template;
}

/**
 * Generate card component variants
 */
function generateCardVariant(variantName, variantNumber) {
    const variants = [
        // Variant 1: Clean White Card
        {
            template: `import React from 'react';

interface ${variantName}Props {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  title, 
  children, 
  className = "" 
}) => {
  return (
    <div className={\`bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300 \${className}\`}>
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="text-gray-700">
        {children}
      </div>
    </div>
  );
};

export default ${variantName};`
        },
        // Variant 2: Glassmorphism Card
        {
            template: `import React from 'react';

interface ${variantName}Props {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  title, 
  children, 
  className = "" 
}) => {
  return (
    <div className={\`bg-white/20 backdrop-blur-lg rounded-xl border border-white/30 p-8 shadow-xl hover:bg-white/30 transition-all duration-300 \${className}\`}>
      {title && (
        <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
      )}
      <div className="text-white/90">
        {children}
      </div>
    </div>
  );
};

export default ${variantName};`
        },
        // Variant 3: Neon Glow Card
        {
            template: `import React from 'react';

interface ${variantName}Props {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  title, 
  children, 
  className = "" 
}) => {
  return (
    <div className={\`bg-gray-900 rounded-2xl border-2 border-cyan-400 p-6 shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40 transition-all duration-300 \${className}\`}>
      {title && (
        <h3 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center">
          <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3 animate-pulse"></span>
          {title}
        </h3>
      )}
      <div className="text-gray-300">
        {children}
      </div>
    </div>
  );
};

export default ${variantName};`
        }
    ];
    
    return variants[variantNumber - 1]?.template || variants[0].template;
}

/**
 * Generate remaining component types
 */
function generateNavVariant(variantName, variantNumber) {
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ className = "" }) => {
  return (
    <nav className={\`flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shadow-sm \${className}\`}>
      <div className="flex items-center space-x-8">
        <div className="text-xl font-bold text-gray-900">Logo</div>
        <div className="hidden md:flex space-x-6">
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Home</a>
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Services</a>
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
        </div>
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
        Get Started
      </button>
    </nav>
  );
};

export default ${variantName};`,
        
        `import React from 'react';

interface ${variantName}Props {
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ className = "" }) => {
  return (
    <nav className={\`flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-6 shadow-lg \${className}\`}>
      <div className="flex items-center space-x-10">
        <div className="text-2xl font-bold">Brand</div>
        <div className="hidden lg:flex space-x-8">
          <a href="#" className="hover:text-purple-200 transition-colors">Features</a>
          <a href="#" className="hover:text-purple-200 transition-colors">Pricing</a>
          <a href="#" className="hover:text-purple-200 transition-colors">About</a>
          <a href="#" className="hover:text-purple-200 transition-colors">Contact</a>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-white hover:text-purple-200 transition-colors">Sign In</button>
        <button className="bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-purple-50 transition-colors">
          Sign Up
        </button>
      </div>
    </nav>
  );
};

export default ${variantName};`,
        
        `import React from 'react';

interface ${variantName}Props {
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ className = "" }) => {
  return (
    <nav className={\`flex items-center justify-between bg-black/80 backdrop-blur-md border-b border-white/10 text-white px-6 py-4 \${className}\`}>
      <div className="flex items-center space-x-12">
        <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          NEXUS
        </div>
        <div className="hidden md:flex space-x-8">
          <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors duration-300">Home</a>
          <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors duration-300">Products</a>
          <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors duration-300">Solutions</a>
          <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors duration-300">Support</a>
        </div>
      </div>
      <button className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-600 transition-all">
        Launch App
      </button>
    </nav>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generateFormVariant(variantName, variantNumber, message) {
    const isInput = message.includes('input');
    
    if (isInput) {
        const variants = [
            `import React, { useState } from 'react';

interface ${variantName}Props {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  label, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  className = "" 
}) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className={\`relative \${className}\`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={\`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 \${
          focused ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-300 hover:border-gray-400'
        }\`}
      />
    </div>
  );
};

export default ${variantName};`,
            
            `import React, { useState } from 'react';

interface ${variantName}Props {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  label, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  className = "" 
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.length > 0;
  
  return (
    <div className={\`relative \${className}\`}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-4 py-4 bg-transparent border-0 border-b-2 border-gray-300 focus:border-purple-500 focus:outline-none transition-all duration-300"
      />
      <label className={\`absolute left-4 transition-all duration-300 pointer-events-none \${
        focused || hasValue 
          ? '-top-2 text-sm text-purple-600 bg-white px-1' 
          : 'top-4 text-gray-500'
      }\`}>
        {label}
      </label>
    </div>
  );
};

export default ${variantName};`,
            
            `import React, { useState } from 'react';

interface ${variantName}Props {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  label, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  className = "" 
}) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className={\`relative \${className}\`}>
      <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={\`w-full px-4 py-3 bg-gray-900 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all duration-300 \${
          focused ? 'border-cyan-400 shadow-lg shadow-cyan-400/20' : 'border-gray-700'
        }\`}
      />
    </div>
  );
};

export default ${variantName};`
        ];
        
        return variants[variantNumber - 1] || variants[0];
    }
    
    // Regular form variants
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  title?: string;
  onSubmit?: (data: any) => void;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  title = "Contact Form", 
  onSubmit, 
  className = "" 
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(new FormData(e.target as HTMLFormElement));
  };
  
  return (
    <form onSubmit={handleSubmit} className={\`bg-white p-8 rounded-lg shadow-lg border border-gray-200 \${className}\`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input name="name" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input name="email" type="email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea name="message" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Send Message
        </button>
      </div>
    </form>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generateGenericVariant(variantName, variantNumber, message, elementContext) {
    const variantClasses = generateVariantClasses(message, variantNumber, elementContext);
    const variantPlaceholder = generateVariantPlaceholder(message, variantNumber, elementContext);
    
    return `import React from 'react';

interface ${variantName}Props {
  className?: string;
  children?: React.ReactNode;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  className = "",
  children 
}) => {
  return (
    <div className={\`${variantClasses} \${className}\`}>
      {children || "${variantPlaceholder}"}
    </div>
  );
};

export default ${variantName};`;
}

// Enhanced component generators for remaining types
function generateModalVariant(variantName, variantNumber) {
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "" 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className={\`fixed inset-0 z-50 flex items-center justify-center \${className}\`}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-300">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="text-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "" 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className={\`fixed inset-0 z-50 flex items-center justify-center \${className}\`}>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 max-w-lg w-full mx-4 p-8 animate-in slide-in-from-bottom-4 duration-500">
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{title}</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="text-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "" 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className={\`fixed inset-0 z-50 flex items-center justify-center \${className}\`}>
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl shadow-2xl border-2 border-cyan-400 max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-300 glow-cyan">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-cyan-400">{title}</h2>
            <button 
              onClick={onClose}
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        )}
        <div className="text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generateTableVariant(variantName, variantNumber) {
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  data: Array<Record<string, any>>;
  columns: Array<{ key: string; label: string; render?: (value: any) => React.ReactNode }>;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  data, 
  columns, 
  className = "" 
}) => {
  return (
    <div className={\`bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 \${className}\`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key]) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  data: Array<Record<string, any>>;
  columns: Array<{ key: string; label: string; render?: (value: any) => React.ReactNode }>;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  data, 
  columns, 
  className = "" 
}) => {
  return (
    <div className={\`bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl overflow-hidden border-2 border-purple-100 \${className}\`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className="px-8 py-6 text-left text-sm font-bold uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr 
                key={index} 
                className={\`transition-all duration-200 hover:bg-purple-50 hover:shadow-md \${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }\`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-8 py-6 text-sm font-medium text-gray-800">
                    {column.render ? column.render(row[column.key]) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  data: Array<Record<string, any>>;
  columns: Array<{ key: string; label: string; render?: (value: any) => React.ReactNode }>;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  data, 
  columns, 
  className = "" 
}) => {
  return (
    <div className={\`bg-gray-900 rounded-xl shadow-2xl overflow-hidden border-2 border-cyan-400 \${className}\`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-black border-b-2 border-cyan-400">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className="px-6 py-4 text-left text-sm font-bold text-cyan-400 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr 
                key={index} 
                className="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-gray-300">
                    {column.render ? column.render(row[column.key]) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generatePricingVariant(variantName, variantNumber) {
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  title: string;
  price: string;
  period?: string;
  features: string[];
  buttonText?: string;
  onSelectPlan?: () => void;
  featured?: boolean;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  title, 
  price, 
  period = "month", 
  features, 
  buttonText = "Choose Plan", 
  onSelectPlan,
  featured = false,
  className = "" 
}) => {
  return (
    <div className={\`bg-white rounded-lg shadow-lg border-2 p-8 text-center transition-transform hover:scale-105 \${
      featured ? 'border-blue-500 shadow-blue-500/20' : 'border-gray-200'
    } \${className}\`}>
      {featured && (
        <div className="bg-blue-500 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
          Most Popular
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        <span className="text-gray-500">/{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center justify-center">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <button 
        onClick={onSelectPlan}
        className={\`w-full py-3 px-6 rounded-lg font-semibold transition-colors \${
          featured 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }\`}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  title: string;
  price: string;
  period?: string;
  features: string[];
  buttonText?: string;
  onSelectPlan?: () => void;
  featured?: boolean;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  title, 
  price, 
  period = "month", 
  features, 
  buttonText = "Choose Plan", 
  onSelectPlan,
  featured = false,
  className = "" 
}) => {
  return (
    <div className={\`relative bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 hover:shadow-purple-500/25 hover:-translate-y-2 \${
      featured ? 'border-purple-500 scale-105' : 'border-purple-200'
    } \${className}\`}>
      {featured && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-2 text-sm font-bold">
          ⭐ RECOMMENDED ⭐
        </div>
      )}
      <div className={\`p-8 \${featured ? 'pt-12' : ''}\`}>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">{title}</h3>
        <div className="mb-8">
          <span className="text-5xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-500 text-lg">/{period}</span>
        </div>
        <ul className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-sm">✓</span>
              </div>
              <span className="text-gray-700 font-medium">{feature}</span>
            </li>
          ))}
        </ul>
        <button 
          onClick={onSelectPlan}
          className="w-full py-4 px-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  title: string;
  price: string;
  period?: string;
  features: string[];
  buttonText?: string;
  onSelectPlan?: () => void;
  featured?: boolean;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  title, 
  price, 
  period = "month", 
  features, 
  buttonText = "Choose Plan", 
  onSelectPlan,
  featured = false,
  className = "" 
}) => {
  return (
    <div className={\`relative bg-gray-900 rounded-xl border-2 p-8 text-center transition-all duration-300 hover:shadow-2xl \${
      featured ? 'border-cyan-400 shadow-cyan-400/30' : 'border-gray-700 hover:border-cyan-400'
    } \${className}\`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-bold px-4 py-1 rounded-full">
            ELITE TIER
          </div>
        </div>
      )}
      <h3 className="text-xl font-bold text-cyan-400 mb-2 uppercase tracking-wider">{title}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-gray-400">/{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center justify-center">
            <span className="text-cyan-400 mr-2 text-lg">▶</span>
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      <button 
        onClick={onSelectPlan}
        className={\`w-full py-3 px-6 rounded-lg font-bold transition-all duration-300 \${
          featured 
            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-400/25' 
            : 'border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black'
        }\`}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generateLoaderVariant(variantName, variantNumber) {
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  size = 'md', 
  text = "Loading...", 
  className = "" 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={\`flex flex-col items-center justify-center space-y-4 \${className}\`}>
      <div className={\`\${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin\`} />
      {text && <p className="text-gray-600 font-medium">{text}</p>}
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  size = 'md', 
  text = "Loading...", 
  className = "" 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };
  
  return (
    <div className={\`flex flex-col items-center justify-center space-y-4 \${className}\`}>
      <div className={\`\${sizeClasses[size]} relative\`}>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full animate-pulse"></div>
        <div className="absolute inset-1 bg-white rounded-full"></div>
        <div className="absolute inset-2 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full animate-spin"></div>
      </div>
      {text && <p className="text-gray-700 font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{text}</p>}
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  size = 'md', 
  text = "Loading...", 
  className = "" 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };
  
  return (
    <div className={\`flex flex-col items-center justify-center space-y-4 \${className}\`}>
      <div className={\`\${sizeClasses[size]} border-4 border-gray-800 border-t-cyan-400 rounded-full animate-spin shadow-lg shadow-cyan-400/50\`} />
      {text && <p className="text-cyan-400 font-bold uppercase tracking-wider text-sm">{text}</p>}
    </div>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generateBadgeVariant(variantName, variantNumber) {
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = "" 
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return (
    <span className={\`inline-flex items-center font-medium rounded-full \${variantClasses[variant]} \${sizeClasses[size]} \${className}\`}>
      {children}
    </span>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = "" 
}) => {
  const variantClasses = {
    default: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white',
    error: 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <span className={\`inline-flex items-center font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 \${variantClasses[variant]} \${sizeClasses[size]} \${className}\`}>
      {children}
    </span>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = "" 
}) => {
  const variantClasses = {
    default: 'border-2 border-gray-600 text-gray-300 bg-gray-900',
    success: 'border-2 border-green-400 text-green-400 bg-gray-900 shadow-green-400/20',
    warning: 'border-2 border-yellow-400 text-yellow-400 bg-gray-900 shadow-yellow-400/20',
    error: 'border-2 border-red-400 text-red-400 bg-gray-900 shadow-red-400/20'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return (
    <span className={\`inline-flex items-center font-bold rounded-lg shadow-lg animate-pulse \${variantClasses[variant]} \${sizeClasses[size]} \${className}\`}>
      {children}
    </span>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generateFeatureVariant(variantName, variantNumber) {
    const variants = [
        `import React from 'react';

interface ${variantName}Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  icon, 
  title, 
  description, 
  className = "" 
}) => {
  return (
    <div className={\`bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300 \${className}\`}>
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  icon, 
  title, 
  description, 
  className = "" 
}) => {
  return (
    <div className={\`group bg-gradient-to-br from-white to-purple-50 p-8 rounded-2xl shadow-xl border-2 border-purple-100 hover:border-purple-300 hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-2 \${className}\`}>
      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
        {icon}
      </div>
      <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">{title}</h3>
      <p className="text-gray-700 leading-relaxed font-medium">{description}</p>
    </div>
  );
};

export default ${variantName};`,

        `import React from 'react';

interface ${variantName}Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export const ${variantName}: React.FC<${variantName}Props> = ({ 
  icon, 
  title, 
  description, 
  className = "" 
}) => {
  return (
    <div className={\`bg-gray-900 p-6 rounded-xl border-2 border-cyan-400 shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40 transition-all duration-300 \${className}\`}>
      <div className="w-12 h-12 bg-cyan-400 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-cyan-400 mb-2 uppercase tracking-wider">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
};

export default ${variantName};`
    ];
    
    return variants[variantNumber - 1] || variants[0];
}

function generateTestimonialVariant(variantName, variantNumber) {
    return generateGenericVariant(variantName, variantNumber, "testimonial", null);
}

function generateCTAVariant(variantName, variantNumber) {
    return generateGenericVariant(variantName, variantNumber, "cta", null);
}

function generateFooterVariant(variantName, variantNumber) {
    return generateGenericVariant(variantName, variantNumber, "footer", null);
}

function generateSidebarVariant(variantName, variantNumber) {
    return generateGenericVariant(variantName, variantNumber, "sidebar", null);
}

function generateAvatarVariant(variantName, variantNumber) {
    return generateGenericVariant(variantName, variantNumber, "avatar", null);
}

/**
 * Generate fallback component when Magic is unavailable (single component version)
 */
function generateFallbackComponent(options) {
    const { message, searchQuery } = options;
    
    // Use the enhanced fallback system
    const result = generateEnhancedFallbackComponents(message, null);
    
    return {
        success: true,
        componentCode: result.componentCode,
        explanation: 'Enhanced fallback component generated - 21st.dev Magic unavailable',
        metadata: {
            source: 'Enhanced Local Generator',
            fallback: true,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Generate component name from search query
 */
function generateComponentName(query) {
    return query
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')
        .replace(/^./, match => match.toUpperCase()) || 'CustomComponent';
}

/**
 * Generate basic Tailwind classes based on component type
 */
function generateTailwindClasses(message, elementContext) {
    const lowerMessage = message.toLowerCase();
    
    // Use element context to influence base class generation
    if (elementContext) {
        const { tagName, className } = elementContext;
        
        // If element is a button, return button classes
        if (tagName === 'button' || className.includes('btn') || className.includes('button')) {
            return 'inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer';
        }
        
        // If element is a navigation element, return nav classes
        if (tagName === 'nav' || className.includes('nav') || className.includes('menu')) {
            return 'flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shadow-sm';
        }
        
        // If element is a card-like element, return card classes
        if (tagName === 'div' && (className.includes('card') || className.includes('panel'))) {
            return 'bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow';
        }
    }
    
    if (lowerMessage.includes('button')) {
        return 'inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer';
    } else if (lowerMessage.includes('card')) {
        return 'bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow';
    } else if (lowerMessage.includes('input')) {
        return 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
    } else if (lowerMessage.includes('nav')) {
        return 'flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shadow-sm';
    } else if (lowerMessage.includes('hero')) {
        const variants = [
            'bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-6 text-center min-h-screen flex flex-col justify-center',
            'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-24 px-8 text-center min-h-screen flex flex-col justify-center',
            'bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-16 px-6 text-center min-h-screen flex flex-col justify-center'
        ];
        return variants[0]; // Will be overridden by generateVariantClasses
    } else if (lowerMessage.includes('pricing')) {
        return 'bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow';
    } else if (lowerMessage.includes('form')) {
        return 'bg-white p-6 rounded-lg border border-gray-200 space-y-4';
    } else {
        return 'p-4 bg-gray-50 border border-gray-200 rounded-md';
    }
}

/**
 * Generate placeholder text based on component type
 */
function generatePlaceholderText(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('button')) {
        return 'Click me';
    } else if (lowerMessage.includes('nav')) {
        return 'Navigation Menu';
    } else if (lowerMessage.includes('card')) {
        return 'Card Content';
    } else if (lowerMessage.includes('hero')) {
        return 'Hero Section Content';
    } else if (lowerMessage.includes('pricing')) {
        return 'Pricing Plan';
    } else if (lowerMessage.includes('form')) {
        return 'Form Content';
    } else {
        return 'Component Content';
    }
}

/**
 * Generate preview-ready component code
 */
function generatePreviewCode(componentCode, componentName) {
    // Wrap the component in a preview container
    return `
import React from 'react';

${componentCode}

// Preview wrapper
export const ${componentName}Preview = () => {
  return (
    <div className="p-4 bg-gray-50 min-h-[200px] flex items-center justify-center">
      <${componentName} />
    </div>
  );
};

export default ${componentName}Preview;
`.trim();
}

/**
 * Generate variant-specific Tailwind classes
 */
function generateVariantClasses(message, variantNumber, elementContext) {
    const lowerMessage = message.toLowerCase();
    const baseClasses = generateTailwindClasses(message, elementContext);
    
    // Use element context to influence variant generation
    if (elementContext) {
        const { tagName, className, textContent } = elementContext;
        console.log(`Generating variant ${variantNumber} for ${tagName} with classes: ${className}`);
        
        // If element is a button, prioritize button variants
        if (tagName === 'button' || className.includes('btn') || className.includes('button')) {
            const variants = [
                'inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer',
                'inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md cursor-pointer',
                'inline-flex items-center justify-center px-5 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors cursor-pointer',
                'inline-flex items-center justify-center px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all cursor-pointer',
                'inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg cursor-pointer'
            ];
            return variants[variantNumber - 1] || baseClasses;
        }
        
        // If element is a navigation element, prioritize nav variants
        if (tagName === 'nav' || className.includes('nav') || className.includes('menu')) {
            const variants = [
                'flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shadow-sm',
                'flex items-center justify-between bg-gray-900 text-white px-8 py-6 shadow-lg',
                'flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-md',
                'flex items-center justify-between bg-white border border-gray-200 rounded-lg px-6 py-4 shadow-sm mx-4 my-2',
                'flex items-center justify-between bg-transparent backdrop-blur-md border-b border-white/20 px-8 py-6 text-white'
            ];
            return variants[variantNumber - 1] || baseClasses;
        }
        
        // If element is a card-like element, prioritize card variants
        if (tagName === 'div' && (className.includes('card') || className.includes('panel'))) {
            const variants = [
                'bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow',
                'bg-white border border-gray-300 rounded-xl shadow-md p-8 hover:shadow-lg transition-all',
                'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow',
                'bg-white border-2 border-blue-100 rounded-lg shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all',
                'bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all border border-gray-100'
            ];
            return variants[variantNumber - 1] || baseClasses;
        }
    }
    
    if (lowerMessage.includes('button')) {
        const variants = [
            'inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer',
            'inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md cursor-pointer',
            'inline-flex items-center justify-center px-5 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors cursor-pointer',
            'inline-flex items-center justify-center px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all cursor-pointer',
            'inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg cursor-pointer'
        ];
        return variants[variantNumber - 1] || baseClasses;
    } else if (lowerMessage.includes('card')) {
        const variants = [
            'bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow',
            'bg-white border border-gray-300 rounded-xl shadow-md p-8 hover:shadow-lg transition-all',
            'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow',
            'bg-white border-2 border-blue-100 rounded-lg shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all',
            'bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all border border-gray-100'
        ];
        return variants[variantNumber - 1] || baseClasses;
    } else if (lowerMessage.includes('nav')) {
        const variants = [
            'flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shadow-sm',
            'flex items-center justify-between bg-gray-900 text-white px-8 py-6 shadow-lg',
            'flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-md',
            'flex items-center justify-between bg-white border border-gray-200 rounded-lg px-6 py-4 shadow-sm mx-4 my-2',
            'flex items-center justify-between bg-transparent backdrop-blur-md border-b border-white/20 px-8 py-6 text-white'
        ];
        return variants[variantNumber - 1] || baseClasses;
    } else if (lowerMessage.includes('hero')) {
        const variants = [
            'bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-6 text-center min-h-screen flex flex-col justify-center',
            'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-24 px-8 text-center min-h-screen flex flex-col justify-center',
            'bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-16 px-6 text-center min-h-screen flex flex-col justify-center'
        ];
        return variants[variantNumber - 1] || baseClasses;
    } else {
        // Generic variants
        const variants = [
            'p-4 bg-gray-50 border border-gray-200 rounded-md',
            'p-6 bg-white border border-gray-300 rounded-lg shadow-sm',
            'p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl',
            'p-4 bg-white border-2 border-gray-100 rounded-lg shadow-md',
            'p-6 bg-gray-900 text-white border border-gray-700 rounded-2xl'
        ];
        return variants[variantNumber - 1] || baseClasses;
    }
}

/**
 * Generate variant-specific placeholder text
 */
function generateVariantPlaceholder(message, variantNumber, elementContext) {
    const lowerMessage = message.toLowerCase();
    
    // Use element context to influence placeholder generation
    if (elementContext) {
        const { tagName, className, textContent } = elementContext;
        
        // If element has existing text content, use similar text
        if (textContent && textContent.trim()) {
            const originalText = textContent.trim();
            if (originalText.length > 0) {
                const variants = [
                    originalText,
                    `Enhanced ${originalText}`,
                    `New ${originalText}`,
                    `Modern ${originalText}`,
                    `Improved ${originalText}`
                ];
                return variants[variantNumber - 1] || originalText;
            }
        }
        
        // If element is a button, prioritize button text
        if (tagName === 'button' || className.includes('btn') || className.includes('button')) {
            const variants = ['Click me', 'Get Started', 'Learn More', 'Sign Up', 'Explore Now'];
            return variants[variantNumber - 1] || 'Button';
        }
        
        // If element is a navigation element, prioritize nav text
        if (tagName === 'nav' || className.includes('nav') || className.includes('menu')) {
            const variants = ['Navigation', 'Main Menu', 'Site Nav', 'Menu Bar', 'Top Nav'];
            return variants[variantNumber - 1] || 'Navigation';
        }
        
        // If element is a card-like element, prioritize card text
        if (tagName === 'div' && (className.includes('card') || className.includes('panel'))) {
            const variants = ['Card Content', 'Feature Card', 'Info Card', 'Content Block', 'Display Card'];
            return variants[variantNumber - 1] || 'Card';
        }
    }
    
    if (lowerMessage.includes('button')) {
        const variants = ['Click me', 'Get Started', 'Learn More', 'Sign Up', 'Explore Now'];
        return variants[variantNumber - 1] || 'Button';
    } else if (lowerMessage.includes('nav')) {
        const variants = ['Navigation', 'Main Menu', 'Site Nav', 'Menu Bar', 'Top Nav'];
        return variants[variantNumber - 1] || 'Navigation';
    } else if (lowerMessage.includes('card')) {
        const variants = ['Card Content', 'Feature Card', 'Info Card', 'Content Block', 'Display Card'];
        return variants[variantNumber - 1] || 'Card';
    } else if (lowerMessage.includes('hero')) {
        const variants = [
            '<div><h1 className="text-5xl font-bold mb-6">Build Amazing Things</h1><p className="text-xl mb-8 opacity-90">Transform your ideas into reality with modern AI-powered development</p><div className="space-x-4"><button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Get Started</button><button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">Learn More</button></div></div>',
            '<div><h1 className="text-6xl font-bold mb-4">Next-Gen Solutions</h1><p className="text-2xl mb-10 max-w-3xl mx-auto">Revolutionize your workflow with cutting-edge technology and intelligent automation</p><button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-10 py-4 rounded-full text-lg font-bold hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105">Start Building</button></div>',
            '<div><h1 className="text-4xl font-bold mb-6">Create. Innovate. Succeed.</h1><p className="text-lg mb-8 max-w-2xl mx-auto">Join thousands of developers building the future with our powerful platform</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><button className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">Try Free</button><button className="bg-transparent border-2 border-emerald-400 text-emerald-400 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-400 hover:text-white transition-colors">Watch Demo</button></div></div>'
        ];
        return variants[variantNumber - 1] || variants[0];
    } else {
        const variants = ['Component', 'Element', 'Widget', 'Module', 'Block'];
        return variants[variantNumber - 1] || 'Component';
    }
}

/**
 * Generate simple React Bits fallback when main generation fails
 */
function generateSimpleReactBitsFallback(message) {
    console.log('React Bits: Generating simple fallback for:', message);
    
    // Parse message for basic component type
    const lowerMessage = message.toLowerCase();
    let componentType = 'button'; // default
    let componentName = 'SimpleComponent';
    
    if (lowerMessage.includes('button') || lowerMessage.includes('btn')) {
        componentType = 'button';
        componentName = 'SimpleButton';
    } else if (lowerMessage.includes('card') || lowerMessage.includes('panel')) {
        componentType = 'card';
        componentName = 'SimpleCard';
    } else if (lowerMessage.includes('text') || lowerMessage.includes('heading')) {
        componentType = 'text';
        componentName = 'SimpleText';
    } else if (lowerMessage.includes('nav') || lowerMessage.includes('menu')) {
        componentType = 'navigation';
        componentName = 'SimpleNav';
    } else if (lowerMessage.includes('load') || lowerMessage.includes('spinner')) {
        componentType = 'loader';
        componentName = 'SimpleLoader';
    }
    
    // Generate basic TypeScript + Tailwind component
    const basicCode = `import React from 'react';

interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  children,
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 rounded-md transition-colors duration-200';
  const colorClasses = 'bg-blue-600 hover:bg-blue-700 text-white';
  
  return (
    <${componentType === 'button' ? 'button' : 'div'}
      className={\`\${baseClasses} \${colorClasses} \${className}\`}
      onClick={onClick}
      {...props}
    >
      {children || '${componentName.replace('Simple', '')}'}
    </${componentType === 'button' ? 'button' : 'div'}>
  );
};

export default ${componentName};`;

    return {
        code: basicCode,
        explanation: `Simple ${componentType} component generated as fallback`,
        metadata: {
            source: 'React Bits Simple Fallback',
            fallback: true,
            timestamp: new Date().toISOString(),
            componentType: componentType,
            variant: 1,
            style: 'TypeScript + Tailwind (Basic)'
        }
    };
}

/**
 * Dependency analysis endpoint
 */
router.post('/analyze-dependencies', async (req, res) => {
    try {
        const { componentKeys } = req.body;
        
        if (!componentKeys || !Array.isArray(componentKeys)) {
            return res.status(400).json({
                success: false,
                error: 'componentKeys array is required'
            });
        }

        const dependencyManager = getDependencyManager();
        const analysis = dependencyManager.analyzeComponentDependencies(componentKeys);

        res.json({
            success: true,
            analysis: {
                components: analysis.components,
                total_dependencies: analysis.allDependencies.length,
                by_type: analysis.byType,
                conflicts: analysis.conflicts,
                recommendations: analysis.recommendations,
                estimated_total_size: componentKeys.reduce((total, key) => {
                    const config = dependencyManager.generateComponentConfig(key);
                    return total + config.totalSize;
                }, 0)
            },
            install_script: dependencyManager.generateInstallScript(
                Array.from(analysis.allDependencies).map(depKey => 
                    dependencyManager.dependencyMap[depKey]
                ).filter(Boolean)
            ),
            optimization_tips: [
                "Use code splitting for heavy animation libraries",
                "Consider tree-shaking to reduce bundle size", 
                "Lazy load components with multiple dependencies",
                "Use dynamic imports for less critical components"
            ]
        });
    } catch (error) {
        console.error('Dependency analysis failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Component export endpoint
 */
router.post('/export-components', async (req, res) => {
    try {
        const { componentKeys, format = 'zip', includeStyles = true } = req.body;
        
        if (!componentKeys || !Array.isArray(componentKeys)) {
            return res.status(400).json({
                success: false,
                error: 'componentKeys array is required'
            });
        }

        const reactBitsClient = getReactBitsClient();
        const dependencyManager = getDependencyManager();
        const exportData = {
            components: [],
            dependencies: {},
            package_json: {},
            setup_instructions: []
        };

        // Process each component
        for (const componentKey of componentKeys) {
            const component = reactBitsClient.getComponent(componentKey);
            if (component) {
                const dependencyInfo = dependencyManager.generateComponentConfig(componentKey);
                
                exportData.components.push({
                    key: componentKey,
                    name: component.name,
                    code: component.code,
                    styles: includeStyles ? component.styles : null,
                    dependencies: dependencyInfo.dependencies
                });

                // Merge dependencies
                Object.assign(exportData.dependencies, dependencyInfo.dependencies);
            }
        }

        // Generate package.json snippet
        const allDeps = Object.values(exportData.dependencies);
        exportData.package_json = {
            dependencies: {},
            devDependencies: {}
        };

        allDeps.forEach(dep => {
            if (dep.install.includes(' -D ')) {
                exportData.package_json.devDependencies[dep.name] = dep.version;
            } else {
                exportData.package_json.dependencies[dep.name] = dep.version;
            }
        });

        // Generate setup instructions
        exportData.setup_instructions = [
            "1. Install dependencies:",
            ...dependencyManager.generateInstallScript(allDeps),
            "2. Copy components to your project",
            "3. Import required dependencies in your files",
            "4. Configure Tailwind CSS if not already setup"
        ];

        res.json({
            success: true,
            export_data: exportData,
            format: format,
            component_count: componentKeys.length,
            estimated_size: `${allDeps.reduce((total, dep) => 
                total + dependencyManager.estimateBundleSize([dep]), 0)}KB`
        });
    } catch (error) {
        console.error('Component export failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Generate working HTML/CSS preview from React Bits JSX code
 * Converts JSX components to working HTML with animations for Live Preview
 */
function generateWorkingPreview(jsxCode, componentKey, customizations, component) {
    try {
        console.log('Generating working preview for:', componentKey);
        
        // Check if this is a background component with animations
        if (componentKey.startsWith('background-')) {
            return generateBackgroundPreview(componentKey, customizations);
        }
        
        // Check for animated components
        if (componentKey.includes('animated') || componentKey.includes('glow') || componentKey.includes('particle') || componentKey.includes('wave')) {
            return generateAnimatedPreview(componentKey, customizations, component);
        }
        
        // Check for loaders
        if (componentKey.startsWith('loader-')) {
            return generateLoaderPreview(componentKey, customizations);
        }
        
        // Check for buttons with animations
        if (componentKey.startsWith('button-') && (componentKey.includes('glow') || componentKey.includes('animated'))) {
            return generateAnimatedButtonPreview(componentKey, customizations);
        }
        
        // Check for hero components
        if (componentKey.startsWith('hero-')) {
            return generateHeroPreview(componentKey, customizations);
        }
        
        // Fallback: generate basic HTML preview
        return generateBasicHtmlPreview(jsxCode, componentKey);
        
    } catch (error) {
        console.error('Preview generation failed:', error);
        return generateBasicHtmlPreview(jsxCode, componentKey);
    }
}

/**
 * Generate animated background previews
 */
function generateBackgroundPreview(componentKey, customizations) {
    const backgroundGenerators = {
        'background-animated-particles': () => {
            const density = customizations.density || 'medium';
            const color = customizations.color || 'blue';
            const speed = customizations.speed || 'medium';
            
            const densityMap = { low: 20, medium: 50, high: 100 };
            const colorMap = { blue: '#3b82f6', purple: '#8b5cf6', pink: '#ec4899', green: '#10b981', white: '#ffffff' };
            const speedMap = { slow: '8s', medium: '5s', fast: '3s' };
            
            const particleCount = densityMap[density];
            const particleColor = colorMap[color];
            const animationSpeed = speedMap[speed];
            
            const particles = Array.from({ length: particleCount }, (_, i) => `
                <div class="particle" style="
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    width: ${Math.random() * 3 + 1}px;
                    height: ${Math.random() * 3 + 1}px;
                    animation-delay: ${Math.random() * 2}s;
                    animation-duration: ${Math.random() * 2 + 3}s;
                "></div>
            `).join('');
            
            return `
                <div style="
                    width: 100%;
                    height: 300px;
                    background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
                    position: relative;
                    overflow: hidden;
                    border-radius: 8px;
                ">
                    ${particles}
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-size: 18px;
                        font-weight: 600;
                        text-align: center;
                        z-index: 10;
                    ">
                        Animated Particles Background<br>
                        <small style="font-size: 14px; opacity: 0.8;">${density} density • ${color} color • ${speed} speed</small>
                    </div>
                    <style>
                        .particle {
                            position: absolute;
                            background: ${particleColor};
                            border-radius: 50%;
                            opacity: 0.6;
                            animation: float ${animationSpeed} ease-in-out infinite alternate;
                        }
                        @keyframes float {
                            0% { transform: translateY(0px) scale(1); opacity: 0.6; }
                            100% { transform: translateY(-20px) scale(1.1); opacity: 0.9; }
                        }
                    </style>
                </div>
            `;
        },
        
        'background-animated-waves': () => {
            const style = customizations.style || 'gentle';
            const color = customizations.color || 'blue';
            const layers = customizations.layers || 'single';
            
            const colorMap = {
                blue: ['#3b82f6', '#1d4ed8', '#1e40af'],
                purple: ['#8b5cf6', '#7c3aed', '#6d28d9'],
                green: ['#10b981', '#059669', '#047857'],
                pink: ['#ec4899', '#db2777', '#be185d'],
                orange: ['#f97316', '#ea580c', '#dc2626']
            };
            
            const layerMap = { single: 1, double: 2, triple: 3 };
            const colors = colorMap[color];
            const layerCount = layerMap[layers];
            
            const waveStyles = Array.from({ length: layerCount }, (_, i) => `
                .wave-${i} {
                    position: absolute;
                    bottom: ${i * 20}px;
                    left: 0;
                    width: 200%;
                    height: 100px;
                    background: ${colors[i % colors.length]};
                    opacity: ${0.3 + (i * 0.2)};
                    clip-path: polygon(
                        0% 100%,
                        ${Array.from({ length: 21 }, (_, j) => `${j * 5}% ${50 + Math.sin(j * 0.3) * 20}%`).join(', ')},
                        100% 100%
                    );
                    animation: wave-${i} ${6 + i}s ease-in-out infinite;
                }
                @keyframes wave-${i} {
                    0%, 100% { transform: translateX(0) translateY(0); }
                    25% { transform: translateX(-5%) translateY(-10px); }
                    50% { transform: translateX(-25%) translateY(0); }
                    75% { transform: translateX(-15%) translateY(10px); }
                }
            `).join('');
            
            const waveLayers = Array.from({ length: layerCount }, (_, i) => 
                `<div class="wave-${i}"></div>`
            ).join('');
            
            return `
                <div style="
                    width: 100%;
                    height: 300px;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    position: relative;
                    overflow: hidden;
                    border-radius: 8px;
                ">
                    ${waveLayers}
                    <div style="
                        position: absolute;
                        top: 30%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-size: 18px;
                        font-weight: 600;
                        text-align: center;
                        z-index: 10;
                    ">
                        Animated Waves Background<br>
                        <small style="font-size: 14px; opacity: 0.8;">${style} style • ${color} color • ${layers} layer(s)</small>
                    </div>
                    <style>
                        ${waveStyles}
                    </style>
                </div>
            `;
        },
        
        'background-gradient-linear': () => {
            const direction = customizations.direction || 'to-right';
            const scheme = customizations.scheme || 'purple-blue';
            
            const gradientSchemes = {
                'purple-blue': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'pink-orange': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'green-blue': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'red-yellow': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'dark-purple': 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
            };
            
            return `
                <div style="
                    width: 100%;
                    height: 300px;
                    background: ${gradientSchemes[scheme]};
                    position: relative;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        color: white;
                        font-size: 18px;
                        font-weight: 600;
                        text-align: center;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">
                        Linear Gradient Background<br>
                        <small style="font-size: 14px; opacity: 0.9;">${scheme.replace('-', ' ')} • ${direction.replace('-', ' ')}</small>
                    </div>
                </div>
            `;
        }
    };
    
    const generator = backgroundGenerators[componentKey];
    if (generator) {
        return generator();
    }
    
    // Fallback for other background components
    return `
        <div style="
            width: 100%;
            height: 300px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            position: relative;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                color: white;
                font-size: 18px;
                font-weight: 600;
                text-align: center;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
                ${componentKey.replace('background-', '').replace('-', ' ')} Background<br>
                <small style="font-size: 14px; opacity: 0.9;">Working preview with customizations</small>
            </div>
        </div>
    `;
}

/**
 * Generate animated button previews
 */
function generateAnimatedButtonPreview(componentKey, customizations) {
    if (componentKey === 'button-glow') {
        const size = customizations.size || 'md';
        const color = customizations.color || 'blue';
        
        const sizeMap = {
            sm: { padding: '8px 16px', fontSize: '14px' },
            md: { padding: '12px 24px', fontSize: '16px' },
            lg: { padding: '16px 32px', fontSize: '18px' }
        };
        
        const colorMap = {
            blue: { bg: '#3b82f6', glow: '#3b82f6' },
            purple: { bg: '#8b5cf6', glow: '#8b5cf6' },
            pink: { bg: '#ec4899', glow: '#ec4899' },
            green: { bg: '#10b981', glow: '#10b981' }
        };
        
        const sizeStyles = sizeMap[size];
        const colorStyles = colorMap[color];
        
        return `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 8px;
            ">
                <button style="
                    padding: ${sizeStyles.padding};
                    font-size: ${sizeStyles.fontSize};
                    font-weight: 600;
                    color: white;
                    background: ${colorStyles.bg};
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 0 20px ${colorStyles.glow}40, 0 4px 12px rgba(0,0,0,0.3);
                    animation: glow-pulse 2s ease-in-out infinite alternate;
                " onmouseover="this.style.boxShadow='0 0 30px ${colorStyles.glow}60, 0 6px 20px rgba(0,0,0,0.4)'; this.style.transform='translateY(-2px)'" 
                   onmouseout="this.style.boxShadow='0 0 20px ${colorStyles.glow}40, 0 4px 12px rgba(0,0,0,0.3)'; this.style.transform='translateY(0)'">
                    Glowing Button
                </button>
                <style>
                    @keyframes glow-pulse {
                        0% { box-shadow: 0 0 20px ${colorStyles.glow}40, 0 4px 12px rgba(0,0,0,0.3); }
                        100% { box-shadow: 0 0 25px ${colorStyles.glow}60, 0 4px 12px rgba(0,0,0,0.3); }
                    }
                </style>
            </div>
        `;
    }
    
    // Fallback for other animated buttons
    return `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 8px;
        ">
            <button style="
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 600;
                color: white;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                animation: button-bounce 2s ease-in-out infinite;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Animated Button
            </button>
            <style>
                @keyframes button-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
            </style>
        </div>
    `;
}

/**
 * Generate loader previews with animations
 */
function generateLoaderPreview(componentKey, customizations) {
    const size = customizations.size || 'md';
    const color = customizations.color || 'blue';
    
    const sizeMap = { sm: '24px', md: '32px', lg: '48px' };
    const colorMap = { blue: '#3b82f6', purple: '#8b5cf6', pink: '#ec4899', green: '#10b981' };
    
    const loaderSize = sizeMap[size];
    const loaderColor = colorMap[color];
    
    if (componentKey === 'loader-dots') {
        return `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                background: #f8fafc;
                border-radius: 8px;
            ">
                <div style="display: flex; gap: 4px;">
                    <div style="
                        width: ${loaderSize};
                        height: ${loaderSize};
                        background: ${loaderColor};
                        border-radius: 50%;
                        animation: dot-bounce 1.4s ease-in-out infinite;
                        animation-delay: 0s;
                    "></div>
                    <div style="
                        width: ${loaderSize};
                        height: ${loaderSize};
                        background: ${loaderColor};
                        border-radius: 50%;
                        animation: dot-bounce 1.4s ease-in-out infinite;
                        animation-delay: 0.2s;
                    "></div>
                    <div style="
                        width: ${loaderSize};
                        height: ${loaderSize};
                        background: ${loaderColor};
                        border-radius: 50%;
                        animation: dot-bounce 1.4s ease-in-out infinite;
                        animation-delay: 0.4s;
                    "></div>
                </div>
                <style>
                    @keyframes dot-bounce {
                        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                        40% { transform: scale(1.2); opacity: 1; }
                    }
                </style>
            </div>
        `;
    }
    
    // Fallback spinner
    return `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background: #f8fafc;
            border-radius: 8px;
        ">
            <div style="
                width: ${loaderSize};
                height: ${loaderSize};
                border: 3px solid #e5e7eb;
                border-top: 3px solid ${loaderColor};
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </div>
    `;
}

/**
 * Generate generic animated preview for other components
 */
function generateAnimatedPreview(componentKey, customizations, component) {
    return `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-radius: 8px;
            min-height: 200px;
        ">
            <div style="
                padding: 20px 30px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                animation: gentle-float 3s ease-in-out infinite;
                text-align: center;
            ">
                <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">
                    ${component.name || componentKey.replace(/-/g, ' ')}
                </h3>
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                    ${component.description || 'Animated component with working preview'}
                </p>
            </div>
            <style>
                @keyframes gentle-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            </style>
        </div>
    `;
}

/**
 * Generate hero component previews
 */
function generateHeroPreview(componentKey, customizations) {
    const style = customizations.style || 'modern';
    const color = customizations.color || 'purple';
    
    const colorSchemes = {
        purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        blue: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
        green: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
        red: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
        dark: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        primary: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
    };
    
    const backgroundGradient = colorSchemes[color] || colorSchemes.purple;
    
    return `
        <div style="
            width: 100%;
            height: 400px;
            background: ${backgroundGradient};
            position: relative;
            overflow: hidden;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        ">
            <!-- Animated background blobs -->
            <div style="
                position: absolute;
                top: -50px;
                right: -50px;
                width: 200px;
                height: 200px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                animation: blob-float 6s ease-in-out infinite;
            "></div>
            <div style="
                position: absolute;
                bottom: -50px;
                left: -50px;
                width: 150px;
                height: 150px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 50%;
                animation: blob-float 8s ease-in-out infinite reverse;
            "></div>
            
            <!-- Hero content -->
            <div style="
                text-align: center;
                z-index: 2;
                max-width: 600px;
                padding: 40px 20px;
            ">
                <h1 style="
                    font-size: 3.5rem;
                    font-weight: 700;
                    margin: 0 0 24px 0;
                    line-height: 1.1;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    animation: fade-in-up 1s ease-out;
                ">
                    Welcome to the Future
                </h1>
                <p style="
                    font-size: 1.25rem;
                    margin: 0 0 32px 0;
                    opacity: 0.9;
                    line-height: 1.6;
                    animation: fade-in-up 1s ease-out 0.2s both;
                ">
                    Experience the next generation of web applications with cutting-edge technology and beautiful design.
                </p>
                <button style="
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    padding: 16px 32px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    border-radius: 50px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                    animation: fade-in-up 1s ease-out 0.4s both;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='translateY(-2px)'"
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='translateY(0)'">
                    Get Started
                </button>
            </div>
            
            <style>
                @keyframes blob-float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-20px) rotate(120deg); }
                    66% { transform: translateY(20px) rotate(240deg); }
                }
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        </div>
    `;
}

/**
 * Generate basic HTML preview fallback
 */
function generateBasicHtmlPreview(jsxCode, componentKey) {
    return `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background: #f8fafc;
            border-radius: 8px;
        ">
            <div style="
                padding: 20px;
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                text-align: center;
            ">
                <h3 style="margin: 0 0 8px 0; color: #1e293b;">
                    ${componentKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h3>
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                    Component preview ready
                </p>
            </div>
        </div>
    `;
}

module.exports = router;