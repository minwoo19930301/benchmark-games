import { clamp, idleInput } from '../types.ts';
import type {
  Input,
  RetroSimulation,
  RetroSnapshot,
  SoundCue,
} from '../types.ts';

/** Dream Land's solid island and three one-way platforms, measured in fighter units. */
export const platforms = [
  { x: 0, y: 0, width: 26 },
  { x: -6.3, y: 4, width: 5.3 },
  { x: 6.3, y: 4, width: 5.3 },
  { x: 0, y: 7.2, width: 5.1 },
];
export type Move =
  | 'jab'
  | 'tilt'
  | 'upTilt'
  | 'downTilt'
  | 'nair'
  | 'fair'
  | 'uair'
  | 'dair'
  | 'smash'
  | 'upSmash'
  | 'downSmash'
  | 'recovery'
  | 'cape'
  | 'tornado'
  | 'grab'
  | 'throw'
  | 'fireball';
export interface Brawler {
  character: 'mario' | 'kirby';
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  percent: number;
  stocks: number;
  grounded: boolean;
  jumps: number;
  shield: number;
  guarding: boolean;
  cooldown: number;
  specialCooldown: number;
  stun: number;
  invulnerable: number;
  attack: number;
  attackKind: Move;
  tell: number;
  recoveryUsed: boolean;
  charge: number;
  charging: boolean;
  roll: number;
  rollDirection: number;
  drop: number;
  ledge: number;
  ledgeCooldown: number;
  grabbing: number;
  grabbed: number;
  hitlag: number;
  combo: number;
  comboWindow: number;
  moveElapsed: number;
  moveHit: boolean;
  smashDirection: 'side' | 'up' | 'down';
  previous: Input;
}
const fighter = (
  character: Brawler['character'],
  x: number,
  facing: number,
): Brawler => ({
  character,
  x,
  y: 0,
  vx: 0,
  vy: 0,
  facing,
  percent: 0,
  stocks: 3,
  grounded: true,
  jumps: 0,
  shield: 1,
  guarding: false,
  cooldown: 0,
  specialCooldown: 0,
  stun: 0,
  invulnerable: 1.5,
  attack: 0,
  attackKind: 'jab',
  tell: 0,
  recoveryUsed: false,
  charge: 0,
  charging: false,
  roll: 0,
  rollDirection: 0,
  drop: 0,
  ledge: 0,
  ledgeCooldown: 0,
  grabbing: 0,
  grabbed: 0,
  hitlag: 0,
  combo: 0,
  comboWindow: 0,
  moveElapsed: 0,
  moveHit: false,
  smashDirection: 'side',
  previous: idleInput(),
});
export interface Fireball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  owner: Brawler;
}
export interface Impact {
  x: number;
  y: number;
  life: number;
  kind: 'hit' | 'shield' | 'ko' | 'jump';
  angle: number;
}
interface AttackData {
  damage: number;
  base: number;
  growth: number;
  angle: number;
  range: number;
  height: number;
  offset: number;
  startup: number;
  duration: number;
  cooldown: number;
}
const moves: Record<Move, AttackData> = {
  jab: {
    damage: 9,
    base: 4.4,
    growth: 0.075,
    angle: 0.43,
    range: 2.7,
    height: 2.1,
    offset: 1,
    startup: 0,
    duration: 0.21,
    cooldown: 0.31,
  },
  tilt: {
    damage: 11,
    base: 5.7,
    growth: 0.11,
    angle: 0.4,
    range: 3.1,
    height: 2,
    offset: 1,
    startup: 0.055,
    duration: 0.3,
    cooldown: 0.42,
  },
  upTilt: {
    damage: 8,
    base: 5.3,
    growth: 0.065,
    angle: 1.35,
    range: 2.1,
    height: 3.8,
    offset: 1.7,
    startup: 0.035,
    duration: 0.29,
    cooldown: 0.34,
  },
  downTilt: {
    damage: 8,
    base: 5,
    growth: 0.075,
    angle: 0.62,
    range: 3,
    height: 1.1,
    offset: 0.35,
    startup: 0.045,
    duration: 0.3,
    cooldown: 0.37,
  },
  nair: {
    damage: 10,
    base: 5,
    growth: 0.085,
    angle: 0.58,
    range: 2.8,
    height: 2.6,
    offset: 1,
    startup: 0.02,
    duration: 0.4,
    cooldown: 0.45,
  },
  fair: {
    damage: 13,
    base: 7,
    growth: 0.13,
    angle: 0.38,
    range: 3.2,
    height: 2.5,
    offset: 1.1,
    startup: 0.1,
    duration: 0.38,
    cooldown: 0.49,
  },
  uair: {
    damage: 10,
    base: 6,
    growth: 0.09,
    angle: 1.38,
    range: 2.4,
    height: 3.7,
    offset: 1.9,
    startup: 0.035,
    duration: 0.35,
    cooldown: 0.4,
  },
  dair: {
    damage: 11,
    base: 6,
    growth: 0.09,
    angle: -1.2,
    range: 2.2,
    height: 2.5,
    offset: -0.15,
    startup: 0.09,
    duration: 0.43,
    cooldown: 0.52,
  },
  smash: {
    damage: 18,
    base: 8,
    growth: 0.2,
    angle: 0.37,
    range: 3.8,
    height: 2.8,
    offset: 1.2,
    startup: 0.095,
    duration: 0.38,
    cooldown: 0.64,
  },
  upSmash: {
    damage: 17,
    base: 8,
    growth: 0.17,
    angle: 1.43,
    range: 2.7,
    height: 4,
    offset: 1.9,
    startup: 0.085,
    duration: 0.38,
    cooldown: 0.6,
  },
  downSmash: {
    damage: 16,
    base: 8,
    growth: 0.18,
    angle: 0.28,
    range: 3.8,
    height: 1.8,
    offset: 0.4,
    startup: 0.07,
    duration: 0.43,
    cooldown: 0.66,
  },
  recovery: {
    damage: 12,
    base: 7,
    growth: 0.07,
    angle: 1.25,
    range: 2.2,
    height: 3.4,
    offset: 1.4,
    startup: 0,
    duration: 0.54,
    cooldown: 0.62,
  },
  cape: {
    damage: 8,
    base: 3,
    growth: 0.035,
    angle: 0.25,
    range: 3,
    height: 3,
    offset: 1.2,
    startup: 0.075,
    duration: 0.4,
    cooldown: 0.62,
  },
  tornado: {
    damage: 14,
    base: 6,
    growth: 0.11,
    angle: 1.2,
    range: 3,
    height: 3,
    offset: 1,
    startup: 0.05,
    duration: 0.63,
    cooldown: 0.85,
  },
  grab: {
    damage: 0,
    base: 0,
    growth: 0,
    angle: 0,
    range: 2.3,
    height: 2.3,
    offset: 1,
    startup: 0.05,
    duration: 0.28,
    cooldown: 0.57,
  },
  throw: {
    damage: 10,
    base: 9,
    growth: 0.14,
    angle: 0.55,
    range: 3,
    height: 3,
    offset: 1,
    startup: 0,
    duration: 0.35,
    cooldown: 0.47,
  },
  fireball: {
    damage: 6,
    base: 3,
    growth: 0.03,
    angle: 0.35,
    range: 0,
    height: 0,
    offset: 1,
    startup: 0,
    duration: 0.34,
    cooldown: 0.5,
  },
};

