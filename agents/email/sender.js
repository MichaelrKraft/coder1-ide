/**
 * Email Sender
 * Sends draft messages to support@callspot.ai for approval
 */

const nodemailer = require('nodemailer');

class EmailSender {
  constructor() {
    // Configure email transport
    // Can use SendGrid, Gmail, or any SMTP service
    if (process.env.SENDGRID_API_KEY) {
      // SendGrid configuration
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.SMTP_HOST) {
      // Generic SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      console.warn('⚠️ No email service configured. Please set SENDGRID_API_KEY or SMTP_* environment variables');
      this.transporter = null;
    }

    // Load config
    try {
      this.config = require('../../agent-config/settings.json');
    } catch (e) {
      this.config = {
        email: {
          approval_address: 'support@callspot.ai',
          from_address: 'agents@coder1-ide.dev'
        }
      };
    }
  }

  /**
   * Send a draft for approval
   */
  async sendForApproval(draft, queueId) {
    if (!this.transporter) {
      console.log('📧 Email service not configured - would send to:', this.config.email.approval_address);
      console.log('Draft:', draft);
      return;
    }

    const emailContent = this.formatApprovalEmail(draft, queueId);
    const subject = this.getSubject(draft);
    
    try {
      const info = await this.transporter.sendMail({
        from: this.config.email.from_address || 'agents@coder1-ide.dev',
        to: this.config.email.approval_address || 'support@callspot.ai',
        subject: subject,
        text: emailContent.text,
        html: emailContent.html
      });
      
      console.log('📧 Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw error;
    }
  }

  /**
   * Format the approval email
   */
  formatApprovalEmail(draft, queueId) {
    const timeAgo = this.getTimeAgo(draft.created_at);
    const autoPublishTime = this.getAutoPublishTime(draft);
    
    const text = `
CODER1 AGENT - APPROVAL REQUIRED

${draft.type === 'issue_response' ? 'GITHUB ISSUE RESPONSE' : draft.type.toUpperCase()}

Issue #${draft.issue_number}: ${draft.issue_title}
Author: @${draft.issue_author}
Priority: ${draft.metadata?.priority || 'normal'}
Confidence: ${(draft.confidence * 100).toFixed(0)}%
Generated: ${timeAgo}

--- ORIGINAL MESSAGE ---
${draft.issue_body}

--- DRAFT RESPONSE ---
${draft.draft_response}
--- END DRAFT ---

SUGGESTED LABELS: ${draft.metadata?.labels?.join(', ') || 'none'}

TO APPROVE: 
- Reply with "APPROVE" 
- Or run: npm run agent:approve ${queueId}

TO EDIT:
- Reply with "EDIT:" followed by your version
- Or run: npm run agent:edit ${queueId}

TO REJECT:
- Reply with "REJECT"
- Or run: npm run agent:reject ${queueId}

AUTO-PUBLISH: ${autoPublishTime} (if no response)
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #1e1e1e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f5f5f5; padding: 20px; border: 1px solid #ddd; }
    .draft { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0366d6; }
    .original { background: #fff9c4; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .actions { background: white; padding: 15px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 10px 20px; margin: 5px; border-radius: 5px; text-decoration: none; }
    .approve { background: #28a745; color: white; }
    .edit { background: #ffc107; color: black; }
    .reject { background: #dc3545; color: white; }
    .metadata { font-size: 12px; color: #666; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <div class="header">
    <h2>🤖 Coder1 Agent - Approval Required</h2>
    <p>Issue #${draft.issue_number}: ${draft.issue_title}</p>
    <p class="metadata">
      Author: @${draft.issue_author} | 
      Priority: ${draft.metadata?.priority || 'normal'} | 
      Confidence: ${(draft.confidence * 100).toFixed(0)}%
    </p>
  </div>
  
  <div class="content">
    <div class="original">
      <h3>Original Message</h3>
      <pre>${draft.issue_body}</pre>
    </div>
    
    <div class="draft">
      <h3>📝 Draft Response</h3>
      <pre>${draft.draft_response}</pre>
    </div>
    
    <p><strong>Suggested Labels:</strong> ${draft.metadata?.labels?.join(', ') || 'none'}</p>
  </div>
  
  <div class="actions">
    <h3>Quick Actions</h3>
    <p>Reply to this email with:</p>
    <ul>
      <li><strong>APPROVE</strong> - Post as-is</li>
      <li><strong>EDIT: [your version]</strong> - Post your edited version</li>
      <li><strong>REJECT</strong> - Don't post</li>
    </ul>
    <p><em>Or use command line: npm run agent:approve ${queueId}</em></p>
    <p><em>Auto-publishes: ${autoPublishTime}</em></p>
  </div>
</body>
</html>
`;
    
    return { text, html };
  }

  /**
   * Get appropriate subject line
   */
  getSubject(draft) {
    const priority = draft.metadata?.priority || 'normal';
    const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
    
    if (draft.type === 'issue_response') {
      return `${emoji} [REVIEW] Issue #${draft.issue_number}: ${draft.issue_title.substring(0, 50)}`;
    } else if (draft.type === 'blog_post') {
      return `📝 [REVIEW] Blog Post: ${draft.title}`;
    } else {
      return `[REVIEW] ${draft.type}`;
    }
  }

  /**
   * Calculate time ago
   */
  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  /**
   * Get auto-publish time
   */
  getAutoPublishTime(draft) {
    const priority = draft.metadata?.priority || 'normal';
    const hours = priority === 'high' ? 0.5 : priority === 'medium' ? 2 : 24;
    
    const publishTime = new Date(draft.created_at);
    publishTime.setHours(publishTime.getHours() + hours);
    
    return publishTime.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(error, context) {
    if (!this.transporter) return;
    
    try {
      await this.transporter.sendMail({
        from: this.config.email.from_address || 'agents@coder1-ide.dev',
        to: this.config.email.approval_address || 'support@callspot.ai',
        subject: '❌ [ALERT] Agent Error',
        text: `
Agent Error Notification

Context: ${context}
Time: ${new Date().toISOString()}

Error Details:
${error.message}

Stack Trace:
${error.stack}

Please check the agent logs for more information.
`
      });
    } catch (sendError) {
      console.error('Failed to send error notification:', sendError);
    }
  }
}

module.exports = EmailSender;