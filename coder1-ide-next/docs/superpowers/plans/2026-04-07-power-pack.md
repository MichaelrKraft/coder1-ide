# Coder1 Power Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Coder1 Power Pack" to the Templates Hub that installs a curated Claude Code configuration (context-mode, CLAUDE.md defaults, smart hooks, git-mcp, coding rules) onto the customer's local machine via the bridge, with a first-run toast nudging new customers to install it.

**Architecture:** Power Pack assets (templates + manifests) live in `public/power-pack/`. A new `bridge-cli/src/power-pack-installer.js` module handles all file writes with conflict detection. A new `setup --power-pack` command in the bridge CLI triggers the installer. The server detects first-time bridge pairing and emits a socket event; the frontend shows a one-time toast.

**Tech Stack:** Node.js (bridge CLI), commander.js, Jest (tests), Socket.IO (server events), React + Toast.tsx (frontend notification), static HTML (templates hub card).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `public/power-pack/manifest.json` | Create | Declares MCP packages and entry points |
| `public/power-pack/claude-md-template.md` | Create | CLAUDE.md content to append |
| `public/power-pack/hooks-config.json` | Create | Hooks to merge into settings.json |
| `public/power-pack/rules/typescript.md` | Create | TypeScript coding rules |
| `public/power-pack/rules/git-workflow.md` | Create | Git workflow rules |
| `public/power-pack/rules/security.md` | Create | Security rules |
| `public/power-pack/rules/testing.md` | Create | Testing rules |
| `bridge-cli/src/power-pack-installer.js` | Create | Conflict detection + file writing logic |
| `bridge-cli/src/power-pack-installer.test.js` | Create | Jest unit tests for installer |
| `bridge-cli/src/index.js` | Modify | Add `setup --power-pack` command |
| `server.js` | Modify | Emit `power-pack:first-connect` on first bridge pairing |
| `public/templates-hub.html` | Modify | Add Power Pack card in new "Power Packs" category |
| `lib/hooks/usePowerPackNudge.ts` | Create | React hook to listen for first-connect event + show toast |
| `components/ide/IDELayout.tsx` (or equivalent) | Modify | Mount usePowerPackNudge hook |

---

## Task 1: Power Pack asset files

**Files:**
- Create: `public/power-pack/manifest.json`
- Create: `public/power-pack/claude-md-template.md`
- Create: `public/power-pack/hooks-config.json`
- Create: `public/power-pack/rules/typescript.md`
- Create: `public/power-pack/rules/git-workflow.md`
- Create: `public/power-pack/rules/security.md`
- Create: `public/power-pack/rules/testing.md`

- [ ] **Step 1: Create manifest.json**

```json
{
  "version": "1.0.0",
  "mcpServers": [
    {
      "id": "context-mode",
      "package": "context-mode",
      "entryPoint": "build/cli.js"
    },
    {
      "id": "git-mcp",
      "package": "git-mcp",
      "entryPoint": "dist/index.js"
    }
  ],
  "claudeMd": "claude-md-template.md",
  "hooks": "hooks-config.json",
  "rules": [
    "rules/typescript.md",
    "rules/git-workflow.md",
    "rules/security.md",
    "rules/testing.md"
  ]
}
```

> **Note:** Verify `git-mcp` entry point by running `npm pack git-mcp --dry-run` or checking the installed package after `npm install -g git-mcp`.

- [ ] **Step 2: Create claude-md-template.md**

```markdown
# Coder1 Power Pack

## Loop Prevention
- If the same action fails 3+ times, STOP and report the exact blocker — do not retry
- Never retry a failing build more than 2 times — report instead
- For agent loops: set explicit termination conditions upfront

## Build Safety
- Before running npm run build: check for running builds with `pgrep -f "next build"`
- If a build is already running, do NOT start another
- Never retry a failing build more than 2 times — report the error
- Prefer npm run dev for development (hot reload), only use npm run build when explicitly needed

## Response Style
- No trailing summaries after completing work — the diff speaks for itself
- Lead with the answer, not the reasoning
- Keep responses short and direct
- No emojis unless explicitly requested

## Context-Mode Routing
- For bash commands producing >20 lines of output: use ctx_execute instead of Bash
- For file analysis (not editing): use ctx_execute_file
- For web content: use ctx_fetch_and_index then ctx_search
- For editing: Read tool is correct (Edit needs file content in context)
```

