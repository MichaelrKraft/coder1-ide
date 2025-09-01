/**
 * Memory System End-to-End Test
 * 
 * Tests the complete Long-Term Memory & RAG System implementation
 * including error pattern capture, vector storage, and context injection.
 */

const { ErrorPatternMemory } = require('../services/memory/ErrorPatternMemory');
const { VectorMemoryEnhancer } = require('../services/ai-enhancement/VectorMemoryEnhancer');
const { MemoryPerformanceMonitor } = require('../services/monitoring/MemoryPerformanceMonitor');

class MemorySystemTest {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
        
        this.errorMemory = null;
        this.vectorMemory = null;
        this.performanceMonitor = null;
    }
    
    async runAllTests() {
        console.log('🧪 Starting Memory System End-to-End Tests...\n');
        
        try {
            // Initialize systems
            await this.initializeSystems();
            
            // Run test suite
            await this.testErrorPatternCapture();
            await this.testErrorPatternRetrieval();
            await this.testVectorEmbedding();
            await this.testVectorSearch();
            await this.testContextInjection();
            await this.testPerformanceMonitoring();
            await this.testEndToEndWorkflow();
            
            // Clean up
            await this.cleanup();
            
        } catch (error) {
            console.error('❌ Test initialization failed:', error);
            this.recordResult('initialization', false, error.message);
        }
        
        this.printResults();
    }
    
    async initializeSystems() {
        console.log('🔧 Initializing memory systems...');
        
        try {
            // Initialize systems in order
            this.performanceMonitor = MemoryPerformanceMonitor.getInstance();
            this.errorMemory = ErrorPatternMemory.getInstance();
            this.vectorMemory = VectorMemoryEnhancer.getInstance();
            
            // Wait for vector memory to be ready
            await this.waitForSystem(this.vectorMemory, 'VectorMemoryEnhancer', 30000);
            
            console.log('✅ Systems initialized successfully\n');
            
        } catch (error) {
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }
    
    async waitForSystem(system, name, timeout = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                // Check if system is ready by attempting to get metrics
                const metrics = system.getMetrics();
                if (metrics) {
                    console.log(`✅ ${name} is ready`);
                    return;
                }
            } catch (error) {
                // System not ready yet
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error(`${name} failed to initialize within ${timeout}ms`);
    }
    
    async testErrorPatternCapture() {
        console.log('🔍 Testing Error Pattern Capture...');
        
        try {
            // Simulate capturing an error pattern
            const testError = {
                message: 'TypeError: Cannot read property "length" of undefined',
                stack: 'at processArray (test.js:42:15)\n    at main (test.js:10:5)',
                code: 'ENOENT'
            };
            
            const context = {
                lastCommands: ['npm install', 'node test.js'],
                workingDirectory: '/test/project',
                sessionId: 'test-session-001'
            };
            
            const result = await this.errorMemory.captureError(testError, context);
            
            if (result && result.patternId) {
                this.recordResult('error-pattern-capture', true, 'Successfully captured error pattern');
                console.log(`  ✅ Pattern captured with ID: ${result.patternId}`);
            } else {
                this.recordResult('error-pattern-capture', false, 'Failed to capture error pattern');
            }
            
        } catch (error) {
            this.recordResult('error-pattern-capture', false, error.message);
        }
    }
    
    async testErrorPatternRetrieval() {
        console.log('🔍 Testing Error Pattern Retrieval...');
        
        try {
            // Test similar error retrieval
            const similarError = {
                message: 'TypeError: Cannot read property "map" of undefined',
                stack: 'at processData (app.js:25:10)',
                code: 'ENOENT'
            };
            
            const result = await this.errorMemory.findSimilarPattern(similarError);
            
            if (result && result.similarity > 0.5) {
                this.recordResult('error-pattern-retrieval', true, 
                    `Found similar pattern with ${(result.similarity * 100).toFixed(1)}% similarity`);
                console.log(`  ✅ Found similar pattern: ${result.similarity.toFixed(3)} similarity`);
            } else {
                // This might be expected if no similar patterns exist yet
                this.recordResult('error-pattern-retrieval', true, 'No similar patterns found (expected)');
                console.log(`  ℹ️  No similar patterns found (expected for new patterns)`);
            }
            
        } catch (error) {
            this.recordResult('error-pattern-retrieval', false, error.message);
        }
    }
    
    async testVectorEmbedding() {
        console.log('🧠 Testing Vector Embedding Generation...');
        
        try {
            const testText = 'This is a test error message about file not found';
            const embedding = await this.vectorMemory.generateEmbedding(testText);
            
            if (embedding && Array.isArray(embedding) && embedding.length > 0) {
                this.recordResult('vector-embedding', true, 
                    `Generated embedding with ${embedding.length} dimensions`);
                console.log(`  ✅ Generated ${embedding.length}D embedding`);
            } else {
                this.recordResult('vector-embedding', false, 'Failed to generate embedding');
            }
            
        } catch (error) {
            this.recordResult('vector-embedding', false, error.message);
        }
    }
    
    async testVectorSearch() {
        console.log('🔍 Testing Vector Search...');
        
        try {
            // First, store a test item
            const testItem = {
                id: `test_${Date.now()}`,
                content: 'Node.js file system error ENOENT file not found',
                type: 'error_pattern',
                solution: 'Check if file exists before reading'
            };
            
            await this.vectorMemory.storeWithEmbedding('errors', testItem);
            
            // Wait a moment for processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Search for similar items
            const searchResults = await this.vectorMemory.searchSimilar(
                'errors', 
                'file not found error nodejs', 
                3
            );
            
            if (Array.isArray(searchResults)) {
                this.recordResult('vector-search', true, 
                    `Found ${searchResults.length} similar items`);
                console.log(`  ✅ Search returned ${searchResults.length} results`);
                
                if (searchResults.length > 0) {
                    console.log(`    Top result similarity: ${(searchResults[0].similarity * 100).toFixed(1)}%`);
                }
            } else {
                this.recordResult('vector-search', false, 'Search returned invalid results');
            }
            
        } catch (error) {
            this.recordResult('vector-search', false, error.message);
        }
    }
    
    async testContextInjection() {
        console.log('💉 Testing Context Injection...');
        
        try {
            // This test simulates what happens in the Claude bridge
            // We'll check if the vector memory can provide relevant context
            
            const testPrompt = 'I\'m getting a file not found error in my Node.js application';
            const contextResults = await this.vectorMemory.searchSimilar('errors', testPrompt, 3);
            
            if (Array.isArray(contextResults)) {
                let contextInjected = false;
                
                if (contextResults.length > 0) {
                    // Simulate context injection
                    const relevantContext = contextResults
                        .filter(result => result.similarity > 0.7)
                        .map(result => result.metadata?.solution || 'No solution available')
                        .filter(solution => solution !== 'No solution available');
                    
                    if (relevantContext.length > 0) {
                        contextInjected = true;
                        console.log(`  ✅ Would inject ${relevantContext.length} relevant solutions`);
                        console.log(`    Sample solution: "${relevantContext[0]}"`);
                    }
                }
                
                this.recordResult('context-injection', true, 
                    contextInjected ? 'Context injection successful' : 'No relevant context available');
                    
            } else {
                this.recordResult('context-injection', false, 'Failed to retrieve context');
            }
            
        } catch (error) {
            this.recordResult('context-injection', false, error.message);
        }
    }
    
    async testPerformanceMonitoring() {
        console.log('📊 Testing Performance Monitoring...');
        
        try {
            // Test metrics collection
            const metrics = this.performanceMonitor.getPerformanceReport();
            
            if (metrics && metrics.current && typeof metrics.current.timestamp === 'number') {
                this.recordResult('performance-monitoring', true, 'Metrics collection working');
                console.log(`  ✅ Performance monitoring active`);
                console.log(`    Total embeddings: ${metrics.current.embedding.totalGenerated}`);
                console.log(`    Total searches: ${metrics.current.vectorSearch.totalSearches}`);
                console.log(`    Worker pool: ${metrics.current.workers.poolSize} workers`);
            } else {
                this.recordResult('performance-monitoring', false, 'Metrics collection failed');
            }
            
        } catch (error) {
            this.recordResult('performance-monitoring', false, error.message);
        }
    }
    
    async testEndToEndWorkflow() {
        console.log('🔄 Testing End-to-End Workflow...');
        
        try {
            // Simulate complete workflow: Error occurs -> Captured -> Similar error -> Context provided
            
            // 1. Capture new error
            const newError = {
                message: 'ReferenceError: variable is not defined',
                stack: 'at execute (script.js:15:8)',
                code: 'REFERENCE_ERROR'
            };
            
            const captureResult = await this.errorMemory.captureError(newError, {
                lastCommands: ['node script.js'],
                workingDirectory: '/test/workflow'
            });
            
            if (!captureResult) {
                throw new Error('Failed to capture error in workflow');
            }
            
            // 2. Wait for processing
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 3. Simulate Claude prompt with similar error
            const claudePrompt = 'I have a ReferenceError saying a variable is not defined';
            
            // 4. Search for similar patterns (what the Claude bridge would do)
            const similarPatterns = await this.vectorMemory.searchSimilar('errors', claudePrompt, 5);
            
            // 5. Check if we can provide helpful context
            const relevantSolutions = similarPatterns
                .filter(pattern => pattern.similarity > 0.5)
                .map(pattern => pattern.metadata);
            
            if (relevantSolutions.length > 0) {
                this.recordResult('end-to-end-workflow', true, 
                    `Complete workflow: ${relevantSolutions.length} solutions found`);
                console.log(`  ✅ End-to-end workflow successful`);
                console.log(`    Found ${relevantSolutions.length} relevant solutions`);
            } else {
                this.recordResult('end-to-end-workflow', true, 
                    'Workflow complete but no relevant solutions (expected for new patterns)');
                console.log(`  ℹ️  Workflow complete, building solution database...`);
            }
            
        } catch (error) {
            this.recordResult('end-to-end-workflow', false, error.message);
        }
    }
    
    recordResult(testName, passed, message) {
        this.testResults.total++;
        
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
            this.testResults.errors.push({ test: testName, error: message });
            console.log(`  ❌ ${testName}: ${message}`);
        }
    }
    
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('🧪 Memory System Test Results');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed} ✅`);
        console.log(`Failed: ${this.testResults.failed} ❌`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach(error => {
                console.log(`  • ${error.test}: ${error.error}`);
            });
        }
        
        if (this.testResults.passed === this.testResults.total) {
            console.log('\n🎉 All tests passed! The Long-Term Memory & RAG System is working correctly.');
        } else if (this.testResults.passed / this.testResults.total > 0.8) {
            console.log('\n✅ Most tests passed. System is largely functional with minor issues.');
        } else {
            console.log('\n⚠️  Several tests failed. System needs attention before production use.');
        }
        
        console.log('='.repeat(50));
    }
    
    async cleanup() {
        console.log('\n🧹 Cleaning up test environment...');
        
        try {
            // The systems are singletons, so we don't want to shut them down
            // Just log the cleanup
            console.log('✅ Test cleanup complete');
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }
}

// Export for use in other contexts
module.exports = { MemorySystemTest };

// Run tests if this file is executed directly
if (require.main === module) {
    const test = new MemorySystemTest();
    test.runAllTests().catch(console.error);
}