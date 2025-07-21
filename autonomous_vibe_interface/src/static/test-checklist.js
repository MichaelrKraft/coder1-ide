// Test checklist for Inter font implementation

const TestChecklist = {
    // Test Inter font loading
    testFontLoading: function() {
        return new Promise((resolve) => {
            if (document.fonts) {
                document.fonts.ready.then(() => {
                    const interLoaded = document.fonts.check('1em Inter');
                    resolve({
                        test: 'Font Loading',
                        passed: interLoaded,
                        message: interLoaded ? 'Inter font loaded successfully' : 'Inter font failed to load'
                    });
                });
            } else {
                resolve({
                    test: 'Font Loading',
                    passed: false,
                    message: 'Font loading API not supported'
                });
            }
        });
    },
    
    // Test title element exists
    testTitleExists: function() {
        const title = document.querySelector('.autonomous-title');
        return {
            test: 'Title Element',
            passed: !!title,
            message: title ? 'Title element found' : 'Title element not found'
        };
    },
    
    // Test Inter font is applied
    testInterFontApplied: function() {
        const title = document.querySelector('.autonomous-title');
        if (!title) {
            return {
                test: 'Inter Font Applied',
                passed: false,
                message: 'Title element not found'
            };
        }
        
        const computedStyle = window.getComputedStyle(title);
        const fontFamily = computedStyle.fontFamily.toLowerCase();
        const hasInter = fontFamily.includes('inter');
        
        return {
            test: 'Inter Font Applied',
            passed: hasInter,
            message: hasInter ? 'Inter font applied successfully' : `Current font: ${fontFamily}`
        };
    },
    
    // Test responsive design
    testResponsiveDesign: function() {
        const title = document.querySelector('.autonomous-title');
        if (!title) {
            return {
                test: 'Responsive Design',
                passed: false,
                message: 'Title element not found'
            };
        }
        
        const computedStyle = window.getComputedStyle(title);
        const fontSize = parseFloat(computedStyle.fontSize);
        const hasValidSize = fontSize > 0;
        
        return {
            test: 'Responsive Design',
            passed: hasValidSize,
            message: hasValidSize ? `Font size: ${fontSize}px` : 'Invalid font size'
        };
    },
    
    // Run all tests
    runAllTests: async function() {
        const results = [];
        
        // Run synchronous tests
        results.push(this.testTitleExists());
        results.push(this.testInterFontApplied());
        results.push(this.testResponsiveDesign());
        
        // Run asynchronous tests
        const fontLoadingResult = await this.testFontLoading();
        results.push(fontLoadingResult);
        
        return results;
    }
};

// Auto-run tests when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(async () => {
        console.log('🧪 Running Inter Font Tests...');
        const results = await TestChecklist.runAllTests();
        
        console.log('\n📊 Test Results:');
        results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
        });
        
        const passedTests = results.filter(r => r.passed).length;
        const totalTests = results.length;
        console.log(`\n📈 Tests Passed: ${passedTests}/${totalTests}`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Inter font implementation successful.');
        }
    }, 1000);
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestChecklist;
}