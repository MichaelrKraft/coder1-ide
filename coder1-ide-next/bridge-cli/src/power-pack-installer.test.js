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
  fs.readFileSync.mockImplementation(() => { const e = new Error('not found'); e.code = 'ENOENT'; throw e; });
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
      PreToolUse: [{ matcher: 'Bash', type: 'command', command: 'node hook.js' }]
    };
    const result = installHooks(hooksConfig);
    expect(result.status).toBe('installed');
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written.hooks.PreToolUse).toHaveLength(1);
  });

  test('does not duplicate hooks already present', () => {
    const existing = {
      hooks: {
        PreToolUse: [{ matcher: 'Bash', type: 'command', command: 'node hook.js' }]
      }
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(existing));
    const result = installHooks({
      PreToolUse: [{ matcher: 'Bash', type: 'command', command: 'node hook.js' }]
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

describe('installPowerPack', () => {
  test('returns installed/skipped/errors arrays', () => {
    const manifest = {
      mcpServers: [{ id: 'test-mcp', package: 'test-mcp', entryPoint: 'dist/index.js' }],
    };
    const assets = {
      claudeMd: '# Coder1 Power Pack\ntest',
      hooks: { PreToolUse: [{ matcher: 'Bash', type: 'command', command: 'node test.js' }] },
      rules: { 'typescript.md': '# TypeScript' },
    };
    const result = installPowerPack(manifest, assets);
    expect(result).toHaveProperty('installed');
    expect(result).toHaveProperty('skipped');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.installed)).toBe(true);
  });
});
