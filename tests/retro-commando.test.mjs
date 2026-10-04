import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CommandoSimulation,
  benchmarkCommando,
  FLOOR,
} from '../lib/retro/commando/simulation.ts';
import { idleInput } from '../lib/retro/types.ts';
function advance(sim, seconds, input) {
  for (let tick = 0; tick < Math.round(seconds * 120); tick++)
    sim.step(1 / 120, input);
}
test('Commando jump is edge-triggered and lands on terrain', () => {
  const sim = new CommandoSimulation();
  const input = { ...idleInput(), jump: true };
  advance(sim, 0.2, input);
  assert.ok(sim.player.y < FLOOR - 20);
  advance(sim, 1.2, input);
  assert.equal(sim.player.y, FLOOR);
  assert.equal(sim.player.grounded, true);
});
test('Commando infantry loses one life per hit and receives respawn grace', () => {
  const sim = new CommandoSimulation();
  sim.damage();
  sim.damage();
  assert.equal(sim.player.lives, 2);
  assert.equal(sim.player.hp, 1);
  advance(sim, 3.1, idleInput());
  sim.damage();
  assert.equal(sim.player.lives, 1);
});
test('Commando touching a POW rescues once and awards 200 heavy rounds', () => {
  const sim = new CommandoSimulation();
  const input = { ...idleInput(), interact: true };
  sim.step(1 / 120, input);
  assert.equal(sim.score, 0);
  sim.player.x = sim.prisoners[0].x;
  sim.step(1 / 120, input);
  assert.equal(sim.score, 1000);
  sim.step(1 / 120, input);
  assert.equal(sim.score, 1000);
  assert.equal(sim.player.weapon, 'heavy');
  assert.equal(sim.player.ammo, 200);
  assert.equal(sim.player.grenades, 10);
});
test('Commando bullets defeat an actual enemy and spend finite grenades', () => {
  const sim = new CommandoSimulation();
  sim.player.x = 220;
  advance(sim, 1, { ...idleInput(), attack: true });
  assert.equal(sim.enemies[0].hp, 0);
  assert.ok(sim.score >= 100);
  sim.step(1 / 120, { ...idleInput(), special: true });
  assert.equal(sim.player.grenades, 9);
});
for (const fps of [30, 60, 120])
  test(`Commando actual-input benchmark completes at ${fps}Hz`, () => {
    const sim = new CommandoSimulation();
    for (let frame = 0; frame < fps * 150 && sim.phase === 'playing'; frame++)
      for (let tick = 0; tick < 120 / fps; tick++)
        sim.step(1 / 120, benchmarkCommando(sim));
    assert.equal(sim.phase, 'won');
    assert.equal(sim.prisoners.filter((p) => p.rescued).length, 3);
    assert.ok(sim.boss.hp <= 0);
    assert.ok(sim.player.hp > 0);
    assert.ok(sim.player.tank);
    const snapshot = sim.snapshot();
    advance(sim, 1, { ...idleInput(), left: true });
    assert.deepEqual(sim.snapshot(), snapshot);
  });
test('Commando ignores invalid frame lengths', () => {
  const sim = new CommandoSimulation();
  for (const value of [NaN, Infinity, 0, -1]) sim.step(value, idleInput());
  assert.equal(sim.time, 0);
});

test('Commando knife replaces gunfire at close range without spending heavy ammo', () => {
  const sim = new CommandoSimulation();
  sim.player.x = sim.enemies[0].x - 30;
  sim.player.weapon = 'heavy';
  sim.player.ammo = 200;
  sim.step(1 / 120, { ...idleInput(), attack: true });
  assert.equal(sim.enemies[0].hp, 0);
  assert.equal(sim.player.ammo, 200);
  assert.ok(sim.player.knife > 0);
  assert.equal(sim.shots.filter((shot) => !shot.enemy).length, 0);
});
test('Commando empty heavy machine gun falls back to infinite pistol', () => {
  const sim = new CommandoSimulation();
  sim.player.weapon = 'heavy';
  sim.player.ammo = 1;
  sim.step(1 / 120, { ...idleInput(), attack: true, up: true });
  assert.equal(sim.player.ammo, 0);
  assert.equal(sim.player.weapon, 'pistol');
  assert.equal(sim.shots[0].vx, 0);
  assert.ok(sim.shots[0].vy < 0);
});
test('Commando three armor hits eject Marco without consuming an infantry life', () => {
  const sim = new CommandoSimulation();
  sim.player.x = 1210;
  sim.step(1 / 120, { ...idleInput(), interact: true });
  assert.equal(sim.player.tank, true);
  for (let hit = 0; hit < 3; hit++) {
    sim.player.invulnerable = 0;
    sim.damage();
  }
  assert.equal(sim.player.tank, false);
  assert.equal(sim.player.lives, 3);
  assert.equal(sim.player.armor, 0);
  assert.equal(sim.tankAvailable, false);
  assert.ok(sim.player.vy < 0);
});
test('Commando POW rescue is optional for mission clear', () => {
  const sim = new CommandoSimulation();
  sim.boss.hp = 0;
  sim.player.x = 2950;
  sim.step(1 / 120, idleInput());
  assert.equal(sim.phase, 'won');
  assert.equal(sim.prisoners.filter((p) => p.rescued).length, 0);
});
