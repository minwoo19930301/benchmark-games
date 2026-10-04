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
  damage?: number;
};
export type Explosion = { x: number; y: number; life: number; size: number };
export class CommandoSimulation implements RetroSimulation {
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  audioCues = { jump: 0, shot: 0, hit: 0, explosion: 0, pickup: 0, ability: 0 };
  player = {
    x: 70,
    y: FLOOR,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    hp: 1,
    lives: 3,
    armor: 3,
    weapon: 'pistol' as 'pistol' | 'heavy',
    ammo: 0,
    knife: 0,
    aimUp: false,
    invulnerable: 0,
    crouch: false,
    shoot: 0,
    grenade: 0,
    grenades: 10,
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
  interactHeld = false;
  tankAvailable = true;
  kills = 0;
  deaths = 0;
  step(dt: number, input: Input) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.shoot = Math.max(0, p.shoot - dt);
    p.knife = Math.max(0, p.knife - dt);
    p.aimUp = input.up;
    p.grenade = Math.max(0, p.grenade - dt);
    p.crouch = (input.guard || input.down) && p.grounded && !p.tank;
    const direction = Number(input.right) - Number(input.left);
    p.vx = direction * (p.tank ? 88 : p.crouch ? 35 : 105);
    if (direction) p.facing = direction;
    if (input.jump && !this.jumpHeld && p.grounded) {
      this.audioCues.jump++;
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
      const close =
        !p.tank && !input.up
          ? this.enemies.find(
              (e) =>
                e.hp > 0 &&
                Math.abs(e.x - p.x) < 44 &&
                Math.abs(e.y - p.y) < 35 &&
                (e.x - p.x) * p.facing >= -8,
            )
          : undefined;
      if (close) {
        p.shoot = 0.28;
        p.knife = 0.2;
        this.audioCues.hit++;
        close.hp = 0;
        close.flash = 0.15;
        this.score += 500;
        this.kills++;
      } else {
        this.audioCues.shot++;
        const heavy = p.weapon === 'heavy' && p.ammo > 0 && !p.tank;
        p.shoot = p.tank ? 0.12 : heavy ? 0.075 : 0.22;
        if (heavy && --p.ammo <= 0) p.weapon = 'pistol';
        this.shots.push({
          x: p.x + (input.up ? 4 : p.facing * (p.tank ? 49 : 24)),
          y: p.y - (input.up ? 41 : p.crouch ? 11 : p.tank ? 35 : 25),
          vx: input.up ? 0 : p.facing * 490,
          vy: input.up ? -490 : 0,
          life: 1.5,
          enemy: false,
          grenade: false,
          damage: p.tank || heavy ? 2 : 1,
        });
      }
    }
    if (input.special && p.grenade <= 0 && p.grenades > 0) {
      p.grenade = 0.8;
      p.grenades--;
      this.audioCues.ability++;
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
    for (let index = 0; index < this.prisoners.length; index++) {
      const prisoner = this.prisoners[index];
      if (
        !prisoner.rescued &&
        Math.abs(p.x - prisoner.x) < 30 &&
        Math.abs(p.y - FLOOR) < 42
      ) {
        prisoner.rescued = true;
        this.audioCues.pickup++;
        this.score += 1000;
        if (index === 0 || index === 2) {
          p.weapon = 'heavy';
          p.ammo = 200;
        } else p.grenades += 10;
      }
    }
    if (
      input.interact &&
      !this.interactHeld &&
      this.tankAvailable &&
      Math.abs(p.x - 1210) < 55 &&
      !p.tank
    ) {
      p.tank = true;
      p.armor = 3;
      this.tankAvailable = false;
      this.score += 500;
    }
    this.interactHeld = input.interact;
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      if (enemy.hp <= 0) continue;
      enemy.cooldown -= dt;
      if (Math.abs(p.x - enemy.x) < 370 && enemy.cooldown <= 0) {
        enemy.cooldown = 1.8;
        if (Math.abs(p.x - enemy.x) < 28 && Math.abs(p.y - enemy.y) < 30)
          this.damage();
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
    }
    this.boss.flash = Math.max(0, this.boss.flash - dt);
    if (this.boss.hp > 0 && p.x > 2390) {
      this.boss.cooldown -= dt;
      if (this.boss.cooldown <= 0) {
        this.boss.cooldown = 1.5;
        const muzzleX = this.boss.x - 85,
          muzzleY = FLOOR - 129;
        const aim = Math.atan2(p.y - 22 - muzzleY, p.x - muzzleX);
        for (const spread of [-0.08, 0, 0.08])
          this.shots.push({
            x: muzzleX,
            y: muzzleY,
            vx: Math.cos(aim + spread) * 180,
            vy: Math.sin(aim + spread) * 180,
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
            enemy.hp = Math.max(0, enemy.hp - (shot.damage ?? 1));
            enemy.flash = 0.08;
            shot.life = -1;
            if (enemy.hp <= 0) {
              this.score += 100;
              this.kills++;
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
          p.x > 2390 &&
          Math.abs(shot.x - this.boss.x) < 60 &&
          Math.abs(shot.y - (FLOOR - 31)) < 39
        ) {
          this.boss.hp -= shot.damage ?? 1;
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
    if (p.lives <= 0 || this.time >= 180) this.phase = 'lost';
    else if (p.x >= END - 35 && this.boss.hp <= 0) {
      this.phase = 'won';
      this.score += Math.floor(Math.max(0, 180 - this.time) * 20);
    }
  }
  damage() {
    const p = this.player;
    if (p.invulnerable > 0 || this.phase !== 'playing') return;
    this.audioCues.hit++;
    if (p.tank) {
      p.armor--;
      p.invulnerable = 1.2;
      if (p.armor <= 0) {
        p.tank = false;
        p.vy = -260;
        p.grounded = false;
        p.invulnerable = 2.5;
        this.explosions.push({ x: p.x, y: p.y - 20, life: 0.8, size: 75 });
      }
      return;
    }
    p.lives--;
    this.deaths++;
    p.hp = p.lives > 0 ? 1 : 0;
    p.weapon = 'pistol';
    p.ammo = 0;
    p.grenades = 10;
    p.invulnerable = 3;
    if (p.lives <= 0) this.phase = 'lost';
  }
  blast(x: number, y: number, radius: number) {
    this.audioCues.explosion++;
    this.explosions.push({ x, y, life: 0.45, size: radius });
    for (const enemy of this.enemies) {
      if (enemy.hp > 0 && Math.abs(enemy.x - x) < radius) {
        enemy.hp = 0;
        this.score += 100;
        this.kills++;
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
          ? 'MISSION COMPLETE — 오른쪽 집결 지점으로!'
          : this.player.x > 2390
            ? '테츠유키를 격파하라 — K 수류탄 / 슬러그 포탄'
            : 'J 사격 / 근접 칼 · K 수류탄 · E 슬러그 탑승 · 포로는 닿아서 구출',
      stats: [
        { label: 'LIVES', value: this.player.lives },
        {
          label: 'ARMS',
          value: this.player.tank
            ? `SLUG ${this.player.armor}/3`
            : this.player.weapon === 'heavy'
              ? `H ${this.player.ammo}`
              : '∞',
        },
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
  input.interact = Math.abs(p.x - 1210) < 50 && !p.tank;
  input.right = true;
  input.guard =
    !p.tank &&
    sim.shots.some(
      (s) =>
        s.enemy &&
        s.x > p.x &&
        s.x < p.x + 100 &&
        Math.abs(s.y - (p.y - 20)) < 10,
    );
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
