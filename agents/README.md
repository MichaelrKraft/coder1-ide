# 🤖 Coder1 Autonomous GitHub Agents

Automated GitHub community management system with email-based human review for all messages.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd agents
npm install
```

### 2. Configure Environment
Copy `.env.example` to `../.env.local` and add your keys:
```bash
ANTHROPIC_API_KEY=your-key
SENDGRID_API_KEY=your-key  # Or use SMTP_* variables
GITHUB_TOKEN=your-github-token
```

### 3. Test the System
```bash
npm test
```
This will generate a test issue response and email it to support@callspot.ai

### 4. Review & Approve
Check your email, then approve:
```bash
npm run approve [queue-id]
```

## 📧 Email Approval Flow

1. **Agent drafts response** → Sends to support@callspot.ai
2. **You review email** → Reply with APPROVE, EDIT, or REJECT
3. **Agent posts approved content** → GitHub issue/PR updated

## 🎮 CLI Commands

```bash
# Review all pending items
npm run review

# Approve a specific item
npm run approve [queue-id]

# Approve with edits
npm run approve [queue-id] --edit "your edited version"

# Reject an item
npm run reject [queue-id] --reason "why rejected"

# Execute all approved items
npm run execute

# Test the system
npm test
```

## 🔄 GitHub Actions

The system runs automatically via GitHub Actions:
- **On Issues/PRs**: Drafts responses immediately
- **Every 2 hours**: Executes approved items
- **Daily at 9 AM**: Sends digest of pending items

## 📁 Directory Structure

```
agents/
├── orchestrator.js          # Main coordinator
├── github-agent/           # GitHub automation
│   └── issue-responder.js  # Issue response drafting
├── email/                  # Email system
│   └── sender.js          # Sends to support@callspot.ai
├── review-queue/          # Approval queue
│   ├── pending/          # Awaiting approval
│   ├── approved/         # Ready to execute
│   └── rejected/         # Rejected items
├── scripts/              # CLI tools
│   ├── approve.js       # Approve items
│   ├── review.js        # Review dashboard
│   ├── execute.js       # Execute approved
│   └── reject.js        # Reject items
└── lib/                 # Shared utilities
    └── claude-api.js    # Claude integration
```

## 🎯 What Gets Reviewed

✅ **All Messages** (require your approval):
- GitHub issue responses
- PR comments
- Blog posts
- Social media content
- Community announcements

✔️ **Automatic Actions** (no review needed):
- Starring repositories
- Following users
- Collecting analytics
- SEO optimization

## 📊 Confidence Levels

- **>95% confidence**: Auto-approve (if configured)
- **70-95% confidence**: Email for review
- **<70% confidence**: Auto-reject

## ⚙️ Configuration

Edit `agent-config/settings.json`:
```json
{
  "email": {
    "approval_address": "support@callspot.ai"
  },
  "review": {
    "auto_approve_threshold": 0.95,
    "timeout_action": "hold"  // or "approve"
  }
}
```

## 🔐 Required Secrets

Add to GitHub repository settings:
- `ANTHROPIC_API_KEY` - Claude API access
- `SENDGRID_API_KEY` - Email service
- `GITHUB_TOKEN` - Auto-provided by GitHub

## 🧪 Testing

Run test mode to verify everything works:
```bash
npm test
```

This will:
1. Generate a test issue response
2. Email it to support@callspot.ai
3. Add to review queue
4. Display queue status

## 📈 Daily Workflow

1. **9 AM**: Receive digest email with pending items
2. **Throughout day**: Get urgent issue emails
3. **Quick review**: Reply APPROVE or EDIT
4. **Automatic execution**: Approved items posted

## 🚨 Troubleshooting

### Email not sending?
- Check SENDGRID_API_KEY or SMTP settings
- Verify support@callspot.ai is correct

### GitHub posting fails?
- Verify GITHUB_TOKEN has write permissions
- Check repository name in settings.json

### Claude API errors?
- Verify ANTHROPIC_API_KEY is valid
- Check API quota/limits

## 📝 License

MIT - Built for the Coder1 IDE project