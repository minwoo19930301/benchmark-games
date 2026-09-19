import {
  idleInput,
  type Action,
  type Cartridge,
  type RetroSnapshot,
} from './types.ts';
import { FrameSamples, type BenchmarkRecord } from './metrics.ts';

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
};

export function createRuntime(
  canvas: HTMLCanvasElement,
  cartridge: Cartridge,
  onChange: (state: RuntimeState) => void,
  onComplete: (record: BenchmarkRecord) => void,
  onError: (message: string) => void,
): Runtime {
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
    touch = new Set<Action>();
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
    keys.clear();
    touch.clear();
    accumulator = 0;
    previous = null;
  }
  function pause() {
    if (phase !== 'playing') return;
    phase = 'paused';
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
      const input = idleInput();
      for (const key of keys) {
        const action = keymap[key];
        if (action) input[action] = true;
      }
      for (const action of touch) input[action] = true;
      while (
        accumulator + 1e-10 >= 1 / 120 &&
        simulation.snapshot().phase === 'playing'
      ) {
        simulation.step(
          1 / 120,
          automated ? cartridge.benchmark(simulation) : input,
        );
        accumulator -= 1 / 120;
      }
      draw();
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
        clear();
        notify();
        if (automated) {
          const { width, height } = size();
          onComplete({
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
    try {
      view.dispose();
      simulation = cartridge.create();
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
    if (keymap[event.code] && phase === 'playing') {
      event.preventDefault();
      keys.add(event.code);
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
    view.dispose();
  }
  try {
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
    pause,
    resume,
    input(action, held) {
      if (held && phase === 'playing') touch.add(action);
      else touch.delete(action);
    },
    dispose,
  };
}
