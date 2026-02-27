/**
 * Types for the Team CLAUDE.md Collaborative Editor feature.
 */

export interface ClaudeMdVersion {
  id: string;
  teamId: string;
  content: string;
  contentHash: string; // SHA-256 hex string
  version: number;
  tokenCount: number; // Math.ceil(content.length / 4)
  instructionCount: number; // lines starting with -, *, •, or "1."
  savedBy: string;
  savedByName: string;
  changeNote?: string;
  createdAt: string;
}

export interface ClaudeMdTemplate {
  id: string;
  name: string; // "React SaaS App"
  description: string;
  category: 'web' | 'api' | 'mobile' | 'data' | 'general';
  content: string;
  tags: string[];
  isBuiltIn: boolean;
}

export interface ClaudeMdAnalysis {
  estimatedTokens: number;
  tokenWarningLevel: 'ok' | 'warning' | 'error';
  instructionCount: number;
  instructionWarningLevel: 'ok' | 'warning' | 'error';
}

// Stored in team_assets.data for asset_type='claude_md_version'
export interface ClaudeMdAssetData {
  content: string;
  contentHash: string;
  version: number;
  tokenCount: number;
  instructionCount: number;
  savedBy: string;
  savedByName: string;
  changeNote?: string;
  versions?: Array<{
    version: number;
    content: string;
    contentHash: string;
    savedBy: string;
    savedByName: string;
    changeNote?: string;
    createdAt: string;
  }>;
}
