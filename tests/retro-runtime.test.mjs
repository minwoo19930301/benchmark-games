import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntime } from '../lib/retro/runtime.ts';
import { idleInput } from '../lib/retro/types.ts';

class EventHub {
  listeners = new Map();
  addEventListener(type, listener) {
    const entries = this.listeners.get(type) ?? new Set();
    entries.add(listener);
    this.listeners.set(type, entries);
  }
  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
  listenerCount() {
    return [...this.listeners.values()].reduce(
      (sum, entries) => sum + entries.size,
      0,
    );
  }
}
class ElementMock extends EventHub {
  interactive = false;
  closest() {
    return this.interactive ? this : null;
  }
}

function browser(t, options = {}) {
  const windowMock = new EventHub();
  windowMock.devicePixelRatio = 2;
  const documentMock = new EventHub();
  documentMock.hidden = options.hidden ?? false;
  const canvas = new ElementMock();
  canvas.clientWidth = 800;
  canvas.clientHeight = 600;
  canvas.getBoundingClientRect = () => ({
    left: 20,
    top: 30,
    width: 800,
    height: 600,
  });
  canvas.setPointerCapture = () => {
    if (documentMock.pointerLockElement)
      throw new Error('InvalidStateError: pointer locked');
  };
  // Real browsers reject capture while pointer lock is active.
  canvas.hasPointerCapture = () => false;
  documentMock.pointerLockElement = null;
  documentMock.exitPointerLock = () => {
    documentMock.pointerLockElement = null;
    documentMock.emit('pointerlockchange');
  };
  canvas.requestPointerLock = () => {
    documentMock.pointerLockElement = canvas;
    documentMock.emit('pointerlockchange');
    return Promise.resolve();
  };
  canvas.focuses = [];
  canvas.focus = (config) => {
    canvas.focuses.push(config);
  };
  const callbacks = new Map();
  const canceled = [];
  const observers = [];
  const runtimes = [];
  let nextFrame = 0;
  class ResizeObserverMock {
    disconnected = false;
    disconnects = 0;
    target = null;
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(target) {
      if (options.observeThrows) throw new Error('observer setup failed');
      this.target = target;
    }
    disconnect() {
      this.disconnected = true;
      this.disconnects += 1;
    }
    resize() {
      this.callback([{ target: this.target }]);
    }
  }
  const replacements = {
    window: windowMock,
    document: documentMock,
    navigator: { userAgent: 'Deterministic runtime test browser' },
    HTMLElement: ElementMock,
    ResizeObserver: ResizeObserverMock,
    requestAnimationFrame(callback) {
      const id = ++nextFrame;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      canceled.push(id);
      callbacks.delete(id);
    },
  };
  const original = new Map();
  for (const [key, value] of Object.entries(replacements)) {
    original.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  t.after(() => {
    runtimes.forEach((runtime) => runtime.dispose());
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    window: windowMock,
    document: documentMock,
    canvas,
    callbacks,
    canceled,
    observers,
    runtimes,
    frame(timestamp) {
      const waiting = [...callbacks.entries()];
      callbacks.clear();
      for (const [, callback] of waiting) callback(timestamp);
    },
    key(type, code, target = canvas) {
      const event = {
        code,
        target,
        repeat: false,
        prevented: false,
        preventDefault() {
          this.prevented = true;
        },
      };
      windowMock.emit(type, event);
      return event;
    },
    totalListeners() {
      return (
        windowMock.listenerCount() +
        documentMock.listenerCount() +
        canvas.listenerCount()
      );
    },
  };
}

function mockCartridge(options = {}) {
  const simulations = [];
  const views = [];
  let creations = 0;
  let mounts = 0;
  let controllerCalls = 0;
  const cartridge = {
    id: 'test-cartridge',
    pointerMode: options.pointerMode,
    bindings: options.bindings,
    title: 'Test cartridge',
    create() {
      creations += 1;
      if (creations === options.createThrowsAt)
        throw new Error('simulation setup failed');
      const simulation = {
        phase: 'playing',
        time: 0,
        score: 0,
        x: 0,
        steps: [],
        step(dt, input) {
          if (this.phase !== 'playing') return;
          this.steps.push({ dt, input: { ...input } });
          this.time += dt;
          if (input.right) this.x += dt;
          if (input.left) this.x -= dt;
          if (input.attack) this.score += 1;
          if (this.steps.length >= (options.winAfter ?? Infinity))
            this.phase = options.outcome ?? 'won';
        },
        snapshot() {
          return {
            phase: this.phase,
            time: this.time,
            score: this.score,
            progress: this.phase === 'won' ? 1 : 0,
            objective: 'Test movement',
            stats: [],
          };
        },
      };
      simulations.push(simulation);
      return simulation;
    },
    mount(canvas, simulation) {
      mounts += 1;
      if (mounts === options.mountThrowsAt)
        throw new Error('view setup failed');
      const view = {
        canvas,
        simulation,
        renders: [],
        disposeCalls: 0,
        failNextRender: false,
        render(width, height) {
          this.renders.push({ width, height });
          if (
            this.failNextRender ||
            (options.firstRenderThrows && this.renders.length === 1)
          ) {
            this.failNextRender = false;
            throw new Error('render failed');
          }
        },
        metrics: () => ({ drawCalls: 12, entities: 24 }),
        dispose() {
          this.disposeCalls += 1;
        },
      };
      views.push(view);
      return view;
    },
    benchmark() {
      controllerCalls += 1;
      return { ...idleInput(), right: true, attack: true };
    },
  };
  return {
    cartridge,
    simulations,
    views,
    creations: () => creations,
    mounts: () => mounts,
    controllerCalls: () => controllerCalls,
  };
}

function mounted(t, options = {}) {
  const dom = browser(t, options.browser);
  const game = mockCartridge(options.cartridge);
  const states = [],
    completed = [],
    errors = [];
  const runtime = createRuntime(
    dom.canvas,
    game.cartridge,
    (state) => states.push(state),
    (record) => completed.push(record),
    (error) => errors.push(error),
  );
  dom.runtimes.push(runtime);
  return { dom, game, runtime, states, completed, errors };
}

test('ready draws one composed frame and observes resize without running simulation or RAF', (t) => {
  const { dom, game, states, completed } = mounted(t);
  assert.equal(states.at(-1).phase, 'ready');
  assert.equal(game.simulations[0].steps.length, 0);
  assert.deepEqual(game.views[0].renders, [{ width: 800, height: 600 }]);
  assert.equal(dom.callbacks.size, 0);
  assert.equal(completed.length, 0);
  dom.canvas.clientWidth = 390;
  dom.canvas.clientHeight = 640;
  dom.observers[0].resize();
  assert.deepEqual(game.views[0].renders.at(-1), { width: 390, height: 640 });
  assert.equal(game.simulations[0].steps.length, 0);
  assert.equal(dom.callbacks.size, 0);
});

test('manual start combines keyboard aliases and touch input in actual fixed simulation steps', (t) => {
  const { dom, game, runtime, states } = mounted(t);
  runtime.start();
  assert.equal(game.views[0].disposeCalls, 1);
  assert.equal(states.at(-1).phase, 'playing');
  assert.equal(states.at(-1).automated, false);
  assert.equal(dom.callbacks.size, 1);
  dom.key('keydown', 'ArrowRight');
  dom.key('keydown', 'KeyD');
  runtime.input('attack', true);
  dom.frame(1000);
  assert.equal(
    game.simulations[1].steps.length,
    0,
    'first RAF establishes the clock epoch',
  );
  dom.frame(1000 + 1000 / 60);
  assert.equal(game.simulations[1].steps.length, 2);
  assert.ok(
    game.simulations[1].steps.every(
      ({ dt, input }) => dt === 1 / 120 && input.right && input.attack,
    ),
  );
  dom.key('keyup', 'ArrowRight');
  runtime.input('attack', false);
  dom.frame(1000 + 2000 / 60);
  assert.equal(
    game.simulations[1].steps.at(-1).input.right,
    true,
    'the other keyboard alias remains held',
  );
  assert.equal(game.simulations[1].steps.at(-1).input.attack, false);
  dom.key('keyup', 'KeyD');
  dom.frame(1050);
  assert.equal(game.simulations[1].steps.at(-1).input.right, false);
  assert.equal(game.controllerCalls(), 0);
});

test('keyboard input from buttons and editors is not captured as movement', (t) => {
  const { dom, game, runtime } = mounted(t);
  runtime.start();
  const control = new ElementMock();
  control.interactive = true;
  const event = dom.key('keydown', 'KeyW', control);
  dom.frame(0);
  dom.frame(20);
  assert.equal(event.prevented, false);
  assert.ok(game.simulations[1].steps.every(({ input }) => !input.up));
});

test('automated play uses only the normal controller and reports terminal completion exactly once', (t) => {
  const { dom, game, runtime, states, completed } = mounted(t, {
    cartridge: { winAfter: 3 },
  });
  runtime.start(true);
  // Real user input must not mix into the scripted controller's normal input.
  runtime.input('left', true);
  dom.frame(100);
  dom.frame(150);
  const simulation = game.simulations[1];
  assert.equal(game.controllerCalls(), 3);
  assert.equal(simulation.steps.length, 3);
  assert.ok(
    simulation.steps.every(
      ({ input }) => input.right && input.attack && !input.left,
    ),
  );
  assert.equal(states.at(-1).phase, 'won');
  assert.equal(dom.callbacks.size, 0);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].simulationSeconds, 3 / 120);
  assert.equal(completed[0].outcome, 'won');
  assert.equal(completed[0].pixelRatio, 1.5);
  assert.equal(completed[0].viewport, '800×600');
  assert.equal(completed[0].drawCalls, 12);
  assert.equal(completed[0].entities, 24);
  dom.frame(5000);
  runtime.resume();
  assert.equal(completed.length, 1);
  assert.equal(dom.callbacks.size, 0);
});

