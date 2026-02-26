/**
 * Slash Command Types
 *
 * Type definitions for the Shared Slash Command Library feature.
 * Commands are stored in team_assets (asset_type='slash_command') and
 * installed to ~/.claude/commands/ for use with Claude Code CLI.
 */

export type CommandScope = 'personal' | 'team';

export type CommandCategory =
  | 'workflow'
  | 'review'
  | 'testing'
  | 'docs'
  | 'git'
  | 'deployment'
  | 'debugging'
  | 'general';

export interface SlashCommand {
  id: string;
  teamId: string | null;
  slug: string;                    // filename slug: "review-pr"
  name: string;                    // display: "Review Pull Request"
  description: string;
  content: string;                 // markdown content written to ~/.claude/commands/
  category: CommandCategory;
  scope: CommandScope;
  hasArguments: boolean;           // content contains $ARGUMENTS
  argumentsDescription?: string;
  createdBy: string;
  createdByName: string;
  version: number;
  isInstalled: boolean;            // local state only, not persisted
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SlashCommandVersion {
  commandSlug: string;
  version: number;
  content: string;
  changedBy: string;
  changedByName: string;
  changeNote?: string;
  createdAt: string;
}

/**
 * What gets stored in team_assets.data JSONB for asset_type='slash_command'.
 * This is the persisted shape — isInstalled is a runtime-only flag on SlashCommand.
 */
export interface SlashCommandAssetData {
  slug: string;
  name: string;
  description: string;
  content: string;
  category: CommandCategory;
  scope: CommandScope;
  hasArguments: boolean;
  argumentsDescription?: string;
  tags: string[];
  version: number;
  createdBy: string;
  createdByName: string;
  versions?: SlashCommandVersion[]; // last 10 versions stored inline
}
