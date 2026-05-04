// ─── Constants ────────────────────────────────────────────────────────────────
const W = 1280;
const H = 720;
const ROAD_LEFT  = 220;
const ROAD_RIGHT = 1060;
const LANE_XS    = [370, 640, 910] as const;  // center-x of each lane
const PLAYER_W   = 60;
const PLAYER_H   = 90;
const PLAYER_Y   = H - 100;                    // center-y of player
const OBS_W      = 64;
const OBS_H      = 64;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Obstacle { x: number; y: number; }

export type GameStatus = "idle" | "playing" | "over";

export interface GameSnapshot {
  score:  number;
  lives:  number;
  status: GameStatus;
  lane:   number;
}

// ─── Engine ───────────────────────────────────────────────────────────────────
export class GameEngine {
  private ctx:    CanvasRenderingContext2D;
  private status: GameStatus = "idle";

  // player
  private lane       = 1;
  private playerX    = LANE_XS[1];
  private targetX    = LANE_XS[1];

  // game state
  private obstacles:  Obstacle[] = [];
  private score       = 0;
  private lives       = 3;
  private speed       = 5;
  private spawnTimer  = 0;
  private spawnRate   = 80;
  private roadOffset  = 0;
  private animId      = 0;
  private flashTimer  = 0;        // invincibility frames after hit

  private onUpdate: (s: GameSnapshot) => void;

  constructor(canvas: HTMLCanvasElement, onUpdate: (s: GameSnapshot) => void) {
    this.ctx = canvas.getContext("2d")!;
    this.onUpdate = onUpdate;
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  start() {
    cancelAnimationFrame(this.animId);
    this.reset();
    this.status = "playing";
    this.tick();
  }

  stop() { cancelAnimationFrame(this.animId); }

  setLane(lane: number) {
    if (lane >= 0 && lane <= 2) {
      this.lane    = lane;
      this.targetX = LANE_XS[lane];
    }
  }

  getStatus() { return this.status; }

  // ── Private ─────────────────────────────────────────────────────────────────
  private reset() {
    this.lane       = 1;
    this.playerX    = LANE_XS[1];
    this.targetX    = LANE_XS[1];
    this.obstacles  = [];
    this.score      = 0;
    this.lives      = 3;
    this.speed      = 5;
    this.spawnTimer = 0;
    this.spawnRate  = 80;
    this.roadOffset = 0;
    this.flashTimer = 0;
  }

  private tick = () => {
    this.update();
    this.draw();
    if (this.status !== "over") {
      this.animId = requestAnimationFrame(this.tick);
    } else {
      this.draw();         // draw final game-over frame
    }
  };

  private update() {
    if (this.status !== "playing") return;

    // Smooth lane slide
    const dx = this.targetX - this.playerX;
    this.playerX += Math.abs(dx) < 12 ? dx : 12 * Math.sign(dx);

    // Scroll road
    this.roadOffset = (this.roadOffset + this.speed) % 120;

    // Move obstacles
    for (const obs of this.obstacles) obs.y += this.speed;
    this.obstacles = this.obstacles.filter(o => o.y < H + 80);

    // Spawn
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnRate) {
      const lane = Math.floor(Math.random() * 3);
      this.obstacles.push({ x: LANE_XS[lane], y: -OBS_H });
      this.spawnTimer = 0;
    }

    // Ramp up
    this.speed      = Math.min(5 + this.score / 600, 16);
    if (this.spawnRate > 38) this.spawnRate -= 0.015;

    this.score++;
    if (this.flashTimer > 0) { this.flashTimer--; }

    // Collision (skip during invincibility)
    if (this.flashTimer === 0) {
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        const hit =
          Math.abs(obs.x - this.playerX) < (PLAYER_W / 2 + OBS_W / 2) * 0.65 &&
          Math.abs(obs.y - PLAYER_Y)      < (PLAYER_H / 2 + OBS_H / 2) * 0.65;
        if (hit) {
          this.lives--;
          this.obstacles.splice(i, 1);
          this.flashTimer = 90;   // ~1.5 s invincible
          if (this.lives <= 0) { this.status = "over"; }
          break;
        }
      }
    }

    this.onUpdate({ score: this.score, lives: this.lives, status: this.status, lane: this.lane });
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────
  private draw() {
    const ctx = this.ctx;

    // Sky / background
    ctx.fillStyle = "#0f0e17";
    ctx.fillRect(0, 0, W, H);
    this.drawBuildings();

    // Road
    ctx.fillStyle = "#16213e";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, H);

    // Lane dividers
    ctx.save();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth   = 4;
    ctx.setLineDash([70, 50]);
    ctx.lineDashOffset = -this.roadOffset;
    for (const lx of [505, 775]) {
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
    }
    ctx.restore();