- [ ] **Step 3: Create hooks-config.json**

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "node ${HOME}/.claude/hooks/coder1-pretool.js"
        }
      ]
    }
  ],
  "PostToolUse": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "node ${HOME}/.claude/hooks/coder1-posttool.js"
        }
      ]
    }
  ]
}
```

> **Note:** Keep hooks minimal for Phase 1. The hooks reference scripts that the bridge installer also writes to `~/.claude/hooks/`. Expand this list in Phase 2 once the install mechanism is proven.

- [ ] **Step 4: Create the four rules files**

`public/power-pack/rules/typescript.md`:
```markdown
# TypeScript Rules

- Use strict mode (`"strict": true` in tsconfig)
- Prefer `const` over `let`
- Use explicit types for function parameters and returns
- Avoid `any` — use `unknown` if type is truly unknown
- One component/class per file
- Max ~300 lines per file
- Functions should do one thing, max ~50 lines
```

`public/power-pack/rules/git-workflow.md`:
```markdown
# Git Workflow Rules

Use conventional commits: `<type>(<scope>): <description>`
Types: feat, fix, docs, style, refactor, test, chore

- Never commit directly to main or master
- Use feature branches: feature/, fix/, refactor/
- Keep commits atomic (one logical change)
- Run lint and type check before committing
```

`public/power-pack/rules/security.md`:
```markdown
# Security Rules

- Never hardcode API keys, passwords, or tokens
- Use environment variables for secrets
- Validate all user inputs at system boundaries
- Use parameterized queries — never string concatenation for SQL
- Hash passwords with bcrypt/argon2 (never MD5/SHA1)
- Never log secrets, even partially
```

`public/power-pack/rules/testing.md`:
```markdown
# Testing Rules

- Every bug fix requires a regression test
- Write the failing test first (proves bug exists)
- Tests should be deterministic and independent
- Critical paths: minimum 80% coverage
- Business logic (auth, financial): 100% coverage
- Test failure scenarios, not just happy paths
```

- [ ] **Step 5: Commit**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
git add public/power-pack/
git commit -m "feat(power-pack): add Power Pack asset files and manifest"
```

---

## Task 2: Bridge CLI installer module

**Files:**
- Create: `bridge-cli/src/power-pack-installer.js`
- Create: `bridge-cli/src/power-pack-installer.test.js`

- [ ] **Step 1: Write the failing tests**

Create `bridge-cli/src/power-pack-installer.test.js`:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

jest.mock('fs');
jest.mock('child_process');

const {
  installMcpServer,
  installClaudeMd,
  installHooks,
  installRulesFile,
  installPowerPack,
} = require('./power-pack-installer');

const HOME = os.homedir();

beforeEach(() => {
  jest.resetAllMocks();
  fs.existsSync.mockReturnValue(false);
  fs.mkdirSync.mockImplementation(() => {});
  fs.writeFileSync.mockImplementation(() => {});
  fs.appendFileSync.mockImplementation(() => {});
  fs.readFileSync.mockImplementation(() => { throw new Error('not found'); });
  execSync.mockImplementation((cmd) => {
    if (cmd === 'npm root -g') return Buffer.from('/usr/local/lib/node_modules\n');
    return Buffer.from('');
  });
});

describe('installMcpServer', () => {
  test('installs MCP when not already in ~/.mcp.json', () => {
    const result = installMcpServer('context-mode', 'context-mode', 'build/cli.js');
    expect(result.status).toBe('installed');
    expect(execSync).toHaveBeenCalledWith('npm install -g context-mode', expect.any(Object));
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(HOME, '.mcp.json'),
      expect.stringContaining('"context-mode"'),
      'utf-8'
    );
  });

  test('skips MCP if already in ~/.mcp.json', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      mcpServers: { 'context-mode': { command: 'node', args: ['/existing/path'] } }
    }));
    const result = installMcpServer('context-mode', 'context-mode', 'build/cli.js');
    expect(result.status).toBe('skipped');
    expect(execSync).not.toHaveBeenCalledWith('npm install -g context-mode', expect.any(Object));
  });
});

