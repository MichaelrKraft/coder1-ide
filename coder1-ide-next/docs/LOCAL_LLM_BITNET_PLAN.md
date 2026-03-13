# BitNet + Local LLM Integration for Coder1 IDE
### Feature Plan & Implementation Guide

**Status**: Planned — Ready to implement when prioritized
**Estimated scope**: ~225 lines across 5 files, 1–2 days of dev work

---

## Executive Summary

Coder1 users currently pay per Claude API token for every AI interaction inside the IDE. This plan
integrates support for **local LLMs** — specifically Microsoft's BitNet, but compatible with LM
Studio and Ollama too — so users can run AI features entirely on their own machine, for free.

The feature is an opt-in toggle in Settings. When enabled, Coder1's in-IDE AI calls go directly
from the user's browser to their local machine, bypassing the Render cloud server entirely.

**Why this matters for Coder1**:
- Differentiates from Cursor/Copilot with a genuine "local-first" mode
- Gives privacy-sensitive users (enterprise, security-conscious devs) a no-cloud option
- Reduces the cost barrier for high-volume users running lots of AI requests
- Builds toward the vision of Coder1 as a "comprehensive local AI development platform"

**BitNet quick facts**:
- Developed by Microsoft Research, open-sourced 2024
- 1-bit weights (ternary: -1, 0, +1) — radically more efficient than standard LLMs
- `bitnet-b1.58-2B-4T`: 0.4GB RAM, runs on any modern CPU, no GPU needed
- 29ms latency per token on CPU — faster than LLaMA 3.2 1B
- Exposes an OpenAI-compatible API — plug-and-play with Coder1's existing fetch calls

---

## The Problem

When Coder1 analyzes errors, generates code, or runs AI team tasks, every request hits:
```
User's browser → Render server (cloud) → Anthropic API → back
```
This costs money per token and sends user code to the cloud.

---

## The Solution

For users with a local LLM running (BitNet, LM Studio, Ollama):
```
User's browser → user's localhost:1234 (local LLM)
```
The Render server is completely bypassed. Free, private, instant.

**Architecture constraint (important)**: Coder1 runs on Render (HTTPS). The Render server
cannot reach the user's `localhost:1234`. But the *browser* can — Chrome/Firefox both allow
HTTPS pages to call `http://localhost` as a special mixed-content exception. All local LLM
calls are made client-side from the browser, not server-side.

---

## User Experience

### Setup (one-time, ~2 minutes)

1. Install a local LLM server (LM Studio is the easiest; BitNet, Ollama also work)
2. Start the server, enable CORS, note the URL and model name
3. Open Coder1 → Settings → AI tab → scroll to "Local LLM" section
4. Enter URL (`http://localhost:1234`) and model name
5. Click "Test Connection" → see green checkmark + latency
6. Enable the toggle

### Day-to-day usage

- A purple **"LLM: bitnet-b1.58"** pill appears in the status bar
- All AI error analysis in the terminal routes to the local LLM (free)
- Click the pill to open Settings and switch back to Claude at any time
- If the local LLM is down, Coder1 automatically falls back to Claude (configurable)

---

## What Gets Built

### 5 files, ~225 lines total

| File | What changes | Lines |
|------|--------------|-------|
| `lib/local-llm-client.ts` | **New file** — config read/write + browser-side fetch utility | ~90 |
| `components/SettingsModal.tsx` | Add "Local LLM" section in AI tab | ~70 added |
| `components/status-bar/StatusBarCore.tsx` | Add purple provider pill + dual event listeners | ~30 added |
| `app/ide/page.tsx` | Listen for `openSettingsModal` CustomEvent from pill click | ~15 added |
| `components/terminal/ErrorDoctor.tsx` | Short-circuit to local LLM when enabled | ~20 changed |
| `lib/feature-flags.ts` *(optional)* | Add `localLlm: true` feature flag | ~3 changed |

---

## Detailed Implementation Plan

### Step 1: `lib/local-llm-client.ts` (new file)

The core utility. Pure TypeScript, no React, no side effects. Provides:

```typescript
export interface LocalLlmConfig {
  enabled: boolean;
  url: string;              // e.g. "http://localhost:1234"
  modelName: string;        // e.g. "bitnet-b1.58-2B-4T"
  timeoutMs: number;        // default: 30000
  fallbackOnError: boolean; // default: true
}

export const LOCAL_LLM_STORAGE_KEY = 'coder1-local-llm';
export const LOCAL_LLM_CHANGED_EVENT = 'localLlmConfigChanged';

getLocalLlmConfig(): LocalLlmConfig
saveLocalLlmConfig(config): void          // saves + dispatches CustomEvent for same-tab reactivity
isLocalLlmEnabled(): boolean
normalizeUrl(url): string                  // adds http://, strips trailing slash, rejects non-localhost
isLocalhostUrl(url): boolean
testLocalLlmConnection(url, model): Promise<{ ok, latencyMs, error? }>  // 5s timeout
callLocalLlm(messages, options?): Promise<string>                        // AbortController timeout
```

