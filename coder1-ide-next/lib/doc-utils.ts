/**
 * Documentation Utilities
 * 
 * Utilities for formatting and working with documentation content,
 * optimized for copying into Claude conversations.
 */

export interface DocContent {
  title: string;
  url?: string;
  content?: string;
  excerpt?: string;
  categories?: string[];
}

/**
 * Format documentation content for pasting into Claude conversations.
 * Creates a clean, structured format that Claude can easily parse and reference.
 */
export function formatForClaude(doc: DocContent): string {
  const lines: string[] = [];
  
  lines.push(`📚 **${doc.title}**`);
  
  if (doc.url) {
    lines.push(`Source: ${doc.url}`);
  }
  
  lines.push('---');
  
  if (doc.content) {
    lines.push(doc.content.trim());
  } else if (doc.excerpt) {
    lines.push(doc.excerpt.trim());
  } else {
    lines.push('(No content available - visit source URL for details)');
  }
  
  lines.push('---');
  
  if (doc.categories && doc.categories.length > 0) {
    lines.push(`Tags: ${doc.categories.join(', ')}`);
  }
  
  return lines.join('\n');
}

/**
 * Format multiple docs for Claude (e.g., search results)
 */
export function formatMultipleForClaude(docs: DocContent[]): string {
  return docs.map((doc, i) => {
    const formatted = formatForClaude(doc);
    return `## Document ${i + 1}\n${formatted}`;
  }).join('\n\n');
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Copy doc formatted for Claude to clipboard
 */
export async function copyDocForClaude(doc: DocContent): Promise<boolean> {
  const formatted = formatForClaude(doc);
  return copyToClipboard(formatted);
}

/**
 * Truncate content to a reasonable length for Claude context
 */
export function truncateContent(content: string, maxLength: number = 2000): string {
  if (content.length <= maxLength) return content;
  
  // Try to truncate at a sentence boundary
  const truncated = content.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  const breakPoint = Math.max(lastPeriod, lastNewline);
  
  if (breakPoint > maxLength * 0.7) {
    return truncated.substring(0, breakPoint + 1) + '\n\n[Content truncated...]';
  }
  
  return truncated + '...\n\n[Content truncated...]';
}

/**
 * Extract a relevant excerpt from content based on a search query
 */
export function extractRelevantExcerpt(content: string, query: string, contextChars: number = 200): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  
  // Find the first occurrence of any query word
  let bestPosition = -1;
  for (const word of queryWords) {
    const pos = lowerContent.indexOf(word);
    if (pos !== -1 && (bestPosition === -1 || pos < bestPosition)) {
      bestPosition = pos;
    }
  }
  
  if (bestPosition === -1) {
    // No match found, return beginning of content
    return truncateContent(content, contextChars * 2);
  }
  
  // Extract context around the match
  const start = Math.max(0, bestPosition - contextChars);
  const end = Math.min(content.length, bestPosition + contextChars);
  
  let excerpt = content.substring(start, end);
  
  // Clean up the excerpt boundaries
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt;
}
