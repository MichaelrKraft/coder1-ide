# CoderOne Server Recovery Strategy
**Last Updated:** January 2025  
**Purpose:** Fix and prevent server disconnections that interrupt development workflow

## 🚨 Problem Summary

The CoderOne server frequently disconnects with the error:
```
❌ Disconnected from server
❌ Connection failed. Make sure backend is running on port 3000
```

### Root Causes Identified:
1. **Server crashes** with `EADDRINUSE: address already in use 0.0.0.0:3000`
2. **Memory constraints** - Limited to 512MB causing service failures
3. **No auto-recovery** - Server doesn't restart after crashes
4. **Disabled services** - Critical features turned off to save memory

## ✅ VERIFIED SAFE FIX (Server is now running!)

Good news: The server IS currently running successfully at port 3000! The recent log shows:
- Memory usage: Only 15-34MB (well within limits)
- No crashes or errors
- Stable operation

## 🛠️ Incremental Recovery Strategy

### Phase 1: Immediate Recovery (When Server is Down)
**Confidence: 90%** - Simple, safe steps

1. **Check if server is actually running:**
   ```bash
   lsof -i :3000
   ps aux | grep "app.js" | grep -v grep
   ```

2. **If nothing running, clear port and start fresh:**
   ```bash
   # Kill any stuck processes
   pkill -f "node.*app.js"
   
   # Clear stale session files
   rm -rf sessions/*
   
   # Start with modest memory increase
   node --max-old-space-size=1024 src/app.js
   ```

3. **Monitor initial startup:**
   ```bash
   # In another terminal
   tail -f server.log | grep -E "(Error|Exception|running on port)"
   ```

### Phase 2: Monitor & Observe (First 2 Hours)
**Confidence: 85%** - Data gathering phase

1. **Check memory usage every 30 mins:**
   ```bash
   ps aux | grep node | grep app.js
   # Look at RSS column - should stay under 800MB
   ```

2. **Monitor for crashes:**
   ```bash
   tail -f server.log | grep -E "(Error|SIGTERM|Exception)"
   ```

3. **Test connection stability:**
   - Keep IDE open for extended period
   - Note any disconnections and times

### Phase 3: Gradual Improvements (Only if Needed)
**Confidence: 60%** - Higher risk, only if problems persist

#### A. Consider PM2 (Only if crashes continue)
```bash
# Install PM2 globally
npm install -g pm2

# Start app with PM2
pm2 start src/app.js --name coderone --max-memory-restart 1G

# Configure auto-restart
pm2 startup
pm2 save
```

**When to use PM2:**
- Server crashes more than once per day
- You need logging and monitoring
- Want automatic restarts

**When NOT to use:**
- Server is stable without it
- You prefer simplicity

#### B. Re-enable Services (One at a time)
**Current disabled services:**
```javascript
// Line 319: '/api/agent' - causes memory issues
// Line 351: '/api/workflows' - temporarily disabled  
// Line 773-774: Claude usage monitoring - memory issues
// Line 777-792: VibeCoach - memory issues
// Line 900: Repository preloader - memory issues
```

**Safe re-enabling process:**
1. Start with least critical (usage monitoring)
2. Edit src/app.js to uncomment ONE service
3. Restart server
4. Run for 30 minutes
5. Check memory: `ps aux | grep node`
6. If stable AND under 60% memory → try next service
7. If crashes or >80% memory → revert immediately

#### C. Memory Adjustment Decision Tree
```
Current memory usage (from ps aux):
├─ Under 400MB (40% of 1GB) → Perfect, no changes needed
├─ 400-600MB (40-60%) → Good, monitor daily
├─ 600-800MB (60-80%) → Warning zone
│   └─ Check for growth over time
│       ├─ Stable → OK for now
│       └─ Growing → Memory leak, investigate
└─ Over 800MB (>80%) → Action needed
    ├─ Try: node --max-old-space-size=1536 (1.5GB)
    └─ Still high? → Memory leak exists, don't increase further
```

## 📊 Monitoring Commands

### Quick Health Check
```bash
# Is server running?
curl http://localhost:3000/health

# Memory usage
ps aux | grep node | grep app.js | awk '{print $6/1024 " MB"}'

# Recent errors
tail -20 server.log | grep -E "(Error|Exception)"

# Port status
lsof -i :3000
```

### Emergency Recovery Script
Create `recover-server.sh`:
```bash
#!/bin/bash
echo "🔧 Attempting server recovery..."

# Kill existing
pkill -f "node.*app.js"
sleep 2

# Clear port
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Clear sessions
rm -rf sessions/*

# Start fresh
node --max-old-space-size=1024 src/app.js > server.log 2>&1 &

echo "✅ Server restarted. Check: curl http://localhost:3000/health"
```

## ⚠️ Important Notes

1. **Current Status:** Server IS running successfully with LOW memory usage
2. **Don't fix what isn't broken:** Only apply fixes if disconnections occur
3. **One change at a time:** Makes it easy to identify what helps or hurts
4. **Memory isn't everything:** Some services were disabled for OTHER bugs too
5. **Document everything:** Note what you change and the results

## 🚦 Risk Assessment

| Action | Risk Level | When to Do It |
|--------|------------|---------------|
| Check if running | None | Always first |
| Restart with 1GB | Low | Server is down |
| Monitor memory | None | Always |
| Add PM2 | Medium | After crashes |
| Re-enable service | High | After stable for days |
| Increase to 2GB | Medium | Memory consistently >80% |

## 📝 Tracking Checklist

- [ ] Server running? Check with `lsof -i :3000`
- [ ] Memory under 60%? Check with `ps aux`
- [ ] No crashes in 2 hours? Check server.log
- [ ] Connection stable for 1 hour continuous use?
- [ ] If all above YES → System is healthy, no changes needed
- [ ] If any NO → Apply Phase 1 fixes only

## 💡 Why This Strategy Works

- **Incremental:** Small steps = easy to reverse
- **Observable:** Know exactly what fixed/broke things  
- **Safe:** Minimal risk to working parts
- **Data-driven:** Decisions based on metrics, not guessing

Remember: The goal is stability, not perfection. A simple server running reliably is better than a complex one that crashes.