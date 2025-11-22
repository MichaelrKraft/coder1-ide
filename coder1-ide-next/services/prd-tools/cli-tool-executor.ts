/**
 * CLI Tool Executor - Uses Claude Code CLI Instead of API
 * 
 * This executor uses the free Claude Code CLI (with OAuth token) instead of
 * the paid Anthropic API. It simulates tool use by sending carefully crafted
 * prompts to Claude via the CLI and parsing the responses.
 * 
 * Benefits:
 * - 100% FREE (no API costs)
 * - Uses existing OAuth authentication
 * - Same quality as API-based approach
 * 
 * Tradeoffs:
 * - Slightly slower (CLI overhead)
 * - Response parsing needed
 * - No native tool use (simulated via prompts)
 */

import { spawn } from 'child_process';
import type {
  ToolDefinition,
  AnalysisInsights,
  MarketEvidence,
  SectionContent,
  QualityScore
} from './tool-definitions';
import { getToolByName, validateToolInput } from './tool-definitions';
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

export interface CLIToolExecutionOptions {
  thinkingMode?: 'none' | 'think' | 'think hard' | 'think harder' | 'ultrathink';
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  claudeCliPath?: string;
}

export interface CLIToolExecutionResult<T = any> {
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

export class CLIToolExecutor {
  private claudeCliPath: string;
  private totalTokensUsed = { input: 0, output: 0, total: 0 };
  
  constructor(options: { claudeCliPath?: string } = {}) {
    this.claudeCliPath = options.claudeCliPath || '/opt/homebrew/bin/claude';
  }
  
  /**
   * Execute a tool using Claude Code CLI
   */
  async execute<T = any>(
    toolName: string,
    parameters: any,
    options: CLIToolExecutionOptions = {}
  ): Promise<CLIToolExecutionResult<T>> {
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
      
      // Build prompts
      const systemPrompt = this.buildSystemPrompt(tool, options.thinkingMode, parameters);
      const userPrompt = this.buildUserPrompt(tool, parameters);
      
      // Combine into single prompt for CLI
      const fullPrompt = this.combinePrompts(systemPrompt, userPrompt, toolName);
      
      // Call Claude CLI
      const response = await this.callClaudeCLI(fullPrompt, options);
      
      // Parse response into tool output format
      const result = this.parseToolResponse(response, toolName, parameters);
      
      // Estimate token usage (CLI doesn't provide this)
      const tokensUsed = this.estimateTokens(fullPrompt, response);
      
      const duration = Date.now() - startTime;
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
      return this.errorResult(
        toolName,
        error instanceof Error ? error.message : 'Unknown error',
        duration
      );
    }
  }
  
  /**
   * Build system prompt based on tool
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
        return tool.description;
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
        return JSON.stringify(parameters, null, 2);
    }
  }
  
  /**
   * Combine system and user prompts for CLI
   */
  private combinePrompts(systemPrompt: string, userPrompt: string, toolName: string): string {
    return `${systemPrompt}

---

${userPrompt}

---

IMPORTANT: Respond with a valid JSON object that matches this tool's expected output format. Do not include any text before or after the JSON.`;
  }
  
  /**
   * Call Claude CLI with prompt
   */
  private callClaudeCLI(prompt: string, options: CLIToolExecutionOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['--print'];
      
      // Note: Claude CLI does not support thinking mode flags
      // The CLI automatically optimizes response quality without flags
      
      const claude = spawn(this.claudeCliPath, args, {
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      const timeout = setTimeout(() => {
        claude.kill();
        reject(new Error(`CLI execution timeout after ${options.timeout || 300000}ms`));
      }, options.timeout || 300000);
      
      claude.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      claude.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      claude.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}: ${errorOutput}`));
        } else {
          resolve(output);
        }
      });
      
      claude.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      
      // Send prompt to stdin
      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }
  
  /**
   * Parse tool response from CLI output
   */
  private parseToolResponse(response: string, toolName: string, parameters?: any): any {
    // Remove markdown code fences if present
    let cleanedResponse = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Try to extract JSON from response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude CLI response');
    }
    
    let rawResult: any;
    try {
      rawResult = JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error('Invalid JSON in Claude CLI response');
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
   * Estimate token usage (rough approximation)
   */
  private estimateTokens(prompt: string, response: string): {
    input: number;
    output: number;
    total: number;
  } {
    // Rough estimation: ~4 characters per token
    const input = Math.ceil(prompt.length / 4);
    const output = Math.ceil(response.length / 4);
    
    return {
      input,
      output,
      total: input + output
    };
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
  private errorResult(toolName: string, error: string, duration: number): CLIToolExecutionResult {
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
      options?: CLIToolExecutionOptions;
    }>
  ): Promise<CLIToolExecutionResult[]> {
    const results: CLIToolExecutionResult[] = [];
    let previousResult: any = null;
    
    for (const step of steps) {
      const params = typeof step.params === 'function'
        ? step.params(previousResult)
        : step.params;
      
      const result = await this.execute(step.tool, params, step.options);
      results.push(result);
      
      if (!result.success) {
        break;
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
      options?: CLIToolExecutionOptions;
    }>
  ): Promise<CLIToolExecutionResult[]> {
    return Promise.all(
      executions.map(exec => this.execute(exec.tool, exec.params, exec.options))
    );
  }
}

/**
 * Convenience functions for specific tools
 */

export async function analyzeAnswers(
  executor: CLIToolExecutor,
  answers: any,
  pattern: string,
  mode: 'quick' | 'professional'
): Promise<CLIToolExecutionResult<AnalysisInsights>> {
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
  executor: CLIToolExecutor,
  insights: AnalysisInsights,
  category: string,
  competitors: string[]
): Promise<CLIToolExecutionResult<MarketEvidence>> {
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
  executor: CLIToolExecutor,
  section: string,
  insights: AnalysisInsights,
  pattern: string,
  evidence?: MarketEvidence
): Promise<CLIToolExecutionResult<SectionContent>> {
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
  executor: CLIToolExecutor,
  prd: string
): Promise<CLIToolExecutionResult<QualityScore>> {
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
 * Calculate estimated cost for CLI execution (always $0!)
 */
export function estimateCLICost(): number {
  return 0.00; // CLI is completely free!
}
