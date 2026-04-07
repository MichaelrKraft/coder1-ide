// lib/agent-hub/thought-parser.ts
// TypeScript type wrapper — server.js uses the .js file directly (CommonJS)

export interface ThoughtEvent {
  eventType: 'tool_call' | 'tool_result' | 'thinking' | 'milestone';
  label: string;
  tool?: string;
  detail?: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('./thought-parser.js') as {
  parseThoughtFromChunk: (chunk: string) => ThoughtEvent | null;
};

export const parseThoughtFromChunk = mod.parseThoughtFromChunk;
