/**
 * PRD Tool Definitions
 * 
 * Defines Claude Tool Use API schemas for intelligent PRD generation.
 * These tools replace template-based generation with genuine AI analysis.
 * 
 * Token Efficiency: ~3,000 tokens per PRD vs ~42,500 (93% reduction)
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Tool 1: Deep Answer Analysis
 * 
 * Uses extended thinking to analyze questionnaire answers and extract genuine insights.
 * Replaces: Template variable substitution
 * Token Usage: ~500 tokens (vs ~6,500 in prompts)
 */
export const analyzeAnswersDeeply: ToolDefinition = {
  name: 'analyze_answers_deeply',
  description: `Performs deep analysis of PRD questionnaire answers using extended thinking. 
Identifies the REAL problem being solved, competitive positioning, non-obvious risks, and strategic recommendations.
Uses pattern-specific best practices from successful companies (Stripe, Notion, etc.).
Returns structured insights that guide PRD generation.`,
  input_schema: {
    type: 'object',
    properties: {
      answers: {
        type: 'object',
        description: 'User questionnaire answers as key-value pairs'
      },
      pattern: {
        type: 'string',
        description: 'Selected pattern ID (e.g., stripe-saas, notion-productivity)',
        enum: [
          'stripe-saas',
          'notion-productivity',
          'github-developer',
          'slack-communication',
          'shopify-ecommerce',
          'airbnb-marketplace',
          'spotify-content',
          'linear-project-mgmt'
        ]
      },
      mode: {
        type: 'string',
        description: 'Generation depth mode',
        enum: ['quick', 'professional']
      },
      thinking_budget: {
        type: 'string',
        description: 'Extended thinking mode to use',
        enum: ['think', 'think hard', 'think harder', 'ultrathink']
      }
    },
    required: ['answers', 'pattern', 'mode']
  }
};

/**
 * Tool 2: Evidence Gathering
 * 
 * Performs web research for market data and competitive intelligence.
 * Replaces: Generic market statements
 * Token Usage: ~300 tokens (vs ~4,000 in research prompts)
 */
export const gatherPRDEvidence: ToolDefinition = {
  name: 'gather_prd_evidence',
  description: `Gathers market data, competitive intelligence, and supporting evidence for PRD claims.
Performs web searches for market size, growth rates, competitor analysis, and user pain points.
Returns structured evidence with sources that back up PRD statements.
Only runs when mode is 'professional' or explicitly requested to manage costs.`,
  input_schema: {
    type: 'object',
    properties: {
      insights: {
        type: 'object',
        description: 'Output from analyze_answers_deeply tool'
      },
      category: {
        type: 'string',
        description: 'Product category for market research (e.g., "project management software")'
      },
      competitors: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'List of competitor names to research (e.g., ["Jira", "Asana", "Monday.com"])'
      },
      research_depth: {
        type: 'string',
        description: 'How deep to research',
        enum: ['surface', 'moderate', 'comprehensive'],
        default: 'moderate'
      }
    },
    required: ['insights', 'category']
  }
};

/**
 * Tool 3: Section Generation
 * 
 * Generates intelligent, evidence-based content for specific PRD sections.
 * Replaces: Template string substitution
 * Token Usage: ~300 tokens per section (vs ~4,000)
 */
export const generatePRDSection: ToolDefinition = {
  name: 'generate_prd_section',
  description: `Generates high-quality, evidence-based content for a specific PRD section.
Uses analysis insights and market evidence to create compelling, actionable content.
Follows pattern-specific best practices and writing styles.
Returns markdown content with quality score and improvement suggestions.`,
  input_schema: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        description: 'PRD section to generate',
        enum: [
          'executive_summary',
          'problem_statement',
          'solution_overview',
          'target_audience',
          'core_features',
          'technical_architecture',
          'implementation_roadmap',
          'risk_assessment',
          'success_metrics',
          'business_model',
          'competitive_analysis',
          'go_to_market'
        ]
      },
      insights: {
        type: 'object',
        description: 'Analysis insights from analyze_answers_deeply'
      },
      evidence: {
        type: 'object',
        description: 'Market evidence from gather_prd_evidence (optional)'
      },
      pattern: {
        type: 'string',
        description: 'Pattern to follow for style and structure'
      },
      length: {
        type: 'string',
        description: 'Target section length',
        enum: ['concise', 'standard', 'comprehensive'],
        default: 'standard'
      }
    },
    required: ['section', 'insights', 'pattern']
  }
};

