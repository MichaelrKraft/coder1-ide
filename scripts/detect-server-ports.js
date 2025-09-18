#!/usr/bin/env node

/**
 * Port Detection Utility for Coder1 IDE Discover Panel
 * 
 * This script automatically detects which port is serving the static files
 * needed by the Discover panel AI Tools links.
 * 
 * Usage: node scripts/detect-server-ports.js
 */

const http = require('http');

// Required files for AI Tools functionality
const REQUIRED_FILES = [
    'hooks-v3.html',
    'templates-hub.html', 
    'components-capture.html',
    'smart-prd-generator-standalone.html',
    'workflow-dashboard.html'
];

// Common ports to test
const PORTS_TO_TEST = [3000, 3001, 3002, 3003];

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

function testPort(port, file) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: `/${file}`,
            method: 'HEAD',
            timeout: 2000
        };

        const req = http.request(options, (res) => {
            resolve({
                port,
                file,
                status: res.statusCode,
                success: res.statusCode === 200
            });
        });

        req.on('error', () => {
            resolve({
                port,
                file,
                status: 'ERROR',
                success: false
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                port,
                file,
                status: 'TIMEOUT',
                success: false
            });
        });

        req.end();
    });
}

async function detectWorkingPort() {
    log(colors.bold + colors.cyan, '\n🔍 Coder1 IDE - Discover Panel Port Detection\n');
    
    const results = [];
    
    for (const port of PORTS_TO_TEST) {
        log(colors.blue, `Testing port ${port}...`);
        
        const portResults = [];
        for (const file of REQUIRED_FILES) {
            const result = await testPort(port, file);
            portResults.push(result);
            
            const statusColor = result.success ? colors.green : colors.red;
            const statusText = result.success ? '✅' : '❌';
            console.log(`  ${statusText} ${file}: ${statusColor}${result.status}${colors.reset}`);
        }
        
        const successCount = portResults.filter(r => r.success).length;
        const portScore = successCount / REQUIRED_FILES.length;
        
        results.push({
            port,
            results: portResults,
            successCount,
            score: portScore,
            isWorking: portScore === 1.0
        });
        
        console.log(`  Score: ${successCount}/${REQUIRED_FILES.length}\n`);
    }
    
    return results;
}

function generateOutput(results) {
    const workingPorts = results.filter(r => r.isWorking);
    const partialPorts = results.filter(r => r.score > 0 && r.score < 1);
    
    console.log('\n' + '='.repeat(60));
    log(colors.bold + colors.cyan, '📊 DETECTION RESULTS');
    console.log('='.repeat(60));
    
    if (workingPorts.length > 0) {
        const bestPort = workingPorts[0].port;
        log(colors.bold + colors.green, `\n✅ WORKING PORT FOUND: ${bestPort}`);
        
        console.log('\n📋 CORRECT URLS FOR DISCOVER PANEL:');
        REQUIRED_FILES.forEach(file => {
            log(colors.green, `  • ${file}: http://localhost:${bestPort}/${file}`);
        });
        
        console.log('\n🔧 UPDATE DISCOVERPANEL.TSX WITH:');
        log(colors.yellow, `  Replace all port numbers with: ${bestPort}`);
        
        console.log('\n🧪 QUICK TEST COMMAND:');
        log(colors.cyan, `  curl -s -I http://localhost:${bestPort}/hooks-v3.html | head -1`);
        
    } else if (partialPorts.length > 0) {
        log(colors.yellow, '\n⚠️ PARTIAL MATCHES FOUND:');
        partialPorts.forEach(port => {
            console.log(`\n  Port ${port.port} (${port.successCount}/${REQUIRED_FILES.length} files):`);
            port.results.forEach(result => {
                const statusColor = result.success ? colors.green : colors.red;
                const statusText = result.success ? '✅' : '❌';
                console.log(`    ${statusText} ${result.file}: ${statusColor}${result.status}${colors.reset}`);
            });
        });
        
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        log(colors.yellow, '  1. Check symlinks in /public/ directory');
        log(colors.yellow, '  2. Restart the unified server');
        log(colors.yellow, '  3. Run: ln -sf ../../CANONICAL/filename.html filename.html');
        
    } else {
        log(colors.red, '\n❌ NO WORKING PORTS FOUND');
        
        console.log('\n🆘 TROUBLESHOOTING STEPS:');
        log(colors.red, '  1. Start the unified server: npm run dev');
        log(colors.red, '  2. Check if any servers are running: lsof -i -P | grep LISTEN');
        log(colors.red, '  3. Verify symlinks exist: ls -la public/*.html');
        log(colors.red, '  4. See docs/DISCOVER_PANEL_TROUBLESHOOTING.md');
    }
    
    console.log('\n📚 ADDITIONAL RESOURCES:');
    log(colors.blue, '  • Troubleshooting Guide: docs/DISCOVER_PANEL_TROUBLESHOOTING.md');
    log(colors.blue, '  • Architecture Info: CLAUDE.md (Discover Panel section)');
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    return workingPorts.length > 0 ? workingPorts[0].port : null;
}

function generateAgentInstructions(workingPort) {
    if (!workingPort) return;
    
    console.log('📝 FOR NEXT CLAUDE AGENT:');
    console.log('-'.repeat(40));
    log(colors.cyan, `Current Working Port: ${workingPort}`);
    log(colors.cyan, 'Last Verified: ' + new Date().toISOString());
    console.log('\nIf Discover panel links break:');
    console.log('1. Run: node scripts/detect-server-ports.js');
    console.log('2. Update DiscoverPanel.tsx with new port');
    console.log('3. Update docs/DISCOVER_PANEL_TROUBLESHOOTING.md');
    console.log('-'.repeat(40));
}

// Main execution
async function main() {
    try {
        const results = await detectWorkingPort();
        const workingPort = generateOutput(results);
        generateAgentInstructions(workingPort);
        
        // Exit with appropriate code
        process.exit(workingPort ? 0 : 1);
        
    } catch (error) {
        log(colors.red, `\n❌ Error during detection: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { detectWorkingPort, testPort, REQUIRED_FILES, PORTS_TO_TEST };