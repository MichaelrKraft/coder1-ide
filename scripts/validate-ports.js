#!/usr/bin/env node

/**
 * Port Configuration Validator for Coder1 IDE
 * 
 * This script validates that all configuration files have consistent
 * port settings to prevent "menu items don't work" issues.
 * 
 * Usage: node scripts/validate-ports.js
 * Or: npm run validate:ports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Expected configuration - UPDATED TO MATCH ACTUAL RUNNING SERVERS
const EXPECTED_CONFIG = {
  EXPRESS_BACKEND_PORT: '3000',
  NEXTJS_FRONTEND_PORT: '3001',
  BACKEND_URL: 'http://localhost:3000',
  WEBSOCKET_URL: 'ws://localhost:3000'
};

class PortValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logError(message) {
    this.errors.push(message);
    this.log(`❌ ERROR: ${message}`, 'red');
  }

  logWarning(message) {
    this.warnings.push(message);
    this.log(`⚠️  WARNING: ${message}`, 'yellow');
  }

  logSuccess(message) {
    this.log(`✅ ${message}`, 'green');
  }

  logInfo(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  readEnvFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const env = {};
      
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      return env;
    } catch (error) {
      this.logError(`Cannot read ${filePath}: ${error.message}`);
      return {};
    }
  }

  validateMainEnv() {
    this.logInfo('Validating main project .env file...');
    
    const envPath = path.join(this.projectRoot, '.env');
    const env = this.readEnvFile(envPath);
    
    if (!env.PORT) {
      this.logError('PORT not set in main .env file');
    } else if (env.PORT !== EXPECTED_CONFIG.EXPRESS_BACKEND_PORT) {
      this.logError(`PORT in .env is ${env.PORT}, expected ${EXPECTED_CONFIG.EXPRESS_BACKEND_PORT}`);
    } else {
      this.logSuccess(`Main .env PORT correctly set to ${env.PORT}`);
    }
  }

  validateNextJsEnv() {
    this.logInfo('Validating Next.js .env.local file...');
    
    const envLocalPath = path.join(this.projectRoot, 'coder1-ide-next', '.env.local');
    const env = this.readEnvFile(envLocalPath);
    
    // Check backend URL configurations
    const backendUrlKeys = [
      'EXPRESS_BACKEND_URL',
      'NEXT_PUBLIC_EXPRESS_BACKEND_URL'
    ];
    
    for (const key of backendUrlKeys) {
      if (!env[key]) {
        this.logError(`${key} not set in coder1-ide-next/.env.local`);
      } else if (env[key] !== EXPECTED_CONFIG.BACKEND_URL) {
        this.logError(`${key} is ${env[key]}, expected ${EXPECTED_CONFIG.BACKEND_URL}`);
      } else {
        this.logSuccess(`${key} correctly set to ${env[key]}`);
      }
    }
    
    // Check WebSocket URL
    if (!env.NEXT_PUBLIC_WEBSOCKET_URL) {
      this.logError('NEXT_PUBLIC_WEBSOCKET_URL not set in coder1-ide-next/.env.local');
    } else if (env.NEXT_PUBLIC_WEBSOCKET_URL !== EXPECTED_CONFIG.WEBSOCKET_URL) {
      this.logError(`NEXT_PUBLIC_WEBSOCKET_URL is ${env.NEXT_PUBLIC_WEBSOCKET_URL}, expected ${EXPECTED_CONFIG.WEBSOCKET_URL}`);
    } else {
      this.logSuccess(`NEXT_PUBLIC_WEBSOCKET_URL correctly set to ${env.NEXT_PUBLIC_WEBSOCKET_URL}`);
    }
    
    // Check frontend URL
    if (env.NEXT_PUBLIC_API_URL && !env.NEXT_PUBLIC_API_URL.includes(':3001')) {
      this.logWarning(`NEXT_PUBLIC_API_URL should typically use port 3001 for Next.js frontend`);
    }
  }

  validateApiConfig() {
    this.logInfo('Validating api-config.ts...');
    
    const apiConfigPath = path.join(this.projectRoot, 'coder1-ide-next', 'lib', 'api-config.ts');
    
    try {
      const content = fs.readFileSync(apiConfigPath, 'utf8');
      
      // Check for hardcoded port references that don't match expected config  
      if (content.includes('localhost:3002')) {
        this.logError('api-config.ts contains outdated localhost:3002 references - should be 3000');
      } else if (content.includes('localhost:3000') && content.includes('getBackendUrl')) {
        this.logSuccess('api-config.ts has correct fallback references (3000 for Express)');
      }
      
      // Check for proper environment variable usage
      if (content.includes('EXPRESS_BACKEND_URL')) {
        this.logSuccess('api-config.ts uses EXPRESS_BACKEND_URL environment variable');
      } else {
        this.logWarning('api-config.ts might not be using EXPRESS_BACKEND_URL environment variable');
      }
      
    } catch (error) {
      this.logWarning(`Cannot validate api-config.ts: ${error.message}`);
    }
  }

  checkRunningProcesses() {
    this.logInfo('Checking running processes on development ports...');
    
    try {
      // Check port 3000 (Express backend)
      try {
        const lsof3000 = execSync(`lsof -i :3000 -t`, { encoding: 'utf8', stdio: 'pipe' });
        if (lsof3000.trim()) {
          this.logSuccess('Process running on port 3000 (Express backend)');
        } else {
          this.logWarning('No process found on port 3000 (Express backend not running)');
        }
      } catch (error) {
        this.logWarning('No process found on port 3000 (Express backend not running)');
      }
      
      // Check port 3001 (Next.js frontend)
      try {
        const lsof3001 = execSync(`lsof -i :3001 -t`, { encoding: 'utf8', stdio: 'pipe' });
        if (lsof3001.trim()) {
          this.logSuccess('Process running on port 3001 (Next.js frontend)');
        } else {
          this.logWarning('No process found on port 3001 (Next.js frontend not running)');
        }
      } catch (error) {
        this.logWarning('No process found on port 3001 (Next.js frontend not running)');
      }
      
    } catch (error) {
      this.logWarning(`Cannot check running processes: ${error.message}`);
    }
  }

  validatePackageJsonScripts() {
    this.logInfo('Validating package.json scripts...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check if validate:ports script exists
      if (packageJson.scripts && packageJson.scripts['validate:ports']) {
        this.logSuccess('validate:ports script found in package.json');
      } else {
        this.logWarning('validate:ports script not found in package.json - consider adding it');
      }
      
    } catch (error) {
      this.logWarning(`Cannot validate package.json: ${error.message}`);
    }
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), 'bold');
    this.log('🚀 PORT CONFIGURATION VALIDATION REPORT', 'bold');
    this.log('='.repeat(60), 'bold');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.logSuccess('\n🎉 ALL CONFIGURATIONS VALID!');
      this.logInfo('Your port configuration is correct. StatusBar buttons should work properly.');
    } else {
      if (this.errors.length > 0) {
        this.log(`\n❌ CRITICAL ERRORS (${this.errors.length}):`, 'red');
        this.errors.forEach((error, index) => {
          this.log(`  ${index + 1}. ${error}`, 'red');
        });
        this.log('\n🚨 StatusBar buttons will NOT work until these errors are fixed!', 'red');
      }
      
      if (this.warnings.length > 0) {
        this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'yellow');
        this.warnings.forEach((warning, index) => {
          this.log(`  ${index + 1}. ${warning}`, 'yellow');
        });
      }
    }
    
    this.log('\n📋 QUICK FIX COMMANDS:', 'cyan');
    this.log('  npm run kill-ports     # Kill processes on dev ports', 'cyan');
    this.log('  npm run dev:clean      # Clean environment and start dev', 'cyan');
    this.log('  rm -rf .next           # Clear Next.js cache', 'cyan');
    
    this.log('\n📖 For detailed configuration info, see:', 'blue');
    this.log('  PORT_CONFIGURATION.md  # Complete port reference', 'blue');
    this.log('  CLAUDE.md              # AI agent instructions', 'blue');
    
    return this.errors.length === 0;
  }

  async run() {
    this.log('🔍 Starting Coder1 IDE Port Configuration Validation...\n', 'bold');
    
    this.validateMainEnv();
    this.validateNextJsEnv();
    this.validateApiConfig();
    this.checkRunningProcesses();
    this.validatePackageJsonScripts();
    
    const isValid = this.generateReport();
    process.exit(isValid ? 0 : 1);
  }
}

// Run the validator
if (require.main === module) {
  const validator = new PortValidator();
  validator.run().catch(error => {
    console.error(`${colors.red}❌ Validation failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = PortValidator;