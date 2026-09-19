import {
  idleInput,
  type Input,
  type RetroSimulation,
  type RetroSnapshot,
} from '../types.ts';
import {
  ENEMY_SPAWNS,
  GATE_HALF_WIDTH,
  GATE_Z,
  MELODY_STONES,
  POND,
  ROCKS,
  SHRINE,
  START,
  WORLD,
} from './world.ts';

export type EnemyState = {
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  boss: boolean;
  hp: number;
  maxHp: number;
  alive: boolean;
  facing: number;
  mode: 'idle' | 'chase' | 'windup' | 'recover';
  timer: number;
  lastHit: number;
  hurt: number;
};
export type OcarinaEvent = {
  type: 'sword' | 'block' | 'hurt' | 'melody' | 'gate' | 'enemy' | 'win';
  x: number;
  z: number;
  time: number;
};
const radius = 0.52;
const melodyNames = ['이슬', '뿌리', '새벽'];
const distance = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(ax - bx, az - bz);
const objectiveFor = (melodies: number, bossAlive: boolean) =>
  melodies < 3
    ? `${melodyNames[melodies]} 선율을 연주하세요 · 빛나는 돌 가까이에서 E`
    : bossAlive
      ? '문이 열렸습니다. 야근 수호자를 물리치세요 · J 나무검, L 방패'
      : '빌린 시간을 제단에 돌려주세요 · 제단 가까이에서 E';

/** Fixed-step, DOM-free forest adventure. All state changes require normal input. */
export class OcarinaSimulation implements RetroSimulation {
  phase: 'playing' | 'won' | 'lost' = 'playing';
  time = 0;
  score = 0;
  hearts = 5;
  melodies = 0;
  gateOpen = false;
  blocks = 0;
  enemiesDefeated = 0;
  player = {
    x: START.x as number,
    z: START.z as number,
    facing: Math.PI,
    height: 0,
    vy: 0,
    speed: 0,
    attack: 0,
    attackCooldown: 0,
    attackId: 0,
    roll: 0,
    rollCooldown: 0,
    rollX: 0,
    rollZ: -1,
    guard: false,
    invulnerable: 0,
    playing: 0,
  };
  enemies: EnemyState[] = ENEMY_SPAWNS.map((spawn) => ({
    ...spawn,
    homeX: spawn.x,
    homeZ: spawn.z,
    hp: spawn.boss ? 10 : 3,
    maxHp: spawn.boss ? 10 : 3,
    alive: true,
    facing: 0,
    mode: 'idle',
    timer: 0.3,
    lastHit: -1,
    hurt: 0,
  }));
  events: OcarinaEvent[] = [];
  message = 'Three small melodies. One very long workday.';
  messageTime = 3;
  private interactCooldown = 0;
  private jumpHeld = false;
  private specialHeld = false;

  private event(
    type: OcarinaEvent['type'],
    x = this.player.x,
    z = this.player.z,
  ) {
    this.events.push({ type, x, z, time: this.time });
    if (this.events.length > 20) this.events.shift();
  }

  private say(message: string) {
    this.message = message;
    this.messageTime = 2.5;
  }

  private canStand(x: number, z: number) {
    if (
      x < WORLD.left + radius ||
      x > WORLD.right - radius ||
      z > WORLD.near - radius ||
      z < WORLD.far + radius
    )
      return false;
    const pondX = (x - POND.x) / (POND.radiusX + radius);
    const pondZ = (z - POND.z) / (POND.radiusZ + radius);
    if (pondX * pondX + pondZ * pondZ < 1) return false;
    if (
      ROCKS.some(
        (rock) => distance(x, z, rock.x, rock.z) < rock.radius + radius,
      )
    )
      return false;
    if (
      Math.abs(z - GATE_Z) < 0.75 + radius &&
      (!this.gateOpen || Math.abs(x) > GATE_HALF_WIDTH - radius)
    )
      return false;
    return true;
  }

  private move(dx: number, dz: number) {
    if (this.canStand(this.player.x + dx, this.player.z)) this.player.x += dx;
    if (this.canStand(this.player.x, this.player.z + dz)) this.player.z += dz;
  }

