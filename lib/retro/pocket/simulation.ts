import {
  idleInput,
  type Input,
  type RetroSnapshot,
  type RetroSimulation,
} from '../types.ts';

export type Element = 'ember' | 'leaf' | 'water' | 'normal' | 'flying';
export type SpeciesId =
  | 'charmander'
  | 'bulbasaur'
  | 'squirtle'
  | 'pidgey'
  | 'rattata';
export const species: Record<
  SpeciesId,
  { name: string; element: Element; maxHp: number; move: string }
> = {
  charmander: {
    name: 'CHARMANDER',
    element: 'ember',
    maxHp: 36,
    move: 'EMBER',
  },
  bulbasaur: {
    name: 'BULBASAUR',
    element: 'leaf',
    maxHp: 30,
    move: 'VINE WHIP',
  },
  pidgey: { name: 'PIDGEY', element: 'flying', maxHp: 28, move: 'GUST' },
  rattata: {
    name: 'RATTATA',
    element: 'normal',
    maxHp: 26,
    move: 'QUICK ATTACK',
  },
  squirtle: {
    name: 'SQUIRTLE',
    element: 'water',
    maxHp: 34,
    move: 'WATER GUN',
  },
};
export function typeMultiplier(attack: Element, defense: Element): number {
  if (attack === 'flying' && defense === 'leaf') return 2;
  if (attack === 'leaf' && defense === 'flying') return 0.5;
  if (
    (attack === 'ember' && defense === 'leaf') ||
    (attack === 'leaf' && defense === 'water') ||
    (attack === 'water' && defense === 'ember')
  )
    return 2;
  if (
    (defense === 'ember' && attack === 'leaf') ||
    (defense === 'leaf' && attack === 'water') ||
    (defense === 'water' && attack === 'ember')
  )
    return 0.5;
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
  menu: 'main' | 'moves' | 'items' | 'party';
  cursor: number;
  transition: number;
}

