import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput, idlePointer } from '../lib/retro/types.ts';
import {
  ColonySimulation,
  benchmarkColony,
} from '../lib/retro/colony/simulation.ts';
import {
  BASE,
  BUTTONS,
  ENEMY_BASE,
  MAP_W,
  minimapPoint,
  project,
  unproject,
} from '../lib/retro/colony/world.ts';
import { mountColony } from '../lib/retro/colony/view.ts';

const FIXED = 1 / 120;
const aspect = 1.8;
const tick = (sim, overrides = {}) =>
  sim.step(FIXED, { ...idleInput(), ...overrides });
function advance(sim, seconds, overrides = {}) {
  for (let i = 0; i < Math.ceil(seconds / FIXED); i += 1) tick(sim, overrides);
}
function pointer(sim, point, overrides = {}) {
  tick(sim, { pointer: { ...idlePointer(), ...point, aspect, ...overrides } });
}
function click(sim, point) {
  pointer(sim, point, { primaryPressed: true, primary: true });
  pointer(sim, point, { primaryReleased: true });
}
function rightClick(sim, point, overrides = {}) {
  tick(sim, {
    ...overrides,
    pointer: {
      ...idlePointer(),
      ...point,
      aspect,
      secondaryPressed: true,
      secondary: true,
    },
  });
}
function button(sim, name) {
  const bounds = BUTTONS.find((entry) => entry.command === name);
  click(sim, { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 });
}
function buildBarracks(sim) {
  tick(sim, { ultimate: true, special: true });
  pointer(sim, project({ x: 10.5, y: 17.5 }, sim.camera, aspect), {
    primary: true,
    primaryPressed: true,
  });
}

test('initial colony has two harvesting workers, an idle builder, defensive troops and unexplored enemy territory', () => {
  const sim = new ColonySimulation();
  assert.equal(sim.phase, 'playing');
  assert.equal(sim.minerals, 220);
  assert.equal(sim.friendlyUnits().length, 5);
  assert.equal(
    sim.units.filter((unit) => unit.order.kind === 'harvest').length,
    2,
  );
  assert.equal(sim.isVisible(BASE), true);
  assert.equal(sim.isVisible(ENEMY_BASE), false);
  assert.equal(
    sim.explored[Math.floor(ENEMY_BASE.y) * MAP_W + Math.floor(ENEMY_BASE.x)],
    0,
  );
  assert.ok(sim.friendlyUnits().every((unit) => sim.walkable(unit.x, unit.y)));
});

test('projection and unprojection preserve command targets across zoom and landscape/portrait aspects', () => {
  for (const a of [0.6, 1, 1.8, 2.5])
    for (const zoom of [0.72, 1, 1.65]) {
      const camera = { x: 13.5, y: 9.2, zoom };
      const point = { x: 21.4, y: 5.2 };
      const result = unproject(project(point, camera, a), camera, a);
      assert.ok(
        Math.abs(result.x - point.x) < 1e-9 &&
          Math.abs(result.y - point.y) < 1e-9,
      );
    }
});

test('clicking a raised unit sprite or a command-center roof selects the visible entity', () => {
  const sim = new ColonySimulation();
  const marine = sim.units.find((unit) => unit.kind === 'marine');
  const foot = project(marine, sim.camera, aspect);
  click(sim, { x: foot.x, y: foot.y - (sim.camera.zoom / 35) * aspect * 1.1 });
  assert.deepEqual([...sim.selected], [marine.id]);
  const hq = sim.buildings.find((entry) => entry.kind === 'headquarters');
  const base = project(hq, sim.camera, aspect);
  click(sim, { x: base.x, y: base.y - (sim.camera.zoom / 35) * aspect * 2.1 });
  assert.deepEqual([...sim.selected], [hq.id]);
});

