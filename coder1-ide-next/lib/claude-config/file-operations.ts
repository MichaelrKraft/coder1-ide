/**
 * File Operations Service
 * Handles CRUD operations for .claude/ directory configs
 */

import { 
  ClaudeConfig, 
  ConfigType, 
  ConfigLocation,
  FileOperation,
  FileOperationResult,
  ClaudeDirectory,
  FileOperationError
} from './types';
import { configParser } from './config-parser';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export class FileOperations {
  private static instance: FileOperations;
  
  private constructor() {}

  public static getInstance(): FileOperations {
    if (!FileOperations.instance) {
      FileOperations.instance = new FileOperations();
    }
    return FileOperations.instance;
  }

  /**
   * Get .claude directory paths
   */
  public async getClaudeDirectories(): Promise<ClaudeDirectory> {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    const cwd = process.cwd();

    const localPath = path.join(cwd, '.claude');
    const globalPath = path.join(homeDir, '.claude');

    return {
      local: localPath,
      global: globalPath,
      exists: {
        local: existsSync(localPath),
        global: existsSync(globalPath)
      }
    };
  }

  /**
   * Ensure .claude directory exists
   */
  public async ensureClaudeDirectory(location: ConfigLocation): Promise<string> {
    const directories = await this.getClaudeDirectories();
    const targetDir = location === 'local' ? directories.local : directories.global;

    try {
      if (!existsSync(targetDir)) {
        await fs.mkdir(targetDir, { recursive: true });
        console.log(`Created .claude directory at: ${targetDir}`);
      }

      const subdirs = ['agents', 'hooks', 'skills', 'commands', 'backups'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(targetDir, subdir);
        if (!existsSync(subdirPath)) {
          await fs.mkdir(subdirPath, { recursive: true });
        }
      }

      return targetDir;
    } catch (error) {
      throw new FileOperationError(
        `Failed to create .claude directory at ${targetDir}`,
        { error, location }
      );
    }
  }

  /**
   * Get config file path
   */
  private getConfigFilePath(
    name: string, 
    type: ConfigType, 
    location: ConfigLocation
  ): string {
    const directories = location === 'local' 
      ? path.join(process.cwd(), '.claude')
      : path.join(process.env.HOME || '~', '.claude');

    const typeDir = type === 'agent' ? 'agents' 
      : type === 'hook' ? 'hooks'
      : type === 'skill' ? 'skills'
      : 'commands';

    const extension = type === 'hook' ? '.sh' : '.md';
    const fileName = `${this.sanitizeFileName(name)}${extension}`;

    return path.join(directories, typeDir, fileName);
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Create config file
   */
  public async createConfig(
    name: string,
    type: ConfigType,
    content: string,
    location: ConfigLocation
  ): Promise<FileOperationResult> {
    try {
      await this.ensureClaudeDirectory(location);
      
      const filePath = this.getConfigFilePath(name, type, location);

      if (existsSync(filePath)) {
        return {
          success: false,
          error: `Config already exists at ${filePath}`
        };
      }

      await fs.writeFile(filePath, content, 'utf-8');

      if (type === 'hook') {
        await fs.chmod(filePath, 0o755);
      }

      return {
        success: true,
        path: filePath
      };
    } catch (error) {
      throw new FileOperationError(
        `Failed to create config: ${name}`,
        { error, name, type, location }
      );
    }
  }

  /**
   * Read config file
   */
  public async readConfig(filePath: string): Promise<string> {
    try {
      if (!existsSync(filePath)) {
        throw new FileOperationError(`Config file not found: ${filePath}`);
      }

      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new FileOperationError(
        `Failed to read config: ${filePath}`,
        { error, filePath }
      );
    }
  }

  /**
   * Update config file
   */
  public async updateConfig(
    filePath: string,
    content: string,
    createBackup: boolean = true
  ): Promise<FileOperationResult> {
    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          error: `Config file not found: ${filePath}`
        };
      }

      let backupPath: string | undefined;

      if (createBackup) {
        backupPath = await this.createBackup(filePath);
      }

      await fs.writeFile(filePath, content, 'utf-8');

      return {
        success: true,
        path: filePath,
        backupPath
      };
    } catch (error) {
      throw new FileOperationError(
        `Failed to update config: ${filePath}`,
        { error, filePath }
      );
    }
  }

  /**
   * Delete config file
   */
  public async deleteConfig(filePath: string): Promise<FileOperationResult> {
    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          error: `Config file not found: ${filePath}`
        };
      }

      const backupPath = await this.createBackup(filePath);
      await fs.unlink(filePath);

      return {
        success: true,
        path: filePath,
        backupPath
      };
    } catch (error) {
      throw new FileOperationError(
        `Failed to delete config: ${filePath}`,
        { error, filePath }
      );
    }
  }

  /**
   * Create backup of config file
   */
  private async createBackup(filePath: string): Promise<string> {
    const directories = await this.getClaudeDirectories();
    const isLocal = filePath.startsWith(directories.local);
    const baseDir = isLocal ? directories.local : directories.global;
    
    const backupDir = path.join(baseDir, 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupFileName = `${fileName}.${timestamp}.bak`;
    const backupPath = path.join(backupDir, backupFileName);

    await fs.copyFile(filePath, backupPath);

    return backupPath;
  }

  /**
   * List all configs in a location
   */
  public async listConfigs(location: ConfigLocation): Promise<ClaudeConfig[]> {
    try {
      const directories = await this.getClaudeDirectories();
      const baseDir = location === 'local' ? directories.local : directories.global;

      if (!existsSync(baseDir)) {
        return [];
      }

      const configs: ClaudeConfig[] = [];
      const types: ConfigType[] = ['agent', 'hook', 'skill', 'command'];

      for (const type of types) {
        const typeDir = type === 'agent' ? 'agents'
          : type === 'hook' ? 'hooks'
          : type === 'skill' ? 'skills'
          : 'commands';

        const typePath = path.join(baseDir, typeDir);

        if (!existsSync(typePath)) {
          continue;
        }

        const files = await fs.readdir(typePath);

        for (const file of files) {
          if (file.startsWith('.') || file.endsWith('.bak')) {
            continue;
          }

          const filePath = path.join(typePath, file);
          const stats = await fs.stat(filePath);

          if (!stats.isFile()) {
            continue;
          }

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = configParser.parseConfig(content, type);

            const config: ClaudeConfig = {
              id: this.generateConfigId(file, type),
              type,
              name: parsed.name,
              description: parsed.description,
              content,
              location,
              filePath,
              createdAt: stats.birthtime,
              updatedAt: stats.mtime,
              metadata: parsed.metadata
            };

            configs.push(config);
          } catch (error) {
            console.warn(`Failed to parse config: ${filePath}`, error);
          }
        }
      }

      return configs;
    } catch (error) {
      throw new FileOperationError(
        `Failed to list configs in ${location}`,
        { error, location }
      );
    }
  }

  /**
   * Generate unique config ID
   */
  private generateConfigId(fileName: string, type: ConfigType): string {
    const baseName = fileName.replace(/\.(md|sh)$/, '');
    return `${type}-${baseName}`;
  }

  /**
   * Get all configs (local and global)
   */
  public async getAllConfigs(): Promise<ClaudeConfig[]> {
    const [localConfigs, globalConfigs] = await Promise.all([
      this.listConfigs('local'),
      this.listConfigs('global')
    ]);

    return [...localConfigs, ...globalConfigs];
  }

  /**
   * Get config by ID
   */
  public async getConfigById(id: string): Promise<ClaudeConfig | null> {
    const allConfigs = await this.getAllConfigs();
    return allConfigs.find(c => c.id === id) || null;
  }

  /**
   * Check if config exists
   */
  public async configExists(
    name: string,
    type: ConfigType,
    location: ConfigLocation
  ): Promise<boolean> {
    const filePath = this.getConfigFilePath(name, type, location);
    return existsSync(filePath);
  }

  /**
   * Rename config
   */
  public async renameConfig(
    oldPath: string,
    newName: string
  ): Promise<FileOperationResult> {
    try {
      if (!existsSync(oldPath)) {
        return {
          success: false,
          error: `Config file not found: ${oldPath}`
        };
      }

      const dir = path.dirname(oldPath);
      const ext = path.extname(oldPath);
      const newFileName = `${this.sanitizeFileName(newName)}${ext}`;
      const newPath = path.join(dir, newFileName);

      if (existsSync(newPath)) {
        return {
          success: false,
          error: `Config with name '${newName}' already exists`
        };
      }

      await fs.rename(oldPath, newPath);

      return {
        success: true,
        path: newPath
      };
    } catch (error) {
      throw new FileOperationError(
        `Failed to rename config: ${oldPath}`,
        { error, oldPath, newName }
      );
    }
  }

  /**
   * Copy config to different location
   */
  public async copyConfig(
    sourcePath: string,
    targetLocation: ConfigLocation
  ): Promise<FileOperationResult> {
    try {
      if (!existsSync(sourcePath)) {
        return {
          success: false,
          error: `Source config not found: ${sourcePath}`
        };
      }

      const content = await fs.readFile(sourcePath, 'utf-8');
      const fileName = path.basename(sourcePath);
      const type = this.detectTypeFromPath(sourcePath);

      if (!type) {
        return {
          success: false,
          error: `Could not detect config type from path: ${sourcePath}`
        };
      }

      const name = fileName.replace(/\.(md|sh)$/, '');
      
      return await this.createConfig(name, type, content, targetLocation);
    } catch (error) {
      throw new FileOperationError(
        `Failed to copy config: ${sourcePath}`,
        { error, sourcePath, targetLocation }
      );
    }
  }

  /**
   * Detect config type from file path
   */
  private detectTypeFromPath(filePath: string): ConfigType | null {
    if (filePath.includes('/agents/')) return 'agent';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/skills/')) return 'skill';
    if (filePath.includes('/commands/')) return 'command';
    return null;
  }

  /**
   * Get recent backups
   */
  public async getRecentBackups(limit: number = 10): Promise<string[]> {
    try {
      const directories = await this.getClaudeDirectories();
      const backups: Array<{ path: string; mtime: Date }> = [];

      for (const dir of [directories.local, directories.global]) {
        const backupDir = path.join(dir, 'backups');
        
        if (!existsSync(backupDir)) {
          continue;
        }

        const files = await fs.readdir(backupDir);

        for (const file of files) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);

          if (stats.isFile()) {
            backups.push({
              path: filePath,
              mtime: stats.mtime
            });
          }
        }
      }

      backups.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      return backups.slice(0, limit).map(b => b.path);
    } catch (error) {
      console.error('Failed to get recent backups:', error);
      return [];
    }
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(
    backupPath: string,
    targetPath?: string
  ): Promise<FileOperationResult> {
    try {
      if (!existsSync(backupPath)) {
        return {
          success: false,
          error: `Backup file not found: ${backupPath}`
        };
      }

      const content = await fs.readFile(backupPath, 'utf-8');
      
      let restorePath = targetPath;
      if (!restorePath) {
        const fileName = path.basename(backupPath)
          .replace(/\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*\.bak$/, '');
        const backupDir = path.dirname(backupPath);
        const typeDir = path.dirname(backupDir);
        restorePath = path.join(typeDir, fileName);
      }

      await fs.writeFile(restorePath, content, 'utf-8');

      return {
        success: true,
        path: restorePath
      };
    } catch (error) {
      throw new FileOperationError(
        `Failed to restore from backup: ${backupPath}`,
        { error, backupPath, targetPath }
      );
    }
  }

  /**
   * Clean old backups
   */
  public async cleanOldBackups(daysToKeep: number = 30): Promise<number> {
    try {
      const directories = await this.getClaudeDirectories();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;

      for (const dir of [directories.local, directories.global]) {
        const backupDir = path.join(dir, 'backups');
        
        if (!existsSync(backupDir)) {
          continue;
        }

        const files = await fs.readdir(backupDir);

        for (const file of files) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);

          if (stats.isFile() && stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to clean old backups:', error);
      return 0;
    }
  }
}

export const fileOperations = FileOperations.getInstance();

export async function createConfig(
  name: string,
  type: ConfigType,
  content: string,
  location: ConfigLocation
): Promise<FileOperationResult> {
  return fileOperations.createConfig(name, type, content, location);
}

export async function getAllConfigs(): Promise<ClaudeConfig[]> {
  return fileOperations.getAllConfigs();
}

export async function deleteConfig(filePath: string): Promise<FileOperationResult> {
  return fileOperations.deleteConfig(filePath);
}
