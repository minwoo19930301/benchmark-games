import assert from 'node:assert/strict';
import test from 'node:test';
import { TempleSimulation, FLOOR } from '../lib/retro/temple/simulation.ts';
import { idleInput } from '../lib/retro/types.ts';

test('native timer remains finite and is inert for invalid elapsed time or a completed temple', () => {
  const game = new TempleSimulation(),
    before = JSON.stringify(game);
  for (const dt of [NaN, Infinity, -1, 0]) game.step(dt, idleInput());
  assert.equal(JSON.stringify(game), before);
  game.step(1, idleInput());
  assert.equal(game.time, 0.05);
  game.phase = 'won';
  const won = JSON.stringify(game);
  game.step(0.05, idleInput());
  assert.equal(JSON.stringify(game), won);
});

test('both colors of diamonds retain ownership and green pools remain lethal to either hero', () => {
  for (const element of [0, 1]) {
    const game = new TempleSimulation();
    const pool = game.level.pools.find(
      (p) => p.element === game.heroes[element].element,
    );
    game.heroes[element].x = pool.x + pool.w / 2;
    game.heroes[element].y = FLOOR;
    game.step(1 / 120, idleInput());
    assert.equal(game.deaths, 0);
    assert.equal(game.collected.size, 1);
    const poison = game.level.pools.find((p) => p.element === 'poison');
    game.heroes[element].x = poison.x + poison.w / 2;
    game.step(1 / 120, idleInput());
    assert.equal(game.deaths, 1);
    assert.equal(game.collected.size, 0);
    assert.equal(game.room, 0);
  }
});