test('drag selection captures units, and canceling input discards unfinished selection without altering orders', () => {
  const sim = new ColonySimulation();
  pointer(sim, { x: 0.45, y: 0.3 }, { primary: true, primaryPressed: true });
  pointer(sim, { x: 0.53, y: 0.46 }, { primary: true });
  pointer(sim, { x: 0.53, y: 0.46 }, { primaryReleased: true });
  const selected = sim
    .friendlyUnits()
    .filter((unit) => sim.selected.has(unit.id));
  assert.equal(selected.length, 2);
  assert.ok(selected.every((unit) => unit.kind === 'marine'));
  const before = [...sim.selected];
  pointer(sim, { x: 0.1, y: 0.1 }, { primary: true, primaryPressed: true });
  assert.ok(sim.drag);
  sim.clearInput();
  pointer(sim, { x: 0.9, y: 0.7 }, { primaryReleased: true });
  assert.equal(sim.drag, null);
  assert.deepEqual([...sim.selected], before);
});

test('worker right-click mines cargo then deposits actual minerals at headquarters', () => {
  const sim = new ColonySimulation();
  const builder = sim.units.find(
    (unit) => unit.kind === 'worker' && unit.order.kind === 'idle',
  );
  const deposit = sim.deposits[0];
  click(sim, project(builder, sim.camera, aspect));
  const crystal = project(deposit, sim.camera, aspect);
  rightClick(sim, {
    x: crystal.x,
    y: crystal.y - (sim.camera.zoom / 35) * aspect * 1.2,
  });
  assert.equal(builder.order.kind, 'harvest');
  assert.equal(builder.order.target, deposit.id);
  assert.equal(sim.commands.harvest, 1);
  const initial = sim.minerals;
  let carried = false;
  for (let i = 0; i < 14 * 120; i += 1) {
    tick(sim);
    if (builder.cargo > 0) carried = true;
  }
  assert.ok(carried, 'mining produces visible carried cargo');
  assert.ok(deposit.amount < 900);
  assert.ok(sim.gathered > 0 && sim.minerals > initial);
  assert.equal(sim.minerals - initial, sim.gathered);
  assert.ok(sim.audioCues.pickup > 0);
});

test('building placement charges only valid sites and requires a worker to reach and construct the structure', () => {
  const sim = new ColonySimulation();
  tick(sim, { special: true });
  assert.equal(sim.buildMode, null, 'no selection cannot build');
  tick(sim);
  tick(sim, { ultimate: true, special: true });
  assert.equal(sim.buildMode, 'barracks');
  pointer(sim, project(BASE, sim.camera, aspect), {
    primaryPressed: true,
    primary: true,
  });
  assert.equal(sim.buildings.length, 2);
  assert.equal(sim.minerals, 220);
  pointer(sim, project({ x: 10.5, y: 17.5 }, sim.camera, aspect), {
    primaryPressed: true,
    primary: true,
  });
  const barracks = sim.buildings.find(
    (building) => building.kind === 'barracks',
  );
  assert.ok(barracks);
  assert.equal(sim.minerals, 120);
  assert.equal(sim.spent, 100);
  assert.equal(barracks.progress, 0);
  assert.equal(sim.buildMode, null);
  assert.ok(
    sim.units.some(
      (unit) =>
        unit.order.kind === 'build' && unit.order.target === barracks.id,
    ),
  );
  advance(sim, 7);
  assert.equal(barracks.progress, 1);
  assert.equal(barracks.hp, barracks.maxHp);
  assert.equal(sim.audioCues.ability, 1);
  assert.equal(sim.walkable(barracks.x, barracks.y), false);
});

test('construction cannot entomb units and a right-click on a visible enemy sprite orders an attack', () => {
  const sim = new ColonySimulation();
  const marine = sim.units.find((unit) => unit.kind === 'marine');
  assert.equal(sim.canBuild('turret', marine), false);
  const enemy = sim.units.find((unit) => unit.enemy);
  Object.assign(enemy, { x: 11.5, y: 15.5 });
  advance(sim, 0.15);
  button(sim, 'army');
  const body = project(enemy, sim.camera, aspect);
  rightClick(sim, {
    x: body.x,
    y: body.y - (sim.camera.zoom / 35) * aspect * 1.25,
  });
  assert.equal(marine.order.kind, 'attack');
  assert.equal(marine.order.target, enemy.id);
});

