import {
  clamp,
  idleInput,
  type Input,
  type RetroSimulation,
  type RetroSnapshot,
} from '../types.ts';
export const END = 2960,
  FLOOR = 270;
export const platforms = [
  { x: 475, y: 217, w: 115 },
  { x: 850, y: 223, w: 95 },
  { x: 1580, y: 215, w: 135 },
  { x: 2130, y: 221, w: 110 },
];
export type Shot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  enemy: boolean;
  grenade: boolean;
};
export type Explosion = { x: number; y: number; life: number; size: number };
export class CommandoSimulation implements RetroSimulation {
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  player = {
    x: 70,
    y: FLOOR,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    hp: 10,
    invulnerable: 0,
    crouch: false,
    shoot: 0,
    grenade: 0,
    grenades: 8,
    tank: false,
  };
  enemies = [320, 650, 760, 1030, 1390, 1510, 1790, 1950, 2280, 2390].map(
    (x, i) => ({ x, y: FLOOR, hp: 3, cooldown: 1 + (i % 3) * 0.35, flash: 0 }),
  );
  prisoners = [
    { x: 555, rescued: false },
    { x: 1495, rescued: false },
    { x: 2230, rescued: false },
  ];
  shots: Shot[] = [];
  explosions: Explosion[] = [];
  boss = { x: 2770, hp: 65, cooldown: 1.7, flash: 0 };
  jumpHeld = false;
  step(dt: number, input: Input) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.shoot = Math.max(0, p.shoot - dt);
    p.grenade = Math.max(0, p.grenade - dt);
    p.crouch = input.guard && p.grounded && !p.tank;
    const direction = Number(input.right) - Number(input.left);
    p.vx = direction * (p.tank ? 88 : p.crouch ? 35 : 105);
    if (direction) p.facing = direction;
    if (input.jump && !this.jumpHeld && p.grounded) {
      p.vy = p.tank ? -220 : -330;
      p.grounded = false;
    }
    this.jumpHeld = input.jump;
    const beforeY = p.y;
    p.x = clamp(p.x + p.vx * dt, 20, END);
    p.vy += 820 * dt;
    p.y += p.vy * dt;
    p.grounded = false;
    if (p.y >= FLOOR) {
      p.y = FLOOR;
      p.vy = 0;
      p.grounded = true;
    }
    for (const platform of platforms) {
      if (
        p.x > platform.x - 8 &&
        p.x < platform.x + platform.w + 8 &&
        p.vy >= 0 &&
        beforeY <= platform.y + 0.2 &&
        p.y >= platform.y
      ) {
        p.y = platform.y;
        p.vy = 0;
        p.grounded = true;
      }
    }
    if (input.attack && p.shoot <= 0) {
      p.shoot = p.tank ? 0.14 : 0.115;
      this.shots.push({
        x: p.x + p.facing * 17,
        y: p.y - (p.crouch ? 11 : p.tank ? 25 : 22),
        vx: input.up ? 0 : p.facing * 490,
        vy: input.up ? -490 : 0,
        life: 1.5,
        enemy: false,
        grenade: false,
      });
    }
    if (input.special && p.grenade <= 0 && p.grenades > 0) {
      p.grenade = 0.8;
      p.grenades--;
      this.shots.push({
        x: p.x,
        y: p.y - 27,
        vx: p.facing * 200,
        vy: -190,
        life: 1.1,
        enemy: false,
        grenade: true,
      });
    }
    if (input.interact) {
      for (const prisoner of this.prisoners) {
        if (!prisoner.rescued && Math.abs(p.x - prisoner.x) < 65) {
          prisoner.rescued = true;
          this.score += 1000;
          p.hp = Math.min(10, p.hp + 2);
          p.grenades += 3;
        }
      }
      if (Math.abs(p.x - 1210) < 65 && !p.tank) {
        p.tank = true;
        this.score += 500;
      }
    }
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      if (enemy.hp <= 0) continue;
      enemy.cooldown -= dt;
      if (Math.abs(p.x - enemy.x) < 370 && enemy.cooldown <= 0) {
        enemy.cooldown = 1.8;
        this.shots.push({
          x: enemy.x,
          y: enemy.y - 20,
          vx: Math.sign(p.x - enemy.x) * 155,
          vy: 0,
          life: 3,
          enemy: true,
          grenade: false,
        });
      }
      if (Math.abs(p.x - enemy.x) < 18 && Math.abs(p.y - enemy.y) < 25)
        this.damage();
    }
    this.boss.flash = Math.max(0, this.boss.flash - dt);
    if (this.boss.hp > 0 && p.x > 2390) {
      this.boss.cooldown -= dt;
      if (this.boss.cooldown <= 0) {
        this.boss.cooldown = 1.5;
        for (const vy of [-18, 0, 18])
          this.shots.push({
            x: this.boss.x - 52,
            y: FLOOR - 22,
            vx: -180,
            vy,
            life: 4,
            enemy: true,
            grenade: false,
          });
      }
    }
    for (const shot of this.shots) {
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.grenade) {
        shot.vy += 500 * dt;
        if (shot.y >= FLOOR - 5 || shot.life <= 0) {
          this.blast(shot.x, shot.y, 78);
          shot.life = -1;
        }
      } else if (shot.enemy) {
        if (
          Math.abs(shot.x - p.x) < (p.tank ? 24 : 10) &&
          shot.y < p.y &&
          shot.y > p.y - (p.crouch ? 15 : p.tank ? 36 : 34)
        ) {
          this.damage();
          shot.life = -1;
        }
      } else {
        for (const enemy of this.enemies) {
          if (
            enemy.hp > 0 &&
            Math.abs(shot.x - enemy.x) < 16 &&
            Math.abs(shot.y - (enemy.y - 18)) < 24
          ) {
            enemy.hp -= p.tank ? 2 : 1;
            enemy.flash = 0.08;
            shot.life = -1;
            if (enemy.hp <= 0) {
              this.score += 250;
              this.explosions.push({
                x: enemy.x,
                y: enemy.y - 18,
                life: 0.4,
                size: 24,
              });
            }
            break;
          }
        }
        if (
          shot.life > 0 &&
          this.boss.hp > 0 &&
          Math.abs(shot.x - this.boss.x) < 60 &&
          Math.abs(shot.y - (FLOOR - 31)) < 39
        ) {
          this.boss.hp -= p.tank ? 2 : 1;
          this.boss.flash = 0.08;
          shot.life = -1;
          if (this.boss.hp <= 0) {
            this.score += 5000;
            this.explosions.push({
              x: this.boss.x,
              y: FLOOR - 30,
              life: 1.5,
              size: 100,
            });
          }
        }
      }
    }
    this.shots = this.shots.filter(
      (shot) => shot.life > 0 && shot.x > -20 && shot.x < END + 150,
    );
    for (const blast of this.explosions) blast.life -= dt;
    this.explosions = this.explosions.filter((blast) => blast.life > 0);
    if (p.hp <= 0 || this.time >= 180) this.phase = 'lost';
    else if (
      p.x >= END - 35 &&
      this.boss.hp <= 0 &&
      this.prisoners.every((prisoner) => prisoner.rescued)
    ) {
      this.phase = 'won';
      this.score += Math.floor(Math.max(0, 180 - this.time) * 20);
    }
  }
  damage() {
    if (this.player.invulnerable > 0) return;
    this.player.hp--;
    this.player.invulnerable = 1.3;
  }
  blast(x: number, y: number, radius: number) {
    this.explosions.push({ x, y, life: 0.45, size: radius });
    for (const enemy of this.enemies) {
      if (enemy.hp > 0 && Math.abs(enemy.x - x) < radius) {
        enemy.hp = 0;
        this.score += 250;
      }
    }
    if (this.boss.hp > 0 && Math.abs(this.boss.x - x) < radius + 50) {
      this.boss.hp -= 12;
      this.boss.flash = 0.15;
      if (this.boss.hp <= 0) this.score += 5000;
    }
  }
  snapshot(): RetroSnapshot {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress: this.player.x / END,
      objective:
        this.boss.hp <= 0
          ? '동료를 모두 구출하고 오른쪽 탈출 지점으로!'
          : this.player.x > 2390
            ? '고철 탱크를 격파하고 탈출하라!'
            : 'J 사격 · E 동료 구출 / 노란 전차 탑승',
      stats: [
        { label: 'ARMOR', value: this.player.hp },
        {
          label: 'RESCUE',
          value: `${this.prisoners.filter((p) => p.rescued).length}/3`,
        },
        { label: 'GRENADES', value: this.player.grenades },
      ],
    };
  }
}
export function benchmarkCommando(sim: CommandoSimulation): Input {
  const input = idleInput(),
    p = sim.player;
  input.attack = true;
  input.interact = true;
  input.right = true;
  if (p.x > 2560 && sim.boss.hp > 0) {
    input.right = false;
    input.special = p.grenade <= 0 && p.grenades > 0;
    input.guard = !p.tank;
  }
  const missed = sim.prisoners.find(
    (prisoner) => !prisoner.rescued && p.x > prisoner.x + 55,
  );
  if (missed) {
    input.right = false;
    input.left = true;
  }
  return input;
}