  private damage(enemy: EnemyState) {
    const p = this.player;
    if (p.invulnerable > 0 || p.roll > 0 || p.height > 0.7) return;
    const dx = enemy.x - p.x;
    const dz = enemy.z - p.z;
    const length = Math.max(0.01, Math.hypot(dx, dz));
    const front = (Math.sin(p.facing) * dx + Math.cos(p.facing) * dz) / length;
    if (p.guard && front > 0.05) {
      this.blocks += 1;
      enemy.timer = 1.15;
      enemy.mode = 'recover';
      this.score += 15;
      this.event('block');
      this.say('Perfectly reasonable boundary. Shield held.');
      return;
    }
    this.hearts -= 1;
    p.invulnerable = 1.05;
    p.playing = 0;
    this.move((-dx / length) * 0.55, (-dz / length) * 0.55);
    this.event('hurt');
    this.say('Hold L toward danger, or roll with K.');
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.phase = 'lost';
      this.say('The workday won this round. Try another route.');
    }
  }

  private sword() {
    const p = this.player;
    const reach = 2.8;
    for (const enemy of this.enemies) {
      if (
        !enemy.alive ||
        enemy.lastHit === p.attackId ||
        (enemy.boss && !this.gateOpen)
      )
        continue;
      const dx = enemy.x - p.x;
      const dz = enemy.z - p.z;
      const length = Math.max(0.01, Math.hypot(dx, dz));
      if (length > reach + (enemy.boss ? 0.4 : 0)) continue;
      const forward =
        (Math.sin(p.facing) * dx + Math.cos(p.facing) * dz) / length;
      if (forward < -0.05) continue;
      enemy.lastHit = p.attackId;
      enemy.hp = Math.max(0, enemy.hp - 2);
      enemy.hurt = 0.24;
      const knockback = enemy.boss ? 0.2 : 0.5;
      enemy.x += (dx / length) * knockback;
      enemy.z += (dz / length) * knockback;
      this.score += 35;
      if (enemy.hp === 0) {
        enemy.alive = false;
        this.enemiesDefeated += 1;
        this.score += enemy.boss ? 400 : 100;
        this.event('enemy', enemy.x, enemy.z);
        if (enemy.boss)
          this.say('The Warden has clocked out. The shrine is waiting.');
      }
    }
  }

  private interact() {
    if (this.interactCooldown > 0 || this.player.roll > 0) return;
    this.interactCooldown = 0.6;
    const p = this.player;
    if (this.melodies < 3) {
      const current = MELODY_STONES[this.melodies];
      if (distance(p.x, p.z, current.x, current.z) <= 2.45) {
        this.melodies += 1;
        this.score += 150;
        p.playing = 0.85;
        this.event('melody', current.x, current.z);
        this.say(`${current.name} melody remembered.`);
        if (this.melodies === 3) {
          this.gateOpen = true;
          this.event('gate', 0, GATE_Z);
          this.say('The ancient out-of-office gate opens.');
        }
      } else if (
        MELODY_STONES.some(
          (stone) => distance(p.x, p.z, stone.x, stone.z) <= 2.45,
        )
      ) {
        this.say(
          `The forest listens for ${current.name} first. Follow the glowing stone.`,
        );
      }
      return;
    }
    if (distance(p.x, p.z, SHRINE.x, SHRINE.z) <= 2.7) {
      if (this.enemies.some((enemy) => enemy.boss && enemy.alive)) {
        this.say('The Warden still guards the borrowed hours.');
      } else {
        this.phase = 'won';
        this.score += 1000 + this.hearts * 100;
        this.event('win', SHRINE.x, SHRINE.z);
        this.say('Time returned. Hero off duty.');
      }
    }
  }

  step(dt: number, input: Input) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const delta = Math.min(dt, 1 / 30);
    this.time += delta;
    if (this.time >= 150) {
      this.phase = 'lost';
      this.say('The office bell rang. Try again.');
      return;
    }
    this.messageTime = Math.max(0, this.messageTime - delta);
    this.interactCooldown = Math.max(0, this.interactCooldown - delta);
    const p = this.player;
    p.attackCooldown = Math.max(0, p.attackCooldown - delta);
    p.attack = Math.max(0, p.attack - delta);
    p.rollCooldown = Math.max(0, p.rollCooldown - delta);
    p.roll = Math.max(0, p.roll - delta);
    p.invulnerable = Math.max(0, p.invulnerable - delta);
    p.playing = Math.max(0, p.playing - delta);
    p.guard = input.guard && p.roll === 0 && p.playing === 0;
    let dx = Number(input.right) - Number(input.left);
    let dz = Number(input.down) - Number(input.up);
    const length = Math.hypot(dx, dz);
    if (length > 0) {
      dx /= length;
      dz /= length;
    }
    if (length > 0 && p.roll === 0) p.facing = Math.atan2(dx, dz);
    if (
      input.special &&
      !this.specialHeld &&
      p.rollCooldown === 0 &&
      p.playing === 0
    ) {
      p.roll = 0.42;
      p.rollCooldown = 1.05;
      p.rollX = length > 0 ? dx : Math.sin(p.facing);
      p.rollZ = length > 0 ? dz : Math.cos(p.facing);
      p.guard = false;
    }
    this.specialHeld = input.special;
    if (input.jump && !this.jumpHeld && p.height <= 0 && p.playing === 0)
      p.vy = 5.5;
    this.jumpHeld = input.jump;
    p.vy -= 17 * delta;
    p.height = Math.max(0, p.height + p.vy * delta);
    if (p.height === 0) p.vy = 0;
    const speed = p.playing > 0 ? 0 : p.roll > 0 ? 10 : p.guard ? 2.3 : 5.6;
    p.speed = length > 0 || p.roll > 0 ? speed : 0;
    this.move(
      (p.roll > 0 ? p.rollX : dx) * speed * delta,
      (p.roll > 0 ? p.rollZ : dz) * speed * delta,
    );
    if (
      input.attack &&
      p.attackCooldown === 0 &&
      p.roll === 0 &&
      p.playing === 0
    ) {
      p.attack = 0.25;
      p.attackCooldown = 0.46;
      p.attackId += 1;
      this.event('sword');
      this.sword();
    }
    if (input.interact && p.playing === 0) this.interact();
    if (this.phase !== 'playing') return;

    for (const enemy of this.enemies) {
      if (!enemy.alive || (enemy.boss && !this.gateOpen)) continue;
      enemy.hurt = Math.max(0, enemy.hurt - delta);
      enemy.timer = Math.max(0, enemy.timer - delta);
      const ex = p.x - enemy.x;
      const ez = p.z - enemy.z;
      const range = Math.max(0.001, Math.hypot(ex, ez));
      enemy.facing = Math.atan2(ex, ez);
      if (enemy.mode === 'windup') {
        if (enemy.timer === 0) {
          enemy.mode = 'recover';
          enemy.timer = enemy.boss ? 1.0 : 1.25;
          if (range < (enemy.boss ? 3.2 : 2.5)) this.damage(enemy);
        }
      } else if (enemy.mode === 'recover') {
        if (enemy.timer === 0) enemy.mode = 'chase';
      } else if (range < (enemy.boss ? 12 : 7.4)) {
        enemy.mode = 'chase';
        if (range < (enemy.boss ? 2.7 : 1.9) && enemy.timer === 0) {
          enemy.mode = 'windup';
          enemy.timer = enemy.boss ? 0.7 : 0.6;
        } else if (range > 1.5) {
          const travel = (enemy.boss ? 1.3 : 1.65) * delta;
          const nx = enemy.x + (ex / range) * travel;
          const nz = enemy.z + (ez / range) * travel;
          if (this.canStand(nx, nz)) {
            enemy.x = nx;
            enemy.z = nz;
          }
        }
      } else enemy.mode = 'idle';
    }
  }

  snapshot(): RetroSnapshot {
    const bossAlive = this.enemies.some((enemy) => enemy.boss && enemy.alive);
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress:
        this.phase === 'won' ? 1 : this.melodies / 5 + (!bossAlive ? 0.25 : 0),
      objective:
        this.phase === 'won'
          ? '시간을 돌려줬습니다. 용사도 이제 퇴근!'
          : this.phase === 'lost'
            ? '숲이 다시 기다립니다. 재시작해서 도전하세요.'
            : objectiveFor(this.melodies, bossAlive),
      stats: [
        {
          label: '하트',
          value: `${'♥'.repeat(this.hearts)}${'♡'.repeat(5 - this.hearts)}`,
        },
        { label: '선율', value: `${this.melodies} / 3` },
        {
          label: '수호자',
          value: bossAlive ? (this.gateOpen ? '깨어남' : '봉인') : '퇴근 완료',
        },
      ],
    };
  }
}

