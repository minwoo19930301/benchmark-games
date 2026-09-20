import { clamp, idleInput } from '../types.ts';
import type {
  Input,
  RetroSimulation,
  RetroSnapshot,
  SoundCue,
} from '../types.ts';

export type Move =
  | 'idle'
  | 'punch'
  | 'cross'
  | 'kick'
  | 'roundhouse'
  | 'lowKick'
  | 'sweep'
  | 'uppercut'
  | 'finisher';
export type HitLevel = 'high' | 'mid' | 'low';
export type Limb = 1 | 2 | 3 | 4;
export interface MoveData {
  name: string;
  limb: Limb;
  level: HitLevel;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
  stun: number;
  push: number;
  launch?: boolean;
  knockdown?: boolean;
}
// Timings are this small game's own tuning, in seconds; not claimed as original frame data.
export const moves: Record<Exclude<Move, 'idle'>, MoveData> = {
  punch: {
    name: 'LEFT JAB',
    limb: 1,
    level: 'high',
    startup: 10 / 60,
    active: 3 / 60,
    recovery: 16 / 60,
    damage: 5,
    reach: 2.28,
    stun: 0.23,
    push: 0.11,
  },
  cross: {
    name: 'RIGHT STRAIGHT',
    limb: 2,
    level: 'high',
    startup: 12 / 60,
    active: 3 / 60,
    recovery: 19 / 60,
    damage: 8,
    reach: 2.42,
    stun: 0.3,
    push: 0.18,
  },
  kick: {
    name: 'LEFT SIDE KICK',
    limb: 3,
    level: 'mid',
    startup: 16 / 60,
    active: 4 / 60,
    recovery: 27 / 60,
    damage: 12,
    reach: 3.2,
    stun: 0.35,
    push: 0.48,
  },
  roundhouse: {
    name: 'RIGHT ROUNDHOUSE',
    limb: 4,
    level: 'high',
    startup: 18 / 60,
    active: 4 / 60,
    recovery: 27 / 60,
    damage: 14,
    reach: 3.35,
    stun: 0.38,
    push: 0.65,
    knockdown: true,
  },
  lowKick: {
    name: 'LOW KICK',
    limb: 3,
    level: 'low',
    startup: 18 / 60,
    active: 4 / 60,
    recovery: 26 / 60,
    damage: 9,
    reach: 2.7,
    stun: 0.28,
    push: 0.2,
  },
  sweep: {
    name: 'SPINNING LOW KICK',
    limb: 4,
    level: 'low',
    startup: 25 / 60,
    active: 5 / 60,
    recovery: 35 / 60,
    damage: 16,
    reach: 2.8,
    stun: 0.4,
    push: 0.55,
    knockdown: true,
  },
  uppercut: {
    name: 'RISING UPPERCUT',
    limb: 2,
    level: 'mid',
    startup: 15 / 60,
    active: 4 / 60,
    recovery: 30 / 60,
    damage: 17,
    reach: 2.35,
    stun: 0.48,
    push: 0.15,
    launch: true,
  },
  finisher: {
    name: 'FLASH PUNCH COMBO',
    limb: 2,
    level: 'mid',
    startup: 12 / 60,
    active: 4 / 60,
    recovery: 29 / 60,
    damage: 12,
    reach: 2.55,
    stun: 0.4,
    push: 0.8,
    knockdown: true,
  },
};
export interface MartialArtist {
  x: number;
  z: number;
  y: number;
  vy: number;
  vx: number;
  facing: number;
  health: number;
  guard: boolean;
  crouch: boolean;
  stamina: number;
  cooldown: number;
  stun: number;
  blockStun: number;
  attack: number;
  attackTime: number;
  move: Move;
  tell: number;
  hitResolved: boolean;
  combo: number;
  comboDamage: number;
  comboTimer: number;
  downTime: number;
  getup: number;
  stepTime: number;
  stepDirection: number;
  dashTime: number;
  sequence: Limb[];
  sequenceTime: number;
  juggleHits: number;
  walk: number;
}
const artist = (x: number, facing: number): MartialArtist => ({
  x,
  z: 0,
  y: 0,
  vy: 0,
  vx: 0,
  facing,
  health: 100,
  guard: false,
  crouch: false,
  stamina: 1,
  cooldown: 0,
  stun: 0,
  blockStun: 0,
  attack: 0,
  attackTime: 0,
  move: 'idle',
  tell: 0,
  hitResolved: false,
  combo: 0,
  comboDamage: 0,
  comboTimer: 0,
  downTime: 0,
  getup: 0,
  stepTime: 0,
  stepDirection: 0,
  dashTime: 0,
  sequence: [],
  sequenceTime: 0,
  juggleHits: 0,
  walk: 0,
});