export class SmashSimulation implements RetroSimulation {
  player = fighter('mario', -5, 1);
  opponent = fighter('kirby', 5, -1);
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  hits = 0;
  blocked = 0;
  flash = 0;
  notice = '3 STOCK · MARIO vs KIRBY · DREAM LAND';
  fireballs: Fireball[] = [];
  impacts: Impact[] = [];
  audioCues: Partial<Record<SoundCue, number>> = {};
  private tick = 0;
  private cue(cue: SoundCue): void {
    this.audioCues[cue] = (this.audioCues[cue] ?? 0) + 1;
  }

  clearInput(): void {
    for (const body of [this.player, this.opponent]) {
      body.previous = idleInput();
      body.charging = false;
      body.charge = 0;
      body.guarding = false;
    }
  }

  step(dt: number, input: Input): void {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.tick++;
    this.flash = Math.max(0, this.flash - dt);
    this.impacts = this.impacts.filter((effect) => (effect.life -= dt) > 0);
    const botInput = this.botInput();
    this.tickFighter(this.player, dt);
    this.tickFighter(this.opponent, dt);
    this.control(this.player, this.opponent, input, dt);
    this.control(this.opponent, this.player, botInput, dt);
    this.resolveMove(this.player, this.opponent, dt);
    this.resolveMove(this.opponent, this.player, dt);
    this.integrate(this.player, input, dt);
    this.integrate(this.opponent, botInput, dt);
    this.projectiles(dt);
    this.ringOut(this.player, false);
    this.ringOut(this.opponent, true);
    this.player.previous = { ...input };
    this.opponent.previous = { ...botInput };
    if (this.time >= 180 && this.phase === 'playing') {
      this.phase =
        this.player.stocks > this.opponent.stocks ||
        (this.player.stocks === this.opponent.stocks &&
          this.player.percent < this.opponent.percent)
          ? 'won'
          : 'lost';
      this.notice = 'TIME! · Stocks, then damage decide the match';
    }
  }

