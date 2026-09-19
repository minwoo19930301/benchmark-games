import test from 'node:test';
import assert from 'node:assert/strict';
import { idleInput } from '../lib/retro/types.ts';
import { mountPocket } from '../lib/retro/pocket/renderer.ts';
import {
  PocketSimulation,
  benchmarkInput,
  typeMultiplier,
  terrainAt,
  species,
  CLINIC,
  RIVAL,
} from '../lib/retro/pocket/simulation.ts';

const buttons = (held = {}) => ({ ...idleInput(), ...held });
function advance(game, seconds, held = {}, hz = 120) {
  for (let frame = 0; frame < Math.ceil(seconds * hz); frame++)
    game.step(1 / hz, buttons(held));
}
function wildBattle() {
  const game = new PocketSimulation();
  for (let frame = 0; frame < 600 && game.mode === 'world'; frame++)
    game.step(1 / 120, buttons({ up: true }));
  assert.equal(
    game.mode,
    'battle',
    'walking through real tall grass starts an encounter',
  );
  advance(game, 0.7);
  return game;
}
function ready(game) {
  for (let frame = 0; frame < 240 && game.battle?.cooldown > 0; frame++)
    game.step(1 / 120, idleInput());
}

test('Pocket route has distinct traversable grass, clinic, water, and map boundaries', () => {
  assert.equal(terrainAt(8, 6), 'grass');
  assert.equal(terrainAt(3, 9), 'house');
  assert.equal(terrainAt(15, 6), 'water');
  assert.equal(terrainAt(-1, 5), 'tree');
  const game = new PocketSimulation();
  advance(game, 0.2, { up: true });
  assert.ok(game.player.y < 11.4);
  assert.ok(game.player.walk > 0);
  assert.equal(game.player.facing, 'up');
  game.player.x = 13.5;
  game.player.y = 6.5;
  advance(game, 2, { right: true });
  assert.ok(
    game.player.x < 13.81,
    'water blocks the character body, not only its center',
  );
  assert.equal(game.mode, 'world');
});

test('standing in grass never spawns encounters; walking does, deterministically', () => {
  const standing = new PocketSimulation();
  standing.player.x = 8.5;
  standing.player.y = 6.5;
  advance(standing, 20);
  assert.equal(standing.encounters, 0);
  const a = wildBattle(),
    b = wildBattle();
  assert.equal(a.battle.id, 'dokkaebud');
  assert.equal(a.encounters, 1);
  assert.deepEqual(a, b);
});

test('ember, leaf, water form a complete type advantage triangle used by combat', () => {
  for (const [strong, weak] of [
    ['ember', 'leaf'],
    ['leaf', 'water'],
    ['water', 'ember'],
  ]) {
    assert.ok(typeMultiplier(strong, weak) > 1);
    assert.ok(typeMultiplier(weak, strong) < 1);
    assert.equal(typeMultiplier(strong, strong), 1);
  }
  const basic = wildBattle(),
    strong = wildBattle(),
    weak = wildBattle();
  weak.party[0] = { id: 'puddleot', hp: species.puddleot.maxHp };
  basic.step(1 / 120, buttons({ attack: true }));
  strong.step(1 / 120, buttons({ special: true }));
  weak.step(1 / 120, buttons({ special: true }));
  assert.equal(basic.battle.hp, 17);
  assert.equal(strong.battle.hp, 6);
  assert.equal(weak.battle.hp, 17);
  assert.ok(strong.battle.hp < weak.battle.hp);
  assert.match(strong.message, /Super effective/);
  assert.match(weak.message, /Not very effective/);
  assert.equal(strong.pal.hp, 34, 'a surviving foe answers exactly once');
  assert.equal(weak.pal.hp, 29, 'enemy attacks also obey type matchups');
});

test('held battle actions have a turn cooldown instead of attacking each simulation tick', () => {
  const game = wildBattle();
  game.step(1 / 120, buttons({ attack: true }));
  assert.equal(game.battle.turn, 1);
  advance(game, 0.5, { attack: true });
  assert.equal(game.battle.turn, 1);
  assert.equal(game.battle.hp, 17);
  advance(game, 0.25, { attack: true });
  assert.equal(game.battle.turn, 2);
  assert.equal(game.battle.hp, 10);
});

