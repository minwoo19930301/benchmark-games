import { clamp, idleInput } from '../types.ts';
import type { Input, RetroSimulation, RetroSnapshot } from '../types.ts';

export const platforms = [
  { x: 0, y: 0, width: 26 },
  { x: -7, y: 4.1, width: 5 },
  { x: 7, y: 5.3, width: 5 },
];
export interface Brawler {
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
  attackKind: 'jab' | 'parcel';
  tell: number;
  recoveryUsed: boolean;
}
const fighter = (x: number, facing: number): Brawler => ({
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
  invulnerable: 1,
  attack: 0,
  attackKind: 'jab',
  tell: 0,
  recoveryUsed: false,
});

export class SmashSimulation implements RetroSimulation {
  player = fighter(-5, 1);
  opponent = fighter(5, -1);
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  hits = 0;
  blocked = 0;
  flash = 0;
  notice = '옥상 택배 결투 · 상대를 3번 밀어내세요';
  private jumpHeld = false;
  private specialHeld = false;
  private botCycle = 0;

  step(dt: number, input: Input): void {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    const jump = input.jump && !this.jumpHeld;
    const special = input.special && !this.specialHeld;
    this.jumpHeld = input.jump;
    this.specialHeld = input.special;
    this.tickFighter(this.player, dt);
    this.tickFighter(this.opponent, dt);
    this.control(
      this.player,
      Number(input.right) - Number(input.left),
      jump,
      input.guard,
      dt,
    );
    if (this.player.stun <= 0 && !this.player.guarding) {
      if (
        input.special &&
        this.player.grounded &&
        this.player.specialCooldown <= 0
      )
        this.strike(this.player, this.opponent, true);
      else if (input.attack && this.player.cooldown <= 0)
        this.strike(this.player, this.opponent, false);
      if (special && !this.player.grounded && !this.player.recoveryUsed)
        this.recover(this.player);
    }
    this.bot(dt);
    this.integrate(this.player, dt);
    this.integrate(this.opponent, dt);
    this.ringOut(this.player, false);
    this.ringOut(this.opponent, true);
    if (this.time >= 120 && this.phase === 'playing') {
      this.phase = 'lost';
      this.notice = '야간 배송 마감! 다시 도전하세요';
    }
  }

  private tickFighter(body: Brawler, dt: number): void {
    body.cooldown = Math.max(0, body.cooldown - dt);
    body.specialCooldown = Math.max(0, body.specialCooldown - dt);
    body.stun = Math.max(0, body.stun - dt);
    body.invulnerable = Math.max(0, body.invulnerable - dt);
    body.attack = Math.max(0, body.attack - dt);
  }

  private control(
    body: Brawler,
    direction: number,
    jump: boolean,
    guard: boolean,
    dt: number,
  ): void {
    body.guarding =
      guard && body.grounded && body.stun <= 0 && body.shield > 0.04;
    body.shield = clamp(
      body.shield + (body.guarding ? -0.26 : 0.22) * dt,
      0,
      1,
    );
    if (body.stun <= 0) {
      const target = direction * (body.guarding ? 2.5 : 9);
      const acceleration = body.grounded ? 48 : 18;
      body.vx += clamp(target - body.vx, -acceleration * dt, acceleration * dt);
      if (direction) body.facing = direction;
      if (jump && body.jumps < 2 && !body.guarding) {
        body.vy = body.jumps === 0 ? 13 : 11;
        body.grounded = false;
        body.jumps += 1;
      }
    }
  }

  private recover(body: Brawler): void {
    body.recoveryUsed = true;
    body.vy = 15;
    body.vx = (Math.abs(body.x) > 10 ? -Math.sign(body.x) : body.facing) * 9;
    body.stun = 0;
    body.attack = 0.4;
    body.attackKind = 'parcel';
    body.specialCooldown = 1.2;
    this.notice = '우산 복귀! 발판으로 돌아오세요';
  }

  private bot(dt: number): void {
    const bot = this.opponent;
    this.botCycle += dt;
    const delta = this.player.x - bot.x;
    const needsRecovery = !bot.grounded && (Math.abs(bot.x) > 12 || bot.y < -1);
    const direction = needsRecovery
      ? -Math.sign(bot.x)
      : Math.abs(delta) > 2.1
        ? Math.sign(delta)
        : 0;
    const guarding = this.botCycle % 5.5 > 4.8 && Math.abs(delta) < 4;
    const jump =
      (bot.grounded && this.player.y > bot.y + 2.5) ||
      (needsRecovery && bot.jumps < 2 && bot.vy < 0);
    this.control(bot, direction, jump, guarding, dt);
    if (needsRecovery && bot.jumps >= 2 && !bot.recoveryUsed && bot.vy < -2)
      this.recover(bot);
    if (bot.tell > 0) {
      bot.tell = Math.max(0, bot.tell - dt);
      if (bot.tell === 0 && bot.stun <= 0) this.strike(bot, this.player, false);
    } else if (
      bot.cooldown <= 0 &&
      bot.stun <= 0 &&
      !bot.guarding &&
      Math.abs(delta) < 3.5 &&
      Math.abs(bot.y - this.player.y) < 2.5
    ) {
      bot.facing = Math.sign(delta) || -1;
      bot.tell = 0.3;
      bot.cooldown = 1.45;
    }
  }

