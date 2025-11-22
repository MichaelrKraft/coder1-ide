/**
 * Simple API Executor - Direct Claude API Calls
 * 
 * Uses direct API calls instead of Tool Use API for content generation.
 * Much simpler and more reliable for text generation tasks.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisInsights, MarketEvidence, SectionContent } from './tool-definitions';
import {
  buildSectionSystemPrompt,
  buildSectionUserPrompt
} from './generate-section-tool';

export interface SimpleExecutionResult {
  success: boolean;
  content?: string;
  error?: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  duration: number;
}

export class SimpleAPIExecutor {
  private client: Anthropic;
  private model: string;
  private totalTokensUsed = { input: 0, output: 0, total: 0 };
  
  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  
  /**
   * Generate a single PRD section using direct API call
   */
  async generateSection(
    section: string,
    insights: AnalysisInsights,
    pattern: string,
    evidence?: MarketEvidence
  ): Promise<SimpleExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Build prompts (reuse existing prompt builders)
      const systemPrompt = buildSectionSystemPrompt(section, pattern, !!evidence);
      const userPrompt = buildSectionUserPrompt(section, insights, evidence, pattern);
      
      // Add instruction to output clean markdown
      const enhancedUserPrompt = `${userPrompt}

IMPORTANT: Respond with ONLY the markdown content for this section. Do not include any preamble, explanation, or JSON formatting. Just write the section content directly.`;
      
      // Direct API call - no tools, just content generation
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.7, // Slightly higher for creative writing
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: enhancedUserPrompt
          }
        ]
      });
      
      // Extract text content from response
      const textBlock = response.content.find(block => block.type === 'text');
      
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in response');
      }
      
      const content = textBlock.text;
      const duration = Date.now() - startTime;
      const tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens
      };
      
      this.updateTokenUsage(tokensUsed);
      
      return {
        success: true,
        content,
        tokensUsed,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ Section generation failed for '${section}':`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensUsed: { input: 0, output: 0, total: 0 },
        duration
      };
    }
  }
  
  /**
   * Generate multiple sections in parallel
   */
  async generateSectionsParallel(
    sections: Array<{
      section: string;
      insights: AnalysisInsights;
      pattern: string;
      evidence?: MarketEvidence;
    }>
  ): Promise<SimpleExecutionResult[]> {
    return Promise.all(
      sections.map(({ section, insights, pattern, evidence }) =>
        this.generateSection(section, insights, pattern, evidence)
      )
    );
  }
  
  /**
   * Update total token usage
   */
  private updateTokenUsage(tokens: { input: number; output: number; total: number }) {
    this.totalTokensUsed.input += tokens.input;
    this.totalTokensUsed.output += tokens.output;
    this.totalTokensUsed.total += tokens.total;
  }
  
  /**
   * Get total token usage
   */
  getTokenUsage() {
    return { ...this.totalTokensUsed };
  }
  
  /**
   * Reset token usage counter
   */
  resetTokenUsage() {
    this.totalTokensUsed = { input: 0, output: 0, total: 0 };
  }
}

/**
 * Convert simple API result to SectionContent format
 */
export function convertToSectionContent(
  result: SimpleExecutionResult,
  sectionName: string
): SectionContent {
  if (!result.success || !result.content) {
    return {
      content: `# ${sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n*Section generation failed*`,
      quality_score: 0,
      suggestions: [result.error || 'Generation failed'],
      word_count: 0
    };
  }
  
  const content = result.content;
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  
  // Basic quality assessment
  let qualityScore = 7.0; // Default
  const suggestions: string[] = [];
  
  if (wordCount < 200) {
    qualityScore -= 2;
    suggestions.push('Section is too short - needs more detail');
  }
  
  if (!content.includes('#')) {
    qualityScore -= 1;
    suggestions.push('Missing markdown headers');
  }
  
  if (wordCount > 1000) {
    qualityScore += 1;
  }
  
  return {
    content,
    quality_score: Math.max(1, Math.min(10, qualityScore)),
    suggestions,
    word_count: wordCount
  };
}
