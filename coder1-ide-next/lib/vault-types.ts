/**
 * Shared TypeScript types for the Knowledge Base (Vault) system.
 * All vault-related components, services, and APIs import from here.
 */

export interface VaultNote {
  id: number;
  path: string;        // relative path within vault, e.g. "projects/auth/README.md"
  title: string;
  frontmatter: Record<string, unknown>;
  content: string;
  contentHash: string;
  updatedAt: number;   // unix ms
  tags: string[];
}

export interface VaultNoteStub {
  id: number;
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  contentHash: string;
  updatedAt: number;
  tags: string[];
  excerpt?: string;    // first 150 chars of content, for list previews
}

export interface VaultLink {
  sourceId: number;
  targetId: number;
  linkText: string;
  type: 'wikilink' | 'ai_semantic' | 'file-link';
}

export interface VaultSearchResult {
  note: VaultNoteStub;
  snippet: string;     // FTS5 highlighted snippet
  rank: number;
}

export interface VaultGraphData {
  nodes: VaultGraphNode[];
  links: VaultGraphLink[];
  stats: {
    totalNotes: number;
    totalLinks: number;
    orphanCount: number;
  };
}

export interface VaultGraphNode {
  id: number;
  path: string;
  title: string;
  tags: string[];
  linkCount: number;
}

export interface VaultGraphLink {
  source: number;
  target: number;
  type: 'wikilink' | 'ai_semantic';
}

export interface VaultFolderTree {
  name: string;
  path: string;        // relative path
  children: VaultFolderTree[];
  noteCount: number;
}

// API request/response shapes

export interface CreateNoteRequest {
  path: string;
  title: string;
  content?: string;
  frontmatter?: Record<string, unknown>;
}

export interface UpdateNoteRequest {
  content: string;
  frontmatter?: Record<string, unknown>;
}

export interface VaultApiError {
  error: string;
  code?: string;
}

// Notes panel UI types

export interface BacklinkEntry {
  sourcePath: string;
  sourceTitle: string;
  modifiedAt: number;
  excerpt?: string;
}

export interface NoteConflict {
  notePath: string;
  diskContent: string;
  editorContent: string;
}

export interface FileLink {
  id: number;
  noteId: number;
  notePath: string;
  noteTitle: string;
  filePath: string;
  line: number;
  createdAt: number;
}

// Code Dependency Graph types

export interface CodeGraphNode {
  id: string;              // relative path from workspace root (e.g. "components/graph/KnowledgeGraph.tsx")
  label: string;           // filename without extension ("KnowledgeGraph")
  fullPath: string;        // absolute path — used to open file in Monaco
  directory: string;       // top-level directory name ("components") — used for color grouping
  ext: string;             // ".tsx" | ".ts" | ".js" | ".jsx"
  importedByCount: number; // incoming edges — determines node size
  importCount: number;     // outgoing edges — how many files this imports
}

export interface CodeGraphLink {
  source: string;          // relative path of importer
  target: string;          // relative path of imported file
  type: 'static' | 'dynamic';
}

export interface CodeGraphData {
  nodes: CodeGraphNode[];
  links: CodeGraphLink[];
  stats: {
    totalFiles: number;
    totalImports: number;
    orphanFiles: number;
    resolvedImports: number;
    unresolvedImports: number;
    truncated?: boolean;
  };
}
