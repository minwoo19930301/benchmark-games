import {
  idleInput,
  type Input,
  type RetroSimulation,
  type RetroSnapshot,
  type SoundCue,
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
export const melodyNames = ['사리아의 노래', '젤다의 자장가', '태양의 노래'];
const distance = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(ax - bx, az - bz);
const objectiveFor = (melodies: number, bossAlive: boolean) =>
  melodies < 3
    ? `${melodyNames[melodies]} · 빛나는 돌 가까이에서 E, 화면의 방향키 선율 입력`
    : bossAlive
      ? '데크 나무의 입구가 열렸습니다. 고마를 물리치세요 · Z 주시, J 검, L 방패'
      : '데크 나무의 저주를 풀어주세요 · 안쪽 제단 가까이에서 E';

/** Fixed-step, DOM-free forest adventure. All state changes require normal input. */
export class OcarinaSimulation implements RetroSimulation {
  phase: 'playing' | 'won' | 'lost' = 'playing';
  time = 0;
  score = 0;
  rupees = 0;
  magic = 100;
  cameraYaw = Math.PI;
  cameraPitch = 0.32;
  targetIndex: number | null = null;
  playingSong: number | null = null;
  songCursor = 0;
  audioCues: Record<SoundCue, number> = {
    shot: 0,
    hit: 0,
    jump: 0,
    dash: 0,
    pickup: 0,
    explosion: 0,
    ability: 0,
  };
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
    combo: 0,
    comboTime: 0,
    charging: 0,
    spin: 0,
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
  message = '나비: 링크! 숲의 세 선율을 깨우면 데크 나무의 입구가 열릴 거야.';
  messageTime = 3;
  private interactCooldown = 0;
  private jumpHeld = false;
  private specialHeld = false;
  private attackHeld = false;
  private targetHeld = false;
  private noteHeld = new Set<string>();
  private interactHeld = false;

  clearInput(): void {
    this.jumpHeld = false;
    this.specialHeld = false;
    this.attackHeld = false;
    this.targetHeld = false;
    this.player.charging = 0;
    this.player.guard = false;
    this.targetIndex = null;
    this.noteHeld.clear();
    this.interactHeld = false;
  }

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
      this.audioCues.hit++;
      enemy.timer = 1.15;
      enemy.mode = 'recover';
      this.score += 15;
      this.event('block');
      this.say('방패로 막았습니다! 적의 빈틈에 검을 휘두르세요.');
      return;
    }
    this.hearts -= 1;
    this.audioCues.hit++;
    p.invulnerable = 1.05;
    p.playing = 0;
    this.playingSong = null;
    this.songCursor = 0;
    this.move((-dx / length) * 0.55, (-dz / length) * 0.55);
    this.event('hurt');
    this.say('Z로 적을 주시하고 L로 막거나 K로 굴러 피하세요.');
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.phase = 'lost';
      this.say('모든 하트를 잃었습니다. 코키리 숲에서 다시 시작하세요.');
    }
  }

  private sword(spin = false) {
    const p = this.player;
    const reach = spin ? 3.8 : 2.8;
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
      if (!spin && forward < -0.05) continue;
      enemy.lastHit = p.attackId;
      enemy.hp = Math.max(0, enemy.hp - (spin ? 4 : p.combo === 3 ? 3 : 2));
      this.audioCues.hit++;
      enemy.hurt = 0.24;
      const knockback = enemy.boss ? 0.2 : 0.5;
      enemy.x += (dx / length) * knockback;
      enemy.z += (dz / length) * knockback;
      this.score += 35;
      if (enemy.hp === 0) {
        enemy.alive = false;
        this.enemiesDefeated += 1;
        this.rupees += enemy.boss ? 20 : 5;
        this.audioCues.pickup++;
        this.score += enemy.boss ? 400 : 100;
        this.event('enemy', enemy.x, enemy.z);
        if (enemy.boss)
          this.say('고마를 물리쳤습니다! 안쪽의 빛나는 제단으로 가세요.');
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
        this.playingSong = this.melodies;
        this.songCursor = 0;
        this.noteHeld.clear();
        p.playing = 1;
        p.charging = 0;
        p.attack = 0;
        p.guard = false;
        this.say(
          `${melodyNames[this.melodies]}: 화면에 표시된 방향키 6개를 연주하세요. E로 취소.`,
        );
      } else if (
        MELODY_STONES.some(
          (stone) => distance(p.x, p.z, stone.x, stone.z) <= 2.45,
        )
      ) {
        this.say(
          `먼저 ${melodyNames[this.melodies]}의 선율을 연주하세요. 나비가 길을 알려줄 거예요.`,
        );
      }
      return;
    }
    if (distance(p.x, p.z, SHRINE.x, SHRINE.z) <= 2.7) {
      if (this.enemies.some((enemy) => enemy.boss && enemy.alive)) {
        this.say('고마가 아직 데크 나무를 위협하고 있습니다.');
      } else {
        this.phase = 'won';
        this.score += 1000 + this.hearts * 100;
        this.event('win', SHRINE.x, SHRINE.z);
        this.say('데크 나무의 저주가 풀렸습니다. 링크, 잘했어!');
      }
    }
  }

  private playNotes(input: Input): void {
    if (this.playingSong === null) return;
    this.player.playing = 1;
    if (input.interact && !this.interactHeld && this.interactCooldown === 0) {
      this.playingSong = null;
      this.songCursor = 0;
      this.player.playing = 0;
      this.interactCooldown = 0.6;
      this.say('연주를 멈췄습니다.');
      return;
    }
    const notes = ['up', 'down', 'left', 'right', 'attack'] as const;
    const pressed = notes.find(
      (note) => input[note] && !this.noteHeld.has(note),
    );
    if (pressed) {
      const song = MELODY_STONES[this.playingSong];
      this.audioCues.ability++;
      if (pressed === song.notes[this.songCursor]) this.songCursor++;
      else {
        this.songCursor = 0;
        this.say('선율이 달라요. 표시된 첫 음부터 다시 연주하세요.');
      }
      if (this.songCursor === song.notes.length) {
        this.melodies++;
        this.score += 150;
        this.player.playing = 0.85;
        this.event('melody', song.x, song.z);
        this.say(`${melodyNames[this.playingSong]}를 연주했습니다!`);
        this.playingSong = null;
        this.songCursor = 0;
        if (this.melodies === 3) {
          this.gateOpen = true;
          this.event('gate', 0, GATE_Z);
          this.say('데크 나무의 입구가 열렸습니다! 안쪽의 고마를 찾아가세요.');
        }
      }
    }
    this.noteHeld = new Set(notes.filter((note) => input[note]));
  }

  step(dt: number, input: Input) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const delta = Math.min(dt, 1 / 30);
    this.time += delta;
    if (this.time >= 150) {
      this.phase = 'lost';
      this.say('숲의 빛이 사라졌습니다. 다시 도전하세요.');
      return;
    }
    this.messageTime = Math.max(0, this.messageTime - delta);
    this.interactCooldown = Math.max(0, this.interactCooldown - delta);
    const p = this.player;
    p.attackCooldown = Math.max(0, p.attackCooldown - delta);
    p.attack = Math.max(0, p.attack - delta);
    p.comboTime = Math.max(0, p.comboTime - delta);
    p.spin = Math.max(0, p.spin - delta);
    this.magic = Math.min(100, this.magic + delta * 1.7);
    p.rollCooldown = Math.max(0, p.rollCooldown - delta);
    p.roll = Math.max(0, p.roll - delta);
    p.invulnerable = Math.max(0, p.invulnerable - delta);
    p.playing = Math.max(0, p.playing - delta);
    this.playNotes(input);
    p.guard = input.guard && p.roll === 0 && p.playing === 0;
    const targetHeld = input.switch;
    if (targetHeld) {
      const previous =
        this.targetIndex === null ? null : this.enemies[this.targetIndex];
      if (!previous?.alive || distance(p.x, p.z, previous.x, previous.z) > 13) {
        let nearest = 11;
        this.targetIndex = null;
        this.enemies.forEach((enemy, index) => {
          const range = distance(p.x, p.z, enemy.x, enemy.z);
          if (
            enemy.alive &&
            (!enemy.boss || this.gateOpen) &&
            range < nearest
          ) {
            nearest = range;
            this.targetIndex = index;
          }
        });
      }
      if (this.targetIndex !== null) {
        const enemy = this.enemies[this.targetIndex];
        p.facing = Math.atan2(enemy.x - p.x, enemy.z - p.z);
        this.cameraYaw +=
          Math.atan2(
            Math.sin(p.facing - this.cameraYaw),
            Math.cos(p.facing - this.cameraYaw),
          ) * Math.min(1, delta * 6);
      } else if (!this.targetHeld) this.cameraYaw = p.facing;
    } else this.targetIndex = null;
    this.targetHeld = targetHeld;
    if (
      input.pointer?.secondary &&
      this.targetIndex === null &&
      Number.isFinite(input.pointer.dx) &&
      Number.isFinite(input.pointer.dy)
    ) {
      this.cameraYaw -= input.pointer.dx * 0.004;
      this.cameraPitch = Math.max(
        0.18,
        Math.min(0.7, this.cameraPitch + input.pointer.dy * 0.003),
      );
    }
    let forward = Number(input.up) - Number(input.down);
    let sideways = Number(input.right) - Number(input.left);
    const length = Math.hypot(forward, sideways);
    if (length > 0) {
      forward /= length;
      sideways /= length;
    }
    const basis = this.targetIndex === null ? this.cameraYaw : p.facing;
    const dx = Math.sin(basis) * forward - Math.cos(basis) * sideways;
    const dz = Math.cos(basis) * forward + Math.sin(basis) * sideways;
    if (
      length > 0 &&
      p.roll === 0 &&
      p.playing === 0 &&
      this.targetIndex === null
    )
      p.facing = Math.atan2(dx, dz);
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
      p.charging = 0;
      this.audioCues.dash++;
    }
    this.specialHeld = input.special;
    if (input.jump && !this.jumpHeld && p.height <= 0 && p.playing === 0) {
      p.vy = 5.5;
      this.audioCues.jump++;
    }
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
      !this.attackHeld &&
      p.attackCooldown === 0 &&
      p.roll === 0 &&
      p.playing === 0
    ) {
      p.combo = p.comboTime > 0 ? (p.combo % 3) + 1 : 1;
      p.comboTime = 1.1;
      p.attack = 0.25;
      p.attackCooldown = 0.46;
      p.attackId++;
      this.audioCues.shot++;
      this.event('sword');
      this.sword();
    }
    if (input.attack && p.roll === 0 && p.playing === 0)
      p.charging = Math.min(1, p.charging + delta);
    if (!input.attack && this.attackHeld) {
      if (
        p.charging >= 0.65 &&
        this.magic >= 20 &&
        p.roll === 0 &&
        p.playing === 0
      ) {
        p.spin = 0.48;
        p.attack = 0.48;
        p.attackCooldown = 0.65;
        p.attackId++;
        this.magic -= 20;
        this.audioCues.ability++;
        this.event('sword');
        this.sword(true);
        this.say('회전베기! 주위의 적을 한 번에 공격합니다.');
      }
      p.charging = 0;
    }
    this.attackHeld = input.attack;
    if (input.interact && p.playing === 0) this.interact();
    this.interactHeld = input.interact;
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
          ? '데크 나무의 저주를 풀었습니다! 숲의 모험 완료.'
          : this.phase === 'lost'
            ? '숲이 다시 기다립니다. 재시작해서 도전하세요.'
            : objectiveFor(this.melodies, bossAlive),
      stats: [
        {
          label: '하트',
          value: `${'♥'.repeat(this.hearts)}${'♡'.repeat(5 - this.hearts)}`,
        },
        { label: '루피', value: this.rupees },
        { label: '선율', value: `${this.melodies} / 3` },
        {
          label: '수호자',
          value: bossAlive ? (this.gateOpen ? '깨어남' : '봉인') : '물리침',
        },
      ],
    };
  }
}

