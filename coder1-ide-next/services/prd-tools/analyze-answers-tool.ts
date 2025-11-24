/**
 * Analyze Answers Tool - Deep Analysis Implementation
 * 
 * Uses extended thinking to extract genuine insights from questionnaire answers.
 * Replaces template variable substitution with real product strategy analysis.
 */

import type { AnalysisInsights } from './tool-definitions';

/**
 * Pattern-specific best practices and characteristics
 */
const PATTERN_CONTEXTS = {
  'stripe-saas': {
    name: 'Stripe-style SaaS Platform',
    characteristics: [
      'Developer-first API design',
      'Transparent, usage-based pricing',
      'Exceptional documentation',
      'Strong focus on reliability and uptime',
      'Clean, minimal UI design'
    ],
    successFactors: [
      'Developer experience is paramount',
      'API design must be intuitive',
      'Documentation quality drives adoption',
      'Pricing must be simple and predictable',
      'Trust and reliability are core values'
    ]
  },
  'notion-productivity': {
    name: 'Notion-style Productivity Platform',
    characteristics: [
      'Flexible, block-based content system',
      'Beautiful, intuitive UI',
      'Powerful but approachable',
      'Collaborative by default',
      'Template-driven workflows'
    ],
    successFactors: [
      'UI must be beautiful and fast',
      'Flexibility without overwhelming users',
      'Community and templates drive growth',
      'Collaboration features are essential',
      'Freemium model with viral sharing'
    ]
  },
  'github-developer': {
    name: 'GitHub-style Developer Platform',
    characteristics: [
      'Version control and collaboration core',
      'Strong community features',
      'Open source friendly',
      'CI/CD integration',
      'Developer workflow optimization'
    ],
    successFactors: [
      'Community is the product',
      'Git workflow must be seamless',
      'Integration ecosystem is critical',
      'Open source creates moat',
      'Network effects drive growth'
    ]
  },
  'slack-communication': {
    name: 'Slack-style Communication Platform',
    characteristics: [
      'Real-time messaging core',
      'Channel-based organization',
      'Extensive integrations',
      'Search as a feature',
      'Mobile-first approach'
    ],
    successFactors: [
      'Real-time performance is critical',
      'Integration depth drives stickiness',
      'Search quality determines value',
      'Mobile experience must match desktop',
      'Bottom-up adoption within organizations'
    ]
  },
  'shopify-ecommerce': {
    name: 'Shopify-style E-commerce Platform',
    characteristics: [
      'Complete commerce solution',
      'App marketplace ecosystem',
      'Multi-channel selling',
      'Payment processing integrated',
      'Merchant-focused tools'
    ],
    successFactors: [
      'Must handle entire commerce stack',
      'App ecosystem creates lock-in',
      'Payment processing is key revenue',
      'Merchant success drives retention',
      'Multi-channel is table stakes'
    ]
  },
  'airbnb-marketplace': {
    name: 'Airbnb-style Marketplace',
    characteristics: [
      'Two-sided marketplace dynamics',
      'Trust and safety critical',
      'Search and discovery focus',
      'Review system central',
      'Geographic expansion strategy'
    ],
    successFactors: [
      'Supply and demand must balance',
      'Trust mechanisms are essential',
      'Quality curation drives brand',
      'Reviews create accountability',
      'Geographic density matters'
    ]
  },
  'spotify-content': {
    name: 'Spotify-style Content Platform',
    characteristics: [
      'Recommendation engine driven',
      'Subscription revenue model',
      'Personalization at scale',
      'Content licensing complex',
      'Discovery is the product'
    ],
    successFactors: [
      'Recommendations must be excellent',
      'Content library breadth matters',
      'Personalization drives engagement',
      'Licensing costs are major factor',
      'Mobile-first consumption'
    ]
  },
  'linear-project-mgmt': {
    name: 'Linear-style Project Management',
    characteristics: [
      'Speed and performance focus',
      'Keyboard-first interface',
      'Engineering team optimized',
      'Clean, minimal design',
      'Git workflow integration'
    ],
    successFactors: [
      'Speed is a competitive advantage',
      'Keyboard shortcuts are essential',
      'Developer workflow integration',
      'Design quality signals quality',
      'Bottom-up adoption in eng teams'
    ]
  }
};

/**
 * Build system prompt for deep answer analysis
 */
