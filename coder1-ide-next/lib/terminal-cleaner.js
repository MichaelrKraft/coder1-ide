/**
 * Terminal Output Cleaner
 * Strips ANSI escape codes and control characters from terminal output
 * Makes Claude's responses vibe-coder friendly
 */

/**
 * Remove ANSI escape codes from text
 * @param {string} text
 * @returns {string}
 */
function stripAnsiCodes(text) {
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

module.exports = {
  stripAnsiCodes
};
