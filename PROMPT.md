# Coder1 IDE Clean-Phase1 Refactor

## Objective
Complete the clean-phase1 refactor by removing dead code, consolidating files, and ensuring the codebase builds and tests pass.

## Completion Criteria
Output `<promise>COMPLETE</promise>` when ALL of the following are true:
- [ ] All files in ARCHIVE/ directory are deleted (after verifying no imports reference them)
- [ ] All deleted .md documentation files are removed from git tracking
- [ ] No TypeScript/ESLint errors: `npm run lint` passes
- [ ] Build succeeds: `npm run build` completes without errors
- [ ] All tests pass: `npm test` shows green
- [ ] No orphaned imports (imports pointing to deleted files)

## Phase 1: Verify Safe Deletions (Iterations 1-10)
For each file marked as deleted in git status:
1. Search codebase for imports/references to that file
2. If no references found → safe to delete
3. If references found → update imports or note blocker
4. Run `npm run build` after each batch of 10 deletions

## Phase 2: Fix Broken Imports (Iterations 11-20)
1. Run `npm run build` and capture errors
2. For each "module not found" error:
   - Find the correct new location OR
   - Remove the import if feature was deprecated
3. Repeat until build passes

## Phase 3: Lint & Type Check (Iterations 21-30)
1. Run `npm run lint`
2. Fix each error in order of severity
3. Run `npx tsc --noEmit` for type checking
4. Fix type errors

## Phase 4: Test Validation (Iterations 31-40)
1. Run `npm test`
2. Fix failing tests OR remove tests for deleted features
3. Ensure coverage doesn't drop below 60%

## Escape Hatch
After 40 iterations, if not complete:
- Document remaining blockers in `REFACTOR_BLOCKERS.md`
- List what was successfully cleaned
- Suggest manual intervention needed
- Output `<promise>BLOCKED</promise>`

## Safety Rules
- NEVER delete files in `coder1-ide-next/components/` without explicit verification
- NEVER delete files in `coder1-ide-next/app/` without explicit verification
- ALWAYS run build after deletions to catch breaks early
- If build fails 3 times in a row on same error, stop and document

## Progress Tracking
After each iteration, update `REFACTOR_PROGRESS.md` with:
- Files processed this iteration
- Current build status
- Remaining work estimate
