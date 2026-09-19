import test from 'node:test';
import assert from 'node:assert/strict';
import { SonicSimulation, idleSonicInput } from '../lib/sonic/simulation.ts';
import {
  LEVEL_END,
  LOOP,
  START_X,
  checkpoints,
  groundAt,
  hazards,
  rings,
} from '../lib/sonic/world.ts';

const input = (held = {}) => ({ ...idleSonicInput, ...held });

function runFor(game, seconds, held = {}, hz = 120) {
  for (let frame = 0; frame < Math.round(seconds * hz); frame++) {
    game.advance(1 / hz, input(held));
  }
}

function startedGame() {
  const game = new SonicSimulation();
  game.start();
  return game;
}

function completeState(game) {
  return JSON.stringify(game, (_key, value) => {
    if (value instanceof Set)
      return {
        entries: [...value].sort((left, right) =>
          String(left).localeCompare(String(right)),
        ),
      };
    if (value instanceof Map) return { entries: [...value.entries()] };
    return value;
  });
}

test('Sonic accelerates, coasts with inertia, and brakes before reversing', () => {
  const game = startedGame();
  runFor(game, 0.15, { right: true });
  const earlySpeed = game.player.vx;
  runFor(game, 0.4, { right: true });
  const runningSpeed = game.player.vx;
  assert.ok(earlySpeed > 0 && runningSpeed > earlySpeed);
  const coastX = game.player.x;
  runFor(game, 0.1);
  const coastingSpeed = game.player.vx;
  assert.ok(
    game.player.x > coastX,
    'releasing the direction preserves forward motion',
  );
  assert.ok(coastingSpeed > 0 && coastingSpeed < runningSpeed);
  game.advance(1 / 120, input({ left: true }));
  assert.ok(
    game.player.vx > 0,
    'opposite input must not instantly reverse momentum',
  );
  assert.ok(game.player.vx < coastingSpeed);
  runFor(game, 0.8, { left: true });
  assert.ok(
    game.player.vx < 0,
    'sustained braking eventually changes direction',
  );
});

test('Sonic running has consistent acceleration and position at 30/60/120 Hz', () => {
  const samples = [];
  for (const hz of [30, 60, 120]) {
    const game = startedGame();
    runFor(game, 1, { right: true }, hz);
    samples.push({ x: game.player.x, vx: game.player.vx });
  }
  for (const field of ['x', 'vx']) {
    assert.ok(
      Math.max(...samples.map((sample) => sample[field])) -
        Math.min(...samples.map((sample) => sample[field])) <
        0.001,
      field,
    );
  }
});

test('Sonic jumps and lands, and holding jump does not jump again on landing', () => {
  const game = startedGame();
  const initialY = game.player.y;
  let jumps = 0;
  let wasGrounded = game.player.grounded;
  let apex = initialY;
  for (let frame = 0; frame < 120 * 4; frame++) {
    game.advance(1 / 120, input({ jump: true }));
    if (wasGrounded && !game.player.grounded) jumps++;
    wasGrounded = game.player.grounded;
    apex = Math.max(apex, game.player.y);
  }
  assert.equal(jumps, 1);
  assert.ok(apex > initialY + 1, 'jump visibly leaves the ground');
  assert.equal(game.player.grounded, true);
  assert.ok(Math.abs(game.player.y - groundAt(game.player.x)) < 0.001);
  assert.equal(game.player.vy, 0);
  game.advance(1 / 120, input());
  game.advance(1 / 120, input({ jump: true }));
  assert.equal(
    game.player.grounded,
    false,
    'release then press permits the next jump',
  );
});

test('Sonic spindash stores charge while stationary and releases forward momentum', () => {
  const game = startedGame();
  const initialX = game.player.x;
  runFor(game, 0.8, { charge: true });
  assert.ok(game.player.charging > 0.5 && game.player.charging <= 1);
  assert.ok(
    Math.abs(game.player.x - initialX) < 0.1,
    'charging does not slide across the level',
  );
  game.advance(1 / 120, input({ right: true }));
  assert.equal(game.player.charging, 0);
  assert.ok(
    game.player.vx > 30,
    'releasing stored charge launches the character',
  );
  assert.ok(game.player.x > initialX);
  const releasedSpeed = game.player.vx;
  runFor(game, 0.1);
  assert.ok(game.player.vx > 0 && game.player.vx <= releasedSpeed);
});

