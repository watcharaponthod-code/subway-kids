import pygame
import random
from settings import (
    LANE_POSITIONS, OBSTACLE_WIDTH, OBSTACLE_HEIGHT,
    OBSTACLE_COLOR, SCREEN_HEIGHT
)


class Obstacle(pygame.sprite.Sprite):
    def __init__(self, speed: float):
        super().__init__()
        self.image = pygame.Surface((OBSTACLE_WIDTH, OBSTACLE_HEIGHT), pygame.SRCALPHA)
        self._draw()
        lane = random.randint(0, 2)
        self.rect = self.image.get_rect()
        self.rect.centerx = LANE_POSITIONS[lane]
        self.rect.bottom = 0   # start above screen
        self.speed = speed

    def _draw(self):
        self.image.fill((0, 0, 0, 0))
        pygame.draw.rect(
            self.image, OBSTACLE_COLOR,
            (0, 0, OBSTACLE_WIDTH, OBSTACLE_HEIGHT),
            border_radius=8
        )
        # Simple X mark
        pygame.draw.line(self.image, (255, 200, 200), (10, 10), (OBSTACLE_WIDTH - 10, OBSTACLE_HEIGHT - 10), 4)
        pygame.draw.line(self.image, (255, 200, 200), (OBSTACLE_WIDTH - 10, 10), (10, OBSTACLE_HEIGHT - 10), 4)

    def update(self):
        self.rect.y += int(self.speed)
        if self.rect.top > SCREEN_HEIGHT:
            self.kill()
