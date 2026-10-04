import {
  clamp,
  idleInput,
  type Input,
  type RetroSimulation,
  type RetroSnapshot,
} from '../types.ts';
import {
  EREGION_MOUTH,
  hazardPhase,
  platformAt,
  stages,
  type Stage,
  type StageId,
} from './world.ts';

export type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  life: number;
  enemy: boolean;
  kind: 'pellet' | 'charge' | 'orb' | 'flame' | 'bat';
  pierced: number[];
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};
export type Enemy = {
  x: number;
  y: number;
  home: number;
  baseY: number;
  hp: number;
  kind: 'walker' | 'turret' | 'drone';
  timer: number;
  flash: number;
  tell: number;
};
export class ReploidSimulation implements RetroSimulation {
  stage: Stage;
  audioCues = {
    shot: 0,
    hit: 0,
    jump: 0,
    dash: 0,
    pickup: 0,
    explosion: 0,
    ability: 0,
  };
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  lives = 3;
  checkpoint = 60;
  checkpointIndex = -1;
  collected: boolean[];
  enemies: Enemy[];
  shots: Projectile[] = [];
  particles: Particle[] = [];
  shake = 0;
  flash = 0;
  kills = 0;
  rescues = 0;
  character: 'x' | 'zero' = 'x';
  darkHold = 0;
  darkHoldCasts = 0;
  private switchHeld = false;
  wallKicks = 0;
  dashCount = 0;
  chargedShots = 0;
  bossHits = 0;
  player = {
    x: 60,
    y: 320,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    wall: 0,
    hp: 24,
    invulnerable: 0,
    dash: 0,
    dashCooldown: 0,
    airDash: true,
    dashJump: false,
    charge: 0,
    shoot: 0,
    saber: 0,
    saberCooldown: 0,
    wallLock: 0,
    coyote: 0.1,
    jumpBuffer: 0,
    landing: 0,
    hurt: 0,
  };
  boss = {
    x: 0,
    y: 320,
    hp: 120,
    maxHp: 120,
    phase: 1,
    active: false,
    mode: 'idle' as 'idle' | 'intro' | 'tell' | 'attack' | 'recover' | 'dead',
    timer: 0,
    cycle: 0,
    pattern: 0,
    targetX: 0,
    facing: -1,
    flash: 0,
    fired: false,
  };
  held = { jump: false, attack: false, guard: false, special: false };
  constructor(id: StageId = 'x4') {
    this.stage = stages[id];
    this.player.y = this.stage.floor;
    this.boss.x = this.stage.end - 160;
    this.boss.y = this.stage.floor;
    this.boss.hp = this.boss.maxHp = id === 'x4' ? 84 : id === 'x5' ? 112 : 124;
    this.collected = this.stage.capsules.map(() => false);
    this.enemies = this.stage.enemies.map((e, i) => ({
      ...e,
      home: e.x,
      baseY: e.y,
      hp: e.kind === 'turret' ? 5 : 3,
      timer: 1 + i * 0.21,
      flash: 0,
      tell: 0,
    }));
  }
  clearInput() {
    this.switchHeld = false;
    this.player.charge = 0;
    this.player.jumpBuffer = 0;
    this.held = { jump: false, attack: false, guard: false, special: false };
  }
  emit(x: number, y: number, color: string, amount = 8, power = 100) {
    for (let i = 0; i < amount; i++) {
      const a = i * 2.39996 + this.time * 3;
      const life = 0.2 + (i % 5) * 0.07;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * power * (0.4 + (i % 4) * 0.2),
        vy: Math.sin(a) * power - 30,
        life,
        maxLife: life,
        color,
        size: 2 + (i % 3),
      });
    }
    if (this.particles.length > 180)
      this.particles.splice(0, this.particles.length - 180);
  }
  shoot(level: number) {
    const p = this.player;
    this.audioCues.shot++;
    const damage = level === 2 ? 7 : level === 1 ? 3 : 1;
    this.shots.push({
      x: p.x + p.facing * 22,
      y: p.y - 24,
      vx: p.facing * (level ? 590 : 520),
      vy: 0,
      r: level === 2 ? 12 : level === 1 ? 7 : 3,
      damage,
      life: 1.6,
      enemy: false,
      kind: level ? 'charge' : 'pellet',
      pierced: [],
    });
    p.shoot = 0.13;
    if (level) {
      this.chargedShots++;
      this.emit(
        p.x + p.facing * 20,
        p.y - 24,
        level === 2 ? '#b8fff0' : '#87ceff',
        6,
        90,
      );
    }
  }
  damage(amount = 3, sourceX = this.player.x - this.player.facing * 10) {
    const p = this.player;
    if (p.invulnerable > 0 || this.phase !== 'playing') return;
    this.audioCues.hit++;
    p.hp = Math.max(0, p.hp - amount);
    p.invulnerable = 1.15;
    p.hurt = 0.22;
    p.dash = 0;
    p.charge = 0;
    p.vx = Math.sign(p.x - sourceX || 1) * 110;
    p.vy = -155;
    p.grounded = false;
    this.shake = 0.2;
    this.flash = 0.07;
    this.emit(p.x, p.y - 22, '#ffbc7b', 13, 155);
    if (p.hp <= 0) this.respawn();
  }
  respawn() {
    this.audioCues.explosion++;
    this.lives--;
    if (this.lives <= 0) {
      this.phase = 'lost';
      return;
    }
    Object.assign(this.player, {
      x: this.checkpoint,
      y: this.stage.floor - 2,
      vx: 0,
      vy: 0,
      hp: 24,
      invulnerable: 2,
      dash: 0,
      dashCooldown: 0,
      airDash: true,
      dashJump: false,
      charge: 0,
      saber: 0,
      wall: 0,
      wallLock: 0,
      grounded: false,
      coyote: 0,
      jumpBuffer: 0,
      hurt: 0,
    });
    this.shots = [];
    this.darkHold = 0;
    if (this.boss.active) {
      Object.assign(this.boss, {
        hp: this.boss.maxHp,
        phase: 1,
        active: false,
        mode: 'idle',
        x: this.stage.end - 160,
        y: this.stage.floor,
        cycle: 0,
        timer: 0,
        fired: false,
      });
    }
    this.flash = 0.25;
  }
  hitEnemy(enemy: Enemy, damage: number) {
    this.audioCues.hit++;
    enemy.hp -= damage;
    enemy.flash = 0.12;
    this.emit(
      enemy.x,
      enemy.y - 20,
      '#f7cf81',
      enemy.hp <= 0 ? 15 : 4,
      enemy.hp <= 0 ? 155 : 60,
    );
    if (enemy.hp <= 0) {
      this.audioCues.explosion++;
      this.kills++;
      this.score += 250;
      this.shake = 0.06;
    }
  }
  hitBoss(damage: number) {
    const b = this.boss;
    if (!b.active || b.hp <= 0 || b.mode === 'intro' || b.flash > 0.07) return;
    this.audioCues.hit++;
    b.hp = Math.max(0, b.hp - damage);
    b.flash = 0.1;
    this.bossHits++;
    this.emit(b.x, b.y - 37, this.stage.accent, 7, 100);
    if (b.hp <= 0) {
      this.audioCues.explosion++;
      b.mode = 'dead';
      this.shake = 0.65;
      this.flash = 0.22;
      this.emit(b.x, b.y - 35, '#ffdf9b', 60, 260);
      this.score += 5000 + Math.floor(Math.max(0, 180 - this.time) * 15);
      this.phase = 'won';
    }
  }
  step(dt: number, input: Input) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const p = this.player;
    const previousDash = p.dash;
    this.darkHold = Math.max(0, this.darkHold - dt);
    if (input.switch && !this.switchHeld) {
      this.character = this.character === 'x' ? 'zero' : 'x';
      p.charge = 0;
      p.saber = 0;
      this.held.attack = false;
      this.audioCues.ability++;
    }
    this.switchHeld = input.switch;
    for (const key of [
      'invulnerable',
      'dash',
      'dashCooldown',
      'shoot',
      'saber',
      'saberCooldown',
      'wallLock',
      'coyote',
      'jumpBuffer',
      'landing',
      'hurt',
    ] as const)
      p[key] = Math.max(0, p[key] - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    const direction =
      this.darkHold > 0 ? 0 : Number(input.right) - Number(input.left);
    if (direction && p.wallLock <= 0 && p.hurt <= 0) p.facing = direction;
    if (input.jump && !this.held.jump && this.darkHold === 0)
      p.jumpBuffer = 0.12;
    if (
      input.guard &&
      this.darkHold === 0 &&
      !this.held.guard &&
      p.dashCooldown <= 0 &&
      (p.grounded || (this.stage.airDash && p.airDash))
    ) {
      if (!p.grounded) p.airDash = false;
      this.audioCues.dash++;
      p.dash = 0.19;
      p.dashCooldown = 0.4;
      p.vy = 0;
      this.dashCount++;
      this.emit(p.x - p.facing * 13, p.y - 7, this.stage.accent, 8, 120);
    }
    if (p.jumpBuffer > 0 && p.hurt <= 0) {
      if (p.wall && !p.grounded) {
        p.vx = -p.wall * 180;
        p.facing = -p.wall;
        p.vy = -405;
        p.wallLock = 0.07;
        p.jumpBuffer = 0;
        p.wall = 0;
        p.dash = 0;
        p.airDash = true;
        this.wallKicks++;
        this.audioCues.jump++;
        this.emit(p.x, p.y - 12, '#e6ffed', 7, 105);
      } else if (p.grounded || p.coyote > 0) {
        this.audioCues.jump++;
        p.vy = this.stage.id === 'x5' ? -365 : -405;
        p.dashJump = p.dash > 0 || previousDash > 0;
        p.grounded = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        this.emit(p.x, p.y, '#d5e8e3', 5, 55);
      }
    }
    if (p.hurt <= 0 && p.wallLock <= 0) {
      const speed = p.dash > 0 || (p.dashJump && !p.grounded) ? 330 : 145;
      const target = p.dash > 0 ? p.facing * speed : direction * speed;
      const acceleration = p.grounded ? 2600 : 2200;
      p.vx += clamp(target - p.vx, -acceleration * dt, acceleration * dt);
    }
    const solids = this.stage.platforms.map((s) => platformAt(s, this.time));
    const oldX = p.x;
    p.x += p.vx * dt;
    p.wall = 0;
    for (const s of solids) {
      if (
        p.y - 2 > s.y &&
        p.y - 40 < s.y + s.h &&
        p.x + 10 > s.x &&
        p.x - 10 < s.x + s.w
      ) {
        if (oldX + 10 <= s.x + 1) {
          p.x = s.x - 10;
          p.wall = 1;
        } else if (oldX - 10 >= s.x + s.w - 1) {
          p.x = s.x + s.w + 10;
          p.wall = -1;
        }
        if (p.wall) {
          p.vx = 0;
          p.dash = 0;
        }
      }
    }
    p.x = clamp(
      p.x,
      this.boss.active ? this.stage.arena + 12 : 14,
      this.stage.end - 18,
    );
    const oldY = p.y,
      wasGrounded = p.grounded;
    if (p.dash <= 0 || p.grounded || p.dashJump)
      p.vy += this.stage.gravity * dt;
    else p.vy = 0;
    // Releasing jump trims the ascent, but wall kicks retain a useful minimum arc.
    if (!input.jump && p.vy < -185 && p.wallLock <= 0)
      p.vy += this.stage.gravity * dt * 0.8;
    if (p.wall && direction === p.wall && p.vy > 72) p.vy = 72;
    p.y += p.vy * dt;
    p.grounded = false;
    for (const s of solids) {
      if (p.x + 9 <= s.x || p.x - 9 >= s.x + s.w) continue;
      if (p.vy >= 0 && oldY <= s.y + 1 && p.y >= s.y) {
        p.y = s.y;
        p.vy = 0;
        p.grounded = true;
        p.coyote = 0.1;
        p.airDash = true;
        p.dashJump = false;
        if (s.kind === 'belt') p.x += 44 * dt;
        if (s.kind === 'lift')
          p.x += Math.cos(this.time * 1.3) * (s.travel || 0) * 1.3 * dt;
        if (!wasGrounded) {
          p.landing = 0.1;
          this.emit(p.x, p.y, '#b0c2c7', 5, 45);
        }
      } else if (p.vy < 0 && oldY - 40 >= s.y + s.h && p.y - 40 < s.y + s.h) {
        p.y = s.y + s.h + 40;
        p.vy = 0;
      }
    }
    if (wasGrounded && !p.grounded && p.vy >= 0) p.coyote = 0.08;
    if (p.y > 500) this.respawn();
    if (this.phase !== 'playing') return;
    if (input.attack && this.character === 'x' && this.darkHold === 0) {
      if (!this.held.attack && p.shoot <= 0 && p.hurt <= 0) this.shoot(0);
      p.charge = Math.min(1.4, p.charge + dt);
    } else if (this.held.attack && this.character === 'x') {
      if (p.charge >= 0.38 && p.hurt <= 0) this.shoot(p.charge >= 1 ? 2 : 1);
      p.charge = 0;
    }
    if (
      ((input.special &&
        !this.held.special &&
        (this.character === 'zero' || this.stage.id === 'x6')) ||
        (input.attack && !this.held.attack && this.character === 'zero')) &&
      this.darkHold === 0 &&
      p.saberCooldown <= 0 &&
      p.hurt <= 0
    ) {
      this.audioCues.ability++;
      p.saber = 0.23;
      p.saberCooldown = 0.4;
      for (const enemy of this.enemies)
        if (
          enemy.hp > 0 &&
          Math.abs(enemy.y - p.y) < 49 &&
          (enemy.x - p.x) * p.facing > -12 &&
          (enemy.x - p.x) * p.facing < 75
        )
          this.hitEnemy(enemy, 5);
      if (
        Math.abs(this.boss.y - p.y) < 66 &&
        (this.boss.x - p.x) * p.facing > -20 &&
        (this.boss.x - p.x) * p.facing < 92
      )
        this.hitBoss(6);
    }
    for (const hazard of this.stage.hazards) {
      if (
        hazardPhase(hazard, this.time) === 'active' &&
        p.x + 8 > hazard.x &&
        p.x - 8 < hazard.x + hazard.w &&
        p.y > hazard.y &&
        p.y - 35 < hazard.y + hazard.h
      )
        this.damage(hazard.kind === 'spikes' ? 5 : 3, hazard.x);
    }
    for (let i = 0; i < this.stage.checkpoints.length; i++) {
      if (p.x >= this.stage.checkpoints[i] && i > this.checkpointIndex) {
        this.audioCues.pickup++;
        this.checkpointIndex = i;
        this.checkpoint = this.stage.checkpoints[i];
        p.hp = Math.min(24, p.hp + 7);
        this.score += 300;
        this.emit(p.x, p.y - 25, '#baffdc', 18, 115);
      }
    }
    this.stage.capsules.forEach((c, i) => {
      if (
        !this.collected[i] &&
        Math.abs(p.x - c.x) < 27 &&
        Math.abs(p.y - 22 - c.y) < 38 &&
        (c.kind !== 'rescue' || input.interact)
      ) {
        this.audioCues.pickup++;
        this.collected[i] = true;
        p.hp = Math.min(24, p.hp + (c.kind === 'health' ? 8 : 3));
        this.score += c.kind === 'rescue' ? 800 : 150;
        if (c.kind === 'rescue') this.rescues++;
        this.emit(c.x, c.y, '#c7ffac', 12, 95);
      }
    });
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateShots(dt);
    for (const part of this.particles) {
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vy += 230 * dt;
    }
    this.particles = this.particles.filter((part) => part.life > 0);
    if (this.shots.length > 160) this.shots.splice(0, this.shots.length - 160);
    this.held = {
      jump: input.jump,
      attack: input.attack,
      guard: input.guard,
      special: input.special,
    };
    if (this.time >= 240) this.phase = 'lost';
  }
  updateEnemies(dt: number) {
    const p = this.player;
    this.enemies.forEach((e, i) => {
      e.flash = Math.max(0, e.flash - dt);
      if (e.hp <= 0 || Math.abs(e.x - p.x) > 620) return;
      if (e.kind === 'walker')
        e.x = e.home + Math.sin(this.time * 1.6 + i) * 32;
      if (e.kind === 'drone') {
        e.x = e.home + Math.sin(this.time * 1.4 + i) * 40;
        e.y = e.baseY + Math.sin(this.time * 2 + i) * 25;
      }
      e.timer -= dt;
      e.tell = e.timer < 0.45 ? Math.max(0, e.timer) : 0;
      if (e.timer <= 0) {
        e.timer = e.kind === 'turret' ? 2.15 : 2.8;
        const dx = p.x - e.x,
          dy = p.y - 24 - (e.y - 20),
          length = Math.hypot(dx, dy) || 1;
        this.shots.push({
          x: e.x,
          y: e.y - 20,
          vx: (dx / length) * 145,
          vy: (dy / length) * 145,
          r: 4,
          damage: 2,
          life: 3.7,
          enemy: true,
          kind: 'orb',
          pierced: [],
        });
      }
      if (Math.abs(e.x - p.x) < 25 && Math.abs(e.y - p.y) < 36)
        this.damage(3, e.x);
    });
  }
  bossShot(
    vx: number,
    vy: number,
    kind: Projectile['kind'] = 'orb',
    y = this.boss.y - 33,
  ) {
    this.shots.push({
      x:
        this.boss.x +
        (this.stage.id === 'x4' ? this.boss.facing * EREGION_MOUTH.x : 0),
      y,
      vx,
      vy,
      r: kind === 'flame' ? (this.stage.id === 'x4' ? 8 : 12) : 7,
      damage: kind === 'flame' && this.stage.id !== 'x4' ? 3 : 2,
      life: 4,
      enemy: true,
      kind,
      pierced: [],
    });
  }
  updateBoss(dt: number) {
    const b = this.boss,
      p = this.player,
      stage = this.stage;
    b.flash = Math.max(0, b.flash - dt);
    if (b.hp <= 0) return;
    if (!b.active && p.x >= stage.arena + 30) {
      b.active = true;
      b.mode = 'intro';
      b.timer = 1.1;
      p.hp = Math.min(24, p.hp + 4);
      this.shots = this.shots.filter((s) => !s.enemy);
    }
    if (!b.active) return;
    b.phase = b.hp <= b.maxHp * 0.5 ? 2 : 1;
    b.timer -= dt;
    b.facing = p.x < b.x ? -1 : 1;
    if (b.mode === 'tell') {
      b.targetX = p.x;
      if (stage.id === 'x5')
        b.y = stage.floor - 15 - Math.sin(this.time * 3) * 6;
    }
    if (b.mode === 'attack') {
      if (b.pattern === 0) {
        // Low sweep: jump the body; its destination is locked after the warning.
        b.x += Math.sign(b.targetX - b.x) * (b.phase === 2 ? 260 : 205) * dt;
        if (Math.abs(b.targetX - b.x) < 9) b.timer = 0;
      } else if (!b.fired) {
        b.fired = true;
        const side = b.facing;
        if (stage.id === 'x4') {
          // Both volleys leave the visible mouth. The low breath aims down toward
          // the hunter; the high volley can still be crossed underneath.
          const mouthX = b.x + side * EREGION_MOUTH.x;
          const mouthY = b.y + EREGION_MOUTH.y;
          const aimY =
            b.pattern === 1
              ? clamp(
                  ((p.y - 24 - mouthY) * 220) /
                    Math.max(60, Math.abs(p.x - mouthX)),
                  -130,
                  130,
                )
              : 0;
          for (const spread of b.phase === 2 ? [-55, 0, 55] : [-28, 28])
            this.bossShot(side * 220, aimY + spread, 'flame', mouthY);
        } else if (stage.id === 'x5') {
          if (b.pattern === 2) {
            // Dark Hold's expanding ring is a real, avoidable freeze projectile.
            this.darkHoldCasts++;
            this.bossShot(side * 140, 0, 'orb', stage.floor - 22);
            this.shots[this.shots.length - 1].r = 15;
            this.shots[this.shots.length - 1].damage = 0;
          } else
            for (let i = -1; i <= 1; i++) {
              const dx = p.x - b.x,
                dy = p.y - 24 - (b.y - 33);
              const a = Math.atan2(dy, dx) + i * (b.phase === 2 ? 0.24 : 0.16);
              this.bossShot(Math.cos(a) * 190, Math.sin(a) * 190, 'bat');
            }
        } else {
          if (b.pattern === 2) {
            // Blaze Heatnix drops burning feathers from above the locked target.
            for (const offset of [-90, 0, 90]) {
              this.bossShot(0, 170, 'flame', stage.floor - 185);
              this.shots[this.shots.length - 1].x = clamp(
                b.targetX + offset,
                stage.arena + 35,
                stage.end - 35,
              );
            }
          } else {
            this.bossShot(side * 190, 0, 'flame', stage.floor - 12);
            if (b.phase === 2)
              this.bossShot(-side * 190, 0, 'flame', stage.floor - 12);
          }
        }
      }
      if (Math.abs(p.x - b.x) < 39 && Math.abs(p.y - b.y) < 57)
        this.damage(3, b.x);
    }
    if (b.timer > 0) return;
    if (b.mode === 'intro' || b.mode === 'recover') {
      b.pattern = b.cycle++ % 3;
      b.mode = 'tell';
      b.timer = b.phase === 2 ? 0.65 : 0.9;
      b.targetX = p.x;
      b.y = stage.floor;
      b.fired = false;
    } else if (b.mode === 'tell') {
      b.mode = 'attack';
      b.timer = b.pattern === 0 ? 1.05 : 0.45;
    } else if (b.mode === 'attack') {
      b.mode = 'recover';
      b.timer = b.phase === 2 ? 0.65 : 0.95;
    }
    b.x = clamp(b.x, stage.arena + 60, stage.end - 65);
  }
  updateShots(dt: number) {
    const p = this.player;
    for (const shot of this.shots) {
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (
        this.stage.platforms.some((base) => {
          const solid = platformAt(base, this.time);
          return (
            shot.x > solid.x &&
            shot.x < solid.x + solid.w &&
            shot.y > solid.y &&
            shot.y < solid.y + solid.h
          );
        })
      ) {
        shot.life = 0;
        continue;
      }
      if (shot.enemy) {
        if (
          p.saber > 0 &&
          (shot.x - p.x) * p.facing > -5 &&
          (shot.x - p.x) * p.facing < 70 &&
          Math.abs(shot.y - (p.y - 22)) < 43
        ) {
          shot.life = 0;
          this.emit(shot.x, shot.y, '#baffdc', 4, 90);
          this.score += 10;
        } else if (
          Math.abs(shot.x - p.x) < 10 + shot.r &&
          shot.y + shot.r > p.y - 39 &&
          shot.y - shot.r < p.y
        ) {
          if (shot.damage === 0 && this.stage.id === 'x5') {
            this.darkHold = 0.65;
            p.dash = 0;
            p.vx = 0;
            p.charge = 0;
            this.audioCues.ability++;
          } else this.damage(shot.damage, shot.x);
          shot.life = 0;
        }
      } else {
        this.enemies.forEach((enemy, i) => {
          if (
            shot.life > 0 &&
            enemy.hp > 0 &&
            !shot.pierced.includes(i) &&
            Math.abs(shot.x - enemy.x) < 18 + shot.r &&
            Math.abs(shot.y - (enemy.y - 20)) < 22 + shot.r
          ) {
            this.hitEnemy(enemy, shot.damage);
            shot.pierced.push(i);
            if (shot.kind !== 'charge') shot.life = 0;
          }
        });
        if (
          shot.life > 0 &&
          this.boss.active &&
          Math.abs(shot.x - this.boss.x) < 35 + shot.r &&
          Math.abs(shot.y - (this.boss.y - 35)) < 38 + shot.r
        ) {
          this.hitBoss(shot.damage);
          shot.life = 0;
        }
      }
    }
    this.shots = this.shots.filter(
      (s) =>
        s.life > 0 &&
        s.x > 0 &&
        s.x < this.stage.end + 80 &&
        s.y > -100 &&
        s.y < 480,
    );
  }
  snapshot(): RetroSnapshot {
    const p = this.player,
      b = this.boss;
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress:
        this.phase === 'won'
          ? 1
          : b.active
            ? 0.75 + (1 - b.hp / b.maxHp) * 0.25
            : Math.min(0.74, (p.x / this.stage.arena) * 0.75),
      objective: b.active
        ? `${this.stage.bossName} · ${b.phase === 2 ? 'OVERDRIVE' : 'PHASE 01'} · 붉은 예고를 보고 점프 / 대시`
        : p.x < 650
          ? '엑스: J 차지 버스터 · F 엑스/제로 교대 · L 대시 + SPACE 점프'
          : p.x < 1250
            ? '벽을 향해 이동 + SPACE 반복: 벽차기'
            : `${this.stage.sector} · 체크포인트를 통과하고 ${this.stage.bossName}를 격파하세요`,
      stats: [
        { label: 'HUNTER', value: this.character === 'x' ? 'X' : 'ZERO' },
        { label: 'LIFE ENERGY', value: `${p.hp}/24` },
        { label: 'LIVES', value: this.lives },
        {
          label: 'CHARGE',
          value: p.charge >= 1 ? 'MAX' : `${Math.round((p.charge / 1) * 100)}%`,
        },
      ],
    };
  }
}

