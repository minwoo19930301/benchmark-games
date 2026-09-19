import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput } from '../lib/retro/types.ts';
import {
  benchmarkOcarina,
  OcarinaSimulation,
} from '../lib/retro/ocarina/simulation.ts';
import {
  GATE_Z,
  MELODY_STONES,
  POND,
  SHRINE,
  START,
} from '../lib/retro/ocarina/world.ts';

const FIXED = 1 / 120;
function advance(simulation, seconds, overrides = {}) {
  const input = { ...idleInput(), ...overrides };
  for (let tick = 0; tick < Math.ceil(seconds / FIXED); tick += 1)
    simulation.step(FIXED, input);
}
function position(simulation, x, z, facing = Math.PI) {
  Object.assign(simulation.player, { x, z, facing });
}
function readyStrike(
  simulation,
  { facing = Math.PI, guard = false, roll = false } = {},
) {
  const enemy = simulation.enemies[0];
  position(simulation, enemy.x, enemy.z + 1.8, facing);
  enemy.mode = 'windup';
  enemy.timer = FIXED / 2;
  simulation.step(FIXED, { ...idleInput(), guard, special: roll });
  return enemy;
}

test('ocarina starts as a complete playable quest with distinct heart, melody and Warden state', () => {
  const simulation = new OcarinaSimulation();
  const snapshot = simulation.snapshot();
  assert.equal(snapshot.phase, 'playing');
  assert.equal(snapshot.progress, 0);
  assert.equal(simulation.hearts, 5);
  assert.equal(simulation.player.x, START.x);
  assert.equal(simulation.player.z, START.z);
  assert.match(snapshot.objective, /이슬/);
  assert.equal(simulation.enemies.filter((enemy) => enemy.boss).length, 1);
});

test('sword has distance, facing and per-swing damage rather than damage each simulation tick', () => {
  const simulation = new OcarinaSimulation();
  const enemy = simulation.enemies[0];
  position(simulation, enemy.x, enemy.z + 3.8);
  simulation.step(FIXED, { ...idleInput(), attack: true });
  assert.equal(enemy.hp, 3, 'out-of-range attack must miss');
  advance(simulation, 0.5);
  position(simulation, enemy.x, enemy.z + 2, 0);
  simulation.step(FIXED, { ...idleInput(), attack: true });
  assert.equal(enemy.hp, 3, 'an enemy behind the sword must not be hit');
  advance(simulation, 0.5, { guard: true });
  position(simulation, enemy.x, enemy.z + 2, Math.PI);
  simulation.step(FIXED, { ...idleInput(), attack: true, guard: true });
  assert.equal(enemy.hp, 1);
  advance(simulation, 0.3, { attack: true, guard: true });
  assert.equal(
    enemy.hp,
    1,
    'holding the same swing cannot apply repeated damage',
  );
  advance(simulation, 0.25, { attack: true, guard: true });
  assert.equal(enemy.alive, false);
  assert.equal(simulation.enemiesDefeated, 1);
  assert.ok(simulation.score >= 170);
});

test('a shield blocks frontal attacks but not attacks from behind', () => {
  const guarded = new OcarinaSimulation();
  readyStrike(guarded, { guard: true });
  assert.equal(guarded.hearts, 5);
  assert.equal(guarded.blocks, 1);
  assert.equal(guarded.events.at(-1).type, 'block');

  const exposed = new OcarinaSimulation();
  readyStrike(exposed, { guard: true, facing: 0 });
  assert.equal(exposed.hearts, 4);
  assert.equal(exposed.blocks, 0);
  assert.equal(exposed.events.at(-1).type, 'hurt');
});

test('roll avoids a telegraphed strike and cannot be chained by holding one key', () => {
  const simulation = new OcarinaSimulation();
  readyStrike(simulation, { roll: true });
  assert.equal(simulation.hearts, 5);
  assert.ok(simulation.player.roll > 0);
  advance(simulation, 1.3, { special: true });
  assert.equal(simulation.player.roll, 0);
  simulation.step(FIXED, idleInput());
  simulation.step(FIXED, { ...idleInput(), special: true });
  assert.ok(simulation.player.roll > 0);
});

test('jump is edge-triggered and lands without leaving the ground state invalid', () => {
  const simulation = new OcarinaSimulation();
  advance(simulation, 0.2, { jump: true });
  assert.ok(simulation.player.height > 0.4);
  advance(simulation, 1, { jump: true });
  assert.equal(simulation.player.height, 0);
  assert.equal(simulation.player.vy, 0);
});

