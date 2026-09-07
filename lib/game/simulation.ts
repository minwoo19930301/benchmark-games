import {
  coins,
  enemySpawns,
  platforms,
  GOAL_X,
  newPlayer,
  stepPlayer,
  type Platform,
} from './world.ts';
export type GameSnapshot = {
  phase: 'ready' | 'playing' | 'paused' | 'won' | 'over';
  coins: number;
  lives: number;
  time: number;
  world: string;
  progress: number;
};
export type GameInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  // An input edge can occur entirely between two rendered frames.
  jumpPressed?: boolean;
};
export const idleInput: GameInput = {
  left: false,
  right: false,
  jump: false,
  run: false,
};
export class Simulation {
  player = newPlayer();
  state: GameSnapshot = {
    phase: 'ready',
    coins: 0,
    lives: 3,
    time: 180,
    world: '1–1',
    progress: 0,
  };
  enemies = enemySpawns.map((x, i) => ({
    x,
    start: x,
    dir: i % 2 ? 1 : -1,
    alive: true,
  }));
  collected = new Set<number>();
  usedBlocks = new Set<Platform>();
  invincible = 0;
  elapsed = 0;
  private remainder = 0;
  private pendingJump = false;
  start() {
    Object.assign(this.state, {
      phase: 'playing',
      coins: 0,
      lives: 3,
      time: 180,
      progress: 0,
    });
    this.collected.clear();
    this.usedBlocks.clear();
    this.enemies.forEach((e, i) => {
      e.x = e.start;
      e.dir = i % 2 ? 1 : -1;
      e.alive = true;
    });
    this.resetPlayer();
    this.elapsed = 0;
    this.remainder = 0;
    this.pendingJump = false;
  }
  resetPlayer() {
    Object.assign(this.player, newPlayer());
    this.invincible = 1.4;
  }
  pause() {
    if (this.state.phase === 'playing') {
      this.state.phase = 'paused';
      this.pendingJump = false;
      this.player.jumpBuffer = 0;
      this.player.jumpHeld = false;
    }
  }
  resume() {
    if (this.state.phase === 'paused') this.state.phase = 'playing';
  }
  die() {
    this.state.lives--;
    if (this.state.lives <= 0) this.state.phase = 'over';
    else this.resetPlayer();
  }
  snapshot() {
    return { ...this.state };
  }
  advance(dt: number, input: GameInput = idleInput) {
    if (!Number.isFinite(dt) || dt < 0 || dt > 1)
      throw new RangeError('Frame duration must be between 0 and 1 second');
    if (this.state.phase !== 'playing') return;
    this.pendingJump ||= input.jumpPressed === true;
    this.remainder += dt;
    while (this.remainder >= 1 / 120) {
      // Keep a tap through zero-dt RAF resets or frames shorter than one step,
      // then consume the edge once rather than once per physics substep.
      const jumpPressed = this.pendingJump
        ? true
        : input.jumpPressed === undefined
          ? undefined
          : false;
      this.pendingJump = false;
      this.step(1 / 120, { ...input, jumpPressed });
      this.remainder -= 1 / 120;
    }
  }
  private step(dt: number, input: GameInput) {
    if (this.state.phase !== 'playing') return;
    const p = this.player,
      s = this.state;
    this.elapsed += dt;
    s.time = Math.max(0, s.time - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    for (const b of stepPlayer(p, input, dt))
      if (b.kind === 'question' && !this.usedBlocks.has(b)) {
        this.usedBlocks.add(b);
        s.coins++;
      }
    if (s.time <= 0) {
      s.phase = 'over';
      return;
    }
    if (p.y < -7) {
      this.die();
      return;
    }
    coins.forEach((c, i) => {
      if (
        !this.collected.has(i) &&
        Math.abs(p.x - c.x) < 0.55 &&
        Math.abs(p.y + 0.75 - c.y) < 0.9
      ) {
        this.collected.add(i);
        s.coins++;
      }
    });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const next = e.x + e.dir * dt * 0.75;
      const blocked = platforms.some(
        (b) =>
          b.y < 0.88 &&
          b.y + b.h > 0 &&
          next + 0.48 > b.x &&
          next - 0.48 < b.x + b.w,
      );
      const supported = platforms.some(
        (b) =>
          b.kind === 'ground' && next - 0.48 >= b.x && next + 0.48 <= b.x + b.w,
      );
      if (blocked || !supported || Math.abs(next - e.start) > 1.3) e.dir *= -1;
      else e.x = next;
      if (Math.abs(p.x - e.x) < 0.62 && p.y < 0.82 && p.y > -1) {
        if (p.vy < -0.3 && p.y > 0.42) {
          e.alive = false;
          p.vy = 7.2;
        } else if (this.invincible === 0) {
          this.die();
          return;
        }
      }
    }
    s.progress = Math.max(s.progress, Math.min(1, p.x / GOAL_X));
    if (p.x >= GOAL_X) s.phase = 'won';
  }
}
