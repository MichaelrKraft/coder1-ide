/**
 * Statusline Components Index
 * 
 * Centralized exports for all statusline components
 */

// Component exports
export { modelInfoComponent, type ModelInfo } from './model-info';
export { timeDisplayComponent, type TimeDisplayOptions, type TimeData } from './time-display';
export { dailyCostComponent, type DailyCostData, type CostEntry } from './cost-daily';
export { liveCostComponent, type LiveCostData, type CostSession } from './cost-live';
export { repoInfoComponent, type RepoInfo } from './repo-info';
export { commitsComponent, type CommitsData } from './commits';
export { mcpStatusComponent, type MCPStatusData, type MCPServerInfo } from './mcp-status';

// Component registry for dynamic access
export const STATUSLINE_COMPONENTS = {
  // Temporarily disabled to fix compilation issue
  // model_info: modelInfoComponent,
  // time_display: timeDisplayComponent,
  // cost_daily: dailyCostComponent,
  // cost_live: liveCostComponent,
  // repo_info: repoInfoComponent,
  // commits: commitsComponent,
  // mcp_status: mcpStatusComponent,
} as const;

export type StatuslineComponentKey = keyof typeof STATUSLINE_COMPONENTS;