# Session Summary Generator Skill

## Purpose
Generate comprehensive development session summaries that enable seamless handoffs between human developers and AI coding sessions. The summary should provide complete context for the next agent to continue work without confusion.

## Inputs
- `session.duration` (number): Session length in minutes
- `session.commandHistory` (string[]): All terminal commands executed
- `session.terminalHistory` (string): Complete terminal output
- `session.errors` (object[]): Errors encountered during session
- `project.files` (string[]): Files opened during session
- `project.activeFile` (string): Currently active file
- `custom.context` (object): Additional session context

## Outputs
- `summary` (string): Comprehensive markdown session summary
- `metadata` (object): Session metadata (type, duration, changes)
- `nextSteps` (string[]): Recommended next actions

## Process

### 1. **Analyze Session Type**
Determine the session focus based on terminal commands and file activity:
- **bug-fix**: Contains commands like `test`, `debug`, `fix`
- **feature-dev**: Many files opened, `create`, `add` commands
- **refactoring**: `rename`, `refactor`, `optimize` commands
- **exploration**: `investigate`, `analyze`, `explore` commands
- **general**: Default category

### 2. **Extract Key Information**
Gather critical session data with smart filtering:

**Terminal History** (Tier 3 optimization):
- Load LAST 500 lines only (not all 5000+)
- Extract error patterns: lines containing `error|failed|exception`
- Extract success patterns: lines containing `success|fixed|passed`
- Filter out repetitive status updates

**File Changes**:
- Focus on MODIFIED files only (where `isDirty: true`)
- Ignore read-only files
- Capture first 1500 chars of each modified file (not entire contents)

**Command Analysis**:
- Recent commands only (last 20-30)
- Group by type: debugging, building, testing, git operations
- Identify most common command

**Error Analysis**:
- List unique errors only (deduplicate)
- Match errors to commands that triggered them
- Identify unresolved vs resolved errors

### 3. **Build Comprehensive Summary**
Create structured summary with these sections:

**📊 Session Metrics**
```markdown
- Session Type: {sessionType}
- Duration: {duration} minutes
- Files Opened: {fileCount}
- Files Modified: {modifiedCount} 🔴 UNSAVED
- Commands Executed: {commandCount}
- Errors Detected: {errorCount}
```

**📖 Session Chronicle**
Narrative of what happened, step by step:
- What was the developer trying to achieve?
- What actions were taken?
- What obstacles were encountered?
- What progress was made?

**🔍 Problems & Solutions**
For each problem:
- Symptom that was observed
- Debugging steps taken
- Solution attempted
- Current status (resolved/partial/unresolved)

**📁 File Analysis**
For each modified file:
```markdown
### {filename} {status}
- Path: {path}
- Language: {language}
- Changes: {description}
- Status: SAVED / 🔴 UNSAVED
- Lines: {lineCount}
- Has TODOs: Yes/No
- Has console.logs: Yes/No (warn if production code)
```

**💻 Command History**
```bash
# All commands executed
{recentCommands}

# Command Analysis
- Most common: {command} ({count} times)
- Debugging: {debugCount} commands
- Build/Install: {buildCount} commands
```

**⚠️ Errors & Issues**
List each error with:
- Timestamp
- Error message
- Command that triggered it
- Resolution status

**✅ Successes & Progress**
Document wins:
- What worked
- Breakthroughs achieved
- Features completed
- Tests passing

**📋 Current State**
Be EXTREMELY specific:
- What is 100% working?
- What is partially working?
- What is broken?
- What needs testing?
- **CRITICAL**: List unsaved files (this is a blocker)

**🎯 Next Steps**
Immediate actions for next agent:
```markdown
### IMMEDIATE ACTIONS:
1. {action} - {specific command/file/change}
2. {action} - {specific command/file/change}

### CONTINUE DEVELOPMENT:
- {next task with details}
- {specific files to edit}
- {commands to run}

### TESTING CHECKLIST:
- [ ] {specific test}
- [ ] {what to verify}

### IF ERRORS OCCUR:
- If you see {error X}, try {solution Y}
- Watch out for {common gotcha}
```

### 4. **Apply Session Type Context**
Add specialized sections based on session type:

**Bug Fix Sessions**:
- Root cause analysis
- Test coverage added
- Regression prevention steps

**Feature Development**:
- Implementation completeness
- Integration points
- Documentation needs

**Refactoring Sessions**:
- Code quality improvements
- Performance gains
- Maintainability enhancements

### 5. **Add Metadata**
```json
{
  "sessionId": "session_{timestamp}",
  "sessionType": "{type}",
  "duration": {minutes},
  "filesModified": ["{file1}", "{file2}"],
  "keyDecisions": ["{decision1}"],
  "blockers": ["{blocker1}"],
  "breakthroughs": ["{breakthrough1}"]
}
```

## Validation Rules
- Summary must be ≥ 500 words (comprehensive)
- Must include at least 3 sections
- Must identify unsaved files if any exist
- Must provide specific next steps (not vague)
- Terminal history limited to relevant portions
- File contents limited to modified files

## Best Practices
- **Be Exhaustively Detailed**: Next agent should feel like they were present
- **Focus on Why, Not Just What**: Explain reasoning behind decisions
- **Highlight Blockers**: Make problems visible immediately
- **Provide Exact Commands**: Not "run tests" but "npm run test:unit"
- **Link Files to Changes**: Explain what changed in each file and why

## Common Mistakes to Avoid
- ❌ Loading entire terminal history (use last 500 lines only)
- ❌ Including all files (focus on modified files)
- ❌ Vague next steps ("continue development")
- ❌ Missing unsaved file warnings
- ❌ No error resolution status
- ❌ Forgetting to identify session type

## References Available
- [ref:summary-template.md] - Standard summary format
- [ref:analysis-patterns.md] - Pattern detection helpers
- [ref:export-formats.md] - Output format specifications

## Example Summary Structure
```markdown
# Session Summary - Feature Development

## 📊 Metrics
- Duration: 45 minutes
- Files Modified: 3 🔴 UNSAVED
- Commands: 23 total

## 📖 What Happened
Developer was implementing user authentication...

## 🔍 Problems Encountered
1. **CORS Error** - API calls blocked
   - Tried: Adding headers to fetch()
   - Solution: Updated next.config.js
   - Status: ✅ RESOLVED

## 📁 Files Changed
### auth-service.ts 🔴 UNSAVED
- Added login() and logout() methods
- Implemented JWT token handling
- Status: Working but needs testing

## 💻 Commands
```bash
npm install jsonwebtoken
npm run dev
curl -X POST localhost:3000/api/login
```

## 🎯 Next Steps
### IMMEDIATE:
1. SAVE auth-service.ts (CRITICAL)
2. Add unit tests: `npm run test auth-service`
3. Test login flow manually

### CONTINUE:
- Implement password reset
- Add refresh token logic
```

## Token Optimization Notes
**BEFORE PDA**: 10,700 tokens (full history + all files)
**WITH THIS SKILL**: ~2,400 tokens (targeted data only)
**SAVINGS**: 77.6% reduction

Key optimizations:
- Terminal: Last 500 lines vs all 5000+
- Files: Modified only vs all opened
- Commands: Recent 20-30 vs entire history
- Context: Relevant sections vs everything
