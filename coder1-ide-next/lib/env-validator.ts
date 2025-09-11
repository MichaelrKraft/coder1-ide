/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before the app starts
 */

type EnvVarConfig = {
  name: string;
  required: boolean;
  defaultValue?: string;
  validate?: (value: string) => boolean;
  description: string;
};

const ENV_CONFIG: EnvVarConfig[] = [
  // Core Configuration
  {
    name: 'NODE_ENV',
    required: false,
    defaultValue: 'development',
    validate: (v) => ['development', 'production', 'test'].includes(v),
    description: 'Node environment (development, production, test)'
  },
  {
    name: 'PORT',
    required: false,
    defaultValue: '3001',
    validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) < 65536,
    description: 'Server port number (1-65535)'
  },
  
  // Claude CLI Integration - No API keys needed!
  {
    name: 'CLAUDE_CLI_PATH',
    required: false,
    description: 'Custom path to Claude CLI executable (auto-detected if not set)'
  },
  
  // Database Configuration
  {
    name: 'DATABASE_URL',
    required: false,
    defaultValue: 'sqlite://./data/coder1.db',
    description: 'Database connection string'
  },
  
  // Authentication
  {
    name: 'JWT_SECRET',
    required: false,
    defaultValue: process.env.NODE_ENV === 'development' ? 'dev-secret-change-in-production' : undefined,
    validate: (v) => v.length >= 32,
    description: 'JWT secret for authentication (min 32 chars)'
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: false,
    defaultValue: process.env.NODE_ENV === 'development' ? 'dev-nextauth-secret' : undefined,
    validate: (v) => v.length >= 32,
    description: 'NextAuth secret for session management'
  },
  {
    name: 'NEXTAUTH_URL',
    required: false,
    defaultValue: 'http://localhost:3001',
    description: 'NextAuth callback URL'
  },
  
  // Feature Flags
  {
    name: 'ENABLE_SUPERVISION',
    required: false,
    defaultValue: 'true',
    validate: (v) => ['true', 'false'].includes(v.toLowerCase()),
    description: 'Enable AI supervision in terminal'
  },
  {
    name: 'ENABLE_SESSION_SUMMARY',
    required: false,
    defaultValue: 'true',
    validate: (v) => ['true', 'false'].includes(v.toLowerCase()),
    description: 'Enable session summary feature'
  },
  {
    name: 'ENABLE_CONTAINERS',
    required: false,
    defaultValue: 'false',
    validate: (v) => ['true', 'false'].includes(v.toLowerCase()),
    description: 'Enable container/sandbox features'
  },
  
  // External Services
  {
    name: 'GITHUB_CLIENT_ID',
    required: false,
    description: 'GitHub OAuth client ID'
  },
  {
    name: 'GITHUB_CLIENT_SECRET',
    required: false,
    description: 'GitHub OAuth client secret'
  },
  {
    name: 'GOOGLE_CLIENT_ID',
    required: false,
    description: 'Google OAuth client ID'
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: false,
    description: 'Google OAuth client secret'
  },
  
  // Performance & Limits
  {
    name: 'MAX_FILE_SIZE',
    required: false,
    defaultValue: '10485760', // 10MB
    validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0,
    description: 'Maximum file size in bytes'
  },
  {
    name: 'REQUEST_TIMEOUT',
    required: false,
    defaultValue: '30000', // 30 seconds
    validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0,
    description: 'Request timeout in milliseconds'
  },
  {
    name: 'MAX_TERMINAL_SESSIONS',
    required: false,
    defaultValue: '10',
    validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0,
    description: 'Maximum concurrent terminal sessions'
  }
];