  private tickFighter(body: Brawler, dt: number): void {
    for (const key of [
      'cooldown',
      'specialCooldown',
      'stun',
      'invulnerable',
      'roll',
      'drop',
      'ledgeCooldown',
      'comboWindow',
    ] as const)
      body[key] = Math.max(0, body[key] - dt);
    if (body.hitlag > 0) body.hitlag = Math.max(0, body.hitlag - dt);
    if (!body.comboWindow) body.combo = 0;
    if (body.grabbed > 0) body.grabbed = Math.max(0, body.grabbed - dt);
    if (body.grabbing > 0) body.grabbing = Math.max(0, body.grabbing - dt);
    if (body.tell > 0) body.tell = Math.max(0, body.tell - dt);
  }

  private control(
    body: Brawler,
    target: Brawler,
    input: Input,
    dt: number,
  ): void {
    const direction = Number(input.right) - Number(input.left);
    const jump = input.jump && !body.previous.jump;
    const special = input.special && !body.previous.special;
    const grab = input.interact && !body.previous.interact;
    if (body.hitlag > 0 || body.grabbed > 0) return;
    if (body.ledge) {
      body.vx = 0;
      body.vy = 0;
      if (input.down) {
        body.ledge = 0;
        body.ledgeCooldown = 0.7;
        body.vy = -2;
      } else if (jump || input.attack || direction === -body.ledge) {
        body.x -= body.ledge * 1.15;
        body.y = 0.06;
        body.ledge = 0;
        body.ledgeCooldown = 0.8;
        body.grounded = false;
        body.vy = jump ? 13 : 3;
        body.invulnerable = 0.25;
      }
      return;
    }
    if (body.stun > 0) {
      body.guarding = false;
      body.charging = false;
      // Directional influence changes the launch trajectory, without cancelling knockback.
      body.vx += direction * 5.5 * dt;
      if (input.up) body.vy += 3 * dt;
      if (input.down) body.vy -= 3 * dt;
      return;
    }
    if (body.grabbing > 0) {
      target.x = body.x + body.facing * 1.5;
      target.y = body.y;
      target.vx = target.vy = 0;
      if (direction || input.up || input.down || body.grabbing < 0.05) {
        const facing = direction || body.facing;
        body.facing = facing;
        target.grabbed = 0;
        body.grabbing = 0;
        this.startMove(body, 'throw');
        this.damage(
          body,
          target,
          moves.throw,
          input.up ? 1.4 : input.down ? 0.95 : 0.5,
          facing,
        );
      } else if (input.attack && !body.previous.attack) {
        target.percent += 2;
        this.cue('hit');
      }
      return;
    }
    if (body.roll > 0) {
      body.vx = body.rollDirection * 17;
      body.guarding = false;
      return;
    }
    const canAct = body.cooldown <= 0;
    body.guarding = input.guard && body.grounded && body.shield > 0 && canAct;
    body.shield = clamp(
      body.shield + (body.guarding ? -0.16 : 0.17) * dt,
      0,
      1,
    );
    if (body.guarding && body.shield === 0) {
      body.guarding = false;
      body.stun = 2.2;
      this.notice = 'SHIELD BREAK!';
      this.cue('explosion');
    }
    if (body.guarding && (grab || input.attack)) {
      body.guarding = false;
      this.startMove(body, 'grab');
    } else if (
      body.guarding &&
      direction &&
      !(body.previous.left || body.previous.right)
    ) {
      body.roll = 0.3;
      body.rollDirection = direction;
      body.invulnerable = 0.24;
      body.cooldown = 0.42;
      body.shield = Math.max(0, body.shield - 0.06);
      this.cue('dash');
    }
    if (body.guarding) {
      body.vx *= Math.exp(-20 * dt);
      return;
    }
    if (body.charging) {
      body.vx *= Math.exp(-20 * dt);
      body.charge = Math.min(1.2, body.charge + dt);
      if (!input.ultimate || body.charge >= 1.2) {
        body.charging = false;
        this.startMove(
          body,
          body.smashDirection === 'up'
            ? 'upSmash'
            : body.smashDirection === 'down'
              ? 'downSmash'
              : 'smash',
        );
      }
      return;
    }
    const maxSpeed = body.character === 'mario' ? 9.8 : 8.1;
    const acceleration = body.grounded ? 68 : 20;
    const mobility = body.attack > 0 && body.grounded ? 0.18 : 1;
    body.vx += clamp(
      direction * maxSpeed * mobility - body.vx,
      -acceleration * dt,
      acceleration * dt,
    );
    if (direction && body.attack <= 0) body.facing = direction;
    if (input.down && jump && body.grounded && body.y > 0.1) {
      body.grounded = false;
      body.drop = 0.24;
      body.y -= 0.12;
      body.vy = -4;
    } else if (
      jump &&
      body.jumps < (body.character === 'kirby' ? 6 : 2) &&
      !body.recoveryUsed
    ) {
      body.vy =
        body.jumps === 0 ? 14.5 : body.character === 'kirby' ? 10.5 : 12.5;
      body.grounded = false;
      body.jumps++;
      this.cue('jump');
      this.impacts.push({
        x: body.x,
        y: body.y,
        life: 0.3,
        kind: 'jump',
        angle: 0,
      });
    } else if (
      !input.jump &&
      body.previous.jump &&
      body.vy > 7 &&
      !body.recoveryUsed
    )
      body.vy *= 0.55;
    if (input.down && !body.grounded && body.vy < 0)
      body.vy = Math.min(body.vy, -19);
    if (!canAct || body.recoveryUsed) return;
    if (grab) {
      this.startMove(body, 'grab');
      return;
    }
    if (input.ultimate && body.grounded) {
      body.charging = true;
      body.charge = 0;
      body.smashDirection = input.up ? 'up' : input.down ? 'down' : 'side';
      this.cue('ability');
      return;
    }
    if (special && body.specialCooldown <= 0) {
      if (input.up || !body.grounded) this.recover(body);
      else if (input.down) {
        this.startMove(body, 'tornado');
        body.specialCooldown = 1;
      } else if (direction) {
        this.startMove(body, 'cape');
        body.specialCooldown = 0.7;
      } else {
        this.startMove(body, 'fireball');
        body.specialCooldown = 0.62;
        this.fireballs.push({
          x: body.x + body.facing * 1.2,
          y: body.y + 1.1,
          vx: body.facing * 12,
          vy: 2,
          life: 2.3,
          owner: body,
        });
        this.cue('shot');
      }
      return;
    }
    if (input.attack) {
      const move = body.grounded
        ? input.up
          ? 'upTilt'
          : input.down
            ? 'downTilt'
            : direction
              ? 'tilt'
              : 'jab'
        : input.up
          ? 'uair'
          : input.down
            ? 'dair'
            : direction
              ? 'fair'
              : 'nair';
      this.startMove(body, move);
    }
  }

