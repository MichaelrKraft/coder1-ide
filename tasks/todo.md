# Claude Code Metrics Dashboard for Coder1

## Overview
Implement enhanced metrics tracking inspired by the Grafana Claude Code dashboard, adding cache efficiency, model-specific tracking, and productivity metrics to Coder1 IDE.

**Source Inspiration**: https://gist.github.com/yangchuansheng/dfd65826920eeb76f19a019db2827d62

## Plan

### Phase 1: Enhance TokenTracker with Missing Metrics
- [ ] Add cache token tracking (cacheRead, cacheCreation)
- [ ] Add model-specific token breakdown
- [ ] Add CLI vs User active time tracking for productivity ratio
- [ ] Add git commits integration
- [ ] Update daily data schema with new fields

### Phase 2: Create Metrics Dashboard Component
- [ ] Build MetricsDashboard React component
- [ ] Add stat cards (sessions, tokens, costs, cache efficiency)
- [ ] Add productivity ratio gauge
- [ ] Add token distribution pie chart (by type)
- [ ] Add cost breakdown by model chart
- [ ] Add time-series token usage graph
- [ ] Wire up real-time updates via existing EventEmitter

### Phase 3: Optional Prometheus Exporter
- [ ] Create /api/metrics/prometheus endpoint
- [ ] Export all metrics in Prometheus format
- [ ] Document Grafana integration for power users

## Technical Details

### Enhanced Token Usage Interface
```typescript
interface EnhancedTokenUsage {
  // Existing fields
  timestamp: string;
  tokens: number;
  command?: string;
  sessionId?: string;

  // NEW: Cache metrics (from Grafana dashboard)
  cacheRead?: number;      // Tokens served from cache
  cacheCreation?: number;  // Tokens used to create cache

  // NEW: Model tracking
  model?: string;          // e.g., "claude-3-5-sonnet", "claude-opus-4"

  // NEW: Token type breakdown
  inputTokens?: number;
  outputTokens?: number;
}
```

### Enhanced Daily Data Interface
```typescript
interface EnhancedDailyUsageData {
  // Existing fields preserved
  date: string;
  totalTokens: number;
  totalCost: number;
  sessions: number;
  peakBurnRate: number;
  averageBurnRate: number;
  codingTime: number;
  linesWritten: number;
  tasksCompleted: number;

  // NEW: Cache efficiency metrics
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheEfficiency: number;  // percentage (0-100)

  // NEW: Model breakdown
  tokensByModel: Record<string, {
    input: number;
    output: number;
    cost: number;
  }>;

  // NEW: Productivity metrics
  cliActiveTime: number;    // seconds CLI was processing
  userActiveTime: number;   // seconds user was interacting
  productivityRatio: number; // cliActiveTime / userActiveTime
  peakLeverage: number;     // max productivity ratio achieved

  // NEW: Git integration
  commitsCount: number;
}
```

### Prometheus Metrics Format
```
# HELP claude_code_token_usage_total Total tokens used
# TYPE claude_code_token_usage_total counter
claude_code_token_usage_total{type="input"} 125000
claude_code_token_usage_total{type="output"} 45000
claude_code_token_usage_total{type="cacheRead"} 80000
claude_code_token_usage_total{type="cacheCreation"} 15000

# HELP claude_code_cost_usd_total Total cost in USD
# TYPE claude_code_cost_usd_total counter
claude_code_cost_usd_total 2.45

# HELP claude_code_cache_efficiency Cache hit ratio
# TYPE claude_code_cache_efficiency gauge
claude_code_cache_efficiency 0.64

# HELP claude_code_sessions_total Total sessions
# TYPE claude_code_sessions_total counter
claude_code_sessions_total 12

# HELP claude_code_productivity_ratio CLI time vs user time
# TYPE claude_code_productivity_ratio gauge
claude_code_productivity_ratio 3.2
```

## Files to Modify/Create

### Phase 1 Files
- `coder1-ide-next/services/token-tracker.ts` - Enhance with new metrics
- `coder1-ide-next/lib/cost-calculator.ts` - Already good, minor updates
- `coder1-ide-next/app/api/token-usage/route.ts` - Return enhanced data

### Phase 2 Files
- `coder1-ide-next/components/metrics/MetricsDashboard.tsx` - NEW
- `coder1-ide-next/components/metrics/StatCard.tsx` - NEW
- `coder1-ide-next/components/metrics/CacheEfficiencyGauge.tsx` - NEW
- `coder1-ide-next/components/metrics/TokenDistributionChart.tsx` - NEW
- `coder1-ide-next/components/metrics/CostByModelChart.tsx` - NEW
- `coder1-ide-next/components/metrics/UsageTimeline.tsx` - NEW
- `coder1-ide-next/app/metrics/page.tsx` - Dashboard page

### Phase 3 Files
- `coder1-ide-next/app/api/metrics/prometheus/route.ts` - NEW

## Current Status
- [ ] Phase 1 - Not started
- [ ] Phase 2 - Not started
- [ ] Phase 3 - Not started

## Review
(To be completed after implementation)

---

*Created: December 12, 2025*
*Source: Grafana Claude Code Metrics Dashboard Gist*
