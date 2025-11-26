# Claudish Integration Guide

## Overview

Claudish is now integrated into Coder1 IDE, allowing you to access alternative AI models (Grok, GPT-5, MiniMax, etc.) via OpenRouter with **50-70% cost savings** compared to Claude.

This is a **power-user feature** that provides model flexibility while maintaining the familiar Claude Code workflow.

---

## Quick Start

### 1. Install Claudish

```bash
npm install -g claudish
```

Verify installation:
```bash
claudish --version
```

### 2. Get OpenRouter API Key

1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Create account (free signup)
3. Navigate to API Keys section
4. Generate new API key
5. Copy the key (starts with `sk-or-...`)

### 3. Configure Coder1

**Option A: UI Configuration (Recommended)**

1. Start Coder1: `npm run dev`
2. Open Settings (gear icon in menu bar)
3. Navigate to **AI** tab
4. Scroll to **Alternative Models (Advanced)**
5. Check **"Enable Alternative Models (Claudish)"**
6. **Enter your OpenRouter API Key** in the password field
7. Select your preferred model from dropdown
8. Click **Save Changes**

**Option B: Environment Variable (Advanced Users)**

Add to `.env.local`:
```bash
OPENROUTER_API_KEY=sk-or-your-key-here
USE_CLAUDISH=false  # Enable manually in Settings
CLAUDISH_MODEL=x-ai/grok-code-fast-1
```

### 4. Test the Integration

Open terminal in Coder1 and type:
```bash
claude help me optimize this code
```

If Claudish is enabled, the request will route through the selected OpenRouter model instead of Claude.

---

## Available Models

| Model | Cost/M Tokens | Best For | Speed |
|-------|---------------|----------|-------|
| **Grok Fast** (`x-ai/grok-code-fast-1`) | ~$0.50 | Quick iterations, debugging | ⚡⚡⚡ |
| **GPT-5 Codex** (`openai/gpt-5-codex`) | ~$1.00 | Balanced quality/cost | ⚡⚡ |
| **MiniMax M2** (`minimax/minimax-m2`) | ~$0.80 | Alternative provider | ⚡⚡ |
| **Qwen 3 VL** (`qwen/qwen3-vl-235b-a22b-instruct`) | ~$0.90 | Multimodal tasks | ⚡⚡ |
| **GLM 4.6** (`zhipu-ai/glm-4.6`) | ~$0.10 | Ultra-cheap, Chinese market | ⚡⚡⚡ |

**Claude Opus 4.1** (baseline): ~$15 input, ~$75 output per million tokens

---

## Use Cases

### When to Use Claudish

✅ **Cost optimization** - Reduce API costs by 50-70%  
✅ **Testing/prototyping** - Quick iterations with cheaper models  
✅ **Non-critical tasks** - Documentation, simple refactoring  
✅ **Rate limit avoidance** - Switch to alternative when Claude is busy  
✅ **Model comparison** - Test different AI approaches

### When to Use Native Claude

✅ **Complex architecture** - High-quality reasoning required  
✅ **Production code** - Mission-critical features  
✅ **Security-sensitive** - Code review, vulnerability analysis  
✅ **Best quality** - When cost is secondary to output quality

---

## Architecture Integration

### How It Works

```
User types: claude help

                ↓
┌───────────────────────────────────┐
│  ClaudeCliService                  │
│  (/services/claude-cli-service.ts) │
└───────────────────────────────────┘
                ↓
      [Check Settings]
                ↓
┌─────────────────────────────────────┐
│ useClaudish === true?                │
│ (from localStorage)                  │
└─────────────────────────────────────┘
         /              \
        YES             NO
         ↓              ↓
┌───────────────┐  ┌──────────────┐
│   Claudish    │  │    Claude    │
│  (OpenRouter) │  │   (Native)   │
└───────────────┘  └──────────────┘
         ↓              ↓
    [Response] ← [Response]
         ↓
    [Display in Terminal]
```

### Files Modified

1. **`/services/claude-cli-service.ts`** (~50 lines added)
   - Added `claudish` to CLI detection
   - Created `getEffectiveCommand()` method
   - Command substitution logic

2. **`/components/SettingsModal.tsx`** (~100 lines added)
   - New "Alternative Models" section in AI tab
   - Toggle switch for enabling Claudish
   - Model selector dropdown (5 options)
   - Setup instructions with links

3. **`.env.local.example`** (~20 lines added)
   - Documentation for `OPENROUTER_API_KEY`
   - Model configuration options
   - Usage examples

---

## Cost Analysis

### Example: AI Team Feature (5 agents)

**Scenario**: Building a full-stack web app with AI Team

**Claude Opus 4.1** (Current):
- Input: 100K tokens × $15/M = $1.50
- Output: 50K tokens × $75/M = $3.75
- **Total**: $5.25 per AI Team session

