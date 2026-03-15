/**
 * Wikilink parser — parses [[links]] and resolves them to note paths.
 * Resolution strategy (same as Obsidian):
 *   1. Exact match in same folder
 *   2. Shortest unique path
 *   3. First alphabetically
 */

export interface ParsedWikilink {
  raw: string;         // full match including brackets: "[[My Note]]"
  target: string;      // link target: "My Note" or "projects/auth/README"
  alias?: string;      // display alias if "[[target|alias]]"
  position: {
    start: number;
    end: number;
  };
}

const WIKILINK_REGEX = /\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g;

/**
 * Extract all [[wikilinks]] from markdown text.
 */
export function parseWikilinks(content: string): ParsedWikilink[] {
  const links: ParsedWikilink[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(WIKILINK_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    links.push({
      raw: match[0],
      target: match[1].trim(),
      alias: match[2]?.trim(),
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });
  }

  return links;
}

/**
 * Resolve a wikilink target to a note path from a list of known paths.
 *
 * @param target     The link target (e.g. "My Note" or "projects/auth/README")
 * @param sourcePath The path of the note that contains the link
 * @param allPaths   All note paths in the vault (relative)
 * @returns The resolved note path, or null if not found
 */
export function resolveWikilink(
  target: string,
  sourcePath: string,
  allPaths: string[]
): string | null {
  // Strip .md extension from target if present
  const normalizedTarget = target.endsWith('.md') ? target.slice(0, -3) : target;

  // If target contains path separators, try exact path match first
  if (normalizedTarget.includes('/')) {
    const exactWithMd = normalizedTarget + '.md';
    if (allPaths.includes(exactWithMd)) return exactWithMd;
    if (allPaths.includes(normalizedTarget)) return normalizedTarget;
  }

  const sourceDir = sourcePath.includes('/')
    ? sourcePath.substring(0, sourcePath.lastIndexOf('/'))
    : '';

  // 1. Exact match in same folder
  const sameFolderPath = sourceDir ? `${sourceDir}/${normalizedTarget}.md` : `${normalizedTarget}.md`;
  if (allPaths.includes(sameFolderPath)) return sameFolderPath;

  // 2. All paths ending with the target filename
  const targetFilename = normalizedTarget.split('/').pop() || normalizedTarget;
  const candidates = allPaths.filter(p => {
    const filename = p.split('/').pop()?.replace(/\.md$/, '') || '';
    return filename.toLowerCase() === targetFilename.toLowerCase();
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 3. Shortest path wins, then alphabetical
  candidates.sort((a, b) => {
    const lenDiff = a.length - b.length;
    return lenDiff !== 0 ? lenDiff : a.localeCompare(b);
  });

  return candidates[0];
}

/**
 * Extract the base filename (without extension) from a path for display.
 */
export function pathToTitle(notePath: string): string {
  const filename = notePath.split('/').pop() || notePath;
  return filename.endsWith('.md') ? filename.slice(0, -3) : filename;
}

/**
 * Convert a title to a safe filename.
 */
export function titleToFilename(title: string): string {
  return title
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '.md';
}
