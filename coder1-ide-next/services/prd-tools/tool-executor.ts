/**
 * PRD Tool Executor
 * 
 * Handles execution of Claude Tool Use API calls for PRD generation.
 * Manages extended thinking modes, token tracking, and error handling.
 * 
 * Usage:
 *   const executor = new ToolExecutor(apiKey);
 *   const result = await executor.execute('analyze_answers_deeply', params);
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ToolDefinition,
  AnalysisInsights,
  MarketEvidence,
  SectionContent,
  QualityScore
} from './tool-definitions';
import { prdTools, getToolByName, validateToolInput } from './tool-definitions';
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  postProcessAnalysis
} from './analyze-answers-tool';
import {
  buildEvidenceSystemPrompt,
  buildEvidenceUserPrompt,
  postProcessEvidence
} from './gather-evidence-tool';
import {
  buildSectionSystemPrompt,
  buildSectionUserPrompt,
  postProcessSection
} from './generate-section-tool';
import {
  buildQualityScoringPrompt,
  buildQualityScoringUserPrompt,
  postProcessQualityScore
} from './score-quality-tool';

export interface ToolExecutionOptions {
  thinkingMode?: 'none' | 'think' | 'think hard' | 'think harder' | 'ultrathink';
  maxTokens?: number;
  temperature?: number;
  model?: string;
  timeout?: number;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    toolName: string;
    thinkingMode: string;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    duration: number;
    timestamp: string;
  };
}

export class ToolExecutor {
  private client: Anthropic;
  private model: string;
  private totalTokensUsed = { input: 0, output: 0, total: 0 };
  
  constructor(apiKey: string, model = 'claude-sonnet-4-6-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  
  /**
   * Execute a tool with given parameters
   */
  async execute<T = any>(
    toolName: string,
    parameters: any,
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionResult<T>> {
    const startTime = Date.now();
    
    try {
      // Validate tool exists
      const tool = getToolByName(toolName);
      if (!tool) {
        return this.errorResult(toolName, `Tool '${toolName}' not found`, 0);
      }
      
      // Validate input
      const validation = validateToolInput(toolName, parameters);
      if (!validation.valid) {
        return this.errorResult(
          toolName,
          `Invalid parameters: ${validation.errors.join(', ')}`,
          0
        );
      }
      
      // Prepare the message with tool use
      const message = await this.callClaudeWithTool(tool, parameters, options);
      
      // Extract tool result from response
      const result = this.extractToolResult(message, toolName, parameters);
      
      // Calculate duration and update token usage
      const duration = Date.now() - startTime;
      const tokensUsed = {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        total: message.usage.input_tokens + message.usage.output_tokens
      };
      
      this.updateTokenUsage(tokensUsed);
      
      return {
        success: true,
        data: result as T,
        metadata: {
          toolName,
          thinkingMode: options.thinkingMode || 'none',
          tokensUsed,
          duration,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log comprehensive error details
      console.error(`❌ Tool execution error for '${toolName}':`, error);
      console.error(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`   Parameters sent:`, JSON.stringify(parameters, null, 2));
      if (error instanceof Error && error.stack) {
        console.error(`   Stack trace:`, error.stack);
      }
      
      return this.errorResult(
        toolName,
        error instanceof Error ? error.message : 'Unknown error',
        duration
      );
    }
  }
  
  /**
   * Call Claude API with tool use
   */
  private async callClaudeWithTool(
    tool: ToolDefinition,
    parameters: any,
    options: ToolExecutionOptions
  ) {
    const systemPrompt = this.buildSystemPrompt(tool, options.thinkingMode, parameters);
    const userPrompt = this.buildUserPrompt(tool, parameters);
    
    try {
      const response = await this.client.messages.create({
        model: options.model || this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0, // Use 0 for consistency
        system: [{
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }],
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ],
        tools: [tool],
        tool_choice: {
          type: 'tool',
          name: tool.name
        }
      });
      
      return response;
    } catch (error) {
      console.error(`❌ Anthropic API call failed for tool '${tool.name}':`, error);
      console.error(`   Model: ${options.model || this.model}`);
      console.error(`   Max tokens: ${options.maxTokens || 4096}`);
      console.error(`   Tool name: ${tool.name}`);
      console.error(`   Parameters:`, JSON.stringify(parameters, null, 2));
      throw error;
    }
  }
  
  /**
   * Build system prompt based on tool and thinking mode
   */
  private buildSystemPrompt(
    tool: ToolDefinition,
    thinkingMode?: string,
    parameters?: any
  ): string {
    // Use tool-specific prompt builders
    switch (tool.name) {
      case 'analyze_answers_deeply':
        return buildAnalysisSystemPrompt(
          parameters?.pattern || 'stripe-saas',
          parameters?.mode || 'quick'
        );
      
      case 'gather_prd_evidence':
        return buildEvidenceSystemPrompt();
      
      case 'generate_prd_section':
        return buildSectionSystemPrompt(
          parameters?.section || 'executive_summary',
          parameters?.pattern || 'stripe-saas',
          !!parameters?.evidence
        );
      
      case 'score_prd_quality':
        return buildQualityScoringPrompt();
      
      default:
        // Fallback to generic prompt
        let prompt = `You are a senior product manager with expertise in writing professional Product Requirements Documents.

Your task is to use the '${tool.name}' tool to accomplish the requested analysis or generation.

${tool.description}`;
        
        // Add extended thinking instruction if specified
        if (thinkingMode && thinkingMode !== 'none') {
          prompt += `\n\n<thinking_mode>
Use extended thinking mode: "${thinkingMode}"

This means you should:
- Take time to deeply analyze the problem
- Consider multiple perspectives and alternatives
- Identify non-obvious insights and risks
- Provide well-reasoned, thorough responses
- Show your reasoning process
</thinking_mode>`;
        }
        
        prompt += `\n\nIMPORTANT: 
- Always use the ${tool.name} tool to provide your response
- Be specific and actionable in your output
- Back up claims with reasoning
- Identify gaps in information when relevant`;
        
        return prompt;
    }
  }
  
  /**
   * Build user prompt with parameters
   */
  private buildUserPrompt(tool: ToolDefinition, parameters: any): string {
    // Use tool-specific user prompt builders
    switch (tool.name) {
      case 'analyze_answers_deeply':
        return buildAnalysisUserPrompt(
          parameters.answers,
          parameters.pattern
        );
      
      case 'gather_prd_evidence':
        return buildEvidenceUserPrompt(
          parameters.insights,
          parameters.category,
          parameters.competitors || []
        );
      
      case 'generate_prd_section':
        return buildSectionUserPrompt(
          parameters.section,
          parameters.insights,
          parameters.evidence,
          parameters.pattern
        );
      
      case 'score_prd_quality':
        return buildQualityScoringUserPrompt(
          parameters.prd,
          parameters.criteria || [],
          parameters.target_score || 8.0
        );
      
      default:
        // Fallback to generic prompt
        return `Please use the '${tool.name}' tool with the following parameters:

${JSON.stringify(parameters, null, 2)}

Execute the tool now.`;
    }
  }
  
  /**
   * Extract tool result from Claude response
   */
  private extractToolResult(message: any, toolName: string, parameters?: any): any {
    // Find the tool use content block
    const toolUseBlock = message.content.find(
      (block: any) => block.type === 'tool_use' && block.name === toolName
    );
    
    if (!toolUseBlock) {
      console.error(`❌ Tool '${toolName}' was not invoked in Claude response`);
      console.error(`   Expected tool: ${toolName}`);
      console.error(`   Message content blocks:`, JSON.stringify(message.content.map((b: any) => ({ type: b.type, name: b.name || 'N/A' })), null, 2));
      console.error(`   Full message:`, JSON.stringify(message, null, 2));
      throw new Error(`Tool '${toolName}' was not invoked in response`);
    }
    
    const rawResult = toolUseBlock.input;
    
    // Log what we received from the tool (using console.error so it shows in Render logs)
    console.error(`✅ Tool '${toolName}' invoked successfully`);
    console.error(`   Raw result keys:`, Object.keys(rawResult || {}).join(', '));
    if (rawResult && typeof rawResult === 'object') {
      console.error(`   Result preview:`, JSON.stringify(rawResult).substring(0, 200) + '...');
    }
    
    // Apply tool-specific post-processing
    switch (toolName) {
      case 'analyze_answers_deeply':
        return postProcessAnalysis(
          rawResult,
          parameters?.answers || {},
          parameters?.pattern || 'stripe-saas'
        );
      
      case 'gather_prd_evidence':
        return postProcessEvidence(
          rawResult,
          parameters?.insights
        );
      
      case 'generate_prd_section':
        return postProcessSection(
          rawResult,
          parameters?.section || 'unknown'
        );
      
      case 'score_prd_quality':
        return postProcessQualityScore(rawResult);
      
      default:
        return rawResult;
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
  
  /**
   * Create error result
   */
  private errorResult(toolName: string, error: string, duration: number): ToolExecutionResult {
    return {
      success: false,
      error,
      metadata: {
        toolName,
        thinkingMode: 'none',
        tokensUsed: { input: 0, output: 0, total: 0 },
        duration,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Execute multiple tools in sequence with data passing
   */
  async executeChain(
    steps: Array<{
      tool: string;
      params: any | ((previousResult: any) => any);
      options?: ToolExecutionOptions;
    }>
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    let previousResult: any = null;
    
    for (const step of steps) {
      // Allow params to be a function that uses previous result
      const params = typeof step.params === 'function'
        ? step.params(previousResult)
        : step.params;
      
      const result = await this.execute(step.tool, params, step.options);
      results.push(result);
      
      if (!result.success) {
        break; // Stop chain on error
      }
      
      previousResult = result.data;
    }
    
    return results;
  }
  
  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(
    executions: Array<{
      tool: string;
      params: any;
      options?: ToolExecutionOptions;
    }>
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(
      executions.map(exec => this.execute(exec.tool, exec.params, exec.options))
    );
  }
}

/**
 * Convenience functions for specific tools
 */

export async function analyzeAnswers(
  executor: ToolExecutor,
  answers: any,
  pattern: string,
  mode: 'quick' | 'professional'
): Promise<ToolExecutionResult<AnalysisInsights>> {
  const thinkingMode = mode === 'professional' ? 'ultrathink' : 'think hard';
  
  return executor.execute<AnalysisInsights>(
    'analyze_answers_deeply',
    {
      answers,
      pattern,
      mode,
      thinking_budget: thinkingMode
    },
    { thinkingMode }
  );
}

export async function gatherEvidence(
  executor: ToolExecutor,
  insights: AnalysisInsights,
  category: string,
  competitors: string[]
): Promise<ToolExecutionResult<MarketEvidence>> {
  return executor.execute<MarketEvidence>(
    'gather_prd_evidence',
    {
      insights,
      category,
      competitors,
      research_depth: 'moderate'
    },
    { thinkingMode: 'think' }
  );
}

export async function generateSection(
  executor: ToolExecutor,
  section: string,
  insights: AnalysisInsights,
  pattern: string,
  evidence?: MarketEvidence
): Promise<ToolExecutionResult<SectionContent>> {
  return executor.execute<SectionContent>(
    'generate_prd_section',
    {
      section,
      insights,
      evidence,
      pattern,
      length: 'standard'
    },
    { thinkingMode: 'think hard' }
  );
}

export async function scorePRDQuality(
  executor: ToolExecutor,
  prd: string
): Promise<ToolExecutionResult<QualityScore>> {
  return executor.execute<QualityScore>(
    'score_prd_quality',
    {
      prd,
      criteria: ['completeness', 'evidence', 'excitement', 'clarity', 'actionability'],
      target_score: 8.0
    },
    { thinkingMode: 'think' }
  );
}

/**
 * Calculate estimated cost for tool execution
 */
export function estimateToolCost(tokens: { input: number; output: number }): number {
  // Claude Sonnet 4 pricing (as of Nov 2025)
  const INPUT_COST_PER_M = 3.00;  // $3 per million input tokens
  const OUTPUT_COST_PER_M = 15.00; // $15 per million output tokens
  
  const inputCost = (tokens.input / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (tokens.output / 1_000_000) * OUTPUT_COST_PER_M;
  
  return inputCost + outputCost;
}
