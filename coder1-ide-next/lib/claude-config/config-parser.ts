/**
 * Config Parser Service
 * Parses markdown and shell script configs to extract metadata
 */

import { 
  ConfigType, 
  ConfigParseResult, 
  ConfigMetadata,
  Permission,
  ValidationError
} from './types';

export class ConfigParser {
  private static instance: ConfigParser;

  private constructor() {}

  public static getInstance(): ConfigParser {
    if (!ConfigParser.instance) {
      ConfigParser.instance = new ConfigParser();
    }
    return ConfigParser.instance;
  }

  /**
   * Parse config content and extract metadata
   */
  public parseConfig(content: string, type: ConfigType): ConfigParseResult {
    switch (type) {
      case 'agent':
      case 'skill':
      case 'command':
        return this.parseMarkdownConfig(content, type);
      case 'hook':
        return this.parseShellScriptConfig(content);
      default:
        throw new ValidationError(`Unknown config type: ${type}`);
    }
  }

  /**
   * Parse markdown config (agents, skills, commands)
   */
  private parseMarkdownConfig(content: string, type: ConfigType): ConfigParseResult {
    const lines = content.split('\n');
    
    let name = '';
    let description = '';
    const tags: string[] = [];
    const permissions: string[] = [];

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ') && !name) {
        name = line.replace(/^#\s+/, '').trim();
        continue;
      }

      if (line.startsWith('##') && line.toLowerCase().includes('purpose')) {
        if (i + 1 < lines.length) {
          description = lines[i + 1].trim();
        }
        continue;
      }

      if (!description && line.length > 20 && !line.startsWith('#') && !line.startsWith('**')) {
        description = line;
      }

      if (line.toLowerCase().includes('permission')) {
        const permMatches = line.match(/\b(read|write|execute|network|filesystem)\b/gi);
        if (permMatches) {
          permissions.push(...permMatches.map(p => p.toLowerCase()));
        }
      }

      if (line.toLowerCase().includes('tag')) {
        const tagMatches = line.match(/\[(.*?)\]/g);
        if (tagMatches) {
          const extractedTags = tagMatches
            .map(t => t.replace(/[\[\]]/g, ''))
            .flatMap(t => t.split(','))
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);
          tags.push(...extractedTags);
        }
      }
    }

    if (!name) {
      name = this.extractFirstHeading(content) || `Unnamed ${type}`;
    }

    if (!description) {
      description = this.extractFirstParagraph(content) || `A ${type} configuration`;
    }

    return {
      name,
      description: description.substring(0, 200),
      content,
      metadata: {
        type,
        permissions: [...new Set(permissions)],
        tags: [...new Set(tags)]
      }
    };
  }

  /**
   * Parse shell script config (hooks)
   */
  private parseShellScriptConfig(content: string): ConfigParseResult {
    const lines = content.split('\n');
    
    let name = '';
    let description = '';
    const tags: string[] = [];
    const permissions: string[] = ['read', 'write', 'execute'];

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ') && !line.startsWith('#!/') && !name) {
        name = line.replace(/^#\s+/, '').trim();
        continue;
      }

      if (line.startsWith('# ') && !line.startsWith('#!/') && !description && name) {
        const possibleDesc = line.replace(/^#\s+/, '').trim();
        if (possibleDesc.length > 20) {
          description = possibleDesc;
        }
        continue;
      }

      if (line.includes('git ')) tags.push('git');
      if (line.includes('npm ') || line.includes('yarn ')) tags.push('node');
      if (line.includes('test')) tags.push('testing');
      if (line.includes('lint')) tags.push('linting');
      if (line.includes('format')) tags.push('formatting');
      if (line.includes('tsc')) tags.push('typescript');
    }

    if (!name) {
      name = this.extractHookName(content) || 'Unnamed Hook';
    }

    if (!description) {
      description = this.extractScriptDescription(content) || 'A shell script hook';
    }

    return {
      name,
      description: description.substring(0, 200),
      content,
      metadata: {
        type: 'hook',
        permissions,
        tags: [...new Set(tags)]
      }
    };
  }

  /**
   * Extract first markdown heading
   */
  private extractFirstHeading(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract first paragraph
   */
  private extractFirstParagraph(content: string): string | null {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20 && !trimmed.startsWith('#') && !trimmed.startsWith('**')) {
        return trimmed;
      }
    }
    
    return null;
  }

  /**
   * Extract hook name from comments
   */
  private extractHookName(content: string): string | null {
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('# ') && !line.startsWith('#!/')) {
        return line.replace(/^#\s+/, '').replace(/\s+Hook$/i, '').trim();
      }
    }
    
    return null;
  }

  /**
   * Extract script description
   */
  private extractScriptDescription(content: string): string | null {
    const lines = content.split('\n');
    let foundName = false;
    
    for (const line of lines) {
      if (line.startsWith('# ') && !line.startsWith('#!/')) {
        if (foundName) {
          const desc = line.replace(/^#\s+/, '').trim();
          if (desc.length > 15) {
            return desc;
          }
        } else {
          foundName = true;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract capabilities from markdown content
   */
  public extractCapabilities(content: string): string[] {
    const capabilities: string[] = [];
    const lines = content.split('\n');
    
    let inCapabilitiesSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().includes('capabilit') || 
          trimmed.toLowerCase().includes('feature') ||
          trimmed.toLowerCase().includes('what it does')) {
        inCapabilitiesSection = true;
        continue;
      }
      
      if (inCapabilitiesSection) {
        if (trimmed.startsWith('##') || trimmed.startsWith('###')) {
          inCapabilitiesSection = false;
          continue;
        }
        
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const capability = trimmed.replace(/^[-*]\s+/, '').trim();
          if (capability.length > 10 && capability.length < 100) {
            capabilities.push(capability);
          }
        }
      }
    }
    
    if (capabilities.length === 0) {
      const implicitCapabilities = this.extractImplicitCapabilities(content);
      capabilities.push(...implicitCapabilities);
    }
    
    return capabilities.slice(0, 10);
  }

  /**
   * Extract implicit capabilities from headings and content
   */
  private extractImplicitCapabilities(content: string): string[] {
    const capabilities: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        const heading = trimmed.replace(/^#{2,3}\s+/, '').trim();
        
        if (heading.length > 10 && heading.length < 80 && 
            !heading.toLowerCase().includes('example') &&
            !heading.toLowerCase().includes('usage')) {
          capabilities.push(heading);
        }
      }
    }
    
    return capabilities.slice(0, 5);
  }

  /**
   * Extract permissions mentioned in content
   */
  public extractPermissions(content: string): Permission[] {
    const permissions = new Set<Permission>();
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('read') || contentLower.includes('view') || contentLower.includes('get')) {
      permissions.add('read');
    }
    
    if (contentLower.includes('write') || contentLower.includes('create') || contentLower.includes('update') || contentLower.includes('save')) {
      permissions.add('write');
    }
    
    if (contentLower.includes('execute') || contentLower.includes('run') || contentLower.includes('command')) {
      permissions.add('execute');
    }
    
    if (contentLower.includes('network') || contentLower.includes('http') || contentLower.includes('api') || contentLower.includes('fetch')) {
      permissions.add('network');
    }
    
    if (contentLower.includes('filesystem') || contentLower.includes('file system') || contentLower.includes('directory')) {
      permissions.add('filesystem');
    }
    
    return Array.from(permissions);
  }

  /**
   * Extract tags from content
   */
  public extractTags(content: string, type: ConfigType): string[] {
    const tags = new Set<string>();
    const contentLower = content.toLowerCase();
    
    tags.add(type);
    
    const keywords = {
      'react': ['react', 'jsx', 'tsx', 'component'],
      'typescript': ['typescript', 'ts', 'type'],
      'testing': ['test', 'jest', 'testing', 'spec'],
      'git': ['git', 'commit', 'branch', 'merge'],
      'api': ['api', 'endpoint', 'rest', 'http'],
      'database': ['database', 'sql', 'query', 'db'],
      'security': ['security', 'auth', 'permission', 'encrypt'],
      'performance': ['performance', 'optimize', 'cache', 'speed'],
      'debugging': ['debug', 'error', 'bug', 'troubleshoot'],
      'documentation': ['document', 'readme', 'guide', 'docs']
    };
    
    for (const [tag, keywords_list] of Object.entries(keywords)) {
      if (keywords_list.some(kw => contentLower.includes(kw))) {
        tags.add(tag);
      }
    }
    
    return Array.from(tags).slice(0, 8);
  }

  /**
   * Validate config structure
   */
  public validateConfig(content: string, type: ConfigType): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!content || content.trim().length === 0) {
      errors.push('Config content is empty');
      return { valid: false, errors, warnings };
    }
    
    if (content.length < 50) {
      errors.push('Config content is too short (minimum 50 characters)');
    }
    
    if (content.length > 100000) {
      errors.push('Config content is too large (maximum 100KB)');
    }
    
    if (type === 'hook') {
      if (!content.startsWith('#!/bin/bash') && !content.startsWith('#!/bin/sh')) {
        warnings.push('Hook script should start with shebang (#!/bin/bash)');
      }
      
      if (!content.includes('set -e')) {
        warnings.push('Consider adding "set -e" to exit on errors');
      }
    } else {
      if (!content.includes('# ')) {
        warnings.push('Config should include markdown headings');
      }
    }
    
    const parsed = this.parseConfig(content, type);
    
    if (parsed.name === `Unnamed ${type}`) {
      warnings.push('Config should have a clear name/title');
    }
    
    if (parsed.description.includes('A ' + type)) {
      warnings.push('Config should have a descriptive summary');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate config metadata from content
   */
  public generateMetadata(content: string, type: ConfigType): ConfigMetadata {
    return {
      permissions: this.extractPermissions(content),
      tags: this.extractTags(content, type),
      capabilities: this.extractCapabilities(content)
    };
  }

  /**
   * Parse frontmatter if exists (YAML-style)
   */
  private parseFrontmatter(content: string): Record<string, any> | null {
    const frontmatterRegex = /^---\n([\s\S]+?)\n---\n/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return null;
    }
    
    const frontmatter: Record<string, any> = {};
    const lines = match[1].split('\n');
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return frontmatter;
  }

  /**
   * Extract code examples from markdown
   */
  public extractCodeExamples(content: string): Array<{
    language: string;
    code: string;
  }> {
    const examples: Array<{ language: string; code: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      examples.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }
    
    return examples;
  }

  /**
   * Estimate reading time (words per minute)
   */
  public estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Get config summary
   */
  public getSummary(content: string, type: ConfigType): {
    wordCount: number;
    readingTime: number;
    codeExamples: number;
    sections: number;
  } {
    const words = content.split(/\s+/).length;
    const readingTime = this.estimateReadingTime(content);
    const codeExamples = this.extractCodeExamples(content).length;
    const sections = (content.match(/^#{1,3}\s+/gm) || []).length;
    
    return {
      wordCount: words,
      readingTime,
      codeExamples,
      sections
    };
  }
}

export const configParser = ConfigParser.getInstance();

export function parseConfig(content: string, type: ConfigType): ConfigParseResult {
  return configParser.parseConfig(content, type);
}

export function extractCapabilities(content: string): string[] {
  return configParser.extractCapabilities(content);
}

export function validateConfig(content: string, type: ConfigType) {
  return configParser.validateConfig(content, type);
}
