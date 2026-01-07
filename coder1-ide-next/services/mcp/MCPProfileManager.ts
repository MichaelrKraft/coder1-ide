/**
 * MCP Profile Manager Service
 *
 * Manages MCP server configuration profiles (save, load, apply)
 * Stores profiles in ~/.coder1/mcp-profiles.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type {
  MCPProfile,
  MCPProfilesFile,
  MCPServerWithStatus,
} from '../../shared/types/mcp.types';
import { mcpConfigManager } from './MCPConfigManager';

export class MCPProfileManager {
  private profilesPath: string;
  private coder1Dir: string;

  constructor() {
    const homeDir = os.homedir();
    this.coder1Dir = path.join(homeDir, '.coder1');
    this.profilesPath = path.join(this.coder1Dir, 'mcp-profiles.json');
  }

  /**
   * Ensure the .coder1 directory exists
   */
  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.coder1Dir, { recursive: true });
  }

  /**
   * Read the profiles file
   */
  private async readProfilesFile(): Promise<MCPProfilesFile> {
    try {
      const content = await fs.readFile(this.profilesPath, 'utf-8');
      return JSON.parse(content) as MCPProfilesFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create default profiles file
        const defaultFile: MCPProfilesFile = {
          version: '1.0.0',
          profiles: [],
          activeProfileId: undefined,
        };
        await this.writeProfilesFile(defaultFile);
        return defaultFile;
      }
      throw new Error(`Failed to read profiles: ${(error as Error).message}`);
    }
  }

  /**
   * Write the profiles file
   */
  private async writeProfilesFile(profilesFile: MCPProfilesFile): Promise<void> {
    await this.ensureDirectory();
    const content = JSON.stringify(profilesFile, null, 2);
    await fs.writeFile(this.profilesPath, content, 'utf-8');
  }

  /**
   * List all profiles
   */
  async listProfiles(): Promise<{ profiles: MCPProfile[]; activeProfileId?: string }> {
    const profilesFile = await this.readProfilesFile();
    return {
      profiles: profilesFile.profiles,
      activeProfileId: profilesFile.activeProfileId,
    };
  }

  /**
   * Get a specific profile by ID
   */
  async getProfile(profileId: string): Promise<MCPProfile | null> {
    const profilesFile = await this.readProfilesFile();
    return profilesFile.profiles.find(p => p.id === profileId) || null;
  }

  /**
   * Create a new profile
   */
  async createProfile(options: {
    name: string;
    description?: string;
    servers?: Record<string, boolean>;
    tags?: string[];
  }): Promise<MCPProfile> {
    const profilesFile = await this.readProfilesFile();

    // Check for duplicate name
    if (profilesFile.profiles.some(p => p.name.toLowerCase() === options.name.toLowerCase())) {
      throw new Error(`Profile with name "${options.name}" already exists`);
    }

    // If no servers specified, capture current state
    let servers = options.servers;
    if (!servers) {
      const currentServers = await mcpConfigManager.getServers();
      servers = {};
      for (const server of currentServers) {
        servers[server.name] = true; // Currently enabled servers
      }
    }

    const now = new Date().toISOString();
    const profile: MCPProfile = {
      id: uuidv4(),
      name: options.name,
      description: options.description,
      servers,
      createdAt: now,
      updatedAt: now,
      tags: options.tags || [],
    };

    profilesFile.profiles.push(profile);
    await this.writeProfilesFile(profilesFile);

    return profile;
  }

  /**
   * Update an existing profile
   */
  async updateProfile(
    profileId: string,
    updates: Partial<Pick<MCPProfile, 'name' | 'description' | 'servers' | 'tags'>>
  ): Promise<MCPProfile | null> {
    const profilesFile = await this.readProfilesFile();
    const profileIndex = profilesFile.profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      return null;
    }

    // Check for duplicate name if name is being changed
    if (updates.name) {
      const existingWithName = profilesFile.profiles.find(
        p => p.name.toLowerCase() === updates.name!.toLowerCase() && p.id !== profileId
      );
      if (existingWithName) {
        throw new Error(`Profile with name "${updates.name}" already exists`);
      }
    }

    const profile = profilesFile.profiles[profileIndex];
    const updatedProfile: MCPProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    profilesFile.profiles[profileIndex] = updatedProfile;
    await this.writeProfilesFile(profilesFile);

    return updatedProfile;
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    const profilesFile = await this.readProfilesFile();
    const initialLength = profilesFile.profiles.length;

    profilesFile.profiles = profilesFile.profiles.filter(p => p.id !== profileId);

    if (profilesFile.profiles.length === initialLength) {
      return false;
    }

    // Clear active profile if we're deleting it
    if (profilesFile.activeProfileId === profileId) {
      profilesFile.activeProfileId = undefined;
    }

    await this.writeProfilesFile(profilesFile);
    return true;
  }

  /**
   * Apply a profile to the current configuration
   */
  async applyProfile(profileId: string): Promise<{
    success: boolean;
    changedServers: string[];
    backupId: string;
  }> {
    const profile = await this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Apply the server configuration
    const result = await mcpConfigManager.applyServerSet(profile.servers);

    // Update active profile
    const profilesFile = await this.readProfilesFile();
    profilesFile.activeProfileId = profileId;
    await this.writeProfilesFile(profilesFile);

    return result;
  }

  /**
   * Create default profiles for common use cases
   */
  async createDefaultProfiles(): Promise<MCPProfile[]> {
    const profilesFile = await this.readProfilesFile();

    // Only create defaults if no profiles exist
    if (profilesFile.profiles.length > 0) {
      return profilesFile.profiles;
    }

    const defaultProfiles = [
      {
        name: 'Minimal',
        description: 'Essential servers only - filesystem and git',
        servers: {
          'filesystem': true,
          'git': true,
        },
        tags: ['minimal', 'fast'],
      },
      {
        name: 'Development',
        description: 'Standard development setup - filesystem, git, code intelligence',
        servers: {
          'filesystem': true,
          'git': true,
          'coder1-intelligence': true,
          'context7-mcp': true,
          'sequential-thinking': true,
        },
        tags: ['development', 'coding'],
      },
      {
        name: 'Web Development',
        description: 'Full web development with browser automation',
        servers: {
          'filesystem': true,
          'git': true,
          'browser-use': true,
          'playwright': true,
          'firecrawl': true,
        },
        tags: ['web', 'browser', 'testing'],
      },
      {
        name: 'Full Stack',
        description: 'All available servers enabled',
        servers: {
          'filesystem': true,
          'git': true,
          'browser-use': true,
          'playwright': true,
          'firecrawl': true,
          'coder1-intelligence': true,
          'context7-mcp': true,
          'sequential-thinking': true,
          'reddit': true,
        },
        tags: ['full', 'everything'],
      },
    ];

    const createdProfiles: MCPProfile[] = [];

    for (const profileDef of defaultProfiles) {
      try {
        const profile = await this.createProfile(profileDef);
        createdProfiles.push(profile);
      } catch (error) {
        console.warn(`Failed to create default profile "${profileDef.name}":`, error);
      }
    }

    return createdProfiles;
  }

  /**
   * Calculate match percentage between a profile and current config
   */
  async calculateMatchPercentage(profileId: string): Promise<number> {
    const profile = await this.getProfile(profileId);
    if (!profile) return 0;

    const currentServers = await mcpConfigManager.getServers();
    const currentServerNames = new Set(currentServers.map(s => s.name));

    let matches = 0;
    let total = 0;

    for (const [serverName, shouldBeEnabled] of Object.entries(profile.servers)) {
      total++;
      const isEnabled = currentServerNames.has(serverName);
      if (isEnabled === shouldBeEnabled) {
        matches++;
      }
    }

    return total > 0 ? Math.round((matches / total) * 100) : 0;
  }

  /**
   * Save current configuration as a new profile
   */
  async saveCurrentAsProfile(name: string, description?: string): Promise<MCPProfile> {
    const currentServers = await mcpConfigManager.getServers();
    const servers: Record<string, boolean> = {};

    for (const server of currentServers) {
      servers[server.name] = true;
    }

    return this.createProfile({
      name,
      description,
      servers,
    });
  }

  /**
   * Get the currently active profile
   */
  async getActiveProfile(): Promise<MCPProfile | null> {
    const profilesFile = await this.readProfilesFile();
    if (!profilesFile.activeProfileId) return null;

    return profilesFile.profiles.find(p => p.id === profilesFile.activeProfileId) || null;
  }

  /**
   * Clear active profile (no profile active)
   */
  async clearActiveProfile(): Promise<void> {
    const profilesFile = await this.readProfilesFile();
    profilesFile.activeProfileId = undefined;
    await this.writeProfilesFile(profilesFile);
  }
}

// Export singleton instance
export const mcpProfileManager = new MCPProfileManager();
