// Utility functions for the autonomous vibe interface

// HTML sanitization function
function sanitizeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Font utility functions
const FontUtils = {
    // Check if a specific font is available
    isFontAvailable: function(fontName) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Test with a specific text
        const testText = 'Autonomous Coding Assistant';
        context.font = `16px ${fontName}`;
        const fontWidth = context.measureText(testText).width;
        
        context.font = '16px serif';
        const serifWidth = context.measureText(testText).width;
        
        return fontWidth !== serifWidth;
    },
    
    // Apply font with fallback
    applyFontWithFallback: function(element, primaryFont, fallbackFonts) {
        if (!element) return;
        
        const fontStack = `${primaryFont}, ${fallbackFonts.join(', ')}`;
        element.style.fontFamily = fontStack;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontUtils;
}