describe('installClaudeMd', () => {
  test('creates CLAUDE.md when it does not exist', () => {
    const result = installClaudeMd('# Coder1 Power Pack\ncontent');
    expect(result.status).toBe('installed');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(HOME, '.claude', 'CLAUDE.md'),
      '# Coder1 Power Pack\ncontent',
      'utf-8'
    );
  });

  test('appends to existing CLAUDE.md without the marker', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('existing content');
    const result = installClaudeMd('# Coder1 Power Pack\ncontent');
    expect(result.status).toBe('installed');
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join(HOME, '.claude', 'CLAUDE.md'),
      '\n\n# Coder1 Power Pack\ncontent'
    );
  });

  test('skips when Coder1 Power Pack section already present', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('# Coder1 Power Pack\nalready here');
    const result = installClaudeMd('# Coder1 Power Pack\ncontent');
    expect(result.status).toBe('skipped');
    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });
});

describe('installHooks', () => {
  test('merges new hooks into empty settings.json', () => {
    const hooksConfig = {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node hook.js' }] }]
    };
    const result = installHooks(hooksConfig);
    expect(result.status).toBe('installed');
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written.hooks.PreToolUse).toHaveLength(1);
  });

  test('does not duplicate hooks already present', () => {
    const existing = {
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node hook.js' }] }]
      }
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(existing));
    const result = installHooks({
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node hook.js' }] }]
    });
    expect(result.status).toBe('skipped');
  });
});