test('capture requires at most 45% HP, spends an orb, and adds a living unique teammate', () => {
  const game = wildBattle();
  game.battle.hp = game.battle.maxHp * 0.5;
  game.step(1 / 120, buttons({ guard: true }));
  assert.equal(game.balls, 5);
  assert.equal(game.caught.length, 0);
  assert.equal(game.battle.outcome, null);
  assert.equal(game.battle.turn, 1);
  ready(game);
  game.battle.hp = game.battle.maxHp * 0.45;
  const hpBeforeCapture = game.pal.hp;
  game.step(1 / 120, buttons({ guard: true }));
  assert.equal(game.balls, 4);
  assert.deepEqual(game.caught, ['dokkaebud']);
  assert.equal(game.party[1].hp, species.dokkaebud.maxHp);
  assert.equal(
    game.pal.hp,
    hpBeforeCapture,
    'a caught creature does not counterattack',
  );
  assert.equal(game.battle.outcome, 'caught');
  assert.equal(game.phase, 'playing', 'a capture is progress, not completion');
  advance(game, 1);
  assert.equal(game.mode, 'world');
});

test('duplicate captures cannot satisfy the two-species quest', () => {
  const game = wildBattle();
  game.caught.push('dokkaebud');
  game.party.push({ id: 'dokkaebud', hp: 30 });
  game.battle.hp = 1;
  game.step(1 / 120, buttons({ guard: true }));
  assert.equal(game.caught.length, 1);
  assert.equal(game.party.length, 2);
  assert.equal(game.phase, 'playing');
});

test('orb and healing supplies are limited, while the actual clinic interaction replenishes them', () => {
  const game = wildBattle();
  game.balls = 0;
  game.step(1 / 120, buttons({ guard: true }));
  assert.equal(game.balls, 0);
  assert.equal(game.battle.turn, 0);
  ready(game);
  game.pal.hp = 5;
  game.cakes = 1;
  game.step(1 / 120, buttons({ interact: true }));
  assert.equal(game.cakes, 0);
  assert.equal(
    game.pal.hp,
    25,
    'cake heals 22 before the ordinary counterattack',
  );
  ready(game);
  game.step(1 / 120, buttons({ interact: true }));
  assert.equal(game.cakes, 0);
  assert.equal(game.pal.hp, 25);
  const clinic = new PocketSimulation();
  clinic.pal.hp = 1;
  clinic.balls = 0;
  clinic.cakes = 0;
  for (let frame = 0; frame < 240 && clinic.player.x > CLINIC.x + 0.5; frame++)
    clinic.step(1 / 120, buttons({ left: true }));
  clinic.step(1 / 120, buttons({ interact: true }));
  assert.equal(clinic.pal.hp, species.tangerex.maxHp);
  assert.equal(clinic.balls, 6);
  assert.equal(clinic.cakes, 3);
});

test('battle switching selects living teammates and a fainted pal automatically yields to one', () => {
  const game = wildBattle();
  game.party.push({ id: 'puddleot', hp: 34 });
  game.step(1 / 120, buttons({ right: true }));
  assert.equal(game.pal.id, 'puddleot');
  assert.equal(
    game.battle.turn,
    0,
    'switching itself does not count as an attack',
  );
  ready(game);
  game.pal.hp = 1;
  game.step(1 / 120, buttons({ attack: true }));
  assert.equal(game.party[1].hp, 0);
  assert.equal(game.pal.id, 'tangerex');
  assert.equal(game.phase, 'playing');
});

test('rival gates on two different captures and refuses capture balls', () => {
  const game = new PocketSimulation();
  game.player.x = RIVAL.x - 0.8;
  game.player.y = RIVAL.y;
  game.step(1 / 120, buttons({ interact: true }));
  assert.equal(game.mode, 'world');
  assert.match(game.message, /two different friends/);
  game.caught = ['dokkaebud', 'puddleot'];
  advance(game, 0.4);
  game.step(1 / 120, buttons({ interact: true }));
  assert.equal(game.battle.kind, 'rival');
  ready(game);
  const balls = game.balls;
  game.step(1 / 120, buttons({ guard: true }));
  assert.equal(game.balls, balls);
  assert.equal(game.battle.outcome, null);
  assert.equal(game.phase, 'playing');
});