  private recover(body: Brawler): void {
    body.recoveryUsed = true;
    body.ledge = 0;
    body.vy = body.character === 'mario' ? 17 : 19;
    body.vx = (Math.abs(body.x) > 10 ? -Math.sign(body.x) : body.facing) * 7;
    body.invulnerable = 0.09;
    body.stun = 0;
    this.startMove(body, 'recovery');
    body.specialCooldown = 1.1;
    this.cue('ability');
    this.notice =
      body.character === 'mario' ? 'SUPER JUMP PUNCH!' : 'FINAL CUTTER!';
  }

  private startMove(body: Brawler, move: Move): void {
    body.attackKind = move;
    body.attack = moves[move].duration;
    body.moveElapsed = 0;
    body.moveHit = false;
    body.cooldown = moves[move].cooldown;
    if (move === 'jab') {
      body.combo = (body.combo % 3) + 1;
      body.comboWindow = 0.6;
    }
    if (!move.toLowerCase().includes('smash')) body.charge = 0;
  }

  private resolveMove(body: Brawler, target: Brawler, dt: number): void {
    if (body.attack <= 0 || body.hitlag > 0) return;
    body.attack = Math.max(0, body.attack - dt);
    body.moveElapsed += dt;
    const data = moves[body.attackKind];
    if (
      body.moveHit ||
      body.moveElapsed < data.startup ||
      body.grabbed > 0 ||
      body.stun > 0
    )
      return;
    const dx = target.x - body.x;
    const bothSides = [
      'nair',
      'upTilt',
      'upSmash',
      'downSmash',
      'tornado',
      'uair',
      'dair',
    ].includes(body.attackKind);
    if (
      (!bothSides && dx * body.facing < -0.55) ||
      Math.abs(dx) > data.range ||
      Math.abs(
        target.y +
          (target.character === 'kirby' ? 0.8 : 1.2) -
          (body.y + data.offset),
      ) >
        data.height / 2 + 0.65 ||
      target.invulnerable > 0
    )
      return;
    if (body.attackKind === 'fireball' || body.attackKind === 'throw') return;
    body.moveHit = true;
    if (body.attackKind === 'grab') {
      body.grabbing = 0.8;
      target.grabbed = 0.85;
      target.guarding = false;
      target.charging = false;
      target.attack = 0;
      this.notice = 'GRAB · Direction to throw';
      this.cue('hit');
      return;
    }
    if (target.guarding) {
      target.shield = Math.max(0, target.shield - data.damage * 0.017);
      target.vx += body.facing * 2.4;
      body.hitlag = target.hitlag = 0.065;
      this.blocked++;
      this.notice = 'SHIELD';
      this.cue('hit');
      this.impacts.push({
        x: target.x,
        y: target.y + 1.3,
        kind: 'shield',
        life: 0.22,
        angle: 0,
      });
      if (target.shield <= 0) {
        target.stun = 2.2;
        target.guarding = false;
        this.notice = 'SHIELD BREAK!';
      }
      return;
    }
    this.damage(
      body,
      target,
      data,
      data.angle,
      bothSides ? Math.sign(dx) || body.facing : body.facing,
    );
    if (body.attackKind === 'cape') target.facing *= -1;
  }

