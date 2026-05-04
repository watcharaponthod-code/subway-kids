# Subway Kids

Subway Surfers-style endless runner controlled by real body movement via webcam.

## Requirements
- Python 3.10+
- Webcam

## Setup
```bash
pip install -r requirements.txt
python main.py
```

## Controls
| Input | Action |
|-------|--------|
| Body left | Move to left lane |
| Body center | Stay in middle lane |
| Body right | Move to right lane |
| Arrow keys | Keyboard fallback |
| F | Toggle fullscreen |
| R | Restart after game over |
| ESC / Q | Quit |

## Project Structure
```
subway-kids/
├── main.py        # Entry point & game loop
├── game.py        # Game state, rendering, collision
├── player.py      # Player sprite & lane movement
├── obstacle.py    # Obstacle sprite
├── camera.py      # MediaPipe pose detection
├── settings.py    # All constants & tuning values
└── requirements.txt
```
