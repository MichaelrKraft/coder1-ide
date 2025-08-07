// Simple Terminal Integration - Direct approach
(function() {
    'use strict';
    
    console.log('🚀 Simple Terminal Integration starting...');
    
    // Wait for page load
    window.addEventListener('load', function() {
        // Create button
        const button = document.createElement('button');
        button.innerHTML = '🖥️ Open Terminal';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        button.onclick = function() {
            // Simply open the test terminal in a new window
            const width = 900;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            
            window.open(
                '/test-terminal-direct.html',
                'BrowserTerminal',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );
        };
        
        document.body.appendChild(button);
        console.log('✅ Terminal button added');
    });
})();