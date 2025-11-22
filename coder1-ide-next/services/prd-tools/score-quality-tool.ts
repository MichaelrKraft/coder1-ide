/**
 * Score Quality Tool - PRD Quality Analysis
 * 
 * Analyzes PRD quality across multiple dimensions and suggests improvements.
 * Enables quality-driven enhancement loop.
 */

import type { QualityScore } from './tool-definitions';

/**
 * Quality criteria definitions
 */
const QUALITY_CRITERIA = {
  completeness: {
    name: 'Completeness',
    description: 'Does the PRD cover all essential sections?',
    checkFor: [
      'Executive summary present',
      'Problem statement articulated',
      'Solution approach defined',
      'Features/requirements specified',
      'Success metrics included',
      'Risks acknowledged'
    ]
  },
  
  evidence: {
    name: 'Evidence-Based',
    description: 'Are claims backed by data and research?',
    checkFor: [
      'Market size numbers cited',
      'Competitor analysis included',
      'User research referenced',
      'Sources cited for claims',
      'Specific examples provided'
    ]
  },
  
  excitement: {
    name: 'Excitement Factor',
    description: 'Will this make the team excited to build?',
    checkFor: [
      'Compelling vision statement',
      'Clear value proposition',
      'Specific user impact described',
      'Ambitious but achievable goals',
      'Engaging writing style'
    ]
  },
  
  clarity: {
    name: 'Clarity',
    description: 'Is the PRD easy to understand and follow?',
    checkFor: [
      'Well-structured sections',
      'Clear headings and organization',
      'Minimal jargon',
      'Specific language (not vague)',
      'Good use of examples'
    ]
  },
  
  actionability: {
    name: 'Actionability',
    description: 'Can engineers start building from this?',
    checkFor: [
      'Clear feature requirements',
      'Technical approach specified',
      'Success criteria defined',
      'Timeline/milestones included',
      'Priorities established (P0/P1/P2)'
    ]
  },
  
  technical_depth: {
    name: 'Technical Depth',
    description: 'Is the technical approach well-thought-out?',
    checkFor: [
      'Architecture described',
      'Tech stack recommended',
      'Scalability considered',
      'Security addressed',
      'Integration points defined'
    ]
  },
  
  business_viability: {
    name: 'Business Viability',
    description: 'Is the business model sound?',
    checkFor: [
      'Revenue model defined',
      'Pricing strategy included',
      'Market size validated',
      'Unit economics considered',
      'Path to profitability outlined'
    ]
  },
  
  risk_awareness: {
    name: 'Risk Awareness',
    description: 'Are risks identified and mitigated?',
    checkFor: [
      'Technical risks identified',
      'Market risks acknowledged',
      'Competitive threats addressed',
      'Mitigation strategies proposed',
      'Honest assessment of challenges'
    ]
  }
};

/**
 * Build system prompt for quality scoring
 */
