"""
Tank Demolition Game - Main Game Loop
Session 1: Tank Movement & Basic Rendering

A fun isometric tank game where you destroy buildings block by block!
"""
import pygame
import sys
from tank import Tank


# Game constants
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 768
FPS = 60
BACKGROUND_COLOR = (20, 20, 40)  # Dark blue background
GROUND_COLOR = (40, 60, 50)  # Dark greenish ground


class Game:
    """Main game class that manages the game loop and rendering."""

    def __init__(self):
        """Initialize the game."""
        pygame.init()

        # Set up display
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Tank Demolition")

        # Set up clock for FPS management
        self.clock = pygame.time.Clock()

        # Create tank in center of screen
        self.tank = Tank(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)

        # Game state
        self.running = True

    def handle_events(self):
        """Handle keyboard input and window events."""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False

            # Key press events
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP:
                    self.tank.moving_forward = True
                elif event.key == pygame.K_DOWN:
                    self.tank.moving_backward = True
                elif event.key == pygame.K_LEFT:
                    self.tank.rotating_left = True
                elif event.key == pygame.K_RIGHT:
                    self.tank.rotating_right = True
                elif event.key == pygame.K_ESCAPE:
                    self.running = False

            # Key release events
            if event.type == pygame.KEYUP:
                if event.key == pygame.K_UP:
                    self.tank.moving_forward = False
                elif event.key == pygame.K_DOWN:
                    self.tank.moving_backward = False
                elif event.key == pygame.K_LEFT:
                    self.tank.rotating_left = False
                elif event.key == pygame.K_RIGHT:
                    self.tank.rotating_right = False

    def update(self):
        """Update game state."""
        # Update tank position and rotation
        self.tank.update()

        # Keep tank within screen bounds
        self.tank.keep_in_bounds(SCREEN_WIDTH, SCREEN_HEIGHT)

    def draw_ground(self):
        """Draw a simple ground grid."""
        # Ground fill
        ground_rect = pygame.Rect(0, SCREEN_HEIGHT - 100, SCREEN_WIDTH, 100)
        pygame.draw.rect(self.screen, GROUND_COLOR, ground_rect)

        # Simple grid lines for visual interest
        grid_color = (50, 70, 60)
        grid_spacing = 50

        # Vertical lines
        for x in range(0, SCREEN_WIDTH, grid_spacing):
            pygame.draw.line(
                self.screen,
                grid_color,
                (x, SCREEN_HEIGHT - 100),
                (x, SCREEN_HEIGHT),
                1
            )

        # Horizontal lines
        for y in range(SCREEN_HEIGHT - 100, SCREEN_HEIGHT, grid_spacing):
            pygame.draw.line(
                self.screen,
                grid_color,
                (0, y),
                (SCREEN_WIDTH, y),
                1
            )

    def draw(self):
        """Render everything to the screen."""
        # Clear screen with background color
        self.screen.fill(BACKGROUND_COLOR)

        # Draw ground
        self.draw_ground()

        # Draw tank
        self.tank.draw(self.screen)

        # Draw simple instructions
        font = pygame.font.Font(None, 24)
        instructions = [
            "Arrow Keys: Move and Rotate Tank",
            "ESC: Quit"
        ]

        y_offset = 20
        for instruction in instructions:
            text = font.render(instruction, True, (200, 200, 200))
            self.screen.blit(text, (20, y_offset))
            y_offset += 30

        # Update display
        pygame.display.flip()

    def run(self):
        """Main game loop."""
        print("Tank Demolition - Session 1")
        print("Controls:")
        print("  UP/DOWN arrows: Move forward/backward")
        print("  LEFT/RIGHT arrows: Rotate tank")
        print("  ESC: Quit")
        print("\nStarting game...")

        while self.running:
            # Handle events
            self.handle_events()

            # Update game state
            self.update()

            # Draw everything
            self.draw()

            # Maintain target FPS
            self.clock.tick(FPS)

        # Clean up
        pygame.quit()
        sys.exit()


def main():
    """Entry point for the game."""
    game = Game()
    game.run()


if __name__ == "__main__":
    main()