test('melodies require proximity and their declared order before the gate opens', () => {
  const simulation = new OcarinaSimulation();
  advance(simulation, 0.7, { interact: true });
  assert.equal(simulation.melodies, 0);
  position(simulation, MELODY_STONES[1].x, MELODY_STONES[1].z + 1);
  advance(simulation, 0.7, { interact: true });
  assert.equal(
    simulation.melodies,
    0,
    'a later stone cannot skip quest progression',
  );
  for (let index = 0; index < 3; index += 1) {
    const stone = MELODY_STONES[index];
    position(simulation, stone.x, stone.z + 1.8);
    advance(simulation, 1.5, { interact: true });
    assert.equal(simulation.melodies, index + 1);
    assert.equal(simulation.gateOpen, index === 2);
  }
  assert.deepEqual(
    simulation.events
      .filter((event) => event.type === 'melody')
      .map((event) => [event.x, event.z]),
    MELODY_STONES.map((stone) => [stone.x, stone.z]),
  );
  assert.match(simulation.snapshot().objective, /야근 수호자/);
});

test('the locked gate and pond are real collision boundaries and the open gate is traversable', () => {
  const simulation = new OcarinaSimulation();
  position(simulation, 0, GATE_Z + 2);
  advance(simulation, 1, { up: true });
  assert.ok(simulation.player.z > GATE_Z + 1.2);
  simulation.gateOpen = true;
  advance(simulation, 1, { up: true });
  assert.ok(simulation.player.z < GATE_Z - 1.2);
  position(simulation, POND.x + POND.radiusX + 1, POND.z, -Math.PI / 2);
  advance(simulation, 1, { left: true });
  assert.ok(simulation.player.x >= POND.x + POND.radiusX + 0.5);
});

test('the final shrine requires all melodies and a defeated Warden', () => {
  const simulation = new OcarinaSimulation();
  position(simulation, SHRINE.x, SHRINE.z + 1);
  advance(simulation, 0.1, { interact: true });
  assert.equal(simulation.phase, 'playing');
  simulation.melodies = 3;
  simulation.gateOpen = true;
  advance(simulation, 0.7, { interact: true, guard: true });
  assert.equal(simulation.phase, 'playing');
  const boss = simulation.enemies.find((enemy) => enemy.boss);
  boss.alive = false;
  boss.hp = 0;
  advance(simulation, 0.7, { interact: true });
  assert.equal(simulation.phase, 'won');
  assert.equal(simulation.snapshot().progress, 1);
});

test('benchmark controller only returns legal input and never patches simulation state', () => {
  const simulation = new OcarinaSimulation();
  const before = JSON.stringify(simulation);
  const input = benchmarkOcarina(simulation);
  assert.equal(JSON.stringify(simulation), before);
  assert.deepEqual(Object.keys(input).sort(), Object.keys(idleInput()).sort());
  assert.ok(Object.values(input).every((value) => typeof value === 'boolean'));
});

test('normal benchmark input completes the full quest at 30, 60 and 120 Hz render schedules', () => {
  const finishTimes = [];
  for (const frameRate of [30, 60, 120]) {
    const simulation = new OcarinaSimulation();
    let accumulator = 0;
    let frames = 0;
    while (simulation.phase === 'playing' && frames < frameRate * 90) {
      accumulator += 1 / frameRate;
      const input = benchmarkOcarina(simulation);
      while (accumulator >= FIXED - 1e-10) {
        simulation.step(FIXED, input);
        accumulator -= FIXED;
      }
      frames += 1;
    }
    assert.equal(
      simulation.phase,
      'won',
      `${frameRate} Hz benchmark must win through normal input`,
    );
    assert.equal(simulation.melodies, 3);
    assert.equal(simulation.enemiesDefeated, 3);
    assert.equal(simulation.hearts, 5);
    assert.ok(simulation.time >= 15 && simulation.time < 90);
    assert.equal(simulation.events.at(-1).type, 'win');
    finishTimes.push(simulation.time);
  }
  assert.ok(Math.max(...finishTimes) - Math.min(...finishTimes) < 0.5);
});

test('won and lost simulations are terminal and cannot accrue score, damage or movement', () => {
  const won = new OcarinaSimulation();
  while (won.phase === 'playing') won.step(FIXED, benchmarkOcarina(won));
  const winState = JSON.stringify(won);
  advance(won, 2, { up: true, attack: true, interact: true });
  assert.equal(JSON.stringify(won), winState);

  const lost = new OcarinaSimulation();
  lost.hearts = 1;
  readyStrike(lost);
  assert.equal(lost.phase, 'lost');
  const lossState = JSON.stringify(lost);
  advance(lost, 2, { right: true, attack: true, interact: true });
  assert.equal(JSON.stringify(lost), lossState);
});