export class IronSimulation implements RetroSimulation {
  player = artist(-3, 1);
  opponent = artist(3, -1);
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  round = 1;
  playerRounds = 0;
  opponentRounds = 0;
  roundTime = 60;
  roundBreak = 0;
  intro = 1.2;
  flash = 0;
  hits = 0;
  blocks = 0;
  counterHits = 0;
  launches = 0;
  sidesteps = 0;
  notice = 'ROUND 1 · READY';
  announcement = 'READY';
  lastHit: {
    x: number;
    y: number;
    z: number;
    blocked: boolean;
    counter: boolean;
  } | null = null;
  audioCues: Partial<Record<SoundCue, number>> = {};
  private previous = idleInput();
  private lastTap = { left: -10, right: -10 };
  private botTimer = 0.8;
  private botMoves = 0;
  private hitNotice = 0;

  clearInput(): void {
    this.previous = idleInput();
  }
  private sound(cue: SoundCue): void {
    this.audioCues[cue] = (this.audioCues[cue] ?? 0) + 1;
  }
  step(dt: number, input: Input): void {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.hitNotice = Math.max(0, this.hitNotice - dt);
    if (this.roundBreak > 0) {
      this.roundBreak = Math.max(0, this.roundBreak - dt);
      if (this.roundBreak === 0) {
        this.player = artist(-3, 1);
        this.opponent = artist(3, -1);
        this.round++;
        this.roundTime = 60;
        this.intro = 1.2;
        this.botTimer = 0.8;
        this.announcement = 'READY';
        this.notice = `ROUND ${this.round} · READY`;
        this.previous = idleInput();
      }
      return;
    }
    if (this.intro > 0) {
      this.intro = Math.max(0, this.intro - dt);
      this.announcement = this.intro > 0.42 ? 'READY' : 'FIGHT';
      if (this.intro > 0) return;
      this.notice = 'FIGHT · J K U I / 1 2 3 4';
    }
    this.announcement = '';
    this.roundTime = Math.max(0, this.roundTime - dt);
    this.tick(this.player, dt);
    this.tick(this.opponent, dt);
    const p = this.player,
      o = this.opponent;
    if (!p.attack && !p.downTime && !p.y) p.facing = o.x >= p.x ? 1 : -1;
    if (!o.attack && !o.downTime && !o.y) o.facing = p.x >= o.x ? 1 : -1;
    this.control(input, dt);
    this.bot(dt);
    this.resolve(p, o);
    this.resolve(o, p);
    if (
      Math.abs(o.x - p.x) < 1.38 &&
      Math.abs(o.z - p.z) < 0.65 &&
      !p.y &&
      !o.y
    ) {
      const middle = (p.x + o.x) / 2;
      p.x = middle - p.facing * 0.69;
      o.x = middle + p.facing * 0.69;
    }
    p.x = clamp(p.x, -10, 10);
    o.x = clamp(o.x, -10, 10);
    this.previous = { ...input };
    if (o.health <= 0 || p.health <= 0) this.endRound(o.health <= 0);
    else if (this.roundTime <= 0) this.endRound(p.health >= o.health, true);
  }

