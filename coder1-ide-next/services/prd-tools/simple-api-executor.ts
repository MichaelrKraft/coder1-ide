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
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  postProcessAnalysis
} from './analyze-answers-tool';

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
  
  constructor(apiKey: string, model = 'claude-sonnet-4-6-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    console.error('[RENDER-DEBUG] SimpleAPIExecutor initialized with model:', model);
    console.error('[RENDER-DEBUG] API Key present:', !!apiKey);
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
        system: [{
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }],
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
   * Analyze answers using direct API call (replaces Tool Use API)
   */
  async analyzeAnswers(
    answers: any,
    pattern: string,
    mode: 'quick' | 'professional'
  ): Promise<SimpleExecutionResult> {
    const startTime = Date.now();
    console.error('[RENDER-DEBUG] Starting analysis - START TIME:', startTime);
    console.error('[RENDER-DEBUG] Starting analysis - pattern:', pattern);
    console.error('[RENDER-DEBUG] Starting analysis - mode:', mode);
    
    try {
      // Build prompts using existing builders
      const systemPrompt = buildAnalysisSystemPrompt(pattern, mode);
      const userPrompt = buildAnalysisUserPrompt(answers, pattern);
      
      // Add instruction to output clean JSON
      const enhancedUserPrompt = `${userPrompt}

IMPORTANT: Respond with ONLY a valid JSON object matching the AnalysisInsights structure described in the system prompt. Do not include any preamble, explanation, markdown formatting, or code blocks. Just output the raw JSON object with your actual analysis.`;
      
      // Direct API call with extended thinking for Professional mode
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 3072, // Sufficient for JSON insights (reduced from 8192 for speed)
        temperature: 0.5, // Balanced for speed and JSON quality (increased from 0.3)
        system: [{
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }],
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
      const endTime = Date.now();
      const duration = endTime - startTime;
      const tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens
      };
      
      console.error('[RENDER-DEBUG] Analysis API call finished - END TIME:', endTime);
      console.error('[RENDER-DEBUG] Analysis API call finished - DURATION MS:', duration);
      console.error('[RENDER-DEBUG] Analysis API call finished - DURATION SECONDS:', Math.round(duration / 1000));
      console.error('[RENDER-DEBUG] Analysis completed - Tokens total:', tokensUsed.total);
      console.error('[RENDER-DEBUG] Analysis completed - Tokens in:', tokensUsed.input);
      console.error('[RENDER-DEBUG] Analysis completed - Tokens out:', tokensUsed.output);
      console.error('[RENDER-DEBUG] Analysis completed - Content length:', content.length);
      
      this.updateTokenUsage(tokensUsed);
      
      return {
        success: true,
        content,
        tokensUsed,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[RENDER-DEBUG] Analysis failed after ${duration}ms:`, error);
      console.error(`❌ Answer analysis failed:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensUsed: { input: 0, output: 0, total: 0 },
        duration
      };
    }
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

/**
 * Convert simple API analysis result to AnalysisInsights format
 */
export function convertToAnalysisInsights(
  result: SimpleExecutionResult,
  answers: any,
  pattern: string
): AnalysisInsights {
  if (!result.success || !result.content) {
    // Return minimal insights on failure
    return {
      problemAnalysis: {
        surface: 'Analysis failed',
        deep: result.error || 'Could not analyze answers',
        whyItMatters: 'Unable to determine impact'
      },
      marketPosition: {
        category: 'Unknown',
        positioning: 'Unable to analyze',
        differentiation: 'Analysis incomplete'
      },
      differentiators: [],
      risks: [],
      recommendations: [],
      confidence: 0.1,
      gaps: ['Analysis failed - manual review required']
    };
  }
  
  try {
    // Parse JSON response
    let jsonContent = result.content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    }
    
    const rawAnalysis = JSON.parse(jsonContent);
    
    // Use existing post-processor for validation and normalization
    return postProcessAnalysis(rawAnalysis, answers, pattern);
    
  } catch (error) {
    console.error('❌ Failed to parse analysis JSON:', error);
    console.error('   Raw content:', result.content.substring(0, 500));
    
    // Return minimal insights on parse failure
    return {
      problemAnalysis: {
        surface: 'JSON parse failed',
        deep: error instanceof Error ? error.message : 'Could not parse response',
        whyItMatters: 'Unable to extract insights'
      },
      marketPosition: {
        category: 'Unknown',
        positioning: 'Parse error',
        differentiation: 'Unable to analyze'
      },
      differentiators: [],
      risks: [],
      recommendations: [],
      confidence: 0.1,
      gaps: ['JSON parsing failed - check response format']
    };
  }
}
