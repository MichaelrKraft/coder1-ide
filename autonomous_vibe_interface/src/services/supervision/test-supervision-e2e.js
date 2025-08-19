#!/usr/bin/env node

/**
 * End-to-End Test for Integrated Supervision System
 * 
 * This test validates the complete AI-supervising-AI workflow:
 * 1. PRD processing and context extraction
 * 2. Claude Code launch with monitoring
 * 3. Real-time output tracking
 * 4. Confusion detection and intervention
 * 5. Context injection when needed
 * 6. Permission handling
 * 7. Workflow tracking through completion
 */

const { IntegratedSupervisionSystem } = require('./IntegratedSupervisionSystem');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');

// Test configuration
const TEST_CONFIG = {
    projectPath: path.join(__dirname, '../../../test-project'),
    sessionId: `test-e2e-${Date.now()}`,
    verbose: true,
    simulateClaudeCode: true // Use simulation for testing
};

// Test PRD content
const TEST_PRD = `
# E-Commerce Checkout System Requirements

## Project Overview
Build a simple e-commerce checkout system with cart functionality.

## Requirements
1. Shopping cart that stores items with quantity
2. Add items to cart with validation
3. Remove items from cart
4. Calculate total price including tax (10%)
5. Apply discount codes (SAVE10 for 10% off)
6. Generate order summary
7. Error handling for invalid operations
8. Unit tests for core functionality

## Technical Requirements
- Use Node.js and Express
- Implement as REST API
- Include proper error handling
- Write clean, modular code
`;

// Claude Code simulation responses for testing
const SIMULATION_RESPONSES = [
    {
        trigger: 'start',
        output: 'Starting Claude Code session...\nAnalyzing project requirements...\n'
    },
    {
        trigger: 'requirements_phase',
        output: 'Could you please clarify what specific e-commerce checkout system requirements you\'re referring to?\n',
        expectsIntervention: true
    },
    {
        trigger: 'after_requirements',
        output: 'Thank you! I understand the requirements now. Creating the project structure...\n'
    },
    {
        trigger: 'file_creation',
        output: 'Which directory should I create the main application files in?\n',
        expectsIntervention: true
    },
    {
        trigger: 'after_directory',
        output: 'Creating src/app.js...\nImplementing shopping cart functionality...\n'
    },
    {
        trigger: 'permission',
        output: 'I need permission to create the following files:\n- src/app.js\n- src/cart.js\n- tests/cart.test.js\n',
        expectsIntervention: true
    },
    {
        trigger: 'implementation',
        output: 'Files created successfully.\nImplementing cart logic...\nAdding validation...\n'
    },
    {
        trigger: 'completion',
        output: 'Implementation completed successfully!\nAll requirements have been fulfilled.\n'
    }
];

class SupervisionE2ETest {
    constructor(config) {
        this.config = config;
        this.supervisionSystem = null;
        this.testResults = {
            passed: [],
            failed: [],
            interventions: [],
            startTime: Date.now()
        };
        this.simulationIndex = 0;
        this.simulatedProcess = null;
    }

