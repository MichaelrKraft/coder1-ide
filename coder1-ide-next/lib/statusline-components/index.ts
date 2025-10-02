/**
 * Statusline Components Index
 * 
 * Centralized exports for all statusline components
 */

// Import components first
import { modelInfoComponent, type ModelInfo } from './model-info';
import { timeDisplayComponent, type TimeDisplayOptions, type TimeData } from './time-display';
import { dailyCostComponent, type DailyCostData, type CostEntry } from './cost-daily';
import { liveCostComponent, type LiveCostData, type CostSession } from './cost-live';
import { repoInfoComponent, type RepoInfo } from './repo-info';
import { commitsComponent, type CommitsData } from './commits';
import { mcpStatusComponent, type MCPStatusData, type MCPServerInfo } from './mcp-status';

// Re-export components
export { modelInfoComponent, type ModelInfo };
export { timeDisplayComponent, type TimeDisplayOptions, type TimeData };
export { dailyCostComponent, type DailyCostData, type CostEntry };
export { liveCostComponent, type LiveCostData, type CostSession };
export { repoInfoComponent, type RepoInfo };
export { commitsComponent, type CommitsData };
export { mcpStatusComponent, type MCPStatusData, type MCPServerInfo };

// Component registry for dynamic access
export const STATUSLINE_COMPONENTS = {
  model_info: modelInfoComponent,
  time_display: timeDisplayComponent,
  cost_daily: dailyCostComponent,
  cost_live: liveCostComponent,
  repo_info: repoInfoComponent,
  commits: commitsComponent,
  mcp_status: mcpStatusComponent,
} as const;

export type StatuslineComponentKey = keyof typeof STATUSLINE_COMPONENTS;