    this.drawObstacles();
    this.drawPlayer();
    this.drawHUD();

    if (this.status === "over") this.drawGameOver();
  }

  private drawBuildings() {
    const ctx = this.ctx;
    // Static decorative buildings on both sides
    const buildings = [
      { x: 20, y: 200, w: 80, h: 520, color: "#1a1a35" },
      { x: 110, y: 300, w: 100, h: 420, color: "#12122a" },
      { x: 1100, y: 180, w: 90, h: 540, color: "#1a1a35" },
      { x: 1195, y: 280, w: 85, h: 440, color: "#12122a" },
    ];
    for (const b of buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Windows
      ctx.fillStyle = "#ffd70044";
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < Math.floor(b.w / 20); col++) {
          ctx.fillRect(b.x + 8 + col * 20, b.y + 10 + row * 30, 12, 16);
        }
      }
    }
  }

  private drawObstacles() {
    const ctx = this.ctx;
    for (const obs of this.obstacles) {
      // Shadow
      ctx.fillStyle = "rgba(255,71,87,0.2)";
      ctx.beginPath();
      ctx.ellipse(obs.x, obs.y + OBS_H / 2 + 8, OBS_W / 2, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Box
      ctx.fillStyle = "#ff4757";
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x:number,y:number,w:number,h:number,r:number) => void })
        .roundRect(obs.x - OBS_W / 2, obs.y - OBS_H / 2, OBS_W, OBS_H, 10);
      ctx.fill();
      // X
      ctx.strokeStyle = "#ff6b81";
      ctx.lineWidth   = 4;
      ctx.lineCap     = "round";
      ctx.beginPath();
      ctx.moveTo(obs.x - 16, obs.y - 16); ctx.lineTo(obs.x + 16, obs.y + 16);
      ctx.moveTo(obs.x + 16, obs.y - 16); ctx.lineTo(obs.x - 16, obs.y + 16);
      ctx.stroke();
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const x   = this.playerX;
    const y   = PLAYER_Y;

    // Blink during invincibility
    if (this.flashTimer > 0 && Math.floor(this.flashTimer / 6) % 2 === 0) return;

    // Shadow
    ctx.fillStyle = "rgba(83,82,237,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + PLAYER_H / 2 + 10, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#5352ed";
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x:number,y:number,w:number,h:number,r:number) => void })
      .roundRect(x - PLAYER_W / 2 + 10, y - PLAYER_H / 2 + 28, 40, 52, 8);
    ctx.fill();

    // Arms
    ctx.fillStyle = "#5352ed";
    ctx.fillRect(x - PLAYER_W / 2 - 2, y - PLAYER_H / 2 + 32, 14, 28);
    ctx.fillRect(x + PLAYER_W / 2 - 12, y - PLAYER_H / 2 + 32, 14, 28);

    // Head
    ctx.fillStyle = "#ffa502";
    ctx.beginPath();
    ctx.arc(x, y - PLAYER_H / 2 + 14, 20, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x - 7, y - PLAYER_H / 2 + 11, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7, y - PLAYER_H / 2 + 11, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.arc(x - 6, y - PLAYER_H / 2 + 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8, y - PLAYER_H / 2 + 12, 3, 0, Math.PI * 2); ctx.fill();
  }

  private drawHUD() {
    const ctx = this.ctx;

    // HUD bar
    ctx.fillStyle = "rgba(10,10,25,0.85)";
    ctx.fillRect(0, 0, W, 58);

    // Score
    ctx.fillStyle = "#ffd700";
    ctx.font      = "bold 28px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 24, 38);

    // Speed
    ctx.fillStyle = "#a4b0be";
    ctx.font      = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Speed ×${this.speed.toFixed(1)}`, W / 2, 38);

    // Lives (hearts)
    ctx.font      = "30px Arial";
    ctx.textAlign = "right";
    const hearts = "❤️".repeat(this.lives) + "🖤".repeat(Math.max(0, 3 - this.lives));
    ctx.fillText(hearts, W - 20, 40);

    // Lane indicator dots
    const dotY = H - 30;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === this.lane ? "#ffd700" : "#333355";
      ctx.beginPath();
      ctx.arc(W / 2 - 24 + i * 24, dotY, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";

    ctx.fillStyle = "#ff4757";
    ctx.font      = "bold 88px Arial";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 60);

    ctx.fillStyle = "#ffd700";
    ctx.font      = "bold 42px Arial";
    ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 20);

    ctx.fillStyle = "#a4b0be";
    ctx.font      = "28px Arial";
    ctx.fillText("กด  R  เพื่อเริ่มใหม่", W / 2, H / 2 + 80);
  }
}
