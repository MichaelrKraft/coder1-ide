# Feature 4: Team Onboarding Wizard

## Todo Items

### Phase 4.1 — Type Definitions
- [x] Create `types/onboarding.ts` with all required types

### Phase 4.2 — Default Milestones
- [x] Create `lib/onboarding-milestones.ts` with `getDefaultMilestones(role)`

### Phase 4.3 — API Routes
- [x] Create `app/api/team/[teamId]/onboarding/route.ts` (GET + POST)
- [x] Create `app/api/team/[teamId]/onboarding/milestone/[milestoneId]/route.ts` (PUT)
- [x] Create `app/api/team/[teamId]/onboarding/skip/route.ts` (POST)
- [x] Create `app/api/team/[teamId]/onboarding/admin/route.ts` (GET)

### Phase 4.4 — UI Components
- [x] Create `components/onboarding/OnboardingProgress.tsx`
- [x] Create `components/onboarding/OnboardingRoleSelector.tsx`
- [x] Create `components/onboarding/OnboardingMilestoneList.tsx`
- [x] Create `components/onboarding/OnboardingArchitectureTour.tsx`
- [x] Create `components/onboarding/OnboardingWorkflowStep.tsx`
- [x] Create `components/onboarding/OnboardingChecklist.tsx`
- [x] Create `components/onboarding/OnboardingComplete.tsx`
- [x] Create `components/onboarding/OnboardingAdminPanel.tsx`
- [x] Create `components/onboarding/OnboardingWizard.tsx`
- [x] Create `components/onboarding/index.ts`

### Phase 4.5 — SettingsModal Integration
- [x] Add "Onboarding" tab to `components/SettingsModal.tsx`

### Phase 4.6 — Add wizard to IDE page
- [x] Embed `<OnboardingWizard>` in `app/ide/page.tsx`

### Phase 4.7 — Typecheck
- [x] Run `npx tsc --noEmit` — 0 errors in all new files

## Review

All phases completed. The Team Onboarding Wizard is a full-screen overlay (z-50) that guides
new team members through onboarding steps. Key design points:

- Types in `types/onboarding.ts`, milestones logic in `lib/onboarding-milestones.ts`
- 4 API routes under `/api/team/[teamId]/onboarding/`
- 9 React components + barrel export in `components/onboarding/`
- OnboardingWizard embedded in `app/ide/page.tsx` (not auto-shown, requires isOpen=true)
- SettingsModal gains an "Onboarding" tab (admin only) showing OnboardingAdminPanel
- All files are under 300 lines; 0 TypeScript errors introduced

---

# Morning Brief Setup - Get Users Daily Briefs Every Morning

## Current State Analysis

The morning brief infrastructure is **ALREADY BUILT**. Here's what exists:

### ✅ What's Already Working
1. **UI Components**
   - `components/johnny5/morning-brief/MorningBriefTab.tsx` - Full morning brief UI
   - Brief sections: Built, Research, Trends, Attention, Learnings, Changes
   - Refresh button and history dropdown
   - Socket.IO listener for proactive notifications

2. **API Endpoint**
   - `/api/johnny5/morning-brief/route.ts` - Fetches briefs from generator
   - Supports date parameter for historical briefs

3. **Brief Generator**
   - `services/johnny5/morning-brief-generator.ts` - Generates briefs from real data
   - Aggregates: tasks, sessions, security, usage, facts, patterns, living file changes
   - Includes Content Factory Scout results

4. **Cron Service**
   - `services/johnny5/cron-service.ts` - Full scheduling system
   - Already creates "Daily Morning Brief" job at 7am Mountain Time
   - Already initialized in `server.js`

5. **Server Integration**
   - Cron service starts automatically on server boot
   - Creates default jobs including morning brief
   - Sends to Telegram AND Socket.IO

## What Needs to Be Done

### Issue: Briefs may not be generating/delivering properly

The infrastructure exists but needs verification and potentially fixing:

## Tasks

- [ ] **Verify Cron Service is Running**
  - Check server logs for "Johnny5 Cron Service started"
  - Verify jobs are enabled in `data/johnny5/cron-jobs.json`
  - Confirm "Daily Morning Brief" job exists and is enabled

