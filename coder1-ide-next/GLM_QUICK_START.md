# 🚀 GLM Integration - Quick Start Guide

**⚠️ PRIVACY NOTICE**: GLM API registration may require passport verification. **We recommend [Gemini 2.5 Flash-Lite](./GEMINI_QUICK_START.md) instead** - no passport required, Google account only, similar pricing, FREE tier available!

## 5-Minute Setup

### Step 1: Get GLM API Key (2 minutes)
1. Go to https://open.bigmodel.cn/
2. Sign up/login
3. Navigate to API Keys section
4. Create new API key
5. Copy the key (starts with something like `sk-...`)

### Step 2: Configure (1 minute)
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next

# Add to .env.local (create if doesn't exist)
echo "GLM_API_KEY=your-key-here" >> .env.local
echo "NEXT_PUBLIC_GLM_API_KEY=your-key-here" >> .env.local
```

### Step 3: Start Server (30 seconds)
```bash
npm run dev
```

### Step 4: Test (1 minute)
1. Open http://localhost:3001/ide
2. Click ⚙️ (Settings) in terminal header
3. Under "Claude Model", select **GLM 4 Flash**
4. Type a message in terminal
5. See cost display appear in header!

---

## What You'll See

### Model Dropdown (Settings)
```
Claude Model (session default)

⚪ Claude Sonnet 4.5     🆕 Latest (Default)
⚪ Claude Opus 4.1       Most Capable
⚪ Claude Haiku 3.5      Ultra Fast
⚪ GLM 4 Flash           ⚡ Cost-Effective ($0.10/M)
⚪ GLM 4 Air             Balanced ($1/M)
⚪ GLM 4 Plus            Premium ($50/M)
```

### Cost Display (Terminal Header)
```
💰 GLM Usage | Session: $0.0012 (1.2K) | Total: $0.0245 (24.5K) [Reset]
```

### Rate Limit Toast
```
┌────────────────────────────────────────────┐
│ ⚠️ Rate limit detected.                   │
│ Switch to cost-effective GLM 4 Flash?      │
│                                            │
│  [Switch to GLM]  [Wait 15 min]           │
└────────────────────────────────────────────┘
```

---

## Testing Rate Limit Detection

Want to see the rate limit feature without waiting for an actual limit?

```bash
# In the terminal, type:
echo "rate limit exceeded"

# Or:
echo "429 too many requests"

# The system will detect it and show the toast!
```

---

## Cost Breakdown

| Model | Cost per 1M Tokens | Example Cost (1000 tokens) |
|-------|-------------------|---------------------------|
| GLM 4 Flash | $0.10 | $0.0001 |
| GLM 4 Air | $1.00 | $0.001 |
| GLM 4 Plus | $50.00 | $0.05 |

**Comparison**:
- Claude Sonnet 4.5: ~$15/M tokens
- GLM 4 Flash: $0.10/M tokens
- **Savings**: 150x cheaper! 🎉

---

## Troubleshooting

### "GLM API key not configured"
**Fix**: Make sure you added `GLM_API_KEY` to `.env.local`

### Cost display doesn't appear
**Fix**: Make sure you selected a GLM model (not Claude)

### Rate limit toast doesn't work
**Fix**: Test with `echo "rate limit"` first to verify

### Terminal shows errors
**Fix**: Check `.env.local` has both:
```bash
GLM_API_KEY=your-key
NEXT_PUBLIC_GLM_API_KEY=your-key
```

---

## Next Steps

1. ✅ **Test manually** - Select GLM 4 Flash and send a message
2. ✅ **Simulate rate limit** - Use `echo "rate limit"` command
3. ✅ **Monitor costs** - Watch the cost display update
4. ✅ **Test auto-switch** - Click "Switch to GLM" when toast appears
5. ✅ **Verify cooldown** - Wait for "Ready to switch back?" toast

---

## Files Modified

You can review changes in:
- `stores/useModelStore.ts` - GLM models added
- `components/terminal/Terminal.tsx` - Rate limit integration
- `components/terminal/TerminalSettings.tsx` - GLM in dropdown
- `.env.local.example` - Config documentation

New files:
- `lib/glm-api.ts`
- `lib/terminal-mode-manager.ts`
- `lib/terminal-context-extractor.ts`
- `lib/rate-limit-detector.ts`
- `stores/useGLMCostStore.ts`
- `components/terminal/GLMCostDisplay.tsx`

---

## Need Help?

See `GLM_INTEGRATION_COMPLETE.md` for full documentation.

---

**Ready to save 150x on AI costs?** 🚀