/** A controller, not a replay: every decision produces ordinary held buttons. */
export function benchmarkReploid(sim: ReploidSimulation): Input {
  const input = idleInput(),
    p = sim.player,
    b = sim.boss,
    stage = sim.stage;
  if (sim.character !== 'x') input.switch = true;
  input.attack = p.charge < 1.08;
  input.interact = true;
  if (b.active) {
    const distance = b.x - p.x;
    if (stage.id === 'x4')
      input.switch = sim.character !== (Math.abs(distance) < 87 ? 'zero' : 'x');
    const target = b.x < stage.arena + 245 ? b.x + 185 : b.x - 185;
    if (Math.abs(p.x - target) > 12) {
      input.right = p.x < target;
      input.left = p.x > target;
    } else if (p.facing !== Math.sign(distance)) {
      input.right = distance > 0;
      input.left = distance < 0;
    }
    input.attack = !(
      p.charge >= 1.08 &&
      p.facing === Math.sign(distance) &&
      Math.abs(p.y - b.y) < 43
    );
    const incoming = sim.shots.some(
      (s) =>
        s.enemy &&
        Math.abs(s.x - p.x) < 100 &&
        Math.abs(s.y - (p.y - 20)) < 35 &&
        (s.x - p.x) * s.vx < 0,
    );
    const danger =
      (b.mode === 'tell' && b.timer < 0.2 && b.pattern === 0) ||
      (b.mode === 'attack' && b.pattern === 0 && Math.abs(distance) < 160) ||
      incoming;
    input.jump = p.grounded ? danger : sim.held.jump && p.vy < -80;
    if (Math.abs(distance) < 87 && sim.time % 0.5 < 0.1) input.special = true;
    return input;
  }
  input.right = true;
  const solids = stage.platforms.map((s) => platformAt(s, sim.time));
  const look = p.x + 65;
  const floorAhead = solids.some(
    (s) =>
      look >= s.x && look <= s.x + s.w && s.y >= p.y - 15 && s.y <= p.y + 65,
  );
  const obstacle = solids.some(
    (s) => s.x > p.x && s.x < p.x + 66 && s.y < p.y - 3 && s.y + s.h > p.y - 35,
  );
  const spikes = stage.hazards.some(
    (h) => h.kind === 'spikes' && h.x > p.x && h.x < p.x + 70,
  );
  if (p.wall && !p.grounded) input.jump = !sim.held.jump;
  else
    input.jump = p.grounded
      ? !floorAhead || obstacle || spikes
      : p.vy < -90 && sim.held.jump;
  // Dash-jump across gaps; an airborne dash extends recovery in the two later stages.
  if (p.grounded && (!floorAhead || spikes) && p.dashCooldown <= 0)
    input.guard = true;
  if (
    !p.grounded &&
    stage.airDash &&
    !floorAhead &&
    p.vy > -45 &&
    p.airDash &&
    p.dashCooldown <= 0
  )
    input.guard = true;
  if (
    sim.enemies.some(
      (e) =>
        e.hp > 0 &&
        e.x - p.x > -5 &&
        e.x - p.x < 65 &&
        Math.abs(e.y - p.y) < 45,
    )
  )
    input.special = sim.time % 0.45 < 0.12;
  return input;
}
