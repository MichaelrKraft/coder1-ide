/**
 * Generate Section Tool - Intelligent Content Generation
 * 
 * Creates evidence-based, compelling PRD section content.
 * Replaces template substitution with genuine strategic writing.
 */

import type { AnalysisInsights, MarketEvidence, SectionContent } from './tool-definitions';

/**
 * Section-specific writing guidance
 */
const SECTION_GUIDES = {
  executive_summary: {
    purpose: 'Hook the reader and make them excited about the product',
    length: '1-2 pages',
    mustInclude: [
      'Product vision (one sentence)',
      'Problem being solved (why it matters)',
      'Key differentiator (what makes this special)',
      'Target market (who this is for)',
      'Success metrics (what winning looks like)'
    ],
    tone: 'Compelling and confident, but grounded in reality',
    pitfalls: [
      'Avoid generic mission statements',
      'Don\'t oversell - be honest about scope',
      'Skip the "revolutionize" language unless you mean it'
    ]
  },
  
  problem_statement: {
    purpose: 'Make the reader feel the pain of the current situation',
    length: '1 page',
    mustInclude: [
      'Current state (how people solve this today)',
      'Pain points (what\'s broken)',
      'Impact (why this matters)',
      'Evidence (data, quotes, examples)',
      'Why now (what\'s changed to make this solvable)'
    ],
    tone: 'Empathetic but analytical',
    pitfalls: [
      'Avoid creating a problem that doesn\'t exist',
      'Don\'t be vague ("users are frustrated")',
      'Include specific examples and data'
    ]
  },
  
  solution_overview: {
    purpose: 'Show how the product elegantly solves the problem',
    length: '1-2 pages',
    mustInclude: [
      'Core solution approach',
      'Key capabilities',
      'How it\'s different from alternatives',
      'User flow at high level',
      'Why this approach works'
    ],
    tone: 'Clear and confident',
    pitfalls: [
      'Don\'t jump into features yet',
      'Stay high-level, not implementation details',
      'Focus on "what" not "how"'
    ]
  },
  
  target_audience: {
    purpose: 'Define exactly who this is for (and who it\'s NOT for)',
    length: '1 page',
    mustInclude: [
      'Primary persona(s) with specific details',
      'Their current workflow/pain',
      'What they care about',
      'What they\'re willing to pay',
      'Market size estimation'
    ],
    tone: 'Specific and empathetic',
    pitfalls: [
      'Avoid "everyone" as target market',
      'Be specific: job titles, use cases, workflows',
      'Include negative space (who this is NOT for)'
    ]
  },
  
  core_features: {
    purpose: 'Define what goes in v1 and justify each feature',
    length: '2-3 pages',
    mustInclude: [
      'P0 must-have features with justification',
      'P1 should-have features',
      'Explicitly out of scope for v1',
      'User stories for each feature',
      'Success criteria'
    ],
    tone: 'Specific and prioritized',
    pitfalls: [
      'Avoid feature sprawl',
      'Every feature needs justification',
      'Be ruthless about scope'
    ]
  },
  
  technical_architecture: {
    purpose: 'Outline the technical approach at high level',
    length: '2-3 pages',
    mustInclude: [
      'Recommended tech stack with rationale',
      'Architecture pattern',
      'Key technical decisions',
      'Scalability approach',
      'Security considerations',
      'Third-party integrations'
    ],
    tone: 'Technical but accessible',
    pitfalls: [
      'Don\'t over-specify implementation',
      'Focus on architectural decisions, not code',
      'Justify technical choices'
    ]
  },
  
  implementation_roadmap: {
    purpose: 'Show realistic timeline and milestones',
    length: '1-2 pages',
    mustInclude: [
      'Phased approach (MVP, v1.1, v2)',
      'Timeline estimates (with buffer)',
      'Key milestones',
      'Dependencies and risks',
      'Team composition needed'
    ],
    tone: 'Realistic and structured',
    pitfalls: [
      'Avoid overly optimistic timelines',
      'Build in buffer (30% minimum)',
      'Account for unexpected issues'
    ]
  },
  
  risk_assessment: {
    purpose: 'Identify and plan for what could go wrong',
    length: '1 page',
    mustInclude: [
      'Technical risks',
      'Market risks',
      'Competitive risks',
      'Execution risks',
      'Mitigation strategies'
    ],
    tone: 'Honest and proactive',
    pitfalls: [
      'Don\'t sugarcoat risks',
      'Include real mitigation strategies',
      'Address the elephant in the room'
    ]
  },
  
  success_metrics: {
    purpose: 'Define what success looks like with numbers',
    length: '1 page',
    mustInclude: [
      'North star metric',
      'Key performance indicators (KPIs)',
      'Target numbers with timeline',
      'How to measure',
      'Early warning indicators'
    ],
    tone: 'Specific and measurable',
    pitfalls: [
      'Avoid vanity metrics',
      'Be specific with numbers',
      'Include timeline (when you\'ll hit targets)'
    ]
  },
  
  business_model: {
    purpose: 'Explain how this makes money',
    length: '1-2 pages',
    mustInclude: [
      'Revenue model',
      'Pricing strategy with justification',
      'Unit economics',
      'Path to profitability',
      'Competitive pricing comparison'
    ],
    tone: 'Realistic and data-driven',
    pitfalls: [
      'Don\'t ignore monetization',
      'Justify pricing with comp research',
      'Include CAC and LTV estimates'
    ]
  },
  
  competitive_analysis: {
    purpose: 'Position against alternatives with honesty',
    length: '1-2 pages',
    mustInclude: [
      'Competitive landscape table',
      'Direct competitors',
      'Indirect competitors/workarounds',
      'Competitive advantages',
      'Risks from competition'
    ],
    tone: 'Analytical and honest',
    pitfalls: [
      'Don\'t dismiss competitors',
      'Be honest about their strengths',
      'Show why you\'ll win anyway'
    ]
  },
  
  go_to_market: {
    purpose: 'Outline how to get first users and grow',
    length: '1-2 pages',
    mustInclude: [
      'Launch strategy',
      'Customer acquisition channels',
      'Messaging and positioning',
      'Pricing and packaging',
      'Success metrics'
    ],
    tone: 'Strategic and actionable',
    pitfalls: [
      'Don\'t say "build it and they\'ll come"',
      'Be specific about channels',
      'Include budget estimates'
    ]
  }
};

