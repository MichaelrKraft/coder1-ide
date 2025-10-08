# Coder1 Autonomous Agent Setup Guide

Complete guide to deploying the autonomous agent system that responds to GitHub issues and discussions within 5-10 minutes.

## Architecture Overview

```
GitHub Issue/Discussion Created
    ↓
GitHub Actions Workflow Triggered
    ↓
Webhook Sent to Agent Endpoint
    ↓
Agent Selects Specialist (Frontend/Backend/QA/etc.)
    ↓
AI Generates Response (Claude Sonnet 4)
    ↓
Response Posted to GitHub
    ↓
User Receives Help in <10 Minutes
```

## Prerequisites

- **Render Account**: For hosting agent backend
- **GitHub Repository**: coder1-community (issues/discussions only)
- **Anthropic API Key**: For Claude AI responses
- **GitHub Personal Access Token**: For posting comments

## Step 1: Deploy Agent Backend to Render

### 1.1 Create New Web Service

1. Visit https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect your repository containing `api-community-respond.ts`

### 1.2 Configure Service

**Service Settings**:
- **Name**: `coder1-autonomous-agent`
- **Region**: Oregon (US West)
- **Branch**: `main`
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Environment Variables**:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-api-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GITHUB_TOKEN=ghp_your-github-personal-access-token
NODE_ENV=production
```

### 1.3 Get GitHub Personal Access Token

1. Visit https://github.com/settings/tokens/new
2. **Note**: "Coder1 Autonomous Agent"
3. **Expiration**: 1 year (or no expiration)
4. **Scopes**: 
   - ✅ `public_repo` (for posting comments to public repos)
   - ✅ `write:discussion` (for discussion responses)
5. Click "Generate token"
6. Copy token to Render environment variable `GITHUB_TOKEN`

### 1.4 Deploy

- Click "Create Web Service"
- Wait for build (3-5 minutes)
- Note your endpoint URL: `https://coder1-autonomous-agent.onrender.com`

## Step 2: Configure GitHub Repository

### 2.1 Create coder1-community Repository

```bash
# Create new repository on GitHub
# Name: coder1-community
# Description: Community support and discussions for Coder1
# Public repository
# Initialize with README
```

### 2.2 Add Issue Templates

Create `.github/ISSUE_TEMPLATE/` directory with templates:
- `bug_report.md`
- `feature_request.md`
- `question.md`
- `showcase.md`

(Use templates from `github-setup/ISSUE_TEMPLATE_*.md`)

### 2.3 Enable Discussions

1. Go to repository Settings → Features
2. Enable "Discussions"
3. Create categories:
   - 💬 General
   - 💡 Ideas
   - 🙏 Q&A
   - 🏆 Show and Tell

## Step 3: Set Up GitHub Actions Workflow

### 3.1 Create Workflow File

In your `coder1-community` repository:

```bash
mkdir -p .github/workflows
cp github-actions-workflow.yml .github/workflows/autonomous-agent.yml
```

### 3.2 Add GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"

**Add Two Secrets**:

**Secret 1: AUTONOMOUS_AGENT_ENDPOINT**
```
Name: AUTONOMOUS_AGENT_ENDPOINT
Value: https://coder1-autonomous-agent.onrender.com/api/community/respond
```

**Secret 2: WEBHOOK_SECRET**
```
Name: WEBHOOK_SECRET
Value: [generate random string, e.g., openssl rand -hex 32]
```

### 3.3 Update Backend for Webhook Verification

Edit `api-community-respond.ts` to verify webhook secret:

```typescript
// In POST function, verify signature
const providedSecret = request.headers.get('x-hub-signature-256');
const expectedSecret = process.env.WEBHOOK_SECRET;

if (providedSecret !== expectedSecret && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
}
```

## Step 4: Test the System

### 4.1 Create Test Issue

1. Go to `coder1-community` repository
2. Click "Issues" → "New Issue"
3. Choose "Bug Report" template
4. Fill in:
   - **Title**: "Test: Terminal not working in IDE"
   - **Body**: "When I open the IDE, the terminal doesn't load. Console shows WebSocket error."
   - **Labels**: `bug`, `frontend`
5. Click "Submit new issue"

### 4.2 Verify Agent Response

**Expected Timeline**:
- **0-30 seconds**: GitHub Actions workflow triggers
- **30-120 seconds**: Agent analyzes issue and generates response
- **2-5 minutes**: AI-generated response posted to issue

**Check GitHub Actions**:
1. Go to repository → Actions tab
2. See "Autonomous Agent Response" workflow
3. Check logs for successful API call

**Check Issue**:
- Should see comment from your GitHub account (using PAT)
- Comment includes AI-generated troubleshooting steps
- Footer shows "Powered by Coder1 Autonomous Agents"

