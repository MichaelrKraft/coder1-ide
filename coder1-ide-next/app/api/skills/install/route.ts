import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ID aliases for skill IDs that differ from our standard IDs
const SKILL_ID_ALIASES: Record<string, string> = {
  'frontend-engineer-skill': 'frontend-engineer',
};

// Skill definitions with their markdown content
const SKILL_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  content: string;
}> = {
  'git-workflow': {
    name: 'Git Workflow',
    description: 'Master Git workflows for solo and team development with branching, commits, merging, and best practices.',
    content: `# Git Workflow Skill

## When to Use
Invoke this skill when working with Git version control, creating commits, managing branches, or handling merge conflicts.

## Core Principles
1. **Atomic Commits**: Each commit should represent one logical change
2. **Meaningful Messages**: Write clear commit messages explaining "why"
3. **Branch Strategy**: Use feature branches for development
4. **Clean History**: Rebase for linear history when appropriate

## Commit Message Format
\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

Types: feat, fix, docs, style, refactor, test, chore

## Common Workflows
- **Feature**: Create branch → Develop → PR → Merge
- **Hotfix**: Branch from main → Fix → PR → Merge → Tag
- **Release**: Feature freeze → Testing → Tag → Deploy

## Commands
- \`git commit -m "type: description"\` - Atomic commit
- \`git rebase -i HEAD~n\` - Clean up commits
- \`git stash\` - Save work temporarily
- \`git cherry-pick <sha>\` - Apply specific commit
`
  },
  'testing-strategy': {
    name: 'Testing Strategy',
    description: 'Comprehensive testing strategies including unit tests, integration tests, E2E tests, and TDD practices.',
    content: `# Testing Strategy Skill

## When to Use
Invoke this skill when writing tests, designing test architecture, or implementing TDD/BDD practices.

## Test Pyramid
1. **Unit Tests (70%)**: Fast, isolated, test single functions
2. **Integration Tests (20%)**: Test component interactions
3. **E2E Tests (10%)**: Test complete user flows

## TDD Cycle
1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while tests pass

## Best Practices
- Test behavior, not implementation
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Keep tests independent

## Coverage Guidelines
- Aim for 80%+ coverage on critical paths
- Don't chase 100% - focus on meaningful tests
- Cover edge cases and error conditions

## Frameworks
- Jest/Vitest for unit tests
- Playwright/Cypress for E2E
- Testing Library for component tests
`
  },
  'debugging-guide': {
    name: 'Debugging Guide',
    description: 'Systematic debugging techniques for identifying and fixing bugs efficiently.',
    content: `# Debugging Guide Skill

## When to Use
Invoke this skill when encountering bugs, errors, or unexpected behavior.

## Systematic Approach
1. **Reproduce**: Confirm you can trigger the bug consistently
2. **Isolate**: Narrow down where the bug occurs
3. **Identify**: Find the root cause
4. **Fix**: Implement the solution
5. **Verify**: Ensure the fix works and doesn't break anything

## Debugging Techniques
- **Binary Search**: Comment out half the code, find which half has bug
- **Rubber Duck**: Explain the problem out loud
- **Print Debugging**: Add console.log at key points
- **Breakpoints**: Use debugger to step through code
- **Git Bisect**: Find which commit introduced the bug

## Common Bug Patterns
- Off-by-one errors
- Null/undefined references
- Race conditions
- State mutation issues
- Incorrect assumptions

## Tools
- Browser DevTools (Console, Network, Elements)
- Node.js debugger (\`node --inspect\`)
- VS Code debugger
- React DevTools, Redux DevTools
`
  },
  'frontend-engineer': {
    name: 'Frontend Engineer',
    description: 'React, TypeScript, and modern frontend development with component architecture.',
    content: `# Frontend Engineer Skill

## When to Use
Invoke this skill for React components, TypeScript patterns, CSS architecture, and frontend best practices.

## Component Architecture
- **Atoms**: Basic UI elements (Button, Input, Label)
- **Molecules**: Simple groups (FormField, SearchBar)
- **Organisms**: Complex sections (Header, ProductCard)
- **Templates**: Page layouts
- **Pages**: Complete views

## React Patterns
- Custom hooks for reusable logic
- Compound components for flexibility
- Render props for customization
- Context for global state

## TypeScript Best Practices
- Use strict mode
- Define explicit interfaces
- Avoid \`any\` type
- Use discriminated unions
- Leverage type inference

## Performance
- Memoize expensive computations
- Use React.memo for pure components
- Lazy load routes and components
- Optimize images and assets
`
  },
  'error-doctor': {
    name: 'Error Doctor',
    description: 'AI-powered error diagnosis and resolution with pattern recognition.',
    content: `# Error Doctor Skill

## When to Use
Invoke this skill when encountering errors, exceptions, or unexpected behavior that needs diagnosis.

## Error Analysis Process
1. **Read the error message** carefully
2. **Identify the error type** (syntax, runtime, logic)
3. **Check the stack trace** for location
4. **Reproduce minimally** to isolate cause
5. **Research** if unknown pattern
6. **Apply fix** and verify

## Common Error Patterns

### JavaScript/TypeScript
- \`TypeError: Cannot read property\` → Check for null/undefined
- \`ReferenceError\` → Variable not defined
- \`SyntaxError\` → Check for typos, missing brackets

### React
- \`Invalid hook call\` → Hooks must be at top level
- \`Maximum update depth\` → Infinite re-render loop
- \`Key prop\` → Add unique keys to lists

### Node.js
- \`ENOENT\` → File not found
- \`ECONNREFUSED\` → Service not running
- \`MODULE_NOT_FOUND\` → Check imports/dependencies

## Quick Fixes
- Clear node_modules and reinstall
- Check environment variables
- Verify API endpoints
- Review recent changes
`
  },
  'session-summary': {
    name: 'Session Summary',
    description: 'Generate comprehensive development session summaries for handoffs.',
    content: `# Session Summary Skill

## When to Use
Invoke this skill to generate summaries of development sessions for documentation or handoffs.

## Summary Structure
1. **Objectives**: What was planned
2. **Accomplishments**: What was completed
3. **Challenges**: Issues encountered
4. **Next Steps**: Remaining work
5. **Notes**: Important context

## Format Template
\`\`\`markdown
## Session Summary - [Date]

### Objectives
- [ ] Task 1
- [x] Task 2

### Completed
- Implemented feature X
- Fixed bug in component Y
- Refactored module Z

### Challenges
- Challenge 1: How it was resolved
- Challenge 2: Current status

### Next Steps
1. Priority task
2. Secondary task

### Notes
- Important context for next session
- Decisions made and rationale
\`\`\`

## Best Practices
- Be specific about what changed
- Include file paths for reference
- Note any pending decisions
- Link to related PRs/issues
`
  },
  'clean-code-architecture': {
    name: 'Clean Code Architecture Guide',
    description: 'Guides developers in writing maintainable, SOLID-principle code.',
    content: `# Clean Code Architecture Guide

## When to Use
Invoke this skill when designing systems, refactoring code, or reviewing architecture decisions.

## SOLID Principles
- **S**ingle Responsibility: One reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Many specific interfaces > one general
- **D**ependency Inversion: Depend on abstractions

## Clean Code Rules
1. **Meaningful Names**: Variables, functions, classes should reveal intent
2. **Small Functions**: Do one thing, do it well
3. **No Side Effects**: Functions should be predictable
4. **DRY**: Don't Repeat Yourself
5. **YAGNI**: You Aren't Gonna Need It

## Architecture Patterns
- **Layered**: Presentation → Business → Data
- **Hexagonal**: Ports and Adapters
- **Clean Architecture**: Dependencies point inward

## Refactoring Techniques
- Extract Method
- Extract Class
- Replace Conditional with Polymorphism
- Introduce Parameter Object
- Replace Magic Number with Constant
`
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skillId: requestedId, customContent } = body;

    // Resolve alias to standard ID if needed
    const skillId = SKILL_ID_ALIASES[requestedId] || requestedId;

    // Check if it's a predefined skill or custom content
    const skillDef = SKILL_DEFINITIONS[skillId];

    if (!skillDef && !customContent) {
      return NextResponse.json(
        { error: `Unknown skill: ${requestedId}. Provide customContent for custom skills.` },
        { status: 400 }
      );
    }

    // Determine installation path (always global ~/.claude/skills/)
    const skillsDir = path.join(os.homedir(), '.claude', 'skills');

    // Create skills directory if it doesn't exist
    await fs.mkdir(skillsDir, { recursive: true });

    // Determine filename and content
    const filename = `${skillId}.md`;
    const content = customContent || skillDef.content;
    const skillPath = path.join(skillsDir, filename);

    // Check if already installed
    try {
      await fs.access(skillPath);
      return NextResponse.json({
        success: true,
        message: 'Skill already installed',
        alreadyInstalled: true,
        skillId,
        skillPath
      });
    } catch {
      // File doesn't exist, proceed with installation
    }

    // Write the skill file
    await fs.writeFile(skillPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Skill "${skillDef?.name || skillId}" installed successfully`,
      skillId,
      skillPath,
      restartRequired: true
    });

  } catch (error) {
    console.error('Skill installation error:', error);
    return NextResponse.json(
      { error: 'Failed to install skill', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check installation status or list available skills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('skillId');

    if (!skillId) {
      // Return all installable skills
      const skills = Object.entries(SKILL_DEFINITIONS).map(([id, def]) => ({
        id,
        name: def.name,
        description: def.description
      }));

      return NextResponse.json({
        installableSkills: Object.keys(SKILL_DEFINITIONS),
        skills
      });
    }

    // Check installation status for specific skill
    const skillsDir = path.join(os.homedir(), '.claude', 'skills');
    const skillPath = path.join(skillsDir, `${skillId}.md`);

    let installed = false;
    try {
      await fs.access(skillPath);
      installed = true;
    } catch {
      installed = false;
    }

    const skillDef = SKILL_DEFINITIONS[skillId];

    return NextResponse.json({
      skillId,
      installed,
      skillPath,
      name: skillDef?.name,
      description: skillDef?.description
    });

  } catch (error) {
    console.error('Skill status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check skill status', details: String(error) },
      { status: 500 }
    );
  }
}
