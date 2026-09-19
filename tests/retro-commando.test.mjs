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
test('Commando damage grace and crouching preserve consistent hit rules', () => {
  const sim = new CommandoSimulation();
  sim.damage();
  sim.damage();
  assert.equal(sim.player.hp, 9);
  advance(sim, 1.4, idleInput());
  sim.damage();
  assert.equal(sim.player.hp, 8);
});
test('Commando rescue requires proximity and happens once', () => {
  const sim = new CommandoSimulation();
  const input = { ...idleInput(), interact: true };
  sim.step(1 / 120, input);
  assert.equal(sim.score, 0);
  sim.player.x = sim.prisoners[0].x;
  sim.step(1 / 120, input);
  assert.equal(sim.score, 1000);
  sim.step(1 / 120, input);
  assert.equal(sim.score, 1000);
  assert.equal(sim.player.grenades, 11);
});
test('Commando bullets defeat an actual enemy and spend finite grenades', () => {
  const sim = new CommandoSimulation();
  sim.player.x = 220;
  advance(sim, 1, { ...idleInput(), attack: true });
  assert.equal(sim.enemies[0].hp, 0);
  assert.ok(sim.score >= 250);
  sim.step(1 / 120, { ...idleInput(), special: true });
  assert.equal(sim.player.grenades, 7);
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
