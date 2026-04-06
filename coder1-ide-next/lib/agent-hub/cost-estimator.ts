// lib/agent-hub/cost-estimator.ts
// Pre-run cost estimation for agent tasks

// Rough token estimates per model (input + expected output for a typical task)
const MODEL_COST_PER_1K_TOKENS: Record<string, number> = {
  'claude-haiku-4-5': 0.00025,  // $0.25/MTok input
  'claude-sonnet-4-6': 0.003,   // $3/MTok input
  'claude-opus-4-6': 0.015,     // $15/MTok input
};

export interface CostEstimate {
  estimatedTokens: number;
  estimatedCostCents: number;
  model: string;
}

export function estimateRunCost(description: string, model: string): CostEstimate {
  // Rough estimate: 4 chars per token, assume 4x total (input + output + context)
  const inputTokens = Math.ceil(description.length / 4);
  const totalTokens = inputTokens * 4;
  const rate = MODEL_COST_PER_1K_TOKENS[model] ?? 0.003;
  const estimatedCostCents = Math.round((totalTokens / 1000) * rate * 100);

  return { estimatedTokens: totalTokens, estimatedCostCents, model };
}
