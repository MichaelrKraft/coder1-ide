// Logo Manager - Handles logo loading, error handling, and fallback display
class LogoManager {
    constructor() {
        this.logoImage = document.getElementById('logoImage');
        this.logoFallback = document.getElementById('logoFallback');
        this.logoLoading = document.getElementById('logoLoading');
        this.logoWrapper = document.getElementById('logoWrapper');
        
        this.init();
    }
    
    init() {
        // Show loading state initially
        this.showLoading();
        
        // Set up logo image load handlers
        if (this.logoImage) {
            this.logoImage.onload = () => this.handleLogoLoad();
            this.logoImage.onerror = () => this.handleLogoError();
            
            // Check if image is already cached and loaded
            if (this.logoImage.complete) {
                if (this.logoImage.naturalWidth > 0) {
                    this.handleLogoLoad();
                } else {
                    this.handleLogoError();
                }
            }
        }
    }
    
    showLoading() {
        if (this.logoLoading) {
            this.logoLoading.style.display = 'block';
        }
        if (this.logoWrapper) {
            this.logoWrapper.style.display = 'none';
        }
    }
    
    handleLogoLoad() {
        console.log('Logo loaded successfully');
        
        // Hide loading state
        if (this.logoLoading) {
            this.logoLoading.style.display = 'none';
        }
        
        // Show logo wrapper
        if (this.logoWrapper) {
            this.logoWrapper.style.display = 'flex';
        }
        
        // Hide fallback
        if (this.logoFallback) {
            this.logoFallback.style.display = 'none';
        }
        
        // Show logo image
        if (this.logoImage) {
            this.logoImage.style.display = 'block';
        }
    }
    
    handleLogoError() {
        console.warn('Logo failed to load, showing fallback');
        
        // Hide loading state
        if (this.logoLoading) {
            this.logoLoading.style.display = 'none';
        }
        
        // Show logo wrapper
        if (this.logoWrapper) {
            this.logoWrapper.style.display = 'flex';
        }
        
        // Hide logo image
        if (this.logoImage) {
            this.logoImage.style.display = 'none';
        }
        
        // Show fallback
        if (this.logoFallback) {
            this.logoFallback.style.display = 'flex';
        }
    }
    
    // Public method to reload logo
    reloadLogo() {
        this.showLoading();
        if (this.logoImage) {
            // Force reload by adding timestamp
            const originalSrc = this.logoImage.src.split('?')[0];
            this.logoImage.src = `${originalSrc}?t=${Date.now()}`;
        }
    }
}

// Global function for error handling (called from HTML)
function handleLogoError() {
    if (window.logoManager) {
        window.logoManager.handleLogoError();
    }
}

// Initialize logo manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.logoManager = new LogoManager();
});