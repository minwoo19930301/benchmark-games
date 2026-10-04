import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, idleInput } from '../lib/game/simulation.ts';
import {
  newPlayer,
  stepPlayer,
  platforms,
  PLAYER_HEIGHT,
} from '../lib/game/world.ts';
import { followCamera } from '../lib/game/camera.ts';
import { GameControls } from '../lib/game/input.ts';

test('camera contains the whole character moving either direction at portrait and landscape ratios', () => {
  for (const aspect of [320 / 900, 390 / 844, 768 / 1024, 16 / 9, 32 / 9]) {
    let cameraX = 68,
      x = 65;
    for (const facing of [-1, 1, -1])
      for (let frame = 0; frame < 120; frame++) {
        x += (facing * 8.6) / 60;
        cameraX = followCamera(cameraX, x, facing, aspect, 1 / 60);
        assert.ok(x - 0.55 >= cameraX - 7.3 * aspect);
        assert.ok(x + 0.55 <= cameraX + 7.3 * aspect);
      }
  }
});
test('enemy patrols never enter pipes or leave their support', () => {
  const game = new Simulation();
  game.start();
  for (let frame = 0; frame < 120 * 20; frame++) {
    game.advance(1 / 120);
    for (const e of game.enemies) {
      assert.ok(
        !platforms.some(
          (b) =>
            b.y < 0.88 &&
            b.y + b.h > 0 &&
            e.x + 0.48 > b.x &&
            e.x - 0.48 < b.x + b.w,
        ),
      );
      assert.ok(
        platforms.some(
          (b) =>
            b.kind === 'ground' && e.x - 0.48 >= b.x && e.x + 0.48 <= b.x + b.w,
        ),
      );
    }
  }
});
test('a head impact stops the visible cap at the underside of the block', () => {
  const p = newPlayer();
  p.x = 9.5;
  let hit = false;
  for (let i = 0; i < 120; i++) {
    const blocks = stepPlayer(p, { ...idleInput, jump: true }, 1 / 120);
    if (blocks.length) {
      hit = true;
      assert.ok(p.y + PLAYER_HEIGHT <= 3 + 1e-10);
      break;
    }
  }
  assert.ok(hit);
});

