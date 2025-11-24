/**
 * Coder1 Memory - VS Code Extension
 * 
 * Brings Eternal Memory to VS Code via Coder1 Context API
 * 
 * Features:
 * - Save memories: Cmd/Ctrl+Shift+M
 * - Search memories: Cmd/Ctrl+Shift+F  
 * - Status bar showing memory count
 */

import * as vscode from 'vscode';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Memory {
  id: string;
  version: string;
  timestamp: string;
  type: string;
  content: {
    title: string;
    description: string;
    summary?: string;
    duration?: number;
    codeSnippet?: {
      language: string;
      code: string;
      file: string;
    };
    files?: Array<{
      path: string;
      content: string;
      language: string;
      changes?: boolean;
      lineCount?: number;
    }>;
    terminal?: {
      commands: string[];
      cwd?: string;
    };
    git?: {
      branch?: string;
      commits?: Array<{
        hash: string;
        message: string;
        author: string;
        date: string;
      }>;
      status?: string;
    };
  };
  context?: {
    project?: {
      name: string;
      type?: string;
    };
    timespan?: {
      start: number;
      end: number;
    };
    statistics?: {
      filesEdited: number;
      linesChanged: number;
      commandsRun: number;
    };
    files?: string[];
  };
  tags?: string[];
}

interface ListMemoriesResponse {
  memories: Memory[];
  count: number;
}

interface SearchMemoriesResponse {
  results: Memory[];
  count: number;
}

interface MemoryQuickPickItem extends vscode.QuickPickItem {
  memory: Memory;
}

interface GitExtension {
  getAPI(version: number): GitAPI | undefined;
}

interface GitAPI {
  repositories: GitRepository[];
}

interface GitRepository {
  state: {
    HEAD?: {
      name?: string;
    };
  };
  log(options?: { maxEntries?: number }): Promise<GitCommit[]>;
  diff(): Promise<string>;
}

interface GitCommit {
  hash: string;
  message: string;
  authorName?: string;
  authorDate?: Date;
}

// ============================================================================
// CODER1 CLIENT (Embedded SDK)
// ============================================================================

class Coder1Client {
  private apiUrl: string;

  constructor(apiUrl: string = 'http://localhost:3005') {
    this.apiUrl = apiUrl;
  }

