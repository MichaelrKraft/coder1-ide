#!/usr/bin/env node
/**
 * Process New GitHub Issues
 * Run this manually to check for new issues and send email approvals
 */

require('dotenv').config({ path: '../.env.local' });
const { Octokit } = require('@octokit/rest');
const ClaudeAPI = require('./lib/claude-api');
const EmailSender = require('./email/sender');

async function processNewIssues() {
  console.log('🔍 Checking for new GitHub issues...\n');
  
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const claude = new ClaudeAPI();
  const emailSender = new EmailSender();
  
  try {
    // Get recent open issues
    const { data: issues } = await octokit.issues.listForRepo({
      owner: 'MichaelrKraft',
      repo: 'coder1-ide',
      state: 'open',
      sort: 'created',
      direction: 'desc',
      per_page: 5
    });
    
    console.log(`Found ${issues.length} recent open issues\n`);
    
    for (const issue of issues) {
      // Skip if already has comments (already processed)
      const { data: comments } = await octokit.issues.listComments({
        owner: 'MichaelrKraft',
        repo: 'coder1-ide',
        issue_number: issue.number
      });
      
      if (comments.length > 0) {
        console.log(`⏭️  Issue #${issue.number} - Already has responses, skipping`);
        continue;
      }
      
      console.log(`📝 Processing Issue #${issue.number}: ${issue.title}`);
      
      // Generate AI response
      console.log('   🤖 Generating AI response...');
      const response = await claude.generateIssueResponse(issue);
      console.log(`   ✅ Response generated ($${response.cost.toFixed(4)})`);
      
      // Create draft
      const draft = {
        type: 'issue_response',
        issue_number: issue.number,
        issue_title: issue.title,
        issue_author: issue.user.login,
        issue_body: issue.body,
        draft_response: response.text,
        confidence: response.confidence || 0.85,
        created_at: new Date().toISOString(),
        metadata: {
          priority: issue.labels.some(l => l.name === 'bug') ? 'high' : 'normal',
          labels: issue.labels.map(l => l.name)
        }
      };
      
      // Send email
      console.log('   📧 Sending approval email...');
      await emailSender.sendForApproval(draft, `queue-${issue.number}-${Date.now()}`);
      console.log('   ✅ Email sent to support@callspot.ai\n');
    }
    
    console.log('✅ All issues processed!');
    console.log('📬 Check support@callspot.ai for approval emails');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

processNewIssues();
