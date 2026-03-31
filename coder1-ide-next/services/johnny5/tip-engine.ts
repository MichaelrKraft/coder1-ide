/**
 * Johnny5 Tip Engine
 *
 * Browser-only singleton service that evaluates conditions every 10 seconds
 * and returns prioritized proactive tips for the Johnny5 panel. Integrates
 * with pattern-detector.ts and model-advisor.ts via CustomEvents on window.
 *
 * Browser-only: no Node.js imports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface J5Tip {
  id: string;
  type: 'context' | 'model' | 'memory' | 'loop' | 'feature';
  title: string;
  message: string;
  action?: {
    label: string;
    eventName: string;
    eventDetail?: Record<string, unknown>;
  };
  priority: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVAL_INTERVAL_MS = 10_000;
const DISMISS_DURATION_MS = 86_400_000; // 24 hours
const MAX_ACTIVE_TIPS = 5;
const DISMISSED_STORAGE_KEY = 'coder1-j5-dismissed-tips';
const STORE_KEY = 'coder1-ide-store';
const REPEATED_PHRASES_KEY = 'coder1-repeated-phrases';

const FEATURE_TIPS = [
  'Type `# remember this` in the terminal to save facts permanently',
  'Use Plan Mode to preview changes before Claude edits files',
  'Switch to Haiku for quick tasks — it\'s 10x cheaper',
  'Add a CLAUDE.md file to teach Claude about your project',
  'Use /compact when Claude starts forgetting things',
  'Claude can work on multiple files in parallel — just ask',
  'Use Ctrl+Shift+D to open the Discover panel for all commands',
  'Voice input is available — click the microphone icon',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `tip_${Date.now()}_${_idCounter}`;
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silently ignore */ }
}

// ---------------------------------------------------------------------------
// TipEngine
// ---------------------------------------------------------------------------

class TipEngine {
  private tips: Map<string, J5Tip> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  // Bound listeners so we can remove them later.
  private onModelRec = (e: Event): void => this.handleModelRecommendation(e as CustomEvent);
  private onLoopDetected = (e: Event): void => this.handleLoopDetected(e as CustomEvent);

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  start(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;

    window.addEventListener('johnny5:modelRecommendation', this.onModelRec);
    window.addEventListener('johnny5:loopDetected', this.onLoopDetected);

    this.evaluate();
    this.intervalId = setInterval(() => this.evaluate(), EVAL_INTERVAL_MS);

    console.log('[TipEngine] Started');
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('johnny5:modelRecommendation', this.onModelRec);
      window.removeEventListener('johnny5:loopDetected', this.onLoopDetected);
    }

