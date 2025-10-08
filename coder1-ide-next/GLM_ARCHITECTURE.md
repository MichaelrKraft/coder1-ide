# 🏗️ GLM Integration - System Architecture

**⚠️ PRIVACY NOTICE**: GLM API registration may require passport verification. **We recommend [Gemini 2.5 Flash-Lite](./GEMINI_QUICK_START.md) instead** - no passport required, Google account only, similar pricing, FREE tier available!

**Visual guide to how all the pieces fit together**

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Coder1 IDE (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Terminal Component (Terminal.tsx)           │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │   Settings   │  │ Rate Limit   │  │    Cost    │ │  │
│  │  │   Dropdown   │  │   Detector   │  │  Display   │ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  │         │                 │                 │         │  │
│  └─────────┼─────────────────┼─────────────────┼─────────┘  │
│            │                 │                 │             │
│            ▼                 ▼                 ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Core Services Layer                       │   │
│  │                                                       │   │
│  │  • TerminalModeManager     • GLMAPIClient           │   │
│  │  • TerminalContextExtractor • RateLimitDetector     │   │
│  │  • useModelStore            • useGLMCostStore       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Dual-Mode Terminal System               │   │
│  │                                                       │   │
│  │  ┌──────────────────┐      ┌──────────────────┐    │   │
│  │  │  CLAUDE_CLI      │      │    GLM_API       │    │   │
│  │  │  ─────────────   │      │    ──────────    │    │   │
│  │  │  • Socket.IO     │ ←──→ │    • HTTP POST   │    │   │
│  │  │  • PTY Process   │      │    • OpenAI fmt  │    │   │
│  │  │  • $15/M tokens  │      │    • $0.10/M     │    │   │
│  │  └──────────────────┘      └──────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

        │                                    │
        ▼                                    ▼
  ┌──────────┐                        ┌──────────────┐
  │  Claude  │                        │  GLM 4 API   │
  │   CLI    │                        │  (智谱AI)     │
  └──────────┘                        └──────────────┘
```

---

## 🔄 User Interaction Flow

### Flow 1: Rate Limit Detection → Automatic Fallback

```
User types command in terminal
        ↓
Terminal sends to Claude CLI
        ↓
Claude returns rate limit error
        ↓
RateLimitDetector scans output
        ↓
Matches pattern: /rate limit|429|too many/i
        ↓
Toast notification appears
┌─────────────────────────────────────────┐
│ ⚠️ Rate limit detected.                │
│ Switch to GLM 4 Flash?                  │
│                                         │
│ [Switch to GLM]  [Wait 15 min]         │
└─────────────────────────────────────────┘
        ↓ (User clicks "Switch to GLM")
        ↓
TerminalContextExtractor extracts last 200 lines
        ↓
TerminalModeManager switches mode
        ↓
useModelStore updates to 'glm-4-flash'
        ↓
GLMCostDisplay appears in header
        ↓
User continues work with GLM API
        ↓
Auto-switch back toast after cooldown
┌─────────────────────────────────────────┐
│ ⏰ Claude cooldown complete (15 min).  │
│ Ready to switch back?                   │
│                                         │
│ [Switch to Claude]                      │
└─────────────────────────────────────────┘
```

---

### Flow 2: Manual Model Selection

```
User clicks ⚙️ Settings button
        ↓
TerminalSettings modal opens
        ↓
User scrolls to "Claude Model" section
        ↓
Sees 6 models:
  ⚪ Claude Sonnet 4.5 (Latest)
  ⚪ Claude Opus 4.1 (Capable)
  ⚪ Claude Haiku 3.5 (Fast)
  ⚪ GLM 4 Flash ($0.10/M)
  ⚪ GLM 4 Air ($1/M)
  ⚪ GLM 4 Plus ($50/M)
        ↓
User selects "GLM 4 Flash"
        ↓
useModelStore.setSelectedModel('glm-4-flash')
        ↓
GLMCostDisplay renders in terminal header
        ↓
Terminal shows: "✅ Model changed to: GLM 4 Flash"
        ↓
User sends message
        ↓
TerminalModeManager routes to GLM API
        ↓
GLMAPIClient sends HTTP POST
        ↓
Response received with usage data
        ↓
useGLMCostStore.addUsage() updates costs
        ↓
GLMCostDisplay shows real-time cost
💰 GLM Usage | Session: $0.0012 (1.2K) | Total: $0.0245 (24.5K)
```

---

## 🗂️ Data Flow Diagram

### Context Preservation Flow

```
┌──────────────────────────────────────────────────────────┐
│              xterm.js Terminal Buffer                     │
│  Line 1: $ npm run dev                                   │
│  Line 2: > Starting server...                             │
│  ...                                                      │
│  Line 198: User: How do I center a div?                  │
│  Line 199: Claude: You can use flexbox...                │
│  Line 200: User: What about grid?                        │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
        TerminalContextExtractor.extractContext()
                           │
                           ▼
                  buffer.active.getLine(i)
                           │
                           ▼
              Filter thinking animations & UI
                           │
                           ▼
                  Parse into messages:
                  [
                    { role: 'user', content: 'How do I...' },
                    { role: 'assistant', content: 'You can...' },
                    { role: 'user', content: 'What about...' }
                  ]
                           │
                           ▼
              TerminalModeManager.preservedContext
                           │
                           ▼
                  Prepended to new GLM requests:
                  [
                    { role: 'system', content: 'Continuing...' },
                    { role: 'user', content: 'How do I...' },
                    { role: 'assistant', content: 'You can...' },
                    { role: 'user', content: 'What about...' },
                    { role: 'user', content: 'NEW MESSAGE' }
                  ]
                           │
                           ▼
                     GLM API Request
```

---

### Cost Tracking Flow

```
GLM API Response
{
  "choices": [...],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 250,
    "total_tokens": 400
  }
}
        │
        ▼