  private strike(attacker: Brawler, defender: Brawler, heavy: boolean): void {
    attacker.attack = heavy ? 0.36 : 0.22;
    attacker.attackKind = heavy ? 'parcel' : 'jab';
    attacker.cooldown = attacker === this.opponent ? 1.45 : heavy ? 0.72 : 0.4;
    if (heavy) attacker.specialCooldown = 1.3;
    const distance = (defender.x - attacker.x) * attacker.facing;
    if (
      distance < -0.6 ||
      distance > (heavy ? 4.1 : 3.1) ||
      Math.abs(defender.y - attacker.y) > 2.5 ||
      defender.invulnerable > 0
    )
      return;
    if (
      defender.guarding &&
      defender.facing !== attacker.facing &&
      defender.shield > 0.05
    ) {
      defender.shield = Math.max(0, defender.shield - (heavy ? 0.35 : 0.16));
      defender.vx += attacker.facing * 2;
      this.blocked += 1;
      this.notice = '방패로 막았다 · 가드 게이지에 주의';
      return;
    }
    const damage = heavy ? 16 : 9;
    defender.percent += damage;
    const force = (heavy ? 9 : 5) + defender.percent * (heavy ? 0.17 : 0.12);
    defender.vx = attacker.facing * force;
    defender.vy = 4.5 + force * 0.31;
    defender.grounded = false;
    defender.stun = heavy ? 0.42 : 0.26;
    defender.invulnerable = 0.14;
    defender.guarding = false;
    defender.tell = 0;
    this.flash = 0.12;
    this.notice = heavy
      ? '특급 배송! 누적 피해가 높을수록 멀리 날아갑니다'
      : '택배 펀치 적중!';
    if (attacker === this.player) {
      this.hits += 1;
      this.score += damage * 20;
    }
  }

  private integrate(body: Brawler, dt: number): void {
    const previousY = body.y;
    body.x += body.vx * dt;
    body.vy -= 28 * dt;
    body.y += body.vy * dt;
    body.grounded = false;
    if (body.vy <= 0) {
      for (const platform of [...platforms].sort((a, b) => b.y - a.y)) {
        if (
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
    }
  }

  private ringOut(body: Brawler, isOpponent: boolean): void {
    if (Math.abs(body.x) < 24 && body.y > -13 && body.y < 32) return;
    body.stocks -= 1;
    this.flash = 0.55;
    if (body.stocks <= 0) {
      this.phase = isOpponent ? 'won' : 'lost';
      this.notice = isOpponent
        ? '배송 완료! 옥상의 왕이 되었습니다'
        : '퇴근길 낙하… 다시 도전하세요';
      if (isOpponent) this.score += 3000;
      return;
    }
    const stocks = body.stocks;
    Object.assign(body, fighter(isOpponent ? 4 : -4, isOpponent ? -1 : 1), {
      stocks,
      y: 7,
      grounded: false,
      invulnerable: 3,
    });
    this.notice = `${isOpponent ? '상대' : '내'} 남은 목숨 ${stocks}`;
    if (isOpponent) this.score += 1000;
  }

  snapshot(): RetroSnapshot {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress: (3 - this.opponent.stocks) / 3,
      objective: this.notice,
      stats: [
        { label: '내 목숨', value: this.player.stocks },
        { label: '내 피해', value: `${Math.round(this.player.percent)}%` },
        { label: '상대 목숨', value: this.opponent.stocks },
        { label: '상대 피해', value: `${Math.round(this.opponent.percent)}%` },
      ],
    };
  }
}

export function smashBenchmark(simulation: RetroSimulation): Input {
  const game = simulation as SmashSimulation;
  const { player, opponent } = game;
  const input = idleInput();
  const dx = opponent.x - player.x;
  input.right = dx > 1.6;
  input.left = dx < -1.6;
  input.attack = Math.abs(dx) < 3.1;
  input.special = player.grounded && Math.abs(dx) < 4 && opponent.percent > 30;
  input.guard = opponent.tell > 0 && opponent.tell < 0.16 && Math.abs(dx) < 3.5;
  input.jump =
    (player.grounded && opponent.y > player.y + 2) ||
    (!player.grounded &&
      Math.abs(player.x) > 12 &&
      player.jumps < 2 &&
      player.vy < -2);
  if (!player.grounded && (Math.abs(player.x) > 12 || player.y < -1)) {
    input.left = player.x > 0;
    input.right = player.x < 0;
    input.special = player.jumps >= 2 && player.vy < -2 && !player.recoveryUsed;
  }
  return input;
}
