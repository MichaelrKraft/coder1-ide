# Terminal Lag Testing & Diagnosis Guide

**Created**: November 2, 2025  
**Purpose**: Help diagnose and fix terminal typing lag issues

## Quick Performance Test

1. **Open browser console** (F12)
2. **Navigate to** http://localhost:3001/ide
3. **Open terminal** and type rapidly
4. **Watch console for** these diagnostic messages:

```
⚠️ Slow flush detected: 12.45ms (buffer size: 523 lines)
```

**Expected**: <5ms flush time
**Warning**: >5ms indicates performance degradation
**Critical**: >50ms means serious lag

## Performance Metrics to Monitor

### 1. Flush Performance
```javascript
// Console should show warnings if flush > 5ms
⚠️ Slow flush detected: XYZ ms (buffer size: N lines)
```

**What to check**:
- Does lag increase with buffer size (progressive degradation)?
- Is localStorage save frequency correct (only during 3s+ idle)?

### 2. Buffer Growth
```javascript
// In browser console, type:
const term = document.querySelector('.xterm')
console.log('Buffer lines:', term?.__xtermTerminal?.buffer?.active?.length)
```

**Expected growth**:
- Question 1: ~200 lines
- Question 5: ~1000 lines
- Question 10: ~2000 lines

### 3. Console Log Frequency
- **Production**: Should see minimal console.log output
- **Development**: Logs prefixed with [CLIENT], [PERF], etc.

## Common Issues & Diagnostics

### Issue 1: Progressive Lag (gets worse over time)
**Symptoms**: Smooth at first, laggy after 5+ questions

**Diagnosis**:
```javascript
// Check localStorage save frequency
// Should only see this during 3+ second idle periods
💾 [INCREMENTAL SAVE] Saved XXXX chars to mainTerminalHistory
```

**Fix if broken**: Check line 3121 for `timeSinceLastFlush >= 3000`

---

### Issue 2: Constant Lag (from the start)
**Symptoms**: Every keystroke has 50-100ms+ delay

**Diagnosis**:
1. **Check Network tab** - Are there constant API requests?
2. **Check Console** - Are there 100+ logs per second?
3. **Check Memory** - Is memory usage >1GB?

**Possible causes**:
- SessionMetricsBar polling re-enabled (should be DISABLED)
- Server-side contextual memory re-enabled (should be DISABLED)
- Console logging in production (should use devLog wrapper)

---

### Issue 3: Intermittent Freezes
**Symptoms**: Terminal freezes for 1-3 seconds randomly

**Diagnosis**:
- **Check Network tab** for request storms
- **Profile with React DevTools** for excessive rerenders
- **Check browser console** for JavaScript errors

---

## Performance Benchmarks

### Acceptable Performance
```
Flush time:        <5ms per flush
Keystroke lag:     <10ms perceived
Buffer read:       <100ms for 5000 lines
Memory usage:      <500MB after 20 questions
Console logs:      <10 per second in production
```

### Warning Signs
```
Flush time:        5-20ms (investigate soon)
Keystroke lag:     10-50ms (noticeable)
Buffer read:       100-500ms (slow)
Memory usage:      500MB-1GB (monitor)
Console logs:      10-50 per second (too chatty)
```

### Critical Issues
```
Flush time:        >50ms (FIX IMMEDIATELY)
Keystroke lag:     >100ms (unusable)
Buffer read:       >500ms (broken)
Memory usage:      >1.5GB (memory leak)
Console logs:      >100 per second (blocking event loop)
```

## Testing Checklist

### Before Deployment
- [ ] Flush time <5ms for 1000 line buffer
- [ ] No progressive degradation through 10 questions
- [ ] localStorage saves only during idle (3s+)
- [ ] Rate limit detection skips small chunks (<20 chars)
- [ ] Pattern matching has length guard (>3 chars)
- [ ] MenuBar is memoized (React.memo)
- [ ] SessionMetricsBar polling is DISABLED
- [ ] Server contextual memory triggering is DISABLED
- [ ] Console logs wrapped in devLog() for production

### After Deployment
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Test with 20+ questions in succession
- [ ] Monitor memory usage over 30 minute session
- [ ] Check Network tab for API spam
- [ ] Verify no console errors

## Emergency Rollback

If lag appears after deployment:

```bash
# 1. Check git history
git log --oneline components/terminal/Terminal.tsx -5

# 2. Identify breaking commit
git diff HEAD~1 components/terminal/Terminal.tsx

# 3. Look for these red flags:
# - Removed "timeSinceLastFlush >= 3000"
# - Removed "data.length > 3" guard
# - Re-enabled SessionMetricsBar polling
# - Re-enabled server contextual memory

# 4. Rollback if needed
git checkout HEAD~1 -- components/terminal/Terminal.tsx
git commit -m "Revert: Terminal performance regression"
```

## Performance Optimization Summary

**All February 2025 fixes are in place**:
- ✅ 3-second idle localStorage saves
- ✅ Pattern matching length guards
- ✅ Rate limit detection length guards
- ✅ Dynamic flush delay (0ms for single chars)
- ✅ MenuBar memoization
- ✅ SessionMetricsBar polling disabled
- ✅ Server contextual memory disabled

**New November 2025 optimizations**:
- ✅ Performance diagnostic instrumentation
- ✅ Console log wrappers (devLog/perfLog)
- ✅ Production-safe logging

## Additional Resources

- **Complete Feb 2025 session notes**: `/docs/troubleshooting/TERMINAL_PERFORMANCE_OPTIMIZATION_SESSION_FEB_2025.md`
- **Checkpoint system fixes**: `/CHECKPOINT_FIXES_COMPLETE_SESSION_SUMMARY.md`
- **Connection stability**: `/docs/CONNECTION_STABILITY_FIXES.md`
