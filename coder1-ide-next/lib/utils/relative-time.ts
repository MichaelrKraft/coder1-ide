/**
 * Convert a date to human-readable relative time.
 * Used for session memory formatting to make timestamps more intuitive.
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return 'in the future';
  if (diffHours < 1) return 'just now';
  if (diffHours < 2) return '1 hour ago';
  if (diffHours < 24) return `${Math.round(diffHours)} hours ago`;
  if (diffHours < 48) return 'yesterday';
  if (diffHours < 168) return `${Math.round(diffHours / 24)} days ago`;
  if (diffHours < 336) return '1 week ago';
  if (diffHours < 720) return `${Math.round(diffHours / 168)} weeks ago`;
  return `${Math.round(diffHours / 720)} months ago`;
}

/**
 * Format a date with both relative and absolute time for clarity.
 * Example: "2 hours ago (Feb 14)"
 */
export function getRelativeTimeWithDate(date: Date | string): string {
  const relative = getRelativeTime(date);
  const then = new Date(date);
  const formatted = then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // For recent times (< 24 hours), just use relative
  const diffMs = new Date().getTime() - then.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) return relative;
  return `${relative} (${formatted})`;
}
