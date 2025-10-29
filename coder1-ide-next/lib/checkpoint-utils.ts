/**
 * Checkpoint Filtering Utilities
 * Provides centralized filtering for checkpoint data to remove transient animations and artifacts
 */

/**
 * Filter function to remove Claude thinking animations and validation loops from terminal data
 * This ensures clean checkpoint snapshots without animation artifacts or validation errors
 */
export function filterThinkingAnimations(terminalData: string): string {
  if (!terminalData) return terminalData;
  
  // Remove thinking animation lines including spinner, text, and cursor movements
  // Patterns to match:
  // 1. Lines with Unicode spinners (✳, ✢, ·, ✶, ✻, ✽, etc.) + "Thinking…" or variations
  // 2. Associated cursor movement sequences
  // 3. Color codes around "Thinking" with letters highlighted differently
  // 4. Claude Code validation loop messages and "Flowing…" patterns
  
  let filtered = terminalData;
  
  // 🚨 CRITICAL FIX (Jan 2025): Specific pattern for "plan mode on (shift+tab to cycle)"
  // This MUST run FIRST before other filters
  // Diagnostic test showed 117 out of 120 instances were not being caught
  const planModeOnPatterns = [
    // Match exact "plan mode on (shift+tab to cycle)" with pause symbol and any whitespace
    /^\s*⏸\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    // Match without pause symbol
    /^\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    // Match with potential ANSI codes around the text
    /\u001b\[[0-9;]*m?\s*⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*\u001b\[[0-9;]*m?/gi,
    // Match indented versions (your test data shows indented lines)
    /^[ \t]+⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    // Match with carriage returns and newlines
    /\r?\n?\s*⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*\r?\n?/gi,
    // Aggressive catch-all: any line containing this phrase
    /.*plan mode on\s*\(shift\+tab to cycle\).*/gi
  ];
  
  // Apply the critical fix FIRST - this is the permanent solution
  for (const pattern of planModeOnPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Remove thinking animation patterns with all their ANSI codes
  // This matches lines with spinner symbols followed by "Thinking" (with possible color codes in between)
  const thinkingPatterns = [
    // Match lines with thinking animations including color codes
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s+\u001b\[38;5;\d+m.*?[Tt]hin.*?king.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match simpler thinking patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s+[Tt]hinking…\s+\(esc to interrupt\).*?\r?\n/g,
    // Match cursor movement sequences that are part of animations
    /(?:\u001b\[2K\u001b\[1A){2,}(?:\u001b\[2K\u001b\[G)?/g,
    // Match standalone cursor clearing sequences (often left after animations)
    /\u001b\[2K\u001b\[G\r?\n/g,
    // Remove excessive newlines that might be left
    /(\r?\n){4,}/g
  ];
  
  // Claude Code validation loop patterns - CRITICAL FOR ALPHA LAUNCH
  const validationLoopPatterns = [
    // Match "Found invalid settings files" messages with any surrounding text
    /.*Found invalid settings files\. They will be ignored\. Run \/doctor for details\..*\r?\n/g,
    // Match "Flowing…" patterns with spinners and interruption text
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Flowing…\s*\(esc to interrupt\).*?\r?\n/g,
    // Match color-coded "Flowing…" patterns
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Flowing.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match validation loop cursor sequences (specific to Claude Code loops)
    /\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[G.*?Found invalid settings files.*?\r?\n/g,
    // Match repetitive validation sequences
    /(\s*Found invalid settings files\. They will be ignored\. Run \/doctor for details\.\s*\r?\n){2,}/g,
    // Match repetitive "Flowing…" sequences
    /([✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Flowing…\s*\(esc to interrupt\).*?\r?\n){2,}/g
  ];
  
  // Plan mode animation patterns - CRITICAL FOR CHECKPOINT RESTORATION
  const planModePatterns = [
    // Match "Examining" patterns with any variation
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Examining.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Examining.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match "Stewing" patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Stewing.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Stewing.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match "Pouncing" patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Pouncing.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Pouncing.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match "Conjuring" patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Conjuring.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Conjuring.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match "Tempering" patterns - CRITICAL FOR USER'S ISSUE
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Tempering.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Tempering.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match "Planning" patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Planning.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Planning.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match "Analyzing" patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Analyzing.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Analyzing.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match repetitive plan mode sequences
    /([✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*(?:Examining|Stewing|Pouncing|Conjuring|Tempering|Planning|Analyzing).*?\(esc to interrupt\).*?\r?\n){2,}/g,
    // Match specific "Examining checkpoint system" pattern
    /.*Examining checkpoint system.*?\r?\n/g,
    /.*Examining the checkpoint system.*?\r?\n/g,
    // Generic catch-all for any Claude Code animation verb ending in "-ing"
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*[A-Z][a-z]+ing.*?\(esc to interrupt\).*?\r?\n/g,
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?[A-Z][a-z]+ing.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g
  ];
  
  // Plan mode UI elements - box drawing, status lines, todo indicators
  const planModeUIPatterns = [
    // Match box drawing characters for plan mode UI
    /[┌─┐│└┘├┤┬┴┼╭╮╰╯╱╲╳]+.*?\r?\n/g,
    // Match plan mode status lines with brackets
    /\[\s*(?:Planning|Analyzing|Building|Reviewing|Testing|Implementing)\s*\].*?\r?\n/g,
    // Match todo-style indicators
    /\s*(?:□|☐|☑|☒|✓|✗|×)\s+.*?(?:TODO|DONE|IN PROGRESS|PENDING).*?\r?\n/g,
    // Match progress indicators
    /\s*(?:\d+%|\d+\/\d+)\s*(?:complete|done|finished|remaining).*?\r?\n/g,
    // Match step indicators
    /\s*(?:Step\s+\d+:|\d+\.|\d+\))\s*.*?\r?\n/g,
    // Match plan mode headers
    /\s*(?:===+|---+)\s*(?:PLAN|STRATEGY|APPROACH|ANALYSIS|REVIEW)\s*(?:===+|---+).*?\r?\n/g
  ];
  
  // CRITICAL: Statusline task messages - the main cause of checkpoint replay issues
  // These patterns catch the actual task descriptions that previous fixes missed
  const statuslineTaskPatterns = [
    // CRITICAL FIX: Handle "? for shortcuts" pattern with multiple ANSI codes (September 26-27th issue)
    // Pattern: \u001b[2m\u001b[38;2;136;136;136m (repeated) + "? for shortcuts" + \u001b[22m
    /(?:\u001b\[2m\u001b\[38;2;\d+;\d+;\d+m){1,5}\s*\u001b\[2m\?\s*for\s*shortcuts\u001b\[22m.*?\r?\n/g,
    // Simpler fallback for "? for shortcuts" with any ANSI codes
    /.*\u001b\[.*?m.*\?\s*for\s*shortcuts.*?\r?\n/g,
    // Basic "? for shortcuts" pattern without ANSI codes
    /.*\?\s*for\s*shortcuts.*?\r?\n/gi,
    
    // CRITICAL: Handle ANSI codes within statusline messages
    // These patterns match statusline messages with embedded ANSI escape sequences
    /.*\u001b\[\d+m\(esc to interrupt.*$/gm,  // Matches [2m(esc to interrupt...
    /.*\(esc to interrupt.*$/gm,              // Fallback without ANSI
    
    // Match any line with pause symbol and "plan mode on"
    /.*⏸.*plan mode on.*$/gim,
    
    // Match lines with specific Claude Code status patterns
    /.*(?:Examining|Planning|Analyzing|Building|Testing).*\(esc to interrupt.*$/gim,
    
    // Catch lines with mixed ANSI codes and status text
    /.*\u001b\[[\d;]*m.*\(esc to interrupt.*$/gm,
    
    // Match any line with the characteristic statusline control hints
    /.*\(esc to interrupt.*?ctrl\+t.*?\).*$/gm,
    /.*ctrl\+t to show todos.*$/gm,
    /.*ctrl\+t for todos.*$/gm,
    
    // Match "Next:" indicators with the special arrow character
    /^\s*⎿\s*Next:.*$/gm,
    /.*⎿.*Next:.*$/gm,
    
    // Match "Tip:" indicators with the special arrow character
    /^\s*⎿\s*Tip:.*$/gm,
    /.*⎿.*Tip:.*$/gm,
    
    // Match task descriptions with status symbols and control hints (most common pattern)
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+[^(]+\(esc to interrupt.*?\).*$/gm,
    
    // Match statusline tasks with both control hints present
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+.*?\s*\(esc.*?ctrl\+t.*?\).*$/gm,
    
    // Match lines with ANSI codes containing statusline patterns
    /\u001b\[.*?m[✶✳✢·✻✽✦☆★▪▫◆◇○●]\u001b\[.*?m\s+.*?\(esc to interrupt.*?\).*$/gm,
    
    // Clean up orphaned "Next:" lines without context
    /^\s*Next:.*$/gm,
    
    // Clean up orphaned "Tip:" lines without context
    /^\s*Tip:.*$/gm,
    
    // Remove standalone control hints that might be left over
    /^\s*\(esc to interrupt.*?\).*$/gm,
    /^\s*\(.*?ctrl\+t.*?\).*$/gm,
    
    // Match any residual statusline-like patterns with task descriptions
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+[A-Z][^.!?\n]*[a-z].*?\(esc.*?\).*$/gm,
    
    // Catch statusline tasks with any descriptive text (not just -ing verbs)
    // This generic pattern catches messages like "Adding configuration system with TOML-style localStorage"
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+[A-Z][\w\s]+.*?\(esc to interrupt.*?\).*$/gm,
    
    // Additional specific pattern for messages with "ctrl+t" at the end
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+.*?·\s*ctrl\+t.*$/gm,
    
    // CRITICAL FIX: Handle statusline with ANSI codes mixed in
    // This catches lines like: [38;5;174m✶[39m [text] [2m(esc to interrupt
    /.*\u001b\[[\d;]+m[✶✳✢·✻✽✦☆★▪▫◆◇○●]\u001b.*\u001b\[\d+m\(esc to interrupt.*$/gm,
    
    // Catch any line ending with variations of "esc to interrupt"
    /.*\besc to interrupt\b.*$/gm,
    
    // CRITICAL FIX: Bash(claude) running status messages (January 2025)
    // These appear when Claude Code CLI is active and were being restored on every page load
    /^\s*Bash\(claude\)\s*$/gm,
    /.*Bash\(claude\).*\r?\n/g,
    
    // Match "Running…" status lines with the tree drawing character
    /^\s*⎿\s*Running…\s*$/gm,
    /.*⎿\s*Running….*\r?\n/g,
    
    // Match "ctrl+b to run in background" hints
    /^\s*ctrl\+b to run in background\s*$/gm,
    /.*ctrl\+b to run in background.*\r?\n/g,
    
    // Catch complete sequences of all three lines together
    /(?:.*Bash\(claude\).*\r?\n)?(?:.*⎿\s*Running….*\r?\n)?(?:.*ctrl\+b to run in background.*\r?\n?)/g,
    
    // Generic catch-all for any claude command status
    /.*Bash\([^)]+\).*\r?\n/g,
    
    // MCP health check messages (January 2025) - CRITICAL FIX
    // These appear when Claude Code checks MCP server status
    /.*⎿\s*Checking MCP server health.*\r?\n/g,
    /^\s*⎿\s*Checking MCP server health.*$/gm,
    
    // Time duration indicators (4s), (10ms), etc.
    /^\s*\(\d+[sm]s?\)\s*$/gm,
    /.*\(\d+[sm]s?\).*\r?\n/g,
    
    // MCP command variations (claude mcp list, claude mcp status, etc.)
    /.*Bash\(claude\s+mcp.*\).*\r?\n/g,
    /.*claude\s+mcp\s+(list|status|check|health).*\r?\n/g,
    
    // Generic MCP server check messages
    /.*MCP server.*health.*\r?\n/gi,
    /.*Checking.*server.*\r?\n/gi,
    
    // Claude CLI status messages (October 2025) - CRITICAL FIX
    // These appear when Claude Code is processing commands
    /.*Mustering….*\r?\n/g,
    /^\s*·\s*Mustering….*$/gm,
    /.*Clauding….*\r?\n/g,
    /^\s*·\s*Clauding….*$/gm,
    /.*✻\s*Clauding….*\r?\n/g,
    /^\s*✻\s*Clauding….*$/gm,
    /.*\(esc to interrupt\).*\r?\n/g,
    /^\s*\(esc to interrupt\).*$/gm,
    
    // Bracketed paste mode codes (terminal escape sequences)
    /\[200~/g,
    /\[201~/g,
    
    // ANSI cursor positioning codes that show as text
    /\[I/g,
    /\[O/g
  ];
  
  // MCP Tool Call Patterns - CRITICAL FOR FILTERING TOOL INVOCATIONS
  // These patterns catch MCP tool calls, record symbols, and other Claude operational messages
  const mcpToolPatterns = [
    // Match MCP tool calls like "playwright - playwright_navigate (MCP)"
    /.*?\w+\s*-\s*\w+.*?\(MCP\).*?\r?\n/g,
    // Match record symbols with tool calls
    /⏺\s*.*?\w+\s*-\s*\w+.*?\(MCP\).*?\r?\n/g,
    // Match any line starting with record symbol
    /^⏺.*?\r?\n/gm,
    // Match tool invocation patterns with underscores (like playwright_navigate)
    /.*?\w+\s*-\s*\w+_\w+.*?\(.*?\).*?\r?\n/g,
    // Generic MCP pattern catch-all
    /.*?\(MCP\).*?\r?\n/g,
    // Match lines with record symbols anywhere
    /.*⏺.*?\r?\n/g,
    // Match any tool call pattern (broad)
    /.*?\w+\s*-\s*\w+\s*\(.*?\).*?\r?\n/g,
    // Match repeated tool invocations (the main issue)
    /(.*?\w+\s*-\s*\w+.*?\(MCP\).*?\r?\n){2,}/g,
    // Match incomplete tool calls (interrupted)
    /.*?\w+\s*-\s*\w+.*?\(MCP\)\(.*?$/gm
  ];
  
  // DISCOVERED MISSING PATTERNS - Additional Claude Code patterns found during comprehensive analysis
  const additionalClaudePatterns = [
    // Window title sequences (ANSI escape codes that set terminal title)
    /\u001b\]0;[^]*?\u0007/g,
    
    // Warning messages with warning symbol
    /.*⚠.*?will impact performance.*?\r?\n/g,
    /.*⚠.*?Large.*?CLAUDE\.md.*?\r?\n/g,
    /.*⚠.*?Claude Bridge not connected.*?\r?\n/g,
    
    // Excessive ANSI color sequence repetition (cleanup visual noise)
    /(\u001b\[2m\u001b\[38;2;153;153;153m\s*){5,}/g,
    /(\u001b\[2m\u001b\[38;2;[\d;]+m\s*){3,}/g,
    
    // Claude CLI tip messages (from Claude Code CLI itself)
    /.*Send messages to Claude while it works to steer Claude in real-time.*?\r?\n/g,
    /.*Tip:\s*Send messages to Claude.*?\r?\n/g,
    
    // Additional escape sequences that create noise
    /\u001b\[2J\u001b\[3J\u001b\[H/g,  // Clear screen sequences
    /(\u001b\[2m\u001b\[38;2;153;153;153m\r?\n){2,}/g,  // Repeated grayed-out lines
    
    // Warning pattern variations found in logs
    /.*⚠️.*not available.*?\r?\n/g,
    /.*⚠️.*not found.*?\r?\n/g,
    /.*⚠️.*failed.*?\r?\n/g,
    
    // Other system messages that create checkpoint noise
    /.*bash-.*?\u001b\[\?25[lh].*?\r?\n/g,  // Bash prompt sequences
  ];
  
  // Apply thinking animation filters
  for (const pattern of thinkingPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply validation loop filters - CRITICAL FOR ALPHA LAUNCH
  for (const pattern of validationLoopPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply plan mode animation filters - CRITICAL FOR CHECKPOINT RESTORATION
  for (const pattern of planModePatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply plan mode UI element filters
  for (const pattern of planModeUIPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply statusline task message filters - CRITICAL FOR PERMANENT FIX
  for (const pattern of statuslineTaskPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply MCP tool call filters - CRITICAL FOR TOOL INVOCATION CLEANUP
  for (const pattern of mcpToolPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply additional Claude Code pattern filters - COMPREHENSIVE CLEANUP
  for (const pattern of additionalClaudePatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Clean up any remaining isolated cursor movement codes
  filtered = filtered.replace(/(\u001b\[2K\u001b\[1A)+\u001b\[2K\u001b\[G/g, '');
  
  // Clean up validation loop specific cursor sequences
  filtered = filtered.replace(/(\u001b\[2K\u001b\[1A){5,}\u001b\[2K\u001b\[G/g, '');
  
  // Clean up any cursor sequences with newlines at the end (from server logs)
  filtered = filtered.replace(/\[2K\[1A\[2K\[1A\[2K\[1A\[2K\[1A\[2K\[1A\[2K\[G\s*\r?\n/g, '');
  
  // Remove any remaining "Found invalid settings" fragments
  filtered = filtered.replace(/.*Found invalid settings.*?\r?\n/g, '');
  filtered = filtered.replace(/.*Flowing….*?\r?\n/g, '');
  
  // Remove any remaining plan mode fragments
  filtered = filtered.replace(/.*(?:Examining|Stewing|Pouncing|Conjuring|Tempering|Planning|Analyzing).*?\r?\n/g, '');
  filtered = filtered.replace(/.*checkpoint system.*?\r?\n/gi, '');
  
  // Normalize multiple consecutive newlines to maximum 2
  filtered = filtered.replace(/(\r?\n){3,}/g, '\r\n\r\n');
  
  return filtered;
}

/**
 * Process checkpoint data before saving
 * Applies all necessary filters to ensure clean checkpoint snapshots
 */
export function processCheckpointDataForSave(snapshot: any): any {
  if (!snapshot) return snapshot;
  
  const processed = { ...snapshot };
  
  // Filter terminal history to remove thinking animations
  if (processed.terminal) {
    processed.terminal = filterThinkingAnimations(processed.terminal);
  }
  
  // Filter conversation history if present
  if (processed.conversationHistory && Array.isArray(processed.conversationHistory)) {
    processed.conversationHistory = processed.conversationHistory.map((conv: any) => {
      if (conv.content && typeof conv.content === 'string') {
        return {
          ...conv,
          content: filterThinkingAnimations(conv.content)
        };
      }
      return conv;
    });
  }
  
  return processed;
}

/**
 * Async version of filterThinkingAnimations
 * Processes terminal data in chunks to avoid blocking Node.js event loop
 * 🚨 CRITICAL FIX: Prevents 134+ second event loop blocks on large checkpoint restores
 */
export async function filterThinkingAnimationsAsync(
  terminalData: string,
  chunkSize = 5000  // 5KB chunks - larger to reduce boundary issues with ANSI codes
): Promise<string> {
  if (!terminalData) return terminalData;
  
  const totalChars = terminalData.length;
  const estimatedChunks = Math.ceil(totalChars / chunkSize);
  
  console.log(`🔄 Async filtering: ${totalChars} chars in ~${estimatedChunks} chunks`);
  
  // Split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < terminalData.length; i += chunkSize) {
    chunks.push(terminalData.substring(i, i + chunkSize));
  }
  
  // Process each chunk with event loop yielding
  const filteredChunks: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    // Yield control to event loop every chunk (allows heartbeat responses)
    await new Promise(resolve => setImmediate(resolve));
    
    // Apply synchronous filtering to this chunk
    const filtered = filterThinkingAnimations(chunks[i]);
    filteredChunks.push(filtered);
    
    // Progress logging every 5 chunks
    if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
      console.log(`🔄 Progress: ${i + 1}/${chunks.length} chunks filtered`);
    }
  }
  
  const result = filteredChunks.join('');
  console.log(`✅ Async filtering complete: ${totalChars} → ${result.length} chars`);
  
  return result;
}

/**
 * Process checkpoint data after loading for restore
 * Ensures any remaining artifacts are cleaned before restoration
 * 🚨 CRITICAL FIX: Now uses ASYNC filtering to prevent event loop blocking
 */
export async function processCheckpointDataForRestore(checkpoint: any): Promise<any> {
  if (!checkpoint) return checkpoint;
  
  const processed = { ...checkpoint };
  const startTime = Date.now();
  
  // 🚨 CRITICAL: Use ASYNC filtering to prevent event loop blocking
  // Previous synchronous version blocked for 134+ seconds on 203KB terminal history
  if (processed.terminalHistory) {
    console.log(`🧹 Filtering terminalHistory: ${processed.terminalHistory.length} chars (async)`);
    processed.terminalHistory = await filterThinkingAnimationsAsync(processed.terminalHistory);
  }
  
  // Also filter terminalHistory in data object (backup location)
  if (processed.data?.terminalHistory) {
    console.log(`🧹 Filtering data.terminalHistory (async)`);
    processed.data.terminalHistory = await filterThinkingAnimationsAsync(processed.data.terminalHistory);
  }
  
  // Apply filtering to restore snapshot data as well (double safety)
  if (processed.data?.snapshot) {
    processed.data.snapshot = processCheckpointDataForSave(processed.data.snapshot);
  }
  
  const duration = Date.now() - startTime;
  console.log(`✅ Checkpoint filtering complete in ${duration}ms (was 134000ms+)`);
  
  return processed;
}

/**
 * Extract Claude commands from terminal history
 * Parses terminal output to find executable Claude commands
 */
export function extractClaudeCommands(terminalHistory: string): Array<{
  command: string;
  context: string;
  timestamp?: string;
}> {
  if (!terminalHistory) return [];
  
  const commands: Array<{ command: string; context: string; timestamp?: string }> = [];
  
  // Split by lines and process each line
  const lines = terminalHistory.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for lines that contain 'claude' commands
    // Match various patterns like:
    // - claude help me with this
    // - $ claude analyze this code
    // - bash-3.2$ claude fix this error
    const claudeCommandMatch = line.match(/(?:[\$#]\s*)?claude\s+(.+)/i);
    
    if (claudeCommandMatch) {
      const fullCommand = claudeCommandMatch[0].trim();
      const commandText = claudeCommandMatch[1].trim();
      
      // Get some context from surrounding lines
      const contextStart = Math.max(0, i - 2);
      const contextEnd = Math.min(lines.length, i + 3);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      // Try to extract timestamp if available
      let timestamp: string | undefined;
      const timestampMatch = line.match(/\[(\d{2}:\d{2}:\d{2})\]/);
      if (timestampMatch) {
        timestamp = timestampMatch[1];
      }
      
      commands.push({
        command: fullCommand,
        context: context,
        timestamp
      });
    }
  }
  
  return commands;
}