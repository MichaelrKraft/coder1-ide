# Sprint 1, Wave 2: Memory Status Indicator + Persist Chat Messages

## Plan

### Task 1: Create `/api/johnny5/messages/route.ts`
- [ ] Create new API route file at `app/api/johnny5/messages/route.ts`
- [ ] Handle GET with optional `sessionId` query param
- [ ] If no sessionId, fetch most recent active session
- [ ] Call `getMessages(sessionId, 500)` and return results
- [ ] Wrap in try/catch with 500 error handling

### Task 2: Add state variables to ChatTab
- [ ] Add `memoryStatus` state (type: 'full' | 'partial' | 'minimal' | 'none' | null)
- [ ] Add `memoryBannerDismissed` state (boolean)
- [ ] Add `sessionId` state (string | null)

### Task 3: Add useEffect to load persisted messages on mount
- [ ] Fetch from `/api/johnny5/messages` on component mount
- [ ] Map DB messages to ChatMessage format
- [ ] Set messages and sessionId from response

### Task 4: Read memoryStatus from API response in handleSend
- [ ] After quota check, read `data.data?.memoryStatus`
- [ ] Update memoryStatus state
- [ ] Track sessionId from response

### Task 5: Add memory status banner JSX
- [ ] Add banner after Limited Mode Warning, before Messages Area
- [ ] Show only when memoryStatus is not 'full' and not dismissed
- [ ] Color-coded: red for 'none', yellow for 'minimal', blue for 'partial'
- [ ] Dismissible with x button

### Task 6: Update handleClearChat to reset memory states
- [ ] Reset memoryBannerDismissed, memoryStatus, sessionId

### Task 7: Run TypeScript check
- [ ] `npx tsc --noEmit` to verify no type errors

### Task 8: Update todo.md
- [ ] Check off Task 1.2 sub-items
- [ ] Check off Task 1.6
- [ ] Add review section for Sprint 1 Wave 2
