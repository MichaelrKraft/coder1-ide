# 🚀 Production Environment Setup Guide

This guide covers setting up the Autonomous Vibe Interface for production deployment with full Claude Code integration.

## 📋 Prerequisites

- Node.js 18+ installed
- **Claude Code subscription with API access** (required for full functionality)
- Git repository cloned locally

## 🔧 Environment Configuration

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### 2. Configure Claude Code API Key

**CRITICAL**: This platform is built specifically for Claude Code users. You need a valid Claude Code API key.

```bash
# In your .env file:
CLAUDE_CODE_API_KEY=your-claude-code-api-key-here
```

**How to get your Claude Code API key:**
1. Subscribe to Claude Code Max at https://claude.ai/code
2. Navigate to API settings in your Claude Code dashboard
3. Generate a new API key for your project
4. Copy the key to your .env file

### 3. Complete Environment Configuration

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Claude Code API Key (Required for AI features)
CLAUDE_CODE_API_KEY=your-claude-code-api-key-here

# Fallback: Standard Anthropic API key (if Claude Code key not available)
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Optional: Other service keys
AIRTOP_API_KEY=your-airtop-api-key-here

# Render-specific (automatically set by Render)
# RENDER=true
# RENDER_EXTERNAL_HOSTNAME=your-app.onrender.com
```

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Environment

Check that all systems initialize correctly:

```bash
npm start
```

You should see:
```
🤖 Claude Code API client initialized
✅ Memory System: Loaded X items from persistent storage
🧠 Memory System: Initialized at /path/to/.coder1/memory
🔮 Proactive Intelligence: Initialized and watching for opportunities
✅ Approval Workflows: Initialized with smart approval system
⚡ Performance Optimizer: Initialized with intelligent resource management
🔍 Context Builder: Starting passive project analysis...
🚀 Enhanced Claude Bridge: All intelligence systems active
```

### 3. Test API Integration

Visit http://localhost:3000/health to verify all systems:

```json
{
  "status": "healthy",
  "services": {
    "api": {
      "claudeCode": {
        "configured": true,
        "key": "sk-ant-a....",
        "source": "CLAUDE_CODE_API_KEY"
      },
      "demoMode": false,
      "platform": "Claude Code"
    }
  }
}
```

## 🎯 Feature Verification

### Test AI Intelligence Systems

1. **Navigate to AI Monitor**: http://localhost:3000/ai-monitor.html
2. **Test Natural Commands**: http://localhost:3000/natural-commands.html  
3. **Test Terminal Buttons**: http://localhost:3000/ide

### Expected Behavior with Claude Code API

- ✅ **Real AI Responses**: Intelligent, contextual responses from Claude
- ✅ **Parallel Agents**: Multiple specialized AI agents working together
- ✅ **Hivemind Coordination**: Multi-agent collaboration on complex tasks
- ✅ **Proactive Suggestions**: AI-generated improvement recommendations
- ✅ **Natural Language Commands**: Advanced command parsing and execution

### Demo Mode (No API Key)

If no API key is configured:
- ⚠️ **Demo Responses**: Pre-written contextual responses
- ⚠️ **Limited Intelligence**: Template-based interactions
- ⚠️ **No Real AI**: Simulated agent responses

## 📊 Monitoring & Health Checks

### Health Check Endpoint

`GET /health` - Returns system status including:
- AI service configuration
- Memory system status  
- Intelligence systems health
- API connectivity

### Real-time Monitoring

`GET /ai-monitor.html` - Live dashboard showing:
- All 8 AI intelligence systems status
- Memory usage and statistics
- Performance metrics
- Recent activity logs

## 🔒 Security Best Practices

### API Key Management

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys regularly** for security
4. **Limit API key permissions** to required scopes only

### Production Deployment

1. **Set NODE_ENV=production** for optimized performance
2. **Enable HTTPS** for all external traffic
3. **Configure rate limiting** (already built-in)
4. **Monitor API usage** to prevent overages

## 🚀 Deployment Options

### Render.com (Recommended)

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy automatically on git push

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Configure environment variables in dashboard

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Troubleshooting

### Common Issues

**"Running in demo mode"**
- Check CLAUDE_CODE_API_KEY is set correctly
- Verify API key is valid and has sufficient credits
- Check network connectivity to Anthropic API

**"Intelligence systems not responding"**  
- Restart the server: `npm start`
- Check server logs for errors
- Verify all dependencies installed: `npm install`

**"Memory system errors"**
- Ensure `.coder1/memory/` directory is writable
- Check disk space availability
- Clear memory if corrupted: `rm -rf .coder1/memory/`

### Support

For issues specific to this platform:
1. Check server logs for error details
2. Test with health check endpoint
3. Verify environment configuration
4. Ensure Claude Code subscription is active

## 📈 Performance Optimization

### Production Settings

```bash
# Recommended production settings
NODE_ENV=production
PORT=3000

# Performance tuning
SUGGESTION_INTERVAL=300000  # 5 minutes
MAX_SUGGESTIONS=3
API_TIMEOUT=30000          # 30 seconds
```

### Monitoring

- Monitor API usage to avoid rate limits
- Track memory usage via `/ai-monitor.html`
- Use performance optimizer's hibernation features
- Monitor proactive intelligence suggestion quality

## 🎉 Success Indicators

When properly configured, you should see:

- ✅ Real-time AI responses with high quality
- ✅ Multiple agent coordination working
- ✅ Context-aware suggestions appearing
- ✅ Memory system learning from interactions
- ✅ Performance optimization active
- ✅ All health checks passing

Your Autonomous Vibe Interface is now ready for production use with full Claude Code integration!