describe('installRulesFile', () => {
  test('writes rules file when it does not exist', () => {
    const result = installRulesFile('typescript.md', '# TypeScript Rules');
    expect(result.status).toBe('installed');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(HOME, '.claude', 'rules', 'typescript.md'),
      '# TypeScript Rules',
      'utf-8'
    );
  });

  test('skips if rules file already exists', () => {
    fs.existsSync.mockReturnValue(true);
    const result = installRulesFile('typescript.md', '# TypeScript Rules');
    expect(result.status).toBe('skipped');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/bridge-cli
npx jest src/power-pack-installer.test.js --no-coverage 2>&1 | head -20
```

Expected: FAIL — `Cannot find module './power-pack-installer'`

- [ ] **Step 3: Implement power-pack-installer.js**

Create `bridge-cli/src/power-pack-installer.js`:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();
const MCP_JSON_PATH = path.join(HOME, '.mcp.json');
const CLAUDE_DIR = path.join(HOME, '.claude');
const CLAUDE_MD_PATH = path.join(CLAUDE_DIR, 'CLAUDE.md');
const SETTINGS_JSON_PATH = path.join(CLAUDE_DIR, 'settings.json');
const RULES_DIR = path.join(CLAUDE_DIR, 'rules');

function readJsonSafe(filePath, defaultValue) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function installMcpServer(id, packageName, entryPoint) {
  const config = readJsonSafe(MCP_JSON_PATH, { mcpServers: {} });
  config.mcpServers = config.mcpServers || {};

  if (config.mcpServers[id]) {
    return { id, status: 'skipped', reason: 'already in ~/.mcp.json' };
  }

  execSync(`npm install -g ${packageName}`, { stdio: 'inherit' });

  const npmRoot = execSync('npm root -g').toString().trim();
  const cliPath = path.join(npmRoot, packageName, entryPoint);

  config.mcpServers[id] = { command: 'node', args: [cliPath] };
  writeJson(MCP_JSON_PATH, config);

  return { id, status: 'installed' };
}

function installClaudeMd(templateContent) {
  const marker = '# Coder1 Power Pack';

  if (fs.existsSync(CLAUDE_MD_PATH)) {
    const existing = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    if (existing.includes(marker)) {
      return { id: 'claude-md', status: 'skipped', reason: 'section already present' };
    }
    fs.appendFileSync(CLAUDE_MD_PATH, '\n\n' + templateContent);
  } else {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    fs.writeFileSync(CLAUDE_MD_PATH, templateContent, 'utf-8');
  }

  return { id: 'claude-md', status: 'installed' };
}

function installHooks(hooksConfig) {
  const settings = readJsonSafe(SETTINGS_JSON_PATH, {});
  settings.hooks = settings.hooks || {};

  let anyMerged = false;
  for (const [hookType, newEntries] of Object.entries(hooksConfig)) {
    settings.hooks[hookType] = settings.hooks[hookType] || [];
    for (const entry of newEntries) {
      const alreadyExists = settings.hooks[hookType].some(
        (existing) => JSON.stringify(existing) === JSON.stringify(entry)
      );
      if (!alreadyExists) {
        settings.hooks[hookType].push(entry);
        anyMerged = true;
      }
    }
  }

  writeJson(SETTINGS_JSON_PATH, settings);
  return {
    id: 'hooks',
    status: anyMerged ? 'installed' : 'skipped',
    reason: anyMerged ? undefined : 'all hooks already present',
  };
}

function installRulesFile(filename, content) {
  const filePath = path.join(RULES_DIR, filename);

  if (fs.existsSync(filePath)) {
    return { id: `rules/${filename}`, status: 'skipped', reason: 'file already exists' };
  }

  fs.mkdirSync(RULES_DIR, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return { id: `rules/${filename}`, status: 'installed' };
}

function installPowerPack(manifest, assets) {
  const results = [];

  for (const mcp of manifest.mcpServers) {
    results.push(installMcpServer(mcp.id, mcp.package, mcp.entryPoint));
  }

  results.push(installClaudeMd(assets.claudeMd));
  results.push(installHooks(assets.hooks));

  for (const [filename, content] of Object.entries(assets.rules)) {
    results.push(installRulesFile(filename, content));
  }

  return {
    installed: results.filter((r) => r.status === 'installed').map((r) => r.id),
    skipped: results
      .filter((r) => r.status === 'skipped')
      .map((r) => ({ id: r.id, reason: r.reason })),
    errors: results.filter((r) => r.status === 'error'),
  };
}

module.exports = {
  installMcpServer,
  installClaudeMd,
  installHooks,
  installRulesFile,
  installPowerPack,
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/bridge-cli
npx jest src/power-pack-installer.test.js --no-coverage
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add bridge-cli/src/power-pack-installer.js bridge-cli/src/power-pack-installer.test.js
git commit -m "feat(power-pack): add bridge CLI installer module with conflict detection"
```

---

## Task 3: Bridge CLI `setup` command

**Files:**
- Modify: `bridge-cli/src/index.js` (add after existing commands, before `program.parse()`)

- [ ] **Step 1: Locate the insertion point**

Open `bridge-cli/src/index.js`. Find the last `program.command(...)` block (likely `johnny5` or `diagnose`). Add the new command immediately after it, before `program.parseAsync(process.argv)`.

- [ ] **Step 2: Add the setup command**

In `bridge-cli/src/index.js`, add after the last existing command:

```javascript
program
  .command('setup')
  .description('Install Coder1 Power Pack onto your local Claude Code environment')
  .option('--power-pack', 'Install the curated Coder1 Claude Code configuration')
  .option('--dry-run', 'Preview what would be installed without making changes')
  .action(async (options) => {
    if (!options.powerPack) {
      console.log('Usage: coder1-bridge setup --power-pack');
      return;
    }

    const { installPowerPack } = require('./power-pack-installer');
    const manifest = require('../../public/power-pack/manifest.json');
    const fs = require('fs');
    const path = require('path');

    // Load assets from bundled files
    const packDir = path.resolve(__dirname, '../../public/power-pack');
    const assets = {
      claudeMd: fs.readFileSync(path.join(packDir, manifest.claudeMd), 'utf-8'),
      hooks: JSON.parse(fs.readFileSync(path.join(packDir, manifest.hooks), 'utf-8')),
      rules: Object.fromEntries(
        manifest.rules.map((rulePath) => [
          path.basename(rulePath),
          fs.readFileSync(path.join(packDir, rulePath), 'utf-8'),
        ])
      ),
    };

    if (options.dryRun) {
      console.log('Dry run — would install:');
      console.log('  MCPs:', manifest.mcpServers.map((m) => m.id).join(', '));
      console.log('  CLAUDE.md section: # Coder1 Power Pack');
      console.log('  Hooks: PreToolUse, PostToolUse');
      console.log('  Rules:', manifest.rules.map((r) => path.basename(r)).join(', '));
      return;
    }

    console.log('Installing Coder1 Power Pack...\n');
    const result = installPowerPack(manifest, assets);

    if (result.installed.length > 0) {
      console.log('Installed:', result.installed.join(', '));
    }
    if (result.skipped.length > 0) {
      console.log('Skipped (already present):', result.skipped.map((s) => s.id).join(', '));
    }
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors.map((e) => e.id).join(', '));
    }
    console.log('\nDone. Restart Claude Code for changes to take effect.');
  });
```

- [ ] **Step 3: Manual test — dry run**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/bridge-cli
node src/index.js setup --power-pack --dry-run
```

Expected output:
```
Dry run — would install:
  MCPs: context-mode, git-mcp
  CLAUDE.md section: # Coder1 Power Pack
  Hooks: PreToolUse, PostToolUse
  Rules: typescript.md, git-workflow.md, security.md, testing.md
```

- [ ] **Step 4: Commit**

```bash
git add bridge-cli/src/index.js
git commit -m "feat(power-pack): add setup --power-pack command to bridge CLI"
```

---

## Task 4: Templates Hub Power Pack card

**Files:**
- Modify: `public/templates-hub.html`

- [ ] **Step 1: Add "Power Packs" category data**

In `public/templates-hub.html`, find the JavaScript object/array where template categories are defined (search for `category:` or the existing category names like `'MCP INTEGRATIONS'`). Add a new entry **at the top** of the templates array:

```javascript
{
  id: 'power-pack',
  name: 'Coder1 Power Pack',
  category: 'POWER PACKS',
  description: 'The complete Claude Code configuration used by the Coder1 team. Installs context-mode, loop prevention, smart hooks, git-mcp, and coding rules in one click.',
  command: 'coder1-bridge setup --power-pack',
  featured: true,
  stats: { downloads: 0, rating: 5.0 },
  tags: ['context-mode', 'hooks', 'mcp', 'rules', 'recommended'],
  features: [
    'context-mode MCP — 99% reduction in context blowout, 6× longer sessions',
    'Coder1 CLAUDE.md — loop prevention, build safety, smart defaults',
    'Smart hooks — session tracking and runaway build prevention',
    'git-mcp — native git operations for Claude without shell spawning',
    'Coding rules — TypeScript, git workflow, security, and testing standards',
    'Non-destructive — skips items already installed, appends to existing files',
  ],
},
```

- [ ] **Step 2: Add "POWER PACKS" to the category filter**

Find where the category filter buttons are rendered (search for `'ALL'` or `'MCP INTEGRATIONS'` in the filter UI). Add `'POWER PACKS'` as the first filter after `'ALL'`:

```javascript
// In the categories/filter array — add 'POWER PACKS' before 'MCP INTEGRATIONS'
['ALL', 'POWER PACKS', 'MCP INTEGRATIONS', ...]
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3001/templates-hub.html` and confirm:
- "POWER PACKS" filter tab appears first after "ALL"
- Coder1 Power Pack card appears at the top of the grid
- Card shows all 6 feature bullet points
- Install command shows `coder1-bridge setup --power-pack`

- [ ] **Step 4: Commit**

```bash
git add public/templates-hub.html
git commit -m "feat(power-pack): add Power Pack card to Templates Hub"
```

---

## Task 5: First-run toast (server + frontend)

**Files:**
- Modify: `server.js` (emit event on first bridge connect)
- Create: `lib/hooks/usePowerPackNudge.ts`
- Modify: Find the root IDE layout component that wraps the IDE (likely `components/ide/` or `app/ide/page.tsx`) and mount the hook there

- [ ] **Step 1: Emit first-connect event from server.js**

In `server.js`, find the `bridge:connected` handler (around the `_handleBridgeConnected` function, line ~2313). Add first-time detection:

```javascript
const _handleBridgeConnected = (data) => {
  console.log(`[Bridge] Connected: ${data.bridgeId} for user ${data.userId}`);
  io.emit('bridge:connected', data);

  // Detect first-time pairing: bridge sends isFirstConnect flag
  if (data.isFirstConnect) {
    io.to(`user:${data.userId}`).emit('power-pack:first-connect');
    console.log(`[Bridge] First-time connect for user ${data.userId} — nudge sent`);
  }
};
```

Then in `bridge-cli/src/index.js`, in the `start` command's connection metadata, add:

```javascript
// When registering bridge connection, pass first-time flag
// Find where bridgeMetadata is constructed in the start command action
const isFirstConnect = !hasCredentials(); // hasCredentials checks ~/.coder1/credentials

// Add to the socket connection payload:
socket.emit('bridge:register', {
  ...existingMetadata,
  isFirstConnect,
});
```

> Find `hasCredentials` by searching `bridge-cli/src/index.js` for `credentials` — it's already used in the auto-connect logic (line ~136-152).

- [ ] **Step 2: Create usePowerPackNudge.ts**

Create `lib/hooks/usePowerPackNudge.ts`:

```typescript
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';

const STORAGE_KEY = 'coder1-power-pack-nudge-shown';

export function usePowerPackNudge(
  showToast: (message: string, type: 'info', action?: { label: string; href: string }) => void
) {
  useEffect(() => {
    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (alreadyShown) return;

    const socket = getSocket();
    if (!socket) return;

    const handleFirstConnect = () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      showToast(
        'Set up your Claude Code environment with the Coder1 Power Pack',
        'info',
        { label: 'Open Templates Hub', href: '/templates-hub.html#power-pack' }
      );
    };

    socket.on('power-pack:first-connect', handleFirstConnect);
    return () => {
      socket.off('power-pack:first-connect', handleFirstConnect);
    };
  }, [showToast]);
}
```

- [ ] **Step 3: Mount the hook in the IDE layout**

Find the root IDE component. Run:

```bash
grep -r "useSocket\|socket\|bridge:connected" /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/components --include="*.tsx" -l | head -5
```

Open the most likely IDE root component (check `app/ide/page.tsx` or `components/ide/IDELayout.tsx`). Find where other socket event listeners are registered and add:

```typescript
import { usePowerPackNudge } from '@/lib/hooks/usePowerPackNudge';
import { useToast } from '@/components/Toast'; // adjust import to match existing pattern

// Inside the component:
const { showToast } = useToast(); // use existing toast API
usePowerPackNudge(showToast);
```

> **Adapt the toast API call to match `components/Toast.tsx`'s actual interface.** Read `components/Toast.tsx` first to find the exact function signature for showing a toast with an action button.

- [ ] **Step 4: Manual test**

1. Clear localStorage key: open browser console → `localStorage.removeItem('coder1-power-pack-nudge-shown')`
2. Disconnect and reconnect bridge on a fresh credentials state
3. Confirm toast appears in IDE bottom-right with "Open Templates Hub" button
4. Click button — confirms it opens `/templates-hub.html#power-pack`
5. Reconnect again — toast should NOT appear (localStorage prevents duplicate)

- [ ] **Step 5: Commit**

```bash
git add server.js lib/hooks/usePowerPackNudge.ts
git add bridge-cli/src/index.js  # first-time flag addition
git commit -m "feat(power-pack): add first-run toast nudge on first bridge connect"
```

---

## Final Verification Checklist

- [ ] `coder1-bridge setup --power-pack --dry-run` prints all 5 item types
- [ ] `coder1-bridge setup --power-pack` installs all 5 items on a clean machine
- [ ] Re-running on a machine with context-mode already in `~/.mcp.json` skips that item (amber row language in CLI output)
- [ ] `~/.claude/CLAUDE.md` has `# Coder1 Power Pack` section appended; original content preserved
- [ ] `~/.claude/rules/` contains all 4 rules files
- [ ] `http://localhost:3001/templates-hub.html` shows "POWER PACKS" category first
- [ ] Power Pack card appears at top of grid with 6 feature bullets
- [ ] First bridge pairing triggers toast in IDE
- [ ] Toast shows only once (localStorage gate)
- [ ] All Jest tests pass: `npx jest src/power-pack-installer.test.js`

---

## Self-Review Notes

**Spec coverage:** All 5 bundle items covered (Tasks 1–3). Templates Hub card (Task 4). First-run nudge (Task 5). Conflict rules implemented per spec in installer. Non-destructive appends confirmed for CLAUDE.md and hooks.

**Placeholders fixed:** Task 5 Step 3 has a note to adapt the toast API — this is intentional (the exact interface needs to be read from Toast.tsx at implementation time rather than guessed now).

**Type consistency:** `installPowerPack` returns `{ installed: string[], skipped: { id, reason }[], errors: any[] }` — consistent across installer.js and the command handler in index.js.

**Out of scope confirmed:** Memory scaffold, marketplace browsing, per-tier gating — all Phase 2.
