/**
 * GitHub Direct Poster
 * Posts responses directly to GitHub issues without email approval
 */

const { Octokit } = require('@octokit/rest');

class GitHubDirectPoster {
  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is required for direct posting');
    }
    
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    
    this.owner = process.env.GITHUB_OWNER || 'MichaelrKraft';
    this.repo = process.env.GITHUB_REPO || 'coder1-ide';
  }

  /**
   * Post a comment directly to an issue
   */
  async postComment(issueNumber, comment) {
    try {
      const response = await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: comment
      });
      
      console.log(`✅ Posted comment to issue #${issueNumber}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to post comment:', error.message);
      throw error;
    }
  }

  /**
   * Add labels to an issue
   */
  async addLabels(issueNumber, labels) {
    try {
      const response = await this.octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels: labels
      });
      
      console.log(`🏷️ Added labels to issue #${issueNumber}: ${labels.join(', ')}`);
      return response.data;
    } catch (error) {
      console.error('Failed to add labels:', error.message);
      // Don't throw - labels are optional
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(issueNumber, reason = 'completed') {
    try {
      const response = await this.octokit.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        state: 'closed',
        state_reason: reason
      });
      
      console.log(`🔒 Closed issue #${issueNumber}`);
      return response.data;
    } catch (error) {
      console.error('Failed to close issue:', error.message);
    }
  }
}

module.exports = GitHubDirectPoster;