  private damage(
    attacker: Brawler,
    defender: Brawler,
    data: AttackData,
    angle: number,
    direction: number,
  ): void {
    const chargedSmash =
      data === moves.smash ||
      data === moves.upSmash ||
      data === moves.downSmash;
    const charge = 1 + (chargedSmash ? attacker.charge * 0.35 : 0);
    const damage = Math.round(data.damage * charge);
    defender.percent += damage;
    const weight = defender.character === 'kirby' ? 0.87 : 1;
    const force =
      ((data.base + defender.percent * data.growth) * charge) / weight;
    defender.vx = direction * Math.cos(angle) * force;
    defender.vy = Math.sin(angle) * force + 2;
    defender.grounded = false;
    defender.ledge = 0;
    defender.stun = clamp(0.13 + force * 0.012, 0.18, 0.85);
    defender.invulnerable = 0.13;
    defender.guarding = false;
    defender.tell = 0;
    defender.attack = 0;
    defender.charging = false;
    defender.grabbing = 0;
    defender.hitlag = attacker.hitlag = Math.min(0.12, 0.035 + damage * 0.0024);
    this.flash = 0.1;
    this.cue('hit');
    this.impacts.push({
      x: defender.x,
      y: defender.y + 1,
      life: 0.26,
      kind: 'hit',
      angle: direction * angle,
    });
    this.notice = `${attacker.character.toUpperCase()} · ${attacker.attackKind.toUpperCase()} · ${damage}%`;
    if (attacker === this.player) {
      this.hits++;
      this.score += damage * 20;
    }
  }

