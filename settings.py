# Game settings

SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
FPS = 60
TITLE = "Subway Kids"

# Lanes
LANE_COUNT = 3
LANE_POSITIONS = [SCREEN_WIDTH // 4, SCREEN_WIDTH // 2, 3 * SCREEN_WIDTH // 4]

# Player
PLAYER_WIDTH = 60
PLAYER_HEIGHT = 90
PLAYER_SPEED = 12          # pixels per frame when switching lane
PLAYER_START_LANE = 1      # 0=left, 1=center, 2=right

# Obstacles
OBSTACLE_WIDTH = 60
OBSTACLE_HEIGHT = 60
OBSTACLE_START_SPEED = 6   # pixels per frame
OBSTACLE_SPEED_INCREMENT = 0.002  # increases over time
OBSTACLE_SPAWN_RATE = 90   # frames between spawns (decreases over time)

# Scoring
SCORE_PER_FRAME = 1

# Colors
WHITE      = (255, 255, 255)
BLACK      = (0,   0,   0)
DARK_GRAY  = (40,  40,  40)
GRAY       = (100, 100, 100)
LANE_COLOR = (60,  60,  80)
ROAD_COLOR = (50,  50,  65)
LINE_COLOR = (200, 200, 50)
PLAYER_COLOR = (80, 160, 255)
OBSTACLE_COLOR = (255, 80, 80)
TEXT_COLOR = (255, 255, 255)
HUD_COLOR  = (30,  30,  50)

# Camera / MediaPipe
CAMERA_INDEX = 0
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480
# Horizontal zones: if body center x < LEFT_ZONE -> lane 0
#                   if body center x > RIGHT_ZONE -> lane 2
#                   else -> lane 1
LEFT_ZONE  = 0.38   # fraction of frame width
RIGHT_ZONE = 0.62
