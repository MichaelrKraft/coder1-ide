# Memory System - Alpha Migration Guide

## Overview

The Universal AI Memory Layer has been successfully implemented and tested in the Beta Terminal (`/ide-beta`). This guide explains how to migrate the memory feature to the Alpha Terminal (`/ide`).

## Current Status

✅ **Beta Terminal**: Fully functional memory system
- Memory service module created
- File-based storage implemented  
- Memory UI indicators working
- Context injection operational
- Memory toggle available

✅ **Alpha Terminal**: Unaffected and stable
- No memory features yet
- Original functionality preserved
- Ready for migration when needed

## Migration Steps (30 minutes)

### Step 1: Import Memory Hook (2 mins)

In `/components/terminal/Terminal.tsx`, add:

```typescript
import { useSessionMemory } from '@/hooks/useSessionMemory';
```

### Step 2: Add Memory State (3 mins)

Add to Terminal component state:

```typescript
// Memory system integration
const [memoryEnabled, setMemoryEnabled] = useState(true);
const memory = useSessionMemory({
  enabled: memoryEnabled,
  sessionId: sessionIdRef.current || `alpha_session_${Date.now()}`,
  platform: 'Claude Code',
  autoInject: true
});
```

### Step 3: Add Context Injection (5 mins)

In the command processing logic where Claude commands are handled:

```typescript
// Before sending to Claude API
let contextualPrompt = prompt;
if (memory.isEnabled && memory.isActive) {
  const memoryContext = await memory.getInjectionContext();
  if (memoryContext) {
    contextualPrompt = `${memoryContext}\n\n${prompt}`;
  }
}
```

### Step 4: Track Interactions (5 mins)

After receiving Claude's response:

```typescript
// After getting response from Claude
if (memory.isEnabled && response) {
  await memory.addInteraction(prompt, response, 'command');
}
```

### Step 5: Add UI Indicators (10 mins)

Add memory status in terminal header:

```typescript
{/* Memory Status Indicator */}
{memory.isEnabled && (
  <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded text-xs">
    <Brain className="w-3 h-3 text-blue-400" />
    <span className="text-gray-300">
      Memory: {memory.isActive ? 'Active' : 'Initializing'}
    </span>
    {memory.stats.sessions > 0 && (
      <span className="text-gray-400">
        ({memory.stats.sessions} sessions, {memory.stats.tokens} tokens)
      </span>
    )}
  </div>
)}
```

Add memory toggle button:

```typescript
{/* Memory Toggle */}
<button
  onClick={() => {
    memory.toggleMemory();
    setMemoryEnabled(!memoryEnabled);
  }}
  className={`
    px-3 py-1 rounded flex items-center gap-2 text-xs font-medium
    ${memory.isEnabled 
      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
    }
  `}
>
  <Brain className="w-3 h-3" />
  <span>{memory.isEnabled ? 'Memory On' : 'Memory Off'}</span>
</button>
```

### Step 6: Test & Verify (5 mins)

1. Start the server: `npm run dev`
2. Access Alpha terminal: http://localhost:3001/ide
3. Verify memory indicator appears
4. Test a Claude command
5. Check memory persistence in `/data/memory/sessions/`

## Progressive Rollout Strategy

### Phase 1: Internal Testing (Current)
- Beta Terminal has full memory features
- Alpha Terminal remains unchanged
- Power users test in Beta

### Phase 2: Soft Launch (Next Week)
- Add memory to Alpha with feature flag
- Default: OFF for existing users
- Can enable via settings

### Phase 3: General Availability (2 Weeks)
- Default: ON for all users
- Opt-out available in settings
- Full documentation released

## Key Benefits of This Approach

1. **Zero Risk**: Alpha terminal unchanged until ready
2. **Easy Rollback**: Memory is completely isolated
3. **Progressive Enhancement**: Works even if memory fails
4. **User Control**: Toggle on/off anytime

## Files Changed for Alpha Migration

- `/components/terminal/Terminal.tsx` - Main integration
- No changes to core terminal logic
- No changes to WebSocket handling  
- No changes to PTY management

## Memory Storage Location

```
/data/memory/sessions/
├── 2025-01-29-150000.json  # Session files
├── 2025-01-29-160000.json
└── index.json               # Session index
```

## Performance Impact

- **Memory Usage**: ~5-10MB for 100 sessions
- **CPU Impact**: Negligible (async operations)
- **Network**: 1 API call per 30 seconds (auto-save)
- **Context Injection**: 500-1000 tokens (~0.5% of Claude's limit)

## Troubleshooting

### Memory not saving?
- Check `/data/memory/sessions/` directory exists
- Verify API endpoints are accessible
- Check browser console for errors

### Context not injecting?
- Ensure memory.isEnabled is true
- Check memory.isActive status
- Verify getInjectionContext() returns data

### High token usage?
- Adjust maxContextTokens in SessionMemoryService
- Reduce session history limit
- Implement more aggressive summarization

## Success Metrics

✅ Memory persists across sessions
✅ Context injected into AI commands
✅ UI indicators show correct status
✅ Toggle works without breaking terminal
✅ Alpha terminal functions normally with/without memory

## Next Steps

1. Get user feedback from Beta testing
2. Refine memory summarization algorithm
3. Add search functionality for past sessions
4. Implement cross-platform memory sync
5. Add memory export/import features

---

*Last Updated: January 29, 2025*
*Status: Ready for Alpha Migration*