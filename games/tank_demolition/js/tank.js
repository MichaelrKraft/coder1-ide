/**
 * Tank class for Tank Demolition Game
 * Handles tank rendering, movement, and rotation in top-down Atari style
 */
class Tank {
    /**
     * Initialize tank at given position
     * @param {number} x - Starting x position (pixels)
     * @param {number} y - Starting y position (pixels)
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rotation = 0; // Tank body angle in degrees (0 = up, 90 = right, etc.)
        this.turretRotation = 0; // Turret angle (independent from body)
        this.speed = 2; // Pixels per frame when moving

        // Visual properties - Atari style pixelated tank
        this.width = 48;
        this.height = 48;
        this.tankGreen = '#60a050'; // Bright green like Atari
        this.tankDark = '#409030'; // Dark green for details
        this.trackColor = '#306020'; // Even darker for treads
        this.barrelLength = 30; // Length of turret barrel

        // Movement state
        this.movingForward = false;
        this.movingBackward = false;
        this.rotatingLeft = false;
        this.rotatingRight = false;
        this.rotatingTurretLeft = false;
        this.rotatingTurretRight = false;
    }

    /**
     * Move tank in the direction it's facing
     * @param {boolean} forward - If true, move forward; if false, move backward
     */
    move(forward = true) {
        const direction = forward ? 1 : -1;
        // Convert rotation to radians for math
        const rad = (this.rotation * Math.PI) / 180;

        // Calculate movement based on rotation
        // For top-down view: 0° = up, 90° = right, 180° = down, 270° = left
        this.x += direction * this.speed * Math.sin(rad);
        this.y += direction * this.speed * -Math.cos(rad);
    }

    /**
     * Rotate tank
     * @param {boolean} clockwise - If true, rotate right; if false, rotate left
     */
    rotate(clockwise = true) {
        const rotationSpeed = 3; // Degrees per frame
        if (clockwise) {
            this.rotation += rotationSpeed;
        } else {
            this.rotation -= rotationSpeed;
        }

        // Keep rotation in 0-360 range
        this.rotation = ((this.rotation % 360) + 360) % 360;
    }

    /**
     * Rotate turret independently from tank body
     * @param {boolean} clockwise - If true, rotate right; if false, rotate left
     */
    rotateTurret(clockwise = true) {
        const rotationSpeed = 3; // Degrees per frame
        if (clockwise) {
            this.turretRotation += rotationSpeed;
        } else {
            this.turretRotation -= rotationSpeed;
        }

        // Keep rotation in 0-360 range
        this.turretRotation = ((this.turretRotation % 360) + 360) % 360;
    }

    /**
     * Get the barrel end position in world coordinates
     * @returns {{x: number, y: number}} The barrel end position
     */
    getBarrelEnd() {
        const rad = (this.turretRotation * Math.PI) / 180;
        return {
            x: this.x + this.barrelLength * Math.sin(rad),
            y: this.y + this.barrelLength * -Math.cos(rad)
        };
    }

    /**
     * Prevent tank from moving off screen
     * @param {number} screenWidth - Width of game canvas
     * @param {number} screenHeight - Height of game canvas
     */
    keepInBounds(screenWidth, screenHeight) {
        const margin = 30; // Keep tank this many pixels from edge
        this.x = Math.max(margin, Math.min(screenWidth - margin, this.x));
        this.y = Math.max(margin, Math.min(screenHeight - margin, this.y));
    }

    /**
     * Draw tank in classic Atari top-down style with pixelated look
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        ctx.save();

        // Translate to tank position and rotate BODY only
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Disable image smoothing for pixelated look
        ctx.imageSmoothingEnabled = false;

        // Draw tank treads/tracks (left and right sides) - scaled 1.5x
        ctx.fillStyle = this.trackColor;
        // Left track
        ctx.fillRect(-21, -24, 9, 48);
        // Right track
        ctx.fillRect(12, -24, 9, 48);

        // Draw tank body (main hull) - scaled 1.5x
        ctx.fillStyle = this.tankGreen;
        ctx.fillRect(-15, -18, 30, 36);

        // Draw darker detail on body (hatch/panel) - scaled 1.5x
        ctx.fillStyle = this.tankDark;
        ctx.fillRect(-9, -12, 18, 24);

        // Add pixelated highlights for 3D effect - scaled 1.5x
        ctx.fillStyle = '#70b060';
        ctx.fillRect(-12, -15, 3, 3); // Left highlight
        ctx.fillRect(-12, -6, 3, 3);
        ctx.fillRect(-12, 3, 3, 3);

        // Add shadows for depth - scaled 1.5x
        ctx.fillStyle = this.trackColor;
        ctx.fillRect(9, 12, 3, 3); // Bottom right shadow
        ctx.fillRect(9, 3, 3, 3);
        ctx.fillRect(9, -6, 3, 3);

        ctx.restore();

        // Draw turret separately (rotates independently)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.turretRotation * Math.PI) / 180);

        // Draw tank turret barrel (pointing in turret direction)
        ctx.fillStyle = this.tankDark;
        ctx.fillRect(-3, -30, 6, 18);

        // Draw turret base
        ctx.fillStyle = this.tankGreen;
        ctx.fillRect(-9, -9, 18, 18);

        // Draw center dot to show turret direction
        ctx.fillStyle = this.tankDark;
        ctx.fillRect(-2, -2, 4, 4);

        ctx.restore();
    }

    /**
     * Update tank state based on current inputs
     * Called once per frame
     */
    update() {
        if (this.movingForward) {
            this.move(true);
        }
        if (this.movingBackward) {
            this.move(false);
        }
        if (this.rotatingLeft) {
            this.rotate(false);
        }
        if (this.rotatingRight) {
            this.rotate(true);
        }
        if (this.rotatingTurretLeft) {
            this.rotateTurret(false);
        }
        if (this.rotatingTurretRight) {
            this.rotateTurret(true);
        }
    }
}
