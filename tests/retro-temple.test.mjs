import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TempleSimulation,
  benchmarkTemple,
  FLOOR,
} from '../lib/retro/temple/simulation.ts';
import { idleInput } from '../lib/retro/types.ts';
const step = (s, input = {}, n = 1) => {
  for (let i = 0; i < n; i++) s.step(1 / 120, { ...idleInput(), ...input });
};
test('two players can run opposite directions independently and switch solo focus', () => {
  const s = new TempleSimulation();
  step(s, { right: true, left2: true }, 20);
  assert.ok(s.heroes[0].x > 85);
  assert.ok(s.heroes[1].x < 112);
  step(s, { switch: true });
  assert.equal(s.active, 1);
  const x = s.heroes[1].x;
  step(s, { right: true }, 40);
  assert.ok(s.heroes[1].x > x);
});
test('matching pool is safe and yields its seal; wrong element resets both at the same chamber', () => {
  const s = new TempleSimulation();
  s.heroes[0].x = 266;
  step(s);
  assert.equal(s.deaths, 0);
  assert.ok(s.collected.has(0));
  s.heroes[1].x = 266;
  step(s);
  assert.equal(s.deaths, 1);
  assert.equal(s.room, 0);
  assert.equal(s.heroes[0].x, 70);
  assert.equal(s.collected.size, 0);
});
test('pressure gate closes after release; far-side lever permanently latches it', () => {
  const s = new TempleSimulation();
  s.heroes[0].x = s.level.plate;
  step(s, {}, 60);
  assert.equal(s.gateOpen, 1);
  s.heroes[0].x = 60;
  s.heroes[1].x = 170;
  step(s, {}, 60);
  assert.ok(s.gateOpen < 0.05);
  s.heroes[1].x = s.level.lever;
  step(s, { interact: true });
  assert.equal(s.latched, true);
  step(s, {}, 60);
  assert.equal(s.gateOpen, 1);
});
test('gate collision prevents walking through a closed gate', () => {
  const s = new TempleSimulation();
  s.heroes[0].x = s.level.gate - 30;
  step(s, { right: true }, 30);
  assert.ok(s.heroes[0].x <= s.level.gate - 24);
});
test('held jump has variable height and does not auto-bounce on landing', () => {
  const a = new TempleSimulation(),
    b = new TempleSimulation();
  step(a, { jump: true }, 28);
  step(b, { jump: true });
  step(b, {}, 27);
  assert.ok(a.heroes[0].y < b.heroes[0].y - 25);
  step(a, { jump: true }, 180);
  assert.equal(a.heroes[0].y, FLOOR);
});
test('two exits alone cannot clear a room without both elemental seals', () => {
  const s = new TempleSimulation();
  s.heroes[0].x = 873;
  s.heroes[1].x = 923;
  step(s);
  assert.equal(s.transition, 0);
  s.collected.add(0);
  s.collected.add(1);
  step(s);
  assert.ok(s.transition > 0);
  step(s, {}, 110);
  assert.equal(s.room, 1);
});
test('timed steam vent kills only during its signalled active window', () => {
  const s = new TempleSimulation();
  s.room = 1;
  s.resetRoom();
  s.heroes[0].x = 554;
  s.roomTime = 1;
  step(s);
  assert.equal(s.deaths, 0);
  s.roomTime = 2.8;
  step(s);
  assert.equal(s.deaths, 1);
});
test('ordinary co-op inputs complete all three chambers without deaths at 30,60,120Hz render schedules', () => {
  const results = [];
  for (const rate of [30, 60, 120]) {
    const s = new TempleSimulation();
    for (let frame = 0; frame < rate * 120 && s.phase === 'playing'; frame++) {
      for (let tick = 0; tick < 120 / rate && s.phase === 'playing'; tick++)
        s.step(1 / 120, benchmarkTemple(s));
    }
    assert.equal(s.phase, 'won');
    assert.equal(s.deaths, 0);
    assert.equal(s.room, 2);
    assert.equal(s.snapshot().progress, 1);
    assert.ok(s.heroes.every((h) => h.grounded && h.y === 239));
    results.push([s.time, s.score]);
  }
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
});
