import {
  clamp,
  idleInput,
  type Input,
  type RetroSimulation,
} from '../types.ts';
export type Element = 'ember' | 'tide';
export type Hero = {
  element: Element;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  face: number;
  coyote: number;
  jumpBuffer: number;
  trail: number[];
};
export type Platform = { x: number; y: number; w: number; h: number };
export type Pool = { x: number; w: number; element: Element | 'poison' };
export const W = 960,
  H = 540,
  FLOOR = 458;
export const rooms = [
  {
    name: 'THE FOREST TEMPLE · 01',
    korean: '숲의 사원 1',
    plate: 120,
    gate: 737,
    lever: 817,
    holder: 0,
    pools: [
      { x: 228, w: 76, element: 'ember' },
      { x: 410, w: 80, element: 'tide' },
      { x: 594, w: 74, element: 'poison' },
    ],
    platforms: [
      { x: 326, y: 361, w: 76, h: 16 },
      { x: 518, y: 302, w: 80, h: 16 },
    ],
    color: '#354e50',
  },
  {
    name: 'THE FOREST TEMPLE · 02',
    korean: '숲의 사원 2',
    plate: 102,
    gate: 753,
    lever: 815,
    holder: 1,
    pools: [
      { x: 230, w: 84, element: 'tide' },
      { x: 418, w: 84, element: 'ember' },
      { x: 598, w: 78, element: 'poison' },
    ],
    platforms: [
      { x: 340, y: 364, w: 62, h: 16 },
      { x: 521, y: 333, w: 67, h: 16 },
    ],
    color: '#555049',
  },
  {
    name: 'THE FOREST TEMPLE · 03',
    korean: '숲의 사원 3',
    plate: 111,
    gate: 751,
    lever: 814,
    holder: 0,
    pools: [
      { x: 225, w: 84, element: 'ember' },
      { x: 419, w: 84, element: 'tide' },
      { x: 595, w: 87, element: 'poison' },
    ],
    platforms: [
      { x: 332, y: 348, w: 76, h: 16 },
      { x: 522, y: 313, w: 62, h: 16 },
    ],
    color: '#3d4c66',
  },
] satisfies {
  name: string;
  korean: string;
  plate: number;
  gate: number;
  lever: number;
  holder: number;
  pools: Pool[];
  platforms: Platform[];
  color: string;
}[];
export class TempleSimulation implements RetroSimulation {
  audioCues = { jump: 0, pickup: 0, hit: 0, ability: 0 };
  phase: 'playing' | 'won' | 'lost' = 'playing';
  time = 0;
  roomTime = 0;
  room = 0;
  score = 0;
  deaths = 0;
  active = 0;
  heroes: Hero[] = [];
  collected = new Set<number>();
  latched = false;
  gateOpen = 0;
  flash = 0;
  transition = 0;
  message = '';
  previous = idleInput();
  constructor() {
    this.resetRoom();
  }
  get level() {
    return rooms[this.room];
  }
  get exitY() {
    return this.room === 2 ? 239 : FLOOR;
  }
  get leverY() {
    return this.room === 2 ? 312 : FLOOR;
  }
  get platforms(): Platform[] {
    return [
      ...this.level.platforms,
      ...(this.room === 2
        ? [
            { x: 650, y: 385, w: 116, h: 16 },
            { x: 772, y: 312, w: 80, h: 16 },
            { x: 837, y: 239, w: 118, h: 16 },
          ]
        : []),
    ];
  }
  get plateHeld() {
    return this.heroes.some(
      (h) => Math.abs(h.x - this.level.plate) < 24 && h.y > FLOOR - 4,
    );
  }
  get gems() {
    return [
      ...this.level.pools
        .filter((p) => p.element !== 'poison')
        .map((p) => ({
          x: p.x + p.w / 2,
          y: FLOOR - 13,
          element: p.element as Element,
          required: true,
        })),
      ...this.level.platforms.map((p, i) => ({
        x: p.x + p.w / 2,
        y: p.y - 25,
        element: (i ? 'tide' : 'ember') as Element,
        required: false,
      })),
    ];
  }
  resetRoom() {
    this.heroes = ['ember', 'tide'].map((element, i) => ({
      element: element as Element,
      x: 70 + i * 57,
      y: FLOOR,
      vx: 0,
      vy: 0,
      grounded: true,
      face: 1,
      coyote: 0.1,
      jumpBuffer: 0,
      trail: [],
    }));
    this.collected.clear();
    this.latched = false;
    this.gateOpen = 0;
    this.roomTime = 0;
    this.flash = 0.45;
    this.message = '발판으로 문을 열고, 건너편 레버로 고정하세요.';
  }
  die() {
    this.deaths++;
    this.audioCues.hit++;
    this.score = Math.max(0, this.score - 80);
    this.resetRoom();
    this.message = '서로 다른 원소는 위험해요. 같은 방에서 다시 도전!';
  }
  clearInput() {
    this.previous = idleInput();
    this.heroes.forEach((hero) => {
      hero.jumpBuffer = 0;
    });
  }
  step(dt: number, input: Input) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.roomTime += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (input.switch && !this.previous.switch) this.active = 1 - this.active;
    if (this.transition > 0) {
      this.transition -= dt;
      if (this.transition <= 0) {
        this.room++;
        this.resetRoom();
      }
      this.previous = { ...input };
      return;
    }
    this.gateOpen = clamp(
      this.gateOpen + (this.plateHeld || this.latched ? 3 : -2) * dt,
      0,
      1,
    );
    for (let i = 0; i < 2; i++) {
      const hero = this.heroes[i];
      // Arrow/touch controls select one hero. WAD always gives the other hero independent co-op input.
      const primary = i === this.active;
      const left = primary ? input.left : input.left2,
        right = primary ? input.right : input.right2;
      const jump = primary ? input.jump || input.up : input.jump2;
      const wasJump = primary
        ? this.previous.jump || this.previous.up
        : this.previous.jump2;
      hero.jumpBuffer =
        jump && !wasJump ? 0.12 : Math.max(0, hero.jumpBuffer - dt);
      hero.coyote = hero.grounded ? 0.1 : Math.max(0, hero.coyote - dt);
      const direction = Number(right) - Number(left);
      if (direction) hero.face = direction;
      const target = direction * 218;
      hero.vx += clamp(target - hero.vx, -1800 * dt, 1800 * dt);
      if (hero.jumpBuffer > 0 && hero.coyote > 0) {
        this.audioCues.jump++;
        hero.vy = -477;
        hero.grounded = false;
        hero.coyote = 0;
        hero.jumpBuffer = 0;
      }
      if (!jump && hero.vy < -160) hero.vy += 1800 * dt;
      const oldY = hero.y;
      hero.x = clamp(hero.x + hero.vx * dt, 26, W - 25);
      const gate = this.level.gate;
      if (this.gateOpen < 0.85 && Math.abs(hero.x - gate) < 24) {
        hero.x = hero.x < gate ? gate - 24 : gate + 24;
        hero.vx = 0;
      }
      hero.vy += 1250 * dt;
      hero.y += hero.vy * dt;
      hero.grounded = false;
      for (const p of [{ x: 0, y: FLOOR, w: W, h: 82 }, ...this.platforms]) {
        if (
          hero.vy >= 0 &&
          oldY <= p.y + 1 &&
          hero.y >= p.y &&
          hero.x + 11 > p.x &&
          hero.x - 11 < p.x + p.w
        ) {
          hero.y = p.y;
          hero.vy = 0;
          hero.grounded = true;
        }
      }
      for (const pool of this.level.pools) {
        if (
          hero.y > FLOOR - 7 &&
          hero.x > pool.x + 3 &&
          hero.x < pool.x + pool.w - 3 &&
          pool.element !== hero.element
        ) {
          this.die();
          this.previous = { ...input };
          return;
        }
      }
      // Room 2/3 add timed steam vents, clearly signalled before the active interval.
      if (
        this.room > 0 &&
        hero.x > 541 &&
        hero.x < 568 &&
        hero.y > FLOOR - 70 &&
        this.roomTime % 4 > 2.65 &&
        this.roomTime % 4 < 3.35
      ) {
        this.die();
        this.previous = { ...input };
        return;
      }
      this.gems.forEach((gem, index) => {
        if (
          !this.collected.has(index) &&
          hero.element === gem.element &&
          Math.hypot(hero.x - gem.x, hero.y - 17 - gem.y) < 25
        ) {
          this.audioCues.pickup++;
          this.collected.add(index);
          this.score += gem.required ? 250 : 400;
        }
      });
      if (
        Math.abs(hero.x - this.level.lever) < 37 &&
        Math.abs(hero.y - this.leverY) < 40 &&
        input.interact
      ) {
        if (!this.latched) this.audioCues.ability++;
        this.latched = true;
        this.message =
          '문 고정 완료! 다이아몬드를 모으고 두 출구로 이동하세요.';
      }
    }
    if (
      this.collected.has(0) &&
      this.collected.has(1) &&
      this.heroes.every(
        (h, i) =>
          Math.abs(h.x - (873 + i * 50)) < 23 &&
          h.grounded &&
          Math.abs(h.y - this.exitY) < 5,
      )
    ) {
      this.score += 1000;
      if (this.room === rooms.length - 1) this.phase = 'won';
      else this.transition = 0.85;
    }
    if (input.reload && !this.previous.reload) this.die();
    this.previous = { ...input };
  }
  snapshot() {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress:
        this.phase === 'won'
          ? 1
          : (this.room +
              (this.latched ? 0.65 : 0.2) +
              this.collected.size * 0.06) /
            3,
      objective: `${this.room + 1}/3 · ${this.level.korean} · ${this.message}`,
      stats: [
        { label: '다이아몬드', value: `${this.collected.size}/4` },
        { label: '재도전', value: this.deaths },
        { label: '조작', value: this.active === 0 ? '파이어보이' : '워터걸' },
      ],
    };
  }
}
export function benchmarkTemple(sim: TempleSimulation): Input {
  const input = idleInput();
  if (sim.transition > 0) return input;
  const holder = sim.level.holder,
    runner = 1 - holder;
  // Ordinary simultaneous two-player controls. Runner opens latch; holder crosses afterward.
  for (let i = 0; i < 2; i++) {
    const h = sim.heroes[i];
    let target =
      !sim.latched && i === holder ? sim.level.plate : sim.level.lever;
    if (sim.latched) target = 873 + i * 50;
    const primary = i === sim.active;
    const l = primary ? 'left' : 'left2',
      r = primary ? 'right' : 'right2',
      j = primary ? 'jump' : 'jump2';
    if (
      !sim.latched &&
      i === runner &&
      sim.gateOpen < 0.95 &&
      h.x < sim.level.gate - 30 &&
      h.x > sim.level.gate - 65
    )
      target = h.x;
    if (target > h.x + 6) input[r] = true;
    if (target < h.x - 6) input[l] = true;
    const ahead = sim.level.pools.find(
      (p) => p.element !== h.element && h.x < p.x + p.w + 8 && h.x > p.x - 51,
    );
    if (ahead && target > h.x) input[j] = true;
    // Preserve a full jump through a hazardous pool. Wait for the steam cycle on the safe approach.
    if (h.y < FLOOR - 10 && h.vy < 0) input[j] = true;
    if (
      sim.room > 0 &&
      h.x > 515 &&
      h.x < 541 &&
      sim.roomTime % 4 > 1.8 &&
      sim.roomTime % 4 < 3.45
    )
      input[r] = false;
    if (sim.room === 2 && h.grounded && target > h.x + 6) {
      if (
        (h.y > 390 && h.x > 659) ||
        (h.y > 318 && h.y <= 390 && h.x > 711) ||
        (h.y > 242 && h.y <= 318 && h.x > 775)
      )
        input[j] = true;
    }
    if (Math.abs(h.x - sim.level.lever) < 34) input.interact = true;
  }
  return input;
}