    /**
     * Run the complete end-to-end test
     */
    async runTest() {
        console.log('🧪 Starting End-to-End Supervision Test');
        console.log('=' .repeat(60));
        
        try {
            // Setup test environment
            await this.setupTestEnvironment();
            
            // Initialize supervision system
            await this.initializeSupervisionSystem();
            
            // Test context extraction from PRD
            await this.testContextExtraction();
            
            // Test Claude Code monitoring
            await this.testClaudeCodeMonitoring();
            
            // Test intervention delivery
            await this.testInterventionDelivery();
            
            // Test permission handling
            await this.testPermissionHandling();
            
            // Test workflow tracking
            await this.testWorkflowTracking();
            
            // Generate test report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Test failed with error:', error);
            this.testResults.failed.push({
                test: 'Overall E2E Test',
                error: error.message
            });
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Setup test environment
     */
    async setupTestEnvironment() {
        console.log('\n📁 Setting up test environment...');
        
        // Create test project directory
        try {
            await fs.mkdir(this.config.projectPath, { recursive: true });
            this.testResults.passed.push({ test: 'Create test directory' });
        } catch (error) {
            this.testResults.failed.push({ 
                test: 'Create test directory', 
                error: error.message 
            });
        }
    }

    /**
     * Initialize the supervision system
     */
    async initializeSupervisionSystem() {
        console.log('\n🚀 Initializing supervision system...');
        
        this.supervisionSystem = new IntegratedSupervisionSystem({
            sessionId: this.config.sessionId,
            projectPath: this.config.projectPath,
            logger: this.config.verbose ? console : { log: () => {}, error: () => {} }
        });
        
        // Set up event listeners for testing
        this.setupEventListeners();
        
        this.testResults.passed.push({ test: 'Initialize supervision system' });
    }

    /**
     * Set up event listeners for test verification
     */
    setupEventListeners() {
        // Track supervision events
        this.supervisionSystem.on('supervisionStarted', (data) => {
            console.log('✅ Supervision started:', data.sessionId);
            this.testResults.passed.push({ test: 'Supervision start event' });
        });
        
        this.supervisionSystem.on('interventionDelivered', (data) => {
            console.log('✅ Intervention delivered:', data.type);
            this.testResults.interventions.push(data);
            this.testResults.passed.push({ 
                test: 'Intervention delivery', 
                type: data.type 
            });
        });
        
        this.supervisionSystem.on('permissionRequest', (data) => {
            console.log('🔐 Permission requested:', data.details);
            this.testResults.passed.push({ test: 'Permission request event' });
            
            // Auto-approve for testing
            setTimeout(() => {
                this.supervisionSystem.approvePermission(data.details);
            }, 100);
        });
        
        this.supervisionSystem.on('supervisionStopped', (data) => {
            console.log('🛑 Supervision stopped. Stats:', data.stats);
            this.testResults.passed.push({ test: 'Supervision stop event' });
        });
    }

    /**
     * Test context extraction from PRD
     */
    async testContextExtraction() {
        console.log('\n📋 Testing context extraction...');
        
        // Initialize context with test PRD
        const contextProvider = this.supervisionSystem.contextProvider;
        await contextProvider.initializeContext(TEST_PRD);
        
        const context = contextProvider.getFullContext();
        
        // Verify requirements extraction
        if (context.requirements && context.requirements.length > 0) {
            console.log(`✅ Extracted ${context.requirements.length} requirements`);
            this.testResults.passed.push({ 
                test: 'Requirements extraction',
                count: context.requirements.length
            });
        } else {
            this.testResults.failed.push({ 
                test: 'Requirements extraction',
                error: 'No requirements extracted'
            });
        }
        
        // Verify project type identification
        if (context.projectType) {
            console.log(`✅ Identified project type: ${context.projectType}`);
            this.testResults.passed.push({ 
                test: 'Project type identification',
                type: context.projectType
            });
        }
    }

    /**
     * Test Claude Code monitoring
     */
    async testClaudeCodeMonitoring() {
        console.log('\n📊 Testing Claude Code monitoring...');
        
        if (this.config.simulateClaudeCode) {
            // Create simulated Claude Code process
            await this.createSimulatedProcess();
            
            // Start supervision with simulated process
            const result = await this.supervisionSystem.startSupervision(TEST_PRD, {
                autoIntervention: true,
                supervisionMode: 'comprehensive'
            });
            
            if (result.success) {
                console.log('✅ Supervision started successfully');
                this.testResults.passed.push({ test: 'Start supervision with monitoring' });
                
                // Run simulation sequence
                await this.runSimulationSequence();
            } else {
                this.testResults.failed.push({ 
                    test: 'Start supervision',
                    error: result.error
                });
            }
        }
    }

    /**
     * Create simulated Claude Code process for testing
     */
    async createSimulatedProcess() {
        console.log('🎭 Creating simulated Claude Code process...');
        
        // Create a simple Node.js process that simulates Claude Code
        const simulationScript = `
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            // Simulation phases
            const phases = ${JSON.stringify(SIMULATION_RESPONSES)};
            let phaseIndex = 0;
            
            function nextPhase() {
                if (phaseIndex < phases.length) {
                    const phase = phases[phaseIndex++];
                    console.log(phase.output);
                    
                    if (!phase.expectsIntervention) {
                        setTimeout(nextPhase, 1000);
                    }
                }
            }
            
            // Listen for interventions
            rl.on('line', (input) => {
                console.log('Received intervention, continuing...');
                setTimeout(nextPhase, 500);
            });
            
            // Start simulation
            console.log('Claude Code simulation started');
            setTimeout(nextPhase, 1000);
        `;
        
        // Write simulation script
        const scriptPath = path.join(this.config.projectPath, 'simulate-claude.js');
        await fs.writeFile(scriptPath, simulationScript);
        
        // Spawn simulation process
        this.simulatedProcess = spawn('node', [scriptPath], {
            cwd: this.config.projectPath,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Override the supervision engine's Claude Code process
        this.supervisionSystem.supervisionEngine.claudeCodeProcess = this.simulatedProcess;
        this.supervisionSystem.state.claudeCodeProcess = this.simulatedProcess;
        
        // Attach monitor
        this.supervisionSystem.monitor.attachToProcess(this.simulatedProcess);
        
        console.log('✅ Simulation process created');
    }

    /**
     * Run the simulation sequence
     */
    async runSimulationSequence() {
        console.log('\n🎬 Running simulation sequence...');
        
        return new Promise((resolve) => {
            let interventionCount = 0;
            const expectedInterventions = 3;
            
            // Track interventions
            const interventionHandler = (data) => {
                interventionCount++;
                console.log(`📌 Intervention ${interventionCount}/${expectedInterventions}: ${data.type}`);
                
                if (interventionCount >= expectedInterventions) {
                    this.supervisionSystem.removeListener('interventionDelivered', interventionHandler);
                    
                    setTimeout(() => {
                        console.log('✅ All expected interventions delivered');
                        resolve();
                    }, 2000);
                }
            };
            
            this.supervisionSystem.on('interventionDelivered', interventionHandler);
            
            // Timeout after 30 seconds
            setTimeout(() => {
                console.log('⏱️ Simulation timeout reached');
                resolve();
            }, 30000);
        });
    }

    /**
     * Test intervention delivery
     */
    async testInterventionDelivery() {
        console.log('\n💉 Testing intervention delivery...');
        
        // Check if interventions were delivered
        if (this.testResults.interventions.length > 0) {
            console.log(`✅ ${this.testResults.interventions.length} interventions delivered`);
            
            // Verify intervention types
            const interventionTypes = new Set(
                this.testResults.interventions.map(i => i.type)
            );
            
            console.log('Intervention types:', Array.from(interventionTypes));
            this.testResults.passed.push({ 
                test: 'Intervention variety',
                types: Array.from(interventionTypes)
            });
        } else {
            this.testResults.failed.push({ 
                test: 'Intervention delivery',
                error: 'No interventions were delivered'
            });
        }
    }

    /**
     * Test permission handling
     */
    async testPermissionHandling() {
        console.log('\n🔐 Testing permission handling...');
        
        // Manually trigger a permission request
        const permissionRequest = {
            type: 'permission_request',
            analysis: {
                patterns: [{ type: 'create_permission' }],
                categories: new Set(['permission'])
            },
            line: 'May I create the file src/test.js?'
        };
        
        await this.supervisionSystem.handleInterventionRequest(permissionRequest);
        
        // Check if permission was handled
        const stats = this.supervisionSystem.getStatus().stats;
        if (stats.approvalsHandled > 0) {
            console.log(`✅ ${stats.approvalsHandled} permissions handled`);
            this.testResults.passed.push({ 
                test: 'Permission handling',
                count: stats.approvalsHandled
            });
        }
    }

    /**
     * Test workflow tracking
     */
    async testWorkflowTracking() {
        console.log('\n📈 Testing workflow tracking...');
        
        const workflowStats = this.supervisionSystem.workflowTracker.getStats();
        
        console.log('Workflow statistics:', workflowStats);
        
        if (workflowStats.totalWorkflows > 0) {
            console.log(`✅ ${workflowStats.totalWorkflows} workflows tracked`);
            this.testResults.passed.push({ 
                test: 'Workflow tracking',
                stats: workflowStats
            });
        } else {
            this.testResults.failed.push({ 
                test: 'Workflow tracking',
                error: 'No workflows tracked'
            });
        }
    }

    /**
     * Generate test report
     */
    generateTestReport() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 TEST REPORT');
        console.log('=' .repeat(60));
        
        const duration = Date.now() - this.testResults.startTime;
        
        console.log(`\n✅ Passed Tests: ${this.testResults.passed.length}`);
        this.testResults.passed.forEach(test => {
            console.log(`   - ${test.test}${test.type ? ` (${test.type})` : ''}`);
        });
        
        if (this.testResults.failed.length > 0) {
            console.log(`\n❌ Failed Tests: ${this.testResults.failed.length}`);
            this.testResults.failed.forEach(test => {
                console.log(`   - ${test.test}: ${test.error}`);
            });
        }
        
        console.log(`\n💉 Interventions Delivered: ${this.testResults.interventions.length}`);
        
        console.log(`\n⏱️ Test Duration: ${(duration / 1000).toFixed(2)} seconds`);
        
        const successRate = (this.testResults.passed.length / 
            (this.testResults.passed.length + this.testResults.failed.length) * 100).toFixed(1);
        
        console.log(`\n📈 Success Rate: ${successRate}%`);
        
        if (this.testResults.failed.length === 0) {
            console.log('\n🎉 ALL TESTS PASSED! The supervision system is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Review the failures above.');
        }
        
        console.log('\n' + '=' .repeat(60));
    }

    /**
     * Clean up test environment
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        // Stop supervision
        if (this.supervisionSystem) {
            await this.supervisionSystem.stopSupervision();
        }
        
        // Kill simulated process
        if (this.simulatedProcess && !this.simulatedProcess.killed) {
            this.simulatedProcess.kill();
        }
        
        // Clean up test directory
        try {
            await fs.rm(this.config.projectPath, { recursive: true, force: true });
            console.log('✅ Test environment cleaned up');
        } catch (error) {
            console.error('⚠️ Failed to clean up test directory:', error.message);
        }
    }
}

// Main execution
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║         AI SUPERVISION SYSTEM - END-TO-END TEST             ║
╚══════════════════════════════════════════════════════════════╝
    `);
    
    const test = new SupervisionE2ETest(TEST_CONFIG);
    await test.runTest();
    
    // Exit with appropriate code
    process.exit(test.testResults.failed.length > 0 ? 1 : 0);
}

// Run test if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { SupervisionE2ETest };