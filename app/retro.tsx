import { useEffect, useRef, useState } from 'react';
import type { Cartridge, Action } from '../lib/retro/types';
import {
  createRuntime,
  type Runtime,
  type RuntimeState,
} from '../lib/retro/runtime';
import type { BenchmarkRecord } from '../lib/retro/metrics';
import type { CatalogEntry } from '../lib/retro/catalog';
import './retro.css';

type Props = {
  entry: CatalogEntry;
  autoStart: boolean;
  suiteLabel?: string;
  onComplete: (record: BenchmarkRecord) => void;
  onStopSuite: () => void;
};
export default function Retro({
  entry,
  autoStart,
  suiteLabel,
  onComplete,
  onStopSuite,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    runtime = useRef<Runtime | null>(null);
  const completeRef = useRef(onComplete),
    initialAutoStart = useRef(autoStart);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);
  const [cartridge, setCartridge] = useState<Cartridge | null>(null),
    [state, setState] = useState<RuntimeState | null>(null),
    [error, setError] = useState(''),
    [perf, setPerf] = useState(autoStart);
  const [result, setResult] = useState<BenchmarkRecord | null>(null);
  useEffect(() => {
    let cancelled = false;
    void entry
      .load()
      .then((cart) => {
        if (cancelled || !canvas.current) return;
        setCartridge(cart);
        runtime.current = createRuntime(
          canvas.current,
          cart,
          setState,
          (record) => {
            setResult(record);
            completeRef.current(record);
          },
          setError,
        );
        if (initialAutoStart.current) runtime.current.start(true);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, [entry]);
  const phase = state?.phase || 'ready';
  const overlay = phase !== 'playing' || !!error;
  const start = (automatic = false) => {
    setResult(null);
    if (automatic) setPerf(true);
    runtime.current?.start(automatic);
  };
  const input = (action: Action, held: boolean) =>
    runtime.current?.input(action, held);
  return (
    <main
      className={`retro-shell retro-${entry.id}`}
      style={{ '--game-accent': entry.accent } as React.CSSProperties}
    >
      <canvas
        ref={canvas}
        tabIndex={0}
        className="retro-canvas"
        aria-label={`${entry.korean} 게임 화면`}
      />
      <header className="retro-hud">
        <div className="retro-game-title">
          <small>
            {entry.number} / {entry.genre}
          </small>
          <strong>{entry.title}</strong>
        </div>
        <dl className="retro-stats">
          {state?.stats.slice(0, 3).map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
        <div className="retro-tools">
          <button
            aria-pressed={perf}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => setPerf((value) => !value)}
          >
            FPS
          </button>
          <button
            disabled={
              !state || phase === 'ready' || phase === 'won' || phase === 'lost'
            }
            onPointerDown={(event) => event.preventDefault()}
            onClick={() =>
              phase === 'paused'
                ? runtime.current?.resume()
                : runtime.current?.pause()
            }
            aria-label={phase === 'paused' ? '게임 계속하기' : '게임 일시정지'}
          >
            {phase === 'paused' ? '▶' : 'Ⅱ'}
          </button>
          <a href="#arcade" aria-label="게임 목록으로">
            목록 ↗
          </a>
        </div>
      </header>
      {state && (
        <div className="retro-mission">
          <span>{state.objective}</span>
          <i
            style={{
              width: `${Math.min(100, Math.max(0, state.progress * 100))}%`,
            }}
          />
        </div>
      )}
      {suiteLabel && (
        <div className="retro-suite-label">
          <b>{suiteLabel}</b>
          <button onClick={onStopSuite}>연속 실행 중단</button>
        </div>
      )}
      {perf && state && (
        <aside className="retro-perf">
          <strong>
            {phase === 'playing' ? state.fps : '—'} <small>FPS</small>
          </strong>
          <span>
            {['pocket', 'commando'].includes(entry.id)
              ? 'Canvas 2D'
              : `WebGL · ${state.drawCalls} draw calls`}
          </span>
          <span>120 Hz simulation</span>
          {state.automated && (
            <b>
              {phase === 'won' || phase === 'lost'
                ? '자동 입력 완료'
                : phase === 'paused'
                  ? '자동 입력 일시정지'
                  : '자동 입력 실행 중'}
            </b>
          )}
          {result && (
            <>
              <span>평균 {result.averageFps.toFixed(1)} FPS</span>
              <span>p95 {result.p95FrameMs.toFixed(1)} ms</span>
              <span>CPU {result.meanWorkMs.toFixed(2)} ms/frame</span>
            </>
          )}
        </aside>
      )}
      {overlay && (
        <section className="retro-overlay" aria-live="polite">
          <div className="retro-intro">
            <p className="retro-eyebrow">
              {error
                ? 'GAME ERROR'
                : phase === 'paused'
                  ? 'TAKE FIVE'
                  : phase === 'won'
                    ? 'STAGE CLEAR'
                    : phase === 'lost'
                      ? 'TRY AGAIN'
                      : `AFTER SCHOOL / NO. ${entry.number}`}
            </p>
            <h1>
              {error
                ? '잠깐, 화면 점검 중'
                : phase === 'paused'
                  ? '잠깐 쉬어가기'
                  : phase === 'won'
                    ? 'MISSION\nCOMPLETE'
                    : phase === 'lost'
                      ? '한 번 더!'
                      : entry.korean}
            </h1>
            <p>
              {error ||
                (phase === 'won'
                  ? `${state?.score.toLocaleString()}점 · ${state?.time.toFixed(1)}초${state?.automated ? ' · 벤치마크 기록 저장됨' : ''}`
                  : phase === 'lost'
                    ? '다시 도전해서 마지막 목표까지 가보세요.'
                    : phase === 'paused'
                      ? 'Esc를 누르면 이어서 플레이합니다.'
                      : cartridge?.description || entry.description)}
            </p>
            {phase === 'ready' && (
              <p className="retro-goal">
                <b>MISSION</b>
                {cartridge?.objective || '스테이지 준비 중'}
              </p>
            )}
            <div className="retro-starts">
              <button
                className="retro-start"
                disabled={!state || !!error}
                onClick={() =>
                  phase === 'paused' ? runtime.current?.resume() : start(false)
                }
              >
                {!state
                  ? '게임 준비 중'
                  : phase === 'paused'
                    ? '이어서 플레이'
                    : phase === 'ready'
                      ? '직접 플레이'
                      : '다시 플레이'}{' '}
                <span>↗</span>
              </button>
              {phase !== 'paused' && !suiteLabel && (
                <button
                  className="retro-auto"
                  disabled={!state || !!error}
                  onClick={() => start(true)}
                >
                  자동 벤치마크
                </button>
              )}
            </div>
            <small className="retro-reference">
              {entry.reference}에서 착안한 독자 제작 패러디
            </small>
          </div>
        </section>
      )}
      <footer className="retro-controls">
        <span>
          <kbd>← ↑ ↓ →</kbd> 이동
        </span>
        {cartridge?.controls
          .filter(
            (control) =>
              !['left', 'right', 'up', 'down'].includes(control.action),
          )
          .map((control) => (
            <span key={control.action}>
              <kbd>{control.key}</kbd> {control.label}
            </span>
          ))}
        <span>
          <kbd>ESC</kbd> 일시정지
        </span>
      </footer>
      <nav className="retro-touch" aria-label="터치 조작">
        <div className="retro-dpad">
          {(['up', 'left', 'down', 'right'] as const).map((action, index) => (
            <button
              key={action}
              className={`direction-${action}`}
              disabled={phase !== 'playing'}
              aria-label={`${action} 이동`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                input(action, true);
              }}
              onPointerUp={() => input(action, false)}
              onPointerCancel={() => input(action, false)}
              onLostPointerCapture={() => input(action, false)}
            >
              {['↑', '←', '↓', '→'][index]}
            </button>
          ))}
        </div>
        <div className="retro-action-pad">
          {cartridge?.controls
            .filter(
              (control) =>
                !['left', 'right', 'up', 'down'].includes(control.action),
            )
            .map((control) => (
              <button
                key={control.action}
                disabled={phase !== 'playing'}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  input(control.action, true);
                }}
                onPointerUp={() => input(control.action, false)}
                onPointerCancel={() => input(control.action, false)}
                onLostPointerCapture={() => input(control.action, false)}
              >
                <strong>{control.key}</strong>
                {control.label}
              </button>
            ))}
        </div>
      </nav>
    </main>
  );
}
