// Simple XTerm.js loader that ensures libraries are available globally
(function() {
  'use strict';
  
  console.log('🚀 XTerm Loader: Starting...');
  
  // The xterm.js and addon-fit.js files are UMD modules
  // When loaded via script tags, they should define their exports
  // We need to make sure they're available on window
  
  function checkAndFixXTerm() {
    // Check if Terminal is already on window
    if (window.Terminal) {
      console.log('✅ Terminal already on window');
      return;
    }
    
    // Check common UMD export patterns
    if (typeof exports !== 'undefined' && exports.Terminal) {
      window.Terminal = exports.Terminal;
      console.log('✅ Terminal copied from exports');
    } else if (typeof module !== 'undefined' && module.exports && module.exports.Terminal) {
      window.Terminal = module.exports.Terminal;
      console.log('✅ Terminal copied from module.exports');
    } else {
      console.warn('⚠️ Terminal not found in expected locations');
    }
  }
  
  function checkAndFixFitAddon() {
    // Check if FitAddon constructor is already properly on window
    if (window.FitAddon && typeof window.FitAddon === 'function') {
      console.log('✅ FitAddon constructor already on window');
      return;
    }
    
    // Check if FitAddon is an object with FitAddon property (common UMD pattern)
    if (window.FitAddon && window.FitAddon.FitAddon) {
      const RealFitAddon = window.FitAddon.FitAddon;
      window.FitAddon = RealFitAddon;
      console.log('✅ FitAddon extracted from window.FitAddon.FitAddon');
      return;
    }
    
    // Check common UMD export patterns
    if (typeof exports !== 'undefined' && exports.FitAddon) {
      if (typeof exports.FitAddon === 'function') {
        window.FitAddon = exports.FitAddon;
        console.log('✅ FitAddon copied from exports');
      } else if (exports.FitAddon.FitAddon) {
        window.FitAddon = exports.FitAddon.FitAddon;
        console.log('✅ FitAddon copied from exports.FitAddon.FitAddon');
      }
    } else if (typeof module !== 'undefined' && module.exports && module.exports.FitAddon) {
      if (typeof module.exports.FitAddon === 'function') {
        window.FitAddon = module.exports.FitAddon;
        console.log('✅ FitAddon copied from module.exports');
      } else if (module.exports.FitAddon.FitAddon) {
        window.FitAddon = module.exports.FitAddon.FitAddon;
        console.log('✅ FitAddon copied from module.exports.FitAddon.FitAddon');
      }
    } else {
      console.warn('⚠️ FitAddon not found, creating fallback');
      // Provide a minimal fallback
      window.FitAddon = class FitAddon {
        activate(terminal) {
          this._terminal = terminal;
        }
        
        fit() {
          if (!this._terminal) return;
          console.log('Using fallback FitAddon');
        }
        
        dispose() {
          this._terminal = null;
        }
      };
    }
  }
  
  // Run checks immediately
  checkAndFixXTerm();
  checkAndFixFitAddon();
  
  // Also run after a delay in case scripts are still loading
  setTimeout(() => {
    checkAndFixXTerm();
    checkAndFixFitAddon();
    console.log('🎯 XTerm Loader: Complete');
  }, 100);
  
})();