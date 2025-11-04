# TEMPORARY CHANGES FOR LOCAL TESTING

**⚠️ CRITICAL: These changes MUST be reverted before production deployment!**

## File: `/src/utils/database.ts`

**Lines 43-51**: Commented out service table initialization

```typescript
// TEMPORARILY DISABLED (lines 43-51):
// await memoryService.initialize();
// await supervisionService.initialize();
// await trialService.initialize();
```

**Reason**: These services require additional database tables that we haven't created yet. For local billing testing, we only need the `subscriptions` table which already exists.

**Before Production**:
1. Uncomment lines 44-51 in `/src/utils/database.ts`
2. Create the required database tables for:
   - Memory service
   - Supervision service  
   - Trial service
3. Test all services end-to-end

---

**Date**: November 4, 2025
**Purpose**: Alpha launch billing testing
**Must Revert**: Before production deployment