/**
 * Tool 4: Quality Scoring
 * 
 * Analyzes PRD quality and identifies improvements.
 * Replaces: Manual review
 * Token Usage: ~400 tokens (vs ~8,000 in analysis prompts)
 */
export const scorePRDQuality: ToolDefinition = {
  name: 'score_prd_quality',
  description: `Analyzes PRD quality across multiple dimensions and suggests specific improvements.
Scores completeness, evidence backing, excitement factor, clarity, and actionability.
Identifies weak sections that need enhancement and provides concrete improvement suggestions.
Returns overall quality score and detailed dimension breakdown.`,
  input_schema: {
    type: 'object',
    properties: {
      prd: {
        type: 'string',
        description: 'Complete PRD document in markdown format'
      },
      criteria: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'completeness',
            'evidence',
            'excitement',
            'clarity',
            'actionability',
            'technical_depth',
            'business_viability',
            'risk_awareness'
          ]
        },
        description: 'Quality criteria to evaluate',
        default: ['completeness', 'evidence', 'excitement', 'clarity', 'actionability']
      },
      target_score: {
        type: 'number',
        description: 'Target quality score (1-10) to achieve',
        default: 8.0
      }
    },
    required: ['prd']
  }
};

/**
 * All tool definitions for export
 */
export const prdTools: ToolDefinition[] = [
  analyzeAnswersDeeply,
  gatherPRDEvidence,
  generatePRDSection,
  scorePRDQuality
];

/**
 * Tool categories for organization
 */
export const toolCategories = {
  analysis: [analyzeAnswersDeeply],
  research: [gatherPRDEvidence],
  generation: [generatePRDSection],
  validation: [scorePRDQuality]
};

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return prdTools.find(tool => tool.name === name);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: keyof typeof toolCategories): ToolDefinition[] {
  return toolCategories[category] || [];
}

/**
 * Validate tool input against schema
 */
export function validateToolInput(toolName: string, input: any): { valid: boolean; errors: string[] } {
  const tool = getToolByName(toolName);
  
  if (!tool) {
    return { valid: false, errors: [`Tool '${toolName}' not found`] };
  }
  
  const errors: string[] = [];
  const { required, properties } = tool.input_schema;
  
  // Check required fields
  for (const field of required) {
    if (!(field in input)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check field types (basic validation)
  for (const [key, value] of Object.entries(input)) {
    if (!(key in properties)) {
      errors.push(`Unknown field: ${key}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Type definitions for tool outputs
 */

export interface AnalysisInsights {
  problemAnalysis: {
    surface: string;
    deep: string;
    whyItMatters: string;
  };
  marketPosition: {
    category: string;
    positioning: string;
    differentiation: string;
  };
  differentiators: Array<{
    feature: string;
    impact: string;
    evidence: string;
  }>;
  risks: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  recommendations: Array<{
    area: string;
    recommendation: string;
    priority: 'must-have' | 'should-have' | 'nice-to-have';
  }>;
  confidence: number;
  gaps: string[];
}

export interface MarketEvidence {
  marketData: {
    size: string;
    growth: string;
    trends: string[];
    sources: string[];
  };
  competitive: {
    landscape: Array<{
      name: string;
      strengths: string[];
      weaknesses: string[];
      pricing: string;
    }>;
    gaps: string[];
    positioning: string;
  };
  evidence: Array<{
    claim: string;
    support: string;
    source: string;
  }>;
}

export interface SectionContent {
  content: string;
  quality_score: number;
  suggestions: string[];
  word_count: number;
}

export interface QualityScore {
  overall_score: number;
  dimension_scores: {
    completeness: number;
    evidence: number;
    excitement: number;
    clarity: number;
    actionability: number;
    technical_depth?: number;
    business_viability?: number;
    risk_awareness?: number;
  };
  weak_sections: string[];
  improvements: Array<{
    section: string;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  strengths: string[];
}
