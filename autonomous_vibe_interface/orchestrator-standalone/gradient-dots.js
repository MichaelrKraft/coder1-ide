// Gradient Dots Background Animation
// Pure JavaScript implementation of the animated gradient dots background

class GradientDots {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.dotSize = options.dotSize || 8;
        this.spacing = options.spacing || 10;
        this.duration = options.duration || 30;
        this.colorCycleDuration = options.colorCycleDuration || 6;
        this.backgroundColor = options.backgroundColor || '#0a0a0a';
        
        this.hexSpacing = this.spacing * 1.732; // Hexagonal spacing calculation
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        // Set up the container styles
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.zIndex = '-1';
        this.container.style.pointerEvents = 'none';
        this.container.style.backgroundColor = this.backgroundColor;
        
        // Create the animated background
        this.createGradientBackground();
        this.startAnimation();
    }
    
    createGradientBackground() {
        const backgroundImages = [
            `radial-gradient(circle at 50% 50%, transparent 1.5px, ${this.backgroundColor} 0 ${this.dotSize}px, transparent ${this.dotSize}px)`,
            `radial-gradient(circle at 50% 50%, transparent 1.5px, ${this.backgroundColor} 0 ${this.dotSize}px, transparent ${this.dotSize}px)`,
            `radial-gradient(circle at 50% 50%, #f00, transparent 60%)`,
            `radial-gradient(circle at 50% 50%, #ff0, transparent 60%)`,
            `radial-gradient(circle at 50% 50%, #0f0, transparent 60%)`,
            `radial-gradient(ellipse at 50% 50%, #00f, transparent 60%)`
        ].join(', ');
        
        const backgroundSizes = [
            `${this.spacing}px ${this.hexSpacing}px`,
            `${this.spacing}px ${this.hexSpacing}px`,
            '200% 200%',
            '200% 200%',
            '200% 200%',
            `200% ${this.hexSpacing}px`
        ].join(', ');
        
        const initialBackgroundPosition = [
            `0px 0px`,
            `${this.spacing / 2}px ${this.hexSpacing / 2}px`,
            '0% 0%',
            '0% 0%',
            '0% 0px'
        ].join(', ');
        
        this.container.style.backgroundImage = backgroundImages;
        this.container.style.backgroundSize = backgroundSizes;
        this.container.style.backgroundPosition = initialBackgroundPosition;
    }
    
    startAnimation() {
        let startTime = null;
        let hueStartTime = null;
        
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            if (!hueStartTime) hueStartTime = currentTime;
            
            const backgroundElapsed = (currentTime - startTime) / 1000;
            const hueElapsed = (currentTime - hueStartTime) / 1000;
            
            // Calculate background position animation
            const backgroundProgress = (backgroundElapsed % this.duration) / this.duration;
            const backgroundEasing = this.easeInOutSine(backgroundProgress);
            
            // Calculate color cycle animation
            const hueProgress = (hueElapsed % this.colorCycleDuration) / this.colorCycleDuration;
            const hueRotation = hueProgress * 360;
            
            // Animate background positions
            const pos1 = this.interpolateBackgroundPosition(backgroundEasing);
            const pos2 = `${this.spacing / 2}px ${this.hexSpacing / 2}px`;
            const pos3 = this.interpolateColorPosition(backgroundEasing, '800% 400%', '0% 0%');
            const pos4 = this.interpolateColorPosition(backgroundEasing, '1000% -400%', '0% 0%');
            const pos5 = this.interpolateColorPosition(backgroundEasing, '-1200% -600%', '0% 0%');
            const pos6 = this.interpolateColorPosition(backgroundEasing, `400% ${this.hexSpacing}px`, '0% 0%');
            
            const animatedBackgroundPosition = [pos1, pos2, pos3, pos4, pos5, pos6].join(', ');
            
            this.container.style.backgroundPosition = animatedBackgroundPosition;
            this.container.style.filter = `hue-rotate(${hueRotation}deg)`;
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    interpolateBackgroundPosition(progress) {
        const x = 0;
        const y = 0;
        return `${x}px ${y}px`;
    }
    
    interpolateColorPosition(progress, startPos, endPos) {
        // Simple interpolation between color gradient positions
        if (progress < 0.5) {
            return startPos;
        } else {
            return endPos;
        }
    }
    
    easeInOutSine(x) {
        return -(Math.cos(Math.PI * x) - 1) / 2;
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// Enhanced version with more dynamic animation
class EnhancedGradientDots {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.dotSize = options.dotSize || 8;
        this.spacing = options.spacing || 15;
        this.duration = options.duration || 30;
        this.colorCycleDuration = options.colorCycleDuration || 6;
        this.backgroundColor = options.backgroundColor || '#0a0a0a';
        this.opacity = options.opacity || 0.3;
        
        this.hexSpacing = this.spacing * 1.732;
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
            background-color: ${this.backgroundColor};
            opacity: ${this.opacity};
        `;
        
        this.createCanvas();
        this.startAnimation();
    }
    
    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container.appendChild(canvas);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        this.width = rect.width;
        this.height = rect.height;
        this.createDots();
    }
    
    createDots() {
        this.dots = [];
        const cols = Math.ceil(this.width / this.spacing) + 2;
        const rows = Math.ceil(this.height / this.hexSpacing) + 2;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * this.spacing + (row % 2) * (this.spacing / 2);
                const y = row * this.hexSpacing;
                
                this.dots.push({
                    x: x,
                    y: y,
                    baseX: x,
                    baseY: y,
                    size: this.dotSize * (0.5 + Math.random() * 0.5),
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.5 + Math.random() * 0.5,
                    hue: Math.random() * 360,
                    opacity: 0.1 + Math.random() * 0.4
                });
            }
        }
    }
    
    startAnimation() {
        let startTime = null;
        
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = (currentTime - startTime) / 1000;
            
            this.ctx.clearRect(0, 0, this.width, this.height);
            
            // Draw animated dots
            this.dots.forEach(dot => {
                const wave = Math.sin(elapsed * dot.speed + dot.phase) * 20;
                const colorShift = Math.sin(elapsed * 0.5 + dot.phase) * 60;
                
                dot.x = dot.baseX + wave;
                dot.y = dot.baseY + Math.cos(elapsed * dot.speed * 0.7 + dot.phase) * 15;
                
                const hue = (dot.hue + elapsed * 30 + colorShift) % 360;
                const opacity = dot.opacity * (0.7 + Math.sin(elapsed * 2 + dot.phase) * 0.3);
                
                const gradient = this.ctx.createRadialGradient(
                    dot.x, dot.y, 0,
                    dot.x, dot.y, dot.size * 3
                );
                
                gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${opacity})`);
                gradient.addColorStop(0.5, `hsla(${(hue + 180) % 360}, 70%, 50%, ${opacity * 0.5})`);
                gradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(dot.x, dot.y, dot.size * 3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw the core dot
                this.ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${opacity * 1.5})`;
                this.ctx.beginPath();
                this.ctx.arc(dot.x, dot.y, dot.size * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        window.removeEventListener('resize', this.resize);
        if (this.canvas) {
            this.container.removeChild(this.canvas);
        }
    }
}

// Export classes for manual initialization
window.GradientDots = GradientDots;
window.EnhancedGradientDots = EnhancedGradientDots;