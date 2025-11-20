# Session Summary Template

This template provides the standard structure for comprehensive session summaries.

## Standard Format

```markdown
# 🚀 Session Summary - {Session Type}

## 📊 Session Metrics
- **Session Type**: {bug-fix|feature-dev|refactoring|exploration|general}
- **Duration**: {X hours Y minutes}
- **Files Opened**: {count} files
- **Files Modified**: {count} files {🔴 if unsaved}
- **Terminal Commands**: {count} commands
- **Errors Detected**: {count} errors
- **Breakthroughs**: {count} successes

## 📖 Complete Session Chronicle

### What Was Attempted
{Narrative description of goals}

### Actions Taken
1. {First major action with timestamp/context}
2. {Second major action}
...

### Challenges Encountered
1. **{Challenge Name}**
   - Symptom: {what was observed}
   - Investigation: {what was tried}
   - Resolution: {how it was fixed / current status}

### Progress Made
- ✅ {Achievement 1}
- ✅ {Achievement 2}
- 🚧 {Partial completion 1}

## 🔍 Detailed Problem Analysis

### Problem 1: {Problem Title}
**Initial Symptom**: {what first indicated an issue}

**Debugging Steps**:
1. {First debugging action}
2. {Second debugging action}

**Root Cause**: {what was actually wrong}

**Solutions Attempted**:
- ❌ {Failed solution and why it didn't work}
- ✅ {Successful solution}

**Current Status**: {Resolved | Partially Resolved | Unresolved}

**Lessons Learned**: {key insights}

## 📁 File-by-File Analysis

### {filename.ext} {🔴 UNSAVED | ✅ SAVED}
**Path**: `{full/path/to/file}`  
**Language**: {TypeScript|JavaScript|Python|etc}  
**Status**: {Working|Broken|Needs Testing|Production Ready}

**Changes Made**:
- {Specific change 1}
- {Specific change 2}

**Code Quality**:
- Lines: {count}
- Has TODOs: {Yes/No} {- list them if yes}
- Has FIXMEs: {Yes/No} {- list them if yes}
- Has console.logs: {Yes/No} {- warn if production}
- TypeScript errors: {count}

**Code Preview** (first 30 lines or key sections):
```{language}
{relevant code snippet}
```

**Why These Changes**:
{Explanation of reasoning}

**Dependencies**:
- Requires: {other files/modules this depends on}
- Affects: {what else might break if this changes}

## 💻 Command History & Analysis

### All Commands Executed
```bash
{command 1}
{command 2}
...
{command N}
```

### Command Breakdown
**Total Commands**: {count}

**By Category**:
- Debugging: {count} - {examples}
- Build/Install: {count} - {examples}
- Git Operations: {count} - {examples}
- Testing: {count} - {examples}
- File Operations: {count} - {examples}

**Most Common**: `{command}` ({count} times)

**Command Patterns**:
{Analysis of what the command sequence reveals about the session}

## ⚠️ Errors & Issues Deep Dive

### Error 1: {Error Title}
**Timestamp**: {HH:MM:SS}  
**Source**: {terminal|file|runtime}

**Full Error Message**:
```
{complete error output}
```

**Triggered By**: `{command or action that caused it}`

**Context**:
{What was happening when error occurred}

**Resolution**:
- Status: {Resolved|Unresolved|Workaround Applied}
- Solution: {what fixed it}
- Prevention: {how to avoid in future}

**Related Errors**: {list if part of a cascade}

## ✅ Successes & Breakthroughs

### Success 1: {Achievement Title}
**What Worked**: {description}

**Why It Matters**: {impact}

**How It Was Done**: {approach}

**Can Be Reused**: {Yes/No and how}

## 📊 Current State - Exact Status

### ✅ Fully Working (Tested & Verified)
- {Feature 1} - {what it does}
- {Feature 2} - {what it does}

### 🚧 Partially Working (Needs More Work)
- {Feature X}
  - ✅ Works: {what works}
  - ❌ Doesn't Work: {what's broken}
  - 🤔 Unknown: {what needs testing}

### ❌ Completely Broken
- {Feature Y} - {why it's broken}

### 🔴 CRITICAL: Unsaved Files
{If any files have unsaved changes, list them prominently}
- {filename1} - {description of changes}
- {filename2} - {description of changes}

**BLOCKER**: These files MUST be saved before continuing!

### 🧪 Testing Status
- **Unit Tests**: {passed}/{total}
- **Integration Tests**: {passed}/{total}
- **Manual Testing**: {what was tested}
- **Needs Testing**: {what still needs to be verified}

## 🚨 Unresolved Issues

### Issue 1: {Issue Title}
**Priority**: {High|Medium|Low}  
**Blocking**: {Yes/No}

**Description**: {what's wrong}

**Attempted Solutions**:
- {Solution tried 1} - {why it didn't work}
- {Solution tried 2} - {why it didn't work}

**Possible Next Steps**:
- {Suggestion 1}
- {Suggestion 2}

**Resources**:
- {Link to docs}
- {Related GitHub issue}

## 🎯 Next Agent Handoff

### 🔴 IMMEDIATE ACTIONS (Do These First!)
1. **{Action 1}**
   - Why: {reason this is urgent}
   - How: `{exact command or steps}`
   - Expected: {what should happen}

2. **{Action 2}**
   - Why: {reason}
   - How: `{command}`
   - Expected: {result}

### 📝 Continue Development
**Next Feature to Implement**: {specific feature}

**Files to Modify**:
- `{file1}` - {what to add/change}
- `{file2}` - {what to add/change}

**Implementation Steps**:
1. {Step 1 with specific details}
2. {Step 2 with specific details}

**Expected Outcome**: {what success looks like}

### 🧪 Testing Checklist
Before marking this session complete:
- [ ] {Specific test 1} - Run: `{command}`
- [ ] {Specific test 2} - Verify: {what to check}
- [ ] {Specific test 3} - Expected: {what should work}

### 🐛 Debugging Guidance
**If you encounter**:
- **Error X**: Try `{solution}` because {reason}
- **Issue Y**: Check {file} at line {number}
- **Problem Z**: This is a known issue with {dependency}, workaround: {solution}

**Common Gotchas**:
- {Gotcha 1 and how to avoid}
- {Gotcha 2 and how to avoid}

## 💡 Strategic Recommendations

### Short-term (This Session or Next)
- {Recommendation 1}
- {Recommendation 2}

### Medium-term (Next Few Sessions)
- {Architecture improvement}
- {Technical debt to address}

### Long-term (Project Evolution)
- {Major refactoring opportunity}
- {Scalability consideration}

## 📝 Session Metadata

**Session ID**: session_{timestamp}  
**IDE**: Coder1 v2.0 Next.js IDE  
**Start Time**: {ISO timestamp}  
**End Time**: {ISO timestamp}  
**Total Duration**: {minutes} minutes

**Technologies Used**:
- {Language 1}
- {Framework 1}
- {Library 1}

**Development Pattern**: {sessionType}

**Git State** (if available):
- Branch: {branch name}
- Modified Files: {count}
- Staged Files: {count}
- Untracked Files: {count}

## 📚 Additional Context

**Related Sessions**: {previous session IDs if relevant}

**External Resources Used**:
- {Documentation URL}
- {StackOverflow link}
- {GitHub issue}

**Team Communication**:
{Any notes about decisions made with team members}

---

**Handoff Summary (TL;DR)**:
{One concise paragraph that captures: what was accomplished, what's broken, what's next}

---
*Generated by Coder1 Session Intelligence System*  
*Export Format: Markdown*  
*Generated: {ISO timestamp}*
```

## Usage Notes

### When to Use Each Section
- **Metrics**: Always include
- **Chronicle**: Essential for context
- **File Analysis**: Only modified files
- **Commands**: Last 20-30 commands
- **Errors**: All unique errors
- **Current State**: CRITICAL section
- **Next Steps**: Must be specific

### Customization by Session Type

**Bug Fix**: Emphasize error analysis, testing, resolution status  
**Feature Dev**: Focus on implementation completeness, integration  
**Refactoring**: Highlight code quality improvements  
**Exploration**: Document findings and conclusions

### Token Optimization
This template is designed for ~2,000-2,500 tokens when populated:
- Selective file contents (first 30 lines)
- Recent commands only (20-30)
- Last 500 lines of terminal
- Unique errors only (deduplicated)
