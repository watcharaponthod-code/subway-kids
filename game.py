"""
game.py — Core game logic and rendering.
"""

import pygame
import random
from settings import *
from player import Player
from obstacle import Obstacle


class Game:
    def __init__(self, screen: pygame.Surface):
        self.screen = screen
        self.clock = pygame.time.Clock()
        self.font_big   = pygame.font.SysFont("Arial", 64, bold=True)
        self.font_small = pygame.font.SysFont("Arial", 32)

        self.all_sprites  = pygame.sprite.Group()
        self.obstacle_grp = pygame.sprite.Group()

        self.player = Player()
        self.all_sprites.add(self.player)

        self.score = 0
        self.speed = float(OBSTACLE_START_SPEED)
        self.spawn_timer = 0
        self.spawn_rate  = OBSTACLE_SPAWN_RATE
        self.running = True
        self.game_over = False

        # Road scroll
        self.road_offset = 0
        self.dash_positions = [i * 120 for i in range(8)]

    # ------------------------------------------------------------------
    def spawn_obstacle(self):
        obs = Obstacle(self.speed)
        self.all_sprites.add(obs)
        self.obstacle_grp.add(obs)

    # ------------------------------------------------------------------
    def update(self, lane: int):
        """Call every frame. lane = 0/1/2 from camera (or keyboard)."""
        if self.game_over:
            return

        self.player.set_lane(lane)
        self.all_sprites.update()

        # Speed & spawn rate ramp-up
        self.speed += OBSTACLE_SPEED_INCREMENT
        if self.spawn_rate > 40:
            self.spawn_rate -= 0.01

        # Spawn obstacles
        self.spawn_timer += 1
        if self.spawn_timer >= int(self.spawn_rate):
            self.spawn_obstacle()
            self.spawn_timer = 0

        # Score
        self.score += SCORE_PER_FRAME

        # Collision
        if pygame.sprite.spritecollide(self.player, self.obstacle_grp, False):
            self.game_over = True

        # Scroll road
        self.road_offset = (self.road_offset + int(self.speed)) % 120

    # ------------------------------------------------------------------
    def draw(self):
        self.screen.fill(ROAD_COLOR)
        self._draw_road()
        self.all_sprites.draw(self.screen)
        self._draw_hud()
        if self.game_over:
            self._draw_game_over()

    # ------------------------------------------------------------------
    def _draw_road(self):
        road_left  = SCREEN_WIDTH // 4 - 60
        road_right = 3 * SCREEN_WIDTH // 4 + 60
        pygame.draw.rect(self.screen, LANE_COLOR, (road_left, 0, road_right - road_left, SCREEN_HEIGHT))

        # Lane dividers (scrolling dashes)
        for lx in [SCREEN_WIDTH // 2]:
            for i in range(-1, 8):
                y = i * 120 + self.road_offset
                pygame.draw.rect(self.screen, LINE_COLOR, (lx - 3, y, 6, 70))

    def _draw_hud(self):
        # Score banner
        pygame.draw.rect(self.screen, HUD_COLOR, (0, 0, SCREEN_WIDTH, 60))
        score_surf = self.font_small.render(f"Score: {self.score}", True, TEXT_COLOR)
        speed_surf = self.font_small.render(f"Speed: {self.speed:.1f}", True, GRAY)
        self.screen.blit(score_surf, (20, 14))
        self.screen.blit(speed_surf, (SCREEN_WIDTH - 180, 14))

    def _draw_game_over(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 160))
        self.screen.blit(overlay, (0, 0))

        msg   = self.font_big.render("GAME OVER", True, (255, 80, 80))
        score = self.font_small.render(f"Final Score: {self.score}", True, WHITE)
        hint  = self.font_small.render("Press R to restart  |  ESC to quit", True, GRAY)

        self.screen.blit(msg,   msg.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 60)))
        self.screen.blit(score, score.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 10)))
        self.screen.blit(hint,  hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 60)))

    # ------------------------------------------------------------------
    def reset(self):
        self.all_sprites.empty()
        self.obstacle_grp.empty()
        self.player = Player()
        self.all_sprites.add(self.player)
        self.score = 0
        self.speed = float(OBSTACLE_START_SPEED)
        self.spawn_timer = 0
        self.spawn_rate  = OBSTACLE_SPAWN_RATE
        self.game_over = False
