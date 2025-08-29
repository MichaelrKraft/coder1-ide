/**
 * Magic AI Component Generation API - Enhanced Version
 * Handles AI-powered React component generation requests with enhanced capabilities
 */

const express = require('express');
const router = express.Router();

// Enhanced Magic Feature Flags - Safe rollback system
const MAGIC_ENHANCEMENTS = {
    useEnhancedOpenAI: process.env.ENABLE_ENHANCED_OPENAI !== 'false', // Default ON for better results
    useEnhancedClaude: process.env.ENABLE_ENHANCED_CLAUDE !== 'false',  // Default ON for better results
    useMultipleVariations: process.env.ENABLE_VARIATIONS !== 'false',   // Default ON for user choice
    useStructuredOutputs: process.env.ENABLE_STRUCTURED_OUTPUTS !== 'false', // Default ON for quality
    useComponentTemplates: process.env.ENABLE_COMPONENT_TEMPLATES !== 'false', // Default ON for variety
    usePureCodeBackup: process.env.ENABLE_PURECODE !== 'false' // Default ON for advanced fallback
};

console.log('🎯 Magic API: Enhanced features enabled:', {
    enhancedOpenAI: MAGIC_ENHANCEMENTS.useEnhancedOpenAI,
    enhancedClaude: MAGIC_ENHANCEMENTS.useEnhancedClaude,
    multipleVariations: MAGIC_ENHANCEMENTS.useMultipleVariations,
    structuredOutputs: MAGIC_ENHANCEMENTS.useStructuredOutputs,
    componentTemplates: MAGIC_ENHANCEMENTS.useComponentTemplates,
    pureCodeBackup: MAGIC_ENHANCEMENTS.usePureCodeBackup
});

// Import clients with safe fallbacks
let ReactBitsClient, getMagicClient, getPureCodeClient;

try {
    const { ReactBitsClient: RBClient } = require('../integrations/react-bits-client');
    ReactBitsClient = RBClient;
} catch (error) {
    console.log('🔧 Magic API: React Bits client not available, continuing without it');
}

try {
    const magic21st = require('../integrations/21st-magic-client');
    getMagicClient = magic21st.getMagicClient;
} catch (error) {
    console.log('🔧 Magic API: 21st Magic client not available, continuing without it');
}

try {
    const purecode = require('../integrations/purecode-client');
    getPureCodeClient = purecode.getPureCodeClient;
} catch (error) {
    console.log('🔧 Magic API: PureCode client not available, continuing without it');
}

// Initialize React Bits client
let reactBitsClient;
if (ReactBitsClient) {
    try {
        reactBitsClient = new ReactBitsClient();
        console.log('✅ Magic API: React Bits client initialized');
    } catch (error) {
        console.error('❌ Magic API: Failed to initialize React Bits client:', error);
    }
}

// Initialize 21st.dev Magic client if API key is available
let magic21stClient = null;
const initMagic21st = async () => {
    if (process.env.MAGIC_21ST_API_KEY && getMagicClient) {
        try {
            magic21stClient = getMagicClient();
            await magic21stClient.initialize();
            console.log('✅ Magic API: 21st.dev Magic client initialized');
        } catch (error) {
            console.error('❌ Magic API: Failed to initialize 21st.dev Magic client:', error);
            magic21stClient = null;
        }
    } else {
        console.log('ℹ️ Magic API: 21st.dev API key not configured, using local components only');
    }
};

// Initialize on startup
initMagic21st();

/**
 * Generate React component using AI
 * POST /api/magic/generate
 */