test('walk and run are frame-rate independent at 30/60/120 Hz', () => {
  for (const run of [false, true]) {
    const positions = [];
    for (const hz of [30, 60, 120]) {
      const game = new Simulation();
      game.start();
      for (let i = 0; i < hz; i++)
        game.advance(1 / hz, { ...idleInput, right: true, run });
      positions.push(game.player.x);
    }
    assert.ok(Math.max(...positions) - Math.min(...positions) < 0.001);
  }
});
test('rising against either pipe side does not become a false ceiling impact', () => {
  for (const direction of [-1, 1]) {
    const p = newPlayer();
    Object.assign(p, {
      x: direction > 0 ? 76.624583333333 : 79.375416666667,
      y: 1.907430555556,
      vx: direction * 8.6,
      vy: 8.216666666667,
      grounded: false,
      coyote: 0,
      jumpHeld: true,
    });
    const pipe = {
      x: 77,
      y: 0,
      w: 2,
      h: 2,
      kind: 'pipe',
    };
    const beforeY = p.y;
    const hits = stepPlayer(
      p,
      {
        left: direction < 0,
        right: direction > 0,
        run: true,
        jump: true,
      },
      1 / 120,
      [pipe],
    );
    assert.ok(Math.abs(p.x - (direction > 0 ? 76.68 : 79.32)) < 1e-10);
    assert.ok(p.y > beforeY);
    assert.ok(p.vy > 0);
    assert.deepEqual(hits, []);
  }
});
test('full jump clears the tallest pipe and release produces a short jump', () => {
  const terrain = [{ x: -10, y: -2, w: 20, h: 2, kind: 'ground' }];
  const maxHeight = (hold) => {
    const p = newPlayer();
    let max = 0;
    for (let i = 0; i < 240; i++) {
      stepPlayer(
        p,
        { ...idleInput, jump: i === 0 || (hold && i < 70) },
        1 / 120,
        terrain,
      );
      max = Math.max(max, p.y);
    }
    return max;
  };
  assert.ok(maxHeight(true) > 2.6);
  assert.ok(maxHeight(false) < maxHeight(true) - 0.5);
});
test('holding jump cannot auto-jump again after landing', () => {
  const p = newPlayer();
  let jumps = 0,
    wasGrounded = true;
  for (let i = 0; i < 600; i++) {
    stepPlayer(p, { ...idleInput, jump: true }, 1 / 120);
    if (wasGrounded && !p.grounded) jumps++;
    wasGrounded = p.grounded;
  }
  assert.equal(jumps, 1);
  assert.equal(p.y, 0);
});
test('pause freezes the complete simulation and resumes without clock catchup', () => {
  const game = new Simulation();
  game.start();
  game.advance(0.5, { ...idleInput, right: true });
  game.pause();
  const before = JSON.stringify(game);
  for (let i = 0; i < 200; i++)
    game.advance(0.1, { ...idleInput, right: true, jump: true });
  assert.equal(JSON.stringify(game), before);
  game.resume();
  game.advance(0.1);
  assert.ok(game.state.time > 179);
});
test('restart restores coins, lives, enemies, player and timer', () => {
  const game = new Simulation();
  game.start();
  for (let i = 0; i < 70; i++) game.advance(0.1, { ...idleInput, right: true });
  game.die();
  game.pause();
  game.start();
  assert.equal(game.state.lives, 3);
  assert.equal(game.state.coins, 0);
  assert.equal(game.state.time, 180);
  assert.equal(game.player.x, 1);
  assert.equal(game.collected.size, 0);
  assert.equal(game.usedBlocks.size, 0);
  assert.ok(game.enemies.every((e) => e.alive && e.x === e.start));
});
test('timeout and last life end the game, and invalid frame durations fail intentionally', () => {
  const game = new Simulation();
  game.start();
  for (let i = 0; i < 181; i++) game.advance(1);
  assert.equal(game.state.phase, 'over');
  game.start();
  game.die();
  game.die();
  game.die();
  assert.equal(game.state.phase, 'over');
  assert.equal(game.state.lives, 0);
  for (const dt of [-1, NaN, Infinity, 2])
    assert.throws(() => game.advance(dt), RangeError);
});
for (const run of [true, false]) {
  // Walking needs later takeoff than running, without changing the level.
  const timing = run
    ? { raised: 3.3, gap: 2, enemy: 3 }
    : { raised: 2, gap: 0.2, enemy: 1.7 };
  for (const hz of [30, 60, 120])
    test(`complete the actual level through touch ${run ? 'run-toggle' : 'walk-only'}/jump input at ${hz} Hz`, () => {
      const game = new Simulation();
      const controls = new GameControls();
      game.start();
      controls.set('right', 'pointer:1', true);
      controls.setRunToggle(run);
      let jumps = 0,
        lastJump = false;
      for (
        let frame = 0;
        frame < hz * 100 && game.state.phase === 'playing';
        frame++
      ) {
        const p = game.player;
        const raised = platforms.some(
          (b) =>
            b.kind !== 'ground' &&
            b.x - p.x > 0 &&
            b.x - p.x < timing.raised &&
            b.y + b.h > p.y + 0.15 &&
            b.y < p.y + 1.45,
        );
        const ground = platforms.find(
          (b) => b.kind === 'ground' && p.x >= b.x && p.x <= b.x + b.w,
        );
        const gap = Boolean(ground && ground.x + ground.w - p.x < timing.gap);
        const enemy = game.enemies.some(
          (e) =>
            e.alive && e.x - p.x > 0 && e.x - p.x < timing.enemy && p.y < 1,
        );
        const jump = p.vy > 0 || (p.grounded && (raised || gap || enemy));
        if (jump && !lastJump) jumps++;
        lastJump = jump;
        const beforeX = p.x;
        const beforeLives = game.state.lives;
        controls.set('jump', 'pointer:2', jump);
        game.advance(1 / hz, controls.sample());
        if (game.state.lives === beforeLives)
          assert.ok(
            p.x >= beforeX - 0.5,
            'no backward teleport outside normal life reset',
          );
      }
      // No positions, coins, enemies, lives or game phase are patched by this test.
      assert.equal(game.state.phase, 'won');
      assert.ok(game.player.x >= 99);
      assert.ok(game.state.coins >= 10);
      assert.ok(game.state.lives > 0);
      assert.ok(jumps >= 10);
      assert.ok(game.enemies.some((e) => !e.alive));
    });
}