**Grok Fast** (with Claudish):
- Input: 100K tokens × $0.50/M = $0.05
- Output: 50K tokens × $0.50/M = $0.025
- **Total**: $0.075 per AI Team session

**Savings**: $5.175 per session (98% reduction!)

**Annual Savings** (100 sessions/month):
- Claude cost: $5.25 × 100 = $525/month = $6,300/year
- Grok cost: $0.075 × 100 = $7.50/month = $90/year
- **Savings**: $6,210/year

---

## Troubleshooting

### Claudish Not Detected

**Symptom**: Toggle appears grayed out or shows "Not Installed"

**Solution**:
```bash
# Verify global installation
which claudish

# If not found, reinstall
npm install -g claudish

# Restart Coder1
npm run dev
```

### "Invalid API Key" Errors

**Symptom**: Requests fail with authentication errors

**Solutions**:
1. Verify API key format: `sk-or-...` (OpenRouter format)
2. Check `.env.local` has `OPENROUTER_API_KEY` set
3. Restart server after adding environment variables
4. Verify key is active at [openrouter.ai/keys](https://openrouter.ai/keys)

### Model Not Responding

**Symptom**: Long wait times or timeout errors

**Solutions**:
1. Try different model (some models have higher latency)
2. Check OpenRouter status: [status.openrouter.ai](https://status.openrouter.ai)
3. Verify sufficient credits in OpenRouter account
4. Switch back to Claude temporarily

### Toggle Doesn't Persist

**Symptom**: Claudish disables after refresh

**Cause**: localStorage not syncing

**Solution**:
```javascript
// Manual fix via browser console
localStorage.setItem('use_claudish', 'true');
localStorage.setItem('claudish_model', 'x-ai/grok-code-fast-1');
```

Then refresh the page.

---

## FAQ

**Q: Can I use Claudish and Claude simultaneously?**  
A: Yes! Toggle between them in Settings. No restart required.

**Q: Does this work with AI Team?**  
A: Yes! When Claudish is enabled, all AI Team agents use the selected model.

**Q: Will this break my existing workflows?**  
A: No. Claudish is opt-in. Existing Claude integration unchanged.

**Q: Can I use my own OpenRouter credits?**  
A: Yes! OpenRouter credits work, or pay-as-you-go with credit card.

**Q: What happens if Claudish fails?**  
A: Currently no automatic fallback. Manually toggle back to Claude in Settings.

**Q: Can I add custom models?**  
A: Yes, but requires code modification. Edit the dropdown in `SettingsModal.tsx`.

**Q: Does this require internet connection?**  
A: Yes, both Claude and Claudish require internet for API calls.

---

## Advanced: Custom Models

### Adding New Models

Edit `/components/SettingsModal.tsx`:

```tsx
<select value={settings.claudishModel} onChange={(e) => {/* ... */}}>
  {/* Existing options */}
  <option value="your-model/your-model-name">
    Custom Model (Your cost estimate)
  </option>
</select>
```

Valid model names from OpenRouter:
- Check [openrouter.ai/models](https://openrouter.ai/models)
- Use exact model ID (e.g., `anthropic/claude-3-opus`)

### Environment-Specific Defaults

Force Grok in development:

```bash
# .env.local
NODE_ENV=development
USE_CLAUDISH=true
CLAUDISH_MODEL=x-ai/grok-code-fast-1
```

Force Claude in production:

```bash
# .env.production
NODE_ENV=production
USE_CLAUDISH=false
```

---

## Roadmap

### v1 (Current - Completed)
- ✅ Claudish detection
- ✅ Model selector UI
- ✅ Command substitution
- ✅ 5 preset models
- ✅ Settings integration

### v2 (Planned - Q2 2025)
- ⏳ Automatic fallback (Claudish → Claude on error)
- ⏳ Per-agent model selection (AI Team)
- ⏳ Cost tracking dashboard
- ⏳ Model comparison tool
- ⏳ Usage analytics

### v3 (Future - Q3 2025)
- 🔮 Smart model routing (based on task type)
- 🔮 Custom model presets
- 🔮 Team/workspace shared configs
- 🔮 Extended thinking mode integration

---

## Support

**Issues**: [GitHub Issues](https://github.com/MichaelrKraft/coder1-ide/issues)  
**Claudish Docs**: [Claudish GitHub](https://github.com/MadAppGang/claude-code/tree/main/mcp/claudish)  
**OpenRouter**: [OpenRouter Docs](https://openrouter.ai/docs)

**Community**: 
- Coder1 Discord: [Join](https://discord.gg/coder1ide)
- Reddit: r/Coder1IDE

---

## Contributing

Want to improve Claudish integration? We welcome PRs!

**Priority areas**:
1. Automatic fallback system
2. Cost tracking UI
3. Model performance benchmarks
4. Extended thinking mode support

**Development setup**:
```bash
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/coder1-ide-next
npm install
npm run dev
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

*Last Updated: January 2025*  
*Version: 1.0.0*  
*Integration Date: November 26, 2025*
