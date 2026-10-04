import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { idleInput } from '../lib/retro/types.ts';
import {
  IronSimulation,
  ironBenchmark,
  moves,
} from '../lib/retro/iron/simulation.ts';
import { createFighter, poseFighter } from '../lib/retro/iron/art.ts';
const held = (input = {}) => ({ ...idleInput(), ...input });
function advance(game, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++)
    game.step(1 / 120, held(input));
}
function duel(distance = 2) {
  const game = new IronSimulation();
  game.intro = 0;
  game.player.x = 0;
  game.opponent.x = distance;
  game.opponent.cooldown = 100;
  return game;
}
function incoming(game, move) {
  const data = moves[move];
  Object.assign(game.opponent, {
    move,
    attackTime: 0,
    attack: data.startup + data.active + data.recovery,
    tell: data.startup,
    hitResolved: false,
    facing: -1,
  });
}

test('READY freezes movement and combat; FIGHT releases a sixty-second round', () => {
  const game = new IronSimulation();
  advance(game, 0.6, { right: true, attack: true });
  assert.equal(game.player.x, -3);
  assert.equal(game.opponent.health, 100);
  assert.equal(game.roundTime, 60);
  advance(game, 0.3);
  assert.equal(game.announcement, 'FIGHT');
  advance(game, 0.4, { right: true });
  assert.ok(game.player.x > -3);
  assert.ok(game.roundTime < 60);
});

test('all four limbs have separate attacks and startup, active, recovery phases', () => {
  for (const [action, move, limb] of [
    ['attack', 'punch', 1],
    ['interact', 'cross', 2],
    ['special', 'kick', 3],
    ['ultimate', 'roundhouse', 4],
  ]) {
    const game = duel();
    game.step(1 / 120, held({ [action]: true }));
    assert.equal(game.player.move, move);
    assert.equal(moves[move].limb, limb);
    advance(game, moves[move].startup - 0.03);
    assert.equal(
      game.opponent.health,
      100,
      `${move} must not hit during startup`,
    );
    advance(game, 0.05);
    assert.ok(game.opponent.health < 100);
    const life = game.opponent.health;
    advance(game, 0.08, { [action]: true });
    assert.equal(
      game.opponent.health,
      life,
      `${move} must hit only once before recovery`,
    );
  }
});

test('back guards high and mid; crouch ducks high and down-back guards low only', () => {
  for (const [move, input, expected] of [
    ['punch', { left: true }, 'block'],
    ['kick', { left: true }, 'block'],
    ['lowKick', { left: true }, 'hit'],
    ['punch', { down: true }, 'duck'],
    ['lowKick', { down: true, left: true }, 'block'],
    ['kick', { down: true, left: true }, 'hit'],
  ]) {
    const game = duel(1.65);
    incoming(game, move);
    advance(game, moves[move].startup + 0.035, input);
    assert.equal(
      game.player.health < 100,
      expected === 'hit',
      `${JSON.stringify(move)} ${JSON.stringify(input)}`,
    );
    assert.equal(
      game.blocks > 0,
      expected === 'block',
      `${JSON.stringify(move)} ${JSON.stringify(expected)}`,
    );
  }
  const exhausted = duel(1.7);
  exhausted.player.stamina = 0;
  incoming(exhausted, 'kick');
  advance(exhausted, 0.3, { left: true });
  assert.equal(
    exhausted.player.health,
    100,
    'Tekken guard does not use a resource meter',
  );
});

test('startup interruption is a counter hit, and recovery cannot attack-cancel', () => {
  const game = duel(1.8);
  incoming(game, 'sweep');
  advance(game, 0.23, { attack: true });
  assert.equal(game.counterHits, 1);
  assert.equal(game.opponent.move, 'idle');
  assert.equal(game.player.health, 100);
  assert.ok(game.opponent.health < 100 - moves.punch.damage);
  const move = game.player.move;
  advance(game, 0.1, { ultimate: true });
  assert.equal(game.player.move, move);
});

test('sidesteps evade linear attacks and double taps produce physical dashes', () => {
  const game = duel(1.8);
  incoming(game, 'kick');
  advance(game, 0.33, { up: true });
  assert.ok(game.player.z < -0.9);
  assert.equal(game.player.health, 100);
  assert.equal(game.sidesteps, 1);
  const walk = duel(8),
    dash = duel(8);
  walk.step(1 / 120, held({ right: true }));
  dash.step(1 / 120, held({ right: true }));
  advance(walk, 0.07);
  advance(dash, 0.07);
  walk.step(1 / 120, held());
  dash.step(1 / 120, held({ right: true }));
  advance(walk, 0.1, { right: true });
  advance(dash, 0.1, { right: true });
  assert.ok(dash.player.dashTime > 0);
  assert.ok(dash.player.x > 0.7);
});