test('command HUD buttons produce bounded queues, charge resources once per press and spawn walkable marines', () => {
  const sim = new ColonySimulation();
  button(sim, 'marine');
  assert.equal(
    sim.commands.train,
    0,
    'cannot queue before barracks completion',
  );
  buildBarracks(sim);
  advance(sim, 7);
  const barracks = sim.buildings.find(
    (building) => building.kind === 'barracks',
  );
  sim.minerals = 1000;
  for (let i = 0; i < 7; i += 1) button(sim, 'marine');
  assert.equal(barracks.queue.length, 5);
  assert.equal(sim.commands.train, 5);
  assert.equal(sim.spent, 100 + 35 * 5);
  const count = sim.friendlyUnits().length;
  advance(sim, 2.5);
  assert.equal(sim.friendlyUnits().length, count + 1);
  assert.equal(barracks.queue.length, 4);
  const newest = sim.friendlyUnits().at(-1);
  assert.equal(newest.kind, 'marine');
  assert.ok(sim.walkable(newest.x, newest.y));
  assert.equal(newest.order.kind, 'attackMove');
});

test('held production hotkey cannot repeatedly charge resources and clearInput resets the edge', () => {
  const sim = new ColonySimulation();
  advance(sim, 0.25, { reload: true });
  assert.equal(sim.commands.train, 1);
  sim.clearInput();
  tick(sim, { reload: true });
  assert.equal(sim.commands.train, 2);
});

test('A* goes around blocked rock cells and units traverse the route without entering obstacles', () => {
  const sim = new ColonySimulation();
  const from = { x: 10.5, y: 12.5 },
    to = { x: 17.5, y: 14.5 };
  const path = sim.findPath(from, to);
  assert.ok(path.length > 8, 'route must detour around the central ridge');
  let previous = from;
  for (const point of path) {
    assert.ok(sim.walkable(point.x, point.y));
    const dx = point.x - previous.x,
      dy = point.y - previous.y;
    if (Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5) {
      assert.ok(sim.walkable(previous.x + dx, previous.y));
      assert.ok(sim.walkable(previous.x, previous.y + dy));
    }
    previous = point;
  }
  const marine = sim.units.find((unit) => unit.kind === 'marine');
  Object.assign(marine, from);
  click(sim, project(marine, sim.camera, aspect));
  rightClick(sim, minimapPoint(to));
  assert.equal(marine.order.kind, 'move');
  for (let i = 0; i < 16 * 120; i += 1) {
    tick(sim);
    assert.ok(
      sim.walkable(marine.x, marine.y),
      `unit crossed a blocked footprint at ${marine.x}, ${marine.y}`,
    );
  }
  assert.ok(Math.hypot(marine.x - to.x, marine.y - to.y) < 1);
});

test('minimap clicks pan the camera and issue world-space group orders without selecting HUD elements', () => {
  const sim = new ColonySimulation();
  button(sim, 'army');
  const selected = [...sim.selected];
  click(sim, minimapPoint({ x: 21, y: 9 }));
  assert.ok(
    Math.abs(sim.camera.x - 21) < 1e-9 && Math.abs(sim.camera.y - 9) < 1e-9,
  );
  assert.deepEqual([...sim.selected], selected);
  rightClick(sim, minimapPoint(ENEMY_BASE), { attack: true });
  assert.equal(sim.commands.attackMove, 2);
  assert.ok(
    sim
      .friendlyUnits()
      .filter((unit) => unit.kind === 'marine')
      .every((unit) => unit.order.kind === 'attackMove'),
  );
  assert.equal(sim.assaultMode, false);
});

