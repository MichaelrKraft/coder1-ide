/**
 * VaultService — manages the SQLite knowledge base for vault notes.
 * Uses better-sqlite3. Server-side only.
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { createHash } from 'crypto';
import { expandVaultPath, ensureDir, validateVaultPath } from './vault-security';
import { parseWikilinks, pathToTitle } from './wikilink-parser';
import type {
  VaultNote,
  VaultNoteStub,
  VaultLink,
  VaultSearchResult,
  VaultGraphData,
  VaultFolderTree,
  CreateNoteRequest,
  UpdateNoteRequest,
  FileLink,
} from './vault-types';

const DEFAULT_DB_PATH = '~/.coder1/knowledge.db';
const DEFAULT_VAULT_PATH = '~/.coder1/knowledge';

export class VaultService {
  private db: Database.Database;
  private vaultRoot: string;

  constructor(vaultPath?: string, dbPath?: string) {
    this.vaultRoot = expandVaultPath(vaultPath || process.env.NEXT_PUBLIC_VAULT_PATH || DEFAULT_VAULT_PATH);
    const resolvedDbPath = expandVaultPath(dbPath || DEFAULT_DB_PATH);

    ensureDir(this.vaultRoot);
    ensureDir(path.dirname(resolvedDbPath));

    this.db = new Database(resolvedDbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        frontmatter_json TEXT DEFAULT '{}',
        content_hash TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content,
        content_rowid='id'
      );

      CREATE TABLE IF NOT EXISTS links (
        source_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
        target_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
        link_text TEXT,
        type TEXT DEFAULT 'wikilink',
        PRIMARY KEY (source_id, target_id)
      );

      CREATE TABLE IF NOT EXISTS tags (
        note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
        tag TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
      CREATE INDEX IF NOT EXISTS idx_tags_note ON tags(note_id);

      CREATE TABLE IF NOT EXISTS file_links (
        id INTEGER PRIMARY KEY,
        note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        line INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (note_id, file_path, line)
      );
      CREATE INDEX IF NOT EXISTS idx_file_links_file ON file_links(file_path);
      CREATE INDEX IF NOT EXISTS idx_file_links_note ON file_links(note_id);
    `);
  }

  private hashContent(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  private absolutePath(notePath: string): string {
    return validateVaultPath(notePath, this.vaultRoot);
  }

  private relativePath(absoluteNotePath: string): string {
    return path.relative(this.vaultRoot, absoluteNotePath);
  }

  // --- CRUD ---

  async createNote(req: CreateNoteRequest): Promise<VaultNote> {
    const absPath = this.absolutePath(req.path);
    ensureDir(path.dirname(absPath));

    const title = req.title || pathToTitle(req.path);
    const frontmatter = req.frontmatter || {};
    const content = req.content || '';

    const fileContent = Object.keys(frontmatter).length > 0
      ? matter.stringify(content, frontmatter)
      : content;

    fs.writeFileSync(absPath, fileContent, 'utf-8');

    return this.indexNote(req.path);
  }

  async getNote(notePath: string): Promise<VaultNote | null> {
    const absPath = this.absolutePath(notePath);
    if (!fs.existsSync(absPath)) return null;

    const raw = fs.readFileSync(absPath, 'utf-8');
    const parsed = matter(raw);
    const row = this.db.prepare('SELECT id, content_hash, updated_at FROM notes WHERE path = ?').get(notePath) as { id: number; content_hash: string; updated_at: number } | undefined;

    const tags = row ? (this.db.prepare('SELECT tag FROM tags WHERE note_id = ?').all(row.id) as { tag: string }[]).map(r => r.tag) : [];

    return {
      id: row?.id ?? -1,
      path: notePath,
      title: (parsed.data?.title as string) || pathToTitle(notePath),
      frontmatter: parsed.data || {},
      content: parsed.content,
      contentHash: row?.content_hash || this.hashContent(raw),
      updatedAt: row?.updated_at || Date.now(),
      tags,
    };
  }

  async updateNote(notePath: string, req: UpdateNoteRequest): Promise<VaultNote> {
    const absPath = this.absolutePath(notePath);
    const existing = await this.getNote(notePath);
    if (!existing) throw new Error(`Note not found: ${notePath}`);

    const frontmatter = req.frontmatter ?? existing.frontmatter;
    const fileContent = Object.keys(frontmatter).length > 0
      ? matter.stringify(req.content, frontmatter)
      : req.content;

    fs.writeFileSync(absPath, fileContent, 'utf-8');
    return this.indexNote(notePath);
  }

  async deleteNote(notePath: string): Promise<void> {
    const absPath = this.absolutePath(notePath);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

    const row = this.db.prepare('SELECT id FROM notes WHERE path = ?').get(notePath) as { id: number } | undefined;
    if (row) {
      this.db.prepare('DELETE FROM notes_fts WHERE rowid = ?').run(row.id);
      this.db.prepare('DELETE FROM notes WHERE id = ?').run(row.id);
    }
  }

  // --- Indexing ---

  indexNote(notePath: string): VaultNote {
    const absPath = this.absolutePath(notePath);
    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${absPath}`);

    const raw = fs.readFileSync(absPath, 'utf-8');
    const parsed = matter(raw);
    const title = (parsed.data?.title as string) || pathToTitle(notePath);
    const contentHash = this.hashContent(raw);
    const now = Date.now();

    const tags: string[] = Array.isArray(parsed.data?.tags) ? parsed.data.tags as string[] : [];

    // Upsert note record
    this.db.prepare(`
      INSERT INTO notes (path, title, frontmatter_json, content_hash, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        title = excluded.title,
        frontmatter_json = excluded.frontmatter_json,
        content_hash = excluded.content_hash,
        updated_at = excluded.updated_at
    `).run(notePath, title, JSON.stringify(parsed.data || {}), contentHash, now);

    const row = this.db.prepare('SELECT id FROM notes WHERE path = ?').get(notePath) as { id: number };

    // Update FTS
    this.db.prepare('DELETE FROM notes_fts WHERE rowid = ?').run(row.id);
    this.db.prepare('INSERT INTO notes_fts(rowid, title, content) VALUES (?, ?, ?)').run(row.id, title, parsed.content);

    // Update tags
    this.db.prepare('DELETE FROM tags WHERE note_id = ?').run(row.id);
    for (const tag of tags) {
      this.db.prepare('INSERT OR IGNORE INTO tags (note_id, tag) VALUES (?, ?)').run(row.id, tag);
    }

    // Update links (forward only — back-links computed on demand)
    this.db.prepare('DELETE FROM links WHERE source_id = ?').run(row.id);
    const allPaths = (this.db.prepare('SELECT path FROM notes').all() as { path: string }[]).map(r => r.path);
    const wikilinks = parseWikilinks(parsed.content);

    for (const link of wikilinks) {
      const targetPath = this.resolveWikilinkPath(link.target, notePath, allPaths);
      if (targetPath) {
        const targetRow = this.db.prepare('SELECT id FROM notes WHERE path = ?').get(targetPath) as { id: number } | undefined;
        if (targetRow) {
          this.db.prepare(`
            INSERT OR IGNORE INTO links (source_id, target_id, link_text, type)
            VALUES (?, ?, ?, 'wikilink')
          `).run(row.id, targetRow.id, link.target);
        }
      }
    }

    return {
      id: row.id,
      path: notePath,
      title,
      frontmatter: parsed.data || {},
      content: parsed.content,
      contentHash,
      updatedAt: now,
      tags,
    };
  }

  private resolveWikilinkPath(target: string, sourcePath: string, allPaths: string[]): string | null {
    // Simple resolution: strip .md, try exact match, then suffix match
    const withMd = target.endsWith('.md') ? target : target + '.md';
    if (allPaths.includes(withMd)) return withMd;
    const suffix = '/' + withMd;
    const match = allPaths.find(p => p.endsWith(suffix));
    return match || null;
  }

  async reindexAll(): Promise<number> {
    const mdFiles = this.findAllMdFiles(this.vaultRoot);
    let count = 0;
    for (const absPath of mdFiles) {
      try {
        const rel = this.relativePath(absPath);
        this.indexNote(rel);
        count++;
      } catch {
        // skip unreadable files
      }
    }
    return count;
  }

  private findAllMdFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.findAllMdFiles(full));
      } else if (entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
    return results;
  }

  // --- Search ---

  search(query: string, limit = 20): VaultSearchResult[] {
    const rows = this.db.prepare(`
      SELECT n.id, n.path, n.title, n.frontmatter_json, n.content_hash, n.updated_at,
             snippet(notes_fts, 1, '<mark>', '</mark>', '...', 20) AS snippet,
             notes_fts.rank
      FROM notes_fts
      JOIN notes n ON n.id = notes_fts.rowid
      WHERE notes_fts MATCH ?
      ORDER BY notes_fts.rank
      LIMIT ?
    `).all(query + '*', limit) as Array<{
      id: number; path: string; title: string; frontmatter_json: string;
      content_hash: string; updated_at: number; snippet: string; rank: number;
    }>;

    return rows.map(row => ({
      note: {
        id: row.id,
        path: row.path,
        title: row.title,
        frontmatter: JSON.parse(row.frontmatter_json || '{}'),
        contentHash: row.content_hash,
        updatedAt: row.updated_at,
        tags: (this.db.prepare('SELECT tag FROM tags WHERE note_id = ?').all(row.id) as { tag: string }[]).map(r => r.tag),
        excerpt: row.snippet,
      },
      snippet: row.snippet,
      rank: row.rank,
    }));
  }

  // --- List ---

  listNotes(folderPath?: string, limit = 100): VaultNoteStub[] {
    let rows: Array<{ id: number; path: string; title: string; frontmatter_json: string; content_hash: string; updated_at: number }>;

    if (folderPath) {
      const prefix = folderPath.endsWith('/') ? folderPath : folderPath + '/';
      rows = this.db.prepare(`
        SELECT id, path, title, frontmatter_json, content_hash, updated_at
        FROM notes
        WHERE path LIKE ? AND path NOT LIKE ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(prefix + '%', prefix + '%/%', limit) as typeof rows;
    } else {
      rows = this.db.prepare(`
        SELECT id, path, title, frontmatter_json, content_hash, updated_at
        FROM notes
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(limit) as typeof rows;
    }

    return rows.map(row => {
      const tags = (this.db.prepare('SELECT tag FROM tags WHERE note_id = ?').all(row.id) as { tag: string }[]).map(r => r.tag);
      return {
        id: row.id,
        path: row.path,
        title: row.title,
        frontmatter: JSON.parse(row.frontmatter_json || '{}'),
        contentHash: row.content_hash,
        updatedAt: row.updated_at,
        tags,
      };
    });
  }

  // --- Backlinks ---

  getBacklinks(notePath: string): VaultNoteStub[] {
    const row = this.db.prepare('SELECT id FROM notes WHERE path = ?').get(notePath) as { id: number } | undefined;
    if (!row) return [];

    const rows = this.db.prepare(`
      SELECT n.id, n.path, n.title, n.frontmatter_json, n.content_hash, n.updated_at
      FROM links l
      JOIN notes n ON n.id = l.source_id
      WHERE l.target_id = ?
      ORDER BY n.updated_at DESC
    `).all(row.id) as Array<{ id: number; path: string; title: string; frontmatter_json: string; content_hash: string; updated_at: number }>;

    return rows.map(r => ({
      id: r.id,
      path: r.path,
      title: r.title,
      frontmatter: JSON.parse(r.frontmatter_json || '{}'),
      contentHash: r.content_hash,
      updatedAt: r.updated_at,
      tags: (this.db.prepare('SELECT tag FROM tags WHERE note_id = ?').all(r.id) as { tag: string }[]).map(t => t.tag),
    }));
  }

  // --- Graph ---

  getGraphData(): VaultGraphData {
    const notes = this.db.prepare('SELECT id, path, title FROM notes').all() as Array<{ id: number; path: string; title: string }>;
    const links = this.db.prepare('SELECT source_id, target_id, type FROM links').all() as Array<{ source_id: number; target_id: number; type: string }>;

    const linkCounts = new Map<number, number>();
    for (const link of links) {
      linkCounts.set(link.source_id, (linkCounts.get(link.source_id) || 0) + 1);
      linkCounts.set(link.target_id, (linkCounts.get(link.target_id) || 0) + 1);
    }

    const connectedIds = new Set([...links.map(l => l.source_id), ...links.map(l => l.target_id)]);
    const orphanCount = notes.filter(n => !connectedIds.has(n.id)).length;

    return {
      nodes: notes.map(n => ({
        id: n.id,
        path: n.path,
        title: n.title,
        tags: (this.db.prepare('SELECT tag FROM tags WHERE note_id = ?').all(n.id) as { tag: string }[]).map(t => t.tag),
        linkCount: linkCounts.get(n.id) || 0,
      })),
      links: links.map(l => ({
        source: l.source_id,
        target: l.target_id,
        type: l.type as 'wikilink' | 'ai_semantic',
      })),
      stats: {
        totalNotes: notes.length,
        totalLinks: links.length,
        orphanCount,
      },
    };
  }

  // --- Folder tree ---

  getFolderTree(): VaultFolderTree {
    const allPaths = (this.db.prepare('SELECT path FROM notes').all() as { path: string }[]).map(r => r.path);
    return this.buildTree('', allPaths);
  }

  private buildTree(prefix: string, allPaths: string[]): VaultFolderTree {
    const relevant = allPaths.filter(p => prefix ? p.startsWith(prefix + '/') : true);
    const subDirs = new Set<string>();

    for (const p of relevant) {
      const rest = prefix ? p.slice(prefix.length + 1) : p;
      const parts = rest.split('/');
      if (parts.length > 1) {
        subDirs.add(parts[0]);
      }
    }

    const name = prefix.split('/').pop() || 'root';
    const noteCount = relevant.filter(p => {
      const rest = prefix ? p.slice(prefix.length + 1) : p;
      return !rest.includes('/');
    }).length;

    return {
      name,
      path: prefix,
      noteCount,
      children: Array.from(subDirs).sort().map(dir => {
        const childPrefix = prefix ? `${prefix}/${dir}` : dir;
        return this.buildTree(childPrefix, allPaths);
      }),
    };
  }

  // --- Daily Note ---

  getDailyNotePath(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `Daily/${today}.md`;
  }

  // --- File Links ---

  getFileLinks(filePath: string): FileLink[] {
    const rows = this.db.prepare(`
      SELECT fl.id, fl.note_id as noteId, n.path as notePath, n.title as noteTitle,
             fl.file_path as filePath, fl.line, fl.created_at as createdAt
      FROM file_links fl
      JOIN notes n ON n.id = fl.note_id
      WHERE fl.file_path = ?
      ORDER BY fl.line ASC
    `).all(filePath) as FileLink[];
    return rows;
  }

  getFileLinksForNote(notePath: string): FileLink[] {
    const rows = this.db.prepare(`
      SELECT fl.id, fl.note_id as noteId, n.path as notePath, n.title as noteTitle,
             fl.file_path as filePath, fl.line, fl.created_at as createdAt
      FROM file_links fl
      JOIN notes n ON n.id = fl.note_id
      WHERE n.path = ?
      ORDER BY fl.file_path ASC, fl.line ASC
    `).all(notePath) as FileLink[];
    return rows;
  }

  createFileLink(notePath: string, filePath: string, line: number): void {
    const note = this.db.prepare('SELECT id FROM notes WHERE path = ?').get(notePath) as { id: number } | undefined;
    if (!note) throw new Error(`Note not found: ${notePath}`);
    this.db.prepare(`
      INSERT OR REPLACE INTO file_links (note_id, file_path, line, created_at)
      VALUES (?, ?, ?, ?)
    `).run(note.id, filePath, line, Date.now());
  }

  deleteFileLink(notePath: string, filePath: string, line: number): void {
    const note = this.db.prepare('SELECT id FROM notes WHERE path = ?').get(notePath) as { id: number } | undefined;
    if (!note) return;
    this.db.prepare(`
      DELETE FROM file_links WHERE note_id = ? AND file_path = ? AND line = ?
    `).run(note.id, filePath, line);
  }

  close(): void {
    this.db.close();
  }
}

// Singleton per process
let _vaultService: VaultService | null = null;

export function getVaultService(): VaultService {
  if (!_vaultService) {
    _vaultService = new VaultService();
  }
  return _vaultService;
}
