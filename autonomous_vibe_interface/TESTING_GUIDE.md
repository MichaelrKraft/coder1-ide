# Testing Guide for Enhanced AI Intelligence Systems

## Overview
This guide helps you test the 8 enhanced intelligence systems added to the Coder1 platform.

## 1. Natural Language Commands
**URL:** http://localhost:3000/natural-commands.html

### Basic Commands to Test:
```
✅ "explain how the memory system works"
✅ "create a new React component for user profiles"
✅ "analyze the codebase for security vulnerabilities"
✅ "run tests for the authentication module"
```

### What to Expect:
- Command parsed with confidence score (70-100%)
- Yellow help box for explanations
- Green success box for agent operations
- Processing time displayed

## 2. Memory System Testing

### Check Memory Files:
```bash
# View stored agent insights
cat .coder1/memory/agent-insights.json | jq

# View task outcomes
cat .coder1/memory/task-outcomes.json | jq

# View conversations
cat .coder1/memory/conversations.json | jq
```

### Test Memory Persistence:
1. Execute a command in natural-commands
2. Restart the server
3. Check if previous interactions are remembered

## 3. Proactive Suggestions

### API Endpoint:
```bash
# Get current AI suggestions
curl http://localhost:3000/api/claude/suggestions | jq
```

### What to Look For:
- Suggestions update every 5 minutes
- Context-aware recommendations
- Based on recent file changes

## 4. Context Builder (File Watching)

### Test File Monitoring:
1. Open a file in `src/` directory
2. Make a change and save
3. Check console logs for:
   - "📝 File changed" messages
   - "🧠 Project patterns updated"

### Monitored Directories:
- `/src` - Source code
- `/coder1-ide` - IDE files
- `/public` - Public assets

## 5. Conversation Threading

### Test Multi-Turn Conversations:
1. Start with "analyze my code"
2. Follow up with "what about security?"
3. Check if context is maintained

### View Thread History:
```bash
# Check conversation threads
cat .coder1/memory/conversations.json | jq '.[] | select(.messages | length > 1)'
```

## 6. Approval Workflows

### Test Approval System:
```bash
# Get pending approvals
curl http://localhost:3000/api/claude/approvals | jq

# Approve an action
curl -X POST http://localhost:3000/api/claude/approvals/{id}/approve
```

## 7. Performance Optimization

### Monitor Performance:
```bash
# Check performance metrics
curl http://localhost:3000/api/claude/performance | jq
```

### What to Look For:
- Hibernation after 30 seconds idle
- Cache hit rates
- Resource usage metrics

## 8. Enhanced Claude Bridge

### Test Agent Modes:
1. **Parallel Agents:** "run parallel agents to build a dashboard"
2. **Hivemind:** "start hivemind to optimize database"
3. **Infinite Loop:** "use infinite mode for continuous monitoring"

## Quick Test Checklist

- [ ] Natural commands execute and show results
- [ ] Help commands provide detailed explanations
- [ ] File changes trigger context updates (check console)
- [ ] Memory persists across server restarts
- [ ] Suggestions API returns contextual recommendations
- [ ] Performance metrics show optimization working

## Debugging Tips

### Check Server Logs:
- Look for emoji indicators (🧠, 🔮, ⚡, etc.)
- Each system logs its initialization
- File changes show in real-time

### Browser Console:
1. Open DevTools (F12)
2. Check for JavaScript errors
3. Look for "Execute response:" debug logs

### Common Issues:
- **No results showing:** Clear cache and refresh
- **Generic help responses:** Restart server to load new content
- **Rate limiting:** Wait 2 minutes or clear with admin endpoint

## Demo Mode
The system runs in demo mode by default:
- Uses template questions instead of AI
- All core features still work
- Perfect for testing without API keys