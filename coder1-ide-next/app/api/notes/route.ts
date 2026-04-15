import { NextRequest, NextResponse } from 'next/server';
import { extractUserId } from '@/lib/auth/extract-user-id';
import { getVaultService } from '@/lib/vault-service';

/**
 * Sanitize a note path to prevent path traversal and enforce conventions.
 * Returns null if the path is invalid.
 */
function sanitizePath(rawPath: string): string | null {
  const cleaned = rawPath.trim().replace(/\\/g, '/');

  // Block path traversal
  if (cleaned.includes('..')) return null;
  // Block absolute paths
  if (cleaned.startsWith('/')) return null;
  // Must be a markdown file
  if (!cleaned.endsWith('.md')) return null;
  // Reasonable length limit
  if (cleaned.length > 255) return null;
  // Reject empty path segments (e.g. "foo//bar.md")
  if (cleaned.split('/').some(seg => seg === '')) return null;

  return cleaned;
}

/**
 * POST /api/notes
 *
 * Creates (or updates) a note in the user's vault.
 * Used by Ambient AI to sync daily summaries into Coder1.
 *
 * Body: { path: string, title: string, content?: string, frontmatter?: Record<string, unknown> }
 * Auth: Bearer token (JWT) in Authorization header, or auth-token cookie
 *
 * Returns 201 on create, 200 on update (idempotent for same path).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Require authentication — 'default' means no valid token
    const userId = extractUserId(request);
    if (userId === 'default') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
    }

    const { path, title, content, frontmatter } = body as Record<string, unknown>;

    // 3. Validate required fields
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path is required and must be a string' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required and must be a string' }, { status: 400 });
    }

    // 4. Sanitize path
    const safePath = sanitizePath(path);
    if (!safePath) {
      return NextResponse.json(
        { error: 'Invalid path. Must be a relative .md path without ".." or a leading "/"' },
        { status: 400 }
      );
    }

    // 5. Validate content size (5MB limit)
    const contentStr = typeof content === 'string' ? content : '';
    if (contentStr.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Content exceeds 5MB limit' }, { status: 413 });
    }

    // 6. Validate frontmatter is an object if provided
    // Merge caller frontmatter and inject title so it survives the filesystem
    // round-trip (vault reads title from parsed.data.title, not from createNote arg)
    const safeFrontmatter: Record<string, unknown> = {
      title: title.trim().slice(0, 500),
      ...(typeof frontmatter === 'object' && frontmatter !== null && !Array.isArray(frontmatter)
        ? (frontmatter as Record<string, unknown>)
        : {}),
    };

    // 7. Get vault service — scoped to this user's database
    const vault = getVaultService(userId);
    if (!vault) {
      return NextResponse.json({ error: 'Knowledge base is unavailable' }, { status: 503 });
    }

    // 8. Create or update note (idempotent — same path → update)
    // vault.createNote() uses ON CONFLICT DO UPDATE internally, so it never
    // throws on duplicate paths. We check existence first to return the
    // correct HTTP status (201 = created, 200 = updated).
    const existing = await vault.getNote(safePath);

    if (existing) {
      const updated = await vault.updateNote(safePath, {
        content: contentStr,
        frontmatter: safeFrontmatter,
      });
      return NextResponse.json(updated, { status: 200 });
    }

    const note = await vault.createNote({
      path: safePath,
      title: title.trim().slice(0, 500),
      content: contentStr,
      frontmatter: safeFrontmatter,
    });
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error('[api/notes] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
