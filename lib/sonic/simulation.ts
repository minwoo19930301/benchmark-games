import {
  boosts,
  checkpoints,
  enemies,
  groundAt,
  groundSlope,
  hazards,
  LEVEL_END,
  LOOP,
  PLAYER_RADIUS,
  rings,
  springs,
  START_X,
} from './world.ts';

export interface SonicInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  roll: boolean;
  charge: boolean;
}
export const idleSonicInput: Readonly<SonicInput> = Object.freeze({
  left: false,
  right: false,
  jump: false,
  roll: false,
  charge: false,
});
export type SonicPhase = 'ready' | 'playing' | 'paused' | 'won' | 'over';
export interface SonicPlayer {
  x: number;
  /** Foot/contact position; the body's center is one radius along the surface normal. */
  y: number;
  vx: number;
  vy: number;
  angle: number;
  facing: number;
  grounded: boolean;
  rolling: boolean;
  charging: number;
  loopProgress: number | null;
  invulnerable: number;
}
export interface SonicState {
  phase: SonicPhase;
  rings: number;
  score: number;
  lives: number;
  time: number;
  checkpoint: number;
  peakSpeed: number;
  loopCount: number;
}
export interface SonicEvent {
  type:
    | 'ring'
    | 'jump'
    | 'spring'
    | 'boost'
    | 'dash'
    | 'hit'
    | 'death'
    | 'respawn'
    | 'enemy'
    | 'checkpoint'
    | 'loop-start'
    | 'loop'
    | 'win';
  x: number;
  y: number;
  value?: number;
}

export const FIXED_STEP = 1 / 120;
const GRAVITY = 36;
const RUN_SPEED = 46;
const MAX_SPEED = 84;
const JUMP_SPEED = 24;
const TWO_PI = Math.PI * 2;
const moveToward = (value: number, target: number, amount: number) =>
  value < target
    ? Math.min(target, value + amount)
    : Math.max(target, value - amount);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

/** Deterministic 120 Hz simulation with no renderer, browser, clock, or random dependency. */
export class SonicSimulation {
  player: SonicPlayer = this.freshPlayer(START_X);
  state: SonicState = this.freshState('ready');
  collected: boolean[] = rings.map(() => false);
  enemyAlive: boolean[] = enemies.map(() => true);
  enemyPositions: { x: number; y: number }[] = enemies.map(({ x, y }) => ({
    x,
    y,
  }));
  events: SonicEvent[] = [];
  private accumulator = 0;
  private jumpHeld = false;
  private jumpQueued = false;
  private loopSpeed = 0;
  private loopCooldown = 0;
  private springCooldown = 0;
  private boostCooldown = 0;
  private dashRollingTime = 0;

  private freshPlayer(x: number): SonicPlayer {
    return {
      x,
      y: groundAt(x),
      vx: 0,
      vy: 0,
      angle: Math.atan(groundSlope(x)),
      facing: 1,
      grounded: true,
      rolling: false,
      charging: 0,
      loopProgress: null,
      invulnerable: 0,
    };
  }

  private freshState(phase: SonicPhase): SonicState {
    return {
      phase,
      rings: 0,
      score: 0,
      lives: 3,
      time: 0,
      checkpoint: START_X,
      peakSpeed: 0,
      loopCount: 0,
    };
  }

  /** Start and restart both reset all course progress, including collectibles. */
  start(): void {
    this.player = this.freshPlayer(START_X);
    this.state = this.freshState('playing');
    this.collected = rings.map(() => false);
    this.enemyAlive = enemies.map(() => true);
    this.enemyPositions = enemies.map(({ x, y }) => ({ x, y }));
    this.events = [];
    this.accumulator = 0;
    this.jumpHeld = false;
    this.jumpQueued = false;
    this.loopSpeed = 0;
    this.loopCooldown = 0;
    this.springCooldown = 0;
    this.boostCooldown = 0;
    this.dashRollingTime = 0;
  }

  pause(): void {
    if (this.state.phase !== 'playing') return;
    this.state.phase = 'paused';
    // A pause cancels held/queued actions. Physical velocity is retained, but
    // releasing keys while paused must not launch a dash or deferred jump.
    this.player.charging = 0;
    this.jumpQueued = false;
    this.jumpHeld = false;
    this.accumulator = 0;
  }

