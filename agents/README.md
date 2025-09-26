# 🤖 Coder1 Autonomous GitHub Agents

## ✅ Status: WORKING & TESTED

Intelligent AI agents that automatically respond to GitHub issues using Claude AI. Now supports **direct posting mode** - no email configuration required!

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd agents
npm install
```

### 2. Configure API Keys
```bash
# Edit .env.local
nano ../.env.local

# Required:
ANTHROPIC_API_KEY=sk-ant-api03-...  # Your Anthropic API key
GITHUB_TOKEN=ghp_...                 # GitHub Personal Access Token

# See SETUP_GITHUB_TOKEN.md for GitHub token setup
```

### 3. Test Locally
```bash
# Test AI response generation (no GitHub needed)
node test-local.js

# Verify GitHub token
node scripts/verify-github.js
```

### 4. Deploy to GitHub
Add secrets to your GitHub repository:
- Repository → Settings → Secrets → Add `GITHUB_TOKEN` and `ANTHROPIC_API_KEY`

The workflow will automatically trigger when issues are created!

## 🔄 Direct Posting Mode (NEW!)

**No email configuration required!** The agent posts directly to GitHub:

1. **Issue created** → GitHub Actions triggers
2. **AI generates response** → Claude analyzes and responds
3. **Direct posting** → Response posted immediately to GitHub

For email-based approval (optional), see the legacy documentation.

## 🎮 CLI Commands

```bash
# Test AI response generation locally
node test-local.js

# Verify GitHub token configuration
node scripts/verify-github.js

# Run orchestrator in direct mode
node orchestrator.js --direct

# Test with custom issue
ISSUE_TITLE="Bug report" ISSUE_BODY="App crashes" node orchestrator.js --direct

# View cost report
node scripts/cost-report.js

# Legacy email-based commands (optional)
npm run review        # Review pending items
npm run approve ID    # Approve an item
npm run execute      # Execute approved items
```

## 🔄 GitHub Actions

The system runs automatically via GitHub Actions:
- **On Issues Created**: Generates and posts AI response immediately
- **Direct Posting**: No email approval needed
- **Response Time**: <2 minutes from issue creation
- **Workflow**: `.github/workflows/github-agent.yml`

## 📁 Directory Structure

```
agents/
├── orchestrator.js          # Main coordinator
├── direct-mode.js          # Direct GitHub posting (NEW!)
├── github-direct-poster.js # GitHub API client (NEW!)
├── test-local.js           # Local testing tool (NEW!)
├── github-agent/           # GitHub automation
│   └── issue-responder.js  # Issue response drafting
├── email/                  # Email system (optional)
│   └── sender.js          # Email notifications
├── review-queue/          # Approval queue (legacy)
│   ├── pending/          # Awaiting approval
│   ├── approved/         # Ready to execute
│   └── rejected/         # Rejected items
├── scripts/              # CLI tools
│   ├── verify-github.js # GitHub token verification (NEW!)
│   ├── cost-report.js   # Usage tracking (NEW!)
│   ├── approve.js       # Approve items
│   ├── review.js        # Review dashboard
│   └── execute.js       # Execute approved
└── lib/                 # Shared utilities
    └── claude-api.js    # Claude AI integration
```

## 🎯 Operating Modes

### Direct Mode (Default - NEW!)
✅ **Automatic Responses** (no approval needed):
- GitHub issue responses posted immediately
- AI-generated responses with footer attribution
- Cost-optimized model selection
- ~$0.0004 per response

### Email Mode (Legacy - Optional)
📧 **Reviewed Responses** (require approval):
- Drafts sent to email for review
- Manual approval before posting
- Edit capability before publishing
- Higher control but slower response

## 💰 Cost Analysis

### Per Response
- **Simple Issues**: ~$0.0003 (Haiku model)
- **Complex Issues**: ~$0.0006 (Haiku model)

### Monthly Projections
- **10 issues/day**: ~$0.15/month
- **50 issues/day**: ~$0.75/month
- **100 issues/day**: ~$1.50/month

Run `node scripts/cost-report.js` for detailed usage tracking.

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