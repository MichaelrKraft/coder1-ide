# GitHub Token Setup Guide

## Creating a GitHub Personal Access Token

To enable the autonomous GitHub agent to post responses, you need a GitHub Personal Access Token.

### Step 1: Go to GitHub Settings
1. Log in to GitHub
2. Click your profile picture (top-right)
3. Click "Settings"

### Step 2: Navigate to Developer Settings
1. Scroll down to the bottom of the left sidebar
2. Click "Developer settings"

### Step 3: Create Personal Access Token
1. Click "Personal access tokens"
2. Click "Tokens (classic)"
3. Click "Generate new token" → "Generate new token (classic)"

### Step 4: Configure Token Permissions
1. **Note**: Give it a descriptive name like "Coder1 GitHub Agent"
2. **Expiration**: Choose your preferred expiration (recommend 90 days)
3. **Select scopes**:
   - ✅ `repo` (Full control of private repositories)
     - This includes: repo:status, repo_deployment, public_repo, repo:invite
   - ✅ `write:discussion` (if you want to manage discussions)

### Step 5: Generate and Save Token
1. Click "Generate token" at the bottom
2. **IMPORTANT**: Copy the token immediately (starts with `ghp_`)
3. You won't be able to see it again!

### Step 6: Configure the Token
```bash
# Edit the .env.local file
cd /Users/michaelkraft/autonomous_vibe_interface
nano ../.env.local

# Replace the placeholder with your real token:
GITHUB_TOKEN=ghp_YOUR_ACTUAL_TOKEN_HERE

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 7: Verify Configuration
```bash
cd agents
node scripts/verify-github.js
```

## Security Notes
- **Never commit** your token to git
- The `.env.local` file is already in `.gitignore`
- Tokens should have minimal required permissions
- Rotate tokens regularly (every 90 days)

## Troubleshooting

### "Bad credentials" Error
- Your token is invalid or expired
- Generate a new token following steps above

### "Resource not accessible by integration"
- Your token lacks necessary permissions
- Ensure `repo` scope is selected

### Rate Limiting
- GitHub allows 5000 requests/hour with authentication
- The agent uses ~1-2 requests per issue response