test('fog reveals traveled territory but keeps it explored after units leave', () => {
  const sim = new ColonySimulation();
  const marine = sim.units.find((unit) => unit.kind === 'marine');
  const destination = { x: 21.5, y: 15.5 };
  Object.assign(marine, destination);
  advance(sim, 0.15);
  assert.equal(sim.isVisible(destination), true);
  const index = Math.floor(destination.y) * MAP_W + Math.floor(destination.x);
  Object.assign(marine, { x: 8.5, y: 14.3 });
  advance(sim, 0.15);
  assert.equal(sim.isVisible(destination), false);
  assert.equal(sim.explored[index], 1);
});

test('range, targeting, projectile travel and return fire determine combat damage', () => {
  const sim = new ColonySimulation();
  const marine = sim.units.find((unit) => unit.kind === 'marine');
  const enemy = sim.units.find((unit) => unit.enemy);
  Object.assign(enemy, { x: 16, y: 16 });
  advance(sim, 0.15);
  assert.equal(marine.hp, marine.maxHp);
  assert.equal(enemy.hp, enemy.maxHp);
  Object.assign(enemy, { x: marine.x + 3, y: marine.y });
  advance(sim, 0.2);
  assert.ok(sim.audioCues.shot > 0);
  assert.ok(
    enemy.hp < enemy.maxHp,
    'friendly pulse rifles damage a visible enemy',
  );
  assert.ok(
    sim.friendlyUnits().some((unit) => unit.hp < unit.maxHp),
    'enemy returns fire rather than being a passive target',
  );
  advance(sim, 2);
  assert.equal(enemy.hp, 0);
  assert.ok(sim.kills >= 1 && sim.audioCues.explosion >= 1);
});

test('enemy waves spawn on schedule with attack orders toward headquarters', () => {
  const sim = new ColonySimulation();
  advance(sim, 22.1);
  assert.equal(sim.waves, 1);
  const wave = sim.units.filter(
    (unit) => unit.enemy && unit.order.kind === 'attackMove',
  );
  assert.equal(wave.length, 4);
  assert.ok(
    wave.every((unit) => unit.order.x === BASE.x && unit.order.y === BASE.y),
  );
  advance(sim, 25);
  assert.ok(sim.audioCues.hit > 0, 'waves reach the defended colony and fight');
});

test('benchmark reads simulation state and returns only ordinary input, including legal pointer commands', () => {
  const sim = new ColonySimulation();
  for (let tickNo = 0; tickNo < 4 * 120; tickNo += 1) {
    const before = JSON.stringify(sim);
    const input = benchmarkColony(sim);
    assert.equal(JSON.stringify(sim), before);
    assert.deepEqual(
      Object.keys(input)
        .filter((key) => key !== 'pointer')
        .sort(),
      Object.keys(idleInput()).sort(),
    );
    assert.ok(
      Object.entries(input)
        .filter(([key]) => key !== 'pointer')
        .every(([, value]) => typeof value === 'boolean'),
    );
    if (input.pointer) {
      assert.ok(
        Number.isFinite(input.pointer.x) && Number.isFinite(input.pointer.y),
      );
      assert.ok(
        input.pointer.x >= 0 &&
          input.pointer.x <= 1 &&
          input.pointer.y >= 0 &&
          input.pointer.y <= 1,
      );
    }
    sim.step(FIXED, input);
  }
});

