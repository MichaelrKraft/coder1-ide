/**
 * Component Studio AI Integration API
 * Natural language component generation for Magic UI Component Studio
 */

const express = require('express');
const router = express.Router();

// Import OpenAI if available
let OpenAI;
try {
    OpenAI = require('openai');
} catch (error) {
    console.log('🔧 Component AI: OpenAI not available, using fallback');
}

/**
 * AI-powered component generation endpoint
 * Generates React components based on natural language descriptions
 */
router.post('/generate', async (req, res) => {
    console.log('🔧 Component AI: Generate request received:', { description: req.body.description, componentType: req.body.componentType });
    try {
        const { description, componentType, style } = req.body;
        
        if (!description) {
            return res.status(400).json({
                error: 'Description is required',
                fallback: generateFallbackComponent(componentType || 'button')
            });
        }

        // Check if OpenAI is available
        if (!process.env.OPENAI_API_KEY || !OpenAI) {
            console.log('🔧 Component AI: Using fallback component generation');
            return res.json({
                success: true,
                component: generateFallbackComponent(componentType || 'button'),
                source: 'fallback',
                message: 'Using fallback generation - configure OPENAI_API_KEY for AI-powered generation'
            });
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Generate component using AI
        const aiComponent = await generateAIComponent(openai, description, componentType, style);
        
        res.json({
            success: true,
            component: aiComponent,
            source: 'ai',
            message: 'Component generated successfully'
        });

    } catch (error) {
        console.error('❌ Component AI generation error:', error.message);
        console.log('🔧 Component AI: Sending fallback response...');
        
        // Fallback on error - return success with fallback component
        const fallbackResponse = {
            success: true,
            component: generateFallbackComponent(req.body.componentType || 'button'),
            source: 'fallback',
            message: 'Using fallback generation due to AI service error'
        };
        console.log('🔧 Component AI: Fallback response prepared:', { success: fallbackResponse.success, source: fallbackResponse.source });
        res.json(fallbackResponse);
    }
});

/**
 * Component enhancement endpoint
 * Enhances existing components with AI-suggested properties
 */
router.post('/enhance', async (req, res) => {
    try {
        const { componentCode, enhancementRequest } = req.body;
        
        if (!componentCode) {
            return res.status(400).json({
                error: 'Component code is required'
            });
        }

        // Check if OpenAI is available
        if (!process.env.OPENAI_API_KEY || !OpenAI) {
            return res.json({
                success: true,
                enhancements: generateFallbackEnhancements(),
                source: 'fallback',
                message: 'Using fallback enhancements - configure OPENAI_API_KEY for AI-powered enhancement'
            });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const enhancements = await generateEnhancements(openai, componentCode, enhancementRequest);
        
        res.json({
            success: true,
            enhancements,
            source: 'ai',
            message: 'Enhancements generated successfully'
        });

    } catch (error) {
        console.error('❌ Component enhancement error:', error.message);
        
        res.status(500).json({
            error: 'Enhancement generation failed',
            fallback: generateFallbackEnhancements(),
            message: 'Using fallback enhancements due to AI service error'
        });
    }
});

/**
 * Generate component using OpenAI
 */
async function generateAIComponent(openai, description, componentType = 'button', style = 'modern') {
    const prompt = `Generate a professional React component based on this description: "${description}"

Requirements:
- Component type: ${componentType}
- Style: ${style}
- Include comprehensive props for customization (colors, sizes, typography, spacing)
- Use inline styles (no external CSS)
- Include hover states and transitions
- Make it production-ready and accessible
- Follow React best practices

Return ONLY the component function code, no explanations or markdown.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert React developer. Generate high-quality, customizable React components with comprehensive prop systems. Always use inline styles and include proper TypeScript-style prop handling."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('❌ OpenAI API error:', error.message);
        throw error;
    }
}

/**
 * Generate component enhancements using OpenAI
 */
async function generateEnhancements(openai, componentCode, enhancementRequest) {
    const prompt = `Analyze this React component and suggest enhancements based on the request: "${enhancementRequest}"

Component Code:
${componentCode}

Provide specific suggestions for:
1. Additional props that would improve customization
2. Style improvements or variants
3. Accessibility enhancements
4. Performance optimizations
5. UX improvements

Return as a JSON object with structure:
{
  "newProps": [{"name": "propName", "type": "string", "description": "what it does", "defaultValue": "default"}],
  "styleImprovements": ["improvement 1", "improvement 2"],
  "accessibilityTips": ["tip 1", "tip 2"],
  "performanceTips": ["tip 1", "tip 2"]
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert React developer and UX designer. Provide detailed, actionable suggestions for improving React components."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1500,
            temperature: 0.6
        });

        return JSON.parse(completion.choices[0].message.content.trim());
    } catch (error) {
        console.error('❌ Enhancement generation error:', error.message);
        return generateFallbackEnhancements();
    }
}

