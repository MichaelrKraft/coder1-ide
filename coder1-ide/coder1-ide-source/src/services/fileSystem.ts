export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
}

export class FileSystemService {
  private static instance: FileSystemService;
  private apiBaseUrl: string = '/api/files';

  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  // Fetch actual file tree from the API
  public async getProjectFiles(): Promise<FileNode[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/tree`);
      if (!response.ok) {
        throw new Error('Failed to fetch file tree');
      }
      
      const data = await response.json();
      if (data.success && data.tree) {
        // The API returns a root node with children, we want just the children
        return data.tree.children || [];
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching project files:', error);
      // Fallback to a simple structure if API fails
      return [{
        name: 'Error loading files',
        path: '/',
        type: 'file' as const,
        children: []
      }];
    }
  }

  public async readFile(filePath: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/read?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error('Failed to read file');
      }
      
      const data = await response.json();
      if (data.success && data.content !== undefined) {
        return data.content;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error reading file:', error);
      return `// Error loading file: ${filePath}\n// ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  public async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath, content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to write file');
      }
      
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  }

  public getFileIcon(fileName: string, isDirectory: boolean = false): string {
    if (isDirectory) {
      return '📁';
    }

    // Special handling for AGENTS.md files
    if (fileName.toLowerCase() === 'agents.md') {
      return '🤖';
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'tsx': '⚛️',
      'ts': '📘',
      'js': '📄',
      'jsx': '⚛️',
      'json': '📋',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'md': '📝',
      'png': '🖼️',
      'jpg': '🖼️',
      'svg': '🖼️',
      'ico': '🖼️',
      'txt': '📄'
    };

    return iconMap[ext || ''] || '📄';
  }

  public isAgentsFile(fileName: string): boolean {
    return fileName.toLowerCase() === 'agents.md';
  }

  public async findNearestAgentsFile(currentPath: string): Promise<string | null> {
    try {
      // Start from current directory and work upward
      const pathParts = currentPath.split('/').filter(Boolean);
      
      for (let i = pathParts.length; i >= 0; i--) {
        const checkPath = i === 0 ? '/' : '/' + pathParts.slice(0, i).join('/');
        const agentsPath = checkPath === '/' ? '/AGENTS.md' : `${checkPath}/AGENTS.md`;
        
        // Check if AGENTS.md exists at this level
        try {
          await this.readFile(agentsPath);
          return agentsPath;
        } catch {
          // Continue to parent directory
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding nearest AGENTS.md:', error);
      return null;
    }
  }
}

export const fileSystemService = FileSystemService.getInstance();