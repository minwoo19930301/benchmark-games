import test from 'node:test';
import assert from 'node:assert/strict';
import { GameControls, createKeyboardHandlers } from '../lib/game/input.ts';
import { Simulation, idleInput } from '../lib/game/simulation.ts';
import { newPlayer, stepPlayer } from '../lib/game/world.ts';

function keyboardEvent(code, options = {}) {
  return {
    code,
    repeat: false,
    target: null,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...options,
  };
}

for (const hz of [30, 60, 120, 240]) {
  test(`a keyboard tap between rendered frames still makes one short jump at ${hz} Hz`, () => {
    const game = new Simulation();
    const controls = new GameControls();
    const keyboard = createKeyboardHandlers(
      controls,
      () => game.state.phase === 'playing',
      () => {},
    );
    game.start();
    keyboard.keydown(keyboardEvent('Space'));
    keyboard.keyup(keyboardEvent('Space'));
    // The first RAF after start/resume has dt=0. It must not eat the tap.
    game.advance(0, controls.sample());
    let maxHeight = 0;
    let jumps = 0;
    for (let i = 0; i < hz * 2; i++) {
      const before = game.player.grounded;
      game.advance(1 / hz, controls.sample());
      if (before && !game.player.grounded) jumps++;
      maxHeight = Math.max(maxHeight, game.player.y);
    }
    assert.equal(jumps, 1);
    assert.ok(
      maxHeight > 1.5 && maxHeight < 2.6,
      `released tap height: ${maxHeight}`,
    );
    assert.equal(game.player.y, 0);
  });
}

test('a touch tap survives a frame shorter than the fixed physics step', () => {
  const game = new Simulation();
  const controls = new GameControls();
  game.start();
  controls.set('jump', 'pointer:7', true);
  controls.set('jump', 'pointer:7', false);
  game.advance(1 / 240, controls.sample());
  assert.equal(game.player.y, 0);
  game.advance(1 / 240, controls.sample());
  assert.ok(game.player.vy > 0);
  assert.ok(game.player.y > 0);
});

test('a released tap just before landing uses the normal jump buffer', () => {
  const p = newPlayer();
  Object.assign(p, { y: 0.025, vy: -1, grounded: false, coyote: 0 });
  stepPlayer(p, { ...idleInput, jumpPressed: true }, 1 / 120);
  for (let frame = 0; frame < 10; frame++) {
    stepPlayer(p, { ...idleInput, jumpPressed: false }, 1 / 120);
    if (p.vy > 0) break;
  }
  assert.ok(
    p.vy > 0,
    'a press just before touchdown should launch after landing',
  );
});

test('an airborne tap expires instead of causing a surprise jump on a later landing', () => {
  const p = newPlayer();
  Object.assign(p, { y: 5, vy: 0, grounded: false, coyote: 0 });
  stepPlayer(p, { ...idleInput, jumpPressed: true }, 1 / 120);
  for (let frame = 0; frame < 240; frame++) {
    stepPlayer(p, { ...idleInput, jumpPressed: false }, 1 / 120);
    assert.ok(p.vy <= 0);
  }
  assert.equal(p.y, 0);
});

test('holding and repeating jump does not bounce again, but release/repress between frames does', () => {
  const game = new Simulation();
  const controls = new GameControls();
  const keyboard = createKeyboardHandlers(
    controls,
    () => true,
    () => {},
  );
  game.start();
  keyboard.keydown(keyboardEvent('Space'));
  for (let frame = 0; frame < 180; frame++) {
    keyboard.keydown(keyboardEvent('Space', { repeat: true }));
    game.advance(1 / 60, controls.sample());
  }
  assert.equal(game.player.y, 0);
  assert.equal(game.player.jumpHeld, true);
  keyboard.keyup(keyboardEvent('Space'));
  keyboard.keydown(keyboardEvent('Space'));
  game.advance(1 / 60, controls.sample());
  assert.ok(game.player.vy > 0);
});

test('each key and finger releases independently, including repeated capture-loss events', () => {
  const controls = new GameControls();
  const keyboard = createKeyboardHandlers(
    controls,
    () => true,
    () => {},
  );
  keyboard.keydown(keyboardEvent('ArrowRight'));
  keyboard.keydown(keyboardEvent('KeyD'));
  controls.set('right', 'pointer:1', true);
  controls.set('right', 'pointer:2', true);
  keyboard.keyup(keyboardEvent('ArrowRight'));
  controls.set('right', 'pointer:1', false);
  controls.set('right', 'pointer:1', false);
  assert.equal(controls.sample().right, true);
  keyboard.keyup(keyboardEvent('KeyD'));
  assert.equal(controls.sample().right, true);
  controls.set('right', 'pointer:2', false);
  assert.equal(controls.sample().right, false);
});

