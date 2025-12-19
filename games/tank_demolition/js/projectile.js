/**
 * Projectile class for Tank Demolition Game
 * Handles bullet/shell rendering and movement
 */
class Projectile {
    /**
     * Create a new projectile
     * @param {number} x - Starting x position
     * @param {number} y - Starting y position
     * @param {number} angle - Direction in degrees
     */
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8; // Pixels per frame
        this.radius = 4; // Projectile size
        this.active = true;

        // Visual properties
        this.color = '#ffc832'; // Bright yellow/orange
        this.trailColor = 'rgba(255, 200, 50, 0.5)';

        // Trail effect
        this.trail = [];
        this.maxTrailLength = 5;
    }

    /**
     * Update projectile position
     */
    update() {
        if (!this.active) return;

        // Save current position for trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Calculate movement
        const rad = (this.angle * Math.PI) / 180;
        this.x += this.speed * Math.sin(rad);
        this.y += this.speed * -Math.cos(rad);
    }

    /**
     * Check if projectile is off screen
     * @param {number} screenWidth - Canvas width
     * @param {number} screenHeight - Canvas height
     * @returns {boolean} True if off screen
     */
    isOffScreen(screenWidth, screenHeight) {
        return this.x < 0 || this.x > screenWidth ||
               this.y < 0 || this.y > screenHeight;
    }

    /**
     * Draw projectile with trail effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active) return;

        // Draw trail (fading circles)
        this.trail.forEach((pos, index) => {
            const alpha = (index + 1) / this.trail.length * 0.5;
            const size = this.radius * ((index + 1) / this.trail.length);

            ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw main projectile
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Add bright center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}


/**
 * Muzzle Flash effect when firing
 */
class MuzzleFlash {
    /**
     * Create a muzzle flash at barrel end
     * @param {number} x - Flash x position
     * @param {number} y - Flash y position
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.maxRadius = 15;
        this.currentRadius = this.maxRadius;
        this.duration = 5; // Frames
        this.frame = 0;
        this.active = true;
    }

    /**
     * Update flash animation
     */
    update() {
        this.frame++;
        if (this.frame >= this.duration) {
            this.active = false;
        }

        // Shrink flash
        this.currentRadius = this.maxRadius * (1 - this.frame / this.duration);
    }

    /**
     * Draw muzzle flash
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active) return;

        const alpha = 1 - (this.frame / this.duration);

        // Outer glow
        ctx.fillStyle = `rgba(255, 200, 50, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright flash
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
