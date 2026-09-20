import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput, idlePointer } from '../lib/retro/types.ts';
import { OcarinaSimulation } from '../lib/retro/ocarina/simulation.ts';
import { MELODY_STONES } from '../lib/retro/ocarina/world.ts';

const DT = 1 / 120;
const step = (simulation, input = {}) =>
  simulation.step(DT, { ...idleInput(), ...input });
function advance(simulation, duration, input = {}) {
  for (let tick = 0; tick < Math.round(duration / DT); tick++)
    step(simulation, input);
}
function stationaryFoes(simulation) {
  simulation.enemies.forEach((enemy) => {
    enemy.mode = 'recover';
    enemy.timer = 60;
  });
}
function isolated(simulation) {
  simulation.enemies.forEach((enemy) => {
    enemy.alive = false;
  });
}
function songSetup() {
  const simulation = new OcarinaSimulation();
  isolated(simulation);
  simulation.player.x = MELODY_STONES[0].x;
  simulation.player.z = MELODY_STONES[0].z + 1.5;
  step(simulation, { interact: true });
  return simulation;
}
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

test('Z targeting keeps the enemy facing while movement strafes and releasing Z unlocks', () => {
  const simulation = new OcarinaSimulation();
  stationaryFoes(simulation);
  Object.assign(simulation.player, { x: 0, z: 10, facing: 0 });
  Object.assign(simulation.enemies[0], { x: 0, z: 5 });
  step(simulation, { switch: true });
  assert.equal(simulation.targetIndex, 0);
  assert.ok(
    Math.abs(angleDifference(simulation.player.facing, Math.PI)) < 0.001,
  );
  const before = { x: simulation.player.x, z: simulation.player.z };
  advance(simulation, 0.15, { switch: true, right: true });
  assert.ok(
    simulation.player.x > before.x + 0.5,
    'right strafes without turning away from the target',
  );
  const enemy = simulation.enemies[0];
  const expectedFacing = Math.atan2(
    enemy.x - simulation.player.x,
    enemy.z - simulation.player.z,
  );
  assert.ok(
    Math.abs(angleDifference(simulation.player.facing, expectedFacing)) < 0.02,
  );
  assert.ok(Math.abs(simulation.player.z - before.z) < 0.15);
  step(simulation);
  assert.equal(simulation.targetIndex, null);
});

test('targeting without a foe recenters the camera and mouse orbit changes camera-relative walking', () => {
  const simulation = new OcarinaSimulation();
  isolated(simulation);
  simulation.player.facing = Math.PI / 2;
  step(simulation, { switch: true });
  assert.equal(simulation.cameraYaw, Math.PI / 2);
  assert.equal(simulation.targetIndex, null);
  step(simulation, {
    pointer: { ...idlePointer(), secondary: true, dx: Math.PI / 0.008, dy: 0 },
  });
  assert.ok(Math.abs(simulation.cameraYaw) < 1e-10);
  const before = { x: simulation.player.x, z: simulation.player.z };
  advance(simulation, 0.15, { up: true });
  assert.ok(simulation.player.z > before.z + 0.5);
  assert.ok(Math.abs(simulation.player.x - before.x) < 1e-8);
});

test('three distinct J presses form the sword combo and waiting expires that chain', () => {
  const simulation = new OcarinaSimulation();
  stationaryFoes(simulation);
  const enemy = simulation.enemies[0];
  enemy.hp = 20;
  for (let hit = 1; hit <= 3; hit++) {
    Object.assign(simulation.player, {
      x: enemy.x,
      z: enemy.z + 2,
      facing: Math.PI,
    });
    step(simulation, { attack: true });
    assert.equal(simulation.player.combo, hit);
    advance(simulation, 0.5);
  }
  assert.equal(enemy.hp, 13, 'the third combo hit has its own stronger impact');
  assert.equal(simulation.audioCues.shot, 3);
  advance(simulation, 1.2);
  Object.assign(simulation.player, {
    x: enemy.x,
    z: enemy.z + 2,
    facing: Math.PI,
  });
  step(simulation, { attack: true });
  assert.equal(simulation.player.combo, 1);
  assert.equal(enemy.hp, 11);
});

test('a charged J release hits behind Link in a full spin once and consumes magic', () => {
  const simulation = new OcarinaSimulation();
  stationaryFoes(simulation);
  Object.assign(simulation.player, { x: 0, z: 10, facing: Math.PI });
  Object.assign(simulation.enemies[0], { x: 0, z: 7.5, hp: 20 });
  Object.assign(simulation.enemies[1], { x: 0, z: 12.5, hp: 20 });
  advance(simulation, 0.75, { attack: true });
  assert.equal(simulation.enemies[0].hp, 18);
  assert.equal(
    simulation.enemies[1].hp,
    20,
    'basic swing does not hit backwards',
  );
  step(simulation);
  assert.ok(simulation.player.spin > 0);
  assert.equal(simulation.enemies[0].hp, 14);
  assert.equal(simulation.enemies[1].hp, 16);
  assert.equal(simulation.magic, 80);
  advance(simulation, 0.3);
  assert.equal(
    simulation.enemies[1].hp,
    16,
    'spin animation does not inflict damage every tick',
  );
});

