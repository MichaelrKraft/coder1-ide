import { editor } from 'monaco-editor';

export interface FileInfo {
  path: string;
  content: string;
  isDirty: boolean;
}

export interface MenuActionsConfig {
  onFileChange?: (file: FileInfo) => void;
  onNewFile?: () => void;
  onOpenFile?: (file: FileInfo) => void;
  onSaveFile?: (file: FileInfo) => void;
  getEditorInstance?: () => editor.IStandaloneCodeEditor | null;
}

export class MenuActionsService {
  private config: MenuActionsConfig;
  private currentFile: FileInfo | null = null;

  constructor(config: MenuActionsConfig) {
    this.config = config;
  }

  // File Operations
  async newFile() {
    const newFile: FileInfo = {
      path: 'untitled-' + Date.now() + '.txt',
      content: '',
      isDirty: false
    };
    
    this.currentFile = newFile;
    this.config.onNewFile?.();
    this.config.onOpenFile?.(newFile);
  }

  async openFile() {
    // Create hidden input element for file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.jsx,.ts,.tsx,.json,.md,.txt,.css,.html,.py,.java,.go,.rs,.c,.cpp,.sh,.yml,.yaml';
    
    return new Promise<void>((resolve) => {
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const content = await file.text();
          const fileInfo: FileInfo = {
            path: file.name,
            content,
            isDirty: false
          };
          
          this.currentFile = fileInfo;
          this.config.onOpenFile?.(fileInfo);
        }
        resolve();
      };
      
      input.click();
    });
  }

  async saveFile() {
    if (!this.currentFile) {
      return this.saveFileAs();
    }

    // Get current editor content
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      this.currentFile.content = editor.getValue();
    }

    // Call API to save file
    try {
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: this.currentFile.path,
          content: this.currentFile.content
        })
      });

      if (response.ok) {
        this.currentFile.isDirty = false;
        this.config.onSaveFile?.(this.currentFile);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }

  async saveFileAs() {
    const fileName = prompt('Save as:', this.currentFile?.path || 'untitled.txt');
    if (!fileName) return;

    const editor = this.config.getEditorInstance?.();
    const content = editor ? editor.getValue() : this.currentFile?.content || '';

    const fileInfo: FileInfo = {
      path: fileName,
      content,
      isDirty: false
    };

    // Save via API
    try {
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: fileInfo.path,
          content: fileInfo.content
        })
      });

      if (response.ok) {
        this.currentFile = fileInfo;
        this.config.onSaveFile?.(fileInfo);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }

  // Edit Operations
  find() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'actions.find', null);
    }
  }

  replace() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'editor.action.startFindReplaceAction', null);
    }
  }

  undo() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'undo', null);
    }
  }

  redo() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'redo', null);
    }
  }

  cut() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'editor.action.clipboardCutAction', null);
    }
  }

  copy() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'editor.action.clipboardCopyAction', null);
    }
  }

  paste() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'editor.action.clipboardPasteAction', null);
    }
  }

  // View Operations
  zoomIn() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'editor.action.fontZoomIn', null);
    }
  }

  zoomOut() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'editor.action.fontZoomOut', null);
    }
  }

  resetZoom() {
    const editor = this.config.getEditorInstance?.();
    if (editor) {
      editor.trigger('menu', 'editor.action.fontZoomReset', null);
    }
  }

  // Close current file
  closeFile() {
    this.currentFile = null;
    this.config.onFileChange?.({
      path: '',
      content: '',
      isDirty: false
    });
  }

  // Update current file info
  setCurrentFile(file: FileInfo) {
    this.currentFile = file;
  }

  getCurrentFile() {
    return this.currentFile;
  }
}