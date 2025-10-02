/**
 * Command Snippets Service
 * Manages command snippets/macros with localStorage and IndexedDB persistence
 */

export interface CommandSnippet {
  id: string;
  name: string;
  command: string;
  description?: string;
  tags: string[];
  category?: string;
  createdAt: number;
  lastUsed?: number;
  useCount: number;
}

class CommandSnippetsService {
  private static instance: CommandSnippetsService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'coder1-command-snippets';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'snippets';
  private readonly STORAGE_KEY = 'coder1-snippets-backup';

  // Default snippets to seed the system
  private readonly DEFAULT_SNIPPETS: Omit<CommandSnippet, 'id' | 'createdAt' | 'useCount'>[] = [
    {
      name: 'Git Status Check',
      command: 'git status && git log --oneline -5',
      description: 'Check git status and recent commits',
      tags: ['git', 'status'],
      category: 'git'
    },
    {
      name: 'NPM Fresh Install',
      command: 'rm -rf node_modules package-lock.json && npm install',
      description: 'Clean npm install',
      tags: ['npm', 'install', 'clean'],
      category: 'npm'
    },
    {
      name: 'Find Large Files',
      command: 'find . -type f -size +10M -exec ls -lh {} \\; | awk \'{ print $9 ": " $5 }\'',
      description: 'Find files larger than 10MB',
      tags: ['find', 'files', 'size'],
      category: 'system'
    },
    {
      name: 'Port Kill',
      command: 'lsof -ti:3000 | xargs kill -9',
      description: 'Kill process on port 3000',
      tags: ['port', 'kill', 'process'],
      category: 'system'
    },
    {
      name: 'Docker Cleanup',
      command: 'docker system prune -f && docker image prune -f',
      description: 'Clean up Docker system and images',
      tags: ['docker', 'cleanup', 'prune'],
      category: 'docker'
    }
  ];

  private constructor() {
    this.initDB();
  }

  static getInstance(): CommandSnippetsService {
    if (!CommandSnippetsService.instance) {
      CommandSnippetsService.instance = new CommandSnippetsService();
    }
    return CommandSnippetsService.instance;
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.seedDefaultSnippets();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { 
            keyPath: 'id',
            autoIncrement: false 
          });

          // Create indexes for efficient querying
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          store.createIndex('lastUsed', 'lastUsed', { unique: false });
        }
      };
    });
  }

  private async seedDefaultSnippets(): Promise<void> {
    try {
      const existingSnippets = await this.getAllSnippets();
      if (existingSnippets.length === 0) {
        // Seed with default snippets
        for (const snippet of this.DEFAULT_SNIPPETS) {
          await this.addSnippet(snippet);
        }
      }
    } catch (error) {
      console.error('Failed to seed default snippets:', error);
    }
  }

  async addSnippet(snippet: Omit<CommandSnippet, 'id' | 'createdAt' | 'useCount'>): Promise<CommandSnippet> {
    if (!this.db) await this.initDB();

    const fullSnippet: CommandSnippet = {
      ...snippet,
      id: `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      useCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(fullSnippet);

      request.onsuccess = () => {
        this.backupToLocalStorage();
        resolve(fullSnippet);
      };

      request.onerror = () => {
        console.error('Failed to add snippet:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllSnippets(): Promise<CommandSnippet[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const snippets = request.result.sort((a: CommandSnippet, b: CommandSnippet) => {
          // Sort by usage count (desc), then last used (desc), then name (asc)
          if (b.useCount !== a.useCount) return b.useCount - a.useCount;
          if (b.lastUsed !== a.lastUsed) return (b.lastUsed || 0) - (a.lastUsed || 0);
          return a.name.localeCompare(b.name);
        });
        resolve(snippets);
      };

      request.onerror = () => {
        console.error('Failed to get snippets:', request.error);
        reject(request.error);
      };
    });
  }

  async searchSnippets(query: string): Promise<CommandSnippet[]> {
    const allSnippets = await this.getAllSnippets();
    const lowercaseQuery = query.toLowerCase();

    return allSnippets.filter(snippet => 
      snippet.name.toLowerCase().includes(lowercaseQuery) ||
      snippet.command.toLowerCase().includes(lowercaseQuery) ||
      snippet.description?.toLowerCase().includes(lowercaseQuery) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  async getSnippetsByCategory(category: string): Promise<CommandSnippet[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('category');
      const request = index.getAll(category);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async useSnippet(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    const snippet = await this.getSnippetById(id);
    if (!snippet) return;

    snippet.useCount++;
    snippet.lastUsed = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(snippet);

      request.onsuccess = () => {
        this.backupToLocalStorage();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSnippetById(id: string): Promise<CommandSnippet | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSnippet(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.backupToLocalStorage();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateSnippet(id: string, updates: Partial<CommandSnippet>): Promise<void> {
    const snippet = await this.getSnippetById(id);
    if (!snippet) throw new Error('Snippet not found');

    const updatedSnippet = { ...snippet, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(updatedSnippet);

      request.onsuccess = () => {
        this.backupToLocalStorage();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async exportSnippets(): Promise<string> {
    const snippets = await this.getAllSnippets();
    return JSON.stringify(snippets, null, 2);
  }

  async importSnippets(jsonData: string): Promise<void> {
    try {
      const snippets: CommandSnippet[] = JSON.parse(jsonData);
      
      for (const snippet of snippets) {
        // Generate new ID to avoid conflicts
        const newSnippet = {
          ...snippet,
          id: `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now()
        };
        
        await this.addSnippet(newSnippet);
      }
    } catch (error) {
      throw new Error('Invalid JSON data');
    }
  }

  private async backupToLocalStorage(): Promise<void> {
    try {
      const snippets = await this.getAllSnippets();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snippets));
    } catch (error) {
      console.error('Failed to backup snippets to localStorage:', error);
    }
  }

  async restoreFromLocalStorage(): Promise<void> {
    try {
      const backup = localStorage.getItem(this.STORAGE_KEY);
      if (backup) {
        await this.importSnippets(backup);
      }
    } catch (error) {
      console.error('Failed to restore snippets from localStorage:', error);
    }
  }

  getCategories(): string[] {
    return ['git', 'npm', 'docker', 'system', 'dev', 'testing', 'build', 'deploy', 'other'];
  }
}

export const commandSnippetsService = CommandSnippetsService.getInstance();