- [ ] **Test Manual Brief Generation**
  - Click Refresh button in MorningBriefTab
  - Verify data appears in the UI
  - Check browser console for errors

- [ ] **Check Telegram Configuration**
  - Verify environment variables are set:
    - `TELEGRAM_BOT_TOKEN`
    - `TELEGRAM_CHAT_ID` (Mike's personal chat ID)
  - Test delivery with manual API call

- [ ] **Verify Socket.IO Push Notifications**
  - Check if `johnny5:morning-brief` event is emitted
  - Check if `johnny5:chat-push` event is emitted
  - Verify MorningBriefTab receives notifications

- [ ] **Add "Generate Brief Now" Button** (Optional Enhancement)
  - Add admin button to manually trigger brief generation
  - Useful for testing and demo purposes
  - Shows loading state during generation

- [ ] **Multi-User Brief Support** (For Customer Deployment)
  - Generate per-user briefs based on individual activity
  - Store briefs with userId association
  - Filter briefs by authenticated user in API

- [ ] **User Telegram Integration** (For Customer Deployment)
  - Each user configures their own Telegram chat ID
  - Store per-user Telegram preferences in config
  - Allow users to enable/disable Telegram delivery

- [ ] **Onboarding Flow Enhancement**
  - Guide users through Telegram setup during onboarding
  - Show sample brief to demonstrate value
  - Allow users to configure brief time preference (default: 7am)

## Quick Verification Commands

```bash
# 1. Check if server is running
ps aux | grep "node.*server.js"

# 2. Check cron jobs file
cat data/johnny5/cron-jobs.json

# 3. Manually trigger brief via API (should return JSON with brief data)
curl http://localhost:3001/api/johnny5/morning-brief

# 4. Check server logs for cron activity
tail -f logs/server.log | grep -i "cron"
```

## Implementation Phases

### Phase 1: Verify & Fix Current System (TODAY - 30 minutes)
1. Run verification commands above
2. Check if cron jobs are created and enabled
3. Test manual brief generation via UI refresh button
4. Check logs for any errors
5. Fix any blockers preventing brief generation

### Phase 2: Test Telegram Delivery (TODAY - 15 minutes)
1. Verify Mike's Telegram bot token and chat ID are configured
2. Manually trigger brief and verify Telegram message arrives
3. Check timing: does it actually run at 7am?

### Phase 3: Multi-User Support (LATER - 2 hours)
1. Update brief generator to accept userId parameter
2. Modify cron service to create per-user jobs
3. Store per-user Telegram chat IDs in config
4. Update API to filter briefs by authenticated user

### Phase 4: Customer Onboarding (LATER - 1 hour)
1. Add Telegram setup wizard in Settings panel
2. Show sample brief to new users
3. Add brief time preference selector
4. Create onboarding documentation

## Questions to Resolve

1. **User Isolation**: Should each user have their own brief, or is it workspace/team-level?
   - **Current**: System-level (single brief for Mike)
   - **Customer Need**: Per-user briefs

2. **Telegram Delivery**: One bot for all users, or per-user bots?
   - **Recommended**: One bot, per-user chat IDs

3. **Time Preferences**: Should users be able to customize brief time?
   - **Current**: Fixed at 7am Mountain Time
   - **Enhancement**: Let users choose their timezone/time

4. **Brief Content**: Should it include team activity or just individual activity?
   - **Recommended**: Individual activity + option to see team summary

## Review

Once Phase 1 is complete, we'll have:
- ✅ Verified the cron service is running
- ✅ Confirmed briefs are generating with real data
- ✅ Tested manual generation via UI
- ✅ Verified Telegram delivery (if configured)
- ✅ Identified any blockers

Then we can decide whether to:
- **Option A**: Roll this out to alpha testers with manual Telegram setup
- **Option B**: Build multi-user support first, then roll out
- **Option C**: Ship with UI-only briefs first, add Telegram later

---

**Status**: Starting Phase 1 verification
**Next Action**: Check cron service status and test manual brief generation
