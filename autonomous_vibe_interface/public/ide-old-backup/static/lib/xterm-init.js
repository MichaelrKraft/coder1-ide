// XTerm.js initialization script - ensures proper loading in browser environment
// This script bridges the gap between UMD modules and browser globals

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeXTerm);
  } else {
    initializeXTerm();
  }
  
  function initializeXTerm() {
    console.log('🚀 Initializing XTerm.js...');
    
    // Check if Terminal is already loaded
    if (window.Terminal) {
      console.log('✅ XTerm Terminal already loaded');
      return;
    }
    
    // The xterm.js library uses UMD format and exports to module.exports or window
    // Check all possible locations where xterm might have exported
    if (window.exports) {
      // Check for direct Terminal export
      if (window.exports.Terminal) {
        window.Terminal = window.exports.Terminal;
        console.log('✅ XTerm Terminal loaded from exports.Terminal');
      } 
      // Check if exports itself is the Terminal constructor
      else if (typeof window.exports === 'function' && window.exports.name === 'Terminal') {
        window.Terminal = window.exports;
        console.log('✅ XTerm Terminal loaded from exports (function)');
      }
      // Check for default export pattern
      else if (window.exports.default && window.exports.default.Terminal) {
        window.Terminal = window.exports.default.Terminal;
        console.log('✅ XTerm Terminal loaded from exports.default.Terminal');
      }
      // Check if there's anything else in exports
      else {
        console.log('⚠️ Exports object:', Object.keys(window.exports));
        // Try to find Terminal in exports
        for (const key in window.exports) {
          if (key.toLowerCase().includes('terminal')) {
            window.Terminal = window.exports[key];
            console.log(`✅ XTerm Terminal loaded from exports.${key}`);
            break;
          }
        }
      }
    }
    
    // Let's wait a bit if it hasn't loaded yet
    let attempts = 0;
    const checkInterval = setInterval(function() {
      attempts++;
      
      // Check exports first
      if (!window.Terminal && window.exports && window.exports.Terminal) {
        window.Terminal = window.exports.Terminal;
        console.log('✅ XTerm Terminal loaded from exports');
      }
      
      if (window.Terminal) {
        console.log('✅ XTerm Terminal ready');
        clearInterval(checkInterval);
        
        // Now handle the FitAddon which uses UMD format
        // The addon-fit.js uses UMD and expects to attach to exports or window
        if (!window.FitAddon) {
          if (window.exports && window.exports.FitAddon) {
            window.FitAddon = window.exports.FitAddon;
            console.log('✅ FitAddon loaded from exports.FitAddon');
          } else if (window.exports && typeof window.exports === 'function' && window.exports.name === 'FitAddon') {
            window.FitAddon = window.exports;
            console.log('✅ FitAddon loaded from exports (function)');
          } else {
            // Check all exports for FitAddon
            if (window.exports) {
              console.log('⚠️ Looking for FitAddon in exports:', Object.keys(window.exports));
              for (const key in window.exports) {
                if (key.toLowerCase().includes('fitaddon') || key.toLowerCase().includes('fit')) {
                  window.FitAddon = window.exports[key];
                  console.log(`✅ FitAddon loaded from exports.${key}`);
                  break;
                }
              }
            }
          }
        } else {
          console.log('✅ FitAddon already loaded');
        }
        
        if (!window.FitAddon) {
          console.warn('⚠️ FitAddon not found, creating fallback');
          // Provide a fallback FitAddon if it failed to load
          window.FitAddon = class FitAddon {
            constructor() {
              this._terminal = null;
            }
            
            activate(terminal) {
              this._terminal = terminal;
            }
            
            dispose() {
              this._terminal = null;
            }
            
            fit() {
              if (!this._terminal) return;
              
              // Basic fit implementation
              const element = this._terminal.element;
              if (!element || !element.parentElement) return;
              
              const parentStyle = window.getComputedStyle(element.parentElement);
              const width = parseInt(parentStyle.width);
              const height = parseInt(parentStyle.height);
              
              // Estimate character dimensions (fallback values)
              const charWidth = 9;
              const charHeight = 17;
              
              const cols = Math.floor(width / charWidth) - 2;
              const rows = Math.floor(height / charHeight) - 1;
              
              if (cols > 0 && rows > 0) {
                this._terminal.resize(cols, rows);
              }
            }
            
            proposeDimensions() {
              if (!this._terminal) return null;
              
              const element = this._terminal.element;
              if (!element || !element.parentElement) return null;
              
              const parentStyle = window.getComputedStyle(element.parentElement);
              const width = parseInt(parentStyle.width);
              const height = parseInt(parentStyle.height);
              
              const charWidth = 9;
              const charHeight = 17;
              
              return {
                cols: Math.floor(width / charWidth) - 2,
                rows: Math.floor(height / charHeight) - 1
              };
            }
          };
        }
        
        // Dispatch a custom event to signal that XTerm is ready
        window.dispatchEvent(new CustomEvent('xterm-ready', {
          detail: {
            Terminal: window.Terminal,
            FitAddon: window.FitAddon
          }
        }));
        
      } else if (attempts > 50) {
        console.error('❌ Failed to load XTerm.js after 5 seconds');
        clearInterval(checkInterval);
      }
    }, 100);
  }
})();