/**
 * GitHub Issue Responder Agent
 * Drafts intelligent responses to GitHub issues
 */

const ClaudeAPI = require('../lib/claude-api');

class IssueResponder {
  constructor() {
    this.claude = new ClaudeAPI();
  }

  /**
   * Draft a response for a GitHub issue
   */
  async draftResponse(issue) {
    console.log(`🤖 Generating response for issue #${issue.number}...`);
    
    // Generate response using Claude
    const { text, confidence } = await this.claude.generateIssueResponse(issue);
    
    // Create draft object
    const draft = {
      type: 'issue_response',
      issue_number: issue.number,
      issue_title: issue.title,
      issue_author: issue.user.login,
      issue_body: issue.body,
      draft_response: text,
      confidence: confidence,
      created_at: new Date().toISOString(),
      metadata: {
        labels: this.suggestLabels(issue),
        priority: this.assessPriority(issue),
        category: this.categorizeIssue(issue)
      }
    };
    
    console.log(`✅ Draft generated with ${(confidence * 100).toFixed(0)}% confidence`);
    return draft;
  }

  /**
   * Suggest appropriate labels for the issue
   */
  suggestLabels(issue) {
    const labels = [];
    const text = (issue.title + ' ' + issue.body).toLowerCase();
    
    if (/bug|error|broken|crash|fail/i.test(text)) {
      labels.push('bug');
    }
    if (/feature|request|add|implement|would be nice/i.test(text)) {
      labels.push('enhancement');
    }
    if (/question|how|what|where|why/i.test(text)) {
      labels.push('question');
    }
    if (/doc|documentation|readme|guide/i.test(text)) {
      labels.push('documentation');
    }
    if (/memory|eternal memory|trial|upgrade/i.test(text)) {
      labels.push('memory-system');
    }
    if (/terminal|cli|command/i.test(text)) {
      labels.push('terminal');
    }
    
    return labels;
  }

  /**
   * Assess the priority of the issue
   */
  assessPriority(issue) {
    const text = (issue.title + ' ' + issue.body).toLowerCase();
    
    // Critical keywords
    if (/urgent|critical|crash|data loss|security/i.test(text)) {
      return 'high';
    }
    
    // Bug reports are medium priority
    if (/bug|error|broken/i.test(text)) {
      return 'medium';
    }
    
    // Everything else is low
    return 'low';
  }

  /**
   * Categorize the issue
   */
  categorizeIssue(issue) {
    const text = (issue.title + ' ' + issue.body).toLowerCase();
    
    if (/bug|error|broken|crash/i.test(text)) {
      return 'bug';
    }
    if (/feature|request|add|implement/i.test(text)) {
      return 'feature_request';
    }
    if (/question|how|help/i.test(text)) {
      return 'question';
    }
    if (/doc|documentation/i.test(text)) {
      return 'documentation';
    }
    
    return 'other';
  }
}

module.exports = IssueResponder;