  private integrate(body: Brawler, input: Input, dt: number): void {
    if (body.hitlag > 0 || body.ledge || body.grabbed > 0) return;
    const previousY = body.y;
    body.x += body.vx * dt;
    body.vy = Math.max(
      -25,
      body.vy - (body.character === 'kirby' ? 23 : 28) * dt,
    );
    body.y += body.vy * dt;
    body.grounded = false;
    if (body.vy <= 0) {
      for (let i = platforms.length - 1; i >= 0; i--) {
        const platform = platforms[i];
        if (
          (i === 0 || !body.drop) &&
          Math.abs(body.x - platform.x) <= platform.width / 2 &&
          previousY >= platform.y - 0.01 &&
          body.y <= platform.y
        ) {
          body.y = platform.y;
          body.vy = 0;
          body.grounded = true;
          body.jumps = 0;
          body.recoveryUsed = false;
          break;
        }
      }
      if (
        !body.grounded &&
        body.stun <= 0 &&
        !body.ledgeCooldown &&
        !input.down &&
        Math.abs(Math.abs(body.x) - 13) < 0.65 &&
        body.y > -2 &&
        body.y < 0.15
      ) {
        body.ledge = Math.sign(body.x);
        body.x = body.ledge * 13.25;
        body.y = -1.5;
        body.vx = body.vy = 0;
        body.jumps = 0;
        body.recoveryUsed = false;
        body.invulnerable = 0.7;
        this.notice = 'LEDGE GRAB · Jump or move inward';
      }
    }
    if (body.grounded && body.stun > 0) body.vx *= Math.exp(-3 * dt);
  }

  private projectiles(dt: number): void {
    this.fireballs = this.fireballs.filter((ball) => {
      ball.life -= dt;
      ball.x += ball.vx * dt;
      ball.vy -= 18 * dt;
      ball.y += ball.vy * dt;
      if (Math.abs(ball.x) < 13 && ball.y < 0.3 && ball.vy < 0) {
        ball.y = 0.3;
        ball.vy = 6;
      }
      const target = ball.owner === this.player ? this.opponent : this.player;
      if (
        Math.abs(ball.x - target.x) < 1.1 &&
        Math.abs(ball.y - target.y - 1) < 1.2 &&
        target.invulnerable <= 0
      ) {
        if (target.attackKind === 'cape' && target.attack > 0) {
          ball.owner = target;
          ball.vx *= -1;
          ball.x += Math.sign(ball.vx) * 1.5;
        } else if (target.guarding) {
          target.shield = Math.max(0, target.shield - 0.08);
          this.blocked++;
          return false;
        } else {
          this.damage(
            ball.owner,
            target,
            { ...moves.fireball, range: 1 },
            0.35,
            Math.sign(ball.vx),
          );
          return false;
        }
      }
      return ball.life > 0 && ball.y > -8 && Math.abs(ball.x) < 25;
    });
  }

  private botInput(): Input {
    const bot = this.opponent,
      p = this.player,
      input = idleInput();
    const dx = p.x - bot.x,
      dy = p.y - bot.y;
    if (bot.ledge) {
      input.jump = this.tick % 30 < 3;
      input.left = bot.x > 0;
      input.right = bot.x < 0;
      return input;
    }
    const offstage = Math.abs(bot.x) > 12.6 || bot.y < -0.5;
    if (offstage) {
      input.left = bot.x > 0;
      input.right = bot.x < 0;
      input.jump = bot.vy < -1 && bot.jumps < 6 && this.tick % 9 < 3;
      input.special = bot.jumps >= 6 && bot.vy < -2 && !bot.recoveryUsed;
      input.up = input.special;
      return input;
    }
    input.left = dx < -2.25;
    input.right = dx > 2.25;
    if (Math.abs(dx) < 3.5) bot.facing = Math.sign(dx) || bot.facing;
    const cycle = this.time % 4.4;
    input.guard =
      p.attack > 0.08 && Math.abs(dx) < 3.5 && cycle > 3.55 && bot.grounded;
    input.jump = dy > 2.2 && bot.grounded && this.tick % 30 < 6;
    if (dy < -2 && bot.grounded && bot.y > 0.1) {
      input.down = true;
      input.jump = this.tick % 12 < 4;
    }
    if (
      Math.abs(dx) < 3 &&
      Math.abs(dy) < 2.8 &&
      cycle < 3.3 &&
      bot.cooldown <= 0 &&
      this.tick % 22 < 6
    ) {
      input.attack = true;
      input.up = dy > 1.8;
      if (bot.grounded && p.percent > 70 && cycle < 0.65) {
        input.attack = false;
        input.ultimate = true;
      }
    }
    if (bot.charging) input.ultimate = bot.charge < 0.32;
    if (bot.grabbing) {
      input.left = dx < 0;
      input.right = dx >= 0;
    }
    if (p.guarding && Math.abs(dx) < 2.1 && cycle < 1) input.interact = true;
    bot.tell = bot.cooldown <= 0.2 && Math.abs(dx) < 3 ? 0.18 : 0;
    return input;
  }