/**
 * Build system prompt for section generation
 */
export function buildSectionSystemPrompt(
  section: string,
  pattern: string,
  hasEvidence: boolean
): string {
  const guide = SECTION_GUIDES[section as keyof typeof SECTION_GUIDES];
  
  if (!guide) {
    return buildGenericSectionPrompt(section, pattern, hasEvidence);
  }
  
  return `You are a senior product manager writing a professional Product Requirements Document.

Your task is to write the **${section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}** section.

# Section Guidelines

**Purpose**: ${guide.purpose}

**Target Length**: ${guide.length}

**Must Include**:
${guide.mustInclude.map(item => `• ${item}`).join('\n')}

**Tone**: ${guide.tone}

**Common Pitfalls to Avoid**:
${guide.pitfalls.map(p => `• ${p}`).join('\n')}

# Writing Principles

## 1. Be Specific
- Use concrete examples, not generic statements
- Include numbers, metrics, data points
- Name specific tools, competitors, technologies
- Quote real user feedback when available

## 2. Be Evidence-Based
${hasEvidence ? `
You have market evidence and competitive research. USE IT!
- Cite specific data points
- Reference competitor analysis
- Include market size numbers
- Support claims with sources
` : `
You don't have market evidence, so:
- Be honest about assumptions
- Recommend specific research needed
- Use qualitative insights from analysis
- Focus on logical reasoning
`}

## 3. Be Compelling
- Start with a hook that grabs attention
- Use specific examples that resonate
- Show don't tell (paint a picture)
- End with clear takeaways

## 4. Be Honest
- Don't oversell or exaggerate
- Acknowledge limitations and risks
- If differentiation is weak, pivot the angle
- If market is crowded, show the gap

## 5. Be Pattern-Aware
Follow the **${pattern}** pattern best practices:
- Reference successful companies in this pattern
- Use their approaches as inspiration
- Learn from their mistakes
- Adapt their strategies

# Output Format

You MUST use the generate_prd_section tool to return your content.

Return a structured JSON object:

\`\`\`json
{
  "content": "# Section Title\\n\\nYour markdown content here...",
  "quality_score": 8.5,  // Self-assess quality (1-10)
  "suggestions": [
    "Could include more specific examples",
    "Recommend adding competitive pricing data"
  ],
  "word_count": 450
}
\`\`\`

# Markdown Formatting

Use clean, professional markdown:
- \`#\` for section title
- \`##\` for subsections
- \`###\` for sub-subsections
- \`**bold**\` for emphasis
- \`*italics*\` for supporting details
- Bullet lists for clarity
- Tables for comparisons
- Code blocks for technical specs

# Quality Standards

Your section should:
- ✅ Read like it was written by a senior PM
- ✅ Include specific, actionable content
- ✅ Be properly formatted in markdown
- ✅ Flow naturally to next section
- ✅ Make the reader excited to build this

Remember: This section will be read by engineers, designers, and stakeholders. Make it count.`;
}