  private tick(body: MartialArtist, dt: number): void {
    body.cooldown = Math.max(0, body.cooldown - dt);
    body.stun = Math.max(0, body.stun - dt);
    body.blockStun = Math.max(0, body.blockStun - dt);
    body.getup = Math.max(0, body.getup - dt);
    body.comboTimer = Math.max(0, body.comboTimer - dt);
    body.sequenceTime = Math.max(0, body.sequenceTime - dt);
    if (!body.comboTimer) {
      body.combo = 0;
      body.comboDamage = 0;
    }
    if (!body.sequenceTime) body.sequence = [];
    // This legacy field tracks guard impact only. Blocking never runs out.
    body.stamina = clamp(body.stamina + 0.15 * dt, 0, 1);
    body.walk = 0;
    if (body.y > 0 || body.vy > 0) {
      body.y += body.vy * dt;
      body.vy -= 16 * dt;
      body.x += body.vx * dt;
      if (body.y <= 0) {
        body.y = 0;
        body.vy = 0;
        body.vx = 0;
        body.downTime = 0.62;
        body.juggleHits = 0;
      }
    } else if (body.downTime > 0) {
      body.downTime = Math.max(0, body.downTime - dt);
      if (body.downTime === 0) body.getup = 0.3;
    }
    if (body.stepTime > 0) {
      body.stepTime = Math.max(0, body.stepTime - dt);
      body.z = clamp(body.z + body.stepDirection * 4.6 * dt, -2.7, 2.7);
    }
    body.dashTime = Math.max(0, body.dashTime - dt);
    if (body.attack > 0) {
      body.attackTime += dt;
      body.attack = Math.max(0, body.attack - dt);
      const data = moves[body.move as Exclude<Move, 'idle'>];
      body.tell = data ? Math.max(0, data.startup - body.attackTime) : 0;
      if (!body.attack) {
        body.move = 'idle';
        body.tell = 0;
      }
    }
  }

  private control(input: Input, dt: number): void {
    const p = this.player;
    const forward = p.facing > 0 ? input.right : input.left;
    const back = p.facing > 0 ? input.left : input.right;
    const free = !p.attack && p.stun <= 0 && !p.y && !p.downTime && !p.getup;
    p.crouch = input.down && !p.y && !p.downTime;
    p.guard = (free || p.blockStun > 0) && back && !p.stepTime;
    if (!free) return;
    for (const direction of ['left', 'right'] as const) {
      if (input[direction] && !this.previous[direction]) {
        if (this.time - this.lastTap[direction] < 0.27) {
          p.dashTime = 0.21;
          this.sound('dash');
        }
        this.lastTap[direction] = this.time;
      }
    }
    if (
      !p.stepTime &&
      ((!this.previous.up && input.up) || (!this.previous.jump && input.jump))
    ) {
      p.stepTime = 0.23;
      p.stepDirection = input.up ? -1 : 1;
      p.guard = false;
      this.sidesteps++;
      this.sound('dash');
    }
    const horizontal = Number(input.right) - Number(input.left);
    const speed = p.crouch
      ? 1.25
      : p.dashTime
        ? forward
          ? 8
          : 6.5
        : back
          ? 2.5
          : 4.2;
    if (!p.stepTime) {
      p.x += horizontal * speed * dt;
      p.walk = horizontal * speed;
    }
    const limb: Limb | null = input.attack
      ? 1
      : input.interact
        ? 2
        : input.special
          ? 3
          : input.ultimate
            ? 4
            : null;
    if (limb && p.cooldown <= 0 && !p.stepTime) {
      let move: Move =
        limb === 1
          ? 'punch'
          : limb === 2
            ? 'cross'
            : limb === 3
              ? 'kick'
              : 'roundhouse';
      if (input.down && limb === 2 && forward) move = 'uppercut';
      else if (input.down && limb >= 3) move = limb === 3 ? 'lowKick' : 'sweep';
      else if (limb === 2 && p.sequence.slice(-2).join('') === '11')
        move = 'finisher';
      this.begin(p, move);
    }
  }