test('Sonic pause freezes all simulation state and resume does not catch up elapsed time', () => {
  const game = startedGame();
  runFor(game, 0.4, { right: true });
  game.pause();
  assert.equal(game.state.phase, 'paused');
  const paused = completeState(game);
  for (let frame = 0; frame < 100; frame++) {
    game.advance(1, input({ right: true, jump: true, charge: true }));
  }
  assert.equal(completeState(game), paused);
  const beforeX = game.player.x;
  game.resume();
  game.advance(1 / 120, input({ right: true }));
  assert.equal(game.state.phase, 'playing');
  assert.ok(game.player.x > beforeX && game.player.x - beforeX < 1);
});

test('Sonic pause cancels a held spindash and queued jump before inputs are cleared', () => {
  const charged = startedGame();
  runFor(charged, 0.8, { charge: true });
  assert.ok(charged.player.charging > 0.5);
  charged.pause();
  charged.resume();
  // The renderer clears held keys/touches on blur and pause. An idle resumed
  // frame must not interpret that cleanup as the player releasing a spindash.
  charged.advance(1 / 120, input());
  assert.equal(charged.player.charging, 0);
  assert.ok(Math.abs(charged.player.vx) < 1);
  assert.equal(
    charged.events.some((event) => event.type === 'dash'),
    false,
  );

  const queued = startedGame();
  queued.advance(1 / 240, input({ jump: true }));
  assert.equal(
    queued.player.grounded,
    true,
    'half a fixed step queues the jump without executing it',
  );
  queued.pause();
  queued.resume();
  queued.advance(1 / 120, input());
  assert.equal(queued.player.grounded, true);
  assert.equal(
    queued.events.some((event) => event.type === 'jump'),
    false,
  );
  queued.advance(1 / 120, input({ jump: true }));
  assert.equal(
    queued.player.grounded,
    false,
    'a fresh press after resume still jumps',
  );
});

test('Sonic invalid and zero durations are inert; stalled frames are bounded', () => {
  const game = startedGame();
  const initial = completeState(game);
  for (const dt of [0, -1, NaN, Infinity, -Infinity]) {
    game.advance(dt, input({ right: true, jump: true }));
    assert.equal(completeState(game), initial, `dt=${String(dt)}`);
  }
  const bounded = startedGame();
  game.advance(30, input({ right: true }));
  bounded.advance(0.25, input({ right: true }));
  assert.equal(completeState(game), completeState(bounded));
});

test('Sonic collects each course ring once through actual overlap', () => {
  const game = startedGame();
  const ring = rings[0];
  Object.assign(game.player, {
    x: ring.x,
    y: groundAt(ring.x),
    vx: 0,
    vy: 0,
    grounded: true,
  });
  game.advance(1 / 120);
  assert.equal(game.state.rings, 1);
  const collected = completeState(game.collected);
  runFor(game, 0.25);
  assert.equal(
    game.state.rings,
    1,
    'remaining on a ring cannot award it repeatedly',
  );
  assert.equal(completeState(game.collected), collected);
});