  async createMemory(memory: any): Promise<Memory> {
    const response = await fetch(`${this.apiUrl}/api/v1/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory)
    });

    if (!response.ok) {
      throw new Error(`Failed to create memory: ${response.statusText}`);
    }

    return response.json() as Promise<Memory>;
  }

  async searchMemories(query: string): Promise<SearchMemoriesResponse> {
    const response = await fetch(`${this.apiUrl}/api/v1/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Failed to search memories: ${response.statusText}`);
    }

    return response.json() as Promise<SearchMemoriesResponse>;
  }

  async listMemories(): Promise<ListMemoriesResponse> {
    const response = await fetch(`${this.apiUrl}/api/v1/memory`);

    if (!response.ok) {
      throw new Error(`Failed to list memories: ${response.statusText}`);
    }

    return response.json() as Promise<ListMemoriesResponse>;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 Coder1 Memory extension activated!');

  // Initialize Coder1 client
  const client = new Coder1Client();

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = '$(database) Coder1';
  statusBarItem.tooltip = 'Coder1 Memory - Click to search';
  statusBarItem.command = 'coder1.searchMemory';
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

  // Update memory count in status bar
  async function updateMemoryCount() {
    try {
      const { count } = await client.listMemories();
      statusBarItem.text = `$(database) Coder1: ${count}`;
      statusBarItem.tooltip = `${count} memories saved - Click to search`;
    } catch (error) {
      statusBarItem.text = '$(database) Coder1: Offline';
      statusBarItem.tooltip = 'Context API not running - Start: npm run dev';
    }
  }

  // Check API health on activation
  (async () => {
    const isHealthy = await client.checkHealth();
    if (!isHealthy) {
      vscode.window.showWarningMessage(
        'Coder1 Context API not running. Start server: cd coder1-context-api && npm run dev',
        'OK'
      );
    } else {
      updateMemoryCount();
    }
  })();

  // ============================================================================
  // COMMAND: Save Memory
  // ============================================================================

  const saveMemoryCommand = vscode.commands.registerCommand(
    'coder1.saveMemory',
    async () => {
      // Get title from user
      const title = await vscode.window.showInputBox({
        prompt: 'What did you learn or decide?',
        placeHolder: 'e.g., Found better way to handle async errors',
        validateInput: (value) => {
          return value.length === 0 ? 'Title cannot be empty' : null;
        }
      });

      if (!title) {
        return; // User canceled
      }

      // Get optional description
      const description = await vscode.window.showInputBox({
        prompt: 'Add details (optional)',
        placeHolder: 'e.g., Using try/catch with async/await is cleaner than .catch()'
      });

      try {
        // Get current file and selection
        const editor = vscode.window.activeTextEditor;
        const codeSnippet = editor ? {
          language: editor.document.languageId,
          code: editor.document.getText(editor.selection) || 
                editor.document.getText().slice(0, 500),
          file: editor.document.fileName
        } : null;

        // Get project name
        const workspaceName = vscode.workspace.name || 'Unknown';

        // Create memory
        const memory = await client.createMemory({
          type: 'insight',
          content: {
            title,
            description: description || 'Saved from VS Code',
            codeSnippet
          },
          context: {
            project: {
              name: workspaceName,
              type: 'vscode_workspace'
            },
            files: editor ? [editor.document.fileName] : []
          },
          tags: ['vscode', editor?.document.languageId].filter(Boolean)
        });

        // Show success
        vscode.window.showInformationMessage(
          `💾 Memory saved! ID: ${memory.id.slice(0, 12)}...`
        );

        // Update count
        updateMemoryCount();

      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to save memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(saveMemoryCommand);

  // ============================================================================
  // COMMAND: Search Memory
  // ============================================================================

  const searchMemoryCommand = vscode.commands.registerCommand(
    'coder1.searchMemory',
    async () => {
      // Get search query
      const query = await vscode.window.showInputBox({
        prompt: 'Search your memories...',
        placeHolder: 'e.g., react hooks, async errors, database'
      });

      if (!query) {
        return; // User canceled
      }

      try {
        // Search memories
        const { results, count } = await client.searchMemories(query);

        if (count === 0) {
          vscode.window.showInformationMessage('No memories found for that query');
          return;
        }

        // Show results in Quick Pick
        const selected = await vscode.window.showQuickPick<MemoryQuickPickItem>(
          results.map((memory: Memory): MemoryQuickPickItem => ({
            label: `$(bookmark) ${memory.content.title}`,
            description: memory.tags?.join(', ') || '',
            detail: memory.content.description,
            memory
          })),
          {
            placeHolder: `Found ${count} memories`,
            matchOnDescription: true,
            matchOnDetail: true
          }
        );

        if (selected) {
          // Show memory details
          const memory = selected.memory;
          const details = [
            `**${memory.content.title}**`,
            '',
            memory.content.description,
            '',
            `🏷️ Tags: ${memory.tags?.join(', ') || 'None'}`,
            `📅 Created: ${new Date(memory.timestamp).toLocaleString()}`,
            `🆔 ID: ${memory.id}`
          ];

          if (memory.content.codeSnippet) {
            details.push('', '```' + memory.content.codeSnippet.language);
            details.push(memory.content.codeSnippet.code.slice(0, 500));
            details.push('```');
          }

          // Show in information message
          const action = await vscode.window.showInformationMessage(
            details.join('\n'),
            'Copy ID',
            'Close'
          );

          if (action === 'Copy ID') {
            vscode.env.clipboard.writeText(memory.id);
            vscode.window.showInformationMessage('Memory ID copied to clipboard');
          }
        }

      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(searchMemoryCommand);

  // ============================================================================
  // COMMAND: View All Memories
  // ============================================================================

