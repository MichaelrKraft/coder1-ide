# CLAUDE.md

This file provides guidance to Claude Code when working with code in this project.

## Project Overview

**Name**: Demo React Application  
**Type**: React + TypeScript web application  
**Purpose**: Example project demonstrating best practices for Coder1 IDE

## Mandatory Development Workflow

**IMPORTANT: Follow these rules for EVERY coding task:**

1. **First think through the problem**, read the codebase for relevant files, and write a plan to `tasks/todo.md`.

2. **The plan should have a list of todo items** that you can check off as you complete them.

3. **Before you begin working, check in with me** and I will verify the plan.

4. **Then, begin working on the todo items**, marking them as complete as you go.

5. **Please every step of the way just give me a high level explanation** of what changes you made.

6. **Make every task and code change you do as simple as possible**. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.

7. **Finally, add a review section** to the `todo.md` file with a summary of the changes you made and any other relevant information.

8. **DO NOT BE LAZY. NEVER BE LAZY.** IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY.

9. **MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE.** THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY.

## Project Structure

```
src/
├── App.tsx                 # Main application component
└── components/
    └── Button.tsx          # Reusable button component
```

## Technology Stack

- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Modern ES6+**: Latest JavaScript features

## Code Conventions

### Naming Conventions
- **Components**: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- **Functions**: camelCase (e.g., `handleClick`, `fetchUserData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_URL`, `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (e.g., `User`, `ButtonProps`)

### File Organization
- One component per file
- Co-locate related files (tests, styles)
- Use index files for clean imports

### TypeScript Guidelines
- Always define prop types with interfaces
- Use type inference when possible
- Avoid `any` type - use `unknown` if needed
- Define return types for functions

### React Best Practices
- Use functional components
- Leverage hooks (useState, useEffect, etc.)
- Keep components small and focused
- Extract reusable logic into custom hooks

## Development Guidelines

### Before Starting Any Task
1. Read the relevant code files
2. Create a plan in `tasks/todo.md`
3. Get approval before proceeding
4. Work incrementally, marking tasks complete as you go

### When Writing Code
- **Simplicity First**: Make the smallest change that works
- **Type Safety**: Use TypeScript types properly
- **Readability**: Code should be self-documenting
- **Testing**: Consider how the code will be tested

### When Fixing Bugs
- Find the root cause, not symptoms
- No temporary workarounds
- Add comments explaining non-obvious fixes
- Test the fix thoroughly

### Code Review Checklist
- [ ] Does it solve the actual problem?
- [ ] Is it the simplest solution possible?
- [ ] Are types properly defined?
- [ ] Is error handling present?
- [ ] Will this be maintainable in 6 months?

## Common Tasks

### Adding a New Component
1. Create file in `src/components/`
2. Define prop types interface
3. Implement component logic
4. Export from component file
5. Update documentation

### Modifying Existing Code
1. Understand current implementation
2. Plan minimal changes needed
3. Preserve existing patterns
4. Test affected functionality
5. Update comments/docs if needed

## Important Notes

### For Claude Code Agents
- **Always check `tasks/todo.md`** before starting work
- **Update the task list** as you progress
- **Ask for clarification** if requirements are unclear
- **Keep changes minimal** - resist the urge to refactor unnecessarily
- **Explain your reasoning** when suggesting approaches

### Project-Specific Rules
- This is a demo project - keep examples simple and educational
- Prioritize readability over cleverness
- Add comments to explain concepts for beginners
- Follow React and TypeScript best practices

## Environment Setup

See `.env.example` for environment variables needed for this project.

## Questions or Issues?

If you encounter any problems or need clarification:
1. Check the README.md for basic information
2. Review the code examples in `src/`
3. Ask specific questions about the task at hand
4. Consult the task list in `tasks/todo.md`

---

**Remember**: The goal is to write simple, maintainable code that follows best practices. When in doubt, choose the simpler approach.

*This is an example CLAUDE.md file demonstrating how to structure project instructions for AI agents.*
