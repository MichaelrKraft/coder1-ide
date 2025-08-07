// Validation functions for the autonomous vibe interface

// Validate that all required elements exist
function validateInterface() {
    const validationResults = {
        titleExists: false,
        titleHasInterFont: false,
        containerExists: false,
        stylesLoaded: false
    };
    
    // Check if title exists
    const title = document.querySelector('.autonomous-title');
    validationResults.titleExists = !!title;
    
    if (title) {
        // Check if Inter font is applied
        const computedStyle = window.getComputedStyle(title);
        const fontFamily = computedStyle.fontFamily.toLowerCase();
        validationResults.titleHasInterFont = fontFamily.includes('inter');
    }
    
    // Check if container exists
    const container = document.querySelector('.container');
    validationResults.containerExists = !!container;
    
    // Check if styles are loaded
    const styleSheets = document.styleSheets;
    validationResults.stylesLoaded = styleSheets.length > 0;
    
    return validationResults;
}

// Run validation on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const results = validateInterface();
        console.log('Validation results:', results);
        
        if (results.titleExists && results.titleHasInterFont) {
            console.log('✅ SUCCESS: Autonomous Coding Assistant text is using Inter font');
        } else {
            console.warn('⚠️ WARNING: Font validation failed', results);
        }
    }, 500); // Wait for fonts to load
});

// Export validation function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateInterface };
}