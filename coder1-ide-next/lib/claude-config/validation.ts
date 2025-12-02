/**
 * Validation Service
 * Validates config data, syntax, and structure
 */

import { 
  ConfigType, 
  ConfigLocation,
  Permission,
  ConfigValidationResult,
  VALIDATION_RULES,
  ValidationError
} from './types';

export class Validation {
  private static instance: Validation;

  private constructor() {}

  public static getInstance(): Validation {
    if (!Validation.instance) {
      Validation.instance = new Validation();
    }
    return Validation.instance;
  }

  /**
   * Validate config name
   */
  public validateName(name: string): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
      return { valid: false, errors, warnings, suggestions };
    }

    const trimmed = name.trim();

    if (trimmed.length < VALIDATION_RULES.name.minLength) {
      errors.push(`Name must be at least ${VALIDATION_RULES.name.minLength} characters`);
    }

    if (trimmed.length > VALIDATION_RULES.name.maxLength) {
      errors.push(`Name must not exceed ${VALIDATION_RULES.name.maxLength} characters`);
    }

    if (!VALIDATION_RULES.name.pattern.test(trimmed)) {
      errors.push('Name can only contain letters, numbers, spaces, hyphens, and underscores');
      suggestions.push('Example: "Frontend Engineer" or "pre-commit-hook"');
    }

    if (trimmed.includes('  ')) {
      warnings.push('Name contains multiple consecutive spaces');
      suggestions.push('Use single spaces between words');
    }

    if (trimmed !== name) {
      warnings.push('Name has leading or trailing whitespace');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate config description
   */
  public validateDescription(description: string): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!description || description.trim().length === 0) {
      errors.push('Description is required');
      return { valid: false, errors, warnings, suggestions };
    }

    const trimmed = description.trim();

    if (trimmed.length < VALIDATION_RULES.description.minLength) {
      errors.push(`Description must be at least ${VALIDATION_RULES.description.minLength} characters`);
      suggestions.push('Provide a clear explanation of what this config does');
    }

    if (trimmed.length > VALIDATION_RULES.description.maxLength) {
      errors.push(`Description must not exceed ${VALIDATION_RULES.description.maxLength} characters`);
      suggestions.push('Keep description concise and focused');
    }

    if (trimmed.split(' ').length < 3) {
      warnings.push('Description is very short');
      suggestions.push('Add more detail about what this config does');
    }

    if (!trimmed.match(/[.!?]$/)) {
      warnings.push('Description should end with punctuation');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate config content
   */
  public validateContent(
    content: string,
    type: ConfigType
  ): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Content is required');
      return { valid: false, errors, warnings, suggestions };
    }

    if (content.length < VALIDATION_RULES.content.minLength) {
      errors.push(`Content must be at least ${VALIDATION_RULES.content.minLength} characters`);
    }

    if (content.length > VALIDATION_RULES.content.maxLength) {
      errors.push(`Content must not exceed ${VALIDATION_RULES.content.maxLength} characters`);
      suggestions.push('Consider splitting into multiple configs');
    }

    if (type === 'hook') {
      this.validateShellScript(content, errors, warnings, suggestions);
    } else {
      this.validateMarkdown(content, errors, warnings, suggestions);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate shell script content
   */
  private validateShellScript(
    content: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!content.startsWith('#!/bin/bash') && !content.startsWith('#!/bin/sh')) {
      warnings.push('Script should start with shebang (#!/bin/bash or #!/bin/sh)');
      suggestions.push('Add "#!/bin/bash" as the first line');
    }

    if (!content.includes('set -e') && !content.includes('set -o errexit')) {
      warnings.push('Consider adding "set -e" to exit on errors');
      suggestions.push('Add "set -e" after the shebang for safer execution');
    }

    const dangerousCommands = ['rm -rf /', 'rm -rf ~', 'dd if=/dev/zero', 'mkfs', ':(){:|:&};:'];
    dangerousCommands.forEach(cmd => {
      if (content.includes(cmd)) {
        errors.push(`Dangerous command detected: ${cmd}`);
      }
    });

    if (content.includes('eval ')) {
      warnings.push('Use of "eval" detected, which can be dangerous');
      suggestions.push('Avoid using eval when possible');
    }

    if (!content.includes('# ')) {
      warnings.push('Script has no comments');
      suggestions.push('Add comments to explain what the script does');
    }
  }

  /**
   * Validate markdown content
   */
  private validateMarkdown(
    content: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!content.includes('# ')) {
      warnings.push('No markdown headings found');
      suggestions.push('Add headings to structure the content');
    }

    if (!content.includes('##')) {
      warnings.push('No subheadings found');
      suggestions.push('Use ## for sections to improve readability');
    }

    const headingMatches = content.match(/^#+ /gm);
    if (headingMatches && headingMatches.length > 20) {
      warnings.push('Many headings detected, might be too fragmented');
    }

    const codeBlockMatches = content.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      errors.push('Unclosed code block detected');
      suggestions.push('Ensure all ``` are properly closed');
    }
  }

  /**
   * Validate config type
   */
  public validateType(type: string): ConfigValidationResult {
    const errors: string[] = [];
    const validTypes: ConfigType[] = ['agent', 'hook', 'skill', 'command'];

    if (!validTypes.includes(type as ConfigType)) {
      errors.push(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Validate config location
   */
  public validateLocation(location: string): ConfigValidationResult {
    const errors: string[] = [];
    const validLocations: ConfigLocation[] = ['local', 'global'];

    if (!validLocations.includes(location as ConfigLocation)) {
      errors.push(`Invalid location: ${location}. Must be one of: ${validLocations.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Validate permissions
   */
  public validatePermissions(permissions: string[]): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validPermissions: Permission[] = ['read', 'write', 'execute', 'network', 'filesystem'];

    permissions.forEach(perm => {
      if (!validPermissions.includes(perm as Permission)) {
        errors.push(`Invalid permission: ${perm}`);
      }
    });

    if (permissions.length === 0) {
      warnings.push('No permissions specified');
    }

    const hasWrite = permissions.includes('write');
    const hasExecute = permissions.includes('execute');

    if (hasWrite && hasExecute) {
      warnings.push('Config has both write and execute permissions - review carefully');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  /**
   * Validate complete config object
   */
  public validateCompleteConfig(config: {
    name: string;
    description: string;
    content: string;
    type: string;
    location: string;
    permissions?: string[];
  }): ConfigValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allSuggestions: string[] = [];

    const nameResult = this.validateName(config.name);
    allErrors.push(...nameResult.errors);
    allWarnings.push(...nameResult.warnings);
    allSuggestions.push(...nameResult.suggestions);

    const descResult = this.validateDescription(config.description);
    allErrors.push(...descResult.errors);
    allWarnings.push(...descResult.warnings);
    allSuggestions.push(...descResult.suggestions);

    const typeResult = this.validateType(config.type);
    allErrors.push(...typeResult.errors);

    const locationResult = this.validateLocation(config.location);
    allErrors.push(...locationResult.errors);

    if (typeResult.valid) {
      const contentResult = this.validateContent(config.content, config.type as ConfigType);
      allErrors.push(...contentResult.errors);
      allWarnings.push(...contentResult.warnings);
      allSuggestions.push(...contentResult.suggestions);
    }

    if (config.permissions) {
      const permResult = this.validatePermissions(config.permissions);
      allErrors.push(...permResult.errors);
      allWarnings.push(...permResult.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions
    };
  }

  /**
   * Sanitize config name for file system
   */
  public sanitizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Validate user prompt for AI generation
   */
  public validatePrompt(prompt: string): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!prompt || prompt.trim().length === 0) {
      errors.push('Prompt is required');
      return { valid: false, errors, warnings, suggestions };
    }

    if (prompt.trim().length < 10) {
      errors.push('Prompt is too short - please provide more detail');
      suggestions.push('Describe what you want the config to do');
    }

    if (prompt.length > 500) {
      warnings.push('Prompt is very long');
      suggestions.push('Consider breaking into multiple configs');
    }

    const hasContext = prompt.match(/(create|build|make|generate|write)/i);
    if (!hasContext) {
      warnings.push('Prompt should specify what to create');
      suggestions.push('Start with "Create an agent that..." or similar');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check for common security issues
   */
  public validateSecurity(content: string): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const sensitivePatterns = [
      { pattern: /password\s*=\s*['"]\w+['"]/, message: 'Hardcoded password detected' },
      { pattern: /api[_-]?key\s*=\s*['"]\w+['"]/, message: 'Hardcoded API key detected' },
      { pattern: /secret\s*=\s*['"]\w+['"]/, message: 'Hardcoded secret detected' },
      { pattern: /token\s*=\s*['"]\w+['"]/, message: 'Hardcoded token detected' }
    ];

    sensitivePatterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        errors.push(message);
        suggestions.push('Use environment variables instead of hardcoded credentials');
      }
    });

    if (content.includes('chmod 777') || content.includes('chmod -R 777')) {
      warnings.push('Overly permissive file permissions detected');
      suggestions.push('Use more restrictive permissions like 755 or 644');
    }

    if (content.includes('sudo ')) {
      warnings.push('Use of sudo detected');
      suggestions.push('Avoid requiring sudo when possible');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
}

export const validation = Validation.getInstance();

export function validateName(name: string): ConfigValidationResult {
  return validation.validateName(name);
}

export function validateContent(content: string, type: ConfigType): ConfigValidationResult {
  return validation.validateContent(content, type);
}

export function validateCompleteConfig(config: any): ConfigValidationResult {
  return validation.validateCompleteConfig(config);
}

export function sanitizeName(name: string): string {
  return validation.sanitizeName(name);
}