GLMAPIClient.chat()
  calculates cost:
  400 tokens × ($0.10 / 1,000,000) = $0.00004
        │
        ▼
useGLMCostStore.addUsage(400, 'glm-4-flash', 0.00004)
        │
        ├─→ sessionTokens += 400
        ├─→ sessionCost += 0.00004
        ├─→ totalTokens += 400
        ├─→ totalCost += 0.00004
        └─→ usageHistory.push({ timestamp, tokens, cost })
        │
        ▼
localStorage.setItem('glm-cost-tracking', JSON.stringify(state))
        │
        ▼
GLMCostDisplay re-renders (Zustand subscription)
        │
        ▼
UI updates with new costs:
💰 GLM Usage | Session: $0.00004 (400) | Total: $0.00004 (400)
```

---

## 🧩 Component Relationships

### Terminal.tsx Integration Points

```typescript
// Terminal.tsx (lines 2580-2654)

// 1. Imports
import { RateLimitDetector } from '@/lib/rate-limit-detector';
import { TerminalModeManager } from '@/lib/terminal-mode-manager';
import GLMCostDisplay from './GLMCostDisplay';

// 2. Singleton Refs (persist across renders)
const rateLimitDetectorRef = useRef<RateLimitDetector>(
  new RateLimitDetector()
);
const modeManagerRef = useRef<TerminalModeManager>(
  new TerminalModeManager()
);

// 3. Socket.IO Data Handler
socket.on('terminal:data', ({ data }) => {
  term.write(data);
  
  // Rate limit detection
  const event = rateLimitDetectorRef.current.detectRateLimit(data);
  
  if (event.detected && event.suggestGLM) {
    // Show toast with action buttons
    addToast({
      message: `⚠️ ${event.reason}. Switch to GLM?`,
      actions: [
        {
          label: 'Switch to GLM',
          onClick: async () => {
            await modeManagerRef.current.switchToGLM(term, {
              notifyUser: (msg) => term.writeln('\r\n' + msg),
              maxContextLines: 200
            });
            // Schedule auto-switch back...
          }
        },
        { label: `Wait ${cooldown} min`, onClick: () => {...} }
      ]
    });
  }
});

// 4. Header UI
return (
  <div className="terminal-header">
    <SettingsButton />
    <GLMCostDisplay /> {/* Auto-hides if not using GLM */}
  </div>
);
```

---

### Store Architecture

```typescript
// useModelStore.ts (Zustand)
{
  selectedModel: 'claude-sonnet-4-5-20250929',
  setSelectedModel: (model) => set({ selectedModel: model }),
  getModelDisplayName: (model) => {
    if (model === 'glm-4-flash') return 'GLM 4 Flash';
    // ...
  }
}

// useGLMCostStore.ts (Zustand + Persist)
{
  // Session (resets on page load)
  sessionTokens: 0,
  sessionCost: 0,
  
  // Total (persists in localStorage)
  totalTokens: 0,
  totalCost: 0,
  
  // History
  usageHistory: [
    { timestamp: '...', tokens: 400, cost: 0.00004, model: 'glm-4-flash' }
  ],
  
  // Actions
  addUsage: (tokens, model, cost) => {...},
  resetSession: () => {...},
  resetTotal: () => {...}
}
```

---

## 🔌 API Integration

### GLM API Client Architecture

```typescript
// lib/glm-api.ts

class GLMAPIClient {
  private apiKey: string;
  private baseURL = 'https://open.bigmodel.cn/api/paas/v4';
  
  async chat(messages: GLMMessage[], options?: GLMChatOptions) {
    // 1. Build request (OpenAI-compatible format)
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'glm-4-flash',
        messages,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 1,
        stream: options.stream || false
      })
    });
    
    // 2. Parse response
    const data = await response.json();
    
    // 3. Calculate cost
    const costPerToken = this.getCostPerMillionTokens(model) / 1_000_000;
    const calculatedCost = data.usage.total_tokens * costPerToken;
    
    // 4. Return with cost metadata
    return {
      ...data,
      cost: calculatedCost,
      model
    };
  }
  
  private getCostPerMillionTokens(model: string): number {
    const costs = {
      'glm-4-flash': 0.10,
      'glm-4-air': 1.00,
      'glm-4-plus': 50.00
    };
    return costs[model] || 0.10;
  }
}
```

---

## 🎯 Key Design Patterns

### 1. Singleton Refs Pattern
```typescript
// Persist service instances across React renders
const detectorRef = useRef<RateLimitDetector>(new RateLimitDetector());
const managerRef = useRef<TerminalModeManager>(new TerminalModeManager());