test('1,1,2 ends in a knockdown and down-forward right punch launches a juggle', () => {
  const string = duel(1.7);
  for (let hit = 0; hit < 2; hit++) {
    string.step(1 / 120, held({ attack: true }));
    advance(string, 0.49);
  }
  advance(string, 0.23, { interact: true });
  assert.equal(string.player.move, 'finisher');
  assert.ok(string.opponent.downTime > 0);
  const juggle = duel(1.7);
  advance(juggle, 0.3, { down: true, right: true, interact: true });
  assert.equal(juggle.launches, 1);
  assert.ok(juggle.opponent.y > 0);
  const launchedHealth = juggle.opponent.health;
  advance(juggle, 0.75, { right: true, attack: true });
  assert.ok(
    juggle.opponent.health < launchedHealth,
    'ordinary follow-up jab connects in the air',
  );
  assert.ok(juggle.player.combo >= 2);
  advance(juggle, 2);
  assert.equal(juggle.opponent.y, 0);
  assert.equal(juggle.opponent.downTime, 0);
  assert.equal(juggle.opponent.getup, 0);
});

test('timeout awards higher life; two round wins complete the match and freeze it', () => {
  const game = duel();
  game.roundTime = 0.01;
  game.opponent.health = 70;
  advance(game, 0.03);
  assert.equal(game.playerRounds, 1);
  assert.equal(game.announcement, 'TIME UP');
  advance(game, 3.25);
  assert.equal(game.round, 2);
  assert.equal(game.opponent.health, 100);
  game.opponent.health = 0;
  advance(game, 0.02);
  assert.equal(game.phase, 'won');
  assert.equal(game.playerRounds, 2);
  assert.equal(game.snapshot().progress, 1);
  const before = JSON.stringify(game);
  advance(game, 1, { attack: true });
  assert.equal(JSON.stringify(game), before);
});

test('fighter rigs extend the striking hand/foot with elbow and knee articulation', () => {
  const scene = new THREE.Scene();
  for (const kind of ['jin', 'hwoarang']) {
    const rig = createFighter(kind, scene),
      game = duel();
    poseFighter(rig, game.player, 0);
    rig.root.updateMatrixWorld(true);
    const fist = new THREE.Vector3(0, -0.46, 0).applyMatrix4(
      rig.arms[0].lower.matrixWorld,
    );
    Object.assign(game.player, {
      move: 'punch',
      attack: 0.2,
      attackTime: moves.punch.startup,
    });
    poseFighter(rig, game.player, 0);
    rig.root.updateMatrixWorld(true);
    const extended = new THREE.Vector3(0, -0.46, 0).applyMatrix4(
      rig.arms[0].lower.matrixWorld,
    );
    assert.ok(extended.x > fist.x + 0.3);
    assert.ok(rig.arms[0].lower.rotation.z < 0.1);
    Object.assign(game.player, {
      move: 'kick',
      attack: 0.3,
      attackTime: moves.kick.startup,
    });
    poseFighter(rig, game.player, 0);
    rig.root.updateMatrixWorld(true);
    const foot = new THREE.Vector3(0, -0.67, 0).applyMatrix4(
      rig.legs[0].lower.matrixWorld,
    );
    assert.ok(foot.x > 1);
    assert.ok(foot.y > 1.3);
    assert.ok(Math.abs(rig.legs[0].lower.rotation.z) < 0.1);
  }
});

for (const hz of [30, 60, 120])
  test(`ordinary deterministic benchmark wins two rounds at ${hz} display Hz`, () => {
    const game = new IronSimulation();
    let acc = 0;
    for (let frame = 0; frame < hz * 100 && game.phase === 'playing'; frame++) {
      acc += 1 / hz;
      const input = ironBenchmark(game);
      while (acc + 1e-12 >= 1 / 120 && game.phase === 'playing') {
        game.step(1 / 120, input);
        acc = Math.max(0, acc - 1 / 120);
      }
    }
    assert.equal(game.phase, 'won');
    assert.equal(game.playerRounds, 2);
    assert.ok(game.blocks > 0 && game.hits > 0);
    assert.ok(game.time > 15 && game.time < 90);
    assert.equal(game.snapshot().progress, 1);
  });

test('standing guard requires holding back; the old separate guard action cannot block', () => {
  const legacy = duel(1.65);
  incoming(legacy, 'kick');
  advance(legacy, 0.31, { guard: true });
  assert.ok(legacy.player.health < 100);
  assert.equal(legacy.blocks, 0);
  const backward = duel(1.65);
  incoming(backward, 'kick');
  advance(backward, 0.31, { left: true });
  assert.equal(backward.player.health, 100);
  assert.equal(backward.blocks, 1);
});