  private begin(body: MartialArtist, move: Move): void {
    if (move === 'idle') return;
    const data = moves[move];
    body.move = move;
    body.attackTime = 0;
    body.attack = data.startup + data.active + data.recovery;
    body.cooldown = body.attack;
    body.hitResolved = false;
    body.guard = false;
    body.tell = data.startup;
    body.sequence.push(data.limb);
    body.sequence = body.sequence.slice(-3);
    body.sequenceTime = 1.15;
    this.sound('shot');
  }

  private bot(dt: number): void {
    const o = this.opponent,
      p = this.player;
    if (o.stun > 0 || o.attack || o.y || o.downTime || o.getup) {
      o.guard = false;
      return;
    }
    const dx = p.x - o.x,
      dz = p.z - o.z;
    o.crouch = false;
    // Deterministic guard windows can be opened by a low, a sidestep or waiting for recovery.
    o.guard = Math.abs(dx) < 3.4 && this.time % 6 > 4.4;
    if (Math.abs(dx) > 2.05 && !o.guard) {
      o.x += Math.sign(dx) * 2.15 * dt;
      o.walk = Math.sign(dx) * 2.15;
    }
    if (Math.abs(dz) > 0.14 && !o.guard) o.z += Math.sign(dz) * 1.15 * dt;
    this.botTimer -= dt;
    if (
      this.botTimer <= 0 &&
      !o.guard &&
      o.cooldown <= 0 &&
      Math.abs(dx) < 3 &&
      Math.abs(dz) < 0.9
    ) {
      const pattern: Exclude<Move, 'idle'>[] = [
        'roundhouse',
        'kick',
        'cross',
        'kick',
        'lowKick',
        'roundhouse',
        'sweep',
        'kick',
      ];
      this.begin(o, pattern[this.botMoves % pattern.length]);
      this.botMoves++;
      this.botTimer = 1.18 + (this.botMoves % 3) * 0.11;
    }
  }

  private resolve(attacker: MartialArtist, defender: MartialArtist): void {
    if (
      attacker.hitResolved ||
      !attacker.attack ||
      attacker.stun > 0 ||
      attacker.move === 'idle'
    )
      return;
    const data = moves[attacker.move];
    if (
      attacker.attackTime < data.startup ||
      attacker.attackTime > data.startup + data.active
    )
      return;
    if (
      (defender.x - attacker.x) * attacker.facing < 0 ||
      Math.abs(defender.x - attacker.x) > data.reach ||
      Math.abs(defender.z - attacker.z) > 0.62
    )
      return;
    if (defender.downTime > 0 || defender.getup > 0.1 || defender.y > 2.3)
      return;
    if (data.level === 'high' && defender.crouch && !defender.y) {
      attacker.hitResolved = true;
      return;
    }
    if (data.level === 'low' && defender.y > 0.35) return;
    attacker.hitResolved = true;
    const blocked =
      !defender.y &&
      defender.guard &&
      (defender.crouch ? data.level === 'low' : data.level !== 'low');
    const counter = !blocked && defender.attack > 0 && !defender.hitResolved;
    this.lastHit = {
      x: defender.x - attacker.facing * 0.35,
      y:
        defender.y +
        (data.level === 'high' ? 2.75 : data.level === 'mid' ? 1.75 : 0.5),
      z: defender.z,
      blocked,
      counter,
    };
    this.flash = 0.16;
    this.sound('hit');
    if (blocked) {
      defender.stun = 0.12;
      defender.blockStun = 0.12;
      defender.stamina = Math.max(0, defender.stamina - 0.14);
      defender.x += attacker.facing * 0.12;
      this.blocks++;
      this.notice = `${data.level.toUpperCase()} BLOCK`;
      this.hitNotice = 0.65;
      if (attacker === this.opponent) this.score += 40;
      return;
    }
    const air = defender.y > 0;
    const scale = air ? Math.max(0.32, 0.65 - defender.juggleHits * 0.12) : 1;
    const damage = Math.round(data.damage * (counter ? 1.25 : 1) * scale);
    defender.health = Math.max(0, defender.health - damage);
    defender.guard = false;
    defender.blockStun = 0;
    defender.stun = data.stun + (counter ? 0.12 : 0);
    defender.attack = 0;
    defender.tell = 0;
    defender.move = 'idle';
    defender.cooldown = 0;
    defender.x += attacker.facing * data.push;
    if ((data.launch && !air) || air) {
      defender.y = Math.max(0.08, defender.y);
      defender.vy = air ? Math.min(4.5, 4.5 - defender.juggleHits * 0.65) : 7.5;
      defender.vx = attacker.facing * (air ? 1.8 : 0.35);
      defender.juggleHits++;
      if (!air) {
        this.launches++;
        this.sound('ability');
      }
    } else if (data.knockdown) {
      defender.downTime = 0.72;
      defender.stun = 0;
    }
    if (counter) this.counterHits++;
    attacker.combo = attacker.comboTimer > 0 ? attacker.combo + 1 : 1;
    attacker.comboDamage =
      attacker.comboTimer > 0 ? attacker.comboDamage + damage : damage;
    attacker.comboTimer = 1.3;
    if (attacker === this.player) {
      this.hits++;
      this.score += damage * 25 + attacker.combo * 20;
    }
    this.notice = `${counter ? 'COUNTER HIT · ' : air ? 'JUGGLE · ' : ''}${data.name} · ${data.level.toUpperCase()}`;
    this.hitNotice = 0.9;
  }

