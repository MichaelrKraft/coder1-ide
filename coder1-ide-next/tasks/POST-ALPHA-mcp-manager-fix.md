# MCP Manager Button Fix - Post-Alpha

**Status**: DEFERRED - Fix after Alpha Launch
**Priority**: Medium
**Created**: 2025-02-02
**Issue**: Clicking MCP Manager button causes UI to freeze

---

## Problem

The MCP Manager button (Boxes icon) next to the microphone in the terminal header causes the entire UI to freeze when clicked.

**Location of hidden button**: `components/terminal/Terminal.tsx` ~line 5553

---

## Root Cause Analysis

The freeze is likely caused by a **render loop** in the MCP hooks:

### 1. Unstable Function References in MCPOverlay

```typescript
// components/MCPManager/MCPOverlay.tsx lines 44-51
useEffect(() => {
  if (isOpen && servers.length === 0) {
    refresh();  // <-- This function reference may be unstable
  }
  if (isOpen && !tokenUsage) {
    analyzeUsage();  // <-- This function reference may be unstable
  }
}, [isOpen, servers.length, tokenUsage, refresh, analyzeUsage]);
```

### 2. Dependency on Entire Store Object

```typescript
// hooks/useMCPManager.ts lines 51-57
const refresh = useCallback(async () => {
  await Promise.all([
    store.fetchServers(),
    store.fetchProfiles(),
    store.analyzeUsage(),
  ]);
}, [store]);  // <-- `store` is the ENTIRE store object, not stable
```

When `store` changes (any state update), `refresh` gets a new reference, which triggers the useEffect again.

### 3. Multiple Hook Subscriptions

Terminal.tsx uses both hooks which may cause cascading re-renders:
```typescript
const { isOpen: isMCPOverlayOpen, toggle: toggleMCPOverlay, close: closeMCPOverlay } = useMCPOverlay();
const { servers: mcpServers } = useMCPServers();
```

---

## Recommended Fixes

### Fix 1: Stabilize Function References

In `hooks/useMCPManager.ts`, don't depend on `store`:

```typescript
// BEFORE (unstable)
const refresh = useCallback(async () => {
  await Promise.all([
    store.fetchServers(),
    store.fetchProfiles(),
    store.analyzeUsage(),
  ]);
}, [store]);

// AFTER (stable)
const fetchServers = useMCPStore(state => state.fetchServers);
const fetchProfiles = useMCPStore(state => state.fetchProfiles);
const analyzeUsage = useMCPStore(state => state.analyzeUsage);

const refresh = useCallback(async () => {
  await Promise.all([
    fetchServers(),
    fetchProfiles(),
    analyzeUsage(),
  ]);
}, [fetchServers, fetchProfiles, analyzeUsage]);
```

### Fix 2: Use Selectors Instead of Entire Store

```typescript
// BEFORE (subscribes to entire store)
const store = useMCPStore();

// AFTER (subscribes to specific slices)
const servers = useMCPStore(state => state.servers);
const isLoading = useMCPStore(state => state.isLoadingServers);
// etc.
```

### Fix 3: Debounce or Guard the Effect

```typescript
useEffect(() => {
  if (isOpen && servers.length === 0 && !isLoadingServers) {
    refresh();
  }
}, [isOpen, servers.length, isLoadingServers]); // Remove function deps
```

---

## Files to Modify

| File | Change |
|------|--------|
| `hooks/useMCPManager.ts` | Fix useCallback dependencies |
| `components/MCPManager/MCPOverlay.tsx` | Fix useEffect dependencies |
| `stores/useMCPStore.ts` | Ensure stable action references |
| `components/terminal/Terminal.tsx` | Uncomment button after fix |

---

## How to Re-Enable

After fixing the render loop, uncomment the button in Terminal.tsx:

```typescript
// Search for: "MCP Manager Button - HIDDEN for alpha"
// Uncomment the <button> element
```

---

## Testing Checklist

- [ ] Click MCP button - overlay opens without freeze
- [ ] Close overlay - no freeze
- [ ] Toggle servers on/off - no freeze
- [ ] Search servers - no freeze
- [ ] Refresh servers - no freeze
- [ ] Check React DevTools for re-render counts
- [ ] No console warnings about infinite loops

---

*Last Updated: 2025-02-02*
