/**
 * Tank Demolition Game - Main Game Loop
 * Session 1: Tank Movement & Basic Rendering
 *
 * A fun isometric tank game where you destroy buildings block by block!
 */

// Game constants
const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = 768;
const FPS = 60;
const BACKGROUND_COLOR = '#000000'; // Black background like Atari
const GRID_COLOR = '#1a1a1a'; // Subtle grid lines
const GRID_SIZE = 32; // Grid square size (matches tank size)

class Game {
    /**
     * Initialize the game
     */
    constructor() {
        // Get canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.canvas.width = SCREEN_WIDTH;
        this.canvas.height = SCREEN_HEIGHT;

        // Create tank in center of screen
        this.tank = new Tank(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);

        // Game state
        this.running = false;
        this.lastTime = 0;

        // Projectiles and effects
        this.projectiles = [];
        this.muzzleFlashes = [];
        this.maxProjectiles = 3;

        // Bind keyboard events
        this.setupKeyboardControls();

        // Start game loop
        this.start();
    }

    /**
     * Set up keyboard event listeners
     */
    setupKeyboardControls() {
        // Key press events
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    this.tank.movingForward = true;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.tank.movingBackward = true;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.tank.rotatingLeft = true;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.tank.rotatingRight = true;
                    e.preventDefault();
                    break;
                case 'a':
                case 'A':
                    this.tank.rotatingTurretLeft = true;
                    e.preventDefault();
                    break;
                case 'd':
                case 'D':
                    this.tank.rotatingTurretRight = true;
                    e.preventDefault();
                    break;
                case ' ':
                    this.shoot();
                    e.preventDefault();
                    break;
            }
        });

        // Key release events
        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    this.tank.movingForward = false;
                    break;
                case 'ArrowDown':
                    this.tank.movingBackward = false;
                    break;
                case 'ArrowLeft':
                    this.tank.rotatingLeft = false;
                    break;
                case 'ArrowRight':
                    this.tank.rotatingRight = false;
                    break;
                case 'a':
                case 'A':
                    this.tank.rotatingTurretLeft = false;
                    break;
                case 'd':
                case 'D':
                    this.tank.rotatingTurretRight = false;
                    break;
            }
        });
    }

    /**
     * Fire a projectile from the tank
     */
    shoot() {
        // Check projectile limit
        const activeProjectiles = this.projectiles.filter(p => p.active);
        if (activeProjectiles.length >= this.maxProjectiles) {
            return; // Can't shoot, already at max
        }

        // Get barrel end position
        const barrelEnd = this.tank.getBarrelEnd();

        // Create projectile
        const projectile = new Projectile(
            barrelEnd.x,
            barrelEnd.y,
            this.tank.turretRotation
        );
        this.projectiles.push(projectile);

        // Create muzzle flash
        const flash = new MuzzleFlash(barrelEnd.x, barrelEnd.y);
        this.muzzleFlashes.push(flash);
    }

    /**
     * Update game state
     */
    update() {
        // Update tank position and rotation
        this.tank.update();

        // Keep tank within screen bounds
        this.tank.keepInBounds(SCREEN_WIDTH, SCREEN_HEIGHT);

        // Update projectiles
        this.projectiles.forEach(projectile => {
            projectile.update();

            // Deactivate if off screen
            if (projectile.isOffScreen(SCREEN_WIDTH, SCREEN_HEIGHT)) {
                projectile.active = false;
            }
        });

        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(p => p.active);

        // Update muzzle flashes
        this.muzzleFlashes.forEach(flash => flash.update());
        this.muzzleFlashes = this.muzzleFlashes.filter(f => f.active);
    }

    /**
     * Draw Atari-style grid background
     */
    drawGround() {
        const ctx = this.ctx;

        // Draw subtle grid like classic tank games
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= SCREEN_WIDTH; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, SCREEN_HEIGHT);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= SCREEN_HEIGHT; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(SCREEN_WIDTH, y);
            ctx.stroke();
        }
    }

    /**
     * Draw instructions on screen
     */
    drawInstructions() {
        const ctx = this.ctx;
        ctx.fillStyle = '#c8c8c8';
        ctx.font = '18px Arial, sans-serif';

        const activeProjectiles = this.projectiles.filter(p => p.active).length;
        const availableAmmo = this.maxProjectiles - activeProjectiles;

        const instructions = [
            'Arrow Keys: Move Tank | A/D: Aim Turret | SPACE: Shoot',
            `Ammo: ${availableAmmo}/${this.maxProjectiles}`,
            'Session 2: Shooting Mechanics ✓'
        ];

        let yOffset = 20;
        instructions.forEach(instruction => {
            ctx.fillText(instruction, 20, yOffset);
            yOffset += 25;
        });
    }

    /**
     * Render everything to the screen
     */
    draw() {
        const ctx = this.ctx;

        // Clear screen with background color
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Draw ground
        this.drawGround();

        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.draw(ctx));

        // Draw tank
        this.tank.draw(ctx);

        // Draw muzzle flashes (on top)
        this.muzzleFlashes.forEach(flash => flash.draw(ctx));

        // Draw instructions
        this.drawInstructions();
    }

    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    gameLoop(currentTime) {
        if (!this.running) return;

        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update game state
        this.update();

        // Draw everything
        this.draw();

        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Start the game
     */
    start() {
        console.log('Tank Demolition - Session 1');
        console.log('Controls:');
        console.log('  UP/DOWN arrows: Move forward/backward');
        console.log('  LEFT/RIGHT arrows: Rotate tank');
        console.log('Starting game...');

        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Stop the game
     */
    stop() {
        this.running = false;
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    const game = new Game();
});
