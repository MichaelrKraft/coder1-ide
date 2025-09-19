const path = require('path');
const fs = require('fs');

class Config {
  constructor() {
    this.defaultConfig = {
      security: {
        allowedOrigins: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://coder1-ide.com',
          'https://*.coder1-ide.com'
        ],
        jwtSecret: this.generateSecret(),
        rateLimiting: {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000 // 1 minute
        }
      },
      sync: {
        debounceMs: 100,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        ignoredPatterns: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/.cache/**'
        ]
      },
      claude: {
        timeout: 300000, // 5 minutes
        retries: 3,
        rateLimiting: {
          maxRequests: 10,
          windowMs: 60000 // 1 minute
        }
      },
      logging: {
        level: 'info',
        file: null // No file logging by default
      }
    };
    
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = this.getConfigPath();
      
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return this.mergeConfig(this.defaultConfig, userConfig);
      }
      
      // Create default config file
      this.saveConfig(this.defaultConfig);
      return { ...this.defaultConfig };
      
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error.message);
      return { ...this.defaultConfig };
    }
  }

  getConfigPath() {
    const homeDir = require('os').homedir();
    return path.join(homeDir, '.coder1-companion-config.json');
  }

  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        merged[key] = { ...defaultConfig[key], ...userConfig[key] };
      } else {
        merged[key] = userConfig[key];
      }
    }
    
    return merged;
  }

  get(path, defaultValue = null) {
    const keys = path.split('.');
    let current = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    this.saveConfig(this.config);
  }

  saveConfig(config) {
    try {
      const configPath = this.getConfigPath();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error.message);
    }
  }

  generateSecret() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  getAll() {
    return { ...this.config };
  }

  reset() {
    this.config = { ...this.defaultConfig };
    this.saveConfig(this.config);
  }
}

module.exports = { Config };