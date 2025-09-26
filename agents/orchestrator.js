#!/usr/bin/env node
/**
 * Agent Orchestrator - Main coordinator for all agents
 * Handles GitHub events and coordinates agent responses
 */

require('dotenv').config({ path: '../.env.local' });

const IssueResponder = require('./github-agent/issue-responder');
const EmailSender = require('./email/sender');
const ReviewQueue = require('./review-queue');

class Orchestrator {
  constructor() {
    this.issueResponder = new IssueResponder();
    this.emailSender = new EmailSender();
    this.reviewQueue = new ReviewQueue();
    this.config = require('../agent-config/settings.json');
  }

  /**
   * Main entry point for handling GitHub events
   */
  async handleGitHubEvent(eventType, eventData) {
    console.log(`📥 Processing ${eventType} event...`);
    
    try {
      switch (eventType) {
        case 'issues':
          await this.handleIssue(eventData);
          break;
        case 'pull_request':
          await this.handlePullRequest(eventData);
          break;
        case 'issue_comment':
          await this.handleIssueComment(eventData);
          break;
        default:
          console.log(`⚠️ Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${eventType}:`, error);
      // Send error notification to admin
      await this.emailSender.sendErrorNotification(error, eventType);
    }
  }

  /**
   * Handle new or edited issues
   */
  async handleIssue(issueData) {
    const { action, issue } = issueData;
    
    if (action !== 'opened' && action !== 'edited') {
      return;
    }

    console.log(`🔍 Processing issue #${issue.number}: ${issue.title}`);
    
    // Generate draft response
    const draft = await this.issueResponder.draftResponse(issue);
    
    // Add to review queue
    const queueId = await this.reviewQueue.add(draft);
    console.log(`📝 Draft added to queue with ID: ${queueId}`);
    
    // Send email for approval
    await this.emailSender.sendForApproval(draft, queueId);
    console.log(`📧 Approval email sent to ${this.config.email.approval_address}`);
  }

  /**
   * Handle pull request events
   */
  async handlePullRequest(prData) {
    // TODO: Implement PR comment drafting
    console.log('PR handling not yet implemented');
  }

  /**
   * Handle issue comments
   */
  async handleIssueComment(commentData) {
    // TODO: Implement comment response drafting
    console.log('Comment handling not yet implemented');
  }

  /**
   * Process from GitHub Actions context
   */
  async processFromGitHubActions() {
    const eventName = process.env.GITHUB_EVENT_NAME;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    
    if (!eventName || !eventPath) {
      console.log('Not running in GitHub Actions context');
      return;
    }
    
    const fs = require('fs').promises;
    const eventData = JSON.parse(await fs.readFile(eventPath, 'utf-8'));
    
    await this.handleGitHubEvent(eventName, eventData);
  }

  /**
   * Test mode - process a sample issue
   */
  async runTest() {
    console.log('🧪 Running in test mode...');
    
    const testIssue = {
      action: 'opened',
      issue: {
        number: 999,
        title: 'Test Issue - Memory usage is too high',
        body: 'When I open large files, the IDE uses too much memory and becomes slow.',
        user: {
          login: 'testuser'
        }
      }
    };
    
    await this.handleIssue(testIssue);
    console.log('✅ Test completed');
  }
}

// Main execution
if (require.main === module) {
  const orchestrator = new Orchestrator();
  
  if (process.argv.includes('--test')) {
    orchestrator.runTest();
  } else {
    orchestrator.processFromGitHubActions();
  }
}

module.exports = Orchestrator;