/**
 * Fallback component generation when AI is not available
 */
function generateFallbackComponent(componentType) {
    const templates = {
        button: `function CustomButton({ 
            text = "Click Me",
            backgroundColor = "#8b5cf6",
            textColor = "#ffffff",
            padding = "12px 24px",
            borderRadius = "8px",
            fontSize = "16px",
            fontWeight = "500",
            hoverColor = "#7c3aed",
            disabled = false,
            onClick = () => {}
        }) {
            const [isHovered, setIsHovered] = React.useState(false);
            
            return (
                <button
                    onClick={onClick}
                    disabled={disabled}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        backgroundColor: disabled ? '#9ca3af' : (isHovered ? hoverColor : backgroundColor),
                        color: textColor,
                        padding: padding,
                        borderRadius: borderRadius,
                        fontSize: fontSize,
                        fontWeight: fontWeight,
                        border: 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        opacity: disabled ? 0.6 : 1
                    }}
                >
                    {text}
                </button>
            );
        }`,
        
        card: `function CustomCard({ 
            title = "Card Title",
            content = "Card content goes here",
            backgroundColor = "#ffffff",
            textColor = "#1f2937",
            borderColor = "#e5e7eb",
            borderRadius = "12px",
            padding = "24px",
            shadow = "0 4px 6px rgba(0, 0, 0, 0.1)",
            width = "300px"
        }) {
            return (
                <div style={{
                    backgroundColor: backgroundColor,
                    color: textColor,
                    border: '1px solid ' + borderColor,
                    borderRadius: borderRadius,
                    padding: padding,
                    boxShadow: shadow,
                    width: width,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
                        {title}
                    </h3>
                    <p style={{ margin: 0, lineHeight: '1.6' }}>
                        {content}
                    </p>
                </div>
            );
        }`,
        
        input: `function CustomInput({ 
            placeholder = "Enter text...",
            value = "",
            onChange = () => {},
            type = "text",
            backgroundColor = "#ffffff",
            textColor = "#1f2937",
            borderColor = "#d1d5db",
            focusBorderColor = "#8b5cf6",
            borderRadius = "8px",
            padding = "12px 16px",
            fontSize = "16px",
            width = "100%"
        }) {
            const [isFocused, setIsFocused] = React.useState(false);
            
            return (
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{
                        backgroundColor: backgroundColor,
                        color: textColor,
                        border: '2px solid ' + (isFocused ? focusBorderColor : borderColor),
                        borderRadius: borderRadius,
                        padding: padding,
                        fontSize: fontSize,
                        width: width,
                        outline: 'none',
                        transition: 'border-color 0.3s ease'
                    }}
                />
            );
        }`
    };
    
    return templates[componentType] || templates.button;
}

/**
 * Fallback enhancements when AI is not available
 */
function generateFallbackEnhancements() {
    return {
        newProps: [
            {
                name: "size",
                type: "string",
                description: "Component size variant (small, medium, large)",
                defaultValue: "medium"
            },
            {
                name: "variant",
                type: "string", 
                description: "Visual style variant (primary, secondary, outline)",
                defaultValue: "primary"
            },
            {
                name: "animation",
                type: "string",
                description: "Entrance animation (none, fadeIn, slideUp, scale)",
                defaultValue: "none"
            }
        ],
        styleImprovements: [
            "Add focus states for better accessibility",
            "Include loading state with spinner",
            "Add smooth transitions for better UX"
        ],
        accessibilityTips: [
            "Add proper ARIA labels",
            "Ensure keyboard navigation support",
            "Include high contrast mode support"
        ],
        performanceTips: [
            "Use React.memo for expensive re-renders",
            "Optimize inline styles with useMemo",
            "Consider lazy loading for large components"
        ]
    };
}

module.exports = router;