# Claude Code Command Development Guide

## Purpose

Commands are Markdown files containing instructions for Claude, not users. They enable reusable workflows across projects. Write directives telling Claude what to do, not messages describing what will happen to users.

## When to Use This Skill

- Creating reusable slash commands for Claude Code
- Building project-specific or personal workflows
- Setting up argument-driven automation
- Configuring tool restrictions for safety
- Organizing commands for large projects

---

## Quick Reference

| Location | Scope | Path |
|----------|-------|------|
| Project | Team-shared, project-specific | `.claude/commands/` |
| Personal | All your projects | `~/.claude/commands/` |
| Plugin | Bundled with plugin | `plugin-name/commands/` |

---

## File Format & Structure

Commands use Markdown with optional YAML frontmatter:

```markdown
---
description: Brief action description
allowed-tools: Read, Write, Bash(git:*)
model: sonnet
argument-hint: [param1] [param2]
---

Instruction text for Claude...
```

---

## Frontmatter Fields

| Field | Purpose | Example |
|-------|---------|---------|
| `description` | Shown in `/help` (under 60 chars) | `"Review PR for issues"` |
| `allowed-tools` | Restricts tool access | `Read, Write, Bash(git:*)` |
| `model` | Specify model to use | `haiku`, `sonnet`, `opus` |
| `argument-hint` | Documents expected params | `[issue-number] [priority]` |

### Tool Restriction Patterns

```yaml
# Allow specific tools
allowed-tools: Read, Write, Edit

# Allow bash with pattern
allowed-tools: Bash(git:*), Bash(npm:*)

# Allow all bash (dangerous)
allowed-tools: Bash(*)
```

---

## Dynamic Arguments

### Single Argument Capture

Use `$ARGUMENTS` for all arguments as one string:

```markdown
---
description: Fix GitHub issue
argument-hint: [issue-number]
---

Fix issue #$ARGUMENTS following our coding standards.
```

**Usage**: `/fix-issue 123` → "Fix issue #123..."

### Positional Arguments

Access individual arguments via `$1`, `$2`, `$3`:

```markdown
---
description: Review PR with priority
argument-hint: [pr-number] [priority] [assignee]
---

Review PR #$1 with priority level $2.
Assign findings to $3 for follow-up.
```

**Usage**: `/review-pr 123 high alice`

---

## File References

Include file contents using `@` syntax:

```markdown
Review @$1 for quality issues.
Compare @src/old.js with @src/new.js.
Check configuration in @config/settings.json.
```

The `@` prefix loads the file content into context.

---

## Bash Execution

Execute bash commands inline with `!` and backticks:

```markdown
Files changed in this PR:
!`git diff --name-only HEAD~1`

Current branch: !`git branch --show-current`
```

---

## Organization Strategies

### Flat Structure (5-15 commands)

```
.claude/commands/
├── review-pr.md
├── fix-issue.md
├── deploy.md
└── test-all.md
```

### Namespaced Structure (15+ commands)

```
.claude/commands/
├── ci/
│   ├── build.md      → /build (project:ci)
│   └── deploy.md     → /deploy (project:ci)
├── git/
│   ├── pr.md         → /pr (project:git)
│   └── review.md     → /review (project:git)
└── test/
    └── run.md        → /run (project:test)
```

---

## Best Practices

### Design Principles

1. **Single responsibility**: One clear purpose per command
2. **Clear descriptions**: Actionable, under 60 characters
3. **Explicit tool restrictions**: Use `allowed-tools` for safety
4. **Document arguments**: Always include `argument-hint`
5. **Consistent naming**: Use verb-noun pattern (review-pr, fix-issue)

### Safety & Performance

1. **Limit bash scope**: Use `Bash(git:*)` not `Bash(*)`
2. **Avoid destructive operations** without confirmation
3. **Keep command invocation fast**
4. **Handle potential failures** gracefully

---

## Common Workflow Patterns

### Review Pattern

```markdown
---
description: Review code changes
allowed-tools: Read, Bash(git:*)
argument-hint: [file-or-branch]
---

Analyze changes in $1:
1. Run !`git diff $1`
2. Review each changed file
3. Provide specific feedback with line numbers
4. Suggest improvements
```

### Testing Pattern

```markdown
---
description: Run and analyze tests
allowed-tools: Read, Bash(npm:*, jest:*)
argument-hint: [test-pattern]
---

Execute tests matching $1:
1. Run !`npm test -- $1`
2. Analyze any failures
3. Suggest fixes for failing tests
```

### Documentation Pattern

```markdown
---
description: Generate documentation
allowed-tools: Read, Write
argument-hint: [source-file]
---

Document @$1:
1. Analyze the code structure
2. Generate JSDoc/TSDoc comments
3. Create usage examples
```

---

## Example Complete Command

```markdown
---
description: Create PR with AI-generated description
allowed-tools: Read, Bash(git:*, gh:*)
model: sonnet
argument-hint: [base-branch]
---

Create a pull request against $1:

1. Get current branch: !`git branch --show-current`
2. List commits: !`git log $1..HEAD --oneline`
3. Show diff summary: !`git diff $1 --stat`

Based on the changes:
- Write a clear PR title (imperative mood)
- Generate a description with:
  - Summary of changes
  - Testing notes
  - Breaking changes (if any)

Create the PR:
!`gh pr create --base $1 --title "[generated-title]" --body "[generated-body]"`
```

---

## Best Practices Summary

1. **Write for Claude**: Instructions, not user documentation
2. **Use frontmatter**: Description, allowed-tools, argument-hint
3. **Restrict tools**: Limit to necessary operations only
4. **Handle arguments**: Validate and document expected inputs
5. **Include examples**: Show expected usage patterns
6. **Test thoroughly**: Verify with various inputs
7. **Organize logically**: Use namespaces for large collections
