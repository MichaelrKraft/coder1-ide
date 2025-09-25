/**
 * Terminal Output Cleaner
 * Strips ANSI escape codes and control characters from terminal output
 * Makes Claude's responses vibe-coder friendly
 */

/**
 * Remove ANSI escape codes from text
 */
export function stripAnsiCodes(text: string): string {
  if (!text) return '';
  
  return text
    // Remove ANSI color codes and cursor movements
    .replace(/\x1b\[[0-9;]*[mGKHFJ]/g, '')
    // Remove other escape sequences
    .replace(/\x1b\]0;[^\x07]*\x07/g, '') // Terminal title
    .replace(/\x1b\[\?[0-9]+[hl]/g, '') // Cursor show/hide
    .replace(/\x1b\[[\d;]*[HfABCDEFGJKSTsu]/g, '') // Cursor positioning
    // Remove carriage returns that create overwriting
    .replace(/\r(?!\n)/g, '')
    // Remove other control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // Clean up multiple spaces
    .replace(/  +/g, ' ')
    // Clean up multiple newlines
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
}

/**
 * Extract clean content from Claude's response
 */
export function extractClaudeContent(text: string): string {
  const cleaned = stripAnsiCodes(text);
  
  // Remove Claude's "thinking" indicators
  const withoutThinking = cleaned
    .replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, '')
    .replace(/🤔 Thinking\.\.\..*?\n/g, '')
    .replace(/Pondering.*?\n/gi, '')
    .replace(/Let me think.*?\n/gi, '')
    .replace(/Analyzing.*?\n/gi, '');
  
  // Remove progress indicators
  const withoutProgress = withoutThinking
    .replace(/\[[\d\/]+\]/g, '') // [1/5], [2/5], etc.
    .replace(/\[=+>\s*\]/g, '') // Progress bars
    .replace(/\.{3,}/g, '...') // Excessive dots
    .replace(/█+/g, '') // Block characters
    .replace(/[━─│┌┐└┘├┤┬┴┼]/g, ''); // Box drawing characters
  
  return withoutProgress.trim();
}

/**
 * Detect the type of Claude response
 */
export type ContentType = 'code' | 'explanation' | 'error' | 'solution' | 'general';

export function detectContentType(text: string): ContentType {
  const cleaned = text.toLowerCase();
  
  // Check for code blocks
  if (cleaned.includes('```') || cleaned.includes('function') || cleaned.includes('const ') || cleaned.includes('import ')) {
    return 'code';
  }
  
  // Check for error discussions
  if (cleaned.includes('error') || cleaned.includes('exception') || cleaned.includes('failed') || cleaned.includes('bug')) {
    return 'error';
  }
  
  // Check for solutions
  if (cleaned.includes('solution') || cleaned.includes('fix') || cleaned.includes('resolve') || cleaned.includes('try this')) {
    return 'solution';
  }
  
  // Check for explanations
  if (cleaned.includes('because') || cleaned.includes('explains') || cleaned.includes('this means') || cleaned.includes('the reason')) {
    return 'explanation';
  }
  
  return 'general';
}

/**
 * Generate a smart summary from Claude's response
 */
export function generateSmartSummary(text: string): string {
  const cleaned = extractClaudeContent(text);
  const lines = cleaned.split('\n').filter(line => line.trim().length > 0);
  
  // Look for key sentences that summarize the response
  const summaryPatterns = [
    /^(the solution is|to fix this|you should|you can|try)/i,
    /^(this happens because|the reason is|this means)/i,
    /^(i'll|i will|let me|here's how)/i,
    /^(in summary|to summarize|basically)/i
  ];
  
  // Find the best summary sentence
  for (const pattern of summaryPatterns) {
    const match = lines.find(line => pattern.test(line));
    if (match) {
      return cleanSentence(match);
    }
  }
  
  // Look for sentences with action words
  const actionSentence = lines.find(line => 
    /\b(use|install|update|change|modify|add|remove|run|execute|check|set|configure|create|delete)\b/i.test(line)
  );
  
  if (actionSentence) {
    return cleanSentence(actionSentence);
  }
  
  // Find first substantial sentence (not just acknowledgment)
  const substantial = lines.find(line => {
    const lower = line.toLowerCase();
    return line.length > 30 && 
           !lower.startsWith('sure') && 
           !lower.startsWith('okay') &&
           !lower.startsWith('i understand') &&
           !lower.startsWith('got it');
  });
  
  if (substantial) {
    return cleanSentence(substantial);
  }
  
  // Fallback to first line
  return cleanSentence(lines[0] || 'Claude provided a response');
}

/**
 * Clean up a sentence for display
 */
function cleanSentence(sentence: string): string {
  return sentence
    .replace(/^[•\-\*\s]+/, '') // Remove bullet points
    .replace(/^\d+\.\s*/, '') // Remove numbered lists
    .replace(/^(Sure|Okay|Got it|I see)[,.]?\s*/i, '') // Remove acknowledgments
    .substring(0, 150)
    .trim();
}

/**
 * Get an emoji for the content type
 */
export function getContentEmoji(type: ContentType): string {
  switch (type) {
    case 'code': return '💻';
    case 'error': return '🐛';
    case 'solution': return '💡';
    case 'explanation': return '📚';
    default: return '💭';
  }
}

/**
 * Format time ago in a friendly way
 */
export function formatFriendlyTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get a time icon based on how recent
 */
export function getTimeIcon(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 1) return '🕐';
  if (diffHours < 24) return '🕰️';
  if (diffHours < 168) return '📅'; // Less than a week
  return '📆';
}