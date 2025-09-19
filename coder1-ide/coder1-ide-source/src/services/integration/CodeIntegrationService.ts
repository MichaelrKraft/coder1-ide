/**
 * Code Integration Service
 * Handles intelligent code insertion, import management, and Monaco editor manipulation
 * for seamless component integration into existing codebases
 */

import * as monaco from 'monaco-editor';

export interface EditorFile {
  path: string;
  content: string;
  language: string;
}

export interface Position {
  line: number;
  column: number;
}

export interface ImportStatement {
  module: string;
  defaultImport?: string;
  namedImports?: string[];
  raw: string;
}

export interface IntegrationOptions {
  location: 'cursor' | 'replace' | 'newFile' | 'append';
  autoImports: boolean;
  formatCode: boolean;
}

export interface GeneratedComponent {
  code: string;
  requiredImports: ImportStatement[];
  insertionPoint?: Position;
  styling?: string;
}

class CodeIntegrationService {
  private static instance: CodeIntegrationService;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private model: monaco.editor.ITextModel | null = null;

  private constructor() {}

  public static getInstance(): CodeIntegrationService {
    if (!CodeIntegrationService.instance) {
      CodeIntegrationService.instance = new CodeIntegrationService();
    }
    return CodeIntegrationService.instance;
  }

  /**
   * Initialize with Monaco editor instance
   */
  public setEditor(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
    this.model = editor.getModel();
  }

  /**
   * Get current file information
   */
  public getCurrentFile(): EditorFile | null {
    if (!this.editor || !this.model) return null;

    return {
      path: this.model.uri.path,
      content: this.model.getValue(),
      language: this.model.getLanguageId()
    };
  }

  /**
   * Get current cursor position
   */
  public getCursorPosition(): Position | null {
    if (!this.editor) return null;

    const position = this.editor.getPosition();
    if (!position) return null;

    return {
      line: position.lineNumber,
      column: position.column
    };
  }

  /**
   * Get selected text
   */
  public getSelectedText(): string {
    if (!this.editor) return '';

    const selection = this.editor.getSelection();
    if (!selection || !this.model) return '';

    return this.model.getValueInRange(selection);
  }

  /**
   * Check if there's a text selection
   */
  public hasSelection(): boolean {
    if (!this.editor) return false;

    const selection = this.editor.getSelection();
    return selection !== null && !selection.isEmpty();
  }

  /**
   * Insert code at cursor position
   */
  public insertAtCursor(code: string): void {
    if (!this.editor || !this.model) return;

    const position = this.editor.getPosition();
    if (!position) return;

    const range = new monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );

    this.editor.executeEdits('integration', [{
      range: range,
      text: code,
      forceMoveMarkers: true
    }]);

