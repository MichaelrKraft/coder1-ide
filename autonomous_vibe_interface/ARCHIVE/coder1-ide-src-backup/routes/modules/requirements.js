/**
 * Requirements Analysis Route Module
 * 
 * Handles intelligent requirements gathering and enhanced brief generation
 */

const express = require('express');
const router = express.Router();
const { getIntelligentQuestioner } = require('../../requirements/intelligent-questioner');

/**
 * Analyze requirements and generate intelligent questions
 */
router.post("/analyze", async (req, res) => {
    try {
        const { request } = req.body;
        
        if (!request || typeof request !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Request description is required and must be a string'
            });
        }
        
        if (request.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Request description must be at least 10 characters long'
            });
        }
        
        if (request.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Request description must be less than 1000 characters'
            });
        }

        console.log(`🔍 Analyzing requirements: "${request.substring(0, 100)}..."`);
        
        const questioner = getIntelligentQuestioner();
        const result = await questioner.analyzeRequirements(request);
        
        console.log(`✅ Generated ${result.questions?.length || 0} questions for requirements analysis`);
        
        res.json({
            success: true,
            ...result,
            originalRequest: request,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error analyzing requirements:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: 'Requirements analysis service temporarily unavailable'
        });
    }
});

/**
 * Generate enhanced brief from Q&A session
 */
router.post("/generate-brief", async (req, res) => {
    try {
        const { originalRequest, questions, answers } = req.body;
        
        // Validation
        if (!originalRequest || typeof originalRequest !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Original request is required'
            });
        }
        
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Questions array is required and must not be empty'
            });
        }
        
        if (!Array.isArray(answers) || answers.length !== questions.length) {
            return res.status(400).json({
                success: false,
                error: 'Answers array must match the number of questions'
            });
        }
        
        // Validate that all answers are provided
        const missingAnswers = answers.some((answer, index) => 
            !answer || (typeof answer === 'string' && answer.trim().length === 0)
        );
        
        if (missingAnswers) {
            return res.status(400).json({
                success: false,
                error: 'All questions must be answered'
            });
        }

        console.log(`📝 Generating enhanced brief from ${questions.length} Q&A pairs`);
        
        const questioner = getIntelligentQuestioner();
        const result = await questioner.generateEnhancedBrief(originalRequest, questions, answers);
        
        console.log(`✅ Enhanced brief generated with ${result.enhancedBrief?.length || 0} characters`);
        
        res.json({
            success: true,
            ...result,
            metadata: {
                originalRequest,
                questionCount: questions.length,
                timestamp: new Date().toISOString(),
                confidence: result.confidence || 0.85
            }
        });
        
    } catch (error) {
        console.error('❌ Error generating enhanced brief:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: 'Enhanced brief generation service temporarily unavailable'
        });
    }
});

/**
 * Generate code for UI elements (for 21st.dev Inspector)
 */