  resume(): void {
    if (this.state.phase === 'paused') this.state.phase = 'playing';
  }

  advance(dt: number, input: Readonly<SonicInput> = idleSonicInput): void {
    if (!Number.isFinite(dt) || dt <= 0 || this.state.phase !== 'playing')
      return;
    this.events = [];
    this.jumpQueued ||= Boolean(input.jump && !this.jumpHeld);
    this.jumpHeld = Boolean(input.jump);
    // A background tab cannot inject minutes of catch-up or spiral into thousands of steps.
    this.accumulator += Math.min(dt, 0.25);
    while (
      this.accumulator + 1e-12 >= FIXED_STEP &&
      this.state.phase === 'playing'
    ) {
      this.step(FIXED_STEP, input);
      this.accumulator = Math.max(0, this.accumulator - FIXED_STEP);
    }
  }

  snapshot() {
    return {
      phase: this.state.phase,
      rings: this.state.rings,
      score: this.state.score,
      lives: this.state.lives,
      time: this.state.time,
      progress: clamp(this.player.x / LEVEL_END, 0, 1),
      speed: Math.hypot(this.player.vx, this.player.vy),
      peakSpeed: this.state.peakSpeed,
      checkpoint: this.state.checkpoint,
      charging: this.player.charging,
      loopCount: this.state.loopCount,
    };
  }

  private emit(type: SonicEvent['type'], value?: number): void {
    // One large advance remains bounded even across a dense ring trail.
    if (this.events.length < 64)
      this.events.push({
        type,
        x: this.player.x,
        y: this.player.y,
        ...(value === undefined ? {} : { value }),
      });
  }

  private step(dt: number, input: Readonly<SonicInput>): void {
    const player = this.player;
    this.state.time += dt;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    this.loopCooldown = Math.max(0, this.loopCooldown - dt);
    this.springCooldown = Math.max(0, this.springCooldown - dt);
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    this.dashRollingTime = Math.max(0, this.dashRollingTime - dt);
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    if (player.y < -60) {
      this.loseLife();
      return;
    }

    if (player.loopProgress !== null) this.stepLoop(dt, jump);
    else this.stepFree(dt, input, jump);

    this.updateEnemies();
    this.collectRings();
    this.collisions();
    if (this.state.phase !== 'playing') return;

    for (const checkpoint of checkpoints) {
      if (player.x >= checkpoint.x && this.state.checkpoint < checkpoint.x) {
        this.state.checkpoint = checkpoint.x;
        this.state.score += 250;
        this.emit('checkpoint');
      }
    }
    this.state.peakSpeed = Math.max(
      this.state.peakSpeed,
      Math.hypot(player.vx, player.vy),
    );
    if (player.y < -60 || player.x < -20) this.loseLife();
    if (this.state.phase === 'playing' && this.player.x >= LEVEL_END) {
      this.player.x = LEVEL_END;
      this.state.phase = 'won';
      this.state.score +=
        1000 +
        this.state.rings * 10 +
        Math.max(0, Math.floor(120 - this.state.time)) * 25;
      this.emit('win');
    }
  }