export function buildAnalysisSystemPrompt(pattern: string, mode: string): string {
  const patternContext = PATTERN_CONTEXTS[pattern as keyof typeof PATTERN_CONTEXTS];
  const patternName = patternContext?.name || 'Custom Pattern';
  
  return `You are a senior product manager with 15+ years of experience at top-tier tech companies.

Your task is to deeply analyze questionnaire answers from someone planning to build a product.

# Your Analysis Approach

You will analyze the answers through the lens of the **${patternName}** pattern.

## Pattern Characteristics:
${patternContext?.characteristics.map(c => `• ${c}`).join('\n')}

## Success Factors for This Pattern:
${patternContext?.successFactors.map(f => `• ${f}`).join('\n')}

# What You Must Analyze

## 1. Problem Analysis (Deep Dive)
- **Surface Problem**: What they say they're solving
- **Real Problem**: What they're ACTUALLY solving (often different)
- **Why It Matters**: The deeper impact and opportunity
- **Critical Questions**: What questions reveal they haven't thought through

**Analysis Depth**: Don't accept surface-level answers. Dig deeper.
- If they say "help people manage tasks" → What specific failure mode in task management?
- If they say "AI-powered" → What specific AI capability? What's the accuracy requirement?
- If they say "for developers" → Which developers? What's their day-to-day pain?

## 2. Market Positioning
- **Category**: Where does this actually fit? (Don't just repeat their answer)
- **Positioning**: How should this be positioned vs alternatives?
- **Differentiation**: What makes this genuinely different? (Be honest if it's not differentiated)
- **Market Timing**: Why now? What's changed to make this possible/needed?

## 3. Differentiators (Be Brutally Honest)
Identify REAL differentiators:
- **Technology**: Is there a genuine tech advantage?
- **Experience**: Is the UX meaningfully better?
- **Business Model**: Is the pricing/monetization innovative?
- **Network Effects**: Are there natural network effects?
- **Data/AI**: Is there a data moat or AI capability?

**Warning Signs**:
- Generic statements like "better UX" or "AI-powered" without specifics
- Features that competitors can easily copy
- Differentiation that customers don't care about

## 4. Non-Obvious Risks (The Ones They Won't See)
Think like a skeptical VC:
- **Market Risk**: Is the market real? Proven demand or assumption?
- **Technical Risk**: Can this actually be built? At what cost?
- **Competitive Risk**: Why won't incumbents crush this?
- **Regulatory Risk**: Any compliance or legal issues?
- **Monetization Risk**: Will people actually pay? At what price point?
- **Team Risk**: Do they have the skills to execute?
- **Timing Risk**: Too early? Too late?

## 5. Strategic Recommendations
Based on the ${patternName} playbook:
- **Must-Have Features**: What's truly essential for MVP?
- **Nice-to-Have**: What can wait for v2?
- **Anti-Patterns**: What should they avoid?
- **Go-to-Market**: How should they launch?
- **Positioning**: How should they talk about this?

# Extended Thinking Instructions

${mode === 'professional' ? `
**Mode: PROFESSIONAL - Use "ultrathink"**

You have extended thinking budget. Use it wisely:

1. **First Principles**: Break down the problem from first principles
2. **Multiple Perspectives**: Consider from user, business, technical angles  
3. **Historical Context**: Compare to similar products that succeeded/failed
4. **Second-Order Effects**: What happens if this succeeds? What problems does that create?
5. **Contrarian View**: What would a skeptic say? Are they right?

Spend time thinking deeply. Quality matters more than speed.
` : `
**Mode: QUICK - Use "think hard"**

You have limited thinking budget. Focus on:

1. **Core Insight**: What's the one key insight they're missing?
2. **Biggest Risk**: What's the #1 risk they should address?
3. **Key Differentiator**: What's their genuine competitive advantage?

Be concise but insightful.
`}

# Output Format

Return your analysis as a structured JSON object with:

\`\`\`json
{
  "problemAnalysis": {
    "surface": "What they said the problem is",
    "deep": "What the REAL problem actually is",
    "whyItMatters": "The deeper opportunity/impact"
  },
  "marketPosition": {
    "category": "Actual category (not just their answer)",
    "positioning": "How to position vs alternatives",
    "differentiation": "What makes this genuinely different"
  },
  "differentiators": [
    {
      "feature": "Specific differentiator",
      "impact": "Why it matters",
      "evidence": "What supports this claim"
    }
  ],
  "risks": [
    {
      "risk": "Specific risk",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "How to address it"
    }
  ],
  "recommendations": [
    {
      "area": "Product|GTM|Technical|etc",
      "recommendation": "Specific actionable advice",
      "priority": "must-have|should-have|nice-to-have"
    }
  ],
  "confidence": 0.85,  // Your confidence in this analysis (0-1)
  "gaps": ["What additional info would improve analysis"]
}
\`\`\`

# Key Principles

1. **Be Honest**: If something won't work, say so
2. **Be Specific**: Generic advice is useless
3. **Be Actionable**: Every recommendation should be implementable
4. **Be Contrarian**: Question assumptions
5. **Be Pattern-Aware**: Use ${patternName} best practices

Remember: You're analyzing to help them build something great, not just to validate their idea.`;
}

