/* 
===============================================================================
CODER1 UNIFIED DESIGN SYSTEM - MASTER JAVASCRIPT
===============================================================================
Purpose: Mouse tracking, 3D animations, and interactive effects
Version: 1.0.0
Last Updated: January 31, 2025
===============================================================================
*/

class Coder1DesignSystem {
    constructor() {
        this.init();
    }

    init() {
        this.initMouseTracking();
        this.initScrollEffects();
        this.initBackgroundAnimation();
        this.initButtonEffects();
        console.log('🎨 Coder1 Design System initialized');
    }

    /**
     * Initialize 3D mouse tracking for cards
     */
    initMouseTracking() {
        const cards = document.querySelectorAll('.coder1-card-3d, .coder1-card-3d-enhanced, .coder1-mouse-track');
        
        cards.forEach((card, index) => {
            // Enhanced rotation ranges for different card types
            const isEnhanced = card.classList.contains('coder1-card-3d-enhanced');
            const maxRotation = isEnhanced ? 12 : 10;
            
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Normalized mouse position (-1 to 1)
                const mouseX = (e.clientX - centerX) / (rect.width / 2);
                const mouseY = (e.clientY - centerY) / (rect.height / 2);
                
                // Smooth rotation with bounds
                const rotateX = Math.max(-maxRotation, Math.min(maxRotation, mouseY * -maxRotation));
                const rotateY = Math.max(-maxRotation, Math.min(maxRotation, mouseX * maxRotation));
                
                // Update CSS custom properties
                card.style.setProperty('--mouse-x', mouseX);
                card.style.setProperty('--mouse-y', mouseY);
                
                // Apply immediate transform for enhanced cards
                if (isEnhanced) {
                    card.style.transform = `
                        perspective(1500px)
                        rotateX(${rotateX}deg)
                        rotateY(${rotateY}deg)
                        translateY(-5px)
                        scale(1.02)
                        translateZ(30px)
                    `;
                }
                
                // Optional: Update glow position based on mouse
                const glowX = ((e.clientX - rect.left) / rect.width) * 100;
                const glowY = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--glow-x', `${glowX}%`);
                card.style.setProperty('--glow-y', `${glowY}%`);
            });

            card.addEventListener('mouseleave', () => {
                // Reset transform
                card.style.setProperty('--mouse-x', 0);
                card.style.setProperty('--mouse-y', 0);
                
                if (isEnhanced) {
                    card.style.transform = '';
                }
                
                // Reset glow position
                card.style.setProperty('--glow-x', '50%');
                card.style.setProperty('--glow-y', '50%');
            });

            // Add hover class for CSS transitions
            card.addEventListener('mouseenter', () => {
                card.classList.add('coder1-card-hovering');
            });

            card.addEventListener('mouseleave', () => {
                card.classList.remove('coder1-card-hovering');
            });
        });

        console.log(`✨ Mouse tracking initialized for ${cards.length} cards`);
    }

    /**
     * Initialize scroll-based effects
     */
    initScrollEffects() {
        // Parallax effect for background elements
        const parallaxElements = document.querySelectorAll('.coder1-parallax');
        
        if (parallaxElements.length > 0) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const rate = scrolled * -0.5;
                
                parallaxElements.forEach(element => {
                    element.style.transform = `translateY(${rate}px)`;
                });
            });
        }

        // Fade in animation for cards on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('coder1-fade-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.coder1-card-3d, .coder1-animate-on-scroll').forEach(card => {
            observer.observe(card);
        });
    }

    /**
     * Initialize dynamic background animation
     */
    initBackgroundAnimation() {
        const background = document.querySelector('.coder1-background');
        if (!background) return;

        // Optional: Mouse-following background effect
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;
            
            background.style.background = `
                radial-gradient(circle at ${x}% ${y}%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
                radial-gradient(circle at ${100-x}% ${100-y}%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 40% 20%, rgba(251, 191, 36, 0.04) 0%, transparent 50%)
            `;
        });
    }

    /**
     * Initialize button ripple effects
     */
    initButtonEffects() {
        const buttons = document.querySelectorAll('.coder1-btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                // Create ripple effect
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }

    /**
     * Utility: Add 3D hover to existing elements
     */
    static add3DHover(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.classList.add('coder1-card-3d', 'coder1-mouse-track');
        });
        
        // Reinitialize mouse tracking for new elements
        new Coder1DesignSystem().initMouseTracking();
        
        return elements;
    }

    /**
     * Utility: Create animated counter
     */
    static animateCounter(element, target, duration = 2000) {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = Math.floor(current);
            
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, 16);
    }

    /**
     * Utility: Add typing animation
     */
    static typeWriter(element, text, speed = 50) {
        element.textContent = '';
        let i = 0;
        
        const timer = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            
            if (i > text.length) {
                clearInterval(timer);
            }
        }, speed);
    }
}

// CSS for animations that need to be injected
const additionalCSS = `
/* Ripple animation */
@keyframes ripple {
    to {
        transform: scale(2);
        opacity: 0;
    }
}

/* Fade in animation */
.coder1-fade-in {
    animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Enhanced hover states */
.coder1-card-hovering {
    z-index: 10;
}

.coder1-card-3d-enhanced.coder1-card-hovering {
    border-color: rgba(139, 92, 246, 0.8);
    box-shadow: 
        0 20px 40px rgba(139, 92, 246, 0.3),
        0 0 20px rgba(6, 182, 212, 0.2),
        0 0 30px rgba(139, 92, 246, 0.4);
}

/* Responsive 3D effects */
@media (max-width: 768px) {
    .coder1-card-3d:hover,
    .coder1-card-3d-enhanced:hover {
        transform: translateY(-4px) scale(1.01) !important;
    }
}

/* Performance optimizations */
.coder1-card-3d,
.coder1-card-3d-enhanced {
    will-change: transform;
    transform-style: preserve-3d;
    backface-visibility: hidden;
}
`;

// Inject additional CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Coder1DesignSystem();
    });
} else {
    new Coder1DesignSystem();
}

// Export for manual initialization
window.Coder1DesignSystem = Coder1DesignSystem;