/** Normal controller input only. It aims, guards, attacks, walks and interacts. */
export function benchmarkOcarina(simulation: OcarinaSimulation): Input {
  const input = idleInput();
  if (simulation.phase !== 'playing') return input;
  if (simulation.playingSong !== null) {
    const note =
      MELODY_STONES[simulation.playingSong].notes[simulation.songCursor];
    input[note] = true;
    return input;
  }
  if (simulation.player.playing > 0) return input;
  const p = simulation.player;
  const nearby = simulation.enemies
    .filter((enemy) => enemy.alive && (!enemy.boss || simulation.gateOpen))
    .map((enemy) => ({ enemy, range: distance(p.x, p.z, enemy.x, enemy.z) }))
    .filter(({ range }) => range < 6)
    .sort((a, b) => a.range - b.range)[0];
  let target: { x: number; z: number };
  if (nearby) {
    target = nearby.enemy;
    input.attack = nearby.range < 3.4 && p.attackCooldown === 0;
    input.switch = true;
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
    const basis = nearby ? Math.atan2(dx, dz) : simulation.cameraYaw;
    const forward = Math.sin(basis) * dx + Math.cos(basis) * dz;
    const side = -Math.cos(basis) * dx + Math.sin(basis) * dz;
    input.up = forward > 0.15;
    input.down = forward < -0.15;
    input.right = side > 0.15;
    input.left = side < -0.15;
  }
  return input;
}
