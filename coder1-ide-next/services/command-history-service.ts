/**
 * Command History Service
 * Manages staged command history with IndexedDB persistence
 */

export interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: number;
  sessionId?: string;
  hasImages: boolean;
  tokenCount?: number;
  processingTime?: number;
  tags?: string[];
}

class CommandHistoryService {
  private static instance: CommandHistoryService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'coder1-command-history';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'commands';
  private readonly MAX_ENTRIES = 1000;

  private constructor() {
    this.initDB();
  }

  static getInstance(): CommandHistoryService {
    if (!CommandHistoryService.instance) {
      CommandHistoryService.instance = new CommandHistoryService();
    }
    return CommandHistoryService.instance;
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
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { 
            keyPath: 'id',
            autoIncrement: false 
          });

          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      };
    });
  }

  async addCommand(entry: Omit<CommandHistoryEntry, 'id'>): Promise<void> {
    if (!this.db) await this.initDB();

    const fullEntry: CommandHistoryEntry = {
      ...entry,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: entry.timestamp || Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(fullEntry);

      request.onsuccess = () => {
        this.enforceMaxEntries();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to add command to history:', request.error);
        reject(request.error);
      };
    });
  }

  async getHistory(limit: number = 50): Promise<CommandHistoryEntry[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');
      
      const entries: CommandHistoryEntry[] = [];
      let count = 0;

      // Open cursor in reverse order (newest first)
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && count < limit) {
          entries.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(entries);
        }
      };

      request.onerror = () => {
        console.error('Failed to get command history:', request.error);
        reject(request.error);
      };
    });
  }

  async searchHistory(query: string, limit: number = 50): Promise<CommandHistoryEntry[]> {
    const allEntries = await this.getHistory(limit * 2); // Get more to filter
    const lowercaseQuery = query.toLowerCase();

    return allEntries
      .filter(entry => 
        entry.command.toLowerCase().includes(lowercaseQuery) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      )
      .slice(0, limit);
  }

  async getSessionHistory(sessionId: string, limit: number = 50): Promise<CommandHistoryEntry[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('sessionId');
      
      const entries: CommandHistoryEntry[] = [];
      let count = 0;

      const request = index.openCursor(IDBKeyRange.only(sessionId), 'prev');

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && count < limit) {
          entries.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(entries);
        }
      };

      request.onerror = () => {
        console.error('Failed to get session history:', request.error);
        reject(request.error);
      };
    });
  }

  async clearHistory(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to clear history:', request.error);
        reject(request.error);
      };
    });
  }

  private async enforceMaxEntries(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const count = countRequest.result;
      
      if (count > this.MAX_ENTRIES) {
        const deleteCount = count - this.MAX_ENTRIES;
        const index = store.index('timestamp');
        const request = index.openCursor();
        let deleted = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
    };
  }

  async getFrequentCommands(limit: number = 10): Promise<{ command: string; count: number }[]> {
    const history = await this.getHistory(500);
    const frequency = new Map<string, number>();

    history.forEach(entry => {
      const normalized = entry.command.trim().toLowerCase();
      frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([command, count]) => ({ command, count }));
  }
}

export const commandHistoryService = CommandHistoryService.getInstance();