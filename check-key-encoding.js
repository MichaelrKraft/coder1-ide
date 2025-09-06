#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const key = process.env.CLAUDE_CODE_API_KEY;

console.log('🔍 Checking key encoding and characters:\n');

// Check for hidden characters
console.log('Key length:', key.length);
console.log('Expected length for sk-ant-api03 key:', '~108 characters');
console.log();

// Check each character
console.log('Character codes at key positions:');
for (let i = 0; i < Math.min(key.length, 20); i++) {
  const char = key[i];
  const code = key.charCodeAt(i);
  console.log(`  Position ${i}: '${char}' (code: ${code})`);
}

console.log('\n... (middle omitted) ...\n');

// Check last 5 characters
for (let i = key.length - 5; i < key.length; i++) {
  const char = key[i];
  const code = key.charCodeAt(i);
  console.log(`  Position ${i}: '${char}' (code: ${code})`);
}

// Check for non-ASCII characters
console.log('\n🔍 Checking for non-ASCII characters:');
let hasNonAscii = false;
for (let i = 0; i < key.length; i++) {
  if (key.charCodeAt(i) > 127) {
    console.log(`  Found non-ASCII at position ${i}: '${key[i]}' (code: ${key.charCodeAt(i)})`);
    hasNonAscii = true;
  }
}
if (!hasNonAscii) {
  console.log('  ✅ No non-ASCII characters found');
}

// Check for whitespace
console.log('\n🔍 Checking for whitespace:');
if (key !== key.trim()) {
  console.log('  ⚠️ Key has leading or trailing whitespace!');
} else {
  console.log('  ✅ No leading/trailing whitespace');
}

// Check if it matches expected pattern
console.log('\n🔍 Pattern validation:');
const pattern = /^sk-ant-api03-[A-Za-z0-9_-]{80,}$/;
if (pattern.test(key)) {
  console.log('  ✅ Matches expected API key pattern');
} else {
  console.log('  ❌ Does NOT match expected pattern');
  console.log('  Expected: sk-ant-api03-[80+ alphanumeric/dash/underscore characters]');
}

// Compare with a known working key format (if ANTHROPIC_API_KEY exists)
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (anthropicKey && anthropicKey.startsWith('sk-ant-api03-')) {
  console.log('\n📊 Comparing with ANTHROPIC_API_KEY:');
  console.log('  CLAUDE_CODE length:', key.length);
  console.log('  ANTHROPIC length:', anthropicKey.length);
  console.log('  Length difference:', Math.abs(key.length - anthropicKey.length));
}