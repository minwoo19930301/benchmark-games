import {
  idleInput,
  type Input,
  type RetroSnapshot,
  type RetroSimulation,
} from '../types.ts';

export type Element = 'ember' | 'leaf' | 'water';
export type SpeciesId = 'tangerex' | 'dokkaebud' | 'puddleot';
export const species: Record<
  SpeciesId,
  { name: string; element: Element; maxHp: number; move: string }
> = {
  tangerex: {
    name: 'TANGEREX',
    element: 'ember',
    maxHp: 36,
    move: 'CITRUS FLARE',
  },
  dokkaebud: {
    name: 'DOKKAEBUD',
    element: 'leaf',
    maxHp: 30,
    move: 'LEAF WHIRL',
  },
  puddleot: {
    name: 'PUDDLEOT',
    element: 'water',
    maxHp: 34,
    move: 'BUBBLE POP',
  },
};
export function typeMultiplier(attack: Element, defense: Element): number {
  if (
    (attack === 'ember' && defense === 'leaf') ||
    (attack === 'leaf' && defense === 'water') ||
    (attack === 'water' && defense === 'ember')
  )
    return 1.75;
  if (
    (defense === 'ember' && attack === 'leaf') ||
    (defense === 'leaf' && attack === 'water') ||
    (defense === 'water' && attack === 'ember')
  )
    return 0.65;
  return 1;
}
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 13;
export const CLINIC = { x: 3.5, y: 11.3 };
export const RIVAL = { x: 15.5, y: 2.5 };
export function terrainAt(
  x: number,
  y: number,
): 'tree' | 'water' | 'house' | 'grass' | 'path' | 'lawn' {
  const col = Math.floor(x),
    row = Math.floor(y);
  if (col <= 0 || col >= 19 || row <= 0 || row >= 12) return 'tree';
  if (col >= 14 && col <= 18 && row >= 5 && row <= 8) return 'water';
  if (
    (col >= 1 && col <= 5 && row >= 8 && row <= 10) ||
    (col >= 14 && col <= 17 && row >= 10 && row <= 11)
  )
    return 'house';
  if (col >= 6 && col <= 11 && row >= 4 && row <= 7) return 'grass';
  if (row === 11 || row === 2 || row === 8 || col === 8 || col === 9)
    return 'path';
  return 'lawn';
}
export interface Pal {
  id: SpeciesId;
  hp: number;
}
export interface Battle {
  kind: 'wild' | 'rival';
  id: SpeciesId;
  hp: number;
  maxHp: number;
  cooldown: number;
  turn: number;
  flash: number;
  outcome: 'caught' | 'fled' | null;
}

/** A deterministic walking/turn-battle game. All gameplay enters through step(). */
export class PocketSimulation implements RetroSimulation {
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  mode: 'world' | 'battle' = 'world';
  player = {
    x: 8.5,
    y: 11.4,
    facing: 'up' as 'up' | 'down' | 'left' | 'right',
    walk: 0,
    moving: false,
  };
  party: Pal[] = [{ id: 'tangerex', hp: species.tangerex.maxHp }];
  active = 0;
  caught: SpeciesId[] = [];
  balls = 6;
  cakes = 3;
  encounters = 0;
  battle: Battle | null = null;
  message =
    'Catch 2 different pals in the grass. Then find rival Miso on Route 1!';
  messageTime = 8;
  rivalDefeated = false;
  private grassDistance = 0;
  private encounterGrace = 0;
  private talkCooldown = 0;

  get pal(): Pal {
    return this.party[this.active];
  }

