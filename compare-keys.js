#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

async function testKey(keyName, apiKey) {
  console.log(`\n🧪 Testing ${keyName}:`);
  console.log(`  Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 10)}`);
  console.log(`  Length: ${apiKey.length}`);
  
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "API key works"' }]
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });
    
    console.log(`  ✅ SUCCESS! Response: ${response.data.content[0].text}`);
    return true;
  } catch (error) {
    console.log(`  ❌ FAILED - ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function main() {
  const claudeCodeApiKey = process.env.CLAUDE_CODE_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  
  console.log('🔍 Comparing API Keys:\n');
  
  // Test CLAUDE_CODE_API_KEY
  const claudeWorks = await testKey('CLAUDE_CODE_API_KEY', claudeCodeApiKey);
  
  // Test ANTHROPIC_API_KEY
  const anthropicWorks = await testKey('ANTHROPIC_API_KEY', anthropicApiKey);
  
  console.log('\n📊 Summary:');
  console.log(`  CLAUDE_CODE_API_KEY: ${claudeWorks ? '✅ Working' : '❌ Not working'}`);
  console.log(`  ANTHROPIC_API_KEY: ${anthropicWorks ? '✅ Working' : '❌ Not working'}`);
  
  if (!claudeWorks && anthropicWorks) {
    console.log('\n⚠️ Your CLAUDE_CODE_API_KEY appears to be invalid or expired.');
    console.log('The key format is correct, but Anthropic\'s servers are rejecting it.');
    console.log('This could mean:');
    console.log('  1. The key has been revoked or expired');
    console.log('  2. The key was never valid (typo when copying?)');
    console.log('  3. The key is for a different account or service');
  }
}

main().catch(console.error);