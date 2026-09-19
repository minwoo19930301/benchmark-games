import { clamp, idleInput } from '../types.ts';
import type { Input, RetroSimulation, RetroSnapshot } from '../types.ts';

export interface MartialArtist {
  x: number;
  z: number;
  facing: number;
  health: number;
  guard: boolean;
  stamina: number;
  cooldown: number;
  stun: number;
  attack: number;
  move: 'idle' | 'punch' | 'kick' | 'sweep';
  tell: number;
  hitResolved: boolean;
  combo: number;
}
const artist = (x: number, facing: number): MartialArtist => ({
  x,
  z: 0,
  facing,
  health: 100,
  guard: false,
  stamina: 1,
  cooldown: 0,
  stun: 0,
  attack: 0,
  move: 'idle',
  tell: 0,
  hitResolved: false,
  combo: 0,
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
  roundBreak = 0;
  flash = 0;
  hits = 0;
  blocks = 0;
  notice = '심야 배송 도장 · 2라운드를 먼저 따내세요';
  private botTimer = 0.9;
  private botMoves = 0;
  private comboTimer = 0;

  step(dt: number, input: Input): void {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.roundBreak > 0) {
      this.roundBreak = Math.max(0, this.roundBreak - dt);
      if (this.roundBreak === 0) {
        this.player = artist(-3, 1);
        this.opponent = artist(3, -1);
        this.round += 1;
        this.botTimer = 0.9;
        this.notice = `ROUND ${this.round} · 시작!`;
      }
      return;
    }
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.player.combo = 0;
    this.tick(this.player, dt);
    this.tick(this.opponent, dt);
    const player = this.player;
    player.facing = this.opponent.x >= player.x ? 1 : -1;
    this.opponent.facing = -player.facing;
    player.guard =
      input.guard &&
      player.stun <= 0 &&
      player.attack <= 0 &&
      player.stamina > 0.05;
    player.stamina = clamp(
      player.stamina + (player.guard ? -0.09 : 0.28) * dt,
      0,
      1,
    );
    if (player.stun <= 0 && player.attack <= 0) {
      const speed = player.guard ? 1.6 : 4.6;
      player.x = clamp(
        player.x + (Number(input.right) - Number(input.left)) * speed * dt,
        -7,
        7,
      );
      player.z = clamp(
        player.z + (Number(input.down) - Number(input.up)) * speed * 0.72 * dt,
        -2.7,
        2.7,
      );
      if (!player.guard && player.cooldown <= 0) {
        if (input.special) this.begin(player, 'kick');
        else if (input.attack) this.begin(player, 'punch');
        else if (input.jump) {
          player.z = clamp(player.z + player.facing * 0.7, -2.7, 2.7);
          player.cooldown = 0.35;
        }
      }
    }
    this.bot(dt);
    this.resolve(this.player, this.opponent);
    this.resolve(this.opponent, this.player);
    const overlap = this.opponent.x - this.player.x;
    if (
      Math.abs(overlap) < 1.35 &&
      Math.abs(this.opponent.z - player.z) < 0.8
    ) {
      const midpoint = (this.opponent.x + player.x) / 2;
      this.player.x = midpoint - player.facing * 0.675;
      this.opponent.x = midpoint + player.facing * 0.675;
    }
    if (this.opponent.health <= 0 || this.player.health <= 0)
      this.endRound(this.opponent.health <= 0);
    if (this.time >= 120 && this.phase === 'playing') {
      this.phase = 'lost';
      this.notice = '막차 종료 · 거리를 좁히고 다시 도전하세요';
    }
  }

  private tick(body: MartialArtist, dt: number): void {
    body.cooldown = Math.max(0, body.cooldown - dt);
    body.stun = Math.max(0, body.stun - dt);
    body.attack = Math.max(0, body.attack - dt);
    body.tell = Math.max(0, body.tell - dt);
    if (body.attack === 0 && body.tell === 0) body.move = 'idle';
  }

  private begin(body: MartialArtist, move: MartialArtist['move']): void {
    body.move = move;
    body.attack = move === 'punch' ? 0.36 : 0.62;
    body.cooldown = move === 'punch' ? 0.62 : 1.05;
    body.hitResolved = false;
    body.guard = false;
  }

  private bot(dt: number): void {
    const bot = this.opponent;
    if (bot.stun > 0) {
      bot.tell = 0;
      return;
    }
    const dx = this.player.x - bot.x;
    const dz = this.player.z - bot.z;
    if (bot.tell > 0) {
      bot.guard = false;
      if (bot.tell < dt * 1.1)
        this.begin(
          bot,
          this.botMoves % 3 === 0
            ? 'sweep'
            : this.botMoves % 2
              ? 'punch'
              : 'kick',
        );
      return;
    }
    if (bot.attack > 0) return;
    bot.guard = this.time % 7 > 5.7 && Math.abs(dx) < 3.2;
    if (Math.abs(dx) > 2.2) bot.x += Math.sign(dx) * 2.4 * dt;
    if (Math.abs(dz) > 0.2) bot.z += Math.sign(dz) * 1.25 * dt;
    this.botTimer -= dt;
    if (
      this.botTimer <= 0 &&
      bot.cooldown <= 0 &&
      Math.abs(dx) < 3.1 &&
      Math.abs(dz) < 1.1
    ) {
      this.botMoves += 1;
      bot.move =
        this.botMoves % 3 === 0
          ? 'sweep'
          : this.botMoves % 2
            ? 'punch'
            : 'kick';
      bot.tell = 0.65;
      bot.hitResolved = false;
      this.botTimer = 1.45;
      this.notice =
        bot.move === 'sweep'
          ? '노란 예고! 아래쪽 발차기 · 옆으로 피하세요'
          : '빨간 예고! 가드하거나 옆으로 피하세요';
    }
  }

  private resolve(attacker: MartialArtist, defender: MartialArtist): void {
    if (
      attacker.hitResolved ||
      attacker.attack <= 0 ||
      attacker.stun > 0 ||
      attacker.tell > 0
    )
      return;
    const activeAt = attacker.move === 'punch' ? 0.2 : 0.3;
    if (attacker.attack > activeAt) return;
    attacker.hitResolved = true;
    const reach = attacker.move === 'punch' ? 2.3 : 3.25;
    if (
      (defender.x - attacker.x) * attacker.facing < 0 ||
      Math.abs(defender.x - attacker.x) > reach ||
      Math.abs(defender.z - attacker.z) > 0.9
    )
      return;
    const guarded = defender.guard && defender.stamina > 0.08;
    const damage =
      attacker.move === 'punch' ? 5 : attacker.move === 'kick' ? 8 : 8;
    if (guarded) {
      defender.stamina = Math.max(
        0,
        defender.stamina - (attacker.move === 'punch' ? 0.1 : 0.2),
      );
      this.blocks += 1;
      if (attacker === this.opponent) this.score += 60;
      this.notice = '가드 성공 · 반격할 틈입니다';
      return;
    }
    defender.health = Math.max(0, defender.health - damage);
    defender.x = clamp(
      defender.x + attacker.facing * (attacker.move === 'punch' ? 0.18 : 0.6),
      -7,
      7,
    );
    defender.stun = attacker.move === 'punch' ? 0.18 : 0.28;
    defender.tell = 0;
    defender.guard = false;
    this.flash = 0.12;
    if (attacker === this.player) {
      this.hits += 1;
      this.player.combo =
        this.comboTimer > 0 ? Math.min(9, this.player.combo + 1) : 1;
      this.comboTimer = 1.3;
      this.score += damage * 25 + this.player.combo * 20;
      this.notice =
        this.player.combo > 1
          ? `${this.player.combo} HIT · 연속 배송!`
          : '적중! 거리와 타이밍을 유지하세요';
    } else this.notice = '피격! 빨간 예고를 보고 가드하세요';
  }

  private endRound(won: boolean): void {
    if (won) {
      this.playerRounds += 1;
      this.score += 1000;
    } else this.opponentRounds += 1;
    if (this.playerRounds === 2 || this.opponentRounds === 2) {
      this.phase = this.playerRounds === 2 ? 'won' : 'lost';
      this.notice =
        this.phase === 'won'
          ? '배달의 고수! 심야 도장을 제패했습니다'
          : '수련이 더 필요합니다 · 다시 도전';
    } else {
      this.roundBreak = 2;
      this.notice = won
        ? 'ROUND WIN · 다음 라운드 준비'
        : 'ROUND LOST · 다시 집중!';
    }
  }

  snapshot(): RetroSnapshot {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress: clamp(
        (this.playerRounds +
          (this.roundBreak > 0 ? 0 : 1 - this.opponent.health / 100)) /
          2,
        0,
        1,
      ),
      objective: this.notice,
      stats: [
        { label: '내 체력', value: Math.ceil(this.player.health) },
        { label: '상대 체력', value: Math.ceil(this.opponent.health) },
        {
          label: '라운드',
          value: `${this.playerRounds} : ${this.opponentRounds}`,
        },
        { label: '연속 타격', value: this.player.combo },
      ],
    };
  }
}

export function ironBenchmark(simulation: RetroSimulation): Input {
  const game = simulation as IronSimulation;
  const input = idleInput();
  const { player, opponent } = game;
  const dx = opponent.x - player.x;
  input.right = dx > 1.8;
  input.left = dx < -1.8;
  input.down = opponent.z - player.z > 0.15;
  input.up = opponent.z - player.z < -0.15;
  input.guard =
    (opponent.tell > 0 && opponent.tell < 0.3) ||
    (opponent.attack > 0 && opponent.attack < 0.35);
  input.special = !input.guard && Math.abs(dx) < 3 && game.time % 2 > 0.7;
  input.attack = !input.guard && !input.special && Math.abs(dx) < 2.25;
  return input;
}
