#!/usr/bin/env node

/**
 * Debug script for CLAUDE_CODE_API_KEY
 */

require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

async function debugAPIKey() {
  const claudeCodeApiKey = process.env.CLAUDE_CODE_API_KEY;
  
  console.log('🔍 Debugging CLAUDE_CODE_API_KEY...\n');
  console.log('Key starts with:', claudeCodeApiKey?.substring(0, 15) + '...');
  console.log('Key length:', claudeCodeApiKey?.length);
  console.log('Key format:', claudeCodeApiKey?.match(/^sk-ant-api03-/) ? '✅ Correct format (sk-ant-api03-)' : '❌ Wrong format');
  console.log();
  
  // Test 1: Direct axios request with minimal configuration
  console.log('📝 Test 1: Direct axios request with standard headers');
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "API key works"' }]
    }, {
      headers: {
        'x-api-key': claudeCodeApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Response:', response.data.content[0].text);
  } catch (error) {
    console.log('❌ FAILED');
    console.log('  Status:', error.response?.status);
    console.log('  Status Text:', error.response?.statusText);
    console.log('  Error Message:', error.response?.data?.error?.message || error.message);
    console.log('  Full error data:', JSON.stringify(error.response?.data, null, 2));
  }
  
  console.log();
  
  // Test 2: Try with different User-Agent
  console.log('📝 Test 2: With different User-Agent header');
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "API key works"' }]
    }, {
      headers: {
        'x-api-key': claudeCodeApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'User-Agent': 'Claude-Code-Max/1.0'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Response:', response.data.content[0].text);
  } catch (error) {
    console.log('❌ FAILED');
    console.log('  Status:', error.response?.status);
    console.log('  Error:', error.response?.data?.error?.message || error.message);
  }
  
  console.log();
  
  // Test 3: Check if key works as Authorization Bearer token
  console.log('📝 Test 3: As Authorization Bearer token (alternative format)');
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "API key works"' }]
    }, {
      headers: {
        'Authorization': `Bearer ${claudeCodeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Response:', response.data.content[0].text);
  } catch (error) {
    console.log('❌ FAILED');
    console.log('  Status:', error.response?.status);
    console.log('  Error:', error.response?.data?.error?.message || error.message);
  }
  
  console.log();
  
  // Test 4: Compare with ANTHROPIC_API_KEY if available
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicApiKey) {
    console.log('📝 Test 4: Comparing with ANTHROPIC_API_KEY (commented out)');
    console.log('  ANTHROPIC_API_KEY format:', anthropicApiKey.substring(0, 15) + '...');
    console.log('  Both keys same format?', 
      claudeCodeApiKey?.substring(0, 15) === anthropicApiKey.substring(0, 15) ? 'Yes' : 'No');
  }
}

debugAPIKey().catch(console.error);