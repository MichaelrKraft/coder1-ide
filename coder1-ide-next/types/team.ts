/**
 * Team collaboration types for Coder1 IDE
 */

export interface TeamSummary {
  id: string;
  team_id: string;
  user_id: string;
  user_name: string;
  title: string;
  summary: string;        // only returned on single-item fetch
  excerpt: string;        // 200-250 chars, markdown-stripped
  session_type: 'bug-fix' | 'feature-dev' | 'refactoring' | 'exploration' | 'general' | null;
  branch: string | null;
  files_modified_count: number;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamSummarySharedPayload {
  summary: Omit<TeamSummary, 'summary'>; // no full text in socket payload
  teamId: string;
}
