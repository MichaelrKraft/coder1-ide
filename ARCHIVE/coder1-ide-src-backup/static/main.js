// Main application logic
let currentBoxState = {
    isReduced: false,
    originalWidth: 400,
    originalHeight: 300,
    currentWidth: 400,
    currentHeight: 300,
    reductionPercentage: 30
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Autonomous Vibe Interface loaded');
    initializeApplication();
});

function initializeApplication() {
    try {
        const box = document.getElementById('main-box');
        const sizeDisplay = document.getElementById('size-display');
        
        if (!box || !sizeDisplay) {
            throw new Error('Required DOM elements not found');
        }
        
        // Set initial state
        updateSizeDisplay();
        showStatusMessage('Application initialized successfully', 'success');
        
        // Validate initial setup
        if (!validateBoxElement()) {
            throw new Error('Box validation failed');
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showStatusMessage('Initialization failed: ' + error.message, 'error');
    }
}

function reduceBoxSize() {
    try {
        const box = document.getElementById('main-box');
        const reduceBtn = document.getElementById('reduce-btn');
        
        if (!box) {
            throw new Error('Box element not found');
        }
        
        if (currentBoxState.isReduced) {
            showStatusMessage('Box is already reduced', 'info');
            return;
        }
        
        // Disable button during transition
        if (reduceBtn) {
            reduceBtn.disabled = true;
        }
        
        // Calculate new dimensions (30% reduction)
        const reductionFactor = currentBoxState.reductionPercentage / 100;
        currentBoxState.currentWidth = Math.round(currentBoxState.originalWidth * (1 - reductionFactor));
        currentBoxState.currentHeight = Math.round(currentBoxState.originalHeight * (1 - reductionFactor));
        
        // Apply size changes
        box.classList.remove('original-size');
        box.classList.add('reduced-size');
        
        // Update state
        currentBoxState.isReduced = true;
        
        // Update UI
        updateSizeDisplay();
        showStatusMessage(`Box reduced by ${currentBoxState.reductionPercentage}%`, 'success');
        
        // Re-enable button after transition
        setTimeout(() => {
            if (reduceBtn) {
                reduceBtn.disabled = false;
            }
        }, 300);
        
        // Log the change
        logBoxChange('reduced', currentBoxState.currentWidth, currentBoxState.currentHeight);
        
    } catch (error) {
        console.error('Error reducing box size:', error);
        showStatusMessage('Error reducing box: ' + error.message, 'error');
        
        // Re-enable button on error
        const reduceBtn = document.getElementById('reduce-btn');
        if (reduceBtn) {
            reduceBtn.disabled = false;
        }
    }
}

function resetBoxSize() {
    try {
        const box = document.getElementById('main-box');
        const resetBtn = document.getElementById('reset-btn');
        
        if (!box) {
            throw new Error('Box element not found');
        }
        
        if (!currentBoxState.isReduced) {
            showStatusMessage('Box is already at original size', 'info');
            return;
        }
        
        // Disable button during transition
        if (resetBtn) {
            resetBtn.disabled = true;
        }
        
        // Reset to original size
        box.classList.remove('reduced-size');
        box.classList.add('original-size');
        
        // Update state
        currentBoxState.isReduced = false;
        currentBoxState.currentWidth = currentBoxState.originalWidth;
        currentBoxState.currentHeight = currentBoxState.originalHeight;
        
        // Update UI
        updateSizeDisplay();
        showStatusMessage('Box reset to original size', 'success');
        
        // Re-enable button after transition
        setTimeout(() => {
            if (resetBtn) {
                resetBtn.disabled = false;
            }
        }, 300);
        
        // Log the change
        logBoxChange('reset', currentBoxState.currentWidth, currentBoxState.currentHeight);
        
    } catch (error) {
        console.error('Error resetting box size:', error);
        showStatusMessage('Error resetting box: ' + error.message, 'error');
        
        // Re-enable button on error
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.disabled = false;
        }
    }
}

function updateSizeDisplay() {
    try {
        const sizeDisplay = document.getElementById('size-display');
        if (!sizeDisplay) {
            throw new Error('Size display element not found');
        }
        
        const currentPercentage = currentBoxState.isReduced ? 
            (100 - currentBoxState.reductionPercentage) : 100;
        
        sizeDisplay.textContent = `${currentPercentage}%`;
        
    } catch (error) {
        console.error('Error updating size display:', error);
    }
}

function showStatusMessage(message, type = 'info') {
    try {
        const statusElement = document.getElementById('status-message');
        if (!statusElement) {
            console.warn('Status message element not found');
            return;
        }
        
        // Clear previous classes
        statusElement.className = 'status-message';
        
        // Add new class
        statusElement.classList.add(type);
        statusElement.textContent = message;
        
        // Auto-clear after 3 seconds
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 3000);
        
    } catch (error) {
        console.error('Error showing status message:', error);
    }
}

function logBoxChange(action, width, height) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        action,
        dimensions: { width, height },
        state: currentBoxState.isReduced ? 'reduced' : 'original'
    };
    
    console.log('Box change:', logEntry);
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        reduceBoxSize,
        resetBoxSize,
        updateSizeDisplay,
        showStatusMessage,
        currentBoxState
    };
}