const fs = require('fs').promises;
const path = require('path');
const EmailSender = require('../email/sender');

class DigestEmailer {
  constructor() {
    this.emailSender = new EmailSender();
    this.queueDir = path.join(__dirname, '../review-queue');
    this.dataDir = path.join(__dirname, '../data');
  }

  async gatherPendingItems() {
    const pendingDir = path.join(this.queueDir, 'pending');
    
    try {
      await fs.access(pendingDir);
      const files = await fs.readdir(pendingDir);
      
      const items = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(pendingDir, file);
          const content = await fs.readFile(filepath, 'utf8');
          const item = JSON.parse(content);
          items.push(item);
        }
      }
      
      return items;
    } catch (error) {
      console.log('⚠️  No pending items found');
      return [];
    }
  }

  async gatherDailyStats() {
    const stats = {
      attribution: await this.getAttributionStats(),
      referrals: await this.getReferralStats(),
      repo_stars: await this.getRepoStarStats()
    };

    return stats;
  }

  async getAttributionStats() {
    try {
      const AttributionTracker = require('./attribution-tracker');
      const tracker = new AttributionTracker();
      return await tracker.getStats(1);
    } catch (error) {
      return { error: 'Attribution stats unavailable' };
    }
  }

  async getReferralStats() {
    try {
      const ReferralManager = require('./referral-manager');
      const manager = new ReferralManager();
      return await manager.getOverallStats();
    } catch (error) {
      return { error: 'Referral stats unavailable' };
    }
  }

  async getRepoStarStats() {
    try {
      const RepoStarAutomator = require('./repo-star-automator');
      const automator = new RepoStarAutomator(process.env.GITHUB_TOKEN);
      return await automator.getStats();
    } catch (error) {
      return { error: 'Repo star stats unavailable' };
    }
  }

  async generateDigest() {
    console.log('📊 Generating daily digest...\n');

    const pendingItems = await this.gatherPendingItems();
    const stats = await this.gatherDailyStats();

    const digest = {
      date: new Date().toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
      pending_review: {
        total: pendingItems.length,
        by_type: this.groupByType(pendingItems),
        items: pendingItems
      },
      daily_stats: stats,
      summary: this.generateSummary(pendingItems, stats)
    };

    return digest;
  }

  groupByType(items) {
    const grouped = {};
    items.forEach(item => {
      grouped[item.type] = (grouped[item.type] || 0) + 1;
    });
    return grouped;
  }

  generateSummary(items, stats) {
    const lines = [];

    if (items.length > 0) {
      lines.push(`${items.length} items awaiting review`);
      Object.entries(this.groupByType(items)).forEach(([type, count]) => {
        lines.push(`  - ${count} ${type}${count > 1 ? 's' : ''}`);
      });
    } else {
      lines.push('No items pending review');
    }

    if (!stats.attribution.error && stats.attribution.recent_clicks) {
      lines.push(`${stats.attribution.recent_clicks} attribution clicks today`);
    }

    if (!stats.referrals.error && stats.referrals.total_conversions) {
      lines.push(`${stats.referrals.total_conversions} total referral conversions`);
    }

    if (!stats.repo_stars.error && stats.repo_stars.total_starred) {
      lines.push(`${stats.repo_stars.total_starred} repositories starred`);
    }

    return lines;
  }

  async sendDailyDigest(toEmail = 'support@callspot.ai') {
    const digest = await this.generateDigest();
    
    const emailContent = {
      to: toEmail,
      subject: `📊 Coder1 Daily Digest - ${digest.date}`,
      html: this.buildDigestHTML(digest),
      text: this.buildDigestText(digest)
    };

    console.log('\n📧 Sending digest email...\n');
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`\nSummary:`);
    digest.summary.forEach(line => console.log(`  ${line}`));

    try {
      await this.emailSender.sendEmail(emailContent.to, emailContent.subject, emailContent.html);
      console.log('\n✅ Digest email sent successfully');
      return { success: true, digest };
    } catch (error) {
      console.error('\n❌ Error sending digest:', error.message);
      return { success: false, error: error.message, digest };
    }
  }

  buildDigestHTML(digest) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .section h2 { color: #667eea; margin-top: 0; }
    .item { border-left: 4px solid #667eea; padding-left: 15px; margin: 15px 0; }
    .item-type { font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold; }
    .item-title { font-size: 16px; font-weight: bold; margin: 5px 0; }
    .actions { margin-top: 10px; }
    .btn { display: inline-block; padding: 8px 16px; margin-right: 10px; text-decoration: none; border-radius: 4px; font-size: 14px; }
    .approve { background: #10b981; color: white; }
    .edit { background: #f59e0b; color: white; }
    .reject { background: #ef4444; color: white; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
    .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 14px; color: #666; text-transform: uppercase; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Coder1 Daily Digest</h1>
    <p>${new Date(digest.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  ${this.buildPendingItemsSection(digest.pending_review)}
  
  ${this.buildStatsSection(digest.daily_stats)}

  <div class="section">
    <h2>📋 Quick Summary</h2>
    <ul>
      ${digest.summary.map(line => `<li>${line}</li>`).join('')}
    </ul>
  </div>

  <div class="footer">
    <p>This digest was generated by Coder1 Automation System</p>
    <p>Reply to this email with actions: APPROVE [id] | EDIT [id] | REJECT [id]</p>
  </div>
</body>
</html>`;
  }

  buildPendingItemsSection(pending) {
    if (pending.total === 0) {
      return `<div class="section">
        <h2>📝 Pending Review (0)</h2>
        <p>No items awaiting review. Great job! 🎉</p>
      </div>`;
    }

    return `<div class="section">
      <h2>📝 Pending Review (${pending.total})</h2>
      ${pending.items.map(item => {
        // Get content preview (first 500 characters)
        const content = item.content || item.draft_response || item.script || 'No content available';
        const preview = content.substring(0, 500).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const hasMore = content.length > 500;
        
        return `
        <div class="item">
          <div class="item-type">${item.type}</div>
          <div class="item-title">${item.topic || item.title || 'Untitled'}</div>
          <p><strong>ID:</strong> ${item.id}</p>
          ${item.confidence ? `<p><strong>Confidence:</strong> ${item.confidence}%</p>` : ''}
          <div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 3px solid #667eea;">
            <p style="margin: 0; font-family: monospace; font-size: 13px; white-space: pre-wrap;">${preview}${hasMore ? '...' : ''}</p>
            ${hasMore ? '<p style="margin: 10px 0 0 0; font-size: 12px; color: #666;"><em>Preview truncated - Full content in review queue</em></p>' : ''}
          </div>
          <div class="actions">
            <a href="mailto:support@callspot.ai?subject=APPROVE ${item.id}" class="btn approve">✓ Approve</a>
            <a href="mailto:support@callspot.ai?subject=EDIT ${item.id}" class="btn edit">✏️ Edit</a>
            <a href="mailto:support@callspot.ai?subject=REJECT ${item.id}" class="btn reject">✗ Reject</a>
          </div>
        </div>
      `;
      }).join('')}
    </div>`;
  }

  buildStatsSection(stats) {
    return `<div class="section">
      <h2>📈 Daily Statistics</h2>
      <div class="stats">
        ${!stats.attribution.error ? `
          <div class="stat-card">
            <div class="stat-value">${stats.attribution.recent_clicks || 0}</div>
            <div class="stat-label">Attribution Clicks</div>
          </div>
        ` : ''}
        ${!stats.referrals.error ? `
          <div class="stat-card">
            <div class="stat-value">${stats.referrals.total_conversions || 0}</div>
            <div class="stat-label">Total Conversions</div>
          </div>
        ` : ''}
        ${!stats.repo_stars.error ? `
          <div class="stat-card">
            <div class="stat-value">${stats.repo_stars.total_starred || 0}</div>
            <div class="stat-label">Repos Starred</div>
          </div>
        ` : ''}
      </div>
    </div>`;
  }

  buildDigestText(digest) {
    let text = `📊 CODER1 DAILY DIGEST\n`;
    text += `${new Date(digest.date).toLocaleDateString()}\n\n`;
    text += `${'='.repeat(60)}\n\n`;

    text += `📝 PENDING REVIEW (${digest.pending_review.total})\n`;
    text += `${'='.repeat(60)}\n\n`;

    if (digest.pending_review.total === 0) {
      text += `No items awaiting review. Great job! 🎉\n\n`;
    } else {
      digest.pending_review.items.forEach((item, i) => {
        text += `${i + 1}. [${item.type}] ${item.topic || item.title || 'Untitled'}\n`;
        text += `   ID: ${item.id}\n`;
        if (item.confidence) {
          text += `   Confidence: ${item.confidence}%\n`;
        }
        
        // Add content preview
        const content = item.content || item.draft_response || item.script || 'No content available';
        const preview = content.substring(0, 300);
        text += `\n   PREVIEW:\n   ${'-'.repeat(58)}\n`;
        text += `   ${preview.replace(/\n/g, '\n   ')}`;
        if (content.length > 300) {
          text += `\n   [...preview truncated - full content in review queue...]`;
        }
        text += `\n   ${'-'.repeat(58)}\n\n`;
        
        text += `   Actions: APPROVE ${item.id} | EDIT ${item.id} | REJECT ${item.id}\n\n`;
      });
    }

    text += `${'='.repeat(60)}\n`;
    text += `📈 DAILY STATISTICS\n`;
    text += `${'='.repeat(60)}\n\n`;

    if (!digest.daily_stats.attribution.error) {
      text += `Attribution Clicks: ${digest.daily_stats.attribution.recent_clicks || 0}\n`;
    }
    if (!digest.daily_stats.referrals.error) {
      text += `Total Conversions: ${digest.daily_stats.referrals.total_conversions || 0}\n`;
    }
    if (!digest.daily_stats.repo_stars.error) {
      text += `Repos Starred: ${digest.daily_stats.repo_stars.total_starred || 0}\n`;
    }

    text += `\n${'='.repeat(60)}\n`;
    text += `📋 QUICK SUMMARY\n`;
    text += `${'='.repeat(60)}\n\n`;
    digest.summary.forEach(line => {
      text += `• ${line}\n`;
    });

    text += `\n${'='.repeat(60)}\n`;
    text += `This digest was generated by Coder1 Automation System\n`;
    text += `Reply with: APPROVE [id] | EDIT [id] | REJECT [id]\n`;

    return text;
  }
}

async function main() {
  const emailer = new DigestEmailer();
  
  try {
    console.log('🚀 Starting daily digest generation...\n');
    
    const result = await emailer.sendDailyDigest();
    
    if (!result.success) {
      console.error('\n⚠️  Email sending failed, but digest was generated');
      console.log('\nGenerated digest data:');
      console.log(JSON.stringify(result.digest, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DigestEmailer;
