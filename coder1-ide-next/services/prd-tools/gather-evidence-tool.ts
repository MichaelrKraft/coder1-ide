/**
 * Gather Evidence Tool - Market Research Implementation
 * 
 * Uses web search to gather real market data and competitive intelligence.
 * Replaces generic market statements with evidence-backed claims.
 */

import type { AnalysisInsights, MarketEvidence } from './tool-definitions';

/**
 * Build system prompt for evidence gathering
 */
export function buildEvidenceSystemPrompt(): string {
  return `You are a market research analyst specializing in technology products and startups.

Your task is to gather evidence-based market data and competitive intelligence for a product idea.

# Your Research Approach

You will conduct targeted research to support or challenge the product hypothesis with real data.

## What You Must Research

### 1. Market Data
- **Market Size**: Find actual market size numbers (TAM/SAM/SOM)
- **Growth Rate**: Historical and projected growth rates
- **Market Trends**: Current trends shaping the market
- **Sources**: Always cite sources (Gartner, IDC, Statista, etc.)

**Quality Standards**:
- Use recent data (last 2 years preferred)
- Cite authoritative sources (research firms, industry reports)
- Provide specific numbers, not ranges like "billions of dollars"
- Include year and source for every stat

### 2. Competitive Analysis
For each major competitor:
- **Name**: Company/product name
- **Strengths**: What they do well (be specific)
- **Weaknesses**: Where they fail (backed by user complaints)
- **Pricing**: Actual pricing tiers and costs
- **Market Position**: Market share, funding, age

**Research Sources**:
- Company websites for pricing
- G2, Capterra, TrustRadius for user reviews
- Crunchbase for funding and company data
- ProductHunt for new entrants
- Reddit, HackerNews for user sentiment

### 3. Market Gaps
Identify where current solutions fail:
- **Unmet Needs**: What users complain about
- **Underserved Segments**: Who's ignored by current solutions
- **Emerging Opportunities**: New needs from market trends
- **Evidence**: Quotes from user reviews, forums, social media

## Research Strategies

### When You Have Web Search Access:
1. Search for "[category] market size 2024 2025"
2. Search for "[competitor] pricing plans"
3. Search for "[competitor] reviews complaints"
4. Search for "[category] trends 2025"
5. Search for "alternatives to [main competitor]"

### When You DON'T Have Web Search:
Use your knowledge up to January 2025:
- Provide estimates based on similar markets
- Reference known competitors from your training data
- Note limitations and suggest specific research needed
- Be honest about confidence levels

## Critical Thinking

**Red Flags to Watch For**:
- No direct competitors (market might not exist)
- Vague market size ("multi-billion dollar industry")
- All competitors are startups (no proven business model)
- User complaints are generic (no specific pain points)

**Green Flags to Highlight**:
- Clear market size with recent data
- Well-known competitors with real revenue
- Specific user pain points in reviews
- Growing market with concrete trends

# Output Format

You MUST use the gather_prd_evidence tool to return your findings.

Return a structured JSON object:

\`\`\`json
{
  "marketData": {
    "size": "$47B global project management market (Gartner 2024)",
    "growth": "13.7% CAGR 2024-2028 (IDC)",
    "trends": [
      "AI-powered workflow automation",
      "Integration with developer tools",
      "Mobile-first access"
    ],
    "sources": [
      "Gartner Magic Quadrant 2024",
      "IDC Worldwide Project Management Software Forecast"
    ]
  },
  "competitive": {
    "landscape": [
      {
        "name": "Jira",
        "strengths": [
          "Deep Agile workflow support",
          "Extensive integration ecosystem (1000+ apps)",
          "Enterprise-grade security"
        ],
        "weaknesses": [
          "Steep learning curve (67% of users cite complexity)",
          "Slow performance at scale",
          "Expensive for small teams ($7-14/user/mo)"
        ],
        "pricing": "$7.75-$14.53 per user/month"
      }
    ],
    "gaps": [
      "No solution optimized for solo developers",
      "Complex tools overwhelm small teams",
      "Lack of AI-powered automation in existing tools"
    ],
    "positioning": "Position as 'Jira for indie developers' - simpler, faster, AI-powered"
  },
  "evidence": [
    {
      "claim": "Developers frustrated with Jira complexity",
      "support": "67% of G2 reviews mention 'too complex' or 'steep learning curve'",
      "source": "G2 Reviews Analysis (2024)"
    }
  ]
}
\`\`\`

# Key Principles

1. **Be Specific**: "Market size: $47B" not "Large market"
2. **Cite Sources**: Every stat needs a source and year
3. **Be Honest**: If you don't have data, say so
4. **Be Recent**: Prefer 2024-2025 data
5. **Be Skeptical**: Question assumptions with data

Remember: This evidence will back up every claim in the PRD. Quality matters.`;
}

/**
 * Build user prompt for evidence gathering
 */