test('manual completion never creates an automated benchmark record', (t) => {
  const { dom, runtime, completed, states } = mounted(t, {
    cartridge: { winAfter: 2 },
  });
  runtime.start();
  dom.frame(0);
  dom.frame(20);
  assert.equal(states.at(-1).phase, 'won');
  assert.equal(completed.length, 0);
  assert.equal(dom.callbacks.size, 0);
});

test('pause and resume clear held input and discard all elapsed background wall time', (t) => {
  const { dom, runtime, game, states } = mounted(t);
  runtime.start();
  runtime.input('right', true);
  dom.key('keydown', 'KeyJ');
  dom.frame(100);
  dom.frame(150);
  const simulation = game.simulations[1];
  const before = simulation.time;
  runtime.pause();
  assert.equal(states.at(-1).phase, 'paused');
  assert.equal(dom.callbacks.size, 0);
  dom.frame(50000);
  assert.equal(simulation.time, before);
  runtime.resume();
  dom.frame(60000);
  assert.equal(simulation.time, before);
  dom.frame(60000 + 1000 / 60);
  assert.ok(Math.abs(simulation.time - before - 1 / 60) < 1e-8);
  assert.equal(simulation.steps.at(-1).input.right, false);
  assert.equal(simulation.steps.at(-1).input.attack, false);
});