// Benefits:
// - State maintained across renders
// - No re-instantiation overhead
// - Clean service lifecycle
```

### 2. Toast Action Buttons
```typescript
// Interactive notifications with async handlers
addToast({
  message: 'Switch to GLM?',
  actions: [
    {
      label: 'Switch to GLM',
      onClick: async () => {
        // Complex async logic here
        await switchMode();
        showSuccessToast();
      },
      style: 'primary'
    }
  ]
});
```

### 3. Context Extraction Reuse
```typescript
// Leverage existing checkpoint utilities
const cleanHistory = filterThinkingAnimations(rawHistory);
const commands = extractClaudeCommands(cleanHistory);

// Benefits:
// - Consistent filtering across features
// - Proven reliability
// - Less code to maintain
```

### 4. Zustand Persistence
```typescript
// Automatic localStorage sync
export const useGLMCostStore = create<GLMCostState>()(
  persist(
    (set, get) => ({
      totalCost: 0,
      addUsage: (tokens, model, cost) => {
        set({ totalCost: get().totalCost + cost });
      }
    }),
    { name: 'glm-cost-tracking', version: 1 }
  )
);

// Benefits:
// - Cross-tab sync via storage events
// - Survives page refreshes
// - Automatic serialization
```

---

## 🔒 Security Considerations

### API Key Storage
```
Environment Variables (.env.local):
├── GLM_API_KEY                     # Server-side only
└── NEXT_PUBLIC_GLM_API_KEY         # Client-side accessible

⚠️ IMPORTANT:
- Never commit .env.local to git
- Use .env.local.example for documentation
- Rotate keys if exposed
- Validate key format before use
```

### Rate Limit Detection Patterns
```typescript
// 8 patterns to catch rate limit errors
[
  /rate limit/i,
  /too many requests/i,
  /429/,
  /quota exceeded/i,
  /throttled/i,
  /retry after/i,
  /overloaded_error/i,
  /capacity/i
]

// Prevents:
// - Unnecessary API calls when rate limited
// - User frustration from silent failures
// - Wasted tokens on doomed requests
```

---

## 📊 Performance Characteristics

### Latency Breakdown
```
Rate Limit Detection:    ~50ms  (8 regex patterns on terminal output)
Context Extraction:      ~100ms (200 lines from xterm buffer)
Mode Switching:          ~300ms (total: detect + extract + update stores)
GLM API Call:            ~1-3s  (network + inference)
Cost Calculation:        <5ms   (simple multiplication)
UI Update:               <50ms  (Zustand propagation + React render)
```

### Memory Usage
```
RateLimitDetector:       ~1KB   (detection history + patterns)
TerminalModeManager:     ~5KB   (preserved context array)
useGLMCostStore:         ~2KB   (usage history + counters)
GLMCostDisplay:          <1KB   (component state)

Total Overhead:          ~10KB  (negligible)
```

### Network Traffic
```
GLM API Request:         ~1-2KB (context + user message)
GLM API Response:        ~2-5KB (completion + usage metadata)
Cost per Request:        $0.0001 (average 400 tokens × $0.10/M)

vs Claude API:
Request Size:            Similar (~1-2KB)
Response Size:           Similar (~2-5KB)  
Cost per Request:        $0.0060 (400 tokens × $15/M)
Savings:                 98.3% per request
```

---

## 🎯 Future Architecture Considerations

### Planned Enhancements
1. **Streaming Responses**: WebSocket for real-time GLM output
2. **Multi-Model Routing**: Automatic model selection based on task
3. **Cost Optimization**: AI-powered cost/quality balancing
4. **Analytics Dashboard**: Usage trends and recommendations
5. **Team Features**: Shared budgets and quota management

### Scalability Path
```
Current:  Single user, client-side cost tracking
         ↓
Phase 1:  Server-side cost aggregation
         ↓
Phase 2:  Team-level usage dashboards
         ↓
Phase 3:  Multi-tenant with quotas
         ↓
Phase 4:  Enterprise with billing integration
```

---

## 📚 Related Documentation

- **[GLM_INDEX.md](./GLM_INDEX.md)** - Complete documentation index
- **[GLM_README.md](./GLM_README.md)** - Quick start and overview
- **[GLM_INTEGRATION_COMPLETE.md](./GLM_INTEGRATION_COMPLETE.md)** - Technical deep dive
- **[GLM_SESSION_SUMMARY.md](./GLM_SESSION_SUMMARY.md)** - Development notes

---

**Architecture Version**: 1.0.0  
**Last Updated**: October 4, 2025
**Status**: ✅ Production Ready
