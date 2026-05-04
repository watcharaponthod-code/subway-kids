/**
 * game3D.ts — Three.js 3D game engine for Subway Kids
 * All geometry is procedural (no external model files) → Docker-friendly
 */
import * as THREE from "three";

// ─── Constants ────────────────────────────────────────────────────────────────
const LANE_X        = [-3, 0, 3] as const;
const ROAD_W        = 9;
const SEG_LEN       = 24;
const SEG_COUNT     = 8;
const PLAYER_Z      = 1;          // fixed player Z position
const OBS_SPAWN_Z   = -SEG_LEN * (SEG_COUNT - 1);

// ─── Types ────────────────────────────────────────────────────────────────────
export type GameStatus = "idle" | "playing" | "over";
export interface GameSnapshot { score: number; lives: number; status: GameStatus; lane: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function box(w: number, h: number, d: number, color: number, emissive = 0, ei = 0) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity: ei })
  );
}
function cyl(rt: number, rb: number, h: number, seg: number, color: number, emissive = 0, ei = 0) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg),
    new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity: ei })
  );
}

// ─── Engine ───────────────────────────────────────────────────────────────────
export class Game3D {
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Animated limbs
  private legL!: THREE.Mesh; private legR!: THREE.Mesh;
  private armL!: THREE.Mesh; private armR!: THREE.Mesh;
  private playerGroup!: THREE.Group;

  // Scene pools
  private roadSegs:   THREE.Group[] = [];
  private obstacles:  THREE.Group[] = [];
  private buildings:  THREE.Group[] = [];

  // State
  private lane       = 1;
  private playerX    = LANE_X[1];
  private targetX    = LANE_X[1];
  private speed      = 0.14;
  private score      = 0;
  private lives      = 3;
  private status: GameStatus = "idle";
  private spawnTimer = 0;
  private spawnRate  = 90;
  private flashTimer = 0;
  private walkAngle  = 0;
  private animId     = 0;

  private onUpdate: (s: GameSnapshot) => void;

