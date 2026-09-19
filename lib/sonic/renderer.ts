import * as T from 'three';
import { FrameClock } from '../game/frame-clock';
import { SonicSimulation, idleSonicInput, type SonicInput } from './simulation';
import { createSonicScene } from './scene';

export type SonicView = ReturnType<SonicSimulation['snapshot']> & {
  fps: number;
  drawCalls: number;
  automated: boolean;
};
export type SonicAction = keyof SonicInput;
export type SonicHandle = {
  start(): void;
  startBenchmark(): void;
  togglePause(): void;
  input(action: SonicAction, held: boolean): void;
  setSound(enabled: boolean): void;
  getSnapshot(): SonicView;
  dispose(): void;
};

/** Only the selected game owns a canvas, input listeners, and an animation loop. */
export function createSonicGame(
  host: HTMLElement,
  onChange: (view: SonicView) => void,
  onError: (message: string) => void,
): SonicHandle {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    '소닉 게임: 방향키 이동, 스페이스 점프, 아래 방향키 구르기, Shift 모았다 놓기',
  );
  host.appendChild(renderer.domElement);
  let visual: ReturnType<typeof createSonicScene>;
  try {
    visual = createSonicScene(renderer);
  } catch (error) {
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }
  const simulation = new SonicSimulation();
  const clock = new FrameClock();
  const keys = new Set<string>();
  const touches = new Set<SonicAction>();
  let disposed = false;
  let frame = 0;
  let aspect = 1;
  let lastNotify = 0;
  let fps = 0;
  let frameCount = 0;
  let sampleStart = 0;
  let sound = false;
  let automated = false;
  let audio: AudioContext | undefined;
  let observer: ResizeObserver | undefined;
  let previous = simulation.snapshot();

  function tone(from: number, to: number, duration = 0.12, delay = 0) {
    if (!sound || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.075, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  function unlockAudio() {
    if (!sound) return;
    try {
      audio ??= new AudioContext();
      void audio.resume().catch(() => {});
    } catch {
      sound = false;
    }
  }
  function clearInput() {
    keys.clear();
    touches.clear();
  }
  function view(): SonicView {
    return {
      ...simulation.snapshot(),
      fps,
      drawCalls: renderer.info.render.calls,
      automated,
    };
  }
  function notify() {
    onChange(view());
  }
  function draw(dt = 0) {
    visual.update(simulation, dt, aspect);
    renderer.render(visual.scene, visual.camera);
  }
  function schedule() {
    if (
      !disposed &&
      !document.hidden &&
      !frame &&
      simulation.state.phase === 'playing'
    ) {
      frame = requestAnimationFrame(render);
    }
  }
  function render(now: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    try {
      const dt = clock.tick(now);
      const input: SonicInput = {
        ...idleSonicInput,
        left: keys.has('ArrowLeft') || keys.has('KeyA') || touches.has('left'),
        right:
          keys.has('ArrowRight') || keys.has('KeyD') || touches.has('right'),
        jump:
          keys.has('Space') ||
          keys.has('ArrowUp') ||
          keys.has('KeyW') ||
          touches.has('jump'),
        roll: keys.has('ArrowDown') || keys.has('KeyS') || touches.has('roll'),
        charge:
          keys.has('ShiftLeft') ||
          keys.has('ShiftRight') ||
          touches.has('charge'),
      };
      if (automated) {
        // Same normal inputs as the completion regression controller; no state shortcuts.
        input.left = false;
        input.right = true;
        input.roll = false;
        input.charge = simulation.state.time < 0.8;
        input.jump =
          simulation.state.time >= 1.4 && simulation.state.time < 1.75;
      }
      simulation.advance(dt, input);
      const state = simulation.snapshot();
      if (state.rings > previous.rings) tone(1350, 2050, 0.12);
      if (state.lives < previous.lives || state.rings < previous.rings)
        tone(230, 80, 0.22);
      if (state.phase === 'won' && previous.phase !== 'won') {
        [523, 659, 784, 1046].forEach((frequency, index) =>
          tone(frequency, frequency, 0.2, index * 0.13),
        );
      }
      previous = state;
      draw(dt);
      frameCount++;
      if (!sampleStart) sampleStart = now;
      if (now - sampleStart >= 500) {
        fps = Math.round((frameCount * 1000) / (now - sampleStart));
        frameCount = 0;
        sampleStart = now;
      }
      if (now - lastNotify >= 100 || state.phase !== 'playing') {
        notify();
        lastNotify = now;
      }
      schedule();
    } catch (error) {
      simulation.pause();
      clearInput();
      onError(
        error instanceof Error
          ? error.message
          : '게임을 렌더링하지 못했습니다.',
      );
      notify();
    }
  }
  function pause() {
    simulation.pause();
    clearInput();
    clock.reset();
    cancelAnimationFrame(frame);
    frame = 0;
    notify();
  }
  function togglePause() {
    if (simulation.state.phase === 'playing') pause();
    else if (simulation.state.phase === 'paused') {
      simulation.resume();
      clearInput();
      clock.reset();
      sampleStart = 0;
      frameCount = 0;
      unlockAudio();
      renderer.domElement.focus({ preventScroll: true });
      notify();
      schedule();
    }
  }
  const controls = new Set([
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Space',
    'KeyA',
    'KeyD',
    'KeyW',
    'KeyS',
    'ShiftLeft',
    'ShiftRight',
  ]);
  const keydown = (event: KeyboardEvent) => {
    if (event.code === 'Escape' && !event.repeat) {
      event.preventDefault();
      togglePause();
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest(
        'button, a, input, textarea, select, [contenteditable="true"]',
      )
    )
      return;
    if (controls.has(event.code) && simulation.state.phase === 'playing') {
      event.preventDefault();
      keys.add(event.code);
    }
  };
  const keyup = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };
  const blur = () => {
    if (simulation.state.phase === 'playing') pause();
    else clearInput();
  };
  const hidden = () => {
    if (document.hidden) blur();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    pause();
    onError(
      '그래픽 연결이 끊겼습니다. 다른 게임으로 전환한 뒤 다시 열어주세요.',
    );
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', hidden);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    clearInput();
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', hidden);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    if (audio) void audio.close().catch(() => {});
    visual.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }
  try {
    observer = new ResizeObserver(() => {
      if (disposed) return;
      try {
        const width = Math.max(1, host.clientWidth),
          height = Math.max(1, host.clientHeight);
        aspect = width / height;
        renderer.setSize(width, height, false);
        draw();
      } catch (error) {
        pause();
        onError(
          error instanceof Error
            ? error.message
            : '게임 화면 크기를 변경하지 못했습니다.',
        );
      }
    });
    observer.observe(host);
    draw();
    notify();
  } catch (error) {
    dispose();
    throw error;
  }

  function start(benchmark: boolean) {
    if (disposed) return;
    automated = benchmark;
    simulation.start();
    previous = simulation.snapshot();
    clearInput();
    clock.reset();
    sampleStart = 0;
    frameCount = 0;
    fps = 0;
    unlockAudio();
    renderer.domElement.focus({ preventScroll: true });
    draw();
    notify();
    schedule();
  }

  return {
    start: () => start(false),
    startBenchmark: () => start(true),
    togglePause,
    input(action, held) {
      if (held && simulation.state.phase === 'playing') touches.add(action);
      else touches.delete(action);
    },
    setSound(enabled) {
      sound = enabled;
      if (enabled) unlockAudio();
    },
    getSnapshot: view,
    dispose,
  };
}
