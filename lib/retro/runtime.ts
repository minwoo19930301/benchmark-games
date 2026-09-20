import {
  idleInput,
  idlePointer,
  type Action,
  type Cartridge,
  type RetroSnapshot,
} from './types.ts';
import { ArcadeAudio } from './audio.ts';
import {
  BENCHMARK_VERSION,
  FrameSamples,
  type BenchmarkRecord,
} from './metrics.ts';

export type RunPhase = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export type RuntimeState = Omit<RetroSnapshot, 'phase'> & {
  phase: RunPhase;
  automated: boolean;
  fps: number;
  drawCalls: number;
  entities: number;
};
export type Runtime = {
  start(automated?: boolean): void;
  sound(enabled: boolean): Promise<boolean>;
  pause(): void;
  resume(): void;
  input(action: Action, held: boolean): void;
  dispose(): void;
};
const keymap: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  KeyJ: 'attack',
  KeyK: 'special',
  KeyL: 'guard',
  KeyE: 'interact',
  KeyR: 'reload',
  KeyQ: 'ultimate',
  KeyF: 'switch',
};

export function createRuntime(
  canvas: HTMLCanvasElement,
  cartridge: Cartridge,
  onChange: (state: RuntimeState) => void,
  onComplete: (record: BenchmarkRecord) => void,
  onError: (message: string) => void,
): Runtime {
  const audio = new ArcadeAudio();
  const bindings = { ...keymap, ...cartridge.bindings };
  let pointer = idlePointer();
  let lockPending = false;
  let simulation = cartridge.create();
  let view = cartridge.mount(canvas, simulation);
  let phase: RunPhase = 'ready',
    automated = false,
    disposed = false,
    failed = false,
    frame = 0,
    previous: number | null = null;
  let accumulator = 0,
    lastNotify = 0,
    fps = 0,
    sampleStart = 0,
    sampleFrames = 0;
  let samples = new FrameSamples();
  const keys = new Set<string>(),
    touch = new Set<Action>(),
    taps = new Set<Action>();
  let observer: ResizeObserver | undefined;
  const size = () => ({
    width: Math.max(1, canvas.clientWidth),
    height: Math.max(1, canvas.clientHeight),
  });
  function notify() {
    onChange({
      ...simulation.snapshot(),
      phase,
      automated,
      fps,
      ...view.metrics(),
    });
  }
  function draw() {
    const { width, height } = size();
    view.render(width, height);
  }
  function clear() {
    simulation.clearInput?.();
    keys.clear();
    touch.clear();
    taps.clear();
    pointer = idlePointer();
    accumulator = 0;
    previous = null;
  }
  function pause() {
    if (phase !== 'playing') return;
    phase = 'paused';
    audio.quiet();
    unlock();
    cancelAnimationFrame(frame);
    frame = 0;
    clear();
    notify();
  }
  function schedule() {
    if (
      !disposed &&
      !failed &&
      phase === 'playing' &&
      !document.hidden &&
      !frame
    )
      frame = requestAnimationFrame(tick);
  }
  function fail(error: unknown) {
    failed = true;
    pause();
    onError(error instanceof Error ? error.message : String(error));
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || phase !== 'playing' || document.hidden) return;
    const began = performance.now();
    const raw = previous === null ? 0 : Math.max(0, now - previous);
    previous = now;
    try {
      accumulator += Math.min(0.25, raw / 1000);
      while (
        accumulator + 1e-10 >= 1 / 120 &&
        simulation.snapshot().phase === 'playing'
      ) {
        const input = idleInput();
        for (const key of keys) {
          const action = bindings[key];
          if (action) input[action] = true;
        }
        for (const action of touch) input[action] = true;
        for (const action of taps) input[action] = true;
        if (!automated && cartridge.pointerMode) {
          input.pointer = {
            ...pointer,
            aspect: canvas.clientWidth / Math.max(1, canvas.clientHeight),
          };
        }
        simulation.step(
          1 / 120,
          automated ? cartridge.benchmark(simulation) : input,
        );
        taps.clear();
        resetPointerEdges();
        accumulator -= 1 / 120;
      }
      draw();
      audio.update(simulation.audioCues);
      samples.add(raw, performance.now() - began);
      sampleFrames++;
      if (!sampleStart) sampleStart = now;
      if (now - sampleStart >= 500) {
        fps = Math.round((sampleFrames * 1000) / (now - sampleStart));
        sampleFrames = 0;
        sampleStart = now;
      }
      const snapshot = simulation.snapshot();
      if (snapshot.phase !== 'playing') {
        phase = snapshot.phase;
        unlock();
        clear();
        notify();
        if (automated) {
          const { width, height } = size();
          onComplete({
            benchmarkVersion: BENCHMARK_VERSION,
            ...samples.summary(),
            game: cartridge.id,
            title: cartridge.title,
            recordedAt: new Date().toISOString(),
            outcome: snapshot.phase,
            simulationSeconds: snapshot.time,
            score: snapshot.score,
            viewport: `${width}×${height}`,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
            browser: navigator.userAgent,
            ...view.metrics(),
          });
        }
        return;
      }
      if (now - lastNotify >= 100) {
        lastNotify = now;
        notify();
      }
      schedule();
    } catch (error) {
      fail(error);
    }
  }
  function resume() {
    if (phase !== 'paused' || disposed || failed || document.hidden) return;
    phase = 'playing';
    clear();
    sampleStart = 0;
    sampleFrames = 0;
    canvas.focus({ preventScroll: true });
    notify();
    schedule();
  }
  function start(auto = false) {
    if (disposed || failed) return;
    cancelAnimationFrame(frame);
    frame = 0;
    clear();
    unlock();
    try {
      view.dispose();
      simulation = cartridge.create();
      audio.sync(simulation.audioCues);
      view = cartridge.mount(canvas, simulation);
      phase = document.hidden ? 'paused' : 'playing';
      automated = auto;
      samples = new FrameSamples();
      fps = 0;
      sampleStart = 0;
      sampleFrames = 0;
      if (!document.hidden) canvas.focus({ preventScroll: true });
      draw();
      notify();
      schedule();
    } catch (error) {
      fail(error);
    }
  }
  function resetPointerEdges() {
    pointer.dx = pointer.dy = pointer.scroll = 0;
    pointer.primaryPressed = pointer.primaryReleased = false;
    pointer.secondaryPressed = pointer.secondaryReleased = false;
  }
  function unlock() {
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
  }
  function position(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)),
    );
    pointer.y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)),
    );
  }
  function buttons(event: PointerEvent, phase: 'down' | 'move' | 'up') {
    // Chorded mouse presses/releases arrive as pointermove, not down/up.
    const held =
      typeof event.buttons === 'number'
        ? event.buttons
        : phase === 'up'
          ? 0
          : phase === 'down'
            ? event.button === 2
              ? 2
              : 1
            : (pointer.primary ? 1 : 0) | (pointer.secondary ? 2 : 0);
    const primary = (held & 1) !== 0,
      secondary = (held & 2) !== 0;
    if (primary !== pointer.primary) {
      if (primary) pointer.primaryPressed = true;
      else pointer.primaryReleased = true;
    }
    if (secondary !== pointer.secondary) {
      if (secondary) pointer.secondaryPressed = true;
      else pointer.secondaryReleased = true;
    }
    pointer.primary = primary;
    pointer.secondary = secondary;
  }
  const pointerdown = (event: PointerEvent) => {
    if (!cartridge.pointerMode || automated || phase !== 'playing') return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    position(event);
    if (
      cartridge.pointerMode === 'lock' &&
      document.pointerLockElement !== canvas
    ) {
      if (!lockPending && canvas.requestPointerLock) {
        lockPending = true;
        try {
          Promise.resolve(canvas.requestPointerLock())
            .then(() => {
              if (disposed || phase !== 'playing' || automated) unlock();
            })
            .catch(() => {
              // The same canvas supports drag-to-look when locking is unavailable.
            })
            .finally(() => {
              lockPending = false;
            });
        } catch {
          lockPending = false;
        }
      }
    }
    buttons(event, 'down');
    if (!document.pointerLockElement) {
      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch {
        /* Lock acquisition may race capture. */
      }
    }
  };
  const pointermove = (event: PointerEvent) => {
    if (!cartridge.pointerMode || automated || phase !== 'playing') return;
    if (document.pointerLockElement !== canvas && event.target !== canvas)
      return;
    position(event);
    buttons(event, 'move');
    if (
      cartridge.pointerMode !== 'lock' ||
      document.pointerLockElement === canvas ||
      pointer.primary ||
      pointer.secondary
    ) {
      pointer.dx += event.movementX || 0;
      pointer.dy += event.movementY || 0;
    }
  };
  const pointerup = (event: PointerEvent) => {
    if (!cartridge.pointerMode || automated) return;
    if (event.target === canvas) position(event);
    buttons(event, 'up');
    if (canvas.hasPointerCapture?.(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  };
  const pointercancel = () => {
    simulation.clearInput?.();
    pointer = idlePointer();
  };
  const lockchange = () => {
    if (
      cartridge.pointerMode === 'lock' &&
      !document.pointerLockElement &&
      phase === 'playing' &&
      !automated
    )
      pause();
  };
  const contextmenu = (event: Event) => {
    if (cartridge.pointerMode && phase === 'playing') event.preventDefault();
  };
  const wheel = (event: WheelEvent) => {
    if (!cartridge.pointerMode || phase !== 'playing' || automated) return;
    event.preventDefault();
    pointer.scroll += event.deltaY;
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.code === 'Escape' && !event.repeat) {
      event.preventDefault();
      if (phase === 'playing') pause();
      else resume();
      return;
    }
    if (
      event.target instanceof HTMLElement &&
      event.target.closest(
        'button,a,input,select,textarea,[contenteditable="true"]',
      )
    )
      return;
    if (bindings[event.code] && phase === 'playing') {
      event.preventDefault();
      keys.add(event.code);
      if (!event.repeat) taps.add(bindings[event.code]);
    }
  };
  const keyup = (event: KeyboardEvent) => keys.delete(event.code);
  const blur = () => {
    pause();
    clear();
  };
  const hidden = () => {
    if (document.hidden) blur();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    fail(new Error('그래픽 연결이 끊겼습니다. 게임 목록에서 다시 열어주세요.'));
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', hidden);
    canvas.removeEventListener('webglcontextlost', contextLost);
    clear();
    canvas.removeEventListener('pointerdown', pointerdown);
    canvas.removeEventListener('pointercancel', pointercancel);
    canvas.removeEventListener('contextmenu', contextmenu);
    canvas.removeEventListener('wheel', wheel);
    document.removeEventListener('pointermove', pointermove);
    document.removeEventListener('pointerup', pointerup);
    document.removeEventListener('pointerlockchange', lockchange);
    unlock();
    audio.dispose();
    view.dispose();
  }
  try {
    if (cartridge.pointerMode) {
      canvas.addEventListener('pointerdown', pointerdown);
      canvas.addEventListener('pointercancel', pointercancel);
      canvas.addEventListener('contextmenu', contextmenu);
      canvas.addEventListener('wheel', wheel, { passive: false });
      document.addEventListener('pointermove', pointermove);
      document.addEventListener('pointerup', pointerup);
      document.addEventListener('pointerlockchange', lockchange);
    }
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    canvas.addEventListener('webglcontextlost', contextLost);
    observer = new ResizeObserver(() => {
      if (!disposed)
        try {
          draw();
        } catch (error) {
          fail(error);
        }
    });
    observer.observe(canvas);
    draw();
    notify();
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    start,
    sound: (enabled) => audio.enable(enabled),
    pause,
    resume,
    input(action, held) {
      if (held && phase === 'playing') {
        touch.add(action);
        taps.add(action);
      } else touch.delete(action);
    },
    dispose,
  };
}
