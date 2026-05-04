"""
main.py — Entry point for Subway Kids.

Controls:
  Body movement (webcam)  — move left / right / center
  Arrow keys              — fallback keyboard control
  R                       — restart after game over
  ESC / Q                 — quit
  F                       — toggle fullscreen
"""

import sys
import pygame
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, FPS, TITLE
from game import Game
from camera import PoseCamera


def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption(TITLE)

    camera = PoseCamera()
    if not camera.active:
        print("[WARN] No webcam found — using keyboard-only mode.")

    game = Game(screen)
    fullscreen = False

    while True:
        # --- Events ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                camera.release()
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_q):
                    camera.release()
                    pygame.quit()
                    sys.exit()

                if event.key == pygame.K_r and game.game_over:
                    game.reset()

                if event.key == pygame.K_f:
                    fullscreen = not fullscreen
                    flags = pygame.FULLSCREEN if fullscreen else 0
                    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags)
                    game.screen = screen

        # --- Lane input ---
        if camera.active:
            lane = camera.update()
        else:
            # Keyboard fallback
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                lane = 0
            elif keys[pygame.K_RIGHT]:
                lane = 2
            else:
                lane = 1

        # Also allow arrow keys to override camera
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            lane = 0
        elif keys[pygame.K_RIGHT]:
            lane = 2

        # --- Update & Draw ---
        game.update(lane)
        game.draw()
        pygame.display.flip()
        pygame.time.Clock().tick(FPS)


if __name__ == "__main__":
    main()