test('Sonic spike contact loses rings once, grants grace, then costs a life without rings', () => {
  const game = startedGame();
  runFor(game, 2, { right: true });
  assert.ok(
    game.state.rings > 0,
    'rings must be collected by normal movement before damage',
  );
  const hazard = hazards[0];
  const contact = () =>
    Object.assign(game.player, {
      x: hazard.x + hazard.width / 2,
      y: groundAt(hazard.x + hazard.width / 2),
      vx: 0,
      vy: 0,
      grounded: true,
    });
  const lives = game.state.lives;
  contact();
  game.advance(1 / 120);
  assert.equal(game.state.rings, 0);
  assert.equal(game.state.lives, lives);
  assert.ok(game.player.invulnerable > 0);
  const grace = game.player.invulnerable;
  contact();
  game.advance(1 / 120);
  assert.equal(
    game.state.lives,
    lives,
    'a second contact during grace cannot take a life',
  );
  assert.ok(
    game.player.invulnerable < grace,
    'repeated contact must not refresh grace forever',
  );
  Object.assign(game.player, {
    x: START_X,
    y: groundAt(START_X),
    vx: 0,
    vy: 0,
    grounded: true,
  });
  runFor(game, grace + 0.2);
  assert.equal(game.player.invulnerable, 0);
  contact();
  game.advance(1 / 120);
  assert.equal(game.state.lives, lives - 1);
  assert.equal(game.state.phase, 'playing');
  assert.ok(Math.abs(game.player.x - START_X) < 1);
});

test('Sonic checkpoint survives a fall and restart restores the whole fresh run', () => {
  const game = startedGame();
  const checkpoint = checkpoints[0];
  Object.assign(game.player, {
    x: checkpoint.x - 0.1,
    y: groundAt(checkpoint.x),
    vx: 20,
    vy: 0,
    grounded: true,
  });
  runFor(game, 0.1, { right: true });
  assert.equal(game.state.checkpoint, checkpoint.x);
  const lives = game.state.lives;
  Object.assign(game.player, { y: -200, vy: -30, grounded: false });
  game.advance(1 / 120);
  assert.equal(game.state.lives, lives - 1);
  assert.equal(game.state.checkpoint, checkpoint.x);
  assert.ok(Math.abs(game.player.x - checkpoint.x) < 1);
  assert.ok(game.player.invulnerable > 0);
  game.pause();
  game.start();
  const fresh = startedGame();
  assert.equal(completeState(game), completeState(fresh));
});

test('Sonic exhausting lives ends the run and terminal state is frozen until restart', () => {
  const game = startedGame();
  for (let life = 0; life < 3; life++) {
    Object.assign(game.player, { y: -200, vy: -30, grounded: false });
    game.advance(1 / 120);
  }
  assert.equal(game.state.lives, 0);
  assert.equal(game.state.phase, 'over');
  const ended = completeState(game);
  runFor(game, 1, { right: true, jump: true, charge: true });
  assert.equal(completeState(game), ended);
  game.start();
  assert.equal(game.state.phase, 'playing');
  assert.equal(game.state.lives, 3);
});

test('Sonic cannot enter the vertical loop from a slow grounded approach', () => {
  const game = startedGame();
  Object.assign(game.player, {
    x: LOOP.entryX - 0.1,
    y: groundAt(LOOP.entryX),
    vx: 8,
    vy: 0,
    grounded: true,
  });
  runFor(game, 1, { right: true });
  assert.equal(game.state.loopCount, 0);
  assert.equal(game.player.loopProgress, null);
  assert.ok(
    game.player.y < LOOP.y,
    'insufficient momentum follows the lower ground route',
  );
});

test('Sonic rolling retains momentum and defeats an enemy through collision', () => {
  const rolling = startedGame();
  const upright = startedGame();
  runFor(rolling, 0.8, { right: true });
  runFor(upright, 0.8, { right: true });
  runFor(rolling, 0.4, { roll: true });
  runFor(upright, 0.4);
  assert.ok(rolling.player.vx > upright.player.vx);
  assert.ok(rolling.player.x > upright.player.x);
  const enemy = rolling.enemyPositions[0];
  Object.assign(rolling.player, {
    x: enemy.x,
    y: enemy.y,
    vx: 20,
    vy: 0,
    grounded: true,
  });
  const lives = rolling.state.lives;
  const score = rolling.state.score;
  rolling.advance(1 / 120, input({ roll: true }));
  assert.equal(rolling.enemyAlive[0], false);
  assert.equal(rolling.state.lives, lives);
  assert.ok(rolling.state.score > score);
  assert.ok(rolling.events.some((event) => event.type === 'enemy'));
});