### 4.3 Test Discussion Response

1. Go to Discussions → New Discussion
2. Category: Q&A
3. Title: "How do I deploy to Render?"
4. Body: "I'm new to Render. What are the steps?"
5. Post discussion
6. Wait 2-5 minutes for agent response

## Step 5: Monitor and Optimize

### 5.1 Monitor Agent Performance

**Render Dashboard**:
- Check response times (target: <5 seconds)
- Monitor error rates (target: <2%)
- Track API usage and costs

**GitHub Insights**:
- Response time to issues (target: <10 minutes)
- Agent accuracy (manual review of responses)
- User satisfaction (replies thanking the agent)

### 5.2 Review Agent Responses

**Weekly Review**:
- Read 5-10 agent responses manually
- Rate quality (1-5 stars)
- Identify improvement areas

**Adjust Agent Prompts**:
- If responses too technical → simplify language
- If responses too vague → add specificity
- If wrong agent selected → improve selection logic

### 5.3 Cost Tracking

**Anthropic API**:
- Average response: ~4,000 tokens (~$0.08 per response)
- 100 issues/month: ~$8/month
- 500 issues/month: ~$40/month

**Render Hosting**:
- Free tier: 750 hours/month (sufficient for low traffic)
- Upgrade to Starter ($7/mo) if spin-down is problematic

## Step 6: Advanced Features (Optional)

### 6.1 Add Caching for Common Questions

```typescript
// In api-community-respond.ts
const responseCache = new Map<string, string>();

function getCachedResponse(question: string): string | null {
  const normalized = question.toLowerCase().trim();
  return responseCache.get(normalized) || null;
}
```

### 6.2 Implement Rate Limiting

```typescript
// Limit 5 AI responses per hour per user
const rateLimits = new Map<string, number[]>();

function checkRateLimit(username: string): boolean {
  const now = Date.now();
  const userRequests = rateLimits.get(username) || [];
  const recentRequests = userRequests.filter(t => now - t < 3600000);
  
  if (recentRequests.length >= 5) return false;
  
  recentRequests.push(now);
  rateLimits.set(username, recentRequests);
  return true;
}
```

### 6.3 Add Human Escalation

```typescript
// Tag team member if AI is uncertain
if (confidence < 0.7) {
  await addLabelToIssue(issueUrl, 'needs-human-review');
  await mentionTeamMember(issueUrl, '@MichaelrKraft');
}
```

## Troubleshooting

### Agent Not Responding

**Check GitHub Actions Logs**:
```
Repository → Actions → Latest Workflow Run → View Logs
```

**Common Issues**:
- ❌ Wrong endpoint URL in secrets
- ❌ Missing GitHub token or invalid permissions
- ❌ Render service spun down (free tier)
- ❌ Anthropic API key expired or out of credits

**Solutions**:
1. Verify `AUTONOMOUS_AGENT_ENDPOINT` matches Render URL
2. Regenerate GitHub PAT with correct scopes
3. Upgrade Render to Starter tier ($7/mo)
4. Check Anthropic API balance

### Agent Posting Wrong Responses

**Review Agent Selection**:
- Check issue labels and keywords
- Verify agent trigger logic in `selectAgent()`
- Manually test with different issue types

**Improve Prompts**:
- Make system prompts more specific
- Add examples of good vs bad responses
- Increase temperature for creativity (or decrease for consistency)

### Performance Issues

**Slow Responses (>10 minutes)**:
- Render free tier spins down → Upgrade to Starter
- AI generation slow → Check Anthropic API status
- GitHub Actions queued → Peak usage times

**High Costs**:
- Too many tokens per response → Reduce `max_tokens` to 2048
- Too many responses → Implement caching
- Consider cheaper model for simple questions (Claude Haiku)

## Success Metrics

Track these KPIs weekly:

- **Response Time**: Median time from issue creation to agent response (target: <5 min)
- **Response Quality**: Manual review rating 1-5 (target: 4.0+)
- **Resolution Rate**: % of issues resolved without human intervention (target: 60%+)
- **User Satisfaction**: Positive reactions/replies (target: 80%+)
- **Cost Efficiency**: Cost per issue resolved (target: <$0.20)

## Next Steps

1. **Week 1**: Deploy and test with internal team
2. **Week 2**: Public launch, monitor closely
3. **Week 3**: Optimize based on user feedback
4. **Week 4**: Add advanced features (caching, escalation)

## Support

- **Issues**: https://github.com/MichaelrKraft/coder1-community/issues
- **Render Docs**: https://render.com/docs
- **Anthropic Docs**: https://docs.anthropic.com/

---

**Estimated Setup Time**: 30-45 minutes for complete deployment

**Maintenance Time**: 2-3 hours/week for review and optimization

---

*Last Updated: October 3, 2025*
