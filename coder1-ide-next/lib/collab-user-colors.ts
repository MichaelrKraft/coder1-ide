/**
 * Deterministic user color assignment for collaborative editing.
 * Maps userId to a consistent color via string hashing.
 */

const COLLAB_COLORS = [
  '#E91E63', // Pink
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#F44336', // Red
  '#3F51B5', // Indigo
  '#009688', // Teal
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#FFEB3B', // Yellow
];

/**
 * Get a deterministic color for a user based on their ID.
 * Same userId always returns the same color.
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

/**
 * Get a CSS color with reduced opacity for selections.
 * Returns rgba string with 15% opacity.
 */
export function getUserSelectionColor(userId: string): string {
  const hex = getUserColor(userId);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}
