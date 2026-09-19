import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput } from '../lib/retro/types.ts';
import {
  SmashSimulation,
  smashBenchmark,
} from '../lib/retro/smash/simulation.ts';
import { IronSimulation, ironBenchmark } from '../lib/retro/iron/simulation.ts';

const held = (input = {}) => ({ ...idleInput(), ...input });
const advance = (game, seconds, input = {}) => {
  for (let frame = 0; frame < Math.round(seconds * 120); frame += 1)
    game.step(1 / 120, held(input));
};

function runBenchmark(Simulation, benchmark, hz) {
  const game = new Simulation();
  let accumulator = 0;
  for (
    let frame = 0;
    frame < hz * 100 && game.phase === 'playing';
    frame += 1
  ) {
    accumulator += 1 / hz;
    const input = benchmark(game);
    while (accumulator + 1e-12 >= 1 / 120 && game.phase === 'playing') {
      game.step(1 / 120, input);
      accumulator = Math.max(0, accumulator - 1 / 120);
    }
  }
  return game;
}

test('rooftop movement, double jump, and umbrella recovery use physical velocity', () => {
  const game = new SmashSimulation();
  advance(game, 0.25, { right: true });
  assert.ok(game.player.x > -5 && game.player.vx > 0);
  game.step(1 / 120, held({ jump: true }));
  assert.equal(game.player.jumps, 1);
  assert.ok(game.player.vy > 0);
  advance(game, 0.2);
  game.step(1 / 120, held({ jump: true }));
  assert.equal(game.player.jumps, 2);
  advance(game, 0.2);
  game.step(1 / 120, held({ jump: true }));
  assert.equal(
    game.player.jumps,
    2,
    'third jump must not reset airborne resources',
  );
  game.step(1 / 120, held({ special: true }));
  assert.equal(game.player.recoveryUsed, true);
  assert.ok(game.player.vy > 14);
  const before = game.player.y;
  game.step(1 / 120, held({ special: true }));
  assert.ok(
    game.player.y > before && game.player.y - before < 0.2,
    'recovery moves continuously without teleporting',
  );
});

test('rooftop damage produces knockback and shield prevents a connecting hit', () => {
  const game = new SmashSimulation();
  Object.assign(game.player, { x: 0, invulnerable: 0 });
  Object.assign(game.opponent, {
    x: 2,
    invulnerable: 0,
    tell: 0.004,
    facing: -1,
  });
  game.step(1 / 120, held({ guard: true }));
  assert.equal(game.player.percent, 0);
  assert.equal(game.blocked, 1);
  assert.ok(game.player.shield < 1);
  game.player.cooldown = 0;
  game.step(1 / 120, held({ attack: true }));
  assert.equal(game.opponent.percent, 9);
  assert.ok(game.opponent.vx > 0 && game.opponent.vy > 0);
  assert.equal(game.hits, 1);
});

test('rooftop shield has a finite resource and ring-outs consume three stocks', () => {
  const game = new SmashSimulation();
  Object.assign(game.player, { x: -10, shield: 0.08 });
  advance(game, 0.1, { guard: true });
  assert.ok(game.player.shield < 0.08);
  for (let stock = 2; stock >= 0; stock -= 1) {
    game.opponent.x = 25;
    game.step(1 / 120, held());
    assert.equal(game.opponent.stocks, stock);
  }
  assert.equal(game.phase, 'won');
  assert.equal(game.snapshot().progress, 1);
  const completed = JSON.stringify(game);
  game.step(1, held({ attack: true }));
  assert.equal(JSON.stringify(game), completed);
});

test('dojo punch combinations, kick range, and depth sidesteps use actual hitboxes', () => {
  const game = new IronSimulation();
  game.player.x = 0;
  game.opponent.x = 2;
  game.opponent.cooldown = 10;
  advance(game, 1.2, { attack: true });
  assert.ok(game.opponent.health < 100);
  assert.ok(
    game.player.combo >= 2,
    'timed repeated punches chain into a combination',
  );
  const evade = new IronSimulation();
  evade.player.x = 0;
  evade.opponent.x = 2;
  evade.opponent.z = 2.7;
  advance(evade, 0.25, { attack: true });
  assert.equal(
    evade.opponent.health,
    100,
    'a punch cannot hit through another depth lane',
  );
  const kick = new IronSimulation();
  kick.player.x = 0;
  kick.opponent.x = 3;
  advance(kick, 0.4, { special: true });
  assert.ok(
    kick.opponent.health < 100,
    'long kick connects beyond punch range',
  );
});

test('dojo readable attack tells give guard time and blocks spend stamina', () => {
  const game = new IronSimulation();
  game.player.x = 0;
  game.opponent.x = 2;
  let sawTell = false;
  for (let frame = 0; frame < 120 * 5; frame += 1) {
    if (game.opponent.tell > 0) sawTell = true;
    game.step(1 / 120, held({ guard: true }));
  }
  assert.equal(sawTell, true);
  assert.ok(game.blocks > 0);
  assert.equal(game.player.health, 100);
  assert.ok(game.player.stamina < 1);
});

test('dojo health depletion awards a round, resets fighters, and ends at two rounds', () => {
  const game = new IronSimulation();
  game.opponent.health = 0;
  game.step(1 / 120, held());
  assert.equal(game.playerRounds, 1);
  assert.ok(game.roundBreak > 0);
  advance(game, 2.1);
  assert.equal(game.round, 2);
  assert.equal(game.opponent.health, 100);
  game.opponent.health = 0;
  game.step(1 / 120, held());
  assert.equal(game.playerRounds, 2);
  assert.equal(game.phase, 'won');
  assert.equal(game.snapshot().progress, 1);
});

for (const [name, Simulation, benchmark] of [
  ['Rooftop Rumble', SmashSimulation, smashBenchmark],
  ['Iron Fist Delivery', IronSimulation, ironBenchmark],
]) {
  test(`${String(name)} ignores invalid elapsed time and freezes a finished match`, () => {
    const game = new Simulation();
    const before = JSON.stringify(game);
    for (const dt of [0, -1, Infinity, NaN])
      game.step(dt, held({ attack: true }));
    assert.equal(JSON.stringify(game), before);
    game.phase = 'lost';
    const lost = JSON.stringify(game);
    game.step(1 / 120, held({ right: true, special: true }));
    assert.equal(JSON.stringify(game), lost);
  });
  for (const hz of [30, 60, 120]) {
    test(`${String(name)} wins with ordinary benchmark inputs through a 120 Hz clock at ${hz} render Hz`, () => {
      const game = runBenchmark(Simulation, benchmark, hz);
      assert.equal(game.phase, 'won');
      assert.ok(
        game.time >= 30 && game.time <= 90,
        `completion time ${game.time}`,
      );
      assert.ok(game.hits > 0);
      assert.ok(game.score > 0);
      assert.equal(game.snapshot().progress, 1);
      if (game instanceof SmashSimulation) assert.ok(game.player.stocks > 0);
      else assert.equal(game.playerRounds, 2);
    });
  }
}
