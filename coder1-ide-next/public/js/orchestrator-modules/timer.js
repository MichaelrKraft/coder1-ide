/**
 * Orchestrator Timer Module
 * Handles consultation timer functionality
 */

// Ensure global namespace exists
window.OrchestratorModules = window.OrchestratorModules || {};

class ConsultationTimer {
    constructor() {
        this.startTime = null;
        this.intervalId = null;
        this.element = null;
        this.displayElement = null;
        this.progressRing = null;
        this.maxDuration = 30 * 60 * 1000; // 30 minutes default
    }

    /**
     * Initialize timer elements
     */
    init() {
        this.element = document.getElementById('consultation-timer');
        if (this.element) {
            this.displayElement = this.element.querySelector('.timer-display');
            this.progressRing = this.element.querySelector('.timer-progress-ring');
        }
    }

    /**
     * Start the timer
     */
    start() {
        if (this.intervalId) {
            this.stop();
        }

        this.startTime = Date.now();
        this.init();
        
        if (this.element) {
            this.element.style.display = 'flex';
        }

        this.intervalId = setInterval(() => {
            this.update();
        }, 1000);

        this.update();
    }

    /**
     * Update timer display
     */
    update() {
        if (!this.startTime) return;

        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        // Format display
        let display = '';
        if (hours > 0) {
            display = `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        } else {
            display = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
        }

        // Update display element
        if (this.displayElement) {
            this.displayElement.textContent = display;
        }

        // Update progress ring
        if (this.progressRing) {
            const progress = Math.min((elapsed / this.maxDuration) * 100, 100);
            const circumference = 2 * Math.PI * 30; // radius = 30
            const offset = circumference - (progress / 100) * circumference;
            this.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
            this.progressRing.style.strokeDashoffset = offset;

            // Change color based on time
            if (elapsed > 25 * 60 * 1000) { // > 25 minutes
                this.progressRing.style.stroke = '#ff6b6b';
            } else if (elapsed > 15 * 60 * 1000) { // > 15 minutes
                this.progressRing.style.stroke = '#ffd93d';
            } else {
                this.progressRing.style.stroke = '#6bcf7f';
            }
        }

        // Dispatch time update event
        window.dispatchEvent(new CustomEvent('orchestrator:timerUpdate', {
            detail: { elapsed, display }
        }));
    }

    /**
     * Stop the timer
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        
        if (this.element) {
            setTimeout(() => {
                this.element.style.display = 'none';
            }, 2000);
        }

        return elapsed;
    }

    /**
     * Reset the timer
     */
    reset() {
        this.stop();
        this.startTime = null;
        
        if (this.displayElement) {
            this.displayElement.textContent = '0:00';
        }
        
        if (this.progressRing) {
            this.progressRing.style.strokeDashoffset = '0';
            this.progressRing.style.stroke = '#6bcf7f';
        }
    }

    /**
     * Get elapsed time
     */
    getElapsed() {
        if (!this.startTime) return 0;
        return Date.now() - this.startTime;
    }

    /**
     * Format duration
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// Register module
window.OrchestratorModules.timer = {
    ConsultationTimer
};

// Export for ES modules
export { ConsultationTimer };