test('hidden documents and blur pause automatically and cannot catch up after returning', (t) => {
  const { dom, runtime, game, states } = mounted(t);
  runtime.start();
  dom.frame(10);
  dom.frame(30);
  dom.document.hidden = true;
  dom.document.emit('visibilitychange');
  assert.equal(states.at(-1).phase, 'paused');
  assert.equal(dom.callbacks.size, 0);
  runtime.resume();
  assert.equal(
    dom.callbacks.size,
    0,
    'resuming while still hidden must not run',
  );
  dom.document.hidden = false;
  dom.document.emit('visibilitychange');
  assert.equal(
    dom.callbacks.size,
    0,
    'visibility does not silently resume user work',
  );
  runtime.resume();
  const before = game.simulations[1].time;
  dom.frame(90000);
  assert.equal(game.simulations[1].time, before);
  dom.window.emit('blur');
  assert.equal(states.at(-1).phase, 'paused');
  assert.equal(dom.callbacks.size, 0);
});

test('starting a run while hidden creates a resumable paused state without RAF or focus theft', (t) => {
  const { dom, runtime, states, game } = mounted(t, {
    browser: { hidden: true },
  });
  runtime.start(true);
  assert.equal(states.at(-1).phase, 'paused');
  assert.equal(states.at(-1).automated, true);
  assert.equal(dom.callbacks.size, 0);
  assert.equal(dom.canvas.focuses.length, 0);
  assert.equal(game.simulations[1].time, 0);
  dom.document.hidden = false;
  runtime.resume();
  assert.equal(states.at(-1).phase, 'playing');
  assert.equal(dom.callbacks.size, 1);
  dom.frame(80000);
  assert.equal(game.simulations[1].time, 0);
});

