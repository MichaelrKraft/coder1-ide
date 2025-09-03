#!/usr/bin/env node

/**
 * Coder1 IDE Environment Validator
 * Ensures all required environment variables are set correctly
 */

const fs = require('fs');
const path = require('path');

// Color codes
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    const colorCode = colors[color] || colors.reset;
    console.log(`${colorCode}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
    if (!fs.existsSync(filePath)) {
        log(`❌ ${description}: NOT FOUND`, 'red');
        log(`   Expected: ${filePath}`, 'yellow');
        return null;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        log(`✅ ${description}: FOUND`, 'green');
        return content;
    } catch (error) {
        log(`❌ ${description}: READ ERROR`, 'red');
        log(`   Error: ${error.message}`, 'yellow');
        return null;
    }
}

function validateEnvVar(content, varName, expectedValue, isOptional = false) {
    const regex = new RegExp(`^${varName}=(.*)$`, 'm');
    const match = content.match(regex);
    
    if (!match) {
        if (isOptional) {
            log(`⚠️  ${varName}: NOT SET (optional)`, 'yellow');
            return true;
        } else {
            log(`❌ ${varName}: NOT FOUND`, 'red');
            return false;
        }
    }
    
    const actualValue = match[1].trim();
    
    if (expectedValue && actualValue !== expectedValue) {
        log(`❌ ${varName}: INCORRECT VALUE`, 'red');
        log(`   Expected: ${expectedValue}`, 'yellow');
        log(`   Actual: ${actualValue}`, 'yellow');
        return false;
    }
    
    log(`✅ ${varName}: ${actualValue}`, 'green');
    return true;
}

function main() {
    log('🔧 Coder1 IDE Environment Validation', 'blue');
    log('====================================', 'blue');
    
    let errors = 0;
    
    // Check Next.js .env.local
    log('\n📁 Checking Next.js Environment (.env.local)', 'blue');
    const envLocalPath = path.join(__dirname, '../coder1-ide-next/.env.local');
    const envLocalContent = checkFile(envLocalPath, '.env.local file');
    
    if (envLocalContent) {
        // Required variables
        if (!validateEnvVar(envLocalContent, 'EXPRESS_BACKEND_URL', 'http://localhost:3000')) errors++;
        if (!validateEnvVar(envLocalContent, 'NEXT_PUBLIC_EXPRESS_BACKEND_URL', 'http://localhost:3000')) errors++;
        if (!validateEnvVar(envLocalContent, 'NEXT_PUBLIC_API_URL', 'http://localhost:3001')) errors++;
        if (!validateEnvVar(envLocalContent, 'NEXT_PUBLIC_WEBSOCKET_URL', 'ws://localhost:3000')) errors++;
        
        // Optional variables
        validateEnvVar(envLocalContent, 'CLAUDE_API_KEY', null, true);
        validateEnvVar(envLocalContent, 'NEXT_PUBLIC_ENABLE_AI_CONSULTATION', null, true);
        validateEnvVar(envLocalContent, 'NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD', null, true);
    } else {
        errors++;
    }
    
    // Check main project .env
    log('\n📁 Checking Express Backend Environment (.env)', 'blue');
    const envPath = path.join(__dirname, '../.env');
    const envContent = checkFile(envPath, '.env file');
    
    if (envContent) {
        // Check for critical backend variables
        validateEnvVar(envContent, 'NODE_ENV', null, true);
        validateEnvVar(envContent, 'PORT', null, true);
        validateEnvVar(envContent, 'ANTHROPIC_API_KEY', null, true);
    } else {
        log('⚠️  .env file not found (may use defaults)', 'yellow');
    }
    
    // Check package.json files
    log('\n📦 Checking Package Configuration', 'blue');
    
    const mainPackagePath = path.join(__dirname, '../package.json');
    const mainPackage = checkFile(mainPackagePath, 'Main package.json');
    
    if (mainPackage) {
        try {
            const packageData = JSON.parse(mainPackage);
            if (packageData.scripts && packageData.scripts.dev) {
                log(`✅ Main dev script: ${packageData.scripts.dev}`, 'green');
            } else {
                log('❌ Main dev script: NOT FOUND', 'red');
                errors++;
            }
        } catch (error) {
            log('❌ Main package.json: INVALID JSON', 'red');
            errors++;
        }
    }
    
    const nextPackagePath = path.join(__dirname, '../coder1-ide-next/package.json');
    const nextPackage = checkFile(nextPackagePath, 'Next.js package.json');
    
    if (nextPackage) {
        try {
            const packageData = JSON.parse(nextPackage);
            if (packageData.scripts && packageData.scripts.dev) {
                log(`✅ Next.js dev script: ${packageData.scripts.dev}`, 'green');
            } else {
                log('❌ Next.js dev script: NOT FOUND', 'red');
                errors++;
            }
        } catch (error) {
            log('❌ Next.js package.json: INVALID JSON', 'red');
            errors++;
        }
    }
    
    // Check critical directories
    log('\n📂 Checking Directory Structure', 'blue');
    
    const criticalDirs = [
        'src',
        'coder1-ide-next',
        'coder1-ide-next/app',
        'coder1-ide-next/components',
        'coder1-ide-next/lib'
    ];
    
    for (const dir of criticalDirs) {
        const dirPath = path.join(__dirname, '..', dir);
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
            log(`✅ ${dir}/: EXISTS`, 'green');
        } else {
            log(`❌ ${dir}/: NOT FOUND`, 'red');
            errors++;
        }
    }
    
    // Check Node.js version
    log('\n🚀 Checking Runtime Environment', 'blue');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion >= 16) {
        log(`✅ Node.js version: ${nodeVersion}`, 'green');
    } else {
        log(`❌ Node.js version: ${nodeVersion} (requires >= 16.0.0)`, 'red');
        errors++;
    }
    
    // Final report
    log('\n📊 Validation Summary', 'blue');
    log('===================', 'blue');
    
    if (errors === 0) {
        log('🎉 ALL VALIDATIONS PASSED', 'green');
        log('✅ Environment is correctly configured', 'green');
        log('✅ Ready for development and alpha launch', 'green');
        process.exit(0);
    } else {
        log(`⚠️  ${errors} VALIDATION ERRORS FOUND`, 'red');
        log('❌ Environment needs attention before launch', 'red');
        log('\n💡 Recommended actions:', 'yellow');
        log('   1. Create missing files using templates', 'yellow');
        log('   2. Set correct environment variables', 'yellow');
        log('   3. Run validation again', 'yellow');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}