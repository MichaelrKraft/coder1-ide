"""
Tank class for Tank Demolition Game
Handles tank rendering, movement, and rotation in isometric view
"""
import pygame
import math


class Tank:
    """
    Represents the player's tank with movement and rotation capabilities.
    Rendered in isometric perspective with simple shading.
    """

    def __init__(self, x, y):
        """
        Initialize tank at given position.

        Args:
            x: Starting x position (pixels)
            y: Starting y position (pixels)
        """
        self.x = x
        self.y = y
        self.rotation = 0  # Angle in degrees (0 = right, 90 = down, etc.)
        self.speed = 3  # Pixels per frame when moving

        # Visual properties
        self.width = 60
        self.height = 40
        self.body_color_top = (80, 120, 60)  # Lighter military green
        self.body_color_side = (60, 90, 45)  # Darker military green
        self.shadow_color = (0, 0, 0, 100)  # Semi-transparent black

        # Movement state
        self.moving_forward = False
        self.moving_backward = False
        self.rotating_left = False
        self.rotating_right = False

    def move(self, forward=True):
        """
        Move tank in the direction it's facing.

        Args:
            forward: If True, move forward; if False, move backward
        """
        direction = 1 if forward else -1
        # Convert rotation to radians for math
        rad = math.radians(self.rotation)

        # Calculate movement based on rotation
        self.x += direction * self.speed * math.cos(rad)
        self.y += direction * self.speed * math.sin(rad)

    def rotate(self, clockwise=True):
        """
        Rotate tank.

        Args:
            clockwise: If True, rotate right; if False, rotate left
        """
        rotation_speed = 3  # Degrees per frame
        if clockwise:
            self.rotation += rotation_speed
        else:
            self.rotation -= rotation_speed

        # Keep rotation in 0-360 range
        self.rotation = self.rotation % 360

    def keep_in_bounds(self, screen_width, screen_height):
        """
        Prevent tank from moving off screen.

        Args:
            screen_width: Width of game window
            screen_height: Height of game window
        """
        margin = 30  # Keep tank this many pixels from edge
        self.x = max(margin, min(screen_width - margin, self.x))
        self.y = max(margin, min(screen_height - margin, self.y))

    def draw_shadow(self, surface):
        """
        Draw shadow under tank.

        Args:
            surface: Pygame surface to draw on
        """
        # Create semi-transparent surface for shadow
        shadow_surface = pygame.Surface((self.width + 10, self.height // 2), pygame.SRCALPHA)

        # Draw oval shadow
        pygame.draw.ellipse(
            shadow_surface,
            self.shadow_color,
            (0, 0, self.width + 10, self.height // 2)
        )

        # Position shadow slightly offset from tank
        shadow_x = self.x - (self.width + 10) // 2 + 5
        shadow_y = self.y - (self.height // 2) // 2 + 10

        surface.blit(shadow_surface, (shadow_x, shadow_y))

    def draw(self, surface):
        """
        Draw tank in isometric view with shading.

        Args:
            surface: Pygame surface to draw on
        """
        # Draw shadow first (underneath tank)
        self.draw_shadow(surface)

        # Create a surface for the tank body
        tank_surface = pygame.Surface((self.width, self.height), pygame.SRCALPHA)

        # Draw isometric tank body (two rectangles for depth)
        # Top face (lighter)
        top_points = [
            (self.width // 4, 0),
            (3 * self.width // 4, 0),
            (self.width, self.height // 3),
            (0, self.height // 3)
        ]
        pygame.draw.polygon(tank_surface, self.body_color_top, top_points)

        # Side face (darker)
        side_points = [
            (0, self.height // 3),
            (self.width, self.height // 3),
            (self.width, self.height),
            (0, self.height)
        ]
        pygame.draw.polygon(tank_surface, self.body_color_side, side_points)

        # Add outline for definition
        pygame.draw.polygon(tank_surface, (40, 60, 30), top_points, 2)
        pygame.draw.polygon(tank_surface, (40, 60, 30), side_points, 2)

        # Rotate the tank surface
        rotated_tank = pygame.transform.rotate(tank_surface, -self.rotation)

        # Get rectangle for positioning (center on tank position)
        tank_rect = rotated_tank.get_rect(center=(self.x, self.y))

        # Draw rotated tank
        surface.blit(rotated_tank, tank_rect)

    def update(self):
        """
        Update tank state based on current inputs.
        Called once per frame.
        """
        if self.moving_forward:
            self.move(forward=True)
        if self.moving_backward:
            self.move(forward=False)
        if self.rotating_left:
            self.rotate(clockwise=False)
        if self.rotating_right:
            self.rotate(clockwise=True)
