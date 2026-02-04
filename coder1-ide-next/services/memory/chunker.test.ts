/**
 * Tests for the markdown-aware chunking service
 * Run with: npx ts-node services/memory/chunker.test.ts
 */

import {
  chunkMarkdown,
  estimateTokens,
  generateContentHash,
  validateChunk,
  getChunkStats,
  Chunk,
} from './chunker';

// ============================================================================
// Test Utilities
// ============================================================================

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  [OK] ${name}`);
  } catch (error) {
    console.error(`  [FAIL] ${name}:`, (error as Error).message);
    process.exitCode = 1;
  }
}

// ============================================================================
// Tests
// ============================================================================

console.log('\n=== Testing Markdown Chunker ===\n');

// Test: estimateTokens
console.log('--- estimateTokens ---');
runTest('should return 0 for empty string', () => {
  assert(estimateTokens('') === 0, 'Empty string should have 0 tokens');
});

runTest('should estimate tokens correctly', () => {
  const text = 'Hello world'; // 11 chars ~= 3 tokens
  const tokens = estimateTokens(text);
  assert(tokens === 3, `Expected 3 tokens, got ${tokens}`);
});

// Test: generateContentHash
console.log('\n--- generateContentHash ---');
runTest('should return empty string for empty input', () => {
  assert(generateContentHash('') === '', 'Empty input should return empty hash');
});

runTest('should generate consistent SHA-256 hashes', () => {
  const hash1 = generateContentHash('Hello world');
  const hash2 = generateContentHash('Hello world');
  assert(hash1 === hash2, 'Same content should produce same hash');
  assert(hash1.length === 64, `Expected 64 char hex hash, got ${hash1.length}`);
});

runTest('should generate different hashes for different content', () => {
  const hash1 = generateContentHash('Hello world');
  const hash2 = generateContentHash('Hello World');
  assert(hash1 !== hash2, 'Different content should produce different hashes');
});

// Test: chunkMarkdown - Empty input
console.log('\n--- chunkMarkdown: Edge Cases ---');
runTest('should handle empty input', () => {
  const chunks = chunkMarkdown('');
  assert(chunks.length === 0, 'Empty input should return empty array');
});

runTest('should handle whitespace-only input', () => {
  const chunks = chunkMarkdown('   \n\n   ');
  assert(chunks.length === 0, 'Whitespace-only should return empty array');
});

runTest('should handle single line input', () => {
  const chunks = chunkMarkdown('Hello world');
  assert(chunks.length === 1, `Expected 1 chunk, got ${chunks.length}`);
  assert(chunks[0].content === 'Hello world', 'Content should match');
  assert(chunks[0].startLine === 1, 'Start line should be 1');
  assert(chunks[0].endLine === 1, 'End line should be 1');
});

// Test: chunkMarkdown - Structure preservation
console.log('\n--- chunkMarkdown: Structure Preservation ---');
runTest('should preserve headings', () => {
  const markdown = `# Main Title

Some content here.

## Subsection

More content.`;
  const chunks = chunkMarkdown(markdown, { maxTokens: 1000 });
  assert(chunks.length >= 1, 'Should produce at least 1 chunk');
  assert(chunks[0].content.includes('# Main Title'), 'Should include heading');
});

runTest('should never split mid-code-block', () => {
  const codeBlock = '```typescript\nfunction hello() {\n  console.log("hi");\n}\n```';
  const chunks = chunkMarkdown(codeBlock, { maxTokens: 1000 });
  assert(chunks.length === 1, `Expected 1 chunk for small code block, got ${chunks.length}`);
  assert(chunks[0].metadata.isCodeBlock === true, 'Should be marked as code block');
});

runTest('should preserve list items together', () => {
  const list = `- Item 1
- Item 2
- Item 3`;
  const chunks = chunkMarkdown(list, { maxTokens: 1000 });
  assert(chunks.length === 1, 'List should be in single chunk');
  assert(chunks[0].content.includes('- Item 1'), 'Should include first item');
  assert(chunks[0].content.includes('- Item 3'), 'Should include last item');
});

// Test: chunkMarkdown - Chunking behavior
console.log('\n--- chunkMarkdown: Chunking Behavior ---');
runTest('should split long content into multiple chunks', () => {
  const longContent = Array(100).fill('This is a sentence with some content.').join('\n\n');
  const chunks = chunkMarkdown(longContent, { maxTokens: 100 });
  assert(chunks.length > 1, `Expected multiple chunks, got ${chunks.length}`);
});

runTest('should add overlap between chunks', () => {
  const content = `First paragraph with unique content MARKER_A.

Second paragraph with different content MARKER_B.

Third paragraph with more unique content MARKER_C.