export function buildQualityScoringPrompt(): string {
  return `You are a senior product leader reviewing a Product Requirements Document (PRD).

Your task is to score the PRD quality across multiple dimensions and provide specific improvement suggestions.

# Scoring Approach

You will evaluate the PRD on a 1-10 scale for each criterion:

**1-3: Poor** - Major issues, needs significant work
**4-5: Below Average** - Has problems, needs improvement
**6-7: Good** - Solid but could be better
**8-9: Excellent** - High quality, minor improvements
**10: Outstanding** - Best-in-class, no improvements needed

# Quality Criteria

${Object.entries(QUALITY_CRITERIA).map(([key, criteria]) => `
## ${criteria.name}

**What to check**: ${criteria.description}

**Look for**:
${criteria.checkFor.map(item => `• ${item}`).join('\n')}
`).join('\n')}

# Scoring Guidelines

## Completeness (1-10)
- **10**: All sections present and comprehensive
- **7-9**: Most sections present, some gaps
- **4-6**: Missing key sections or superficial coverage
- **1-3**: Incomplete, many missing sections

## Evidence (1-10)
- **10**: Every claim backed by cited data/research
- **7-9**: Most claims supported, some sources
- **4-6**: Minimal evidence, mostly assumptions
- **1-3**: No evidence, all generic statements

## Excitement (1-10)
- **10**: Compelling vision, makes you want to build it
- **7-9**: Interesting, shows potential
- **4-6**: Somewhat interesting but not compelling
- **1-3**: Boring, doesn't inspire

## Clarity (1-10)
- **10**: Crystal clear, anyone can understand
- **7-9**: Generally clear, minor confusion
- **4-6**: Some parts unclear or confusing
- **1-3**: Confusing, hard to follow

## Actionability (1-10)
- **10**: Engineers can start building immediately
- **7-9**: Mostly actionable, some gaps
- **4-6**: Vague, needs more specifics
- **1-3**: Not actionable, too high-level

# What to Look For

## Red Flags (Lower Scores):
- Generic buzzwords ("revolutionize", "game-changing")
- Vague statements ("users want better UX")
- Template variables not filled in ({{productName}})
- No market data or competitor analysis
- Missing sections
- Inconsistent information
- Unrealistic timelines
- No risk assessment
- Unclear differentiation

## Green Flags (Higher Scores):
- Specific numbers and data
- Named competitors with analysis
- Real user quotes or feedback
- Clear success metrics
- Honest risk assessment
- Specific technical decisions
- Realistic timelines with buffer
- Clear prioritization (P0/P1/P2)
- Evidence-backed claims

# Analysis Process

1. **Read the entire PRD** - Get overall sense of quality
2. **Score each dimension** - Use 1-10 scale
3. **Identify weak sections** - What needs improvement?
4. **Suggest specific improvements** - Actionable feedback
5. **Highlight strengths** - What's done well?
6. **Calculate overall score** - Average of dimension scores

# Output Format

You MUST use the score_prd_quality tool to return your assessment.

Return a structured JSON object:

\`\`\`json
{
  "overall_score": 7.8,
  "dimension_scores": {
    "completeness": 8.0,
    "evidence": 6.5,
    "excitement": 8.5,
    "clarity": 9.0,
    "actionability": 7.5,
    "technical_depth": 7.0,
    "business_viability": 6.5,
    "risk_awareness": 8.0
  },
  "weak_sections": [
    "problem_statement",
    "competitive_analysis"
  ],
  "improvements": [
    {
      "section": "problem_statement",
      "issue": "Lacks specific user pain points and evidence",
      "suggestion": "Add user quotes, survey data, or review analysis showing the pain",
      "priority": "high"
    },
    {
      "section": "competitive_analysis",
      "issue": "Missing pricing comparison and specific weaknesses",
      "suggestion": "Research competitor pricing and analyze user complaints from G2/Capterra",
      "priority": "high"
    }
  ],
  "strengths": [
    "Excellent executive summary - clear and compelling",
    "Strong technical architecture section with good rationale",
    "Realistic timeline with appropriate buffer"
  ]
}
\`\`\`

# Key Principles

1. **Be Honest**: Don't inflate scores
2. **Be Specific**: Generic feedback is useless
3. **Be Constructive**: Suggest how to improve
4. **Be Fair**: Consider the context and scope
5. **Be Consistent**: Apply same standards throughout

Remember: The goal is to help create an excellent PRD, not to criticize. Be constructively critical.`;
}

/**
 * Build user prompt for quality scoring
 */
export function buildQualityScoringUserPrompt(
  prd: string,
  criteria: string[],
  targetScore: number
): string {
  return `Please analyze the quality of this PRD and provide scoring across multiple dimensions.

# PRD to Analyze

${prd}

# Evaluation Criteria

Focus on these quality dimensions:
${criteria.map(c => `• ${c}`).join('\n')}

# Target Quality Score

The target is **${targetScore}/10** overall.

If the PRD scores below this, identify the weak sections and provide specific, actionable improvement suggestions.

# Your Task

1. Read the entire PRD carefully
2. Score each dimension (1-10 scale)
3. Calculate overall score (average)
4. Identify weak sections that need work
5. Provide specific improvement suggestions
6. Highlight what's done well

Use the score_prd_quality tool to return your structured assessment.

**Important**:
- Be honest but constructive
- Provide specific, actionable feedback
- Don't just criticize - suggest how to improve
- Recognize strengths as well as weaknesses`;
}

/**
 * Post-process quality scores
 */