/** A deterministic walking/turn-battle game. All gameplay enters through step(). */
export class PocketSimulation implements RetroSimulation {
  audioCues = { hit: 0, pickup: 0, ability: 0 };
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
  party: Pal[] = [{ id: 'charmander', hp: species.charmander.maxHp }];
  active = 0;
  caught: SpeciesId[] = [];
  balls = 6;
  cakes = 3;
  encounters = 0;
  battle: Battle | null = null;
  message = 'OAK: Catch two kinds of POKEMON on ROUTE 1. Then challenge BLUE!';
  messageTime = 8;
  rivalDefeated = false;
  private menuHeld = {
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    switch: false,
  };
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
          ? '첫 번째 길 완주! 두 종류의 포켓몬을 모으고 라이벌전에서 승리했습니다.'
          : this.phase === 'lost'
            ? '포켓몬들이 모두 지쳤습니다. 태초마을에서 다시 시작하세요.'
            : this.caught.length < 2
              ? `서로 다른 포켓몬 포획 (${this.caught.length}/2) · HP 45% 이하에서 L · 포켓몬센터 E: 회복`
              : this.mode === 'battle' && this.battle?.kind === 'rival'
                ? '라이벌 그린을 이기세요! POKEMON 메뉴 → Space 교체 · K 속성 기술 · E 상처약'
                : '북쪽 길의 그린에게 E로 도전하세요! 전투 중 POKEMON 메뉴에서 Space로 교체하세요.',
      stats: [
        { label: 'DEX', value: `${this.caught.length}/2` },
        { label: 'HP', value: `${this.pal.hp}/${species[this.pal.id].maxHp}` },
        { label: 'BALL', value: this.balls },
        { label: 'POTION', value: this.cakes },
      ],
    };
  }

  clearInput(): void {
    for (const key of Object.keys(
      this.menuHeld,
    ) as (keyof typeof this.menuHeld)[])
      this.menuHeld[key] = false;
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
          'JOY: Your POKEMON are fully healed. We hope to see you again!',
        );
      } else if (
        Math.hypot(this.player.x - RIVAL.x, this.player.y - RIVAL.y) < 1.35
      ) {
        if (this.caught.length >= 2) this.beginBattle('rival', 'squirtle');
        else
          this.say(
            'BLUE: make two different friends in the tall grass. Then let us battle!',
          );
      } else
        this.say(
          'POKEMON CENTER: southwest. Tall grass: center. BLUE: north road.',
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
        const id: SpeciesId = this.encounters % 2 === 0 ? 'pidgey' : 'rattata';
        this.encounters++;
        this.beginBattle('wild', id);
      }
    } else if (terrainAt(this.player.x, this.player.y) !== 'grass')
      this.grassDistance = 0;
  }

  private beginBattle(kind: Battle['kind'], id: SpeciesId): void {
    this.mode = 'battle';
    this.player.moving = false;
    const maxHp = kind === 'rival' ? 58 : id === 'pidgey' ? 24 : 28;
    this.battle = {
      kind,
      id,
      hp: maxHp,
      maxHp,
      cooldown: 0.65,
      turn: 0,
      flash: 0,
      outcome: null,
      menu: 'main',
      cursor: 0,
      transition: 0.55,
    };
    this.say(
      kind === 'rival'
        ? 'BLUE: show me what your new friends can do!'
        : `A wild ${species[id].name} appeared! Weaken it before throwing an POKE BALL.`,
      20,
    );
  }

  private stepBattle(dt: number, input: Input): void {
    const battle = this.battle;
    if (!battle) return;
    battle.cooldown = Math.max(0, battle.cooldown - dt);
    battle.flash = Math.max(0, battle.flash - dt);
    battle.transition = Math.max(0, battle.transition - dt);
    const pressed = (key: keyof typeof this.menuHeld) =>
      input[key] && !this.menuHeld[key];
    const up = pressed('up'),
      down = pressed('down'),
      left = pressed('left'),
      right = pressed('right'),
      confirm = pressed('jump'),
      back = pressed('switch');
    for (const key of Object.keys(
      this.menuHeld,
    ) as (keyof typeof this.menuHeld)[])
      this.menuHeld[key] = input[key];
    if (battle.cooldown > 0) return;
    if (battle.outcome) {
      this.mode = 'world';
      this.battle = null;
      this.encounterGrace = 0.35;
      return;
    }
    if (back) {
      battle.menu = 'main';
      battle.cursor = 0;
      return;
    }
    const choices =
      battle.menu === 'main'
        ? 4
        : battle.menu === 'party'
          ? this.party.length
          : 2;
    if (up || down || left || right) {
      const delta =
        battle.menu === 'main'
          ? up
            ? -2
            : down
              ? 2
              : left
                ? -1
                : 1
          : up || left
            ? -1
            : 1;
      battle.cursor = (battle.cursor + delta + choices) % choices;
      return;
    }
    if (confirm) {
      if (battle.menu === 'main') {
        if (battle.cursor === 3) {
          if (battle.kind === 'rival')
            this.say('No! There is no running from a TRAINER battle!', 20);
          else {
            battle.outcome = 'fled';
            battle.cooldown = 0.5;
            this.say('Got away safely!', 4);
          }
          return;
        }
        battle.menu =
          battle.cursor === 0
            ? 'moves'
            : battle.cursor === 1
              ? 'party'
              : 'items';
        battle.cursor = 0;
        return;
      }
      if (battle.menu === 'party') {
        if (
          this.party[battle.cursor]?.hp > 0 &&
          this.active !== battle.cursor
        ) {
          this.active = battle.cursor;
          this.say(`Go! ${species[this.pal.id].name}!`, 20);
          battle.cooldown = 1.0;
          this.enemyTurn(battle);
        }
        battle.menu = 'main';
        battle.cursor = 0;
        return;
      }
      input = {
        ...input,
        attack: battle.menu === 'moves' && battle.cursor !== 1,
        special: battle.menu === 'moves' && battle.cursor === 1,
        guard: battle.menu === 'items' && battle.cursor === 0,
        interact: battle.menu === 'items' && battle.cursor === 1,
      };
      battle.menu = 'main';
      battle.cursor = 0;
    }
    if (!input.attack && !input.special && !input.guard && !input.interact)
      return;
    battle.cooldown = 1.0;
    battle.flash = 0.18;
    if (input.guard) {
      if (battle.kind === 'rival') {
        this.say('BLUE is a trainer. You can only catch wild POKEMON!', 20);
        return;
      }
      if (this.balls === 0) {
        this.say(
          'No POKE BALLS! Finish this battle, then visit the clinic.',
          20,
        );
        return;
      }
      this.balls--;
      if (battle.hp <= battle.maxHp * 0.45) {
        if (!this.caught.includes(battle.id)) {
          this.caught.push(battle.id);
          this.party.push({ id: battle.id, hp: species[battle.id].maxHp });
          this.score += 300;
        } else this.score += 50;
        this.audioCues.pickup++;
        battle.outcome = 'caught';
        battle.cooldown = 0.9;
        this.say(
          `Click! ${species[battle.id].name} joined you! ${this.caught.length}/2 different POKEMON.`,
          5,
        );
        return;
      }
      this.say(
        'The POKE BALL opened! Get the wild HP bar below half (45%).',
        20,
      );
    } else if (input.interact) {
      if (!this.cakes) {
        this.say('No POTIONS left. The town clinic can refill them.', 20);
        return;
      }
      this.cakes--;
      this.audioCues.pickup++;
      this.pal.hp = Math.min(species[this.pal.id].maxHp, this.pal.hp + 22);
      this.say(`${species[this.pal.id].name} used a POTION. +22 HP!`, 20);
    } else {
      const multiplier = typeMultiplier(
        species[this.pal.id].element,
        species[battle.id].element,
      );
      const damage = input.special
        ? Math.max(2, Math.round(10 * multiplier))
        : 7;
      battle.hp = Math.max(0, battle.hp - damage);
      this.audioCues.hit++;
      this.say(
        `${species[this.pal.id].name}: ${input.special ? species[this.pal.id].move : this.pal.id === 'charmander' ? 'SCRATCH' : 'TACKLE'}! -${damage} HP${input.special && multiplier > 1 ? ' Super effective!' : input.special && multiplier < 1 ? ' Not very effective.' : ''}`,
        20,
      );
      if (battle.hp === 0) {
        this.score += battle.kind === 'rival' ? 1000 : 100;
        if (battle.kind === 'rival') {
          this.rivalDefeated = true;
          this.phase = 'won';
          this.audioCues.ability++;
          this.say(
            'BLUE: what a team! Your first route adventure is complete.',
            60,
          );
        } else {
          battle.outcome = 'fled';
          battle.cooldown = 0.85;
          this.say(
            'The wild POKEMON scampered away. To catch one, stop attacking when HP is low.',
            5,
          );
        }
        return;
      }
    }
    this.enemyTurn(battle);
  }

  private enemyTurn(battle: Battle): void {
    battle.turn++;
    this.audioCues.hit++;
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
          'Your team needs a rest. Start a fresh journey from PALLET TOWN.',
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
      if (battle.menu === 'main') {
        if (battle.cursor !== 1) input.right = true;
        else input.jump = true;
      } else if (battle.menu === 'party') {
        if (battle.cursor !== desired) input.down = true;
        else input.jump = true;
      } else input.switch = true;
      // One input edge followed by a release tick, as for a key tap.
      if (Math.floor(game.time * 10 + 1e-5) % 2) return idleInput();
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
