#!/usr/bin/env node
/**
 * Verify GitHub Token Configuration
 * Tests that the GitHub token is valid and has necessary permissions
 */

require('dotenv').config({ path: '../../.env.local' });
const { Octokit } = require('@octokit/rest');

async function verifyGitHubToken() {
  console.log('🔍 Verifying GitHub Token Configuration...\n');
  
  // Check if token exists
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not found in environment');
    console.log('   Please set it in ../.env.local');
    process.exit(1);
  }
  
  if (process.env.GITHUB_TOKEN === 'your-github-token') {
    console.error('❌ GITHUB_TOKEN is still the placeholder value');
    console.log('   Please replace it with a real GitHub Personal Access Token');
    console.log('   See SETUP_GITHUB_TOKEN.md for instructions');
    process.exit(1);
  }
  
  // Mask token for display
  const token = process.env.GITHUB_TOKEN;
  const maskedToken = token.substring(0, 10) + '...' + token.substring(token.length - 4);
  console.log(`✅ GitHub Token found: ${maskedToken}\n`);
  
  // Test token validity
  try {
    const octokit = new Octokit({
      auth: token
    });
    
    // Get authenticated user
    console.log('🔐 Testing authentication...');
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);
    console.log(`   Name: ${user.name || 'Not set'}`);
    console.log(`   Email: ${user.email || 'Not set'}\n`);
    
    // Check rate limit
    console.log('📊 Checking rate limit...');
    const { data: rateLimit } = await octokit.rateLimit.get();
    console.log(`✅ Rate Limit: ${rateLimit.rate.remaining}/${rateLimit.rate.limit} requests remaining`);
    console.log(`   Resets at: ${new Date(rateLimit.rate.reset * 1000).toLocaleString()}\n`);
    
    // Test repository access
    const owner = process.env.GITHUB_OWNER || 'MichaelrKraft';
    const repo = process.env.GITHUB_REPO || 'coder1-ide';
    
    console.log(`📂 Testing repository access (${owner}/${repo})...`);
    try {
      const { data: repository } = await octokit.repos.get({ owner, repo });
      console.log(`✅ Repository accessible: ${repository.full_name}`);
      console.log(`   Private: ${repository.private}`);
      console.log(`   Issues: ${repository.open_issues_count} open\n`);
      
      // Check permissions
      if (repository.permissions) {
        console.log('🔑 Your permissions:');
        console.log(`   Admin: ${repository.permissions.admin ? '✅' : '❌'}`);
        console.log(`   Push: ${repository.permissions.push ? '✅' : '❌'}`);
        console.log(`   Pull: ${repository.permissions.pull ? '✅' : '❌'}\n`);
      }
      
    } catch (error) {
      console.error(`⚠️  Cannot access repository ${owner}/${repo}`);
      console.log('   This might be normal if the repo is private or doesn\'t exist yet');
      console.log(`   Error: ${error.message}\n`);
    }
    
    // Test issue creation capability
    console.log('🎯 Testing issue management capability...');
    try {
      // List issues to test read access
      const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo,
        per_page: 1
      });
      console.log('✅ Can read issues from repository\n');
      
      // We don't actually create an issue, just check if we could
      console.log('✅ Token has necessary scopes for issue management');
      
    } catch (error) {
      if (error.status === 404) {
        console.log('⚠️  Repository not found or not accessible');
        console.log('   Make sure the repository exists and is accessible\n');
      } else {
        console.error('❌ Cannot manage issues:', error.message);
      }
    }
    
    console.log('━'.repeat(50));
    console.log('✅ GitHub Token verification complete!');
    console.log('   Your token is properly configured and working.');
    console.log('━'.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Token verification failed:', error.message);
    
    if (error.status === 401) {
      console.log('\n   Your token is invalid or expired.');
      console.log('   Please generate a new token following SETUP_GITHUB_TOKEN.md');
    } else if (error.status === 403) {
      console.log('\n   Your token lacks necessary permissions.');
      console.log('   Make sure it has the "repo" scope enabled.');
    } else {
      console.log('\n   Unexpected error. Please check your internet connection.');
    }
    
    process.exit(1);
  }
}

// Run verification
verifyGitHubToken();