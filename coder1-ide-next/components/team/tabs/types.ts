// Shared types for team tabs

export interface TeamMember {
  id: string;
  email: string;
  username: string;
  name?: string;
  role: string;
  avatar_url?: string;
}

export interface TeamFact {
  id: string;
  fact_key: string;
  fact_value: string;
  contributed_by_name: string;
  contributor_count: number;
  is_active: boolean;
}

export interface CodeEvent {
  id: string;
  type: string;
  branch?: string;
  sha?: string;
  message?: string;
  remote?: string;
  userId: string;
  username: string;
  timestamp: string;
}

export const SESSION_TYPE_ICONS: Record<string, string> = {
  'bug-fix': '\uD83D\uDD27',
  'feature-dev': '\u2728',
  'refactoring': '\u267B\uFE0F',
  'exploration': '\uD83D\uDD0D',
  'general': '\uD83D\uDCDD',
};

export function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Map Supabase team_knowledge row (data JSONB) into flat TeamFact */
export function mapKnowledgeRow(row: Record<string, unknown>): TeamFact {
  const data = (row.data || {}) as Record<string, unknown>;
  const sourceTable = row.source_table as string;

  let factKey = '';
  let rawValue = '';

  if (sourceTable === 'extracted_facts') {
    factKey = (data.fact_key as string) || '';
    rawValue = (data.fact_value as string) || '';
  } else if (sourceTable === 'learned_patterns') {
    factKey = (data.pattern_type as string) || '';
    rawValue = (data.pattern_description as string) || '';
  } else {
    const heading = (data.heading as string) || '';
    const genericHeadings = ['assistant', 'user', 'system', ''];
    factKey = genericHeadings.includes(heading.toLowerCase()) ? 'session memory' : heading;
    rawValue = (data.content as string) || '';
  }

  const factValue = rawValue.length > 200 ? rawValue.substring(0, 200) + '...' : rawValue;

  return {
    id: row.id as string,
    fact_key: factKey,
    fact_value: factValue,
    contributed_by_name: (row.contributed_by_name as string) || 'Unknown',
    contributor_count: (row.contributor_count as number) || 1,
    is_active: row.is_active !== false,
  };
}

/** Map and sort team knowledge rows */
export function mapAndSortKnowledge(rows: Record<string, unknown>[]): TeamFact[] {
  return rows
    .filter(row => row.source_table !== 'memory_chunks')
    .map(mapKnowledgeRow)
    .sort((a, b) => {
      const aIsGeneric = a.fact_key === 'session memory' ? 1 : 0;
      const bIsGeneric = b.fact_key === 'session memory' ? 1 : 0;
      return aIsGeneric - bIsGeneric;
    });
}
