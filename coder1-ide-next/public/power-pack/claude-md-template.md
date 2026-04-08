# Coder1 Power Pack

## Loop Prevention
- If the same action fails 3+ times, STOP and report the exact blocker — do not retry
- Never retry a failing build more than 2 times — report instead
- For agent loops: set explicit termination conditions upfront

## Build Safety
- Before running npm run build: check for running builds with `pgrep -f "next build"`
- If a build is already running, do NOT start another
- Never retry a failing build more than 2 times — report the error
- Prefer npm run dev for development (hot reload), only use npm run build when explicitly needed

## Response Style
- No trailing summaries after completing work — the diff speaks for itself
- Lead with the answer, not the reasoning
- Keep responses short and direct
- No emojis unless explicitly requested

## Context-Mode Routing
- For bash commands producing >20 lines of output: use ctx_execute instead of Bash
- For file analysis (not editing): use ctx_execute_file
- For web content: use ctx_fetch_and_index then ctx_search
- For editing: Read tool is correct (Edit needs file content in context)