router.post("/generate-code", async (req, res) => {
    try {
        const { request, mode, context } = req.body;
        
        if (!context || !context.element) {
            return res.status(400).json({
                success: false,
                error: 'Element context is required'
            });
        }
        
        const { element } = context;
        console.log(`🎯 21st.dev Inspector: Generating code for ${element.tag} element`);
        
        // Generate code based on element type
        let code = '';
        let explanation = '';
        
        if (element.tag === 'button') {
            code = `import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const CustomButton: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  className = "${element.className || 'btn btn-primary'}", 
  disabled = false 
}) => {
  return (
    <button 
      className={className}
      onClick={onClick}
      disabled={disabled}
      ${element.id ? `id="${element.id}"` : ''}
    >
      {children || "${element.text || 'Button'}"}
    </button>
  );
};`;
            
            explanation = `This is a reusable React button component based on the selected element. It includes proper TypeScript types, accessibility features, and customizable props for styling and behavior.`;
        } else if (element.tag === 'div') {
            code = `import React from 'react';

interface ContainerProps {
  children?: React.ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({ 
  children, 
  className = "${element.className || 'container'}"
}) => {
  return (
    <div 
      className={className}
      ${element.id ? `id="${element.id}"` : ''}
    >
      {children}
    </div>
  );
};`;
            
            explanation = `This is a flexible container component that can hold any child elements. It's useful for layout and grouping content with consistent styling.`;
        } else {
            code = `import React from 'react';

// Component for ${element.tag} element
export const ${element.tag.charAt(0).toUpperCase() + element.tag.slice(1)}Component = () => {
  return (
    <${element.tag} 
      ${element.className ? `className="${element.className}"` : ''}
      ${element.id ? `id="${element.id}"` : ''}
    >
      ${element.text || ''}
    </${element.tag}>
  );
};`;
            
            explanation = `Basic React component for a ${element.tag} element. This can be customized further based on your specific needs.`;
        }
        
        res.json({
            success: true,
            code,
            explanation,
            elementInfo: {
                tag: element.tag,
                className: element.className,
                id: element.id,
                framework: element.framework || 'react'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error generating code:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: 'Code generation service temporarily unavailable'
        });
    }
});

/**
 * Explain UI elements (for 21st.dev Inspector)
 */
router.post("/explain-element", async (req, res) => {
    try {
        const { context } = req.body;
        
        if (!context || !context.element) {
            return res.status(400).json({
                success: false,
                error: 'Element context is required'
            });
        }
        
        const { element } = context;
        console.log(`🔍 21st.dev Inspector: Explaining ${element.tag} element`);
        
        const explanation = generateElementExplanation(element);
        
        res.json({
            success: true,
            explanation,
            elementInfo: {
                tag: element.tag,
                className: element.className,
                id: element.id,
                framework: element.framework || 'react'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error explaining element:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: 'Element explanation service temporarily unavailable'
        });
    }
});

function generateElementExplanation(element) {
    const tag = element.tag;
    const className = element.className;
    const text = element.text;
    
    let explanation = `## Element Analysis: ${tag}${className ? '.' + className.split(' ')[0] : ''}

**Purpose**: This ${tag} element `;
    
    if (tag === 'button') {
        explanation += `is an interactive button that triggers actions when clicked.`;
    } else if (tag === 'div') {
        explanation += `is a container element used for layout and grouping content.`;
    } else if (tag.startsWith('h')) {
        explanation += `is a heading element that defines the hierarchy of content.`;
    } else {
        explanation += `serves as a structural element in the user interface.`;
    }
    
    explanation += `

**Common Use Cases**:
${getCommonUseCases(tag)}

**Best Practices**:
${getBestPractices(tag)}

**Accessibility Notes**:
${getAccessibilityNotes(tag)}

This analysis is provided by the 21st.dev Inspector for development guidance.`;
    
    return explanation;
}

function getCommonUseCases(tag) {
    const useCases = {
        'button': '• Form submissions and user actions\n• Navigation triggers\n• Modal dialogs and dropdowns\n• Call-to-action elements',
        'div': '• Layout containers and wrappers\n• Content sections and cards\n• Grid and flex item containers\n• Styling and positioning elements',
        'span': '• Inline text styling\n• Icon containers\n• Small UI components\n• Text highlighting',
        'p': '• Body text and paragraphs\n• Descriptions and content\n• Information display',
        'h1': '• Page titles and main headings\n• Primary content hierarchy',
        'h2': '• Section headings\n• Secondary content organization',
        'h3': '• Subsection headings\n• Tertiary content structure'
    };
    
    return useCases[tag] || `• ${tag.charAt(0).toUpperCase() + tag.slice(1)} specific functionality\n• Semantic content structure\n• User interface elements`;
}

function getBestPractices(tag) {
    const practices = {
        'button': '• Use semantic button elements for actions\n• Include accessible labels and ARIA attributes\n• Provide visual feedback for interactions\n• Handle keyboard navigation properly',
        'div': '• Use semantic HTML elements when appropriate\n• Apply proper ARIA labels if needed\n• Maintain clean and meaningful class names\n• Consider layout and responsive design',
        'span': '• Use primarily for styling purposes\n• Avoid for block-level content\n• Consider semantic alternatives when possible'
    };
    
    return practices[tag] || '• Follow semantic HTML principles\n• Ensure accessibility compliance\n• Use appropriate ARIA attributes\n• Maintain clean and readable code';
}

function getAccessibilityNotes(tag) {
    const notes = {
        'button': '• Ensure keyboard accessibility with proper tab order\n• Use ARIA labels for screen readers\n• Provide focus indicators\n• Include meaningful text content',
        'div': '• Add ARIA roles if the div has semantic meaning\n• Ensure proper heading hierarchy\n• Use landmarks for navigation\n• Maintain logical tab order',
        'span': '• Generally neutral for accessibility\n• Ensure sufficient color contrast\n• Use semantic elements for meaningful content'
    };
    
    return notes[tag] || '• Follow WCAG guidelines for accessibility\n• Ensure proper semantic structure\n• Test with screen readers\n• Maintain keyboard navigation';
}

/**
 * Get sample questions for testing (development only)
 */
router.get("/sample-questions", (req, res) => {
    try {
        const sampleQuestions = [
            {
                id: 1,
                question: "Who is your target audience?",
                type: "text",
                placeholder: "e.g., Small business owners, developers, students"
            },
            {
                id: 2,
                question: "What are the main features you need?",
                type: "text",
                placeholder: "e.g., User authentication, payment processing, analytics"
            },
            {
                id: 3,
                question: "What's your preferred technology stack?",
                type: "select",
                options: ["React + Node.js", "Vue + Python", "Angular + Java", "WordPress", "Custom"]
            },
            {
                id: 4,
                question: "Do you need user authentication?",
                type: "boolean",
                placeholder: "Yes/No"
            },
            {
                id: 5,
                question: "What's your timeline for this project?",
                type: "select",
                options: ["ASAP", "1-2 weeks", "1 month", "2-3 months", "Flexible"]
            }
        ];
        
        res.json({
            success: true,
            questions: sampleQuestions,
            note: "These are sample questions for development and testing purposes"
        });
        
    } catch (error) {
        console.error('❌ Error getting sample questions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Validate requirements format
 */
function validateRequirements(req, res, next) {
    const { request } = req.body;
    
    if (!request) {
        return res.status(400).json({
            success: false,
            error: 'Request field is required'
        });
    }
    
    if (typeof request !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Request must be a string'
        });
    }
    
    if (request.length < 5) {
        return res.status(400).json({
            success: false,
            error: 'Request must be at least 5 characters long'
        });
    }
    
    next();
}

module.exports = router;