export function buildEvidenceUserPrompt(
  insights: AnalysisInsights,
  category: string,
  competitors: string[]
): string {
  return `Please gather market evidence and competitive intelligence for this product:

# Product Context

**Category**: ${category}

**Problem Being Solved**: ${insights.problemAnalysis.deep}

**Positioning**: ${insights.marketPosition.positioning}

**Key Differentiators**:
${insights.differentiators.map(d => `• ${d.feature}: ${d.impact}`).join('\n')}

# Competitors to Research

${competitors.length > 0 
  ? competitors.map(c => `• ${c}`).join('\n')
  : '• No specific competitors provided - identify main competitors in this space'
}

# Your Research Tasks

1. **Market Size & Growth**
   - Find TAM/SAM for ${category}
   - Get growth rate and trends
   - Cite specific sources

2. **Competitive Analysis**
   - Research each competitor listed above
   - Find their strengths, weaknesses, pricing
   - Look for user complaints in reviews

3. **Market Gaps**
   - What are users complaining about?
   - What needs are unmet?
   - How does this product fit?

4. **Evidence Collection**
   - Find data that supports OR challenges the product hypothesis
   - Be objective - if the market is crowded, say so
   - If differentiation is weak, say so

# Research Depth

**Level**: Moderate (balance depth with time)

- Spend ~2-3 minutes per competitor
- Focus on most relevant data
- Prioritize recent information

# Important

Use the gather_prd_evidence tool to return structured findings.

Be specific, cite sources, and be honest if data suggests this is a crowded market or weak differentiation.`;
}

/**
 * Post-process evidence results
 */
export function postProcessEvidence(
  rawEvidence: any,
  insights: AnalysisInsights
): MarketEvidence {
  const evidence: MarketEvidence = {
    marketData: {
      size: rawEvidence.marketData?.size || 'Market size data not available',
      growth: rawEvidence.marketData?.growth || 'Growth rate not available',
      trends: Array.isArray(rawEvidence.marketData?.trends) 
        ? rawEvidence.marketData.trends 
        : [],
      sources: Array.isArray(rawEvidence.marketData?.sources) 
        ? rawEvidence.marketData.sources 
        : []
    },
    competitive: {
      landscape: Array.isArray(rawEvidence.competitive?.landscape) 
        ? rawEvidence.competitive.landscape 
        : [],
      gaps: Array.isArray(rawEvidence.competitive?.gaps) 
        ? rawEvidence.competitive.gaps 
        : [],
      positioning: rawEvidence.competitive?.positioning || insights.marketPosition.positioning
    },
    evidence: Array.isArray(rawEvidence.evidence) 
      ? rawEvidence.evidence 
      : []
  };
  
  // Validate evidence quality
  if (evidence.marketData.sources.length === 0) {
    console.warn('No sources cited for market data - evidence quality low');
  }
  
  if (evidence.competitive.landscape.length === 0) {
    console.warn('No competitive landscape data - research incomplete');
  }
  
  if (evidence.evidence.length === 0) {
    console.warn('No specific evidence gathered - claims will be unsupported');
  }
  
  return evidence;
}

/**
 * Validate evidence quality
 */
export function validateEvidenceQuality(evidence: MarketEvidence): {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check market data quality
  if (!evidence.marketData.size.includes('$') && !evidence.marketData.size.includes('billion') && !evidence.marketData.size.includes('million')) {
    issues.push('Market size lacks specific dollar amount');
    suggestions.push('Search for "[category] market size 2024" to find specific numbers');
  }
  
  if (evidence.marketData.sources.length === 0) {
    issues.push('No sources cited for market data');
    suggestions.push('Always cite sources like Gartner, IDC, Statista');
  }
  
  if (evidence.marketData.trends.length === 0) {
    issues.push('No market trends identified');
    suggestions.push('Research current trends shaping the market');
  }
  
  // Check competitive data quality
  if (evidence.competitive.landscape.length === 0) {
    issues.push('No competitors analyzed');
    suggestions.push('Research at least 3-5 main competitors');
  }
  
  for (const comp of evidence.competitive.landscape) {
    if (!comp.pricing || comp.pricing === 'Unknown') {
      issues.push(`Missing pricing for ${comp.name}`);
      suggestions.push(`Visit ${comp.name} website to find pricing`);
    }
    
    if (comp.weaknesses.length === 0) {
      issues.push(`No weaknesses identified for ${comp.name}`);
      suggestions.push(`Check G2/Capterra reviews for ${comp.name} to find user complaints`);
    }
  }
  
  // Check evidence backing
  if (evidence.evidence.length === 0) {
    issues.push('No specific evidence to back claims');
    suggestions.push('Gather user quotes, statistics, or review data to support claims');
  }
  
  for (const ev of evidence.evidence) {
    if (!ev.source || ev.source === 'Unknown') {
      issues.push(`Evidence "${ev.claim}" lacks source`);
      suggestions.push('Cite specific source for every piece of evidence');
    }
  }
  
  // Determine quality score
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  
  if (issues.length === 0) {
    quality = 'excellent';
  } else if (issues.length <= 2) {
    quality = 'good';
  } else if (issues.length <= 4) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }
  
  return { quality, issues, suggestions };
}

/**
 * Generate fallback evidence when web search is unavailable
 */
export function generateFallbackEvidence(
  insights: AnalysisInsights,
  category: string,
  competitors: string[]
): MarketEvidence {
  return {
    marketData: {
      size: `Market size data not available (web search required for ${category} market data)`,
      growth: 'Growth rate requires market research',
      trends: [
        'AI integration becoming standard',
        'Mobile-first usage increasing',
        'API-first architectures preferred'
      ],
      sources: ['General tech trends (2025)', 'Note: Specific market data requires web research']
    },
    competitive: {
      landscape: competitors.map(name => ({
        name,
        strengths: ['Established market presence', 'Large user base'],
        weaknesses: ['Specific weaknesses require user review analysis'],
        pricing: 'Pricing requires competitor website research'
      })),
      gaps: insights.differentiators.map(d => `Opportunity: ${d.feature}`),
      positioning: insights.marketPosition.positioning
    },
    evidence: [
      {
        claim: 'Evidence gathering limited without web search',
        support: 'Recommend manual research for market validation',
        source: 'Automated research system'
      }
    ]
  };
}
