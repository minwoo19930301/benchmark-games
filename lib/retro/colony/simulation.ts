import {
  clamp,
  idleInput,
  idlePointer,
  type Input,
  type PointerInput,
  type RetroSimulation,
  type RetroSnapshot,
} from '../types.ts';
import {
  BASE,
  BUTTONS,
  ENEMY_BASE,
  HUD_TOP,
  inRect,
  MAP_H,
  MAP_W,
  MINERALS,
  MINIMAP,
  minimapPoint,
  project,
  rockKeys,
  unproject,
  type Camera,
  type Command,
  type Point,
} from './world.ts';

export type UnitKind = 'worker' | 'marine' | 'raider';
export type BuildingKind =
  | 'headquarters'
  | 'barracks'
  | 'turret'
  | 'depot'
  | 'core';
export type Order = {
  kind:
    | 'idle'
    | 'hold'
    | 'enter'
    | 'move'
    | 'attackMove'
    | 'attack'
    | 'harvest'
    | 'build';
  x: number;
  y: number;
  target?: number;
};
export type Unit = {
  id: number;
  kind: UnitKind;
  enemy: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  order: Order;
  path: Point[];
  repath: number;
  cooldown: number;
  facing: number;
  cargo: number;
  mineTime: number;
  returning: boolean;
  moving: boolean;
  garrison: number | null;
  flash: number;
};
export type Building = {
  id: number;
  kind: BuildingKind;
  enemy: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  size: number;
  progress: number;
  buildTime: number;
  queue: ('marine' | 'worker')[];
  trainTime: number;
  rally: Point;
  cooldown: number;
  flash: number;
};
export type Mineral = { id: number; x: number; y: number; amount: number };
export type Projectile = {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  target: number;
  enemy: boolean;
  damage: number;
  life: number;
};
export type Effect = {
  x: number;
  y: number;
  life: number;
  type: 'impact' | 'blast' | 'command' | 'build' | 'deposit';
  enemy?: boolean;
};
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const unitCost = { marine: 50, worker: 50 };
const buildingCost = { barracks: 150, turret: 100, depot: 100 };
const alive = <T extends { hp: number }>(item: T) => item.hp > 0;

/** Deterministic miniature RTS: pointer and key commands use one shared path. */
export class ColonySimulation implements RetroSimulation {
  phase: 'playing' | 'won' | 'lost' = 'playing';
  time = 0;
  score = 0;
  minerals = 400;
  gathered = 0;
  spent = 0;
  kills = 0;
  waves = 0;
  camera: Camera = { x: 8, y: 14, zoom: 1 };
  aspect = 1.8;
  units: Unit[] = [];
  buildings: Building[] = [];
  deposits: Mineral[] = MINERALS.map((node, index) => ({
    ...node,
    id: 1000 + index,
    amount: 900,
  }));
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  selected = new Set<number>();
  visible = new Uint8Array(MAP_W * MAP_H);
  explored = new Uint8Array(MAP_W * MAP_H);
  buildMode: 'barracks' | 'turret' | 'depot' | null = null;
  assaultMode = false;
  drag: { start: Point; end: Point } | null = null;
  pointer: Point = { x: 0.5, y: 0.5 };
  message = '일꾼이 광물을 운반합니다. 병영을 짓고 해병을 생산하세요.';
  messageTime = 6;
  commands = {
    selection: 0,
    move: 0,
    harvest: 0,
    attack: 0,
    attackMove: 0,
    build: 0,
    train: 0,
  };
  audioCues = { shot: 0, hit: 0, pickup: 0, explosion: 0, ability: 0 };
  private nextId = 1;
  private lastInput = idleInput();
  private visionTimer = 0;
  private waveTimer = 22;

  constructor() {
    this.addBuilding('headquarters', BASE.x, BASE.y, false, true);
    this.addBuilding('core', ENEMY_BASE.x, ENEMY_BASE.y, true, true);
    const workerA = this.addUnit('worker', 5, 14.8);
    const workerB = this.addUnit('worker', 4, 18.3);
    this.addUnit('worker', 7.7, 18.2);
    this.addUnit('marine', 8.5, 14.3);
    this.addUnit('marine', 9.3, 15.4);
    this.harvest(workerA, this.deposits[0]);
    this.harvest(workerB, this.deposits[1]);
    this.addUnit('raider', 23, 7.2, true);
    this.addUnit('raider', 25.9, 8.1, true);
    this.updateVision();
  }