test('a short held attack and an interrupted charge cannot invent a spin after release', () => {
  const short = new OcarinaSimulation();
  isolated(short);
  advance(short, 0.3, { attack: true });
  step(short);
  assert.equal(short.player.spin, 0);
  assert.equal(short.magic, 100);

  const paused = new OcarinaSimulation();
  isolated(paused);
  advance(paused, 0.75, { attack: true });
  paused.clearInput();
  step(paused);
  assert.equal(paused.player.charging, 0);
  assert.equal(paused.player.spin, 0);
  assert.equal(paused.magic, 100);
});

test('ocarina notes require new presses, reset on a wrong note, and only a complete melody advances the quest', () => {
  const simulation = songSetup();
  assert.equal(simulation.playingSong, 0);
  assert.equal(simulation.melodies, 0);
  const start = { x: simulation.player.x, z: simulation.player.z };
  advance(simulation, 0.2, { down: true });
  assert.equal(simulation.songCursor, 1, 'a held note is counted once');
  assert.equal(simulation.player.x, start.x);
  assert.equal(simulation.player.z, start.z, 'note keys do not move Link');
  step(simulation, { up: true });
  assert.equal(simulation.songCursor, 0);
  assert.equal(simulation.melodies, 0);
  for (const note of MELODY_STONES[0].notes) {
    step(simulation);
    step(simulation, { [note]: true });
  }
  assert.equal(simulation.melodies, 1);
  assert.equal(simulation.playingSong, null);
  assert.equal(simulation.gateOpen, false);
});

test('E cancels ocarina play without completing a song or leaving movement locked', () => {
  const simulation = songSetup();
  advance(simulation, 0.7);
  step(simulation, { interact: true });
  assert.equal(simulation.playingSong, null);
  assert.equal(simulation.melodies, 0);
  assert.equal(simulation.player.playing, 0);
  const before = simulation.player.x;
  advance(simulation, 0.1, { right: true });
  assert.ok(simulation.player.x > before);
});

test('starting an ocarina melody clears a pending sword charge', () => {
  const simulation = new OcarinaSimulation();
  isolated(simulation);
  Object.assign(simulation.player, {
    x: MELODY_STONES[0].x,
    z: MELODY_STONES[0].z + 1.5,
  });
  advance(simulation, 0.75, { attack: true });
  step(simulation, { attack: true, interact: true });
  assert.equal(simulation.player.charging, 0);
  assert.equal(simulation.player.attack, 0);
  advance(simulation, 0.7);
  step(simulation, { interact: true });
  assert.equal(simulation.player.spin, 0);
  assert.equal(simulation.magic, 100);
});

test('sound counters follow real actions and contacts rather than held buttons or idle ticks', () => {
  const simulation = new OcarinaSimulation();
  isolated(simulation);
  advance(simulation, 0.3, { attack: true, jump: true });
  assert.equal(simulation.audioCues.shot, 1);
  assert.equal(simulation.audioCues.jump, 1);
  assert.equal(simulation.audioCues.hit, 0);
  const before = { ...simulation.audioCues };
  advance(simulation, 1);
  assert.deepEqual(simulation.audioCues, before);

  for (const guard of [false, true]) {
    const contact = new OcarinaSimulation();
    const enemy = contact.enemies[0];
    Object.assign(contact.player, {
      x: enemy.x,
      z: enemy.z + 1.8,
      facing: Math.PI,
    });
    enemy.mode = 'windup';
    enemy.timer = DT / 2;
    step(contact, { guard });
    assert.equal(contact.audioCues.hit, 1);
    assert.equal(contact.hearts, guard ? 5 : 4);
    advance(contact, 0.2, { guard });
    assert.equal(contact.audioCues.hit, 1);
  }
});

test('ocarina note cues increment on distinct note presses and stay quiet between events', () => {
  const simulation = songSetup();
  advance(simulation, 0.2, { down: true });
  assert.equal(simulation.songCursor, 1);
  assert.equal(simulation.audioCues.ability, 1, 'holding a note is one event');
  for (const [index, note] of MELODY_STONES[0].notes.slice(1).entries()) {
    step(simulation);
    step(simulation, { [note]: true });
    assert.equal(simulation.audioCues.ability, index + 2);
  }
  assert.equal(simulation.melodies, 1);
  advance(simulation, 1);
  assert.equal(simulation.audioCues.ability, 6);
});