  snapshot(): RetroSnapshot {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress: this.rivalDefeated ? 1 : Math.min(0.66, this.caught.length / 3),
      objective:
        this.phase === 'won'
          ? '첫 번째 길 완주! 두 친구와 라이벌전에서 승리했습니다.'
          : this.phase === 'lost'
            ? '친구들이 모두 지쳤습니다. 귤빛 마을에서 다시 시작하세요.'
            : this.caught.length < 2
              ? `서로 다른 친구 포획 (${this.caught.length}/2) · HP 45% 이하에서 L · 진료소 E: 회복`
              : this.mode === 'battle' && this.battle?.kind === 'rival'
                ? '라이벌 미소를 이기세요! ← → 친구 교체 · K 속성 기술 · E 회복 떡'
                : '북쪽 길의 미소에게 E로 도전하세요! 전투 중 ← →로 친구를 교체할 수 있습니다.',
      stats: [
        { label: 'PALS', value: `${this.caught.length}/2` },
        { label: 'HP', value: `${this.pal.hp}/${species[this.pal.id].maxHp}` },
        { label: 'ORB', value: this.balls },
        { label: 'CAKES', value: this.cakes },
      ],
    };
  }

  step(dt: number, input: Input): void {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const step = Math.min(dt, 1 / 15);
    this.time += step;
    this.messageTime = Math.max(0, this.messageTime - step);
    if (this.mode === 'battle') this.stepBattle(step, input);
    else this.stepWorld(step, input);
  }

  private say(text: string, seconds = 4): void {
    this.message = text;
    this.messageTime = seconds;
  }

  private walkable(x: number, y: number): boolean {
    const radius = 0.2;
    return [
      [x - radius, y],
      [x + radius, y],
      [x, y - radius],
      [x, y + radius],
    ].every(([px, py]) => {
      const tile = terrainAt(px, py);
      return tile !== 'tree' && tile !== 'water' && tile !== 'house';
    });
  }

  private stepWorld(dt: number, input: Input): void {
    this.encounterGrace = Math.max(0, this.encounterGrace - dt);
    this.talkCooldown = Math.max(0, this.talkCooldown - dt);
    const horizontal = Number(input.right) - Number(input.left);
    const vertical = horizontal ? 0 : Number(input.down) - Number(input.up);
    const before = { x: this.player.x, y: this.player.y };
    const speed = 4.2;
    if (horizontal) this.player.facing = horizontal > 0 ? 'right' : 'left';
    if (vertical) this.player.facing = vertical > 0 ? 'down' : 'up';
    const x = this.player.x + horizontal * speed * dt;
    const y = this.player.y + vertical * speed * dt;
    if (this.walkable(x, this.player.y)) this.player.x = x;
    if (this.walkable(this.player.x, y)) this.player.y = y;
    const distance = Math.hypot(
      this.player.x - before.x,
      this.player.y - before.y,
    );
    this.player.moving = distance > 0;
    this.player.walk += distance;
    if ((input.interact || input.attack) && this.talkCooldown === 0) {
      this.talkCooldown = 0.35;
      if (
        Math.hypot(this.player.x - CLINIC.x, this.player.y - CLINIC.y) < 1.3
      ) {
        this.party.forEach((pal) => {
          pal.hp = species[pal.id].maxHp;
        });
        this.balls = 6;
        this.cakes = 3;
        this.say(
          'Nurse Hana: all healed! Fresh orbs and rice cakes. Good luck!',
        );
      } else if (
        Math.hypot(this.player.x - RIVAL.x, this.player.y - RIVAL.y) < 1.35
      ) {
        if (this.caught.length >= 2) this.beginBattle('rival', 'puddleot');
        else
          this.say(
            'Miso: make two different friends in the tall grass. Then let us battle!',
          );
      } else
        this.say(
          'Citrus Clinic: southwest. Tall grass: center. Miso: north road.',
        );
    }
    if (this.mode !== 'world') return;
    if (
      terrainAt(this.player.x, this.player.y) === 'grass' &&
      this.encounterGrace === 0
    ) {
      this.grassDistance += distance;
      if (this.grassDistance >= 2.7) {
        this.grassDistance = 0;
        const id: SpeciesId =
          this.encounters % 2 === 0 ? 'dokkaebud' : 'puddleot';
        this.encounters++;
        this.beginBattle('wild', id);
      }
    } else if (terrainAt(this.player.x, this.player.y) !== 'grass')
      this.grassDistance = 0;
  }

  private beginBattle(kind: Battle['kind'], id: SpeciesId): void {
    this.mode = 'battle';
    this.player.moving = false;
    const maxHp = kind === 'rival' ? 58 : id === 'dokkaebud' ? 24 : 28;
    this.battle = {
      kind,
      id,
      hp: maxHp,
      maxHp,
      cooldown: 0.65,
      turn: 0,
      flash: 0,
      outcome: null,
    };
    this.say(
      kind === 'rival'
        ? 'Miso: show me what your new friends can do!'
        : `A wild ${species[id].name} appeared! Weaken it before throwing an orb.`,
      20,
    );
  }

  private stepBattle(dt: number, input: Input): void {
    const battle = this.battle;
    if (!battle) return;
    battle.cooldown = Math.max(0, battle.cooldown - dt);
    battle.flash = Math.max(0, battle.flash - dt);
    if (battle.cooldown > 0) return;
    if (battle.outcome) {
      this.mode = 'world';
      this.battle = null;
      this.encounterGrace = 0.35;
      return;
    }
    if ((input.left || input.right) && this.party.length > 1) {
      const direction = input.left ? -1 : 1;
      for (let index = 1; index <= this.party.length; index++) {
        const next =
          (this.active + direction * index + this.party.length * 2) %
          this.party.length;
        if (this.party[next].hp > 0) {
          this.active = next;
          break;
        }
      }
      battle.cooldown = 0.25;
      this.say(`Go, ${species[this.pal.id].name}!`, 20);
      return;
    }
    if (!input.attack && !input.special && !input.guard && !input.interact)
      return;
    battle.cooldown = 0.7;
    battle.flash = 0.18;
    if (input.guard) {
      if (battle.kind === 'rival') {
        this.say('Miso is a trainer. You can only catch wild pals!', 20);
        return;
      }
      if (this.balls === 0) {
        this.say('No orbs! Finish this battle, then visit the clinic.', 20);
        return;
      }
      this.balls--;
      if (battle.hp <= battle.maxHp * 0.45) {
        if (!this.caught.includes(battle.id)) {
          this.caught.push(battle.id);
          this.party.push({ id: battle.id, hp: species[battle.id].maxHp });
          this.score += 300;
        } else this.score += 50;
        battle.outcome = 'caught';
        battle.cooldown = 0.9;
        this.say(
          `Click! ${species[battle.id].name} joined you! ${this.caught.length}/2 different pals.`,
          5,
        );
        return;
      }
      this.say('The orb opened! Get the wild HP bar below half (45%).', 20);
    } else if (input.interact) {
      if (!this.cakes) {
        this.say('No rice cakes left. The town clinic can refill them.', 20);
        return;
      }
      this.cakes--;
      this.pal.hp = Math.min(species[this.pal.id].maxHp, this.pal.hp + 22);
      this.say(`${species[this.pal.id].name} ate a rice cake. +22 HP!`, 20);
    } else {
      const multiplier = typeMultiplier(
        species[this.pal.id].element,
        species[battle.id].element,
      );
      const damage = input.special
        ? Math.max(2, Math.round(10 * multiplier))
        : 7;
      battle.hp = Math.max(0, battle.hp - damage);
      this.say(
        `${species[this.pal.id].name}: ${input.special ? species[this.pal.id].move : 'QUICK BUMP'}! -${damage} HP${input.special && multiplier > 1 ? ' Super effective!' : input.special && multiplier < 1 ? ' Not very effective.' : ''}`,
        20,
      );
      if (battle.hp === 0) {
        this.score += battle.kind === 'rival' ? 1000 : 100;
        if (battle.kind === 'rival') {
          this.rivalDefeated = true;
          this.phase = 'won';
          this.say(
            'Miso: what a team! Your first route adventure is complete.',
            60,
          );
        } else {
          battle.outcome = 'fled';
          battle.cooldown = 0.85;
          this.say(
            'The wild pal scampered away. To catch one, stop attacking when HP is low.',
            5,
          );
        }
        return;
      }
    }
    battle.turn++;
    const response = Math.max(
      1,
      Math.round(
        (battle.kind === 'rival' ? 5 : 3) *
          typeMultiplier(
            species[battle.id].element,
            species[this.pal.id].element,
          ),
      ),
    );
    this.pal.hp = Math.max(0, this.pal.hp - response);
    this.message += ` Foe replies: -${response} HP.`;
    if (this.pal.hp === 0) {
      const next = this.party.findIndex((pal) => pal.hp > 0);
      if (next >= 0) {
        this.active = next;
        this.say(`Your pal rests. Go, ${species[this.pal.id].name}!`, 20);
      } else {
        this.phase = 'lost';
        this.say(
          'Your team needs a rest. Start a fresh journey from Citrus Town.',
          60,
        );
      }
    }
  }
}