  const viewAllCommand = vscode.commands.registerCommand(
    'coder1.viewAll',
    async () => {
      try {
        const { memories, count } = await client.listMemories();

        if (count === 0) {
          vscode.window.showInformationMessage('No memories saved yet. Use Cmd/Ctrl+Shift+M to save one!');
          return;
        }

        const selected = await vscode.window.showQuickPick<MemoryQuickPickItem>(
          memories.map((memory: Memory): MemoryQuickPickItem => ({
            label: `$(bookmark) ${memory.content.title}`,
            description: new Date(memory.timestamp).toLocaleDateString(),
            detail: memory.content.description,
            memory
          })),
          {
            placeHolder: `${count} memories total`
          }
        );

        if (selected) {
          // Same detail view as search
          vscode.commands.executeCommand('coder1.searchMemory');
        }

      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to load memories: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(viewAllCommand);

  // ============================================================================
  // COMMAND: Check API Status
  // ============================================================================

  const checkStatusCommand = vscode.commands.registerCommand(
    'coder1.checkStatus',
    async () => {
      const isHealthy = await client.checkHealth();

      if (isHealthy) {
        const { count } = await client.listMemories();
        vscode.window.showInformationMessage(
          `✅ Coder1 Context API is running!\n${count} memories saved.`
        );
        updateMemoryCount();
      } else {
        vscode.window.showWarningMessage(
          '❌ Coder1 Context API is not running.\n\nStart it with:\ncd coder1-context-api && npm run dev',
          'Copy Command'
        ).then(action => {
          if (action === 'Copy Command') {
            vscode.env.clipboard.writeText('cd coder1-context-api && npm run dev');
          }
        });
      }
    }
  );

  context.subscriptions.push(checkStatusCommand);

  // ============================================================================
  // COMMAND: Save Session (ENHANCED - Full Context Capture)
  // ============================================================================

  const saveSessionCommand = vscode.commands.registerCommand(
    'coder1.saveSession',
    async () => {
      try {
        vscode.window.showInformationMessage('🎬 Capturing full session context...');

        const sessionStart = Date.now();
        const workspaceName = vscode.workspace.name || 'Unknown';
        
        const title = await vscode.window.showInputBox({
          prompt: 'Session Title',
          placeHolder: 'e.g., Implemented user authentication',
          validateInput: (value) => value.length === 0 ? 'Title required' : null
        });

        if (!title) return;

        const description = await vscode.window.showInputBox({
          prompt: 'Session Summary (optional)',
          placeHolder: 'What did you accomplish in this session?'
        });

        const allFiles: Array<{
          path: string;
          content: string;
          language: string;
          changes: boolean;
          lineCount: number;
        }> = [];

        if (vscode.workspace.workspaceFolders) {
          const editors = vscode.window.visibleTextEditors;
          
          for (const editor of editors) {
            const doc = editor.document;
            if (doc.uri.scheme === 'file') {
              allFiles.push({
                path: vscode.workspace.asRelativePath(doc.uri),
                content: doc.getText(),
                language: doc.languageId,
                changes: doc.isDirty,
                lineCount: doc.lineCount
              });
            }
          }
        }

        let gitContext: Memory['content']['git'] = undefined;
        try {
          const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
          if (gitExtension) {
            const git = gitExtension.exports?.getAPI(1);
            if (git && git.repositories.length > 0) {
              const repo = git.repositories[0];
              const branch = repo.state.HEAD?.name || 'unknown';
              
              try {
                const commits = await repo.log({ maxEntries: 10 });
                gitContext = {
                  branch,
                  commits: commits.map(c => ({
                    hash: c.hash.substring(0, 8),
                    message: c.message,
                    author: c.authorName || 'unknown',
                    date: c.authorDate?.toISOString() || new Date().toISOString()
                  })),
                  status: 'captured'
                };
              } catch (gitError) {
                console.log('Git log capture failed:', gitError);
                gitContext = { branch, status: 'partial' };
              }
            }
          }
        } catch (gitError) {
          console.log('Git extension not available:', gitError);
        }

        const terminalCommands: string[] = [];
        if (vscode.window.terminals.length > 0) {
          terminalCommands.push(`${vscode.window.terminals.length} terminal(s) active`);
        }

        const totalLines = allFiles.reduce((sum, f) => sum + f.lineCount, 0);

        const session: Memory = {
          id: '',
          version: '1.0',
          timestamp: new Date().toISOString(),
          type: 'session',
          content: {
            title,
            description: description || 'Session captured from VS Code',
            summary: `Captured ${allFiles.length} files (${totalLines} lines total)`,
            duration: Date.now() - sessionStart,
            files: allFiles,
            terminal: {
              commands: terminalCommands,
              cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            },
            git: gitContext
          },
          context: {
            project: {
              name: workspaceName,
              type: 'vscode_workspace'
            },
            timespan: {
              start: sessionStart,
              end: Date.now()
            },
            statistics: {
              filesEdited: allFiles.filter(f => f.changes).length,
              linesChanged: totalLines,
              commandsRun: terminalCommands.length
            },
            files: allFiles.map(f => f.path)
          },
          tags: ['vscode', 'session', ...new Set(allFiles.map(f => f.language))].filter(Boolean)
        };

        const saved = await client.createMemory(session);

        vscode.window.showInformationMessage(
          `🎬 Session saved! Captured ${allFiles.length} files, ${totalLines} lines${gitContext ? `, Git: ${gitContext.branch}` : ''}`
        );

        updateMemoryCount();

      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(saveSessionCommand);

  console.log('✅ Coder1 Memory extension ready!');
}

// ============================================================================
// EXTENSION DEACTIVATION
// ============================================================================

export function deactivate() {
  console.log('👋 Coder1 Memory extension deactivated');
}
