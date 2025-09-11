/**
 * Cost Calculation Utilities
 * Provides pricing calculations for various AI models
 */

// Model pricing per 1K tokens (in USD)
export const MODEL_PRICING = {
  'claude-3-opus': { 
    input: 0.015,    // $15 per million
    output: 0.075    // $75 per million
  },
  'claude-3-sonnet': { 
    input: 0.003,    // $3 per million
    output: 0.015    // $15 per million
  },
  'claude-3-haiku': { 
    input: 0.00025,  // $0.25 per million
    output: 0.00125  // $1.25 per million
  },
  'claude-3-5-sonnet': { 
    input: 0.003,    // $3 per million (latest Sonnet)
    output: 0.015    // $15 per million
  },
  'gpt-4': { 
    input: 0.03,     // $30 per million
    output: 0.06     // $60 per million
  },
  'gpt-3.5-turbo': { 
    input: 0.0005,   // $0.50 per million
    output: 0.0015   // $1.50 per million
  }
} as const;

export type ModelName = keyof typeof MODEL_PRICING;

/**
 * Calculate cost for token usage
 * @param tokens Total tokens used
 * @param model AI model name
 * @param inputRatio Ratio of input tokens (default 0.3)
 * @returns Cost in USD
 */
export function calculateCost(
  tokens: number,
  model: ModelName = 'claude-3-5-sonnet',
  inputRatio: number = 0.3
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-5-sonnet'];
  const inputTokens = tokens * inputRatio;
  const outputTokens = tokens * (1 - inputRatio);
  
  const cost = (
    (inputTokens * pricing.input / 1000) + 
    (outputTokens * pricing.output / 1000)
  );
  
  return cost;
}

/**
 * Format cost for display
 * @param cost Cost in USD
 * @returns Formatted string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  } else if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  } else {
    return `$${cost.toFixed(2)}`;
  }
}

/**
 * Calculate burn rate (tokens per hour)
 * @param tokens Current token count
 * @param previousTokens Previous token count
 * @param timeElapsedMs Time elapsed in milliseconds
 * @returns Tokens per hour
 */
export function calculateBurnRate(
  tokens: number,
  previousTokens: number,
  timeElapsedMs: number
): number {
  if (timeElapsedMs <= 0) return 0;
  
  const tokenDiff = tokens - previousTokens;
  if (tokenDiff <= 0) return 0;
  
  const hoursElapsed = timeElapsedMs / (1000 * 60 * 60);
  return Math.round(tokenDiff / hoursElapsed);
}

/**
 * Estimate remaining budget time
 * @param remainingBudget Remaining budget in USD
 * @param burnRate Current burn rate (tokens/hour)
 * @param model AI model name
 * @returns Estimated hours remaining
 */
export function estimateRemainingTime(
  remainingBudget: number,
  burnRate: number,
  model: ModelName = 'claude-3-5-sonnet'
): number {
  if (burnRate <= 0) return Infinity;
  
  const costPerToken = calculateCost(1, model);
  const costPerHour = burnRate * costPerToken;
  
  if (costPerHour <= 0) return Infinity;
  
  return remainingBudget / costPerHour;
}

/**
 * Get cost efficiency rating
 * @param tokensPerSession Average tokens per session
 * @returns Efficiency rating and recommendation
 */
export function getEfficiencyRating(tokensPerSession: number): {
  rating: 'excellent' | 'good' | 'moderate' | 'poor';
  recommendation: string;
} {
  if (tokensPerSession < 500) {
    return {
      rating: 'excellent',
      recommendation: 'Very efficient usage pattern'
    };
  } else if (tokensPerSession < 1000) {
    return {
      rating: 'good',
      recommendation: 'Good efficiency, consider using templates for common tasks'
    };
  } else if (tokensPerSession < 2000) {
    return {
      rating: 'moderate',
      recommendation: 'Consider breaking down complex tasks into smaller sessions'
    };
  } else {
    return {
      rating: 'poor',
      recommendation: 'High token usage - review session patterns for optimization'
    };
  }
}

/**
 * Calculate monthly projection based on current usage
 * @param dailyAverage Average daily token usage
 * @param model AI model name
 * @returns Monthly cost projection
 */
export function calculateMonthlyProjection(
  dailyAverage: number,
  model: ModelName = 'claude-3-5-sonnet'
): {
  tokens: number;
  cost: number;
  formatted: string;
} {
  const monthlyTokens = dailyAverage * 30;
  const monthlyCost = calculateCost(monthlyTokens, model);
  
  return {
    tokens: monthlyTokens,
    cost: monthlyCost,
    formatted: formatCost(monthlyCost)
  };
}