test('wild knockouts do not count as captures or win the quest', () => {
  const game = wildBattle();
  advance(game, 3, { special: true });
  assert.equal(game.mode, 'world');
  assert.equal(game.caught.length, 0);
  assert.equal(game.score, 100);
  assert.equal(game.phase, 'playing');
});

for (const hz of [30, 60, 120]) {
  test(`ordinary benchmark controls complete the entire quest at ${hz} Hz without state mutation`, () => {
    const game = new PocketSimulation();
    let frames = 0;
    for (; frames < hz * 120 && game.phase === 'playing'; frames++) {
      const before = JSON.stringify(game);
      const input = benchmarkInput(game);
      assert.equal(
        JSON.stringify(game),
        before,
        'benchmark is read-only and returns only normal controls',
      );
      assert.deepEqual(
        Object.keys(input).sort((a, b) => a.localeCompare(b)),
        Object.keys(idleInput()).sort((a, b) => a.localeCompare(b)),
      );
      game.step(1 / hz, input);
    }
    assert.equal(game.phase, 'won');
    assert.equal(game.rivalDefeated, true);
    assert.deepEqual(game.caught, ['dokkaebud', 'puddleot']);
    assert.equal(game.encounters, 2);
    assert.equal(game.balls, 4);
    assert.equal(game.party.length, 3);
    assert.ok(game.party.every((pal) => pal.hp > 0));
    assert.equal(game.battle.hp, 0);
    assert.equal(game.snapshot().progress, 1);
    assert.equal(game.score, 1600);
    assert.ok(frames / hz < 120);
    const terminal = structuredClone(game);
    advance(game, 3, {
      attack: true,
      special: true,
      interact: true,
      right: true,
    });
    assert.deepEqual(
      structuredClone(game),
      terminal,
      'winning freezes simulation and inventory',
    );
  });
}

test('complete team defeat is a terminal loss with no further turns or walking', () => {
  const game = wildBattle();
  game.pal.hp = 1;
  game.step(1 / 120, buttons({ attack: true }));
  assert.equal(game.phase, 'lost');
  assert.equal(game.pal.hp, 0);
  const before = structuredClone(game);
  advance(game, 5, { attack: true, right: true, interact: true });
  assert.deepEqual(structuredClone(game), before);
});

test('invalid time is inert and a stalled frame cannot teleport through the route', () => {
  const game = new PocketSimulation();
  const before = structuredClone(game);
  for (const dt of [0, -1, Infinity, NaN]) game.step(dt, buttons({ up: true }));
  assert.deepEqual(structuredClone(game), before);
  game.step(50, buttons({ up: true }));
  assert.ok(game.time <= 1 / 15);
  assert.ok(11.4 - game.player.y < 0.3);
});

test('pixel view draws both game modes without changing simulation, caps DPR, and is inert after disposal', () => {
  let calls = 0;
  const words = [];
  const context = {
    fillRect() {
      calls++;
    },
    fillText(value) {
      calls++;
      words.push(value);
    },
    setTransform() {},
  };
  const canvas = { width: 0, height: 0, getContext: () => context };
  const oldDpr = globalThis.devicePixelRatio;
  globalThis.devicePixelRatio = 3;
  try {
    const game = new PocketSimulation();
    const view = mountPocket(canvas, game);
    const before = structuredClone(game);
    view.render(640, 480);
    assert.equal(canvas.width, 960);
    assert.equal(canvas.height, 720);
    assert.deepEqual(structuredClone(game), before);
    assert.ok(words.includes('CITRUS TOWN / ROUTE 1'));
    assert.ok(view.metrics().drawCalls > 0);
    const savedCalls = calls;
    view.dispose();
    view.render(800, 600);
    assert.equal(calls, savedCalls);
    assert.equal(canvas.width, 960);
    const battle = wildBattle();
    const battleView = mountPocket(canvas, battle);
    battleView.render(320, 240);
    assert.ok(words.includes('DOKKAEBUD'));
    assert.ok(words.includes('TANGEREX'));
    assert.ok(words.includes('J QUICK BUMP'));
    battleView.dispose();
  } finally {
    if (oldDpr === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = oldDpr;
  }
});