router.post('/generate', async (req, res) => {
    try {
        const { prompt, searchQuery, currentFile } = req.body;
    
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        console.log('🪄 Magic API: Generating component for prompt:', prompt);

        // Determine component source strategy
        const componentSource = process.env.REACT_APP_COMPONENT_SOURCE || 'local';
    
        // Try PureCode.ai FIRST for better component generation
        if (MAGIC_ENHANCEMENTS.usePureCodeBackup && (componentSource === 'local' || componentSource === 'hybrid')) {
            try {
                console.log('🎨 Trying PureCode.ai advanced generation FIRST...');
                if (getPureCodeClient) {
                    const pureCodeClient = getPureCodeClient();
                    const pureCodeComponent = await pureCodeClient.generateComponent(prompt, {
                        searchQuery,
                        currentFile
                    });
        
                    if (pureCodeComponent.success) {
                        console.log('✨ Successfully generated with PureCode.ai');
                        console.log('   Component type:', pureCodeComponent.metadata?.componentType);
                        console.log('   Styling:', pureCodeComponent.metadata?.styling);
                        return res.json({
                            success: true,
                            code: pureCodeComponent.code,
                            name: pureCodeComponent.name,
                            explanation: pureCodeComponent.explanation,
                            source: 'PureCode.ai',
                            metadata: pureCodeComponent.metadata
                        });
                    }
                }
            } catch (pureCodeError) {
                console.error('❌ PureCode.ai generation failed:', pureCodeError);
            }
        }
    
        // Try 21st.dev Magic second (disabled by default due to browser redirect issues)
        if (false && (componentSource === '21st' || componentSource === 'hybrid') && magic21stClient && magic21stClient.isReady()) {
            try {
                console.log('🎯 Trying 21st.dev Magic for component generation...');
                console.log('   Component source:', componentSource);
                console.log('   Magic client ready:', magic21stClient.isReady());
                console.log('   Prompt:', prompt);
        
                const magic21stComponent = await magic21stClient.createUiComponent({
                    message: prompt,
                    searchQuery: searchQuery || prompt,
                    currentFilePath: currentFile || '/src/components/NewComponent.tsx',
                    projectDirectory: process.cwd()
                });
        
                if (magic21stComponent.success) {
                    console.log('✨ Successfully generated with 21st.dev Magic');
                    console.log('   Component name:', magic21stComponent.name);
                    console.log('   Source:', magic21stComponent.metadata?.source);
                    return res.json({
                        success: true,
                        code: magic21stComponent.componentCode,
                        name: magic21stComponent.name,
                        explanation: magic21stComponent.explanation,
                        source: '21st.dev Magic',
                        metadata: magic21stComponent.metadata
                    });
                }
            } catch (magic21stError) {
                console.error('❌ 21st.dev Magic generation failed:', magic21stError);
                console.error('   Error stack:', magic21stError.stack);
            }
        } else {
            console.log('⚠️ Skipping 21st.dev Magic:');
            console.log('   Component source:', componentSource);
            console.log('   Magic client exists:', !!magic21stClient);
            console.log('   Magic client ready:', magic21stClient?.isReady() || false);
        }

        // If not using 21st or it failed, try local methods
        if (componentSource === 'local' || componentSource === 'hybrid') {
            // Try to find a matching React Bits component
            if (reactBitsClient) {
                const matchedComponent = findBestReactBitsComponent(prompt);
        
                if (matchedComponent) {
                    console.log('✨ Found React Bits component:', matchedComponent.name);
          
                    return res.json({
                        success: true,
                        code: matchedComponent.code,
                        name: matchedComponent.name,
                        explanation: `Generated from React Bits library: ${matchedComponent.description}`,
                        source: 'React Bits Library'
                    });
                }
            }

            // Try AI generation with Claude/OpenAI
            const aiComponent = await generateWithAI(prompt);
      
            if (aiComponent) {
                return res.json({
                    success: true,
                    code: aiComponent.code,
                    name: aiComponent.name,
                    explanation: aiComponent.explanation,
                    source: 'AI Generation'
                });
            }

            // PureCode.ai already tried as primary, skip here
        }

        // Fallback to template-based generation
        const fallbackComponent = generateFallbackComponent(prompt);
    
        res.json({
            success: true,
            code: fallbackComponent.code,
            name: fallbackComponent.name,
            explanation: 'Generated from template',
            source: 'Template Engine'
        });

    } catch (error) {
        console.error('Magic API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate component'
        });
    }
});

/**
 * Generate multiple component variations
 * POST /api/magic/generate-variations
 */