  private stepFree(
    dt: number,
    input: Readonly<SonicInput>,
    jump: boolean,
  ): void {
    const player = this.player;
    const direction = Number(input.right) - Number(input.left);
    const previousX = player.x;
    if (direction !== 0 && Math.abs(player.vx) < 3) player.facing = direction;

    if (player.grounded) {
      player.rolling =
        Boolean(input.roll) ||
        (this.dashRollingTime > 0 && Math.abs(player.vx) > 12);
      if (input.charge) {
        player.vx = moveToward(player.vx, 0, 120 * dt);
        if (Math.abs(player.vx) < 1) {
          player.charging = Math.min(1, player.charging + dt * 1.25);
          player.rolling = true;
        }
      } else {
        if (player.charging > 0) {
          player.vx = player.facing * (30 + player.charging * 48);
          player.charging = 0;
          player.rolling = true;
          this.dashRollingTime = 0.85;
          this.emit('dash');
        }
        if (direction !== 0) {
          if (direction * player.vx < 0)
            player.vx = moveToward(player.vx, direction * RUN_SPEED, 110 * dt);
          else if (Math.abs(player.vx) < RUN_SPEED)
            player.vx = moveToward(
              player.vx,
              direction * RUN_SPEED,
              (input.roll ? 17 : 42) * dt,
            );
        } else
          player.vx = moveToward(
            player.vx,
            0,
            (player.rolling ? 2.5 : 24) * dt,
          );
        const slope = groundSlope(player.x);
        player.vx -= ((GRAVITY * slope) / (1 + slope * slope)) * dt;
        if (Math.abs(player.vx) > RUN_SPEED)
          player.vx = moveToward(player.vx, 0, 2.2 * dt);
      }
      player.vx = clamp(player.vx, -MAX_SPEED, MAX_SPEED);
      if (jump && !input.charge) {
        player.grounded = false;
        player.vy =
          JUMP_SPEED + Math.max(0, player.vx * groundSlope(player.x) * 0.35);
        player.rolling = true;
        this.emit('jump');
      }
    } else {
      if (direction !== 0 && Math.abs(player.vx) < RUN_SPEED)
        player.vx = clamp(
          player.vx + direction * 15 * dt,
          -RUN_SPEED,
          RUN_SPEED,
        );
      player.vy -= GRAVITY * dt;
    }

    player.x = Math.max(0, player.x + player.vx * dt);
    if (player.x === 0 && player.vx < 0) player.vx = 0;
    if (player.grounded) {
      player.y = groundAt(player.x);
      player.vy = 0;
      player.angle = Math.atan(groundSlope(player.x));
    } else {
      player.y += player.vy * dt;
      player.angle = moveToward(player.angle, 0, 6 * dt);
      if (player.y <= groundAt(player.x) && player.vy <= 0) {
        player.y = groundAt(player.x);
        player.vy = 0;
        player.grounded = true;
        player.angle = Math.atan(groundSlope(player.x));
        player.rolling = Boolean(input.roll);
      }
    }
    if (Math.abs(player.vx) > 1) player.facing = Math.sign(player.vx);

    if (player.grounded && !input.charge) {
      for (const boost of boosts) {
        if (
          player.x >= boost.x &&
          player.x <= boost.x + boost.width &&
          player.vx >= 0
        ) {
          player.vx = Math.max(player.vx, boost.speed);
          if (this.boostCooldown === 0) {
            this.emit('boost');
            this.boostCooldown = 1;
          }
        }
      }
      for (const spring of springs) {
        if (Math.abs(player.x - spring.x) < 2 && this.springCooldown === 0) {
          player.grounded = false;
          player.rolling = true;
          player.vy = spring.power;
          this.springCooldown = 0.45;
          this.emit('spring');
          break;
        }
      }
    }
    if (
      player.grounded &&
      this.loopCooldown === 0 &&
      previousX < LOOP.entryX &&
      player.x >= LOOP.entryX &&
      player.vx >= LOOP.minEntrySpeed
    ) {
      this.loopSpeed = player.vx;
      player.loopProgress = (player.x - LOOP.entryX) / LOOP.radius;
      player.rolling = true;
      this.placeOnLoop();
      this.emit('loop-start');
    }
  }

  private placeOnLoop(): void {
    const player = this.player;
    const progress = player.loopProgress ?? 0;
    const theta = progress - Math.PI / 2;
    player.x = LOOP.x + Math.cos(theta) * LOOP.radius;
    player.y = LOOP.y + Math.sin(theta) * LOOP.radius;
    player.vx = -Math.sin(theta) * this.loopSpeed;
    player.vy = Math.cos(theta) * this.loopSpeed;
    player.angle = progress;
    player.grounded = true;
  }

