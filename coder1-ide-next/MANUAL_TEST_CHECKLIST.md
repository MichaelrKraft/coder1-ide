# Pre-Launch Manual Test Checklist

**Quick 5-minute tests to run before beta launch**

## ✅ Test 1: Form Dropdowns (2 min)

### Agent Dropdown
1. Navigate to http://localhost:3001/ide/agent-hub/tasks
2. Click "New Task"
3. Enter title: "Test dropdown fix"
4. **Select "Builder" from Agent dropdown**
5. Select "Low" from Priority dropdown
6. Click "Create Task"
7. **Verify task shows "Builder" and "Low" priority** (not CEO Agent/Medium)

### Expected Result
✅ Task displays with correct agent and priority

---

## ✅ Test 2: Navigation (1 min)

1. Start at http://localhost:3001/ide/agent-hub/dashboard
2. Click **"Projects"** in sidebar
3. Verify URL changes to `/ide/agent-hub/projects`
4. Click **"Tasks"** in sidebar
5. Verify URL changes to `/ide/agent-hub/tasks`
6. Click **"Agents"** in sidebar
7. Verify URL changes to `/ide/agent-hub/agents`

### Expected Result
✅ All navigation links work - URL changes on each click

---

## ✅ Test 3: Delete Project (1 min)

1. Navigate to http://localhost:3001/ide/agent-hub/projects
2. Click on "Test Project Alpha" (created during testing)
3. Click **"Delete project"** button
4. **Verify confirmation dialog appears**
5. Click "Cancel" → project should remain
6. Click "Delete project" again
7. Click "Confirm" → project should disappear from list

### Expected Result
✅ Confirmation dialog shows
✅ Cancel keeps project
✅ Confirm removes project

---

## ✅ Test 4: Kanban Drag-Drop (1 min)

1. Navigate to http://localhost:3001/ide/agent-hub/tasks
2. Click **"Board view"** button
3. Find a task in "Backlog" column
4. **Drag task to "Todo" column**
5. Verify task moves visually
6. Click **"List view"** button
7. Verify task now appears in TODO section

### Expected Result
✅ Task can be dragged between columns
✅ Status persists when switching views

---

## ✅ Test 5: Task Detail View (30 sec)

1. Navigate to http://localhost:3001/ide/agent-hub/tasks
2. Click **on a task card** (any task)
3. Verify detail panel opens on right side
4. Verify shows:
   - Task title
   - Description
   - Agent name
   - Priority
   - Status
   - Created date

### Expected Result
✅ Task detail panel opens
✅ All task information displays correctly

---

## ✅ Test 6: Dashboard Stats (30 sec)

1. Navigate to http://localhost:3001/ide/agent-hub/dashboard
2. Check "Tasks In Progress" widget
3. **Verify it shows "0 open, 0 in review"** (NOT "null open, null in review")

### Expected Result
✅ No "null" values displayed
✅ Shows "0" when no tasks

---

## 🚀 Launch Checklist

Before announcing beta:

- [ ] Test 1: Dropdowns work ✅
- [ ] Test 2: Navigation works ✅
- [ ] Test 3: Delete confirmation works ✅
- [ ] Test 4: Drag-drop works ✅
- [ ] Test 5: Task details open ✅
- [ ] Test 6: No null displays ✅

**If all 6 pass: LAUNCH READY! 🎉**

**If any fail: Note which one(s) and fix before launch**

---

## Known Non-Critical Issues

These can be addressed during beta:

1. Screenshot timeout (cosmetic - doesn't affect users)
2. Form validation messages (not yet tested)
3. Edge cases (very long names, special chars)
4. Live activity real-time updates (works but untested)
5. Calendar scheduling (untested)

---

**Estimated Total Test Time: 5-6 minutes**