test('normal build-order benchmark wins through economy, production and battle at 30/60/120 Hz render schedules', () => {
  const results = [];
  for (const frameRate of [30, 60, 120]) {
    const sim = new ColonySimulation();
    let accumulator = 0;
    for (
      let frame = 0;
      frame < frameRate * 90 && sim.phase === 'playing';
      frame += 1
    ) {
      accumulator += 1 / frameRate;
      while (accumulator >= FIXED - 1e-10 && sim.phase === 'playing') {
        sim.step(FIXED, benchmarkColony(sim));
        accumulator -= FIXED;
      }
    }
    assert.equal(
      sim.phase,
      'won',
      `${frameRate} Hz must complete using regular input`,
    );
    assert.equal(
      sim.buildings.find((building) => building.kind === 'core').hp,
      0,
    );
    assert.ok(
      sim.buildings.find((building) => building.kind === 'headquarters').hp > 0,
    );
    assert.equal(sim.commands.build, 2);
    assert.ok(sim.commands.train >= 5 && sim.commands.attackMove > 0);
    assert.ok(sim.gathered >= 200 && sim.kills > 2 && sim.waves >= 1);
    assert.ok(sim.time >= 20 && sim.time < 90);
    assert.equal(sim.snapshot().progress, 1);
    results.push(sim.time);
  }
  assert.ok(Math.max(...results) - Math.min(...results) < 0.01);
});

test('victory and headquarters destruction are terminal; depleted fields do not crash worker production', () => {
  const won = new ColonySimulation();
  while (won.phase === 'playing' && won.time < 90)
    won.step(FIXED, benchmarkColony(won));
  const before = JSON.stringify(won);
  advance(won, 1, { switch: true, interact: true, right: true });
  assert.equal(JSON.stringify(won), before);
  const lost = new ColonySimulation();
  const hq = lost.buildings.find(
    (building) => building.kind === 'headquarters',
  );
  hq.hp = 1;
  lost.projectiles.push({
    x: hq.x,
    y: hq.y,
    fromX: hq.x,
    fromY: hq.y,
    target: hq.id,
    enemy: true,
    damage: 2,
    life: 1,
  });
  tick(lost);
  assert.equal(lost.phase, 'lost');
  const after = JSON.stringify(lost);
  advance(lost, 1, { ultimate: true, reload: true });
  assert.equal(JSON.stringify(lost), after);
  const empty = new ColonySimulation();
  empty.deposits.forEach((deposit) => {
    deposit.amount = 0;
  });
  tick(empty, { reload: true });
  advance(empty, 3.1);
  assert.equal(
    empty.friendlyUnits().filter((unit) => unit.kind === 'worker').length,
    4,
  );
});

test('canvas view has a populated first frame, caps DPR, reports real draw operations and disposes safely for restart', () => {
  const calls = [];
  const context = new Proxy(
    {},
    {
      get(target, key) {
        if (key in target) return target[key];
        if (key === 'measureText')
          return (value) => ({ width: value.length * 7 });
        return (...args) => {
          calls.push([key, ...args]);
        };
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    },
  );
  const canvas = { width: 0, height: 0, getContext: () => context };
  const dpr = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio');
  Object.defineProperty(globalThis, 'devicePixelRatio', {
    value: 3,
    configurable: true,
  });
  try {
    const sim = new ColonySimulation();
    const view = mountColony(canvas, sim);
    const before = JSON.stringify(sim);
    view.render(1000, 550);
    assert.equal(canvas.width, 1500);
    assert.equal(canvas.height, 825);
    assert.equal(
      JSON.stringify(sim),
      before,
      'drawing cannot advance the simulation',
    );
    assert.ok(view.metrics().entities >= 6);
    assert.ok(view.metrics().drawCalls > 700);
    assert.ok(
      calls.some(([name, label]) => name === 'fillText' && label === '병영'),
    );
    view.dispose();
    view.dispose();
    const count = calls.length;
    view.render(1000, 550);
    assert.equal(calls.length, count);
    const restarted = mountColony(canvas, new ColonySimulation());
    restarted.render(1000, 550);
    assert.ok(restarted.metrics().entities >= 6);
    restarted.dispose();
  } finally {
    if (dpr) Object.defineProperty(globalThis, 'devicePixelRatio', dpr);
    else delete globalThis.devicePixelRatio;
  }
});