All localStorage reads/writes wrapped in try/catch — silently handles private browsing mode.

`callLocalLlm` sends:
```json
POST {url}/v1/chat/completions
{ "model": "...", "messages": [...], "max_tokens": 500, "stream": false }
```

Sanitizes error text before building prompts (strips secrets/API keys, truncates at 500 chars).

**Default config**:
```typescript
{
  enabled: false,
  url: 'http://localhost:1234',
  modelName: '',
  timeoutMs: 30000,
  fallbackOnError: true
}
```

---

### Step 2: `components/SettingsModal.tsx` — AI tab

New section after the Claudish "Alternative Models" block:

```
┌─ Local LLM (BitNet / LM Studio / Ollama) ──────────────────────────┐
│                                                                      │
│  ☑ Enable Local LLM                                                  │
│  "Run AI on your own hardware — free, private, no API costs"         │
│                                                                      │
│  Endpoint URL:  [http://localhost:1234              ]                │
│  Model name:    [bitnet-b1.58-2B-4T       ▾ presets]                │
│                                                                      │
│  ☑ Fall back to cloud AI if local LLM fails                          │
│                                                                      │
│  [Test Connection]  →  ✓ Connected — 847ms                           │
│                     or  ✗ Connection refused — is LM Studio running? │
│                     or  ✗ CORS error — enable CORS in LM Studio      │
│                                                                      │
│  ⚠ Only http://localhost and http://127.0.0.1 are supported.         │
│                                                                      │
│  Setup guides:  → LM Studio (easiest)  → BitNet b1.58  → Ollama     │
└──────────────────────────────────────────────────────────────────────┘
```

Model name `<datalist>` presets:
- `bitnet-b1.58-2B-4T` (BitNet — fastest, 0.4GB)
- `bitnet-b1.58-3B-4T` (BitNet — balanced)
- `llama3.2-3b-instruct` (Ollama / LM Studio)
- `qwen2.5-coder-7b` (LM Studio)
- `mistral-7b-instruct` (LM Studio)

Settings write to localStorage immediately on change (same pattern as Claudish). URL validated on
blur: non-localhost shows inline error and is not saved.

**Test Connection button** responses:
- `✓ Connected — 847ms` (green)
- `✗ Connection refused — is LM Studio running?`
- `✗ CORS error — enable CORS in LM Studio (Server tab → Enable CORS)`
- `✗ Timeout — is the model loaded?`

---

### Step 3: `components/status-bar/StatusBarCore.tsx` — Provider pill

Added in the left section of the status bar, between CostDisplay and unsaved-files indicator.

**CRITICAL: dual event listener pattern** — `window.storage` only fires in *other* tabs, so same-tab
updates require the custom event dispatched by `saveLocalLlmConfig`:

```typescript
// Same-tab changes (Settings modal writes localStorage + dispatches this)
window.addEventListener(LOCAL_LLM_CHANGED_EVENT, handleLocalLlmChanged);

// Cross-tab changes (standard storage event, fires only in OTHER tabs)
window.addEventListener('storage', handleStorage);
```

Pill renders only when enabled:
```tsx
{localLlmConfig?.enabled && (
  <div
    className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 cursor-pointer"
    title={`Local LLM Active\nModel: ${localLlmConfig.modelName}\nEndpoint: ${localLlmConfig.url}\n\nClick to configure`}
    onClick={() => window.dispatchEvent(new CustomEvent('openSettingsModal', { detail: { tab: 'ai' } }))}
  >
    <Cpu className="w-3.5 h-3.5" />
    <span className="font-medium text-xs">
      LLM: {localLlmConfig.modelName
        ? localLlmConfig.modelName.split('-').slice(0, 2).join('-')
        : 'Local'}
    </span>
  </div>
)}
```

Add `Cpu` to the lucide-react import at line 11.

---

### Step 4: `app/ide/page.tsx` — Modal open event listener

StatusBarCore cannot directly call `setShowSettingsModal()` (that state lives in the IDE page).
Use a CustomEvent bridge:

```typescript
useEffect(() => {
  const handler = (e: Event) => setShowSettingsModal(true);
  window.addEventListener('openSettingsModal', handler);
  return () => window.removeEventListener('openSettingsModal', handler);
}, []);
```

---

