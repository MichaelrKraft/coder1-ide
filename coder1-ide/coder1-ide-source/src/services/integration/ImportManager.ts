/**
 * Import Manager Service
 * Intelligently manages imports, merges duplicates, and ensures proper ordering
 */

import { ImportStatement } from './CodeIntegrationService';

export interface ImportGroup {
  react: ImportStatement[];
  thirdParty: ImportStatement[];
  local: ImportStatement[];
  styles: ImportStatement[];
}

class ImportManager {
  private static instance: ImportManager;

  private constructor() {}

  public static getInstance(): ImportManager {
    if (!ImportManager.instance) {
      ImportManager.instance = new ImportManager();
    }
    return ImportManager.instance;
  }

  /**
   * Parse imports from component code
   */
  public parseComponentImports(componentCode: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const lines = componentCode.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import ')) {
        // Stop parsing after imports section
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
          break;
        }
        continue;
      }

      const parsed = this.parseImportLine(trimmed);
      if (parsed) {
        imports.push(parsed);
      }
    }

    return imports;
  }

  /**
   * Parse a single import line
   */
  private parseImportLine(line: string): ImportStatement | null {
    // Remove 'import ' prefix and trailing semicolon
    const cleanLine = line.replace(/^import\s+/, '').replace(/;?\s*$/, '');
    
    // Match different import patterns
    // Default import: React from 'react'
    const defaultMatch = cleanLine.match(/^(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultMatch) {
      return {
        module: defaultMatch[2],
        defaultImport: defaultMatch[1],
        raw: line
      };
    }

    // Named imports: { useState, useEffect } from 'react'
    const namedMatch = cleanLine.match(/^\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/);
    if (namedMatch) {
      const namedImports = namedMatch[1].split(',').map(n => n.trim());
      return {
        module: namedMatch[2],
        namedImports,
        raw: line
      };
    }

    // Combined: React, { useState } from 'react'
    const combinedMatch = cleanLine.match(/^(\w+),\s*\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/);
    if (combinedMatch) {
      const namedImports = combinedMatch[2].split(',').map(n => n.trim());
      return {
        module: combinedMatch[3],
        defaultImport: combinedMatch[1],
        namedImports,
        raw: line
      };
    }

    // Side effect import: import 'styles.css'
    const sideEffectMatch = cleanLine.match(/^['"]([^'"]+)['"]/);
    if (sideEffectMatch) {
      return {
        module: sideEffectMatch[1],
        raw: line
      };
    }

    return null;
  }

  /**
   * Merge new imports with existing imports
   */
  public mergeImports(
    existing: ImportStatement[],
    newImports: ImportStatement[]
  ): ImportStatement[] {
    const merged = [...existing];
    const moduleMap = new Map<string, ImportStatement>();

    // Build map of existing imports
    for (const imp of existing) {
      moduleMap.set(imp.module, imp);
    }

    // Merge new imports
    for (const newImp of newImports) {
      const existingImp = moduleMap.get(newImp.module);

      if (!existingImp) {
        // New module, add it
        merged.push(newImp);
        moduleMap.set(newImp.module, newImp);
      } else {
        // Module exists, merge imports
        const mergedImp = this.mergeImportStatements(existingImp, newImp);
        const index = merged.findIndex(imp => imp.module === newImp.module);
        if (index >= 0) {
          merged[index] = mergedImp;
        }
      }
    }

    return this.sortImports(merged);
  }

  /**
   * Merge two import statements from the same module
   */
  private mergeImportStatements(
    existing: ImportStatement,
    newImport: ImportStatement
  ): ImportStatement {
    const merged: ImportStatement = {
      module: existing.module,
      raw: ''
    };

    // Merge default imports
    if (existing.defaultImport || newImport.defaultImport) {
      merged.defaultImport = existing.defaultImport || newImport.defaultImport;
    }

    // Merge named imports
    const allNamed = new Set<string>();
    
    if (existing.namedImports) {
      existing.namedImports.forEach(n => allNamed.add(n));
    }
    
    if (newImport.namedImports) {
      newImport.namedImports.forEach(n => allNamed.add(n));
    }
    
    if (allNamed.size > 0) {
      merged.namedImports = Array.from(allNamed).sort();
    }

    return merged;
  }

  /**
   * Sort imports into logical groups
   */
  public sortImports(imports: ImportStatement[]): ImportStatement[] {
    const groups = this.groupImports(imports);
    
    // Sort within each group
    groups.react.sort((a, b) => this.compareImports(a, b));
    groups.thirdParty.sort((a, b) => this.compareImports(a, b));
    groups.local.sort((a, b) => this.compareImports(a, b));
    groups.styles.sort((a, b) => this.compareImports(a, b));

    // Combine groups in order
    return [
      ...groups.react,
      ...groups.thirdParty,
      ...groups.local,
      ...groups.styles
    ];
  }

  /**
   * Group imports by type
   */
  private groupImports(imports: ImportStatement[]): ImportGroup {
    const groups: ImportGroup = {
      react: [],
      thirdParty: [],
      local: [],
      styles: []
    };

    for (const imp of imports) {
      if (this.isStyleImport(imp.module)) {
        groups.styles.push(imp);
      } else if (this.isReactImport(imp.module)) {
        groups.react.push(imp);
      } else if (this.isLocalImport(imp.module)) {
        groups.local.push(imp);
      } else {
        groups.thirdParty.push(imp);
      }
    }

    return groups;
  }

  /**
   * Check if import is for React/React-related library
   */
  private isReactImport(module: string): boolean {
    return module === 'react' || 
           module.startsWith('react-') || 
           module.startsWith('@react');
  }

  /**
   * Check if import is for styles
   */
  private isStyleImport(module: string): boolean {
    return module.endsWith('.css') || 
           module.endsWith('.scss') || 
           module.endsWith('.sass') || 
           module.endsWith('.less') ||
           module.endsWith('.module.css') ||
           module.endsWith('.module.scss');
  }

  /**
   * Check if import is local (relative path)
   */
  private isLocalImport(module: string): boolean {
    return module.startsWith('.') || module.startsWith('/');
  }

  /**
   * Compare two imports for sorting
   */
  private compareImports(a: ImportStatement, b: ImportStatement): number {
    // Sort by module name
    return a.module.localeCompare(b.module);
  }

  /**
   * Generate import code from ImportStatement
   */
  public generateImportCode(imports: ImportStatement[]): string {
    return imports.map(imp => this.generateSingleImport(imp)).join('\n');
  }

  /**
   * Generate a single import statement
   */
  private generateSingleImport(imp: ImportStatement): string {
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
    } else {
      // Side effect import
      return `import '${imp.module}';`;
    }
    
    statement += ` from '${imp.module}';`;
    
    return statement;
  }

  /**
   * Extract required imports from generated component code
   */
  public extractRequiredImports(componentCode: string, framework: string): ImportStatement[] {
    const imports = this.parseComponentImports(componentCode);
    const required: ImportStatement[] = [];

    // Always include React for React components
    if ((framework === 'React' || framework === 'Next') && 
        !imports.some(imp => imp.module === 'react')) {
      // Check if component uses hooks or other React features
      const needsReact = componentCode.includes('useState') ||
                        componentCode.includes('useEffect') ||
                        componentCode.includes('useCallback') ||
                        componentCode.includes('useMemo') ||
                        componentCode.includes('useRef');

      if (needsReact) {
        const hooks: string[] = [];
        if (componentCode.includes('useState')) hooks.push('useState');
        if (componentCode.includes('useEffect')) hooks.push('useEffect');
        if (componentCode.includes('useCallback')) hooks.push('useCallback');
        if (componentCode.includes('useMemo')) hooks.push('useMemo');
        if (componentCode.includes('useRef')) hooks.push('useRef');

        required.push({
          module: 'react',
          defaultImport: 'React',
          namedImports: hooks.length > 0 ? hooks : undefined,
          raw: ''
        });
      } else if (componentCode.includes('JSX') || componentCode.includes('</')) {
        required.push({
          module: 'react',
          defaultImport: 'React',
          raw: ''
        });
      }
    }

    // Add other imports from the component
    required.push(...imports);

    return required;
  }

  /**
   * Check if component needs specific imports based on code analysis
   */
  public analyzeImportNeeds(code: string): string[] {
    const needs: string[] = [];

    // React hooks
    if (code.includes('useState(')) needs.push('useState');
    if (code.includes('useEffect(')) needs.push('useEffect');
    if (code.includes('useCallback(')) needs.push('useCallback');
    if (code.includes('useMemo(')) needs.push('useMemo');
    if (code.includes('useRef(')) needs.push('useRef');
    if (code.includes('useContext(')) needs.push('useContext');
    if (code.includes('useReducer(')) needs.push('useReducer');

    // Common libraries
    if (code.includes('clsx(') || code.includes('cn(')) needs.push('clsx');
    if (code.includes('axios.')) needs.push('axios');
    if (code.includes('moment(')) needs.push('moment');
    if (code.includes('lodash.') || code.includes('_.')) needs.push('lodash');

    return needs;
  }

  /**
   * Remove unused imports from a list
   */
  public removeUnusedImports(
    imports: ImportStatement[],
    code: string
  ): ImportStatement[] {
    return imports.filter(imp => {
      // Always keep side effect imports
      if (!imp.defaultImport && !imp.namedImports) {
        return true;
      }

      // Check if default import is used
      if (imp.defaultImport && !this.isIdentifierUsed(imp.defaultImport, code)) {
        return false;
      }

      // Check named imports
      if (imp.namedImports) {
        const usedNamed = imp.namedImports.filter(name => 
          this.isIdentifierUsed(name, code)
        );
        
        if (usedNamed.length === 0 && !imp.defaultImport) {
          return false;
        }
        
        // Update the import with only used named imports
        if (usedNamed.length > 0 && usedNamed.length < imp.namedImports.length) {
          imp.namedImports = usedNamed;
        }
      }

      return true;
    });
  }

  /**
   * Check if an identifier is used in code (excluding import statements)
   */
  private isIdentifierUsed(identifier: string, code: string): boolean {
    // Remove import statements from code
    const codeWithoutImports = code
      .split('\n')
      .filter(line => !line.trim().startsWith('import '))
      .join('\n');

    // Create regex to match identifier as a whole word
    const regex = new RegExp(`\\b${identifier}\\b`, 'g');
    return regex.test(codeWithoutImports);
  }
}

export default ImportManager;