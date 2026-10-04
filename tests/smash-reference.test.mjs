import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput } from '../lib/retro/types.ts';
import {
  platforms,
  SmashSimulation,
  smashBenchmark,
} from '../lib/retro/smash/simulation.ts';
const input = (values = {}) => ({ ...idleInput(), ...values });
function advance(game, seconds, values = {}) {
  for (let i = 0; i < Math.round(seconds * 120); i++)
    game.step(1 / 120, input(values));
}
function arena(distance = 2) {
  const game = new SmashSimulation();
  Object.assign(game.player, { x: 0, invulnerable: 0 });
  Object.assign(game.opponent, { x: distance, invulnerable: 0, cooldown: 100 });
  return game;
}
test('Dream Land has a solid island plus three symmetric one-way platforms', () => {
  assert.equal(platforms.length, 4);
  assert.equal(platforms[0].width, 26);
  assert.equal(platforms[1].y, platforms[2].y);
  assert.equal(platforms[1].x, -platforms[2].x);
  assert.ok(platforms[3].y > platforms[1].y);
  const game = new SmashSimulation();
  Object.assign(game.player, { x: -6.3, y: 4, grounded: true });
  game.step(1 / 120, input({ down: true, jump: true }));
  assert.ok(
    game.player.y < 4 && game.player.vy < 0,
    'down + jump drops through a platform',
  );
  advance(game, 1);
  assert.equal(game.player.y, 0, 'the main island remains solid');
});
test('Mario gets exactly two jumps and releasing jump produces a shorter arc', () => {
  const game = arena(12);
  game.step(1 / 120, input({ jump: true }));
  assert.equal(game.player.jumps, 1);
  advance(game, 0.12, { jump: true });
  const rising = game.player.vy;
  game.step(1 / 120, input());
  assert.ok(game.player.vy < rising * 0.6);
  game.step(1 / 120, input({ jump: true }));
  assert.equal(game.player.jumps, 2);
  advance(game, 0.1);
  game.step(1 / 120, input({ jump: true }));
  assert.equal(game.player.jumps, 2);
});
test('normal, directional and aerial attacks select different moves and physical launches', () => {
  const jab = arena();
  jab.step(1 / 120, input({ attack: true }));
  assert.equal(jab.player.attackKind, 'jab');
  assert.equal(jab.opponent.percent, 9);
  assert.ok(jab.opponent.vx > 0 && jab.opponent.vy > 0);
  const tilt = arena();
  advance(tilt, 0.12, { right: true, attack: true });
  assert.equal(tilt.player.attackKind, 'tilt');
  assert.equal(tilt.opponent.percent, 11);
  const aerial = arena();
  Object.assign(aerial.player, { y: 2, grounded: false });
  Object.assign(aerial.opponent, { y: 2, grounded: false });
  advance(aerial, 0.14, { right: true, attack: true });
  assert.equal(aerial.player.attackKind, 'fair');
  assert.equal(aerial.opponent.percent, 13);
});
test('charged smash does no damage while charging and releases a stronger hit', () => {
  const quick = arena(2.8);
  quick.step(1 / 120, input({ ultimate: true }));
  advance(quick, 0.2);
  const full = arena(2.8);
  advance(full, 0.65, { ultimate: true });
  assert.equal(full.opponent.percent, 0);
  assert.equal(full.player.charging, true);
  advance(full, 0.2);
  assert.equal(full.player.attackKind, 'smash');
  assert.ok(full.opponent.percent > quick.opponent.percent);
  assert.ok(full.opponent.vx > quick.opponent.vx);
});
test('up and down charged smashes preserve the chosen directional attack', () => {
  for (const [direction, move] of [
    ['up', 'upSmash'],
    ['down', 'downSmash'],
  ]) {
    const game = arena(2);
    advance(game, 0.15, { ultimate: true, [direction]: true });
    advance(game, 0.15);
    assert.equal(game.player.attackKind, move);
    assert.ok(game.opponent.percent > 0);
  }
});
test('higher accumulated damage increases knockback without assigning a KO', () => {
  const low = arena(),
    high = arena();
  high.opponent.percent = 100;
  low.step(1 / 120, input({ attack: true }));
  high.step(1 / 120, input({ attack: true }));
  assert.ok(high.opponent.vx > low.opponent.vx * 2);
  assert.equal(high.opponent.stocks, 3);
});
test('hitstop freezes position briefly, then directional influence bends the launch', () => {
  const left = arena(),
    right = arena();
  for (const game of [left, right]) {
    Object.assign(game.opponent, {
      x: -2,
      facing: 1,
      attack: 0.2,
      attackKind: 'smash',
      moveElapsed: 0.09,
      moveHit: false,
    });
    game.step(1 / 120, input());
    assert.ok(game.player.hitlag > 0);
    const x = game.player.x;
    game.step(1 / 120, input({ right: true }));
    assert.equal(game.player.x, x);
  }
  advance(left, 0.17, { left: true });
  advance(right, 0.17, { right: true });
  assert.ok(
    right.player.vx > left.player.vx,
    'DI changes momentum instead of teleporting',
  );
});
test('shield blocks attacks from either facing and loses a finite resource', () => {
  const game = arena(-2);
  Object.assign(game.opponent, {
    facing: 1,
    attack: 0.2,
    attackKind: 'jab',
    moveElapsed: 0,
    moveHit: false,
  });
  game.step(1 / 120, input({ guard: true }));
  assert.equal(game.player.percent, 0);
  assert.equal(game.blocked, 1);
  assert.ok(game.player.shield < 1);
  const exhaustion = arena(12);
  advance(exhaustion, 7, { guard: true });
  assert.ok(
    exhaustion.player.stun > 0,
    'holding shield to zero causes shield break',
  );
});
test('a fresh shield direction performs a finite invulnerable roll', () => {
  const game = arena(10);
  game.step(1 / 120, input({ guard: true }));
  game.step(1 / 120, input({ guard: true, right: true }));
  assert.ok(game.player.roll > 0 && game.player.invulnerable > 0);
  advance(game, 0.16, { guard: true, right: true });
  assert.ok(game.player.x > 1.5);
  advance(game, 0.5);
  assert.equal(game.player.roll, 0);
});
test('grab holds an opponent, pummels add damage and a directional throw launches', () => {
  const game = arena(1.7);
  advance(game, 0.1, { interact: true });
  assert.ok(game.player.grabbing > 0 && game.opponent.grabbed > 0);
  game.step(1 / 120, input({ attack: true }));
  assert.equal(game.opponent.percent, 2);
  game.step(1 / 120, input({ right: true }));
  assert.equal(game.player.attackKind, 'throw');
  assert.equal(game.opponent.percent, 12);
  assert.ok(game.opponent.vx > 0 && game.opponent.vy > 0);
  assert.equal(game.opponent.grabbed, 0);
});
test('Super Jump Punch spends the recovery and cannot be repeated before landing', () => {
  const game = arena(12);
  Object.assign(game.player, { x: 15, y: -2, grounded: false, jumps: 2 });
  game.step(1 / 120, input({ special: true, up: true }));
  assert.equal(game.player.recoveryUsed, true);
  assert.ok(game.player.vy > 16 && game.player.vx < 0);
  const initial = game.player.y;
  game.step(1 / 120, input({ special: true, up: true }));
  assert.ok(game.player.y > initial && game.player.y - initial < 0.2);
  assert.equal(game.player.attackKind, 'recovery');
});
test('a descending fighter can grab the ledge and jump back to the island', () => {
  const game = arena(0);
  Object.assign(game.player, {
    x: 13.3,
    y: -0.5,
    vx: 0,
    vy: -2,
    grounded: false,
    jumps: 2,
  });
  game.step(1 / 120, input());
  assert.equal(game.player.ledge, 1);
  assert.equal(game.player.jumps, 0);
  assert.ok(game.player.invulnerable > 0);
  game.step(1 / 120, input({ jump: true }));
  assert.equal(game.player.ledge, 0);
  assert.ok(game.player.x < 13 && game.player.vy > 0);
});
test('fireballs travel and bounce, and a cape physically reverses their ownership', () => {
  const game = arena(10);
  game.step(1 / 120, input({ special: true }));
  assert.equal(game.fireballs.length, 1);
  const ball = game.fireballs[0],
    start = ball.x;
  advance(game, 0.2);
  assert.ok(ball.x > start + 1);
  assert.ok(ball.y > 0);
  const reflected = arena(9);
  reflected.fireballs.push({
    x: 0.7,
    y: 1,
    vx: -12,
    vy: 0,
    life: 1,
    owner: reflected.opponent,
  });
  reflected.step(1 / 120, input({ right: true, special: true }));
  assert.equal(reflected.player.attackKind, 'cape');
  assert.equal(reflected.fireballs[0].owner, reflected.player);
  assert.ok(reflected.fireballs[0].vx > 0);
});
test('clearInput cancels held charging and guard without resetting physical state', () => {
  const game = arena(9);
  advance(game, 0.15, { ultimate: true });
  const position = game.player.x;
  game.clearInput();
  assert.equal(game.player.charging, false);
  assert.equal(game.player.charge, 0);
  assert.equal(game.player.x, position);
  assert.equal(game.phase, 'playing');
});
test('blast-zone crossings consume stocks and terminal state freezes', () => {
  const game = arena();
  for (let stock = 2; stock >= 0; stock--) {
    game.opponent.x = 25;
    game.step(1 / 120, input());
    assert.equal(game.opponent.stocks, stock);
  }
  assert.equal(game.phase, 'won');
  assert.equal(game.snapshot().progress, 1);
  const frozen = JSON.stringify(game);
  game.step(1, input({ attack: true }));
  assert.equal(JSON.stringify(game), frozen);
});
test('Mario vs Kirby completes an identical full three-stock match at 30, 60 and 120 render Hz', () => {
  const results = [];
  for (const hz of [30, 60, 120]) {
    const game = new SmashSimulation();
    let accumulator = 0;
    for (let frame = 0; frame < hz * 180 && game.phase === 'playing'; frame++) {
      accumulator += 1 / hz;
      while (accumulator + 1e-12 >= 1 / 120 && game.phase === 'playing') {
        game.step(1 / 120, smashBenchmark(game));
        accumulator = Math.max(0, accumulator - 1 / 120);
      }
    }
    assert.equal(game.phase, 'won');
    assert.equal(game.opponent.stocks, 0);
    assert.ok(game.player.stocks > 0);
    assert.ok(game.hits > 15);
    assert.ok(game.time > 30 && game.time < 100);
    results.push({
      time: game.time,
      score: game.score,
      stocks: game.player.stocks,
      hits: game.hits,
    });
  }
  assert.deepEqual(results[1], results[0]);
  assert.deepEqual(results[2], results[0]);
});