router.post('/generate-variations', async (req, res) => {
    try {
        const { prompt, searchQuery, currentFile, count = 3 } = req.body;
    
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        if (!MAGIC_ENHANCEMENTS.useMultipleVariations) {
            // Fall back to single generation if feature disabled
            return router.post('/generate')(req, res);
        }

        console.log(`🎨 Magic API: Generating ${count} variations for prompt:`, prompt);

        const variations = [];
        const maxVariations = Math.min(count, 5); // Limit to 5 variations max

        // Generate multiple variations using different approaches
        for (let i = 0; i < maxVariations; i++) {
            try {
                console.log(`🎭 Magic API: Generating variation ${i + 1}/${maxVariations}...`);
        
                let variation = null;
        
                // Try different AI services for variety
                // DISABLED: Direct Anthropic SDK usage to prevent API charges
                // Use Claude Code CLI only to utilize Claude Code Max account
                if (process.env.OPENAI_API_KEY && MAGIC_ENHANCEMENTS.useEnhancedOpenAI) {
                    // Use OpenAI for variations since Claude is disabled
                    variation = await generateWithEnhancedOpenAI(prompt, process.env.OPENAI_API_KEY);
                } else {
                    // Fallback to enhanced template with variation
                    variation = generateFallbackComponentWithVariation(prompt, i);
                }

                if (variation) {
                    variations.push({
                        id: i + 1,
                        ...variation,
                        variationIndex: i,
                        generatedAt: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.warn(`⚠️ Magic API: Variation ${i + 1} failed:`, error.message);
        
                // Add fallback variation
                const fallback = generateFallbackComponentWithVariation(prompt, i);
                variations.push({
                    id: i + 1,
                    ...fallback,
                    variationIndex: i,
                    generatedAt: new Date().toISOString(),
                    note: 'Fallback variation due to AI service error'
                });
            }
        }

        if (variations.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate any variations'
            });
        }

        res.json({
            success: true,
            variations,
            total: variations.length,
            prompt: prompt,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Magic API variations error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate component variations'
        });
    }
});

/**
 * Get available React Bits components
 * GET /api/magic/components
 */
router.get('/components', (req, res) => {
    try {
        if (!reactBitsClient) {
            return res.json({
                success: true,
                components: [],
                categories: {}
            });
        }

        const components = Object.entries(reactBitsClient.components || {}).map(([key, comp]) => ({
            id: key,
            name: comp.name,
            category: comp.category,
            description: comp.description,
            tags: comp.tags || []
        }));

        const categories = reactBitsClient.categories || {};

        res.json({
            success: true,
            components,
            categories,
            total: components.length
        });

    } catch (error) {
        console.error('Magic API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Search for logos
 * POST /api/magic/search-logos
 */
router.post('/search-logos', async (req, res) => {
    try {
        const { query } = req.body;
    
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        // Mock logo search results
        const logos = [
            { name: 'React Logo', url: '/logos/react.svg', category: 'framework' },
            { name: 'Node.js Logo', url: '/logos/nodejs.svg', category: 'backend' },
            { name: 'TypeScript Logo', url: '/logos/typescript.svg', category: 'language' }
        ].filter(logo => 
            logo.name.toLowerCase().includes(query.toLowerCase()) ||
      logo.category.toLowerCase().includes(query.toLowerCase())
        );

        res.json({
            success: true,
            logos,
            total: logos.length
        });

    } catch (error) {
        console.error('Magic API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Find best matching React Bits component
 */
function findBestReactBitsComponent(prompt) {
    if (!reactBitsClient || !reactBitsClient.components) {
        return null;
    }

    const keywords = prompt.toLowerCase().split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;

    Object.entries(reactBitsClient.components).forEach(([key, component]) => {
        let score = 0;
    
        // Check component name
        if (component.name && component.name.toLowerCase().includes(prompt.toLowerCase())) {
            score += 5;
        }
    
        // Check tags
        if (component.tags) {
            component.tags.forEach(tag => {
                if (keywords.includes(tag.toLowerCase())) score += 2;
                if (prompt.toLowerCase().includes(tag.toLowerCase())) score += 1;
            });
        }
    
        // Check description
        if (component.description && component.description.toLowerCase().includes(prompt.toLowerCase())) {
            score += 1;
        }
    
        if (score > bestScore) {
            bestScore = score;
            bestMatch = component;
        }
    });

    return bestMatch;
}

/**
 * Generate component using AI (Claude/OpenAI) - Enhanced Version
 */
async function generateWithAI(prompt) {
    try {
        // DISABLED: Direct Anthropic SDK usage to prevent API charges
        // Use Claude Code CLI only to utilize Claude Code Max account
        console.log('🚀 Magic: Claude generation disabled - using Claude Code CLI only');

        // Check if we have OpenAI integration available
        const openAIKey = process.env.OPENAI_API_KEY;
    
        if (openAIKey) {
            // Try enhanced OpenAI first if feature flag is enabled
            if (MAGIC_ENHANCEMENTS.useEnhancedOpenAI) {
                try {
                    console.log('🚀 Magic: Trying enhanced OpenAI generation...');
                    const response = await generateWithEnhancedOpenAI(prompt, openAIKey);
                    if (response) {
                        console.log('✅ Magic: Enhanced OpenAI generation successful');
                        return response;
                    }
                } catch (error) {
                    console.warn('⚠️ Magic: Enhanced OpenAI failed, falling back to standard:', error.message);
                }
            }
      
            // Fallback to original OpenAI
            const response = await generateWithOpenAI(prompt, openAIKey);
            if (response) return response;
        }

        return null;
    } catch (error) {
        console.error('AI generation failed:', error);
        return null;
    }
}

/**
 * Generate component using Claude API
 */
async function generateWithClaude(prompt, apiKey) {
    // DISABLED: Direct Anthropic SDK usage to prevent API charges
    // Use Claude Code CLI only to utilize Claude Code Max account
    console.log('Claude generation disabled - using Claude Code CLI only');
    return null;
}

/**
 * Generate component using OpenAI API
 */
async function generateWithOpenAI(prompt, apiKey) {
    try {
        const { Configuration, OpenAIApi } = require('openai');
        const configuration = new Configuration({ apiKey });
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [{
                role: 'system',
                content: 'You are a React component generator. Generate clean, modern React components using TypeScript and Tailwind CSS.'
            }, {
                role: 'user',
                content: `Generate a React component based on this description: "${prompt}". Return only the component code.`
            }],
            max_tokens: 2048,
            temperature: 0.7
        });

        const code = response.data.choices[0].message.content;
        const componentName = extractComponentName(code) || 'GeneratedComponent';

        return {
            code,
            name: componentName,
            explanation: `AI-generated React component based on: ${prompt}`
        };
    } catch (error) {
        console.error('OpenAI generation failed:', error);
        return null;
    }
}

/**
 * Extract component name from code
 */
function extractComponentName(code) {
    const match = code.match(/(?:const|function|class)\s+(\w+)/);
    return match ? match[1] : null;
}

/**
 * Enhanced OpenAI generation with structured outputs and better prompts
 */
async function generateWithEnhancedOpenAI(prompt, apiKey) {
    try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        // Analyze prompt to determine component type
        const componentType = analyzeComponentType(prompt);
        const enhancedPrompt = buildEnhancedPrompt(prompt, componentType);

        console.log('🧠 Enhanced OpenAI: Component type detected:', componentType);

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert React TypeScript component architect. Generate production-ready components with:
- Modern TypeScript interfaces and types
- Tailwind CSS for styling with professional design patterns
- Responsive design considerations
- Accessibility features (ARIA labels, semantic HTML)
- Clean, maintainable code structure
- Proper prop validation and defaults
- Modern React hooks and patterns

Component Type: ${componentType}
Focus on creating visually appealing, professional components that follow modern UI/UX principles.`
                },
                {
                    role: 'user',
                    content: enhancedPrompt
                }
            ],
            max_tokens: 3000,
            temperature: 0.3, // Lower temperature for more consistent, professional output
        });

        const code = response.choices[0].message.content;
        const componentName = extractComponentName(code) || generateComponentName(prompt);

        return {
            code,
            name: componentName,
            explanation: `Enhanced AI-generated ${componentType} component: ${componentName}`,
            metadata: {
                source: 'Enhanced OpenAI GPT-4',
                componentType,
                quality: 'professional'
            }
        };
    } catch (error) {
        console.error('Enhanced OpenAI generation failed:', error);
        throw error;
    }
}

/**
 * Enhanced Claude generation with component-specific prompts
 */
async function generateWithEnhancedClaude(prompt, apiKey) {
    // DISABLED: Direct Anthropic SDK usage to prevent API charges
    // Use Claude Code CLI only to utilize Claude Code Max account
    console.log('Enhanced Claude generation disabled - using Claude Code CLI only');
    throw new Error('Claude generation disabled to prevent API charges');
}

/**
 * Analyze prompt to determine component type and requirements
 */
function analyzeComponentType(prompt) {
    const lowerPrompt = prompt.toLowerCase();
  
    if (/pricing|price|plan|tier|subscription|billing/i.test(prompt)) return 'pricing-table';
    if (/button|btn|cta|call.to.action/i.test(prompt)) return 'button';
    if (/card|panel|container/i.test(prompt)) return 'card';
    if (/form|input|login|signup|register|contact/i.test(prompt)) return 'form';
    if (/hero|landing|banner|header|jumbotron/i.test(prompt)) return 'hero-section';
    if (/nav|navigation|navbar|menu/i.test(prompt)) return 'navigation';
    if (/table|list|data|grid/i.test(prompt)) return 'data-display';
    if (/modal|popup|dialog|overlay/i.test(prompt)) return 'modal';
    if (/sidebar|drawer|panel/i.test(prompt)) return 'sidebar';
    if (/footer|bottom/i.test(prompt)) return 'footer';
    if (/carousel|slider|gallery/i.test(prompt)) return 'carousel';
    if (/chart|graph|visualization/i.test(prompt)) return 'data-visualization';
  
    return 'custom-component';
}

/**
 * Build enhanced prompt based on component type and user requirements
 */
function buildEnhancedPrompt(originalPrompt, componentType) {
    const templates = {
        'pricing-table': `Create a modern pricing table component based on: "${originalPrompt}"
    
Include:
- Multiple pricing tiers (Starter, Professional, Enterprise typical)
- Feature comparison with checkmarks
- Highlighted "recommended" tier
- Professional gradient backgrounds
- Hover effects and animations
- Mobile-responsive design
- Call-to-action buttons for each tier
- Badge for popular/recommended plans`,

        'button': `Create a sophisticated button component based on: "${originalPrompt}"
    
Include:
- Multiple variants (primary, secondary, outline, ghost)
- Size variations (sm, md, lg, xl)
- Loading states and disabled states
- Hover animations and micro-interactions
- Icon support (left/right positioning)
- Gradient backgrounds and shadow effects
- Professional color schemes`,

        'card': `Create an elegant card component based on: "${originalPrompt}"
    
Include:
- Header with title and optional subtitle
- Content area with proper typography
- Footer with actions or metadata
- Subtle shadows and border radius
- Hover effects and transitions
- Optional image/media support
- Responsive design patterns`,

        'form': `Create a professional form component based on: "${originalPrompt}"
    
Include:
- Proper form validation and error states
- Floating labels or modern label design
- Input focus states and transitions
- Submit button with loading state
- Success/error feedback
- Responsive layout
- Accessibility features (ARIA labels)`,

        'hero-section': `Create a stunning hero section based on: "${originalPrompt}"
    
Include:
- Compelling headline and subheading
- Call-to-action button(s)
- Background gradient or image support
- Responsive typography scaling
- Smooth animations on scroll/load
- Professional spacing and layout
- Mobile-optimized design`,

        'navigation': `Create a modern navigation component based on: "${originalPrompt}"
    
Include:
- Mobile hamburger menu
- Dropdown/submenu support
- Active state indicators
- Smooth hover effects
- Logo/brand area
- Responsive design
- Accessibility navigation`,

        'custom-component': `Create a custom component based on: "${originalPrompt}"
    
Include:
- Professional design patterns
- Responsive layout
- Interactive elements where appropriate
- Modern styling with Tailwind CSS
- TypeScript interfaces
- Accessibility considerations`
    };

    return templates[componentType] || templates['custom-component'];
}

/**
 * Generate fallback component from template
 */
function generateFallbackComponent(prompt) {
    const componentName = generateComponentName(prompt);
  
    // Determine component type based on keywords
    const isButton = /button|btn|click/i.test(prompt);
    const isCard = /card|panel|container/i.test(prompt);
    const isForm = /form|input|login|signup/i.test(prompt);
    const isHero = /hero|landing|header|banner/i.test(prompt);
    const isNav = /nav|menu|navigation|navbar/i.test(prompt);
    const isPricing = /pricing|price|plan|tier|subscription|billing|cost/i.test(prompt);
  
    let code = '';
  
    if (isPricing) {
        code = generatePricingTemplate(componentName, prompt);
    } else if (isButton) {
        code = generateButtonTemplate(componentName, prompt);
    } else if (isCard) {
        code = generateCardTemplate(componentName, prompt);
    } else if (isForm) {
        code = generateFormTemplate(componentName, prompt);
    } else if (isHero) {
        code = generateHeroTemplate(componentName, prompt);
    } else if (isNav) {
        code = generateNavTemplate(componentName, prompt);
    } else {
        code = generateDefaultTemplate(componentName, prompt);
    }
  
    return {
        code,
        name: componentName,
        explanation: `Template-based component for: ${prompt}`
    };
}

/**
 * Generate component name from prompt
 */
function generateComponentName(prompt) {
    return prompt
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')
        .replace(/^./, match => match.toUpperCase()) || 'CustomComponent';
}

/**
 * Template generators
 */
function generateButtonTemplate(name, description) {
    return `import React from 'react';

interface ${name}Props {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  children = "Click Me",
  onClick,
  variant = 'primary',
  size = 'md',
  className = ""
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      className={\`\${variants[variant]} \${sizes[size]} font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl \${className}\`}
    >
      {children}
    </button>
  );
};

export default ${name};`;
}

function generateCardTemplate(name, description) {
    return `import React from 'react';

interface ${name}Props {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  image?: string;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  title,
  subtitle,
  children,
  image,
  className = ""
}) => {
  return (
    <div className={\`bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden \${className}\`}>
      {image && (
        <img src={image} alt={title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        {title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-600 mb-4">{subtitle}</p>
        )}
        <div className="text-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ${name};`;
}

function generateFormTemplate(name, description) {
    return `import React, { useState } from 'react';

interface ${name}Props {
  onSubmit?: (data: any) => void;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  onSubmit,
  className = ""
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className={\`w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl \${className}\`}>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Sign In</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-medium mb-2">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          required
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-medium mb-2">
          Password
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          required
        />
      </div>
      
      <button 
        type="submit"
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
      >
        Sign In
      </button>
    </form>
  );
};

export default ${name};`;
}

function generatePricingTemplate(name, description) {
    return `import React from 'react';

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  ctaText?: string;
}

interface ${name}Props {
  tiers?: PricingTier[];
  onSelectPlan?: (tier: PricingTier) => void;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  tiers = [
    {
      name: 'Starter',
      price: '$9',
      period: '/month',
      features: [
        '✓ 10 Projects',
        '✓ Basic Support',
        '✓ 1GB Storage',
        '✓ API Access'
      ],
      ctaText: 'Start Free Trial'
    },
    {
      name: 'Professional',
      price: '$29',
      period: '/month',
      features: [
        '✓ Unlimited Projects',
        '✓ Priority Support',
        '✓ 10GB Storage',
        '✓ Advanced API Access',
        '✓ Custom Integrations',
        '✓ Analytics Dashboard'
      ],
      highlighted: true,
      ctaText: 'Get Started'
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: '/month',
      features: [
        '✓ Everything in Pro',
        '✓ Dedicated Support',
        '✓ Unlimited Storage',
        '✓ Custom Features',
        '✓ SLA Guarantee',
        '✓ Advanced Security'
      ],
      ctaText: 'Contact Sales'
    }
  ],
  onSelectPlan,
  className = ""
}) => {
  return (
    <div className={\`py-12 px-6 \${className}\`}>
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-xl text-gray-600">Start free, upgrade when you need</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {tiers.map((tier, index) => (
          <div 
            key={index}
            className={\`relative rounded-2xl p-8 \${
              tier.highlighted 
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-2xl scale-105' 
                : 'bg-white border-2 border-gray-200 hover:border-purple-400'
            } transition-all duration-300\`}
          >
            {tier.highlighted && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-purple-900 px-4 py-1 rounded-full text-sm font-bold">
                  MOST POPULAR
                </span>
              </div>
            )}
            
            <div className="mb-8">
              <h3 className={\`text-2xl font-bold mb-4 \${tier.highlighted ? 'text-white' : 'text-gray-900'}\`}>
                {tier.name}
              </h3>
              <div className="flex items-baseline">
                <span className={\`text-5xl font-bold \${tier.highlighted ? 'text-white' : 'text-gray-900'}\`}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span className={\`ml-2 \${tier.highlighted ? 'text-white/80' : 'text-gray-600'}\`}>
                    {tier.period}
                  </span>
                )}
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              {tier.features.map((feature, featureIndex) => (
                <li 
                  key={featureIndex} 
                  className={\`\${tier.highlighted ? 'text-white/90' : 'text-gray-700'}\`}
                >
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => onSelectPlan?.(tier)}
              className={\`w-full py-3 px-6 rounded-lg font-bold transition-all duration-300 \${
                tier.highlighted
                  ? 'bg-white text-purple-600 hover:bg-gray-100'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
              }\`}
            >
              {tier.ctaText || 'Select Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ${name};`;
}

function generateHeroTemplate(name, description) {
    return `import React from 'react';

interface ${name}Props {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  title = "Welcome to Our Platform",
  subtitle = "Build amazing things with modern technology",
  ctaText = "Get Started",
  onCtaClick,
  className = ""
}) => {
  return (
    <section className={\`relative min-h-screen flex items-center justify-center overflow-hidden \${className}\`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400"></div>
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8">
          {subtitle}
        </p>
        <button 
          onClick={onCtaClick}
          className="px-8 py-4 bg-white text-purple-600 font-bold rounded-full text-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          {ctaText}
        </button>
      </div>
    </section>
  );
};

export default ${name};`;
}

function generateNavTemplate(name, description) {
    return `import React, { useState } from 'react';

interface NavLink {
  label: string;
  href: string;
}

interface ${name}Props {
  logo?: string;
  links?: NavLink[];
  onLinkClick?: (link: NavLink) => void;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  logo = "Logo",
  links = [],
  onLinkClick,
  className = ""
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <nav className={\`fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 \${className}\`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-gray-900">{logo}</div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    onLinkClick?.(link);
                  }}
                  className="px-3 py-2 text-gray-700 hover:text-purple-600 font-medium transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-purple-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ${name};`;
}

function generateDefaultTemplate(name, description) {
    return `import React from 'react';

interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

const ${name}: React.FC<${name}Props> = ({ 
  className = "",
  children 
}) => {
  return (
    <div className={\`p-6 bg-gray-50 border border-gray-200 rounded-lg \${className}\`}>
      {children || (
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ${name}
          </h3>
          <p className="text-gray-600">
            ${description}
          </p>
        </div>
      )}
    </div>
  );
};

export default ${name};`;
}

/**
 * Generate fallback component variation with different styling approaches
 */
function generateFallbackComponentWithVariation(prompt, variationIndex) {
    const componentName = generateComponentName(prompt);
    const componentType = analyzeComponentType(prompt);
  
    // Different styling variations
    const variations = {
        0: { theme: 'gradient', description: 'Modern gradient design' },
        1: { theme: 'minimal', description: 'Clean minimal design' },
        2: { theme: 'glassmorphism', description: 'Glass morphism effect' },
        3: { theme: 'neumorphism', description: 'Soft neumorphic design' },
        4: { theme: 'bold', description: 'Bold and vibrant design' }
    };
  
    const variation = variations[variationIndex] || variations[0];
    let code = '';
  
    if (componentType === 'pricing-table') {
        code = generatePricingVariation(componentName, prompt, variation.theme);
    } else if (componentType === 'button') {
        code = generateButtonVariation(componentName, prompt, variation.theme);
    } else if (componentType === 'card') {
        code = generateCardVariation(componentName, prompt, variation.theme);
    } else {
        code = generateDefaultVariation(componentName, prompt, variation.theme);
    }
  
    return {
        code,
        name: componentName,
        explanation: `${variation.description} template variation for: ${prompt}`,
        metadata: {
            source: 'Enhanced Template Generator',
            theme: variation.theme,
            variationType: 'styled-template'
        }
    };
}

/**
 * Generate pricing table with different theme variations
 */
function generatePricingVariation(name, description, theme) {
    const themes = {
        gradient: {
            background: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
            cardBg: 'bg-white/10 backdrop-blur-lg border border-white/20',
            textColor: 'text-white',
            accentColor: 'from-yellow-400 to-orange-500'
        },
        minimal: {
            background: 'bg-gray-50',
            cardBg: 'bg-white border border-gray-100 shadow-sm',
            textColor: 'text-gray-900',
            accentColor: 'from-gray-800 to-gray-900'
        },
        glassmorphism: {
            background: 'bg-gradient-to-br from-blue-400 to-purple-600',
            cardBg: 'bg-white/20 backdrop-blur-lg border border-white/30',
            textColor: 'text-white',
            accentColor: 'from-white to-blue-100'
        },
        neumorphism: {
            background: 'bg-gray-200',
            cardBg: 'bg-gray-200 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]',
            textColor: 'text-gray-800',
            accentColor: 'from-blue-500 to-blue-600'
        },
        bold: {
            background: 'bg-black',
            cardBg: 'bg-gradient-to-br from-red-500 to-pink-600',
            textColor: 'text-white',
            accentColor: 'from-yellow-400 to-red-500'
        }
    };
  
    const themeStyles = themes[theme] || themes.gradient;
  
    return `import React from 'react';

interface PricingTier {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

interface ${name}Props {
  tiers?: PricingTier[];
  onSelectPlan?: (tier: PricingTier) => void;
}

const ${name}: React.FC<${name}Props> = ({ 
  tiers = [
    {
      name: 'Starter',
      price: '$9',
      features: ['✓ 5 Projects', '✓ Basic Support', '✓ 1GB Storage'],
    },
    {
      name: 'Professional',
      price: '$29',
      features: ['✓ Unlimited Projects', '✓ Priority Support', '✓ 10GB Storage', '✓ Analytics'],
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: '$99',
      features: ['✓ Everything in Pro', '✓ Dedicated Support', '✓ Custom Features'],
    }
  ],
  onSelectPlan 
}) => {
  return (
    <div className={\`min-h-screen ${themeStyles.background} py-12 px-6\`}>
      <div className="text-center mb-12">
        <h2 className={\`text-4xl font-bold ${themeStyles.textColor} mb-4\`}>
          Choose Your Plan
        </h2>
        <p className={\`text-xl ${themeStyles.textColor} opacity-80\`}>
          Perfect for teams of all sizes
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {tiers.map((tier, index) => (
          <div 
            key={index}
            className={\`relative ${themeStyles.cardBg} rounded-2xl p-8 transition-all duration-300 hover:scale-105 \${
              tier.highlighted ? 'ring-4 ring-yellow-400/50 scale-105' : ''
            }\`}
          >
            {tier.highlighted && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r ${themeStyles.accentColor} text-black px-4 py-1 rounded-full text-sm font-bold">
                  POPULAR
                </span>
              </div>
            )}
            
            <div className="text-center mb-8">
              <h3 className={\`text-2xl font-bold ${themeStyles.textColor} mb-4\`}>
                {tier.name}
              </h3>
              <div className="mb-4">
                <span className={\`text-5xl font-bold ${themeStyles.textColor}\`}>
                  {tier.price}
                </span>
                <span className={\`${themeStyles.textColor} opacity-60 ml-2\`}>
                  /month
                </span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              {tier.features.map((feature, featureIndex) => (
                <li key={featureIndex} className={\`${themeStyles.textColor} opacity-90\`}>
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => onSelectPlan?.(tier)}
              className={\`w-full py-3 px-6 rounded-lg font-bold transition-all duration-300 \${
                tier.highlighted
                  ? \`bg-gradient-to-r ${themeStyles.accentColor} text-black hover:shadow-xl\`
                  : \`border-2 ${themeStyles.textColor === 'text-white' ? 'border-white text-white hover:bg-white hover:text-black' : 'border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white'}\`
              }\`}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ${name};`;
}

/**
 * Generate button with different theme variations
 */
function generateButtonVariation(name, description, theme) {
    const themes = {
        gradient: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
        minimal: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
        glassmorphism: 'bg-white/20 backdrop-blur-lg border border-white/30 text-white hover:bg-white/30',
        neumorphism: 'bg-gray-200 shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] hover:shadow-[2px_2px_4px_#bebebe,-2px_-2px_4px_#ffffff] text-gray-800',
        bold: 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
    };
  
    return `import React from 'react';

interface ${name}Props {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  children = "Click Me",
  onClick,
  disabled = false,
  className = ""
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`px-8 py-4 ${themes[theme]} text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed \${className}\`}
    >
      {children}
    </button>
  );
};

export default ${name};`;
}

/**
 * Generate card with different theme variations
 */
function generateCardVariation(name, description, theme) {
    const themes = {
        gradient: 'bg-gradient-to-br from-purple-600 to-pink-600 text-white',
        minimal: 'bg-white border border-gray-200 text-gray-900',
        glassmorphism: 'bg-white/10 backdrop-blur-lg border border-white/20 text-white',
        neumorphism: 'bg-gray-200 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] text-gray-800',
        bold: 'bg-black text-white border-2 border-red-500'
    };
  
    return `import React from 'react';

interface ${name}Props {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  title = "Card Title",
  children,
  className = ""
}) => {
  return (
    <div className={\`${themes[theme]} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 \${className}\`}>
      {title && (
        <h3 className="text-xl font-semibold mb-4">
          {title}
        </h3>
      )}
      <div>
        {children || "Card content goes here"}
      </div>
    </div>
  );
};

export default ${name};`;
}

/**
 * Generate default component with theme variation
 */
function generateDefaultVariation(name, description, theme) {
    const themes = {
        gradient: 'bg-gradient-to-br from-blue-500 to-purple-600 text-white',
        minimal: 'bg-white border border-gray-200 text-gray-900',
        glassmorphism: 'bg-white/20 backdrop-blur-lg border border-white/30 text-white',
        neumorphism: 'bg-gray-200 shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] text-gray-800',
        bold: 'bg-black text-white border-2 border-yellow-400'
    };
  
    return `import React from 'react';

interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

const ${name}: React.FC<${name}Props> = ({ 
  className = "",
  children 
}) => {
  return (
    <div className={\`${themes[theme]} p-6 rounded-lg \${className}\`}>
      {children || "${description}"}
    </div>
  );
};

export default ${name};`;
}

module.exports = router;