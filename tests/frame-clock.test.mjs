import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FrameClock } from '../lib/game/frame-clock.ts';
import { Simulation, idleInput } from '../lib/game/simulation.ts';

test('the first RAF timestamp establishes its own epoch and advances zero seconds', () => {
  const clock = new FrameClock();
  assert.equal(clock.tick(400), 0);
  assert.equal(clock.tick(416), 0.016);
});

test('duplicate, backward and non-finite timestamps never produce invalid durations', () => {
  const clock = new FrameClock();
  const game = new Simulation();
  game.start();
  const timestamps = [100, 100, 99, 115, NaN, 200, Infinity, 300, -Infinity, 400];
  for (const timestamp of timestamps) {
    const dt = clock.tick(timestamp);
    assert.ok(Number.isFinite(dt) && dt >= 0 && dt <= 0.05);
    assert.doesNotThrow(() => game.advance(dt, idleInput));
  }
  assert.ok(game.state.time > 179.95);
});

test('a long main-thread stall contributes at most one bounded frame, not wall-time catch-up', () => {
  const clock = new FrameClock();
  assert.equal(clock.tick(10), 0);
  assert.equal(clock.tick(120_010), 0.05);
  assert.equal(clock.tick(120_020), 0.01);
});

test('reset on resume accepts a queued older frame without a negative dt or catch-up', () => {
  const clock = new FrameClock();
  const game = new Simulation();
  game.start();
  game.advance(clock.tick(1_000));
  game.advance(clock.tick(1_050), { ...idleInput, right: true });
  game.pause();
  clock.reset();
  const before = game.snapshot();
  game.resume();
  clock.reset();
  // This pending RAF timestamp may predate performance.now() at the resume event.
  game.advance(clock.tick(120_000), { ...idleInput, right: true });
  assert.equal(game.state.time, before.time);
  game.advance(clock.tick(120_050), { ...idleInput, right: true });
  assert.ok(game.state.time >= before.time - 0.051);
  assert.ok(game.player.x > 1);
});

test('restarting after idle discards the previous run clock', () => {
  const clock = new FrameClock();
  const game = new Simulation();
  game.start();
  clock.tick(10);
  game.advance(clock.tick(60));
  game.start();
  clock.reset();
  game.advance(clock.tick(90_000));
  assert.equal(game.state.time, 180);
  assert.equal(game.player.x, 1);
});

test('renderer uses the RAF clock and resets it on start, pause, blur and hidden frames', () => {
  // Source contract supplements the pure clock + actual simulation checks above.
  const source = readFileSync(new URL('../lib/game/renderer.ts', import.meta.url), 'utf8');
  assert.match(source, /new FrameClock\(\)/);
  assert.doesNotMatch(source, /performance\.now\(\)/);
  assert.match(source, /function togglePause\(\)\s*\{\s*frameClock\.reset\(\)/);
  assert.match(source, /blur = \(\) => \{\s*clearInput\(\);\s*frameClock\.reset\(\)/);
  assert.match(source, /start\(\) \{\s*simulation\.start\(\);\s*frameClock\.reset\(\)/);
  assert.match(source, /if \(document\.hidden\) frameClock\.reset\(\)/);
  assert.match(source, /document\.hidden \? 0 : frameClock\.tick\(now\)/);
});