  private say(message: string) {
    this.message = message;
    this.messageTime = 3.5;
  }
  clearInput() {
    this.drag = null;
    this.lastInput = idleInput();
  }
  private effect(type: Effect['type'], point: Point, enemy = false) {
    this.effects.push({
      ...point,
      type,
      enemy,
      life: type === 'blast' ? 0.75 : 0.42,
    });
  }
  private addUnit(kind: UnitKind, x: number, y: number, enemy = false) {
    const hp = kind === 'worker' ? 60 : 40;
    const unit: Unit = {
      id: this.nextId++,
      kind,
      enemy,
      x,
      y,
      hp,
      maxHp: hp,
      order: { kind: 'idle', x, y },
      path: [],
      repath: 0,
      cooldown: 0,
      facing: 0,
      cargo: 0,
      mineTime: 0,
      returning: false,
      moving: false,
      garrison: null,
      flash: 0,
    };
    this.units.push(unit);
    return unit;
  }
  private addBuilding(
    kind: BuildingKind,
    x: number,
    y: number,
    enemy: boolean,
    complete: boolean,
  ) {
    const hp =
      kind === 'headquarters'
        ? 1500
        : kind === 'core'
          ? 1500
          : kind === 'barracks'
            ? 1000
            : kind === 'depot'
              ? 500
              : 350;
    const size =
      kind === 'headquarters' || kind === 'core'
        ? 1.35
        : kind === 'barracks'
          ? 1.05
          : kind === 'depot'
            ? 0.8
            : 0.72;
    const building: Building = {
      id: this.nextId++,
      kind,
      x,
      y,
      enemy,
      hp: complete ? hp : hp * 0.35,
      maxHp: hp,
      size,
      progress: complete ? 1 : 0,
      buildTime: kind === 'barracks' ? 4 : 3,
      queue: [],
      trainTime: 0,
      rally: { x: x + 2.2, y: y - 1.5 },
      cooldown: 0,
      flash: 0,
    };
    this.buildings.push(building);
    return building;
  }
  entity(id: number) {
    return (
      this.units.find(
        (unit) => unit.id === id && alive(unit) && !unit.garrison,
      ) ??
      this.buildings.find((building) => building.id === id && alive(building))
    );
  }
  friendlyUnits() {
    return this.units.filter((unit) => !unit.enemy && alive(unit));
  }
  supplyUsed() {
    return this.friendlyUnits().length;
  }
  supplyCap() {
    return Math.min(
      200,
      this.buildings
        .filter((b) => !b.enemy && b.hp > 0 && b.progress >= 1)
        .reduce(
          (sum, b) =>
            sum + (b.kind === 'headquarters' ? 10 : b.kind === 'depot' ? 8 : 0),
          0,
        ),
    );
  }
  occupants(building: Building) {
    return this.units.filter((u) => u.hp > 0 && u.garrison === building.id);
  }
  private unload(building: Building) {
    for (const unit of this.occupants(building)) {
      let destination: Point | undefined;
      for (let r = 1.5; r <= 4 && !destination; r += 0.5)
        for (let n = 0; n < 12 && !destination; n++) {
          const point = {
            x: building.x + Math.cos((n * Math.PI) / 6) * r,
            y: building.y + Math.sin((n * Math.PI) / 6) * r,
          };
          if (this.walkable(point.x, point.y)) destination = point;
        }
      if (destination) {
        unit.garrison = null;
        unit.x = destination.x;
        unit.y = destination.y;
        this.setOrder(unit, { kind: 'idle', ...destination });
      }
    }
  }
  isVisible(point: Point) {
    const x = Math.floor(point.x),
      y = Math.floor(point.y);
    return (
      x >= 0 &&
      y >= 0 &&
      x < MAP_W &&
      y < MAP_H &&
      this.visible[y * MAP_W + x] === 1
    );
  }
  private updateVision() {
    this.visible.fill(0);
    const sources = [
      ...this.friendlyUnits().map((unit) => ({
        ...unit,
        radius: unit.kind === 'worker' ? 5.3 : 7.5,
      })),
      ...this.buildings
        .filter((building) => !building.enemy && alive(building))
        .map((building) => ({
          ...building,
          radius: building.kind === 'headquarters' ? 8.5 : 6.5,
        })),
    ];
    for (const source of sources) {
      for (
        let y = Math.max(0, Math.floor(source.y - source.radius));
        y <= Math.min(MAP_H - 1, source.y + source.radius);
        y += 1
      ) {
        for (
          let x = Math.max(0, Math.floor(source.x - source.radius));
          x <= Math.min(MAP_W - 1, source.x + source.radius);
          x += 1
        ) {
          if (
            Math.hypot(x + 0.5 - source.x, y + 0.5 - source.y) <= source.radius
          )
            this.visible[y * MAP_W + x] = this.explored[y * MAP_W + x] = 1;
        }
      }
    }
  }

  walkable(x: number, y: number) {
    if (x < 0.4 || y < 0.4 || x >= MAP_W - 0.4 || y >= MAP_H - 0.4)
      return false;
    if (rockKeys.has(`${Math.floor(x)},${Math.floor(y)}`)) return false;
    if (
      this.buildings.some(
        (building) =>
          alive(building) &&
          Math.abs(building.x - x) < building.size + 0.25 &&
          Math.abs(building.y - y) < building.size + 0.25,
      )
    )
      return false;
    return !this.deposits.some(
      (deposit) => deposit.amount > 0 && dist(deposit, { x, y }) < 0.62,
    );
  }

