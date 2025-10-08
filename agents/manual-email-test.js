#!/usr/bin/env node
require('dotenv').config({ path: '../.env.local' });

const ClaudeAPI = require('./lib/claude-api');
const EmailSender = require('./email/sender');

async function manualTest() {
  console.log('🧪 Manually testing email workflow for Issue #7\n');
  
  const issue = {
    number: 7,
    title: 'Email Workflow Test: Does the autonomous agent send emails?',
    body: 'This is a test issue to verify the email approval workflow is working.',
    user: { login: 'MichaelrKraft' }
  };
  
  console.log('1️⃣ Generating AI response with Claude...');
  const claude = new ClaudeAPI();
  const response = await claude.generateIssueResponse(issue);
  console.log(`✅ Response generated (${response.text.length} chars, $${response.cost.toFixed(4)})\n`);
  
  console.log('2️⃣ Creating email draft...');
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
      priority: 'high',
      labels: ['test']
    }
  };
  
  console.log('3️⃣ Sending email to support@callspot.ai...');
  const emailSender = new EmailSender();
  await emailSender.sendForApproval(draft, `queue-${Date.now()}`);
  
  console.log('\n✅ Complete! Check support@callspot.ai inbox now! 📬');
}

manualTest().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
});
