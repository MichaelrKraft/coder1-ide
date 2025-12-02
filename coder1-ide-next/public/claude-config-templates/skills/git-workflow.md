# Git Workflow Skill

This skill teaches efficient Git workflows for solo and team development.

## Core Git Workflow

### 1. Starting New Work

**Always start from clean main branch:**
```bash
# Ensure you're on main
git checkout main

# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/user-authentication
```

**Branch Naming Conventions:**
- `feature/` - New features (feature/user-login)
- `fix/` - Bug fixes (fix/login-redirect)
- `refactor/` - Code refactoring (refactor/auth-service)
- `docs/` - Documentation (docs/api-guide)
- `test/` - Adding tests (test/user-service)

### 2. Making Commits

**Write meaningful commit messages:**
```bash
# Good commit messages
git commit -m "feat: Add user authentication with JWT"
git commit -m "fix: Resolve race condition in data fetch"
git commit -m "refactor: Extract validation logic to utility"
git commit -m "docs: Add API documentation for auth endpoints"

# Bad commit messages (avoid these)
git commit -m "changes"
git commit -m "fix"
git commit -m "work in progress"
```

**Commit Message Format (Conventional Commits):**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Example:**
```bash
git commit -m "feat(auth): Add JWT token refresh mechanism

Implements automatic token refresh when token is close to expiration.
Stores refresh token in httpOnly cookie for security.

Closes #123"
```

### 3. Staging Changes Strategically

**Stage related changes together:**
```bash
# Stage specific files
git add src/auth/login.ts src/auth/types.ts

# Stage all files in directory
git add src/auth/

# Stage parts of a file (interactive)
git add -p src/auth/login.ts

# Check what's staged
git status
git diff --staged
```

### 4. Viewing History and Changes

**Useful git log commands:**
```bash
# Pretty one-line log
git log --oneline

# Show last 10 commits
git log -n 10

# See commits by specific author
git log --author="Your Name"

# See commits that changed specific file
git log -- src/auth/login.ts

# Visual branch history
git log --graph --oneline --all

# See what changed in each commit
git log -p
```

**Checking differences:**
```bash
# See unstaged changes
git diff

# See staged changes
git diff --staged

# Compare branches
git diff main..feature/my-feature

# See changes in specific file
git diff src/auth/login.ts
```

### 5. Undoing Changes

**Undo uncommitted changes:**
```bash
# Discard changes in specific file
git checkout -- src/auth/login.ts

# Discard all uncommitted changes (careful!)
git reset --hard HEAD

# Unstage file (keep changes)
git reset HEAD src/auth/login.ts
```

**Undo commits:**
```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged
git reset HEAD~1

# Undo last commit, discard changes (careful!)
git reset --hard HEAD~1

# Undo commit by creating new commit (safe for shared branches)
git revert HEAD
```

**Fix last commit:**
```bash
# Add forgotten file to last commit
git add forgotten-file.ts
git commit --amend --no-edit

# Change last commit message
git commit --amend -m "New commit message"
```

### 6. Working with Branches

**Branch management:**
```bash
# List all branches
git branch -a

# Switch to existing branch
git checkout feature/user-auth

# Create and switch to new branch
git checkout -b feature/new-feature

# Delete local branch
git branch -d feature/old-feature

# Force delete unmerged branch
git branch -D feature/abandoned-feature

# Delete remote branch
git push origin --delete feature/old-feature
```

**Keeping feature branch up to date:**
```bash
# Method 1: Merge (creates merge commit)
git checkout feature/my-feature
git merge main

# Method 2: Rebase (cleaner history, but rewrites commits)
git checkout feature/my-feature
git rebase main

# If conflicts occur during rebase
git rebase --continue  # after resolving conflicts
git rebase --abort     # to cancel rebase
```

### 7. Resolving Merge Conflicts

**When conflicts occur:**
```bash
# 1. See which files have conflicts
git status

# 2. Open conflicted files and look for markers:
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name

# 3. Edit file to resolve conflict
# 4. Stage resolved files
git add resolved-file.ts

# 5. Complete merge or rebase
git merge --continue   # for merge
git rebase --continue  # for rebase
```

### 8. Stashing Work in Progress

**Save work temporarily:**
```bash
# Stash current changes
git stash

# Stash with descriptive message
git stash save "WIP: working on login feature"

# List all stashes
git stash list

# Apply most recent stash (keeps stash)
git stash apply

# Apply and remove most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{1}

# Delete specific stash
git stash drop stash@{0}

# Clear all stashes
git stash clear
```

### 9. Pushing and Pulling

**Push changes:**
```bash
# Push feature branch to remote
git push origin feature/my-feature

# Set upstream and push (first time)
git push -u origin feature/my-feature

# Force push after rebase (careful! only on your branches)
git push --force-with-lease origin feature/my-feature
```

**Pull changes:**
```bash
# Pull latest from current branch
git pull

# Pull with rebase instead of merge
git pull --rebase

# Fetch without merging
git fetch origin
```

### 10. Creating Pull Requests

**Before creating PR:**
```bash
# 1. Ensure branch is up to date with main
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main

# 2. Ensure all tests pass
npm test

# 3. Push to remote
git push origin feature/my-feature

# 4. Create PR on GitHub/GitLab
# 5. Fill in PR template with description and changes
```

## Advanced Workflows

### Interactive Rebase for Clean History

**Squash multiple commits into one:**
```bash
# Rebase last 3 commits interactively
git rebase -i HEAD~3

# In editor, change 'pick' to 'squash' for commits to combine
# Save and close, then edit combined commit message
```

### Cherry-picking Specific Commits

**Apply specific commit from another branch:**
```bash
# Get commit hash from other branch
git log feature/other-branch --oneline

# Cherry-pick specific commit
git cherry-pick abc1234
```

### Bisect to Find Bug

**Binary search for commit that introduced bug:**
```bash
# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark known good commit
git bisect good abc1234

# Git will checkout commits, test each one
git bisect good  # if commit works
git bisect bad   # if commit has bug

# Git will identify problematic commit
git bisect reset  # when done
```

## Best Practices

1. **Commit Often**: Small, focused commits are easier to review and revert
2. **Write Clear Messages**: Future you will thank present you
3. **Keep Branches Short-Lived**: Merge frequently to avoid large conflicts
4. **Review Before Pushing**: Use `git diff --staged` to review changes
5. **Never Rewrite Public History**: Don't rebase or amend commits pushed to shared branches
6. **Pull Before Push**: Always pull latest changes before pushing
7. **Use .gitignore**: Don't commit node_modules, .env, or build artifacts

## Git Aliases for Productivity

Add to `~/.gitconfig`:
```bash
[alias]
  st = status
  co = checkout
  br = branch
  ci = commit
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --graph --oneline --all
  amend = commit --amend --no-edit
```

Usage:
```bash
git st          # instead of git status
git co main     # instead of git checkout main
git visual      # pretty branch visualization
```

## When to Use What

- **Merge**: When you want to preserve full history of parallel work
- **Rebase**: When you want clean, linear history (only on private branches)
- **Squash**: When combining small commits into logical units before merging
- **Stash**: When you need to quickly switch branches without committing
- **Cherry-pick**: When you need specific commit from another branch
- **Revert**: When you need to undo a commit that's already pushed

Remember: Git is a tool for collaboration and history. Make changes that help your team understand what happened and why.