  /** Grid A* with no diagonal corner cutting, shared by workers and both armies. */
  findPath(from: Point, to: Point): Point[] {
    const sx = clamp(Math.floor(from.x), 0, MAP_W - 1),
      sy = clamp(Math.floor(from.y), 0, MAP_H - 1);
    let tx = clamp(Math.floor(to.x), 0, MAP_W - 1),
      ty = clamp(Math.floor(to.y), 0, MAP_H - 1);
    if (!this.walkable(tx + 0.5, ty + 0.5)) {
      let best = Infinity;
      const centerX = tx,
        centerY = ty;
      for (let y = centerY - 4; y <= centerY + 4; y += 1)
        for (let x = centerX - 4; x <= centerX + 4; x += 1) {
          if (!this.walkable(x + 0.5, y + 0.5)) continue;
          const cost =
            Math.hypot(x + 0.5 - to.x, y + 0.5 - to.y) +
            Math.hypot(x - sx, y - sy) * 0.02;
          if (cost < best) {
            best = cost;
            tx = x;
            ty = y;
          }
        }
    }
    const start = sy * MAP_W + sx,
      goal = ty * MAP_W + tx;
    if (start === goal) return this.walkable(to.x, to.y) ? [{ ...to }] : [];
    const costs = new Float64Array(MAP_W * MAP_H).fill(Infinity);
    const previous = new Int32Array(MAP_W * MAP_H).fill(-1);
    const closed = new Uint8Array(MAP_W * MAP_H);
    const open = [start];
    costs[start] = 0;
    const heuristic = (id: number) =>
      Math.hypot((id % MAP_W) - tx, Math.floor(id / MAP_W) - ty);
    for (
      let iteration = 0;
      open.length > 0 && iteration < MAP_W * MAP_H;
      iteration += 1
    ) {
      let index = 0;
      for (let cursor = 1; cursor < open.length; cursor += 1)
        if (
          costs[open[cursor]] + heuristic(open[cursor]) <
          costs[open[index]] + heuristic(open[index])
        )
          index = cursor;
      const current = open.splice(index, 1)[0];
      if (current === goal) {
        const path: Point[] = [];
        let cursor = goal;
        while (cursor !== start && cursor !== -1) {
          path.push({
            x: (cursor % MAP_W) + 0.5,
            y: Math.floor(cursor / MAP_W) + 0.5,
          });
          cursor = previous[cursor];
        }
        path.reverse();
        const center = { x: sx + 0.5, y: sy + 0.5 };
        if (dist(from, center) > 0.18 && this.walkable(center.x, center.y))
          path.unshift(center);
        return path;
      }
      closed[current] = 1;
      const cx = current % MAP_W,
        cy = Math.floor(current / MAP_W);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = cx + dx,
            ny = cy + dy;
          if (!this.walkable(nx + 0.5, ny + 0.5)) continue;
          if (
            dx &&
            dy &&
            (!this.walkable(cx + dx + 0.5, cy + 0.5) ||
              !this.walkable(cx + 0.5, cy + dy + 0.5))
          )
            continue;
          const next = ny * MAP_W + nx;
          if (closed[next]) continue;
          const cost = costs[current] + (dx && dy ? Math.SQRT2 : 1);
          if (cost < costs[next]) {
            costs[next] = cost;
            previous[next] = current;
            if (!open.includes(next)) open.push(next);
          }
        }
    }
    return [];
  }

  private travel(unit: Unit, target: Point, dt: number) {
    if (unit.repath <= 0 || unit.path.length === 0) {
      unit.path = this.findPath(unit, target);
      unit.repath = 0.85 + (unit.id % 5) * 0.07;
    }
    const waypoint = unit.path[0];
    if (!waypoint) return;
    const distance = dist(unit, waypoint);
    const speed =
      unit.kind === 'worker' ? 2.3 : unit.kind === 'marine' ? 2.45 : 2.25;
    const step = Math.min(distance, speed * dt);
    if (distance > 0.001) {
      const nx = unit.x + ((waypoint.x - unit.x) / distance) * step;
      const ny = unit.y + ((waypoint.y - unit.y) / distance) * step;
      if (this.walkable(nx, ny)) {
        unit.x = nx;
        unit.y = ny;
        unit.moving = true;
        unit.facing = Math.atan2(waypoint.y - unit.y, waypoint.x - unit.x);
      } else {
        unit.path = [];
        unit.repath = 0;
      }
    }
    if (distance <= Math.max(0.12, step)) unit.path.shift();
  }
  private setOrder(unit: Unit, order: Order) {
    unit.order = order;
    unit.path = [];
    unit.repath = 0;
    unit.mineTime = 0;
  }
  private harvest(unit: Unit, deposit: Mineral) {
    this.setOrder(unit, {
      kind: 'harvest',
      x: deposit.x,
      y: deposit.y,
      target: deposit.id,
    });
    unit.returning = unit.cargo > 0;
  }
  private selectedUnits() {
    return this.friendlyUnits().filter(
      (unit) => !unit.garrison && this.selected.has(unit.id),
    );
  }

  command(command: Command) {
    if (command === 'army' || command === 'workers') {
      this.selected = new Set(
        this.friendlyUnits()
          .filter((unit) =>
            command === 'army'
              ? unit.kind === 'marine' && !unit.garrison
              : unit.kind === 'worker',
          )
          .map((unit) => unit.id),
      );
      this.commands.selection += 1;
      this.buildMode = null;
      return;
    }
    if (command === 'barracks' || command === 'turret' || command === 'depot') {
      if (!this.selectedUnits().some((unit) => unit.kind === 'worker')) {
        this.say('일꾼을 먼저 선택하세요. Q: 모든 일꾼');
        return;
      }
      if (
        command === 'barracks' &&
        !this.buildings.some(
          (b) => b.kind === 'depot' && b.progress >= 1 && b.hp > 0 && !b.enemy,
        )
      ) {
        this.say('서플라이 디포를 먼저 완성하세요. V: 보급고');
        return;
      }
      if (
        command === 'turret' &&
        !this.buildings.some(
          (b) =>
            b.kind === 'barracks' && b.progress >= 1 && b.hp > 0 && !b.enemy,
        )
      ) {
        this.say('벙커를 지으려면 배럭이 필요합니다.');
        return;
      }
      if (this.minerals < buildingCost[command]) {
        this.say('광물이 부족합니다. 일꾼에게 광맥을 우클릭하세요.');
        return;
      }
      this.buildMode = command;
      this.assaultMode = false;
      this.say(
        `${command === 'barracks' ? '배럭' : command === 'depot' ? '서플라이 디포' : '벙커'} 위치를 좌클릭하세요. 우클릭 취소`,
      );
      return;
    }
    if (command === 'marine' || command === 'worker') {
      const kind = command === 'marine' ? 'barracks' : 'headquarters';
      const source =
        this.buildings.find(
          (building) =>
            !building.enemy &&
            building.kind === kind &&
            building.progress >= 1 &&
            alive(building) &&
            this.selected.has(building.id),
        ) ??
        this.buildings.find(
          (building) =>
            !building.enemy &&
            building.kind === kind &&
            building.progress >= 1 &&
            alive(building),
        );
      if (!source) {
        this.say(
          command === 'marine'
            ? '완성된 병영이 필요합니다.'
            : '지휘 기지가 필요합니다.',
        );
        return;
      }
      if (source.queue.length >= 5) {
        this.say('생산 대기열은 최대 5명입니다.');
        return;
      }
      if (
        this.friendlyUnits().length +
          this.buildings.reduce(
            (sum, building) =>
              sum + (building.enemy ? 0 : building.queue.length),
            0,
          ) >=
        this.supplyCap()
      ) {
        this.say('보급이 부족합니다. 서플라이 디포를 건설하세요.');
        return;
      }
      if (this.minerals < unitCost[command]) {
        this.say('광물이 부족합니다.');
        return;
      }
      this.minerals -= unitCost[command];
      this.spent += unitCost[command];
      source.queue.push(command);
      this.commands.train += 1;
      this.say(`${command === 'marine' ? '해병' : '일꾼'} 생산 예약`);
      return;
    }
    if (command === 'unload') {
      for (const building of this.buildings)
        if (
          this.selected.has(building.id) &&
          building.kind === 'turret' &&
          !building.enemy
        )
          this.unload(building);
      return;
    }
    if (command === 'assault') {
      this.assaultMode = true;
      this.buildMode = null;
      this.say('공격 이동: 목적지를 우클릭하세요.');
      return;
    }
    for (const unit of this.selectedUnits())
      this.setOrder(unit, {
        kind: command === 'hold' ? 'hold' : 'idle',
        x: unit.x,
        y: unit.y,
      });
    this.buildMode = null;
    this.assaultMode = false;
  }

  canBuild(kind: 'barracks' | 'turret' | 'depot', point: Point) {
    const size = kind === 'barracks' ? 1.05 : kind === 'depot' ? 0.8 : 0.72;
    if (!this.isVisible(point)) return false;
    if (
      this.units.some(
        (unit) =>
          alive(unit) &&
          !unit.garrison &&
          Math.abs(unit.x - point.x) < size + 0.3 &&
          Math.abs(unit.y - point.y) < size + 0.3,
      )
    )
      return false;
    for (let y = point.y - size; y <= point.y + size; y += 0.4)
      for (let x = point.x - size; x <= point.x + size; x += 0.4)
        if (!this.walkable(x, y)) return false;
    return !this.buildings.some(
      (building) =>
        alive(building) &&
        Math.abs(building.x - point.x) < building.size + size + 0.5 &&
        Math.abs(building.y - point.y) < building.size + size + 0.5,
    );
  }
  private placeBuilding(point: Point) {
    const kind = this.buildMode;
    if (!kind) return;
    const spot = { x: Math.floor(point.x) + 0.5, y: Math.floor(point.y) + 0.5 };
    const workers = this.selectedUnits()
      .filter((unit) => unit.kind === 'worker')
      .sort(
        (a, b) =>
          Number(a.order.kind === 'build') - Number(b.order.kind === 'build') ||
          dist(a, spot) - dist(b, spot),
      );
    const worker = workers[0];
    if (!worker || this.minerals < buildingCost[kind]) return;
    if (!this.canBuild(kind, spot)) {
      this.say('장애물과 건물에서 떨어진 밝은 지형에 지으세요.');
      return;
    }
    this.minerals -= buildingCost[kind];
    this.spent += buildingCost[kind];
    const building = this.addBuilding(kind, spot.x, spot.y, false, false);
    this.setOrder(worker, {
      kind: 'build',
      x: spot.x,
      y: spot.y,
      target: building.id,
    });
    this.buildMode = null;
    this.commands.build += 1;
    this.effect('build', spot);
  }
  private hitEntity(screen: Point, enemy = false) {
    const scale = this.camera.zoom / 35;
    // Match the visible sprite, including its raised body, rather than only its feet.
    const units = this.units
      .filter((unit) => {
        if (
          unit.enemy !== enemy ||
          !alive(unit) ||
          unit.garrison ||
          (enemy && !this.isVisible(unit))
        )
          return false;
        const at = project(unit, this.camera, this.aspect);
        return (
          Math.abs(at.x - screen.x) <= scale * 0.85 &&
          screen.y >= at.y - scale * this.aspect * 1.7 &&
          screen.y <= at.y + scale * this.aspect * 0.22
        );
      })
      .sort((a, b) => b.x + b.y - a.x - a.y);
    if (units[0]) return units[0];
    const point = unproject(screen, this.camera, this.aspect);
    return this.buildings
      .filter(
        (building) =>
          building.enemy === enemy &&
          alive(building) &&
          (!enemy || this.isVisible(building)),
      )
      .sort((a, b) => b.x + b.y - a.x - a.y)
      .find((building) => {
        if (
          Math.abs(building.x - point.x) <= building.size + 0.45 &&
          Math.abs(building.y - point.y) <= building.size + 0.45
        )
          return true;
        const at = project(building, this.camera, this.aspect);
        return (
          Math.abs(at.x - screen.x) < scale * building.size * 1.7 &&
          screen.y >
            at.y -
              scale *
                this.aspect *
                (building.kind === 'headquarters' ? 3.2 : 2.1) &&
          screen.y < at.y
        );
      });
  }
  private issue(point: Point, screen?: Point) {
    const targetPoint = {
      x: clamp(point.x, 0.5, MAP_W - 0.5),
      y: clamp(point.y, 0.5, MAP_H - 0.5),
    };
    const workers = this.selectedUnits();
    const deposit = this.deposits.find((node) => {
      if (node.amount <= 0) return false;
      if (dist(node, targetPoint) < 1.15) return true;
      if (!screen || !this.isVisible(node)) return false;
      const at = project(node, this.camera, this.aspect),
        scale = this.camera.zoom / 35;
      return (
        Math.abs(at.x - screen.x) < scale * 1.25 &&
        screen.y >= at.y - scale * this.aspect * 1.9 &&
        screen.y <= at.y + scale * this.aspect * 0.2
      );
    });
    const enemy =
      (screen ? this.hitEntity(screen, true) : undefined) ??
      [...this.units, ...this.buildings].find(
        (entity) =>
          entity.enemy &&
          alive(entity) &&
          this.isVisible(entity) &&
          dist(entity, targetPoint) <
            ('size' in entity ? entity.size + 0.5 : 0.8),
      );
    const hit = screen ? this.hitEntity(screen) : undefined;
    const construction =
      hit && 'size' in hit && hit.progress < 1
        ? hit
        : this.buildings.find(
            (building) =>
              !building.enemy &&
              building.progress < 1 &&
              alive(building) &&
              dist(building, targetPoint) < building.size + 0.6,
          );
    workers.forEach((unit, index) => {
      if (
        unit.kind === 'marine' &&
        hit &&
        'size' in hit &&
        hit.kind === 'turret' &&
        hit.progress >= 1
      ) {
        this.setOrder(unit, {
          kind: 'enter',
          x: hit.x,
          y: hit.y,
          target: hit.id,
        });
      } else if (unit.kind === 'worker' && deposit) {
        this.harvest(unit, deposit);
        this.commands.harvest += 1;
      } else if (unit.kind === 'worker' && construction)
        this.setOrder(unit, {
          kind: 'build',
          x: construction.x,
          y: construction.y,
          target: construction.id,
        });
      else if (enemy) {
        this.setOrder(unit, {
          kind: 'attack',
          x: enemy.x,
          y: enemy.y,
          target: enemy.id,
        });
        this.commands.attack += 1;
      } else {
        const columns = Math.ceil(Math.sqrt(workers.length));
        const destination = {
          x: targetPoint.x + ((index % columns) - (columns - 1) / 2) * 0.55,
          y:
            targetPoint.y +
            (Math.floor(index / columns) - (columns - 1) / 2) * 0.55,
        };
        this.setOrder(unit, {
          kind: this.assaultMode ? 'attackMove' : 'move',
          ...destination,
        });
        if (this.assaultMode) this.commands.attackMove += 1;
        else this.commands.move += 1;
      }
    });
    if (workers.length === 0)
      for (const building of this.buildings)
        if (!building.enemy && this.selected.has(building.id))
          building.rally = targetPoint;
    this.assaultMode = false;
    this.effect('command', targetPoint);
  }

  private pointerInput(pointer: PointerInput) {
    this.aspect = Math.max(0.5, pointer.aspect || this.aspect);
    this.pointer = { x: pointer.x, y: pointer.y };
    if (pointer.scroll)
      this.camera.zoom = clamp(
        this.camera.zoom - pointer.scroll * 0.001,
        0.72,
        1.65,
      );
    const minimap = inRect(pointer, MINIMAP);
    const mapPoint = {
      x: ((pointer.x - MINIMAP.x) / MINIMAP.w) * MAP_W,
      y: ((pointer.y - MINIMAP.y) / MINIMAP.h) * MAP_H,
    };
    if (pointer.primaryPressed) {
      const button = BUTTONS.find((entry) => inRect(pointer, entry));
      if (button) this.command(button.command);
      else if (minimap) {
        this.camera.x = clamp(mapPoint.x, 1, MAP_W - 1);
        this.camera.y = clamp(mapPoint.y, 1, MAP_H - 1);
      } else if (pointer.y < HUD_TOP) {
        if (this.buildMode)
          this.placeBuilding(unproject(pointer, this.camera, this.aspect));
        else
          this.drag = { start: { ...this.pointer }, end: { ...this.pointer } };
      }
    }
    if (this.drag && pointer.primary) this.drag.end = { ...this.pointer };
    if (pointer.primaryReleased && this.drag) {
      const drag = this.drag;
      this.drag = null;
      if (dist(drag.start, this.pointer) < 0.012) {
        const target = this.hitEntity(this.pointer);
        this.selected = new Set(target ? [target.id] : []);
      } else {
        const left = Math.min(drag.start.x, this.pointer.x),
          right = Math.max(drag.start.x, this.pointer.x);
        const top = Math.min(drag.start.y, this.pointer.y),
          bottom = Math.max(drag.start.y, this.pointer.y);
        this.selected = new Set(
          this.friendlyUnits()
            .filter((unit) => {
              const screen = project(unit, this.camera, this.aspect);
              return (
                screen.x >= left &&
                screen.x <= right &&
                screen.y >= top &&
                screen.y <= bottom
              );
            })
            .map((unit) => unit.id),
        );
      }
      this.commands.selection += 1;
    }
    if (pointer.secondaryPressed) {
      if (this.buildMode) {
        this.buildMode = null;
        return;
      }
      if (minimap) this.issue(mapPoint);
      else if (pointer.y < HUD_TOP)
        this.issue(unproject(pointer, this.camera, this.aspect), pointer);
    }
  }

  private acquire(source: Point & { enemy: boolean }, range: number) {
    const targets = [...this.units, ...this.buildings].filter(
      (entity) =>
        entity.enemy !== source.enemy &&
        alive(entity) &&
        !('garrison' in entity && entity.garrison) &&
        (source.enemy || this.isVisible(entity)) &&
        dist(source, entity) <= range + ('size' in entity ? entity.size : 0),
    );
    return targets.sort((a, b) => dist(source, a) - dist(source, b))[0];
  }
  private shoot(
    source: Point & { enemy: boolean },
    target: Unit | Building,
    damage: number,
  ) {
    this.audioCues.shot += 1;
    this.projectiles.push({
      x: source.x,
      y: source.y,
      fromX: source.x,
      fromY: source.y,
      target: target.id,
      enemy: source.enemy,
      damage,
      life: 1,
    });
  }
  private hurt(target: Unit | Building, damage: number) {
    if (this.phase !== 'playing') return;
    this.audioCues.hit += 1;
    target.hp = Math.max(0, target.hp - damage);
    target.flash = 0.12;
    this.effect(target.hp === 0 ? 'blast' : 'impact', target, target.enemy);
    if (target.hp === 0) {
      this.audioCues.explosion += 1;
      this.selected.delete(target.id);
      if (target.enemy) {
        this.kills += 1;
        this.score += 'size' in target ? 800 : 80;
      }
      if ('size' in target && target.kind === 'turret') this.unload(target);
      if ('kind' in target && target.kind === 'core') {
        this.phase = 'won';
        this.score += 1800 + this.friendlyUnits().length * 40;
        this.say('적 커맨드 센터 파괴. 테란 작전 성공.');
      }
      if ('kind' in target && target.kind === 'headquarters') {
        this.phase = 'lost';
        this.say(
          '지휘 기지를 잃었습니다. 벙커과 병력으로 다음 공격을 막으세요.',
        );
      }
    }
  }

  private worker(unit: Unit, dt: number) {
    if (unit.order.kind === 'build') {
      const building = this.buildings.find(
        (entry) => entry.id === unit.order.target && alive(entry),
      );
      if (!building || building.progress >= 1) {
        const deposit = this.deposits
          .filter((entry) => entry.amount > 0)
          .sort((a, b) => dist(unit, a) - dist(unit, b))[0];
        if (deposit) this.harvest(unit, deposit);
        return;
      }
      if (dist(unit, building) <= Math.max(2.2, building.size + 1.15)) {
        building.progress = Math.min(
          1,
          building.progress + dt / building.buildTime,
        );
        building.hp = Math.min(
          building.maxHp,
          building.hp + (dt / building.buildTime) * building.maxHp * 0.65,
        );
        if (building.progress >= 1) {
          this.score += 80;
          this.audioCues.ability += 1;
          this.say(
            `${building.kind === 'barracks' ? '배럭' : building.kind === 'depot' ? '서플라이 디포' : '벙커'} 완성`,
          );
        }
      } else this.travel(unit, building, dt);
      return;
    }
    const deposit = this.deposits.find(
      (entry) => entry.id === unit.order.target,
    );
    const hq = this.buildings.find(
      (entry) => entry.kind === 'headquarters' && alive(entry),
    );
    if (!deposit || !hq || (deposit.amount === 0 && !unit.cargo)) {
      this.setOrder(unit, { kind: 'idle', x: unit.x, y: unit.y });
      return;
    }
    if (unit.returning) {
      if (dist(unit, hq) <= hq.size + 1.6) {
        this.minerals += unit.cargo;
        this.gathered += unit.cargo;
        this.score += unit.cargo;
        this.audioCues.pickup += 1;
        unit.cargo = 0;
        unit.returning = false;
        unit.path = [];
        unit.repath = 0;
        this.effect('deposit', hq);
      } else this.travel(unit, hq, dt);
    } else if (dist(unit, deposit) <= 1.35) {
      unit.mineTime += dt;
      if (unit.mineTime >= 1.25) {
        unit.cargo = Math.min(8, deposit.amount);
        deposit.amount -= unit.cargo;
        unit.mineTime = 0;
        unit.returning = true;
        unit.path = [];
        unit.repath = 0;
      }
    } else this.travel(unit, deposit, dt);
  }

  step(dt: number, input: Input) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const delta = Math.min(dt, 1 / 30);
    this.time += delta;
    this.messageTime = Math.max(0, this.messageTime - delta);
    if (input.right2 && !this.lastInput.right2) this.command('hold');
    if (input.jump2 && !this.lastInput.jump2) this.command('stop');
    if (input.switch && !this.lastInput.switch) this.command('army');
    if (input.ultimate && !this.lastInput.ultimate) this.command('workers');
    if (input.left2 && !this.lastInput.left2) this.command('depot');
    if (input.special && !this.lastInput.special) this.command('barracks');
    if (input.guard && !this.lastInput.guard) this.command('turret');
    if (input.interact && !this.lastInput.interact) this.command('marine');
    if (input.reload && !this.lastInput.reload) this.command('worker');
    if (input.attack && !this.lastInput.attack) this.command('assault');
    if (input.jump && !this.lastInput.jump) {
      this.camera.x = BASE.x + 2;
      this.camera.y = BASE.y - 3;
    }
    const panX = Number(input.right) - Number(input.left),
      panY = Number(input.down) - Number(input.up);
    this.camera.x = clamp(this.camera.x + (panX + panY) * delta * 7, 0, MAP_W);
    this.camera.y = clamp(this.camera.y + (panY - panX) * delta * 7, 0, MAP_H);
    if (input.pointer) this.pointerInput(input.pointer);
    this.lastInput = { ...input };
    this.visionTimer -= delta;
    if (this.visionTimer <= 0) {
      this.updateVision();
      this.visionTimer = 0.12;
    }
    this.waveTimer -= delta;
    if (this.waveTimer <= 0) {
      this.waves += 1;
      this.waveTimer = 22;
      for (let index = 0; index < 3 + Math.min(this.waves, 3); index += 1) {
        const unit = this.addUnit('raider', 23 + index * 0.6, 8.4, true);
        this.setOrder(unit, { kind: 'attackMove', ...BASE });
      }
      this.say(`적 습격 ${this.waves}차! 기지 방어 병력을 확인하세요.`);
    }
    for (const building of this.buildings) {
      if (!alive(building)) continue;
      building.cooldown = Math.max(0, building.cooldown - delta);
      building.flash = Math.max(0, building.flash - delta);
      if (building.progress < 1) continue;
      if (building.queue.length && this.supplyUsed() < this.supplyCap()) {
        building.trainTime += delta;
        const duration = building.queue[0] === 'marine' ? 2.4 : 3;
        if (building.trainTime >= duration) {
          const kind = building.queue.shift()!;
          building.trainTime = 0;
          const candidates = [
            { x: building.x + building.size + 0.7, y: building.y },
            { x: building.x, y: building.y + building.size + 0.7 },
            { x: building.x - building.size - 0.7, y: building.y },
          ];
          for (let radius = 2; radius <= 5; radius += 1)
            for (let side = 0; side < 8; side += 1)
              candidates.push({
                x:
                  Math.floor(
                    building.x + Math.cos((side * Math.PI) / 4) * radius,
                  ) + 0.5,
                y:
                  Math.floor(
                    building.y + Math.sin((side * Math.PI) / 4) * radius,
                  ) + 0.5,
              });
          const spawn = candidates.find((point) =>
            this.walkable(point.x, point.y),
          );
          if (!spawn) {
            building.queue.unshift(kind);
            building.trainTime = duration;
            continue;
          }
          const unit = this.addUnit(kind, spawn.x, spawn.y);
          if (kind === 'worker') {
            const deposit = this.deposits
              .filter((entry) => entry.amount > 0)
              .sort((a, b) => dist(unit, a) - dist(unit, b))[0];
            if (deposit) this.harvest(unit, deposit);
          } else this.setOrder(unit, { kind: 'attackMove', ...building.rally });
        }
      }
      if (building.kind === 'turret' && this.occupants(building).length > 0) {
        const target = this.acquire(building, 5);
        if (target && building.cooldown === 0) {
          this.shoot(building, target, 6 * this.occupants(building).length);
          building.cooldown = 0.62;
        }
      }
    }
    for (const unit of this.units) {
      if (!alive(unit) || unit.garrison) continue;
      unit.moving = false;
      unit.repath -= delta;
      unit.cooldown = Math.max(0, unit.cooldown - delta);
      unit.flash = Math.max(0, unit.flash - delta);
      if (unit.order.kind === 'enter') {
        const bunker = this.buildings.find(
          (b) => b.id === unit.order.target && b.hp > 0 && b.progress >= 1,
        );
        if (!bunker || this.occupants(bunker).length >= 4)
          this.setOrder(unit, { kind: 'idle', x: unit.x, y: unit.y });
        else if (dist(unit, bunker) < Math.max(2.15, bunker.size + 0.85)) {
          unit.garrison = bunker.id;
          unit.x = bunker.x;
          unit.y = bunker.y;
          this.selected.delete(unit.id);
          unit.path = [];
        } else this.travel(unit, bunker, delta);
        continue;
      }
      if (
        unit.kind === 'worker' &&
        (unit.order.kind === 'harvest' || unit.order.kind === 'build')
      ) {
        this.worker(unit, delta);
        continue;
      }
      const range = unit.kind === 'worker' ? 0.9 : 4;
      let target =
        unit.order.kind === 'attack' && unit.order.target
          ? this.entity(unit.order.target)
          : undefined;
      if (!target && unit.order.kind !== 'move')
        target = this.acquire(unit, unit.enemy ? 7.3 : range);
      if (target) {
        const targetSize = 'size' in target ? target.size : 0;
        if (dist(unit, target) <= range + targetSize) {
          unit.facing = Math.atan2(target.y - unit.y, target.x - unit.x);
          if (unit.cooldown === 0) {
            this.shoot(unit, target, unit.kind === 'worker' ? 5 : 6);
            unit.cooldown = unit.kind === 'marine' ? 0.62 : 0.95;
          }
        } else if (unit.order.kind !== 'hold') this.travel(unit, target, delta);
      } else if (
        unit.order.kind === 'move' ||
        unit.order.kind === 'attackMove' ||
        unit.order.kind === 'attack'
      ) {
        if (dist(unit, unit.order) < 0.8)
          this.setOrder(unit, { kind: 'idle', x: unit.x, y: unit.y });
        else this.travel(unit, unit.order, delta);
      }
    }
    // Mild local separation avoids unreadable stacks without changing path goals.
    for (let index = 0; index < this.units.length; index += 1) {
      const a = this.units[index];
      if (!alive(a) || a.garrison) continue;
      for (let other = index + 1; other < this.units.length; other += 1) {
        const b = this.units[other];
        if (!alive(b) || b.garrison) continue;
        const length = dist(a, b);
        if (length >= 0.47 || length < 0.001) continue;
        const push = Math.min(0.025, (0.47 - length) * delta * 6);
        const dx = ((a.x - b.x) / length) * push,
          dy = ((a.y - b.y) / length) * push;
        if (this.walkable(a.x + dx, a.y + dy)) {
          a.x += dx;
          a.y += dy;
        }
        if (this.walkable(b.x - dx, b.y - dy)) {
          b.x -= dx;
          b.y -= dy;
        }
      }
    }
    for (const projectile of this.projectiles) {
      projectile.life -= delta;
      const target = this.entity(projectile.target);
      if (!target) {
        projectile.life = 0;
        continue;
      }
      const distance = dist(projectile, target),
        step = delta * 28;
      if (distance <= step) {
        this.hurt(target, projectile.damage);
        projectile.life = 0;
      } else {
        projectile.x += ((target.x - projectile.x) / distance) * step;
        projectile.y += ((target.y - projectile.y) / distance) * step;
      }
    }
    this.projectiles = this.projectiles.filter(
      (projectile) => projectile.life > 0,
    );
    this.effects.forEach((effect) => {
      effect.life -= delta;
    });
    this.effects = this.effects.filter((effect) => effect.life > 0);
    if (this.phase === 'playing' && this.time >= 240) {
      this.phase = 'lost';
      this.say('작전 시간이 끝났습니다. 생산한 병력으로 더 일찍 진격하세요.');
    }
  }

  snapshot(): RetroSnapshot {
    const core = this.buildings.find((building) => building.kind === 'core')!;
    const barracks = this.buildings.some(
      (building) =>
        building.kind === 'barracks' &&
        building.progress >= 1 &&
        alive(building),
    );
    const marines = this.friendlyUnits().filter(
      (unit) => unit.kind === 'marine',
    ).length;
    const objective =
      this.phase === 'won'
        ? '적 커맨드 센터 파괴! 테란 작전 성공.'
        : this.phase === 'lost'
          ? '지휘 기지를 지키지 못했습니다. 다시 도전하세요.'
          : !barracks
            ? 'Q 일꾼 선택 → B 병영 건설 · 광물 확보와 기지 방어'
            : marines < 6
              ? 'M 해병 생산 · T 벙커 건설 · 병력 6명 이상을 모으세요'
              : 'F 전투병 선택 → A 공격 이동 → 적 기지 우클릭';
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress:
        this.phase === 'won'
          ? 1
          : Math.min(
              0.95,
              (barracks ? 0.2 : 0) +
                Math.min(marines, 6) / 30 +
                (1 - core.hp / core.maxHp) * 0.55,
            ),
      objective,
      stats: [
        { label: '광물', value: this.minerals },
        { label: '병력', value: `${this.supplyUsed()} / ${this.supplyCap()}` },
        {
          label: '적 핵',
          value: `${Math.ceil((core.hp / core.maxHp) * 100)}%`,
        },
        { label: '습격', value: this.waves },
      ],
    };
  }
}