  private stepLoop(dt: number, jump: boolean): void {
    const player = this.player;
    const theta = (player.loopProgress ?? 0) - Math.PI / 2;
    if (jump) {
      player.vx += -Math.cos(theta) * JUMP_SPEED;
      player.vy += -Math.sin(theta) * JUMP_SPEED;
      player.loopProgress = null;
      player.grounded = false;
      this.loopCooldown = 1.5;
      this.emit('jump');
      return;
    }
    this.loopSpeed = Math.max(
      0,
      this.loopSpeed - GRAVITY * Math.cos(theta) * dt - 0.15 * dt,
    );
    const nextProgress =
      (player.loopProgress ?? 0) + (this.loopSpeed / LOOP.radius) * dt;
    // At the top, track contact requires centripetal acceleration to overcome gravity.
    const normalForce =
      (this.loopSpeed * this.loopSpeed) / LOOP.radius -
      GRAVITY * Math.sin(theta);
    if (normalForce < 0 || this.loopSpeed < 3) {
      player.loopProgress = null;
      player.grounded = false;
      this.loopCooldown = 1.5;
      return;
    }
    if (nextProgress >= TWO_PI) {
      const remainingDistance = (nextProgress - TWO_PI) * LOOP.radius;
      player.loopProgress = null;
      player.x = LOOP.exitX + remainingDistance;
      player.y = groundAt(player.x);
      player.vx = this.loopSpeed;
      player.vy = 0;
      player.angle = 0;
      player.grounded = true;
      this.loopCooldown = 1.5;
      this.state.loopCount += 1;
      this.state.score += 1000;
      this.emit('loop');
    } else {
      player.loopProgress = nextProgress;
      this.placeOnLoop();
    }
  }

  private updateEnemies(): void {
    enemies.forEach((enemy, index) => {
      const x =
        enemy.x + Math.sin(this.state.time * enemy.speed + index) * enemy.range;
      this.enemyPositions[index] = { x, y: groundAt(x) };
    });
  }

  private collectRings(): void {
    const player = this.player;
    const centerX = player.x - Math.sin(player.angle) * PLAYER_RADIUS;
    const centerY = player.y + Math.cos(player.angle) * PLAYER_RADIUS;
    for (let index = 0; index < rings.length; index += 1) {
      if (this.collected[index]) continue;
      const ring = rings[index];
      if (
        Math.abs(centerX - ring.x) < 2.15 &&
        Math.hypot(centerX - ring.x, centerY - ring.y) < 2.15
      ) {
        this.collected[index] = true;
        this.state.rings += 1;
        this.state.score += 100;
        this.emit('ring');
      }
    }
  }

  private collisions(): void {
    const player = this.player;
    if (player.loopProgress !== null) return;
    for (let index = 0; index < enemies.length; index += 1) {
      if (!this.enemyAlive[index]) continue;
      const enemy = this.enemyPositions[index];
      if (
        Math.abs(player.x - enemy.x) < 2.1 &&
        player.y < enemy.y + 2 &&
        player.y + 2 > enemy.y
      ) {
        if (player.rolling || (!player.grounded && player.vy < 0)) {
          this.enemyAlive[index] = false;
          this.state.score += 250;
          if (!player.grounded) player.vy = 13;
          this.emit('enemy');
        } else this.damage();
      }
    }
    for (const hazard of hazards) {
      if (
        player.x > hazard.x - 0.6 &&
        player.x < hazard.x + hazard.width + 0.6 &&
        player.y < groundAt(player.x) + hazard.height - 0.15
      ) {
        this.damage();
      }
    }
  }

  private damage(): void {
    const player = this.player;
    if (player.invulnerable > 0 || this.state.phase !== 'playing') return;
    if (this.state.rings === 0) {
      this.loseLife();
      return;
    }
    const lost = this.state.rings;
    this.state.rings = 0;
    player.invulnerable = 2.5;
    player.vx = -player.facing * 16;
    player.vy = 18;
    player.grounded = false;
    player.rolling = false;
    player.charging = 0;
    player.loopProgress = null;
    this.emit('hit', lost);
  }

  private loseLife(): void {
    if (this.state.phase !== 'playing') return;
    this.state.lives -= 1;
    this.state.rings = 0;
    this.emit('death');
    if (this.state.lives <= 0) {
      this.state.phase = 'over';
      this.player.vx = 0;
      this.player.vy = 0;
      return;
    }
    this.player = this.freshPlayer(this.state.checkpoint);
    this.player.invulnerable = 3;
    this.loopSpeed = 0;
    this.loopCooldown = 0;
    this.springCooldown = 0;
    this.boostCooldown = 0;
    this.dashRollingTime = 0;
    this.emit('respawn');
  }
}