  private endRound(won: boolean, timedOut = false): void {
    if (won) {
      this.playerRounds++;
      this.score += 1000;
    } else this.opponentRounds++;
    this.announcement = timedOut ? 'TIME UP' : 'K.O.';
    this.notice = `${this.announcement} · ${won ? 'JIN KAZAMA' : 'HWOARANG'} WINS`;
    this.sound('explosion');
    if (this.playerRounds === 2 || this.opponentRounds === 2)
      this.phase = this.playerRounds === 2 ? 'won' : 'lost';
    else this.roundBreak = 2;
  }

  snapshot(): RetroSnapshot {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress: clamp(
        (this.playerRounds +
          (this.roundBreak ? 0 : 1 - this.opponent.health / 100)) /
          2,
        0,
        1,
      ),
      objective: this.notice,
      stats: [
        { label: 'JIN', value: Math.ceil(this.player.health) },
        { label: 'HWOARANG', value: Math.ceil(this.opponent.health) },
        {
          label: 'ROUND',
          value: `${this.playerRounds} : ${this.opponentRounds}`,
        },
        { label: 'TIME', value: Math.ceil(this.roundTime) },
        { label: 'COMBO', value: `${this.player.combo} HIT` },
      ],
    };
  }
}

export function ironBenchmark(simulation: RetroSimulation): Input {
  const game = simulation as IronSimulation,
    input = idleInput();
  const { player: p, opponent: o } = game;
  if (game.roundBreak || game.intro) return input;
  const distance = Math.abs(o.x - p.x),
    forward = o.x > p.x ? 'right' : 'left',
    back = forward === 'right' ? 'left' : 'right';
  const threat = o.attack > 0 && !o.hitResolved && distance < 3.5;
  if (threat) {
    input[back] = true;
    input.down = o.move === 'lowKick' || o.move === 'sweep';
  } else {
    input[forward] = distance > 2.03;
    if (
      !p.attack &&
      !p.stun &&
      !o.downTime &&
      !o.getup &&
      game.time % 1.2 > 0.34
    ) {
      if (o.guard) {
        input.down = true;
        input.special = distance < 2.65;
      } else if (distance < 2.3) input.attack = true;
      else if (distance < 3.1) input.special = true;
    }
  }
  return input;
}