test('releasing one jump source does not shorten a jump held by another source', () => {
  const controls = new GameControls();
  controls.set('jump', 'key:Space', true);
  controls.set('jump', 'pointer:2', true);
  assert.equal(controls.sample().jumpPressed, true);
  controls.set('jump', 'key:Space', false);
  assert.equal(controls.sample().jump, true);
  controls.set('jump', 'pointer:2', false);
  assert.equal(controls.sample().jump, false);
});

test('clear drops held movement, run and queued taps, and OS repeat cannot revive them', () => {
  const controls = new GameControls();
  const keyboard = createKeyboardHandlers(
    controls,
    () => true,
    () => {},
  );
  keyboard.keydown(keyboardEvent('ArrowRight'));
  keyboard.keydown(keyboardEvent('Space'));
  controls.set('run', 'touch:run-toggle', true);
  controls.clear();
  keyboard.keydown(keyboardEvent('ArrowRight', { repeat: true }));
  keyboard.keydown(keyboardEvent('Space', { repeat: true }));
  assert.deepEqual(controls.sample(), { ...idleInput, jumpPressed: false });
  keyboard.keyup(keyboardEvent('ArrowRight'));
  keyboard.keydown(keyboardEvent('ArrowRight'));
  assert.equal(controls.sample().right, true);
});

test('pause/restart discards a tap waiting for its first physics step', () => {
  for (const transition of ['pause', 'restart']) {
    const game = new Simulation();
    game.start();
    game.advance(0, { ...idleInput, jumpPressed: true });
    if (transition === 'pause') {
      game.pause();
      game.advance(0, { ...idleInput, jumpPressed: true });
      game.resume();
    } else game.start();
    game.advance(1 / 60, idleInput);
    assert.equal(game.player.y, 0);
    assert.equal(game.player.vy, 0);
  }
});

test('paused/game-over keyboard inputs and controls focused inside a button stay out of gameplay', () => {
  const controls = new GameControls();
  let active = false;
  let pauses = 0;
  const keyboard = createKeyboardHandlers(
    controls,
    () => active,
    () => pauses++,
  );
  const paused = keyboardEvent('Space');
  keyboard.keydown(paused);
  assert.equal(paused.defaultPrevented, false);
  active = true;
  const focusedButton = keyboardEvent('Space', {
    target: { closest: () => ({ tagName: 'BUTTON' }) },
  });
  keyboard.keydown(focusedButton);
  assert.equal(focusedButton.defaultPrevented, false);
  assert.deepEqual(controls.sample(), { ...idleInput, jumpPressed: false });
  keyboard.keydown(keyboardEvent('Escape'));
  keyboard.keydown(keyboardEvent('Escape', { repeat: true }));
  assert.equal(pauses, 1);
});

test('touch run has keyboard running speed and releasing it preserves a held Shift key', () => {
  const positions = [];
  for (const source of ['touch:run-toggle', 'key:ShiftLeft']) {
    const controls = new GameControls();
    const game = new Simulation();
    game.start();
    controls.set('right', 'pointer:1', true);
    if (source === 'touch:run-toggle') controls.setRunToggle(true);
    else controls.set('run', source, true);
    for (let frame = 0; frame < 60; frame++)
      game.advance(1 / 60, controls.sample());
    assert.ok(game.player.vx > 8);
    positions.push(game.player.x);
  }
  assert.equal(positions[0], positions[1]);
  const controls = new GameControls();
  controls.setRunToggle(true);
  controls.set('run', 'key:ShiftLeft', true);
  controls.setRunToggle(false);
  assert.equal(controls.sample().run, true);
  controls.set('run', 'key:ShiftLeft', false);
  assert.equal(controls.sample().run, false);
});

test('clearing physical inputs for pause/restart retains the touch run preference without moving', () => {
  const controls = new GameControls();
  controls.setRunToggle(true);
  controls.set('right', 'pointer:1', true);
  controls.clear();
  assert.deepEqual(controls.sample(), {
    ...idleInput,
    run: true,
    jumpPressed: false,
  });
  const game = new Simulation();
  game.start();
  game.advance(0.5, controls.sample());
  assert.equal(game.player.x, 1);
  controls.set('right', 'pointer:2', true);
  game.advance(0.5, controls.sample());
  assert.ok(game.player.vx > 8);
});
