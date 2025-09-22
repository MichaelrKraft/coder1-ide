# 🔑 Claude OAuth Token Setup Guide for AI Team

This guide will help you set up Claude OAuth authentication to enable the AI Team functionality in Coder1 IDE.

## 📋 Prerequisites

- Claude Code subscription (Pro or Team)
- Terminal/Command Line access
- Admin access to your Render deployment (if deploying)

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Claude CLI

```bash
# Install the Claude CLI globally
npm install -g @anthropic-ai/claude-cli

# Or using Homebrew on Mac
brew install claude
```

### Step 2: Authenticate with Claude

```bash
# Login to your Claude account
claude login

# This will open a browser window for authentication
# Follow the prompts to authorize the CLI
```

### Step 3: Get Your OAuth Token

```bash
# Retrieve your OAuth token
claude auth token

# This will output something like:
# sk-ant-oat01-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Important**: The OAuth token starts with `sk-ant-oat01-`. This is different from API keys which start with `sk-ant-api03-`.

## 🔧 Configuration

### For Local Development

1. Copy the token from Step 3
2. Add to your `.env.local` file:

```env
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-your-token-here
```

3. Restart your development server:

```bash
npm run dev
```

### For Production (Render)

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your `coder1-ide-production` service
3. Navigate to "Environment" tab
4. Add the environment variable:
   - Key: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: Your token from Step 3
5. Click "Save Changes"
6. The service will automatically redeploy

## ✅ Verification

### Test Locally

1. Start your development server
2. Navigate to http://localhost:3001/ide
3. Click the "AI Team" button in the status bar
4. You should see "AI Team spawned with automated agents" (not fallback mode)

### Test Production

1. Navigate to https://coder1-ide.onrender.com/ide
2. Click the "AI Team" button
3. Check for successful agent spawning without fallback messages

## 🔍 Troubleshooting

### "OAuth token not configured" Error

**Problem**: The AI Team falls back to mock mode
**Solution**: 
- Verify the token is correctly set in environment variables
- Ensure the token starts with `sk-ant-oat01-`
- Restart the server after adding the token

### "Claude CLI unavailable" Error

**Problem**: Bridge service initialization timeout
**Solution**:
- Ensure Claude CLI is installed: `claude --version`
- Re-authenticate: `claude login`
- Generate a new token: `claude auth token`

### "Invalid token" Error

**Problem**: Token is expired or invalid
**Solution**:
- Tokens may expire after extended periods
- Re-run `claude auth token` to get a fresh token
- Update the environment variable with the new token

## 🎯 What the OAuth Token Enables

With a valid OAuth token, the AI Team can:

- ✅ Spawn real Claude CLI instances (not mock agents)
- ✅ Execute autonomous development tasks
- ✅ Create parallel agent workflows
- ✅ Generate actual code and files
- ✅ Provide real-time progress updates
- ✅ **Cost-free operation** (uses your Claude subscription, no API costs)

## 🔐 Security Notes

- **Never commit tokens**: Add `.env.local` to `.gitignore`
- **Rotate tokens regularly**: Generate new tokens periodically
- **Use environment variables**: Never hardcode tokens in source code
- **Limit token scope**: OAuth tokens have limited permissions vs API keys

## 📚 Additional Resources

- [Claude CLI Documentation](https://docs.anthropic.com/claude/docs/claude-cli)
- [Coder1 IDE Documentation](/docs/README.md)
- [AI Team Architecture](./docs/architecture/ai-team-architecture.md)

## 🆘 Need Help?

If you encounter issues:

1. Check the server logs: `npm run dev` (locally) or Render dashboard (production)
2. Verify token format: Should start with `sk-ant-oat01-`
3. Test Claude CLI directly: `claude --version`
4. Open an issue: [GitHub Issues](https://github.com/michaelkraft/coder1-ide/issues)

---

*Last Updated: January 2025*
*Coder1 IDE v2.0.0*