# Features 1 & 2: Interview + Self-Audit for Johnny5

## Plan

Implement the `/interview` deep-dive conversational interview and `/self-audit` self-improvement audit commands for Johnny5.

### Todo Items

- [x] 1. MODIFY `lib/johnny5-db.ts` — Add `interview_sessions` table creation + `getRecentMessagesAcrossSessions()` function
- [x] 2. CREATE `app/api/johnny5/interview/route.ts` — POST endpoint for multi-turn interview
- [x] 3. CREATE `app/api/johnny5/self-audit/route.ts` — GET endpoint for self-improvement audit
- [x] 4. CREATE `app/api/johnny5/self-audit/apply/route.ts` — POST endpoint to apply audit recommendations
- [x] 5. MODIFY `components/johnny5/chat/ChatTab.tsx` — Add interview/self-audit command handling + UI
- [x] 6. Run TypeScript check to verify no errors (only pre-existing test file errors)

## Review

All 6 items completed. Changes summary:

| File | Change |
|------|--------|
| `lib/johnny5-db.ts` | Added `interview_sessions` table in Step 11 of schema init + `getRecentMessagesAcrossSessions()` function |
| `app/api/johnny5/interview/route.ts` | New POST endpoint: 10-question state machine, Gemini extraction, follow-ups, regex fallback, USER.md writes |
| `app/api/johnny5/self-audit/route.ts` | New GET endpoint: loads messages/summaries/patterns/facts/skills, Gemini reflection, statistics fallback, rate limiting |
| `app/api/johnny5/self-audit/apply/route.ts` | New POST endpoint: applies living file updates and pattern adjustments from audit recommendations |
| `components/johnny5/chat/ChatTab.tsx` | Added interview state, interview interceptor, /interview command, /self-audit command, clear-chat reset |

Edge cases handled:
- Expired/missing sessions -> clean up + error message
- No Gemini API key -> regex fallback for interview, statistics-only for audit
- Empty answers -> skip fact storage
- Answer truncation -> 2000 char limit
- Rate limiting -> 1 audit per hour
- Min data threshold -> 5 messages required for audit
- Gemini timeout -> 30 second limit
- JSON parse failures -> raw text as general recommendation
- Session ownership verification -> user_id check
- Concurrent tabs -> each gets own sessionId
- Follow-up questions -> max 1 per question via Gemini
- Interview completion -> writes to USER.md, saves facts, updates profile

---

# Feature 3: Dynamic Sub-Agents / User-Defined Crew Members

## Plan

Allow users to create custom crew members (agents) through the Skill Creator. These agent-type skills get picked up by the TaskRouter for routing and the CrewExecutor for execution, enabling user-defined specializations alongside the 6 hardcoded crew members.

### Todo Items

- [x] 1. Add `'agent'` to the `trigger` union type in `Johnny5Skill` interface (`types/johnny5.ts`)
- [x] 2. Update `TaskRouter` to load user-defined agent-skills from DB alongside hardcoded specs (`services/johnny5/task-router.ts`)
  - Add caching properties for agent-skills
  - Add `getCrewSpecs()` async method
  - Make `quickClassify()` accept specs parameter
  - Make `classify()` call `getCrewSpecs()`
  - Update `aiClassify()` to accept and use specs parameter
- [x] 3. Update `CrewExecutor.execute()` to handle `skill-agent-*` IDs (`services/johnny5/crew-executor.ts`)
  - Add `loadAgentSkill()` private method
  - Add `skill-agent-*` detection before `CREW_MEMBERS.get()` check
- [x] 4. Update `SkillCreator.tsx` to support agent trigger type (`components/johnny5/skills/SkillCreator.tsx`)
  - Add 'agent' to trigger options
  - Add conditional labels for code/dependencies fields
  - Add default system prompt template for agent type
- [x] 5. Run TypeScript check to verify no errors

## Review

All 5 items completed. Changes:

| File | Change |
|------|--------|
| `types/johnny5.ts` | Added `'agent'` to the `trigger` union type in `Johnny5Skill` |
| `services/johnny5/task-router.ts` | Added `agentSkillsCache`, `agentSkillsCacheTime`, `CACHE_TTL`, `getCrewSpecs()` method; updated `classify()`, `quickClassify()`, `aiClassify()` to accept dynamic specs |
| `services/johnny5/crew-executor.ts` | Added `loadAgentSkill()` method; updated `execute()` to handle `skill-agent-*` IDs before falling back to hardcoded `CREW_MEMBERS` |
| `components/johnny5/skills/SkillCreator.tsx` | Added `Bot` import, `'agent'` trigger option, context-sensitive labels (System Prompt / Routing Keywords), agent-specific validation, default agent template |

Edge cases handled:
- Agent-skill deleted while in-use: TaskRouter cache expires after 60s, CrewExecutor checks `s.enabled` at load time
- Agent-skill disabled: Filtered by `s.enabled` check in both `getCrewSpecs()` and `loadAgentSkill()`
- Keyword collisions: User agents appended AFTER hardcoded specs, so hardcoded win ties in sorting
- Empty keywords: Agent still selectable by AI classification via description
- Too many agents: Cap at 10, warning logged
- No SKILL.md on disk: Falls back to `skill.description` as system prompt
- No metadata.json: Falls back to empty keywords array, relies on AI classification

---

# Feature 4: Morning Brief Memory Integration [COMPLETED]

## Plan

Integrate Johnny5's memory system (extracted facts, learned patterns, living file changes) into the Morning Brief so users see what Johnny5 learned overnight.

### Todo Items