    // Move cursor to end of inserted text
    const lines = code.split('\n');
    const lastLine = lines[lines.length - 1];
    const newPosition = new monaco.Position(
      position.lineNumber + lines.length - 1,
      lines.length === 1 ? position.column + lastLine.length : lastLine.length + 1
    );
    this.editor.setPosition(newPosition);
  }

  /**
   * Replace selected text with new code
   */
  public replaceSelection(code: string): void {
    if (!this.editor || !this.model || !this.hasSelection()) return;

    const selection = this.editor.getSelection();
    if (!selection) return;

    this.editor.executeEdits('integration', [{
      range: selection,
      text: code,
      forceMoveMarkers: true
    }]);
  }

  /**
   * Append code to end of file
   */
  public appendToFile(code: string): void {
    if (!this.editor || !this.model) return;

    const lastLine = this.model.getLineCount();
    const lastColumn = this.model.getLineMaxColumn(lastLine);
    const range = new monaco.Range(lastLine, lastColumn, lastLine, lastColumn);

    // Add newline if file doesn't end with one
    const currentContent = this.model.getValue();
    const prefix = currentContent.endsWith('\n') ? '' : '\n';

    this.editor.executeEdits('integration', [{
      range: range,
      text: prefix + code,
      forceMoveMarkers: true
    }]);
  }

  /**
   * Add imports to the file
   */
  public addImports(imports: ImportStatement[]): void {
    if (!this.editor || !this.model) return;

    const content = this.model.getValue();
    const lines = content.split('\n');
    
    // Find the last import line
    let lastImportLine = -1;
    let firstCodeLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ')) {
        lastImportLine = i;
      } else if (firstCodeLine === -1 && line && !line.startsWith('//') && !line.startsWith('/*')) {
        firstCodeLine = i;
        break;
      }
    }

    // Generate import statements
    const importStatements = imports.map(imp => this.generateImportStatement(imp)).join('\n');

    // Insert imports
    if (lastImportLine >= 0) {
      // Add after last import
      const position = new monaco.Position(lastImportLine + 1, 1);
      const range = new monaco.Range(position.lineNumber, 1, position.lineNumber, 1);
      
      this.editor.executeEdits('integration', [{
        range: range,
        text: importStatements + '\n',
        forceMoveMarkers: true
      }]);
    } else if (firstCodeLine >= 0) {
      // Add before first code line
      const position = new monaco.Position(firstCodeLine, 1);
      const range = new monaco.Range(position.lineNumber, 1, position.lineNumber, 1);
      
      this.editor.executeEdits('integration', [{
        range: range,
        text: importStatements + '\n\n',
        forceMoveMarkers: true
      }]);
    } else {
      // Add at beginning of file
      const range = new monaco.Range(1, 1, 1, 1);
      
      this.editor.executeEdits('integration', [{
        range: range,
        text: importStatements + '\n\n',
        forceMoveMarkers: true
      }]);
    }
  }

  /**
   * Generate import statement from ImportStatement object
   */
  private generateImportStatement(imp: ImportStatement): string {
    if (imp.raw) {
      return imp.raw;
    }

    let statement = 'import ';
    
    if (imp.defaultImport && imp.namedImports && imp.namedImports.length > 0) {
      statement += `${imp.defaultImport}, { ${imp.namedImports.join(', ')} }`;
    } else if (imp.defaultImport) {
      statement += imp.defaultImport;
    } else if (imp.namedImports && imp.namedImports.length > 0) {
      statement += `{ ${imp.namedImports.join(', ')} }`;
    }
    
    statement += ` from '${imp.module}';`;
    
    return statement;
  }

  /**
   * Create a new file with content
   */
  public async createNewFile(path: string, content: string): Promise<void> {
    // This would need to integrate with the file system service
    // For now, we'll emit an event that the IDE can handle
    const event = new CustomEvent('createFile', {
      detail: { path, content }
    });
    window.dispatchEvent(event);
  }

  /**
   * Format the current document
   */
  public async formatCode(): Promise<void> {
    if (!this.editor) return;

    await this.editor.getAction('editor.action.formatDocument')?.run();
  }

  /**
   * Get the current indentation settings
   */
  public getIndentationSettings(): { useTabs: boolean; size: number } {
    if (!this.model) {
      return { useTabs: false, size: 2 };
    }

    const options = this.model.getOptions();
    return {
      useTabs: !options.insertSpaces,
      size: options.tabSize
    };
  }

  /**
   * Extract all imports from current file
   */
  public extractImports(): ImportStatement[] {
    if (!this.model) return [];

    const content = this.model.getValue();
    const imports: ImportStatement[] = [];
    
    // Match various import patterns
    const importRegex = /import\s+(?:(\w+)|\{([^}]+)\}|(\w+)\s*,\s*\{([^}]+)\})\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const [raw, defaultImport, namedOnly, defaultWithNamed, namedWithDefault, module] = match;
      
      if (defaultImport) {
        imports.push({ module, defaultImport, raw });
      } else if (namedOnly) {
        const namedImports = namedOnly.split(',').map(n => n.trim());
        imports.push({ module, namedImports, raw });
      } else if (defaultWithNamed && namedWithDefault) {
        const namedImports = namedWithDefault.split(',').map(n => n.trim());
        imports.push({ module, defaultImport: defaultWithNamed, namedImports, raw });
      }
    }
    
    return imports;
  }

  /**
   * Check if an import already exists
   */
  public hasImport(module: string, importName?: string): boolean {
    const imports = this.extractImports();
    
    return imports.some(imp => {
      if (imp.module !== module) return false;
      
      if (!importName) return true;
      
      if (imp.defaultImport === importName) return true;
      if (imp.namedImports?.includes(importName)) return true;
      
      return false;
    });
  }

  /**
   * Get line content at specific line number
   */
  public getLineContent(lineNumber: number): string {
    if (!this.model) return '';
    
    if (lineNumber < 1 || lineNumber > this.model.getLineCount()) {
      return '';
    }
    
    return this.model.getLineContent(lineNumber);
  }

  /**
   * Find optimal insertion point for a component
   */
  public findOptimalInsertionPoint(): Position | null {
    if (!this.editor || !this.model) return null;

    const position = this.editor.getPosition();
    if (position) return { line: position.lineNumber, column: position.column };

    // Default to end of file
    const lastLine = this.model.getLineCount();
    return { line: lastLine, column: 1 };
  }
}

export default CodeIntegrationService;