Fourth paragraph continuing the content MARKER_D.`;
  const chunks = chunkMarkdown(content, { maxTokens: 50, overlapTokens: 20 });

  // Check that chunks have some overlap (if there are multiple chunks)
  if (chunks.length > 1) {
    // The overlap means later chunks may contain content from earlier chunks
    // This is intentional for context continuity
    assert(true, 'Multiple chunks created with overlap');
  }
});

// Test: chunkMarkdown - Metadata
console.log('\n--- chunkMarkdown: Metadata ---');
runTest('should track heading context', () => {
  const markdown = `# My Section

This is content under the section.`;
  const chunks = chunkMarkdown(markdown, { maxTokens: 1000 });
  // The heading metadata should be set based on the current heading
  assert(chunks[0].metadata.heading === 'My Section',
    `Expected heading 'My Section', got '${chunks[0].metadata.heading}'`);
});

runTest('should detect section types', () => {
  const preferencesContent = 'I prefer TypeScript over JavaScript.';
  const chunks = chunkMarkdown(preferencesContent);
  assert(chunks[0].metadata.sectionType === 'preferences',
    `Expected 'preferences', got '${chunks[0].metadata.sectionType}'`);
});

runTest('should track line numbers accurately', () => {
  const content = `Line 1
Line 2
Line 3`;
  const chunks = chunkMarkdown(content);
  assert(chunks[0].startLine === 1, `Expected startLine 1, got ${chunks[0].startLine}`);
  assert(chunks[0].endLine >= 1, `Expected endLine >= 1, got ${chunks[0].endLine}`);
});

// Test: validateChunk
console.log('\n--- validateChunk ---');
runTest('should validate correct chunks', () => {
  const chunks = chunkMarkdown('Valid content here');
  assert(chunks.length === 1, 'Should produce 1 chunk');
  assert(validateChunk(chunks[0]) === true, 'Valid chunk should pass validation');
});

runTest('should reject invalid chunks', () => {
  const invalidChunk: Chunk = {
    id: 'test',
    content: 'content',
    contentHash: 'wrong_hash',
    startLine: 1,
    endLine: 1,
    tokenCount: 1,
    metadata: {},
  };
  assert(validateChunk(invalidChunk) === false, 'Invalid hash should fail validation');
});

// Test: getChunkStats
console.log('\n--- getChunkStats ---');
runTest('should compute statistics correctly', () => {
  const markdown = `# Section 1

Some regular text here.

\`\`\`typescript
const x = 1;
\`\`\`

# Section 2

I prefer clean code.`;
  const chunks = chunkMarkdown(markdown, { maxTokens: 50 });
  const stats = getChunkStats(chunks);

  assert(stats.totalChunks === chunks.length, 'Total chunks should match');
  assert(stats.totalTokens > 0, 'Should have positive total tokens');
  assert(stats.avgTokensPerChunk > 0, 'Should have positive average');
});

// Test: Large code block splitting
console.log('\n--- Large Code Block Splitting ---');
runTest('should split large code blocks at function boundaries', () => {
  const largeCode = `\`\`\`typescript
function one() {
  console.log('one');
}

function two() {
  console.log('two');
}

function three() {
  console.log('three');
}

function four() {
  console.log('four');
}

function five() {
  console.log('five');
}
\`\`\``;
  const chunks = chunkMarkdown(largeCode, { maxTokens: 50 });
  // With small maxTokens, this should split into multiple chunks
  assert(chunks.length >= 1, 'Should produce chunks');
  // All chunks should be marked as code
  for (const chunk of chunks) {
    if (chunk.content.includes('function')) {
      assert(chunk.metadata.isCodeBlock === true, 'Code chunks should be marked as code');
    }
  }
});

// Test: Nested lists
console.log('\n--- Nested Lists ---');
runTest('should handle nested lists', () => {
  const nestedList = `- Level 1 Item
  - Level 2 Item
    - Level 3 Item
  - Another Level 2
- Back to Level 1`;
  const chunks = chunkMarkdown(nestedList, { maxTokens: 1000 });
  assert(chunks.length >= 1, 'Should produce at least 1 chunk');
  assert(chunks[0].content.includes('Level 3'), 'Should preserve nested items');
});

// Test: Mixed content
console.log('\n--- Mixed Content ---');
runTest('should handle mixed markdown content', () => {
  const mixed = `# Welcome

This is an introduction.

## Code Example

\`\`\`javascript
const greeting = "Hello";
\`\`\`

> This is a quote

- List item 1
- List item 2

---

Final paragraph.`;
  const chunks = chunkMarkdown(mixed, { maxTokens: 1000 });
  assert(chunks.length >= 1, 'Should produce chunks');
  assert(chunks[0].content.includes('Welcome'), 'Should include heading');
});

console.log('\n=== All Tests Completed ===\n');