function click(point: Point, secondary = false): PointerInput {
  return {
    ...idlePointer(),
    ...point,
    aspect: 1.8,
    primary: !secondary,
    primaryPressed: !secondary,
    secondary,
    secondaryPressed: secondary,
  };
}

/** A real build order and attack plan expressed entirely through normal inputs. */
export function benchmarkColony(simulation: ColonySimulation): Input {
  const input = idleInput();
  if (simulation.phase !== 'playing') return input;
  const depot = simulation.buildings.find(
    (b) => b.kind === 'depot' && alive(b),
  );
  const barracks = simulation.buildings.find(
    (b) => b.kind === 'barracks' && alive(b),
  );
  const turret = simulation.buildings.find(
    (b) => b.kind === 'turret' && alive(b),
  );
  const construct = (kind: 'depot' | 'barracks' | 'turret', point: Point) => {
    if (simulation.buildMode !== kind) {
      input.ultimate = true;
      if (kind === 'depot') input.left2 = true;
      else if (kind === 'barracks') input.special = true;
      else input.guard = true;
    } else input.pointer = click(project(point, simulation.camera, 1.8));
  };
  if (!depot) {
    construct('depot', { x: 9.5, y: 20.5 });
    return input;
  }
  if (depot.progress < 1) return input;
  if (!barracks) {
    if (simulation.minerals >= 150) construct('barracks', { x: 10.5, y: 17.5 });
    return input;
  }
  if (barracks.progress >= 1 && !turret) {
    if (simulation.minerals >= 100) construct('turret', { x: 11.5, y: 14.5 });
    return input;
  }
  if (
    turret &&
    turret.progress >= 1 &&
    simulation.occupants(turret).length < 2 &&
    simulation.commands.attackMove === 0
  ) {
    const defenders = simulation
      .friendlyUnits()
      .filter(
        (u) => u.kind === 'marine' && !u.garrison && u.order.kind !== 'enter',
      );
    if (defenders.length) {
      if (!defenders.every((u) => simulation.selected.has(u.id)))
        input.switch = true;
      else input.pointer = click(project(turret, simulation.camera, 1.8), true);
      return input;
    }
  }
  const army = simulation
    .friendlyUnits()
    .filter((unit) => unit.kind === 'marine' && !unit.garrison);
  if (
    barracks.progress >= 1 &&
    simulation.minerals >= 50 &&
    army.length + barracks.queue.length < 12
  )
    input.interact = Math.floor(simulation.time * 8) % 2 === 0;
  const assault = simulation.commands.attackMove > 0;
  if (army.length >= 7 || assault) {
    if (army.some((unit) => !simulation.selected.has(unit.id)))
      input.switch = Math.floor(simulation.time * 8) % 2 === 0;
    else if (
      army.some(
        (unit) =>
          !['attackMove', 'attack', 'idle'].includes(unit.order.kind) ||
          dist(unit.order, ENEMY_BASE) > 8,
      )
    ) {
      if (!simulation.assaultMode) input.attack = true;
      else input.pointer = click(minimapPoint({ x: 23, y: 9.5 }), true);
    } else if (army.length > 0) {
      const center = {
        x: army.reduce((sum, unit) => sum + unit.x, 0) / army.length,
        y: army.reduce((sum, unit) => sum + unit.y, 0) / army.length,
      };
      if (dist(center, simulation.camera) > 3)
        input.pointer = click(minimapPoint(center));
    }
  }
  return input;
}
