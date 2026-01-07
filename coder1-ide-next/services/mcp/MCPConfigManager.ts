/**
 * MCP Config Manager Service
 *
 * Handles reading/writing Claude's .claude.json configuration file
 * with backup management and cross-platform path support
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type {
  ClaudeConfig,
  MCPServer,
  MCPServerWithStatus,
  MCPServerCategory,
  MCPBackup,
  MCPBackupsFile,
  KNOWN_MCP_SERVERS,
} from '../../shared/types/mcp.types';

// Re-import constants (can't import from types in Node context easily)
const KNOWN_MCP_SERVERS_DATA: Record<string, { category: MCPServerCategory; description: string; defaultToolCount: number }> = {
  'filesystem': { category: 'filesystem', description: 'File system operations', defaultToolCount: 12 },
  'git': { category: 'code', description: 'Git version control', defaultToolCount: 15 },
  'browser-use': { category: 'web', description: 'Browser automation', defaultToolCount: 20 },
  'firecrawl': { category: 'web', description: 'Web scraping', defaultToolCount: 8 },
  'coder1-intelligence': { category: 'ai', description: 'Repository analysis', defaultToolCount: 10 },
  'sequential-thinking': { category: 'ai', description: 'Step-by-step reasoning', defaultToolCount: 1 },
  'context7-mcp': { category: 'code', description: 'Library documentation', defaultToolCount: 2 },
  'playwright': { category: 'web', description: 'Browser testing', defaultToolCount: 25 },
  'reddit': { category: 'web', description: 'Reddit content', defaultToolCount: 2 },
  'filesystem-mcp': { category: 'filesystem', description: 'File system MCP', defaultToolCount: 12 },
  'claude-in-chrome': { category: 'web', description: 'Chrome automation', defaultToolCount: 30 },
};

export class MCPConfigManager {
  private configPath: string;
  private backupDir: string;
  private coder1Dir: string;
  private maxBackups: number = 10;

  constructor() {
    const homeDir = os.homedir();
    this.configPath = path.join(homeDir, '.claude.json');
    this.backupDir = path.join(homeDir, '.claude', 'coder1-backups');
    this.coder1Dir = path.join(homeDir, '.coder1');
  }

  /**
   * Get the config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
    await fs.mkdir(this.coder1Dir, { recursive: true });
  }

  /**
   * Read the Claude config file
   */
  async readConfig(): Promise<ClaudeConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content) as ClaudeConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist, return empty config
        return { mcpServers: {} };
      }
      throw new Error(`Failed to read Claude config: ${(error as Error).message}`);
    }
  }

  /**
   * Write the Claude config file (with backup)
   */
  async writeConfig(config: ClaudeConfig, reason: string = 'Manual update'): Promise<string> {
    await this.ensureDirectories();

    // Create backup first
    const backupId = await this.createBackup(reason);

    // Write new config
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(this.configPath, content, 'utf-8');

    return backupId;
  }

  /**
   * Get list of MCP servers from config with status info
   */
  async getServers(): Promise<MCPServerWithStatus[]> {
    const config = await this.readConfig();
    const mcpServers = config.mcpServers || {};

    const servers: MCPServerWithStatus[] = [];

    for (const [name, serverConfig] of Object.entries(mcpServers)) {
      const knownServer = KNOWN_MCP_SERVERS_DATA[name];

      servers.push({
        name,
        enabled: true, // If it's in config, it's enabled
        category: knownServer?.category || 'custom',
        config: serverConfig,
        toolCount: knownServer?.defaultToolCount,
        description: knownServer?.description,
        status: 'unknown', // Will be updated by health check
      });
    }

    return servers;
  }

  /**
   * Toggle a server's enabled state
   */
  async toggleServer(serverName: string, enabled: boolean): Promise<{ success: boolean; backupId?: string }> {
    const config = await this.readConfig();

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    if (enabled) {
      // Re-enable server - need to get config from backup or known defaults
      const backup = await this.getLatestBackupWithServer(serverName);
      if (backup?.configSnapshot.mcpServers?.[serverName]) {
        config.mcpServers[serverName] = backup.configSnapshot.mcpServers[serverName];
      } else {
        // Can't enable a server we don't have config for
        return { success: false };
      }
    } else {
      // Disable server - remove from config
      if (config.mcpServers[serverName]) {
        delete config.mcpServers[serverName];
      }
    }

    const backupId = await this.writeConfig(
      config,
      `${enabled ? 'Enabled' : 'Disabled'} MCP server: ${serverName}`
    );

    return { success: true, backupId };
  }

  /**
   * Apply a profile (set of enabled servers)
   */
  async applyServerSet(servers: Record<string, boolean>): Promise<{ success: boolean; backupId: string; changedServers: string[] }> {
    const config = await this.readConfig();
    const currentServers = new Set(Object.keys(config.mcpServers || {}));
    const changedServers: string[] = [];

    // Start fresh
    const newMcpServers: ClaudeConfig['mcpServers'] = {};

    for (const [serverName, shouldBeEnabled] of Object.entries(servers)) {
      const isCurrentlyEnabled = currentServers.has(serverName);

      if (shouldBeEnabled) {
        // Need to enable this server
        if (isCurrentlyEnabled) {
          // Keep existing config
          newMcpServers![serverName] = config.mcpServers![serverName];
        } else {
          // Try to get from backup
          const backup = await this.getLatestBackupWithServer(serverName);
          if (backup?.configSnapshot.mcpServers?.[serverName]) {
            newMcpServers![serverName] = backup.configSnapshot.mcpServers[serverName];
            changedServers.push(serverName);
          }
        }
      } else {
        // Server should be disabled
        if (isCurrentlyEnabled) {
          changedServers.push(serverName);
        }
      }
    }

    config.mcpServers = newMcpServers;
    const backupId = await this.writeConfig(config, 'Applied MCP profile');

    return { success: true, backupId, changedServers };
  }

  /**
   * Create a backup of the current config
   */
  async createBackup(reason: string): Promise<string> {
    await this.ensureDirectories();

    const backupId = uuidv4();
    const config = await this.readConfig();

    const backup: MCPBackup = {
      id: backupId,
      timestamp: new Date().toISOString(),
      configSnapshot: config,
      reason,
      autoCreated: true,
    };

    // Read existing backups
    const backupsFile = await this.readBackupsFile();
    backupsFile.backups.unshift(backup);

    // Keep only maxBackups
    if (backupsFile.backups.length > this.maxBackups) {
      backupsFile.backups = backupsFile.backups.slice(0, this.maxBackups);
    }

    await this.writeBackupsFile(backupsFile);

    return backupId;
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupId: string): Promise<boolean> {
    const backupsFile = await this.readBackupsFile();
    const backup = backupsFile.backups.find(b => b.id === backupId);

    if (!backup) {
      return false;
    }

    // Create a backup of current state first
    await this.createBackup('Pre-restore backup');

    // Write the restored config
    const content = JSON.stringify(backup.configSnapshot, null, 2);
    await fs.writeFile(this.configPath, content, 'utf-8');

    return true;
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<MCPBackup[]> {
    const backupsFile = await this.readBackupsFile();
    return backupsFile.backups;
  }

  /**
   * Get latest backup that contains a specific server config
   */
  private async getLatestBackupWithServer(serverName: string): Promise<MCPBackup | null> {
    const backupsFile = await this.readBackupsFile();

    for (const backup of backupsFile.backups) {
      if (backup.configSnapshot.mcpServers?.[serverName]) {
        return backup;
      }
    }

    return null;
  }

  /**
   * Read the backups index file
   */
  private async readBackupsFile(): Promise<MCPBackupsFile> {
    const backupsPath = path.join(this.backupDir, 'backups.json');

    try {
      const content = await fs.readFile(backupsPath, 'utf-8');
      return JSON.parse(content) as MCPBackupsFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          version: '1.0.0',
          backups: [],
          maxBackups: this.maxBackups,
        };
      }
      throw error;
    }
  }

  /**
   * Write the backups index file
   */
  private async writeBackupsFile(backupsFile: MCPBackupsFile): Promise<void> {
    await this.ensureDirectories();
    const backupsPath = path.join(this.backupDir, 'backups.json');
    const content = JSON.stringify(backupsFile, null, 2);
    await fs.writeFile(backupsPath, content, 'utf-8');
  }

  /**
   * Get all known server names (from config + known servers)
   */
  async getAllKnownServers(): Promise<string[]> {
    const config = await this.readConfig();
    const configServers = Object.keys(config.mcpServers || {});
    const knownServers = Object.keys(KNOWN_MCP_SERVERS_DATA);

    // Get servers from backups too
    const backupsFile = await this.readBackupsFile();
    const backupServers = new Set<string>();
    for (const backup of backupsFile.backups) {
      for (const serverName of Object.keys(backup.configSnapshot.mcpServers || {})) {
        backupServers.add(serverName);
      }
    }

    return [...new Set([...configServers, ...knownServers, ...backupServers])];
  }

  /**
   * Check if a server is currently enabled
   */
  async isServerEnabled(serverName: string): Promise<boolean> {
    const config = await this.readConfig();
    return !!config.mcpServers?.[serverName];
  }

  /**
   * Get server info for a specific server
   */
  getKnownServerInfo(serverName: string): { category: MCPServerCategory; description: string; defaultToolCount: number } | null {
    return KNOWN_MCP_SERVERS_DATA[serverName] || null;
  }
}

// Export singleton instance
export const mcpConfigManager = new MCPConfigManager();
