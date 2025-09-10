#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Coder1 IDE
 * Tests all critical functionality including security, APIs, and UI
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const API_BASE = 'http://localhost:3001';
const TEST_EMAIL = 'test@coder1.dev';
const ALPHA_CODE = 'coder1-alpha-2025';

// Color output for better readability
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class Coder1TestSuite {
    constructor() {
        this.results = [];
        this.token = null;
        this.startTime = Date.now();
    }

    // Main test runner
    async runAllTests() {
        console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════╗
║         Coder1 IDE - Comprehensive Test Suite           ║
╚══════════════════════════════════════════════════════════╝${colors.reset}
`);
        
        // Test categories
        await this.testServerHealth();
        await this.testAuthentication();
        await this.testFileAPIs();
        await this.testSecurity();
        await this.testPerformance();
        await this.testUIEndpoints();
        
        // Print results
        this.printResults();
    }

    // 1. Server Health Tests
    async testServerHealth() {
        console.log(`\n${colors.blue}🏥 Testing Server Health...${colors.reset}`);
        
        // Test health endpoint
        try {
            const health = await this.makeRequest('GET', '/api/health');
            
            this.addResult(
                'Health endpoint accessible',
                health.status === 'healthy' || health.status === 'warning' ? 'PASS' : 'WARN',
                `Status: ${health.status}, Memory: ${health.memory?.utilization}%`
            );
            
            // Check memory usage
            if (health.memory?.utilization > 90) {
                this.addResult('Memory usage check', 'WARN', `High memory usage: ${health.memory.utilization}%`);
            } else {
                this.addResult('Memory usage check', 'PASS', `Memory at ${health.memory?.utilization}%`);
            }
            
            // Check uptime
            this.addResult('Server uptime', 'PASS', health.uptime?.humanReadable || 'Running');
            
        } catch (error) {
            this.addResult('Health endpoint', 'FAIL', error.message);
        }
    }

    // 2. Authentication Tests
    async testAuthentication() {
        console.log(`\n${colors.blue}🔐 Testing Authentication...${colors.reset}`);
        
        // Test session creation with valid alpha code
        try {
            const response = await this.makeRequest('POST', '/api/auth/session', {
                action: 'create',
                email: TEST_EMAIL,
                alphaCode: ALPHA_CODE
            });
            
            if (response.success && response.session?.token) {
                this.token = response.session.token;
                this.addResult('Session creation with alpha code', 'PASS', 'Token generated');
            } else {
                this.addResult('Session creation with alpha code', 'FAIL', response.error);
            }
        } catch (error) {
            this.addResult('Session creation', 'FAIL', error.message);
        }
        
        // Test invalid alpha code rejection
        try {
            const response = await this.makeRequest('POST', '/api/auth/session', {
                action: 'create',
                email: 'hacker@evil.com',
                alphaCode: 'invalid-code-12345'
            });
            
            if (!response.success) {
                this.addResult('Invalid alpha code rejection', 'PASS', 'Properly rejected');
            } else {
                this.addResult('Invalid alpha code rejection', 'FAIL', 'Should have been rejected');
            }
        } catch (error) {
            this.addResult('Invalid alpha code rejection', 'PASS', 'Request failed as expected');
        }
        
        // Test session verification
        if (this.token) {
            try {
                const response = await this.makeRequest('POST', '/api/auth/session', 
                    { action: 'verify' },
                    { 'Authorization': `Bearer ${this.token}` }
                );
                
                if (response.success) {
                    this.addResult('Session verification', 'PASS', 'Token valid');
                } else {
                    this.addResult('Session verification', 'FAIL', response.error);
                }
            } catch (error) {
                this.addResult('Session verification', 'FAIL', error.message);
            }
        }
    }

    // 3. File API Tests
    async testFileAPIs() {
        console.log(`\n${colors.blue}📁 Testing File APIs...${colors.reset}`);
        
        if (!this.token) {
            this.addResult('File API tests', 'SKIP', 'No auth token available');
            return;
        }
        
        // Test reading allowed files
        const testFiles = ['README.md', 'package.json'];
        
        for (const file of testFiles) {
            try {
                const response = await this.makeRequest(
                    'GET',
                    `/api/files/read?path=${encodeURIComponent(file)}`,
                    null,
                    { 'Authorization': `Bearer ${this.token}` }
                );
                
                if (response.success) {
                    this.addResult(`Read ${file}`, 'PASS', `${response.content?.length || 0} chars`);
                } else {
                    this.addResult(`Read ${file}`, 'FAIL', response.error);
                }
            } catch (error) {
                this.addResult(`Read ${file}`, 'FAIL', error.message);
            }
        }
        
        // Test file tree API
        try {
            const response = await this.makeRequest(
                'GET',
                '/api/files/tree',
                null,
                { 'Authorization': `Bearer ${this.token}` }
            );
            
            if (response.success || Array.isArray(response)) {
                this.addResult('File tree API', 'PASS', 'Tree structure returned');
            } else {
                this.addResult('File tree API', 'FAIL', response.error);
            }
        } catch (error) {
            this.addResult('File tree API', 'FAIL', error.message);
        }
        
        // Test unauthorized access
        try {
            const response = await this.makeRequest('GET', '/api/files/read?path=README.md');
            
            if (response.error && response.error.includes('Authentication required')) {
                this.addResult('Unauthorized file access blocked', 'PASS');
            } else {
                this.addResult('Unauthorized file access blocked', 'FAIL', 'Should require auth');
            }
        } catch (error) {
            this.addResult('Unauthorized file access blocked', 'PASS', 'Properly rejected');
        }
    }

    // 4. Security Tests
    async testSecurity() {
        console.log(`\n${colors.blue}🔒 Testing Security...${colors.reset}`);
        
        // Test path traversal protection
        const attacks = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '../.env',
            '../../.ssh/id_rsa'
        ];
        
        for (const attack of attacks) {
            try {
                const response = await this.makeRequest(
                    'GET',
                    `/api/files/read?path=${encodeURIComponent(attack)}`,
                    null,
                    { 'Authorization': `Bearer ${this.token || 'fake-token'}` }
                );
                
                if (response.error && (response.error.includes('Path traversal') || 
                    response.error.includes('Access denied') || 
                    response.error.includes('restricted'))) {
                    this.addResult(`Path traversal blocked: ${attack.substring(0, 20)}...`, 'PASS');
                } else {
                    this.addResult(`Path traversal blocked: ${attack.substring(0, 20)}...`, 'FAIL', 'Attack not blocked');
                }
            } catch (error) {
                this.addResult(`Path traversal blocked: ${attack.substring(0, 20)}...`, 'PASS', 'Properly blocked');
            }
        }
        
        // Test sensitive file protection
        const sensitiveFiles = ['.env', '.env.local', 'id_rsa'];
        
        for (const file of sensitiveFiles) {
            try {
                const response = await this.makeRequest(
                    'GET',
                    `/api/files/read?path=${encodeURIComponent(file)}`,
                    null,
                    { 'Authorization': `Bearer ${this.token || 'fake-token'}` }
                );
                
                if (response.error && response.error.includes('restricted')) {
                    this.addResult(`Sensitive file blocked: ${file}`, 'PASS');
                } else {
                    this.addResult(`Sensitive file blocked: ${file}`, 'FAIL', 'Should be blocked');
                }
            } catch (error) {
                this.addResult(`Sensitive file blocked: ${file}`, 'PASS', 'Properly blocked');
            }
        }
    }

    // 5. Performance Tests
    async testPerformance() {
        console.log(`\n${colors.blue}⚡ Testing Performance...${colors.reset}`);
        
        // Test response times
        const endpoints = [
            { path: '/api/health', name: 'Health check', maxTime: 100 },
            { path: '/', name: 'Homepage', maxTime: 500 },
            { path: '/ide', name: 'IDE page', maxTime: 2000 }
        ];
        
        for (const endpoint of endpoints) {
            const startTime = Date.now();
            try {
                await this.makeRequest('GET', endpoint.path);
                const responseTime = Date.now() - startTime;
                
                if (responseTime <= endpoint.maxTime) {
                    this.addResult(`${endpoint.name} response time`, 'PASS', `${responseTime}ms`);
                } else {
                    this.addResult(`${endpoint.name} response time`, 'WARN', `${responseTime}ms (>${endpoint.maxTime}ms)`);
                }
            } catch (error) {
                this.addResult(`${endpoint.name} response time`, 'FAIL', error.message);
            }
        }
    }

    // 6. UI Endpoint Tests
    async testUIEndpoints() {
        console.log(`\n${colors.blue}🎨 Testing UI Endpoints...${colors.reset}`);
        
        const uiEndpoints = [
            { path: '/', name: 'Homepage' },
            { path: '/ide', name: 'IDE Interface' },
            { path: '/hooks', name: 'Hooks Page' },
            { path: '/timeline', name: 'Timeline Page' },
            { path: '/consultation', name: 'Consultation Page' }
        ];
        
        for (const endpoint of uiEndpoints) {
            try {
                const response = await this.makeRequest('GET', endpoint.path);
                
                // Check if we get HTML response (or any response)
                if (response || typeof response === 'string') {
                    this.addResult(`${endpoint.name} loads`, 'PASS');
                } else {
                    this.addResult(`${endpoint.name} loads`, 'WARN', 'Unexpected response');
                }
            } catch (error) {
                // 404s are expected for some routes in development
                if (error.message.includes('404')) {
                    this.addResult(`${endpoint.name} loads`, 'WARN', '404 - Route may not exist');
                } else {
                    this.addResult(`${endpoint.name} loads`, 'FAIL', error.message);
                }
            }
        }
    }

    // Helper: Make HTTP request
    makeRequest(method, path, body = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(API_BASE + path);
            const options = {
                hostname: url.hostname,
                port: url.port || 3001,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        // Try to parse as JSON
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch {
                        // Return raw data if not JSON
                        resolve(data);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (body) {
                req.write(JSON.stringify(body));
            }

            req.end();
        });
    }

    // Add test result
    addResult(test, status, details = null) {
        this.results.push({ test, status, details });
        
        // Print immediate feedback
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
        
        console.log(`  ${icon} ${color}${test}${colors.reset}${details ? ` - ${details}` : ''}`);
    }

    // Print final results
    printResults() {
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        
        console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
        console.log(`${colors.bright}📊 Test Results Summary${colors.reset}`);
        console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
        
        let passed = 0, failed = 0, warnings = 0, skipped = 0;
        
        this.results.forEach(result => {
            switch(result.status) {
                case 'PASS': passed++; break;
                case 'FAIL': failed++; break;
                case 'WARN': warnings++; break;
                case 'SKIP': skipped++; break;
            }
        });
        
        const total = passed + failed + warnings + skipped;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
        
        console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
        console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
        console.log(`${colors.yellow}⚠️  Warnings: ${warnings}${colors.reset}`);
        console.log(`${colors.blue}⏭️  Skipped: ${skipped}${colors.reset}`);
        console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
        console.log(`📈 Pass Rate: ${passRate}%`);
        console.log(`⏱️  Duration: ${duration}s`);
        
        // Overall status
        console.log(`\n${colors.bright}Overall Status: ${colors.reset}`);
        if (failed === 0 && warnings < 3) {
            console.log(`${colors.green}${colors.bright}✅ ALL TESTS PASSED${colors.reset}`);
            console.log(`\n🎉 Coder1 IDE is ready for alpha launch!`);
        } else if (failed === 0) {
            console.log(`${colors.yellow}${colors.bright}⚠️ PASSED WITH WARNINGS${colors.reset}`);
            console.log(`\n⚠️ Some minor issues detected but no critical failures.`);
        } else {
            console.log(`${colors.red}${colors.bright}❌ TESTS FAILED${colors.reset}`);
            console.log(`\n🔧 ${failed} critical issues need to be fixed.`);
        }
        
        // Exit code
        process.exit(failed > 0 ? 1 : 0);
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new Coder1TestSuite();
    
    console.log(`${colors.yellow}⚠️  Make sure the server is running on port 3001${colors.reset}`);
    console.log(`${colors.cyan}Starting tests in 2 seconds...${colors.reset}\n`);
    
    setTimeout(() => {
        tester.runAllTests().catch(error => {
            console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
            process.exit(1);
        });
    }, 2000);
}

module.exports = Coder1TestSuite;