export class EnvValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  private values: Record<string, string> = {};

  constructor() {
    this.validate();
  }

  private validate(): void {
    for (const config of ENV_CONFIG) {
      const value = process.env[config.name] || config.defaultValue;
      
      if (config.required && !value) {
        this.errors.push(`Missing required environment variable: ${config.name} - ${config.description}`);
        continue;
      }
      
      if (value) {
        if (config.validate && !config.validate(value)) {
          this.errors.push(`Invalid value for ${config.name}: "${value}" - ${config.description}`);
          continue;
        }
        this.values[config.name] = value;
        
        // Set default values in process.env if not already set
        if (!process.env[config.name] && config.defaultValue) {
          process.env[config.name] = config.defaultValue;
        }
      }
    }
    
    // Special validations
    if (process.env.NODE_ENV === 'development') {
      this.warnings.push('Claude CLI integration will be auto-detected on startup');
    }
    
    if (process.env.NODE_ENV === 'production') {
      if (this.values.JWT_SECRET === 'dev-secret-change-in-production') {
        this.errors.push('JWT_SECRET must be changed from default value in production');
      }
      if (!this.values.DATABASE_URL || this.values.DATABASE_URL.includes('sqlite')) {
        this.warnings.push('Using SQLite in production is not recommended');
      }
    }
  }

  public getErrors(): string[] {
    return this.errors;
  }

  public getWarnings(): string[] {
    return this.warnings;
  }

  public isValid(): boolean {
    return this.errors.length === 0;
  }

  public getReport(): string {
    const lines: string[] = [
      '====================================',
      '  Environment Variable Validation',
      '====================================',
      ''
    ];

    if (this.errors.length > 0) {
      lines.push('❌ ERRORS (must fix):');
      this.errors.forEach(err => lines.push(`  - ${err}`));
      lines.push('');
    }

    if (this.warnings.length > 0) {
      lines.push('⚠️  WARNINGS (optional):');
      this.warnings.forEach(warn => lines.push(`  - ${warn}`));
      lines.push('');
    }

    if (this.errors.length === 0) {
      lines.push('✅ All required environment variables are valid');
      lines.push('');
      lines.push('Configured values:');
      Object.entries(this.values).forEach(([key, value]) => {
        // Mask sensitive values
        if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
          const masked = value.substring(0, 4) + '****' + value.substring(value.length - 4);
          lines.push(`  ${key}: ${masked}`);
        } else {
          lines.push(`  ${key}: ${value}`);
        }
      });
    }

    lines.push('');
    lines.push('====================================');
    
    return lines.join('\n');
  }

  public static generateEnvExample(): string {
    const lines: string[] = [
      '# Coder1 IDE Environment Variables',
      '# Copy this file to .env.local and update with your values',
      '',
      '# ====== Core Configuration ======',
    ];

    let currentSection = 'Core';
    
    for (const config of ENV_CONFIG) {
      // Add section headers
      if (config.name.includes('API_KEY') && currentSection !== 'API') {
        currentSection = 'API';
        lines.push('');
        lines.push('# ====== API Keys ======');
      } else if (config.name.includes('DATABASE') && currentSection !== 'Database') {
        currentSection = 'Database';
        lines.push('');
        lines.push('# ====== Database ======');
      } else if (config.name.includes('AUTH') && currentSection !== 'Auth') {
        currentSection = 'Auth';
        lines.push('');
        lines.push('# ====== Authentication ======');
      } else if (config.name.includes('ENABLE_') && currentSection !== 'Features') {
        currentSection = 'Features';
        lines.push('');
        lines.push('# ====== Feature Flags ======');
      } else if (config.name.includes('GITHUB') || config.name.includes('GOOGLE')) {
        if (currentSection !== 'OAuth') {
          currentSection = 'OAuth';
          lines.push('');
          lines.push('# ====== OAuth Providers ======');
        }
      } else if (config.name.includes('MAX_') || config.name.includes('TIMEOUT')) {
        if (currentSection !== 'Limits') {
          currentSection = 'Limits';
          lines.push('');
          lines.push('# ====== Performance & Limits ======');
        }
      }
      
      lines.push(`# ${config.description}`);
      if (config.required) {
        lines.push('# REQUIRED');
      }
      if (config.validate) {
        lines.push(`# Format: ${config.validate.toString().match(/v\.startsWith\('([^']+)'\)/) ? 'starts with ' + config.validate.toString().match(/v\.startsWith\('([^']+)'\)/)?.[1] : 'see validation'}`);
      }
      
      const value = config.defaultValue || (config.name.includes('SECRET') ? 'your-secret-here' : '');
      lines.push(`${config.name}=${value}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance
export const envValidator = new EnvValidator();

// Helper to check specific env vars
export const getEnv = (key: string, defaultValue?: string): string => {
  return process.env[key] || defaultValue || '';
};

export const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const num = parseInt(value);
  return isNaN(num) ? defaultValue : num;
};