  private ringOut(body: Brawler, opponent: boolean): void {
    if (Math.abs(body.x) < 24 && body.y > -13 && body.y < 30) return;
    body.stocks--;
    this.flash = 0.45;
    this.cue('explosion');
    this.impacts.push({
      x: clamp(body.x, -21, 21),
      y: clamp(body.y, -8, 23),
      life: 0.7,
      kind: 'ko',
      angle: Math.atan2(body.y, body.x),
    });
    if (body.stocks <= 0) {
      this.phase = opponent ? 'won' : 'lost';
      this.notice = 'GAME!';
      if (opponent) this.score += 3000;
      return;
    }
    const stocks = body.stocks;
    Object.assign(
      body,
      fighter(body.character, opponent ? 4 : -4, opponent ? -1 : 1),
      { stocks, y: 10, grounded: false, invulnerable: 2.2 },
    );
    this.notice = `${body.character.toUpperCase()} · ${stocks} STOCKS`;
    if (opponent) this.score += 1000;
  }

  snapshot(): RetroSnapshot {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress: (3 - this.opponent.stocks) / 3,
      objective: this.notice,
      stats: [
        {
          label: 'MARIO',
          value: `${Math.round(this.player.percent)}% · ${this.player.stocks} stocks`,
        },
        {
          label: 'KIRBY',
          value: `${Math.round(this.opponent.percent)}% · ${this.opponent.stocks} stocks`,
        },
        { label: 'TIME', value: `${Math.max(0, 180 - this.time).toFixed(0)}s` },
        { label: 'HITS', value: this.hits },
      ],
    };
  }
}

/** A controller using the same movement, attacks, charge/release and recovery as the player. */
export function smashBenchmark(simulation: RetroSimulation): Input {
  const game = simulation as SmashSimulation,
    { player: p, opponent: o } = game;
  const input = idleInput();
  const dx = o.x - p.x,
    dy = o.y - p.y;
  if (p.ledge) {
    input.left = p.x > 0;
    input.right = p.x < 0;
    input.jump = true;
    return input;
  }
  const offstage = Math.abs(p.x) > 12.5 || p.y < -0.5;
  if (offstage) {
    input.left = p.x > 0;
    input.right = p.x < 0;
    input.jump =
      p.jumps < 2 && p.vy < -1 && Math.floor(game.time * 15) % 2 === 0;
    input.special = p.jumps >= 2 && p.vy < -1 && !p.recoveryUsed;
    input.up = input.special;
    return input;
  }
  if (p.charging) {
    input.ultimate = p.charge < 0.2;
    return input;
  }
  if (p.grabbing) {
    input.left = dx < 0;
    input.right = dx >= 0;
    return input;
  }
  input.left = dx < -2.35 && Math.abs(p.x) < 12;
  input.right = dx > 2.35 && Math.abs(p.x) < 12;
  if (Math.abs(p.x) >= 12) {
    input.left = p.x > 0;
    input.right = p.x < 0;
  }
  if (o.invulnerable > 0.1) {
    input.left = p.x > -3;
    input.right = p.x < -4;
    return input;
  }
  input.jump = p.grounded && o.grounded && dy > 2.4 && Math.abs(dx) < 6;
  if (dy < -2 && p.grounded && p.y > 0.1) {
    input.down = true;
    input.jump = Math.floor(game.time * 10) % 2 === 0;
  }
  if (Math.abs(dx) < 3.25 && Math.abs(dy) < 2.6) {
    input.left = dx < -0.2 && p.facing > 0;
    input.right = dx > 0.2 && p.facing < 0;
    input.attack = !p.grounded || o.percent < 42;
    input.ultimate = p.grounded && !input.attack;
    input.up = dy > 1.7;
    if (o.guarding && Math.abs(dx) < 2.2) {
      input.interact = true;
      input.ultimate = input.attack = false;
    }
  }
  return input;
}