test('restart disposes the old view and resets simulation, input, mode and RAF epoch', (t) => {
  const { dom, runtime, game, states } = mounted(t);
  runtime.start(true);
  dom.frame(100);
  dom.frame(120);
  assert.ok(game.simulations[1].time > 0);
  const calls = game.controllerCalls();
  runtime.start(false);
  assert.equal(game.views[1].disposeCalls, 1);
  assert.equal(game.creations(), 3);
  assert.equal(game.mounts(), 3);
  assert.equal(states.at(-1).automated, false);
  assert.equal(states.at(-1).time, 0);
  assert.equal(dom.callbacks.size, 1);
  dom.frame(70000);
  assert.equal(game.simulations[2].time, 0);
  dom.frame(70020);
  assert.equal(game.controllerCalls(), calls);
  assert.equal(game.simulations[2].score, 0);
});

test('dispose is idempotent and removes RAF, every listener and resize observer', (t) => {
  const { dom, runtime, game } = mounted(t);
  runtime.start();
  const pending = [...dom.callbacks.values()][0];
  assert.equal(dom.totalListeners(), 5);
  runtime.dispose();
  assert.equal(dom.totalListeners(), 0);
  assert.equal(dom.callbacks.size, 0);
  assert.equal(dom.observers[0].disconnects, 1);
  assert.equal(game.views[1].disposeCalls, 1);
  const renders = game.views[1].renders.length;
  pending(1000);
  dom.observers[0].resize();
  runtime.start();
  runtime.resume();
  runtime.dispose();
  assert.equal(game.views[1].renders.length, renders);
  assert.equal(game.views[1].disposeCalls, 1);
  assert.equal(game.creations(), 2);
});

test('render or context loss failures lock the run against Escape, resume and restart', (t) => {
  const { dom, runtime, game, errors, states } = mounted(t);
  runtime.start();
  game.views[1].failNextRender = true;
  dom.frame(100);
  assert.deepEqual(errors, ['render failed']);
  assert.equal(states.at(-1).phase, 'paused');
  assert.equal(dom.callbacks.size, 0);
  dom.key('keydown', 'Escape');
  runtime.resume();
  runtime.start();
  assert.equal(game.creations(), 2);
  assert.equal(dom.callbacks.size, 0);
  assert.equal(states.at(-1).phase, 'paused');
});

