/**
 * Johnny5 Model Advisor
 *
 * Client-side singleton that analyzes prompt complexity from terminal activity
 * and recommends the optimal Claude model with cost comparison.
 * Browser-only: no Node.js imports.
 */

import { getActivityCollector } from './terminal-activity-collector';
import type { ActivityEvent } from './terminal-activity-collector';

// -- Types ------------------------------------------------------------------

export type Complexity = 'simple' | 'moderate' | 'complex';

export interface ModelRecommendation {
  id: string;
  timestamp: Date;
  prompt: string;
  complexity: Complexity;
  recommendedModel: string;
  recommendedModelName: string;
  currentModel: string;
  currentModelName: string;
  costSavings?: string;
  reason: string;
  dismissed: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  costTier: '$' | '$$' | '$$$';
  inputCostPer1M: number;
  outputCostPer1M: number;
}

// -- Model catalog ----------------------------------------------------------

const MODELS: Record<string, ModelInfo> = {
  'claude-haiku-3-5-20241022': {
    id: 'claude-haiku-3-5-20241022',
    name: 'Haiku 3.5',
    costTier: '$',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
  },
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Sonnet 4.5',
    costTier: '$$',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
  },
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    name: 'Opus 4.6',
    costTier: '$$$',
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
  },
};

const MODEL_FOR_COMPLEXITY: Record<Complexity, string> = {
  simple: 'claude-haiku-3-5-20241022',
  moderate: 'claude-sonnet-4-5-20250929',
  complex: 'claude-opus-4-6',
};

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

// -- Keyword lists ----------------------------------------------------------

const SIMPLE_KEYWORDS = [
  'rename', 'typo', 'format', 'indent', 'simple', 'quick', 'just',
  'spelling', 'whitespace', 'comment out', 'uncomment', 'log',
];

const COMPLEX_KEYWORDS = [
  'architecture', 'design', 'security audit', 'migrate', 'multi-file',
  'across the codebase', 'refactor all', 'plan', 'why', 'analyze',
  'evaluate', 'compare approaches', 'system design', 'redesign',
  'performance audit', 'scalability', 'tradeoff', 'trade-off',
];

// -- Helpers ----------------------------------------------------------------

const DEBOUNCE_INTERVAL_MS = 2 * 60 * 1000;

function getCurrentModel(): string {
  try {
    const stored = localStorage.getItem('coder1-model-selection');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.selectedModel || DEFAULT_MODEL;
    }
  } catch { /* ignore */ }
  return DEFAULT_MODEL;
}

function getModelInfo(modelId: string): ModelInfo {
  return MODELS[modelId] ?? MODELS[DEFAULT_MODEL];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function countFileReferences(text: string): number {
  const matches = text.match(/\b[\w./-]+\.\w{1,10}\b/g);
  return matches ? matches.length : 0;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// -- Complexity analysis ----------------------------------------------------

function analyzeComplexity(prompt: string): { complexity: Complexity; reason: string } {
  const wordCount = countWords(prompt);
  const fileRefs = countFileReferences(prompt);
  const hasSimple = containsAny(prompt, SIMPLE_KEYWORDS);
  const hasComplex = containsAny(prompt, COMPLEX_KEYWORDS);

  if (hasComplex) {
    return {
      complexity: 'complex',
      reason: 'This prompt involves architectural or multi-file reasoning. Opus excels here.',
    };
  }
  if (wordCount > 150) {
    return {
      complexity: 'complex',
      reason: 'This is a detailed, lengthy prompt that benefits from deep reasoning.',
    };
  }
  if (hasSimple && wordCount < 30) {
    return {
      complexity: 'simple',
      reason: 'This is a quick, straightforward task. Haiku can handle it efficiently.',
    };
  }
  if (wordCount < 30 && fileRefs <= 1 && !hasComplex) {
    return {
      complexity: 'simple',
      reason: 'Short prompt with a single-file scope. Haiku is a cost-effective choice.',
    };
  }
  return {
    complexity: 'moderate',
    reason: 'Standard development task. Sonnet provides the right balance of capability and cost.',
  };
}

// -- Cost comparison --------------------------------------------------------

function buildCostSavings(recommended: ModelInfo, current: ModelInfo): string | undefined {
  if (recommended.id === current.id) return undefined;

  const recCost = recommended.outputCostPer1M;
  const curCost = current.outputCostPer1M;

  if (recCost < curCost) {
    const pctSaving = Math.round((1 - recCost / curCost) * 100);
    return `~${pctSaving}% cheaper with ${recommended.name}`;
  }
  const multiplier = Math.round(recCost / curCost);
  return `~${multiplier}x more expensive, but worth it for complex ${
    recommended.costTier === '$$$' ? 'architecture' : 'development'
  } tasks`;
}

// -- ModelAdvisor Service ---------------------------------------------------

class ModelAdvisor {
  private lastRecommendation: ModelRecommendation | null = null;
  private lastFireTime = 0;
  private unsubscribe: (() => void) | null = null;
  private running = false;

  /** Start listening for user prompts from the terminal activity collector. */
  start(): void {
    if (this.running || typeof window === 'undefined') return;
    const collector = getActivityCollector();
    this.unsubscribe = collector.on('user_prompt', this.handlePrompt);
    this.running = true;
    console.log('[ModelAdvisor] Started');
  }

  /** Stop listening and clean up. */
  stop(): void {
    if (!this.running) return;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.running = false;
    console.log('[ModelAdvisor] Stopped');
  }

  /** Return the most recent recommendation, or null. */
  getLastRecommendation(): ModelRecommendation | null {
    return this.lastRecommendation;
  }

  private handlePrompt = (event: ActivityEvent): void => {
    const command = (event.data?.command as string) ?? '';
    if (!command || command.length < 3) return;

    // Debounce: no more than one recommendation per 2 minutes
    const now = Date.now();
    if (now - this.lastFireTime < DEBOUNCE_INTERVAL_MS) return;

    const currentModelId = getCurrentModel();
    const { complexity, reason } = analyzeComplexity(command);
    const recommendedModelId = MODEL_FOR_COMPLEXITY[complexity];

    // Only fire if the recommendation differs from the current model
    if (recommendedModelId === currentModelId) return;

    const recommendedInfo = getModelInfo(recommendedModelId);
    const currentInfo = getModelInfo(currentModelId);

    const recommendation: ModelRecommendation = {
      id: generateId(),
      timestamp: new Date(),
      prompt: command.length > 200 ? command.slice(0, 200) : command,
      complexity,
      recommendedModel: recommendedInfo.id,
      recommendedModelName: recommendedInfo.name,
      currentModel: currentInfo.id,
      currentModelName: currentInfo.name,
      costSavings: buildCostSavings(recommendedInfo, currentInfo),
      reason,
      dismissed: false,
    };

    this.lastRecommendation = recommendation;
    this.lastFireTime = now;

    window.dispatchEvent(
      new CustomEvent('johnny5:modelRecommendation', { detail: recommendation }),
    );
  };
}

// -- Singleton --------------------------------------------------------------

let instance: ModelAdvisor | null = null;

export function getModelAdvisor(): ModelAdvisor {
  if (!instance) {
    instance = new ModelAdvisor();
  }
  return instance;
}

export default ModelAdvisor;