test('Sonic can jump off the loop into continuous free flight without a false completed lap', () => {
  const game = startedGame();
  for (
    let frame = 0;
    frame < 120 * 30 && (game.player.loopProgress ?? 0) < 1;
    frame++
  ) {
    game.advance(1 / 120, input({ right: true }));
  }
  assert.ok(game.player.loopProgress >= 1);
  const before = { x: game.player.x, y: game.player.y };
  game.advance(1 / 120, input({ right: true, jump: true }));
  assert.equal(game.player.loopProgress, null);
  assert.equal(game.player.grounded, false);
  assert.equal(game.state.loopCount, 0);
  assert.ok(Math.hypot(game.player.x - before.x, game.player.y - before.y) < 1);
  assert.ok(Math.hypot(game.player.vx, game.player.vy) > 20);
  runFor(game, 0.1, { right: true });
  assert.equal(game.player.loopProgress, null);
  assert.equal(game.player.grounded, false);
  assert.ok(Math.hypot(game.player.x - before.x, game.player.y - before.y) > 1);
});

for (const hz of [30, 60, 120]) {
  test(`Sonic completes the actual course with charge, jump and running input at ${hz} Hz`, () => {
    const game = startedGame();
    const visited = [];
    let entered = false;
    let exited = false;
    let jumpObserved = false;
    let releaseObserved = false;
    let exitSpeed = 0;
    let previousLoopProgress = null;
    for (
      let frame = 0;
      frame < hz * 100 && game.state.phase === 'playing';
      frame++
    ) {
      const seconds = frame / hz;
      const charge = seconds < 0.8;
      const jump = seconds >= 1.4 && seconds < 1.75;
      const before = {
        x: game.player.x,
        y: game.player.y,
        lives: game.state.lives,
      };
      game.advance(1 / hz, input({ charge, jump, right: !charge }));
      if (!charge && game.player.vx > 30) releaseObserved = true;
      if (jump && !game.player.grounded && game.player.vy > 0)
        jumpObserved = true;
      const progress = game.player.loopProgress;
      if (progress !== null) {
        entered = true;
        visited.push({ x: game.player.x, y: game.player.y });
        assert.ok(progress >= 0 && progress <= Math.PI * 2);
        if (previousLoopProgress !== null)
          assert.ok(progress > previousLoopProgress);
      }
      if (
        previousLoopProgress !== null &&
        progress === null &&
        game.state.loopCount > 0
      ) {
        exited = true;
        exitSpeed = game.player.vx;
      }
      if (progress !== null || previousLoopProgress !== null) {
        assert.equal(
          game.state.lives,
          before.lives,
          'loop traversal must not rely on a death/respawn',
        );
        assert.ok(
          Math.hypot(game.player.x - before.x, game.player.y - before.y) < 4,
          'loop entry, traversal, and exit must be continuous at every supported frame rate',
        );
      }
      previousLoopProgress = progress;
    }
    // Only game.advance receives movement inputs. No player position, health,
    // collectible, invulnerability, checkpoint, or phase is changed by this controller.
    assert.equal(game.state.phase, 'won');
    assert.ok(game.player.x >= LEVEL_END);
    assert.ok(game.state.lives > 0);
    assert.ok(game.state.rings > 0);
    assert.ok(game.state.loopCount >= 1);
    assert.ok(
      releaseObserved && jumpObserved,
      'the controller performs a real spindash and jump',
    );
    assert.ok(entered && exited);
    assert.ok(exitSpeed > 20, 'the loop preserves useful forward momentum');
    assert.ok(
      Math.max(...visited.map((point) => point.x)) >
        LOOP.x + LOOP.radius * 0.95,
    );
    assert.ok(
      Math.min(...visited.map((point) => point.x)) <
        LOOP.x - LOOP.radius * 0.95,
    );
    assert.ok(
      Math.max(...visited.map((point) => point.y)) >
        LOOP.y + LOOP.radius * 0.95,
      'the character traverses the top of a full vertical loop, not a lower arc',
    );
    const won = completeState(game);
    runFor(game, 0.5, { right: true, jump: true });
    assert.equal(completeState(game), won, 'winning freezes the completed run');
  });
}