/**
 * Generic section prompt for unknown sections
 */
function buildGenericSectionPrompt(section: string, pattern: string, hasEvidence: boolean): string {
  return `You are writing the **${section.replace(/_/g, ' ')}** section of a PRD.

Follow these principles:
- Be specific and actionable
- Use evidence and data when available
- Write in professional markdown format
- Follow ${pattern} pattern best practices

Use the generate_prd_section tool to return your content.`;
}

/**
 * Build user prompt for section generation
 */
export function buildSectionUserPrompt(
  section: string,
  insights: AnalysisInsights,
  evidence: MarketEvidence | undefined,
  pattern: string
): string {
  const sectionTitle = section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  let prompt = `Please write the **${sectionTitle}** section of the PRD.

# Analysis Insights

**Problem**: ${insights.problemAnalysis.deep}

**Why It Matters**: ${insights.problemAnalysis.whyItMatters}

**Positioning**: ${insights.marketPosition.positioning}

**Differentiation**: ${insights.marketPosition.differentiation}

**Key Differentiators**:
${insights.differentiators.map(d => `• ${d.feature}: ${d.impact}`).join('\n') || '• No clear differentiators identified'}

**Risks**:
${insights.risks.map(r => `• ${r.risk} (${r.likelihood} likelihood, ${r.impact} impact)`).join('\n') || '• No risks identified'}

**Recommendations**:
${insights.recommendations.filter(r => r.priority === 'must-have').map(r => `• ${r.recommendation}`).join('\n') || '• No specific recommendations'}

`;

  if (evidence) {
    prompt += `
# Market Evidence

**Market Size**: ${evidence.marketData.size}
**Growth Rate**: ${evidence.marketData.growth}
**Trends**: ${evidence.marketData.trends.join(', ')}

**Competitors**:
${evidence.competitive.landscape.map(c => `
• **${c.name}**
  - Strengths: ${c.strengths.join(', ')}
  - Weaknesses: ${c.weaknesses.join(', ')}
  - Pricing: ${c.pricing}
`).join('\n')}

**Market Gaps**: ${evidence.competitive.gaps.join(', ')}

**Evidence**:
${evidence.evidence.map(e => `• ${e.claim} (${e.source})`).join('\n')}

`;
  } else {
    prompt += `
# Market Evidence

*No market evidence available - focus on insights and logical reasoning*

`;
  }

  prompt += `
# Your Task

Write a compelling, specific, evidence-based **${sectionTitle}** section.

Use the generate_prd_section tool to return your content.

**Important**: 
- Make this section specific to THIS product
- Use the insights and evidence provided
- Follow the section guidelines
- Be honest about gaps or limitations

Quality matters. Take time to write well.`;

  return prompt;
}

/**
 * Post-process section content
 */
export function postProcessSection(
  rawSection: any,
  sectionName: string
): SectionContent {
  const content = rawSection.content || `# ${sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n*Section generation failed*`;
  
  // Count words (rough estimate)
  const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
  
  // Validate content quality
  const qualityIssues: string[] = [];
  
  if (content.length < 200) {
    qualityIssues.push('Content too short - needs more detail');
  }
  
  if (!content.includes('#')) {
    qualityIssues.push('Missing markdown headers');
  }
  
  if (content.includes('{{') || content.includes('}}')) {
    qualityIssues.push('Contains template variables - not properly generated');
  }
  
  // Generic phrases that indicate low-quality templating
  const genericPhrases = [
    'revolutionize the industry',
    'game-changing solution',
    'cutting-edge technology',
    'best-in-class',
    'world-class'
  ];
  
  for (const phrase of genericPhrases) {
    if (content.toLowerCase().includes(phrase)) {
      qualityIssues.push(`Contains generic phrase: "${phrase}"`);
    }
  }
  
  const section: SectionContent = {
    content,
    quality_score: rawSection.quality_score || (qualityIssues.length > 0 ? 6.0 : 8.0),
    suggestions: [...(rawSection.suggestions || []), ...qualityIssues],
    word_count: wordCount
  };
  
  return section;
}

/**
 * Validate section meets minimum quality standards
 */
export function validateSectionQuality(section: SectionContent): {
  passesMinimum: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (section.word_count < 100) {
    issues.push('Section too short (< 100 words)');
  }
  
  if (section.quality_score < 6.0) {
    issues.push('Quality score below minimum (< 6.0)');
  }
  
  if (!section.content.includes('##')) {
    issues.push('Missing subsection structure');
  }
  
  if (section.content.includes('*Section generation failed*')) {
    issues.push('Section generation failed');
  }
  
  return {
    passesMinimum: issues.length === 0,
    issues
  };
}
