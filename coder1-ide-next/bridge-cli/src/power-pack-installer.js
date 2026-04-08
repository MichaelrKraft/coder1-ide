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
  } catch (e) {
    if (e.code === 'ENOENT') return defaultValue;
    throw new Error(`${filePath} contains invalid JSON: ${e.message}`);
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function installMcpServer(id, packageName, entryPoint) {
  try {
    if (!/^[@a-z0-9][a-z0-9@/._-]*$/i.test(packageName)) {
      return { id, status: 'error', reason: `Invalid package name: ${packageName}` };
    }

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
  } catch (e) {
    return { id, status: 'error', reason: e.message };
  }
}

function installClaudeMd(templateContent) {
  try {
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
  } catch (e) {
    return { id: 'claude-md', status: 'error', reason: e.message };
  }
}

function installHooks(hooksConfig) {
  try {
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
  } catch (e) {
    return { id: 'hooks', status: 'error', reason: e.message };
  }
}

function installRulesFile(filename, content) {
  try {
    const filePath = path.join(RULES_DIR, filename);

    if (fs.existsSync(filePath)) {
      return { id: `rules/${filename}`, status: 'skipped', reason: 'file already exists' };
    }

    fs.mkdirSync(RULES_DIR, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return { id: `rules/${filename}`, status: 'installed' };
  } catch (e) {
    return { id: `rules/${filename}`, status: 'error', reason: e.message };
  }
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
