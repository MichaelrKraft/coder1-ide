# 🚀 Gemini Integration - Quick Start Guide

**⭐ RECOMMENDED: No passport required! Google account only.**

---

## 🎯 Why Gemini Instead of GLM?

| Feature | Gemini | GLM |
|---------|--------|-----|
| **ID Verification** | ✅ None (Google account) | ❌ Passport required |
| **Cost** | $0.10-$0.15/M tokens | $0.10/M tokens |
| **Free Tier** | ✅ 15 RPM | ❌ None |
| **Setup Time** | 5 minutes | Unknown (verification delays) |
| **Privacy** | ✅ Google (trusted) | ⚠️ Unknown verification process |

---

## 🚀 5-Minute Setup

### Step 1: Get Gemini API Key (2 minutes)
1. Visit **https://ai.google.dev/**
2. Click **"Get API key"** in Google AI Studio
3. Sign in with your Google account (NO passport needed!)
4. Copy the API key (starts with `AI...`)

### Step 2: Configure (1 minute)
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next

# Add to .env.local
echo "GEMINI_API_KEY=your-api-key-here" >> .env.local
echo "NEXT_PUBLIC_GEMINI_API_KEY=your-api-key-here" >> .env.local
```

### Step 3: Start Server (30 seconds)
```bash
npm run dev
```

### Step 4: Test (1 minute)
1. Open **http://localhost:3001/ide**
2. Click **⚙️ Settings** in terminal header
3. Select **"Gemini 2.5 Flash-Lite"** (cheapest!)
4. Type a message in terminal
5. See cost display appear! 💰

---

## 💰 Cost Comparison

| Model | Cost per 1M Tokens | 50K Session | Monthly (20M) |
|-------|-------------------|-------------|---------------|
| **Gemini Flash-Lite** | **$0.10 input / $0.40 output** | **~$0.025** | **~$5** |
| **Gemini Flash** | **$0.15** | **$0.0075** | **$3** |
| GLM 4 Flash | $0.10 | $0.005 | $2 |
| Claude Sonnet 4.5 | $15.00 | $0.75 | $300 |

**Verdict**: Gemini Flash-Lite is 99.3% cheaper than Claude! 🎉

---

## ✨ Available Models

### Gemini 2.5 Flash-Lite ⚡ (RECOMMENDED)
- **Cost**: $0.10/M input, $0.40/M output
- **Best for**: Simple tasks, refactoring, explanations
- **Speed**: Ultra-fast responses
- **Free Tier**: Yes! 15 requests/minute

### Gemini 2.5 Flash 🚀
- **Cost**: $0.15/M tokens (uniform)
- **Best for**: Balanced performance/cost
- **Speed**: Fast responses
- **Free Tier**: Yes! 15 requests/minute

---

## 🎯 What You'll See

### Settings Dropdown
```
Claude Model:
⚪ Claude Sonnet 4.5 ($15/M)
⚪ Claude Opus 4.1 ($15/M) 
⚪ Claude Haiku 3.5 ($15/M)
🚀 Gemini 2.5 Flash ($0.15/M) ← NEW!
⚡ Gemini 2.5 Flash-Lite ($0.10/M) ← NEW!
💰 GLM 4 Flash ($0.10/M)
```

### Cost Display (Terminal Header)
```
💰 Gemini Usage | Session: $0.0012 (1.2K) | Total: $0.0245 (24.5K) [Reset]
```

### Rate Limit Auto-Fallback
```
┌────────────────────────────────────────┐
│ ⚠️ Claude rate limit detected.        │
│ Switch to Gemini 2.5 Flash-Lite?      │
│                                        │
│ [Switch to Gemini]  [Wait 15 min]     │
└────────────────────────────────────────┘
```

---

## 🧪 Test Commands

### Test 1: Manual Selection
```bash
# In IDE terminal:
# 1. Click ⚙️ Settings
# 2. Select "Gemini 2.5 Flash-Lite"
# 3. Type: echo "Hello Gemini!"
# 4. See cost display appear
```

### Test 2: Rate Limit Simulation
```bash
# In IDE terminal:
echo "rate limit exceeded"

# Expected: Toast notification appears
# "Switch to Gemini 2.5 Flash-Lite?"
```

### Test 3: Cost Tracking
```bash
# Send a few messages
# Watch costs update in real-time
# Refresh page - total cost persists!
```

---

## 🔧 Troubleshooting

### "GEMINI_API_KEY not configured"
**Fix**: Make sure you added both keys to `.env.local`:
```bash
GEMINI_API_KEY=your-key
NEXT_PUBLIC_GEMINI_API_KEY=your-key
```

### Cost display doesn't appear
**Fix**: Make sure you selected a Gemini model (not Claude) in settings

### API key doesn't work
**Fix**: 
1. Verify key starts with `AI...` (Gemini format)
2. Check key is activated in Google AI Studio
3. FREE tier has 15 RPM limit - wait if exceeded

### "Invalid API key" error
**Fix**:
1. Regenerate key in Google AI Studio
2. Make sure no extra spaces in `.env.local`
3. Restart server: `npm run dev`

---

## 📊 Performance & Features

### What Works NOW:
✅ Gemini models in dropdown  
✅ Real-time cost tracking  
✅ Context preservation (200 lines)  
✅ Auto-fallback from Claude rate limits  
✅ Session vs Total cost breakdown  
✅ Cross-tab synchronization  
✅ Cost persistence across refreshes  

### Privacy Benefits:
✅ **No passport/ID required**  
✅ **No unknown verification process**  
✅ **Trusted provider (Google)**  
✅ **FREE tier available**  
✅ **Instant activation** (no waiting)  

---

## 🎉 Success Checklist

- [ ] Got Gemini API key from https://ai.google.dev/
- [ ] Added to `.env.local` (both variables)
- [ ] Restarted server (`npm run dev`)
- [ ] Selected Gemini model in settings
- [ ] Sent test message
- [ ] Cost display appeared
- [ ] Costs updated in real-time

**All checked?** You're ready to save 99% on AI costs! 🚀

---

## 🆚 Gemini vs GLM Decision

### Choose Gemini if:
✅ You value privacy (no passport required)  
✅ You want FREE tier for testing  
✅ You trust Google as provider  
✅ You want instant setup (5 min)  

### Choose GLM if:
⚠️ You're okay with passport verification  
⚠️ You don't mind potential delays  
⚠️ You already have active GLM account  

**Our Recommendation**: **Use Gemini 2.5 Flash-Lite** - same cost, no privacy concerns!

---

## 📚 Related Documentation

- **[GEMINI_INTEGRATION_STATUS.md](./GEMINI_INTEGRATION_STATUS.md)** - Implementation status
- **[GLM_README.md](./GLM_README.md)** - GLM alternative (if you prefer)
- **[GLM_INTEGRATION_COMPLETE.md](./GLM_INTEGRATION_COMPLETE.md)** - Technical details

---

## 🚀 Next Steps

1. **Get API key** - https://ai.google.dev/ (2 min, no passport!)
2. **Add to `.env.local`** - Both GEMINI_API_KEY variables
3. **Restart server** - `npm run dev`
4. **Test it out** - Select Gemini in settings
5. **Start saving** - 99% cheaper than Claude!

**Ready to try?** Get your key now: **https://ai.google.dev/** 🎯

---

**Date**: October 4, 2025  
**Status**: ✅ Fully Functional  
**Setup Time**: 5 minutes  
**Privacy**: ✅ No passport required
