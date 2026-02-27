/**
 * Agent Marketplace Types
 * Shared types for the agent marketplace feature.
 */

export type AgentCategory =
  | 'code-review'
  | 'testing'
  | 'documentation'
  | 'security'
  | 'deployment'
  | 'performance'
  | 'accessibility'
  | 'custom';

export type AgentPermissionLevel = 'read-only' | 'file-write' | 'terminal' | 'full';

export interface AgentMarketplaceTemplate {
  id: string;                      // stable slug: "code-reviewer-v1"
  name: string;
  description: string;
  longDescription: string;
  category: AgentCategory;
  version: string;                 // semver "1.0.0"
  author: string;
  isBuiltIn: boolean;
  isTeamCustom: boolean;
  agentConfig: {
    name: string;
    description: string;
    instructions: string;          // the system prompt
    tools: string[];
    color: string;                 // hex color
    model: string;
  };
  permissionLevel: AgentPermissionLevel;
  estimatedTokensPerRun: number;
  tags: string[];
  isActivated?: boolean;           // computed per team, not stored in template
  activatedAt?: string;
  activatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Stored in team_assets.data for asset_type='agent_template'
export interface AgentTemplateAssetData {
  templateId: string;
  agentConfig: AgentMarketplaceTemplate['agentConfig'];
  permissionLevel: AgentPermissionLevel;
  activatedBy: string;
  activatedByName: string;
  activatedAt: string;
  isEnabled: boolean;              // false = deactivated but not deleted
}

export interface AgentUsageMetric {
  agentId: string;
  runCount: number;
  lastRunAt: string;
}