/** Ordinary movement and battle buttons only; this controller never writes game state. */
export function benchmarkInput(game: PocketSimulation): Input {
  const input = idleInput();
  if (game.phase !== 'playing') return input;
  if (game.mode === 'battle' && game.battle) {
    const battle = game.battle;
    if (battle.outcome || battle.cooldown > 0) return input;
    const desired = game.party.reduce(
      (best, pal, index) =>
        pal.hp > 0 &&
        typeMultiplier(species[pal.id].element, species[battle.id].element) >
          typeMultiplier(
            species[game.party[best].id].element,
            species[battle.id].element,
          )
          ? index
          : best,
      game.active,
    );
    if (desired !== game.active) {
      input.right = true;
      return input;
    }
    if (game.pal.hp < 10 && game.cakes > 0) input.interact = true;
    else if (
      battle.kind === 'wild' &&
      battle.hp <= battle.maxHp * 0.45 &&
      game.balls > 0
    )
      input.guard = true;
    else if (
      battle.kind === 'wild' &&
      battle.hp <=
        Math.round(
          10 *
            typeMultiplier(
              species[game.pal.id].element,
              species[battle.id].element,
            ),
        )
    )
      input.attack = true;
    else input.special = true;
    return input;
  }
  const toward = (x: number, y: number) => {
    if (Math.abs(game.player.x - x) > 0.12)
      input[game.player.x < x ? 'right' : 'left'] = true;
    else if (Math.abs(game.player.y - y) > 0.12)
      input[game.player.y < y ? 'down' : 'up'] = true;
  };
  if (game.caught.length < 2) {
    if (game.player.y > 7.2) toward(8.5, 6.5);
    else if (game.player.x > 11.2) input.left = true;
    else if (game.player.x < 6.8) input.right = true;
    else input[game.player.facing === 'left' ? 'left' : 'right'] = true;
  } else if (
    Math.hypot(game.player.x - RIVAL.x, game.player.y - RIVAL.y) < 1.25
  )
    input.interact = true;
  else if (game.player.y > 2.65) toward(8.5, 2.5);
  else toward(RIVAL.x, RIVAL.y);
  return input;
}