test('WebGL context loss is prevented and cannot be resumed through keyboard shortcuts', (t) => {
  const { dom, runtime, errors, states } = mounted(t);
  runtime.start();
  const event = {
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
  dom.canvas.emit('webglcontextlost', event);
  assert.equal(event.prevented, true);
  assert.match(errors[0], /그래픽 연결/);
  assert.equal(states.at(-1).phase, 'paused');
  dom.key('keydown', 'Escape');
  assert.equal(dom.callbacks.size, 0);
});

test('failed restart disposes the previous view and locks retry without leaving RAF running', (t) => {
  const { dom, runtime, game, errors } = mounted(t, {
    cartridge: { mountThrowsAt: 2 },
  });
  runtime.start();
  assert.deepEqual(errors, ['view setup failed']);
  assert.equal(game.views[0].disposeCalls, 1);
  assert.equal(dom.callbacks.size, 0);
  runtime.start();
  dom.key('keydown', 'Escape');
  assert.equal(game.mounts(), 2);
  assert.equal(dom.callbacks.size, 0);
});

test('initial draw failure cleans up all partially installed runtime resources', (t) => {
  const dom = browser(t);
  const game = mockCartridge({ firstRenderThrows: true });
  assert.throws(
    () =>
      createRuntime(
        dom.canvas,
        game.cartridge,
        () => {},
        () => {},
        () => {},
      ),
    /render failed/,
  );
  assert.equal(dom.totalListeners(), 0);
  assert.equal(dom.observers[0].disconnects, 1);
  assert.equal(game.views[0].disposeCalls, 1);
  assert.equal(dom.callbacks.size, 0);
});

test('observer setup failure cleans up the mounted view and already installed listeners', (t) => {
  const dom = browser(t, { observeThrows: true });
  const game = mockCartridge();
  assert.throws(
    () =>
      createRuntime(
        dom.canvas,
        game.cartridge,
        () => {},
        () => {},
        () => {},
      ),
    /observer setup failed/,
  );
  assert.equal(dom.totalListeners(), 0);
  assert.equal(dom.observers[0].disconnects, 1);
  assert.equal(game.views[0].disposeCalls, 1);
  assert.equal(dom.callbacks.size, 0);
});

test('initial cartridge setup failure never installs listeners, observers or RAF', (t) => {
  const dom = browser(t);
  const game = mockCartridge({ mountThrowsAt: 1 });
  assert.throws(
    () =>
      createRuntime(
        dom.canvas,
        game.cartridge,
        () => {},
        () => {},
        () => {},
      ),
    /view setup failed/,
  );
  assert.equal(dom.totalListeners(), 0);
  assert.equal(dom.observers.length, 0);
  assert.equal(dom.callbacks.size, 0);
});

function pointerEvent(canvas, overrides = {}) {
  return {
    target: canvas,
    clientX: 420,
    clientY: 330,
    pointerId: 1,
    button: 0,
    movementX: 0,
    movementY: 0,
    preventDefault() {},
    ...overrides,
  };
}
test('cursor commands preserve edges until a physics step and deliver drag/release once', (t) => {
  const { dom, game, runtime } = mounted(t, {
    cartridge: { pointerMode: 'cursor' },
  });
  runtime.start();
  dom.frame(0);
  dom.canvas.emit('pointerdown', pointerEvent(dom.canvas));
  dom.document.emit(
    'pointermove',
    pointerEvent(dom.canvas, { clientX: 620, movementX: 200 }),
  );
  dom.frame(2);
  assert.equal(game.simulations[1].steps.length, 0);
  dom.frame(25);
  const steps = game.simulations[1].steps;
  assert.equal(steps.length, 3);
  assert.equal(steps[0].input.pointer.x, 0.75);
  assert.equal(steps[0].input.pointer.y, 0.5);
  assert.equal(steps[0].input.pointer.dx, 200);
  assert.equal(steps[0].input.pointer.primaryPressed, true);
  assert.equal(steps[1].input.pointer.primaryPressed, false);
  assert.equal(steps[1].input.pointer.dx, 0);
  assert.equal(steps[2].input.pointer.primary, true);
  dom.document.emit('pointerup', pointerEvent(dom.canvas));
  dom.frame(50);
  assert.equal(steps[3].input.pointer.primaryReleased, true);
  assert.equal(steps[4].input.pointer.primaryReleased, false);
  assert.equal(steps[4].input.pointer.primary, false);
});
test('pointer lock exits on pause, clears firing, and removes all pointer listeners on dispose', (t) => {
  const { dom, game, runtime, states } = mounted(t, {
    cartridge: { pointerMode: 'lock' },
  });
  runtime.start();
  dom.frame(0);
  dom.canvas.emit('pointerdown', pointerEvent(dom.canvas));
  assert.equal(dom.document.pointerLockElement, dom.canvas);
  dom.document.emit(
    'pointermove',
    pointerEvent(dom.canvas, { movementX: 23, movementY: -6 }),
  );
  dom.frame(17);
  assert.equal(game.simulations[1].steps[0].input.pointer.dx, 23);
  runtime.pause();
  assert.equal(dom.document.pointerLockElement, null);
  assert.equal(states.at(-1).phase, 'paused');
  runtime.resume();
  dom.frame(50);
  dom.frame(67);
  assert.equal(game.simulations[1].steps.at(-1).input.pointer.primary, false);
  assert.equal(game.simulations[1].steps.at(-1).input.pointer.dx, 0);
  runtime.dispose();
  assert.equal(dom.totalListeners(), 0);
});
test('losing pointer lock pauses manual FPS but not automated input', (t) => {
  const { dom, runtime, states } = mounted(t, {
    cartridge: { pointerMode: 'lock' },
  });
  runtime.start();
  dom.document.emit('pointerlockchange');
  assert.equal(states.at(-1).phase, 'paused');
  runtime.start(true);
  dom.document.emit('pointerlockchange');
  assert.equal(states.at(-1).phase, 'playing');
});
test('cartridge bindings let two keyboard players move independently', (t) => {
  const { dom, game, runtime } = mounted(t, {
    cartridge: { bindings: { KeyA: 'left2', KeyD: 'right2', KeyW: 'jump2' } },
  });
  runtime.start();
  dom.key('keydown', 'KeyD');
  dom.key('keydown', 'ArrowLeft');
  dom.key('keydown', 'KeyW');
  dom.frame(0);
  dom.frame(17);
  const input = game.simulations[1].steps[0].input;
  assert.equal(input.right2, true);
  assert.equal(input.left, true);
  assert.equal(input.jump2, true);
  assert.equal(input.right, false);
  assert.equal(input.up, false);
});

test('chorded right-aim plus left-fire transitions through pointermove and releases both buttons', (t) => {
  const { dom, game, runtime } = mounted(t, {
    cartridge: { pointerMode: 'lock' },
  });
  runtime.start();
  dom.frame(0);
  dom.canvas.emit(
    'pointerdown',
    pointerEvent(dom.canvas, { button: 2, buttons: 2 }),
  );
  dom.frame(17);
  assert.equal(game.simulations[1].steps[0].input.pointer.secondary, true);
  assert.equal(game.simulations[1].steps[0].input.pointer.primary, false);
  dom.document.emit(
    'pointermove',
    pointerEvent(dom.canvas, { button: 0, buttons: 3 }),
  );
  dom.frame(34);
  assert.equal(
    game.simulations[1].steps.at(-2).input.pointer.primaryPressed,
    true,
  );
  assert.equal(game.simulations[1].steps.at(-1).input.pointer.primary, true);
  assert.equal(game.simulations[1].steps.at(-1).input.pointer.secondary, true);
  dom.document.emit(
    'pointermove',
    pointerEvent(dom.canvas, { button: 0, buttons: 2 }),
  );
  dom.frame(51);
  assert.equal(game.simulations[1].steps.at(-1).input.pointer.primary, false);
  dom.document.emit(
    'pointerup',
    pointerEvent(dom.canvas, { button: 2, buttons: 0 }),
  );
  dom.frame(68);
  assert.equal(game.simulations[1].steps.at(-1).input.pointer.secondary, false);
  assert.doesNotThrow(() =>
    dom.canvas.emit('pointerdown', pointerEvent(dom.canvas, { buttons: 1 })),
  );
  dom.frame(85);
  assert.equal(game.simulations[1].steps.at(-1).input.pointer.primary, true);
});
test('pause and pointer cancellation discard cartridge-local transient input', (t) => {
  const { dom, game, runtime } = mounted(t, {
    cartridge: { pointerMode: 'cursor' },
  });
  runtime.start();
  let clears = 0;
  game.simulations[1].clearInput = () => clears++;
  dom.canvas.emit('pointercancel');
  assert.equal(clears, 1);
  runtime.pause();
  assert.equal(clears, 2);
});

test('quick keyboard and touch taps are delivered once even between physics ticks', (t) => {
  const { dom, game, runtime } = mounted(t);
  runtime.start();
  dom.frame(0);
  dom.key('keydown', 'Space');
  dom.key('keyup', 'Space');
  runtime.input('attack', true);
  runtime.input('attack', false);
  dom.frame(2);
  assert.equal(game.simulations[1].steps.length, 0);
  dom.frame(25);
  const steps = game.simulations[1].steps;
  assert.equal(steps[0].input.jump, true);
  assert.equal(steps[0].input.attack, true);
  assert.equal(steps[1].input.jump, false);
  assert.equal(steps[1].input.attack, false);
});
