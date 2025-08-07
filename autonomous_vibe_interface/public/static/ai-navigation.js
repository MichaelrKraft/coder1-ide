/**
 * AI Navigation System
 * Provides direct navigation to AI intelligence systems from the main IDE
 */

class AINavigationSystem {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createNavigation());
        } else {
            this.createNavigation();
        }
        
        this.isInitialized = true;
    }

    createNavigation() {
        // Wait a bit for the page to load, then inject the button into the header
        setTimeout(() => {
            this.injectButtonIntoHeader();
        }, 500);
    }
    
    injectButtonIntoHeader() {
        // Find the header-right div that contains the docs button
        const headerRight = document.querySelector('.header-right');
        
        if (!headerRight) {
            // If header-right not found, create floating button as fallback
            this.createFloatingButton();
            return;
        }
        
        // Create AI navigation button that matches the docs button style
        const navButton = document.createElement('button');
        navButton.className = 'header-button ai-systems-button';
        navButton.id = 'ai-nav-trigger';
        navButton.innerHTML = '🧠 AI Dash';
        navButton.title = 'AI Intelligence Systems Monitor';
        
        // Insert before the docs button
        const docsButton = headerRight.querySelector('.docs-button');
        if (docsButton) {
            headerRight.insertBefore(navButton, docsButton);
        } else {
            headerRight.appendChild(navButton);
        }
        
        // Add styles and event listeners
        this.addStyles();
        this.addEventListeners();
    }
    
    createFloatingButton() {
        // Fallback: Create floating button if header not found
        const navButton = document.createElement('div');
        navButton.id = 'ai-nav-trigger';
        navButton.className = 'floating';
        navButton.innerHTML = `
            <button class="ai-nav-button">
                🧠 AI Dash
            </button>
        `;
        
        document.body.appendChild(navButton);
        this.addStyles();
        this.addEventListeners();
    }

    addStyles() {
        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            /* Override docs button to match AI button */
            .docs-button {
                border-color: #ff8c00 !important;
                box-shadow: 0 0 8px rgba(255, 140, 0, 0.5) !important;
            }
            
            .docs-button:hover {
                border-color: #ffa500 !important;
                box-shadow: 0 0 16px rgba(255, 165, 0, 0.8) !important;
                color: #ffa500 !important;
            }
            
            /* Menu items hover effect */
            .menu-button {
                transition: color 0.3s ease !important;
            }
            
            .menu-button:hover {
                color: #ff8c00 !important;
                cursor: pointer;
            }
            
            /* AI Systems Button - Matching Docs Button */
            .ai-systems-button {
                margin-right: 8px;
                border-color: #ff8c00 !important;
                box-shadow: 0 0 8px rgba(255, 140, 0, 0.5) !important;
                cursor: pointer;
            }
            
            .ai-systems-button:hover {
                border-color: #ffa500 !important;
                box-shadow: 0 0 16px rgba(255, 165, 0, 0.8) !important;
                color: #ffa500 !important;
            }
            
            /* Fallback floating button styles */
            #ai-nav-trigger.floating {
                position: fixed;
                top: 35px;
                right: 20px;
                z-index: 9999;
            }
            
            .ai-nav-button {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid #ff8c00;
                color: #ffffff;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                box-shadow: 0 0 8px rgba(255, 140, 0, 0.5);
            }
            
            .ai-nav-button:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: #ffa500;
                box-shadow: 0 0 16px rgba(255, 165, 0, 0.8);
                color: #ffa500;
            }
        `;

        // Append styles to document
        document.head.appendChild(styles);
    }

    addEventListeners() {
        const trigger = document.getElementById('ai-nav-trigger');
        
        // For the integrated button, it IS the button itself
        // For the floating version, we need to find the button inside
        const button = trigger.tagName === 'BUTTON' ? trigger : trigger.querySelector('.ai-nav-button');

        // Navigate to AI Monitor page on click
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            // Navigate to the AI Systems Monitor page
            window.location.href = '/ai-monitor';
        });
    }
}

// Initialize the navigation system
new AINavigationSystem();