### Step 5: `components/terminal/ErrorDoctor.tsx` — First integration

ErrorDoctor currently calls `fetch('/api/error-doctor/analyze', ...)` — a Render server route.
Short-circuit this when local LLM is enabled:

```typescript
import { isLocalLlmEnabled, callLocalLlm, getLocalLlmConfig } from '@/lib/local-llm-client';

const localConfig = getLocalLlmConfig();
if (localConfig.enabled) {
  try {
    const result = await callLocalLlm([
      { role: 'user', content: `Analyze this error and provide:\n1. Root cause\n2. Fix\n\nError: ${error.substring(0, 500)}` }
    ]);
    setDiagnosis(`${result}\n\n[Analyzed by Local LLM: ${localConfig.modelName || 'local'}]`);
    return;
  } catch (localErr) {
    if (!localConfig.fallbackOnError) {
      setDiagnosis(`Local LLM failed: ${localErr instanceof Error ? localErr.message : 'Unknown error'}`);
      return;
    }
    // fallbackOnError = true — fall through to existing server route
    console.warn('[ErrorDoctor] Local LLM failed, falling back to server:', localErr);
  }
}
// existing fetch('/api/error-doctor/analyze') call continues unchanged
```

---

## Edge Cases Handled

| Scenario | Mitigation |
|----------|-----------|
| Local LLM crashes mid-request | AbortController timeout with clear error message |
| User enters `192.168.x.x` URL | `isLocalhostUrl()` rejects before saving; inline error shown |
| URL missing `http://` | Auto-prepended by `normalizeUrl()` |
| Trailing slash in URL | Stripped by `normalizeUrl()` |
| Model name empty | Yellow warning shown; most servers use a default model |
| Non-OpenAI response format | Defensive access + "Unexpected response format" error |
| CORS not configured on local LLM | Specific CORS error + fix instructions in Settings |
| localStorage unavailable (private browsing) | try/catch everywhere; feature silently disabled |
| Both Claudish + Local LLM enabled | Local LLM takes priority in ErrorDoctor; Claudish affects CLI separately |
| Very slow local LLM on old hardware | 30s configurable timeout; test uses separate 5s timeout |
| `window.storage` not firing same-tab | Fixed by dual event listener pattern (CustomEvent + storage) |
| StatusBarCore can't call openModal() | Fixed via CustomEvent('openSettingsModal') + listener in ide/page.tsx |

---

## Security

- **URL validation**: Only localhost/127.0.0.1 accepted — non-local URLs rejected before saving
- **Error sanitization**: Secrets stripped, paths redacted, truncated at 500 chars before building prompts
- **No API keys exposed**: Local LLM only receives message content — no Anthropic/cloud keys
- **localStorage only**: No sensitive credentials stored

---

## What's NOT in MVP (deliberate)

| Feature | Why deferred |
|---------|-------------|
| Streaming responses | `stream: false` for simplicity; future enhancement |
| Cost savings dashboard | Settings section explains benefit; status bar stays uncluttered |
| Auto-discovery of running LLMs | Users configure manually |
| More AI features using local LLM | Only ErrorDoctor in MVP; AITeamDashboard etc. adopt in follow-up PRs |
| Connection status persistence | Future: "last connected Xm ago" tooltip |

---

## Verification Checklist

- [ ] Start LM Studio, enable CORS, note model name + port
- [ ] Settings → AI tab → Local LLM section appears
- [ ] Enter URL + model, click "Test Connection" → green with latency
- [ ] Enable toggle → purple "LLM: bitnet-b1.58" pill appears in status bar
- [ ] Click pill → Settings modal opens to AI tab
- [ ] Trigger terminal error → ErrorDoctor shows "[Analyzed by Local LLM: ...]"
- [ ] DevTools Network: NO request to `/api/error-doctor/analyze` when local LLM enabled
- [ ] Stop local LLM → ErrorDoctor gracefully falls back to Claude
- [ ] Open 2nd browser tab, change URL → 1st tab pill updates (cross-tab sync)
- [ ] Test in private browsing → no console errors, feature silently disabled
- [ ] Enter `http://192.168.1.1` → inline validation error, not saved
- [ ] Enter URL without `http://` → auto-corrected and saved

---

## Resources

- [Microsoft BitNet GitHub](https://github.com/microsoft/BitNet)
- [BitNet b1.58 2B4T on HuggingFace](https://huggingface.co/microsoft/bitnet-b1.58-2B-4T)
- [LM Studio](https://lmstudio.ai) — easiest local LLM server for most users
- [Ollama](https://ollama.ai) — another popular option

---

*Documented: 2026-03-11 | Ready for implementation*
