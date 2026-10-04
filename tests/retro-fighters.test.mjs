import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput } from '../lib/retro/types.ts';
import {
  SmashSimulation,
  smashBenchmark,
} from '../lib/retro/smash/simulation.ts';
import { IronSimulation, ironBenchmark } from '../lib/retro/iron/simulation.ts';

const held = (input = {}) => ({ ...idleInput(), ...input });

function runBenchmark(Simulation, benchmark, hz) {
  const game = new Simulation();
  let accumulator = 0;
  for (let frame = 0; frame < hz * 100 && game.phase === 'playing'; frame++) {
    accumulator += 1 / hz;
    // One rendered input snapshot is held over the fixed 120 Hz physics ticks.
    const input = benchmark(game);
    while (accumulator + 1e-12 >= 1 / 120 && game.phase === 'playing') {
      game.step(1 / 120, input);
      accumulator = Math.max(0, accumulator - 1 / 120);
    }
  }
  return game;
}

// Character-specific mechanics live in the dedicated Smash and Iron suites.
// These contracts are shared by both cartridge runtimes and benchmark schedules.
for (const { name, Simulation, benchmark, minTime } of [
  {
    name: 'Super Smash Bros.',
    Simulation: SmashSimulation,
    benchmark: smashBenchmark,
    minTime: 30,
  },
  {
    name: 'Tekken 3',
    Simulation: IronSimulation,
    benchmark: ironBenchmark,
    minTime: 15,
  },
]) {
  test(`${name} ignores invalid elapsed time before changing any state`, () => {
    const game = new Simulation(),
      before = JSON.stringify(game);
    for (const dt of [0, -1, Infinity, NaN])
      game.step(dt, held({ attack: true }));
    assert.equal(JSON.stringify(game), before);
  });

  test(`${name} freezes both terminal match states`, () => {
    for (const phase of ['won', 'lost']) {
      const game = new Simulation();
      game.phase = phase;
      const before = JSON.stringify(game);
      game.step(1 / 120, held({ right: true, special: true, attack: true }));
      game.step(1, held({ jump: true }));
      assert.equal(JSON.stringify(game), before);
    }
  });

  test(`${name} benchmark only emits normal inputs and does not mutate the match`, () => {
    const game = new Simulation(),
      before = JSON.stringify(game);
    const input = benchmark(game);
    assert.equal(JSON.stringify(game), before);
    for (const key of Object.keys(idleInput()))
      assert.equal(typeof input[key], 'boolean');
  });

  for (const hz of [30, 60, 120]) {
    test(`${name} wins through a fixed 120 Hz clock at ${hz} render Hz`, () => {
      const game = runBenchmark(Simulation, benchmark, hz);
      assert.equal(game.phase, 'won');
      assert.ok(
        game.time >= minTime && game.time <= 90,
        `completion time ${game.time}`,
      );
      assert.ok(game.hits > 0);
      assert.ok(game.score > 0);
      assert.equal(game.snapshot().progress, 1);
      if (game instanceof SmashSimulation) {
        assert.ok(game.player.stocks > 0);
        assert.equal(game.opponent.stocks, 0);
      } else {
        assert.equal(game.playerRounds, 2);
        assert.ok(game.opponentRounds < 2);
      }
      const completed = JSON.stringify(game);
      game.step(1 / 120, held({ attack: true }));
      assert.equal(JSON.stringify(game), completed);
    });
  }
}