  constructor(canvas: HTMLCanvasElement, onUpdate: (s: GameSnapshot) => void) {
    this.onUpdate = onUpdate;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.016);

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.1, 250);
    this.camera.position.set(0, 7, 14);
    this.camera.lookAt(0, 1, -8);

    this.buildScene();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  start() {
    cancelAnimationFrame(this.animId);
    this.reset();
    this.status = "playing";
    this.tick();
  }

  stop()  { cancelAnimationFrame(this.animId); }
  getStatus() { return this.status; }

  setLane(lane: number) {
    if (lane >= 0 && lane <= 2) { this.lane = lane; this.targetX = LANE_X[lane]; }
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() { this.stop(); this.renderer.dispose(); }

  // ── Scene construction ─────────────────────────────────────────────────────
  private buildScene() {
    this.addLighting();
    this.addStars();
    this.buildRoad();
    this.buildBuildings();
    this.buildPlayer();
  }

  private addLighting() {
    this.scene.add(new THREE.AmbientLight(0x303060, 2));

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(5, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top  =  30; sun.shadow.camera.bottom = -30;
    this.scene.add(sun);

    // Purple neon ground fill
    const fill = new THREE.PointLight(0x5352ed, 3, 25);
    fill.position.set(0, 0.5, 2);
    this.scene.add(fill);

    // Front spotlight on player
    const spot = new THREE.SpotLight(0xffd700, 2, 30, Math.PI / 8, 0.5);
    spot.position.set(0, 12, 10);
    spot.target.position.set(0, 0, 0);
    this.scene.add(spot); this.scene.add(spot.target);
  }

  private addStars() {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const rng = () => (Math.random() - 0.5) * 250;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng(); pos[i * 3 + 1] = 15 + Math.random() * 60; pos[i * 3 + 2] = rng();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18 })));
  }

  private buildRoad() {
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x16213e, shininess: 40 });
    const sideMat = new THREE.MeshPhongMaterial({ color: 0x0a0a1a });
    const dashMat = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.6 });
    const neonMat = new THREE.MeshPhongMaterial({ color: 0x5352ed, emissive: 0x5352ed, emissiveIntensity: 1.2 });

    for (let i = 0; i < SEG_COUNT; i++) {
      const seg = new THREE.Group();

      // Road surface
      const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, SEG_LEN), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      seg.add(road);

      // Sidewalks
      for (const sx of [-(ROAD_W / 2 + 1.5), ROAD_W / 2 + 1.5]) {
        const walk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, SEG_LEN), sideMat);
        walk.position.set(sx, 0.06, 0);
        seg.add(walk);
      }

      // Lane dashes
      for (const lx of [-1.5, 1.5]) {
        for (let d = -SEG_LEN / 2 + 2; d < SEG_LEN / 2; d += 6) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 3.2), dashMat);
          dash.position.set(lx, 0.01, d);
          seg.add(dash);
        }
      }

      // Neon edge strips
      for (const ex of [-ROAD_W / 2, ROAD_W / 2]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, SEG_LEN), neonMat);
        strip.position.set(ex, 0.03, 0);
        seg.add(strip);
      }

      seg.position.z = OBS_SPAWN_Z + i * SEG_LEN + SEG_LEN / 2 + 12;
      this.scene.add(seg);
      this.roadSegs.push(seg);
    }
  }

  private buildBuildings() {
    const palette    = [0x1a1a35, 0x12122a, 0x0d0d20, 0x1a1a2e, 0x0e0e24];
    const winPalette = [0xffd700, 0xff6348, 0x70a1ff, 0xff4757, 0x7bed9f, 0xeccc68];

    for (let z = -120; z < 30; z += 10) {
      for (const side of [-1, 1] as const) {
        const h = 8  + Math.random() * 20;
        const w = 3  + Math.random() * 3.5;
        const d = 3  + Math.random() * 3;
        const x = side * (ROAD_W / 2 + 3 + Math.random() * 3);

        const grp = new THREE.Group();

        // Main building box
        const bld = box(w, h, d, palette[Math.floor(Math.random() * palette.length)]);
        bld.position.y = h / 2;
        bld.castShadow = true;
        grp.add(bld);

        // Windows
        const wc  = winPalette[Math.floor(Math.random() * winPalette.length)];
        const winMat = new THREE.MeshPhongMaterial({
          color: wc, emissive: wc, emissiveIntensity: 0.9, transparent: true, opacity: 0.88,
        });
        const cols = Math.max(1, Math.floor(w / 1.2));
        const rows = Math.max(1, Math.floor(h / 2.4));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.random() > 0.38) {
              const win = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.65), winMat.clone());
              const fz = side > 0 ? -d / 2 - 0.02 : d / 2 + 0.02;
              win.position.set(-w / 2 + 0.7 + c * (w / cols), 0.8 + r * 2.3, fz);
              if (side < 0) win.rotation.y = Math.PI;
              grp.add(win);
            }
          }
        }

        // Rooftop neon sign
        const sc = winPalette[Math.floor(Math.random() * winPalette.length)];
        const sign = box(w * 0.6, 0.18, 0.1, sc, sc, 2.5);
        sign.position.set(0, h + 0.12, d / 2);
        grp.add(sign);

        // Antenna
        const ant = cyl(0.04, 0.04, 1.5 + Math.random(), 6, 0x888888);
        ant.position.set(0, h + 1, 0);
        grp.add(ant);
        const light = cyl(0.08, 0.08, 0.12, 8, 0xff4757, 0xff4757, 3);
        light.position.set(0, h + 1.8, 0);
        grp.add(light);

        grp.position.set(x, 0, z);
        this.scene.add(grp);
        this.buildings.push(grp);
      }
    }
  }

  private buildPlayer(): THREE.Group {
    const grp   = new THREE.Group();
    const body  = 0x5352ed;
    const skin  = 0xffa502;
    const pants = 0x2f3542;
    const shoe  = 0xffffff;

    // Head
    const head = box(0.8, 0.8, 0.8, skin);
    head.position.y = 2.6;
    grp.add(head);

    // Eyes + pupils
    const eyeGeo = new THREE.SphereGeometry(0.13, 8, 8);
    const pupGeo = new THREE.SphereGeometry(0.07, 8, 8);
    for (const ex of [-0.2, 0.2]) {
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 }));
      eye.position.set(ex, 2.65, 0.41);
      grp.add(eye);
      const pup = new THREE.Mesh(pupGeo, new THREE.MeshPhongMaterial({ color: 0x111111 }));
      pup.position.set(ex, 2.65, 0.52);
      grp.add(pup);
    }

    // Mouth smile
    const smileMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 4, 10, Math.PI), smileMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 2.32, 0.42);
    grp.add(smile);

    // Body
    const torso = box(0.9, 1.0, 0.5, body);
    torso.position.y = 1.55;
    grp.add(torso);

    // Arms
    const aGeo = new THREE.BoxGeometry(0.28, 0.88, 0.28);
    this.armL = new THREE.Mesh(aGeo, new THREE.MeshPhongMaterial({ color: body }));
    this.armL.position.set(-0.64, 1.55, 0);
    this.armR = this.armL.clone();
    this.armR.position.x = 0.64;
    grp.add(this.armL); grp.add(this.armR);

    // Legs
    const lGeo = new THREE.BoxGeometry(0.33, 0.95, 0.33);
    this.legL = new THREE.Mesh(lGeo, new THREE.MeshPhongMaterial({ color: pants }));
    this.legL.position.set(-0.26, 0.53, 0);
    this.legR = this.legL.clone();
    this.legR.position.x = 0.26;
    grp.add(this.legL); grp.add(this.legR);

    // Shoes
    for (const sx of [-0.26, 0.26]) {
      const sh = box(0.36, 0.2, 0.46, shoe);
      sh.position.set(sx, 0.1, 0.08);
      grp.add(sh);
    }

    grp.position.set(LANE_X[1], 0, PLAYER_Z);
    grp.castShadow = true;
    this.scene.add(grp);
    this.playerGroup = grp;
    return grp;
  }

  private spawnObstacle() {
    const lane  = Math.floor(Math.random() * 3);
    const isCrate = Math.random() > 0.45;
    const grp = new THREE.Group();

    if (isCrate) {
      const b = box(1.2, 1.2, 1.2, 0xff4757, 0xff4757, 0.25);
      b.position.y = 0.6;
      b.castShadow = true;
      grp.add(b);
      // Wood grain lines
      const lineMat = new THREE.MeshPhongMaterial({ color: 0xcc2233 });
      for (const oy of [-0.3, 0, 0.3]) {
        const line = box(1.25, 0.05, 1.25, 0xcc2233);
        line.position.y = 0.6 + oy;
        grp.add(line);
      }
      // X mark (front face)
      for (const angle of [Math.PI / 4, -Math.PI / 4]) {
        const bar = box(1.3, 0.07, 0.05, 0xff6b81, 0xff6b81, 0.5);
        bar.rotation.z = angle;
        bar.position.set(0, 0.6, 0.62);
        grp.add(bar);
      }
    } else {
      // Barrel
      const barrel = cyl(0.52, 0.52, 1.2, 14, 0xff6348, 0xff6348, 0.2);
      barrel.position.y = 0.6;
      barrel.castShadow = true;
      grp.add(barrel);
      // Rings
      for (const ry of [0.22, 0.98]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.54, 0.045, 8, 20),
          new THREE.MeshPhongMaterial({ color: 0xffa502, emissive: 0xffa502, emissiveIntensity: 0.5 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ry;
        grp.add(ring);
      }
    }

    grp.position.set(LANE_X[lane], 0, OBS_SPAWN_Z - 5);
    this.scene.add(grp);
    this.obstacles.push(grp);
  }

  // ── Game loop ──────────────────────────────────────────────────────────────
  private reset() {
    for (const o of this.obstacles) this.scene.remove(o);
    this.obstacles = [];
    this.lane       = 1;
    this.playerX    = LANE_X[1];
    this.targetX    = LANE_X[1];
    this.speed      = 0.14;
    this.score      = 0;
    this.lives      = 3;
    this.spawnTimer = 0;
    this.spawnRate  = 90;
    this.flashTimer = 0;
    this.walkAngle  = 0;
    this.playerGroup.position.x = LANE_X[1];
    this.playerGroup.rotation.z = 0;
    this.playerGroup.visible = true;
  }

  private tick = () => {
    this.update();
    this.renderer.render(this.scene, this.camera);
    if (this.status !== "over") {
      this.animId = requestAnimationFrame(this.tick);
    }
  };

  private update() {
    if (this.status !== "playing") return;

    // Smooth lane slide
    const dx = this.targetX - this.playerX;
    this.playerX += Math.abs(dx) < 0.14 ? dx : 0.14 * Math.sign(dx);
    this.playerGroup.position.x = this.playerX;

    // Lean on lane change
    this.playerGroup.rotation.z = THREE.MathUtils.lerp(
      this.playerGroup.rotation.z,
      (this.targetX - this.playerX) * -0.28, 0.12
    );

    // Walk cycle
    this.walkAngle += 0.13;
    const sw = Math.sin(this.walkAngle) * 0.45;
    this.legL.rotation.x =  sw; this.legR.rotation.x = -sw;
    this.armL.rotation.x = -sw; this.armR.rotation.x =  sw;

    // Recycle road segments
    const totalLen = SEG_COUNT * SEG_LEN;
    for (const seg of this.roadSegs) {
      seg.position.z += this.speed;
      if (seg.position.z > SEG_LEN * 1.5 + PLAYER_Z) seg.position.z -= totalLen;
    }

    // Recycle buildings
    for (const bld of this.buildings) {
      bld.position.z += this.speed;
      if (bld.position.z > 35) bld.position.z -= 160;
    }

    // Move + cull obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].position.z += this.speed;
      if (this.obstacles[i].position.z > 20) {
        this.scene.remove(this.obstacles[i]);
        this.obstacles.splice(i, 1);
      }
    }

    // Spawn
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnRate) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    // Ramp up
    this.speed      = Math.min(0.14 + this.score / 14000, 0.38);
    if (this.spawnRate > 38) this.spawnRate -= 0.018;
    this.score++;

    // Flash (invincibility)
    if (this.flashTimer > 0) {
      this.flashTimer--;
      this.playerGroup.visible = Math.floor(this.flashTimer / 6) % 2 === 0;
    } else {
      this.playerGroup.visible = true;
    }

    // Collision
    if (this.flashTimer === 0) {
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        if (
          Math.abs(obs.position.x - this.playerX) < 1.15 &&
          Math.abs(obs.position.z - PLAYER_Z)      < 1.15
        ) {
          this.lives--;
          this.scene.remove(obs);
          this.obstacles.splice(i, 1);
          this.flashTimer = 90;
          if (this.lives <= 0) { this.status = "over"; this.playerGroup.visible = true; }
          break;
        }
      }
    }

    this.onUpdate({ score: this.score, lives: this.lives, status: this.status, lane: this.lane });
  }
}
