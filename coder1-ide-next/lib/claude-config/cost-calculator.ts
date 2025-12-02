/**
 * Cost Calculator Service
 * Estimates API usage costs for Claude Code configs
 */

import { CostEstimate } from './types';

export class CostCalculator {
  private static instance: CostCalculator;

  private readonly MODELS = {
    'claude-sonnet-4-5-20250929': {
      inputCostPer1M: 3.00,
      outputCostPer1M: 15.00
    },
    'claude-3-5-haiku-20241022': {
      inputCostPer1M: 0.80,
      outputCostPer1M: 4.00
    }
  } as const;

  private readonly DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

  private constructor() {}

  public static getInstance(): CostCalculator {
    if (!CostCalculator.instance) {
      CostCalculator.instance = new CostCalculator();
    }
    return CostCalculator.instance;
  }

  /**
   * Estimate token count from text (rough approximation)
   * Average: 1 token ≈ 4 characters
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost for given token counts
   */
  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string = this.DEFAULT_MODEL
  ): number {
    const pricing = this.MODELS[model as keyof typeof this.MODELS] || this.MODELS[this.DEFAULT_MODEL];

    const inputCost = (inputTokens / 1000000) * pricing.inputCostPer1M;
    const outputCost = (outputTokens / 1000000) * pricing.outputCostPer1M;

    return inputCost + outputCost;
  }

  /**
   * Estimate cost for AI config generation
   */
  public estimateGenerationCost(
    userPrompt: string,
    expectedOutputLength: number = 1500,
    model: string = this.DEFAULT_MODEL
  ): CostEstimate {
    const systemPromptLength = 2000;
    const contextLength = 1000;
    
    const inputText = systemPromptLength + contextLength + userPrompt.length;
    const inputTokens = this.estimateTokens(userPrompt) + 750;
    const outputTokens = Math.ceil(expectedOutputLength / 4);

    const cost = this.calculateCost(inputTokens, outputTokens, model);

    return {
      inputTokens,
      outputTokens,
      estimatedCost: Math.max(cost, 0.01),
      model
    };
  }

  /**
   * Estimate cost for config usage (how much it might cost to run)
   */
  public estimateUsageCost(
    configType: 'agent' | 'hook' | 'skill' | 'command',
    estimatedUses: number = 1
  ): number {
    const baseCosts = {
      agent: 0.05,
      hook: 0.00,
      skill: 0.00,
      command: 0.02
    };

    return baseCosts[configType] * estimatedUses;
  }

  /**
   * Calculate monthly cost estimate
   */
  public estimateMonthlyCost(
    configType: 'agent' | 'hook' | 'skill' | 'command',
    usesPerDay: number = 10
  ): {
    perUse: number;
    daily: number;
    weekly: number;
    monthly: number;
  } {
    const perUse = this.estimateUsageCost(configType, 1);
    const daily = perUse * usesPerDay;
    const weekly = daily * 7;
    const monthly = daily * 30;

    return {
      perUse: Math.round(perUse * 100) / 100,
      daily: Math.round(daily * 100) / 100,
      weekly: Math.round(weekly * 100) / 100,
      monthly: Math.round(monthly * 100) / 100
    };
  }

  /**
   * Format cost for display
   */
  public formatCost(cost: number): string {
    if (cost === 0) return 'Free';
    if (cost < 0.01) return '< $0.01';
    if (cost < 1) return `$${cost.toFixed(2)}`;
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Get cost breakdown
   */
  public getCostBreakdown(estimate: CostEstimate): {
    input: number;
    output: number;
    total: number;
    formatted: {
      input: string;
      output: string;
      total: string;
    };
  } {
    const pricing = this.MODELS[estimate.model as keyof typeof this.MODELS] || this.MODELS[this.DEFAULT_MODEL];

    const inputCost = (estimate.inputTokens / 1000000) * pricing.inputCostPer1M;
    const outputCost = (estimate.outputTokens / 1000000) * pricing.outputCostPer1M;
    const total = estimate.estimatedCost;

    return {
      input: inputCost,
      output: outputCost,
      total,
      formatted: {
        input: this.formatCost(inputCost),
        output: this.formatCost(outputCost),
        total: this.formatCost(total)
      }
    };
  }

  /**
   * Compare costs between models
   */
  public compareModels(
    inputTokens: number,
    outputTokens: number
  ): Array<{
    model: string;
    cost: number;
    formatted: string;
    savings?: number;
  }> {
    const models = Object.keys(this.MODELS);
    const comparisons = models.map(model => {
      const cost = this.calculateCost(inputTokens, outputTokens, model);
      return {
        model,
        cost,
        formatted: this.formatCost(cost)
      };
    });

    comparisons.sort((a, b) => a.cost - b.cost);

    const cheapest = comparisons[0].cost;
    return comparisons.map(c => ({
      ...c,
      savings: c.cost > cheapest ? c.cost - cheapest : undefined
    }));
  }

  /**
   * Estimate total portfolio cost
   */
  public estimatePortfolioCost(configs: Array<{
    type: 'agent' | 'hook' | 'skill' | 'command';
    usesPerDay: number;
  }>): {
    daily: number;
    monthly: number;
    yearly: number;
    byType: Record<string, number>;
  } {
    let daily = 0;
    const byType: Record<string, number> = {
      agent: 0,
      hook: 0,
      skill: 0,
      command: 0
    };

    configs.forEach(config => {
      const costPerUse = this.estimateUsageCost(config.type, 1);
      const dailyCost = costPerUse * config.usesPerDay;
      
      daily += dailyCost;
      byType[config.type] += dailyCost;
    });

    return {
      daily: Math.round(daily * 100) / 100,
      monthly: Math.round(daily * 30 * 100) / 100,
      yearly: Math.round(daily * 365 * 100) / 100,
      byType
    };
  }

  /**
   * Get cost tier
   */
  public getCostTier(cost: number): {
    tier: 'free' | 'low' | 'medium' | 'high';
    label: string;
    color: string;
  } {
    if (cost === 0) {
      return {
        tier: 'free',
        label: 'Free',
        color: '#10b981'
      };
    }
    
    if (cost < 0.05) {
      return {
        tier: 'low',
        label: 'Low Cost',
        color: '#22c55e'
      };
    }
    
    if (cost < 0.15) {
      return {
        tier: 'medium',
        label: 'Medium Cost',
        color: '#f59e0b'
      };
    }
    
    return {
      tier: 'high',
      label: 'High Cost',
      color: '#ef4444'
    };
  }

  /**
   * Calculate ROI (return on investment)
   */
  public calculateROI(
    costPerMonth: number,
    timeSavedHours: number,
    hourlyRate: number = 50
  ): {
    timeSavingsValue: number;
    netValue: number;
    roi: number;
    formatted: {
      timeSavingsValue: string;
      netValue: string;
      roi: string;
    };
  } {
    const timeSavingsValue = timeSavedHours * hourlyRate;
    const netValue = timeSavingsValue - costPerMonth;
    const roi = costPerMonth > 0 ? ((timeSavingsValue - costPerMonth) / costPerMonth) * 100 : 0;

    return {
      timeSavingsValue,
      netValue,
      roi,
      formatted: {
        timeSavingsValue: `$${timeSavingsValue.toFixed(2)}`,
        netValue: `$${netValue.toFixed(2)}`,
        roi: `${roi.toFixed(0)}%`
      }
    };
  }
}

export const costCalculator = CostCalculator.getInstance();

export function estimateGenerationCost(
  userPrompt: string,
  expectedOutputLength?: number,
  model?: string
): CostEstimate {
  return costCalculator.estimateGenerationCost(userPrompt, expectedOutputLength, model);
}

export function formatCost(cost: number): string {
  return costCalculator.formatCost(cost);
}

export function estimateMonthlyCost(
  configType: 'agent' | 'hook' | 'skill' | 'command',
  usesPerDay?: number
) {
  return costCalculator.estimateMonthlyCost(configType, usesPerDay);
}