export function postProcessQualityScore(rawScore: any): QualityScore {
  const dimensionScores = rawScore.dimension_scores || {};
  
  // Calculate overall score if not provided
  let overallScore = rawScore.overall_score;
  
  if (!overallScore && Object.keys(dimensionScores).length > 0) {
    const scores = Object.values(dimensionScores) as number[];
    overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
  
  const score: QualityScore = {
    overall_score: overallScore || 5.0,
    dimension_scores: {
      completeness: dimensionScores.completeness || 5.0,
      evidence: dimensionScores.evidence || 5.0,
      excitement: dimensionScores.excitement || 5.0,
      clarity: dimensionScores.clarity || 5.0,
      actionability: dimensionScores.actionability || 5.0,
      technical_depth: dimensionScores.technical_depth,
      business_viability: dimensionScores.business_viability,
      risk_awareness: dimensionScores.risk_awareness
    },
    weak_sections: Array.isArray(rawScore.weak_sections) 
      ? rawScore.weak_sections 
      : [],
    improvements: Array.isArray(rawScore.improvements) 
      ? rawScore.improvements 
      : [],
    strengths: Array.isArray(rawScore.strengths) 
      ? rawScore.strengths 
      : []
  };
  
  // Validate scores are in range
  Object.keys(score.dimension_scores).forEach(key => {
    const value = score.dimension_scores[key as keyof typeof score.dimension_scores];
    if (value !== undefined && (value < 1 || value > 10)) {
      console.warn(`Score for ${key} out of range: ${value}`);
      score.dimension_scores[key as keyof typeof score.dimension_scores] = 
        Math.max(1, Math.min(10, value));
    }
  });
  
  return score;
}

/**
 * Generate improvement priorities
 */
export function prioritizeImprovements(score: QualityScore): {
  critical: string[];
  important: string[];
  nice_to_have: string[];
} {
  const critical: string[] = [];
  const important: string[] = [];
  const nice_to_have: string[] = [];
  
  // Critical: Score < 5.0 or high-priority improvements
  Object.entries(score.dimension_scores).forEach(([dimension, value]) => {
    if (value !== undefined && value < 5.0) {
      critical.push(`${dimension}: Score ${value}/10 - needs immediate attention`);
    }
  });
  
  score.improvements.forEach(imp => {
    if (imp.priority === 'high') {
      critical.push(`${imp.section}: ${imp.issue}`);
    } else if (imp.priority === 'medium') {
      important.push(`${imp.section}: ${imp.issue}`);
    } else {
      nice_to_have.push(`${imp.section}: ${imp.issue}`);
    }
  });
  
  // Important: Score 5.0-6.5
  Object.entries(score.dimension_scores).forEach(([dimension, value]) => {
    if (value !== undefined && value >= 5.0 && value < 6.5) {
      important.push(`${dimension}: Score ${value}/10 - could be stronger`);
    }
  });
  
  return { critical, important, nice_to_have };
}

/**
 * Generate quality summary
 */
export function generateQualitySummary(score: QualityScore): string {
  const priorities = prioritizeImprovements(score);
  
  let summary = `# PRD Quality Assessment\n\n`;
  summary += `**Overall Score**: ${score.overall_score.toFixed(1)}/10\n\n`;
  
  // Quality tier
  if (score.overall_score >= 8.0) {
    summary += `**Quality Tier**: Excellent ✨\n\n`;
  } else if (score.overall_score >= 7.0) {
    summary += `**Quality Tier**: Good ✅\n\n`;
  } else if (score.overall_score >= 6.0) {
    summary += `**Quality Tier**: Fair ⚠️\n\n`;
  } else {
    summary += `**Quality Tier**: Needs Work ❌\n\n`;
  }
  
  // Dimension scores
  summary += `## Dimension Scores\n\n`;
  Object.entries(score.dimension_scores).forEach(([dimension, value]) => {
    if (value !== undefined) {
      const emoji = value >= 8 ? '🟢' : value >= 6 ? '🟡' : '🔴';
      summary += `- ${emoji} **${dimension}**: ${value.toFixed(1)}/10\n`;
    }
  });
  
  // Critical issues
  if (priorities.critical.length > 0) {
    summary += `\n## Critical Issues (Fix First)\n\n`;
    priorities.critical.forEach(issue => {
      summary += `- ❗ ${issue}\n`;
    });
  }
  
  // Important improvements
  if (priorities.important.length > 0) {
    summary += `\n## Important Improvements\n\n`;
    priorities.important.forEach(issue => {
      summary += `- ⚠️ ${issue}\n`;
    });
  }
  
  // Strengths
  if (score.strengths.length > 0) {
    summary += `\n## Strengths\n\n`;
    score.strengths.forEach(strength => {
      summary += `- ✅ ${strength}\n`;
    });
  }
  
  return summary;
}
