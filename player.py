import pygame
from settings import (
    LANE_POSITIONS, PLAYER_WIDTH, PLAYER_HEIGHT,
    PLAYER_SPEED, PLAYER_START_LANE, PLAYER_COLOR,
    SCREEN_HEIGHT
)


class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((PLAYER_WIDTH, PLAYER_HEIGHT), pygame.SRCALPHA)
        self._draw()
        self.lane = PLAYER_START_LANE
        self.target_x = float(LANE_POSITIONS[self.lane])
        self.rect = self.image.get_rect()
        self.rect.centerx = int(self.target_x)
        self.rect.bottom = SCREEN_HEIGHT - 60

    def _draw(self):
        self.image.fill((0, 0, 0, 0))
        # Body
        pygame.draw.rect(self.image, PLAYER_COLOR, (10, 30, 40, 50), border_radius=6)
        # Head
        pygame.draw.circle(self.image, PLAYER_COLOR, (PLAYER_WIDTH // 2, 20), 18)

    def set_lane(self, lane: int):
        """Request a lane change (0, 1, or 2)."""
        if 0 <= lane <= 2:
            self.lane = lane
            self.target_x = float(LANE_POSITIONS[lane])

    def update(self):
        # Smooth slide toward target lane
        dx = self.target_x - self.rect.centerx
        if abs(dx) < PLAYER_SPEED:
            self.rect.centerx = int(self.target_x)
        else:
            self.rect.centerx += int(PLAYER_SPEED * (1 if dx > 0 else -1))