/**
 * Build user prompt with questionnaire answers
 */
export function buildAnalysisUserPrompt(answers: any, pattern: string): string {
  // Extract key answers
  const answerText = Object.entries(answers)
    .map(([key, value]) => {
      const formattedKey = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `**${formattedKey}**: ${JSON.stringify(value)}`;
    })
    .join('\n');
  
  return `Please analyze these questionnaire answers for a product idea:

# User's Answers

${answerText}

# Pattern Context

They've selected the **${pattern}** pattern. Use this context to guide your analysis.

# Your Task

Analyze these answers deeply and return your structured analysis as a JSON object.

Consider:
- What are they really trying to solve?
- What makes this different (if anything)?
- What are the hidden risks?
- What should they focus on?

Be honest and specific. This analysis will guide their entire PRD and product development.

**Important**: Use extended thinking to go deep. Don't rush. Quality matters.`;
}

/**
 * Post-process analysis results
 * 
 * This adds additional context and validation to the raw tool output
 */
export function postProcessAnalysis(
  rawAnalysis: any,
  answers: any,
  pattern: string
): AnalysisInsights {
  // Validate and normalize the analysis
  const analysis: AnalysisInsights = {
    problemAnalysis: {
      surface: rawAnalysis.problemAnalysis?.surface || 'No surface problem identified',
      deep: rawAnalysis.problemAnalysis?.deep || 'No deep problem analysis provided',
      whyItMatters: rawAnalysis.problemAnalysis?.whyItMatters || 'Impact not analyzed'
    },
    marketPosition: {
      category: rawAnalysis.marketPosition?.category || 'Uncategorized',
      positioning: rawAnalysis.marketPosition?.positioning || 'Positioning not defined',
      differentiation: rawAnalysis.marketPosition?.differentiation || 'Differentiation unclear'
    },
    differentiators: Array.isArray(rawAnalysis.differentiators) 
      ? rawAnalysis.differentiators 
      : [],
    risks: Array.isArray(rawAnalysis.risks) 
      ? rawAnalysis.risks 
      : [],
    recommendations: Array.isArray(rawAnalysis.recommendations) 
      ? rawAnalysis.recommendations 
      : [],
    confidence: rawAnalysis.confidence || 0.5,
    gaps: Array.isArray(rawAnalysis.gaps) ? rawAnalysis.gaps : []
  };
  
  // Add pattern-specific validations
  const patternContext = PATTERN_CONTEXTS[pattern as keyof typeof PATTERN_CONTEXTS];
  
  if (patternContext && analysis.differentiators.length === 0) {
    analysis.gaps.push(
      `No clear differentiators identified for ${patternContext.name} pattern`
    );
  }
  
  if (analysis.risks.length === 0) {
    analysis.gaps.push('No risks identified - this is concerning');
  }
  
  if (analysis.confidence < 0.6) {
    analysis.gaps.push('Low confidence in analysis - more information needed');
  }
  
  return analysis;
}

/**
 * Get suggested follow-up questions based on analysis gaps
 */
export function getSuggestedFollowUpQuestions(analysis: AnalysisInsights): string[] {
  const questions: string[] = [];
  
  // Check for vague differentiation
  if (analysis.marketPosition.differentiation.includes('unclear') || 
      analysis.marketPosition.differentiation.includes('not clear')) {
    questions.push('What specific capability or feature makes your product genuinely different from existing solutions?');
  }
  
  // Check for missing target user details
  if (!analysis.problemAnalysis.deep.includes('developer') && 
      !analysis.problemAnalysis.deep.includes('business') &&
      !analysis.problemAnalysis.deep.includes('consumer')) {
    questions.push('Who specifically is your target user? What do they do day-to-day?');
  }
  
  // Check for missing market validation
  if (analysis.risks.some(r => r.risk.toLowerCase().includes('market'))) {
    questions.push('What evidence do you have that this problem is worth solving? Have you talked to potential users?');
  }
  
  // Check for technical feasibility concerns
  if (analysis.risks.some(r => r.risk.toLowerCase().includes('technical'))) {
    questions.push('What are the technical challenges? Do you have the expertise to build this?');
  }
  
  // Check for monetization uncertainty
  if (analysis.risks.some(r => r.risk.toLowerCase().includes('monetization') || r.risk.toLowerCase().includes('pricing'))) {
    questions.push('What are you willing to pay for a solution to this problem? What price point makes sense?');
  }
  
  return questions;
}