/** Normal controller input only. It aims, guards, attacks, walks and interacts. */
export function benchmarkOcarina(simulation: OcarinaSimulation): Input {
  const input = idleInput();
  if (simulation.phase !== 'playing') return input;
  const p = simulation.player;
  const nearby = simulation.enemies
    .filter((enemy) => enemy.alive && (!enemy.boss || simulation.gateOpen))
    .map((enemy) => ({ enemy, range: distance(p.x, p.z, enemy.x, enemy.z) }))
    .filter(({ range }) => range < 6)
    .sort((a, b) => a.range - b.range)[0];
  let target: { x: number; z: number };
  if (nearby) {
    target = nearby.enemy;
    input.attack = nearby.range < 3.4;
    input.guard = nearby.range < 3.7;
  } else if (simulation.melodies < 3) {
    target = MELODY_STONES[simulation.melodies];
    input.interact = distance(p.x, p.z, target.x, target.z) < 2.2;
  } else if (p.z > GATE_Z - 2) {
    // Cross the actual opening, rather than steering diagonally into its wall.
    target =
      Math.abs(p.x) > 1 ? { x: 0, z: GATE_Z + 2.2 } : { x: 0, z: GATE_Z - 3 };
  } else {
    const boss = simulation.enemies.find((enemy) => enemy.boss && enemy.alive);
    target = boss ?? SHRINE;
    input.interact = !boss && distance(p.x, p.z, SHRINE.x, SHRINE.z) < 2.4;
  }
  const dx = target.x - p.x;
  const dz = target.z - p.z;
  const stopDistance = nearby ? 1.8 : input.interact ? 1.7 : 0.18;
  if (Math.hypot(dx, dz) > stopDistance) {
    input.left = dx < -0.15;
    input.right = dx > 0.15;
    input.up = dz < -0.15;
    input.down = dz > 0.15;
  } else if (nearby) {
    // One small movement pulse keeps the shield and sword facing the opponent.
    input.left = dx < -0.5;
    input.right = dx > 0.5;
    input.up = dz < -0.5;
    input.down = dz > 0.5;
  }
  return input;
}