- [x] 1. Add `learnings` and `livingFileChanges` fields to `Johnny5MorningBrief` interface in `types/johnny5.ts`
- [x] 2. Add `getRecentFacts()` and `getRecentPatterns()` functions to `lib/johnny5-db.ts`
- [x] 3. Add `getRecentSnapshots()` function to `lib/living-files.ts`
- [x] 4. Update `morning-brief-generator.ts` to gather memory data and include in brief
- [x] 5. Extend `BriefSection.tsx` with 'learnings' and 'changes' section types
- [x] 6. Add new `BriefSection` components to `MorningBriefTab.tsx`
- [x] 7. Run TypeScript check to verify no errors

## Review

All 7 items completed. Changes:

| File | Change |
|------|--------|
| `types/johnny5.ts` | Added `learnings?` and `livingFileChanges?` optional fields to `Johnny5MorningBrief` |
| `lib/johnny5-db.ts` | Added `getRecentFacts()` and `getRecentPatterns()` functions |
| `lib/living-files.ts` | Added `statSync` import and `getRecentSnapshots()` function |
| `services/johnny5/morning-brief-generator.ts` | Added imports, `userId` param, memory data gathering, new brief fields, summary text |
| `components/johnny5/morning-brief/BriefSection.tsx` | Added `Brain`/`FileText` imports, extended `SectionType`, added switch cases |
| `components/johnny5/morning-brief/MorningBriefTab.tsx` | Added two new `<BriefSection>` components for learnings and changes |

Edge cases handled: old cached briefs (optional fields + `|| []`), empty DB (try/catch), disabled living files (returns `[]`), result caps (5/3/3).

---

# Cross-Feature Integration Review

## Final Verification

All 4 features implemented and verified:

1. **Feature 1 (Interview)**: `/interview` command with 10-question deep-dive, Gemini Flash extraction, dynamic follow-ups, regex fallback, USER.md + profile writes
2. **Feature 2 (Self-Audit)**: `/self-audit` command with 5-source data loading, Gemini reflection, statistics fallback, rate limiting, actionable recommendations with Apply buttons
3. **Feature 3 (Sub-Agents)**: `agent` trigger type in SkillCreator, TaskRouter loads agent-skills with 60s cache, CrewExecutor handles `skill-agent-*` IDs
4. **Feature 4 (Morning Brief)**: Memory integration with facts, patterns, living file snapshots in two new collapsible sections

## Shared File Conflicts

- `types/johnny5.ts`: Agent B added `'agent'` to trigger type, Agent C added `learnings?` and `livingFileChanges?` — different interfaces, no conflict
- `johnny5-db.ts`: Agent A added `interview_sessions` table + `getRecentMessagesAcrossSessions()`, Agent C added `getRecentFacts()` + `getRecentPatterns()` — all additive, no conflict
- `ChatTab.tsx`: Only Agent A modified (interview + self-audit commands)

## TypeScript Verification

`npx tsc --noEmit` passes with 0 new errors. Only pre-existing errors in `__tests__/test-utils/test-helpers.ts` (JSX in .ts file).

## New Files Created

| File | Feature |
|------|---------|
| `app/api/johnny5/interview/route.ts` | 1 |
| `app/api/johnny5/self-audit/route.ts` | 2 |
| `app/api/johnny5/self-audit/apply/route.ts` | 2 |

## Modified Files

| File | Features |
|------|----------|
| `types/johnny5.ts` | 3, 4 |
| `lib/johnny5-db.ts` | 1, 4 |
| `lib/living-files.ts` | 4 |
| `components/johnny5/chat/ChatTab.tsx` | 1, 2 |
| `services/johnny5/task-router.ts` | 3 |
| `services/johnny5/crew-executor.ts` | 3 |
| `components/johnny5/skills/SkillCreator.tsx` | 3 |
| `services/johnny5/morning-brief-generator.ts` | 4 |
| `components/johnny5/morning-brief/BriefSection.tsx` | 4 |
| `components/johnny5/morning-brief/MorningBriefTab.tsx` | 4 |

---

# Feature 5: Morning Brief Socket.IO Notification Badge [COMPLETED]

## Plan

Connect the cron-generated morning briefs to the UI by listening for the `johnny5:morning-brief` Socket.IO event and showing a pulsing notification badge on the Brief tab.

### Todo Items

- [x] 1. Add `hasBriefNotification` prop to `Johnny5TabBar.tsx` interface and destructure it
- [x] 2. Render pulsing cyan badge on `morning-brief` tab (same pattern as security alerts)
- [x] 3. Add `getSocket` import and `hasBriefNotification` state to `Johnny5Panel.tsx`
- [x] 4. Add `useEffect` Socket.IO listener for `johnny5:morning-brief` event
- [x] 5. Clear notification when user switches to the Brief tab
- [x] 6. Pass `hasBriefNotification` prop to `<Johnny5TabBar>`
- [x] 7. Run TypeScript check to verify no errors

## Review

All 7 items completed. Changes:

| File | Change |
|------|--------|
| `components/johnny5/Johnny5TabBar.tsx` | Added `hasBriefNotification?` prop, pulsing cyan badge on `morning-brief` tab |
| `components/johnny5/Johnny5Panel.tsx` | Added `getSocket` import, `hasBriefNotification` state, Socket.IO listener `useEffect`, clear on tab switch, prop pass-through |

Edge cases handled:
- Socket not connected: `getSocket()` failure caught silently, brief tab still works on-demand
- Tab already active: If `activeTab === 'morning-brief'` when event fires, notification is suppressed
- Cleanup: `useEffect` returns cleanup that calls `socket.off()` to prevent memory leaks
- Multiple tabs: Each browser tab gets its own Socket.IO connection, all get notified