    console.log('[TipEngine] Stopped');
  }

  getActiveTips(): J5Tip[] {
    const dismissed = this.getDismissedMap();
    const now = Date.now();

    return Array.from(this.tips.values())
      .filter((tip) => {
        const ts = dismissed[tip.id];
        if (ts && now - ts < DISMISS_DURATION_MS) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, MAX_ACTIVE_TIPS);
  }

  dismissTip(tipId: string): void {
    const dismissed = this.getDismissedMap();
    dismissed[tipId] = Date.now();
    writeJson(DISMISSED_STORAGE_KEY, dismissed);
  }

  // -------------------------------------------------------------------
  // Evaluation cycle
  // -------------------------------------------------------------------

  private evaluate(): void {
    this.cleanExpiredDismissals();
    this.checkContextTip();
    this.checkMemoryTip();
    this.checkFeatureTip();
  }

  // -------------------------------------------------------------------
  // Tip: Context (priority 1)
  // -------------------------------------------------------------------

  private checkContextTip(): void {
    const store = readJson<Record<string, unknown>>(STORE_KEY);
    if (!store) return;

    const state = store.state as Record<string, unknown> | undefined;
    if (!state) return;

    const tokenUsage = state.tokenUsage as Record<string, unknown> | undefined;
    if (!tokenUsage) return;

    const percent = typeof tokenUsage.percent === 'number' ? tokenUsage.percent : null;
    if (percent === null || percent <= 70) {
      this.tips.delete('context-full');
      return;
    }

    this.tips.set('context-full', {
      id: 'context-full',
      type: 'context',
      title: 'Context getting full',
      message: `Your context is ${Math.round(percent)}% full. Claude may start forgetting earlier instructions. Compress now to keep quality high.`,
      priority: 1,
      action: {
        label: 'Compress Now',
        eventName: 'johnny5:compressContext',
      },
    });
  }

  // -------------------------------------------------------------------
  // Tip: Model recommendation (priority 2) — via CustomEvent
  // -------------------------------------------------------------------

  private handleModelRecommendation(event: CustomEvent): void {
    const detail = event.detail as {
      recommendedModel?: string;
      recommendedModelName?: string;
      reason?: string;
      costSavings?: string;
    } | undefined;
    if (!detail) return;

    const name = detail.recommendedModelName ?? detail.recommendedModel ?? 'a different model';
    let message = detail.reason ?? 'A different model may be better suited for this task.';
    if (detail.costSavings) {
      message += ` (${detail.costSavings})`;
    }

    this.tips.set('model-switch', {
      id: 'model-switch',
      type: 'model',
      title: `Switch to ${name}`,
      message,
      priority: 2,
      action: {
        label: 'Switch Model',
        eventName: 'johnny5:switchModel',
        eventDetail: { modelId: detail.recommendedModel },
      },
    });
  }

  // -------------------------------------------------------------------
  // Tip: Loop detected (priority 1) — via CustomEvent
  // -------------------------------------------------------------------

  private handleLoopDetected(event: CustomEvent): void {
    const detail = event.detail as {
      id?: string;
      message?: string;
      suggestion?: string;
    } | undefined;
    if (!detail) return;

    const tipId = `loop-${detail.id ?? 'unknown'}`;
    this.tips.set(tipId, {
      id: tipId,
      type: 'loop',
      title: 'Loop detected',
      message: detail.message ?? 'Claude may be repeating the same actions.',
      priority: 1,
      action: {
        label: 'View Suggestion',
        eventName: 'johnny5:showLoopSuggestion',
        eventDetail: { suggestion: detail.suggestion },
      },
    });
  }

  // -------------------------------------------------------------------
  // Tip: Memory (priority 2)
  // -------------------------------------------------------------------

  private checkMemoryTip(): void {
    const phrases = readJson<Record<string, number>>(REPEATED_PHRASES_KEY);
    if (!phrases) return;

    // Find the first phrase with count >= 3
    for (const [phrase, count] of Object.entries(phrases)) {
      if (count >= 3) {
        const tipId = `memory-${phrase.slice(0, 30)}`;
        this.tips.set(tipId, {
          id: tipId,
          type: 'memory',
          title: 'Save to memory?',
          message: `You've mentioned "${phrase}" ${count} times. Want me to remember that permanently?`,
          priority: 2,
          action: {
            label: 'Save to Memory',
            eventName: 'johnny5:saveMemory',
            eventDetail: { phrase },
          },
        });
        break; // Only show one memory tip at a time
      }
    }
  }

  // -------------------------------------------------------------------
  // Tip: Feature (priority 3) — rotates daily
  // -------------------------------------------------------------------

  private checkFeatureTip(): void {
    const dayIndex = Math.floor(Date.now() / 86_400_000) % FEATURE_TIPS.length;
    const tipText = FEATURE_TIPS[dayIndex];
    const tipId = `feature-${dayIndex}`;

    this.tips.set(tipId, {
      id: tipId,
      type: 'feature',
      title: 'Did you know?',
      message: tipText,
      priority: 3,
    });
  }

  // -------------------------------------------------------------------
  // Dismissal helpers
  // -------------------------------------------------------------------

  private getDismissedMap(): Record<string, number> {
    return readJson<Record<string, number>>(DISMISSED_STORAGE_KEY) ?? {};
  }

  private cleanExpiredDismissals(): void {
    const dismissed = this.getDismissedMap();
    const now = Date.now();
    let changed = false;

    for (const [tipId, ts] of Object.entries(dismissed)) {
      if (now - ts >= DISMISS_DURATION_MS) {
        delete dismissed[tipId];
        changed = true;
      }
    }

    if (changed) {
      writeJson(DISMISSED_STORAGE_KEY, dismissed);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: TipEngine | null = null;

export function getTipEngine(): TipEngine {
  if (!instance) {
    instance = new TipEngine();
  }
  return instance;
}

export default TipEngine;
