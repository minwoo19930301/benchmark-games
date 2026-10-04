import { useEffect, useRef, useState } from 'react';
import type {
  SonicAction,
  SonicHandle,
  SonicView,
} from '../lib/sonic/renderer';
import { SonicSimulation } from '../lib/sonic/simulation';
import './sonic.css';

const initial: SonicView = {
  ...new SonicSimulation().snapshot(),
  fps: 0,
  drawCalls: 0,
  automated: false,
};
const recordKey = 'benchmark-games:sonic:seaside-v1:best';
function readBest() {
  try {
    const value = Number(localStorage.getItem(recordKey));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
function timeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}.${Math.floor((seconds % 1) * 10)}`;
}
const touchActions: { action: SonicAction; label: string; text: string }[] = [
  { action: 'left', label: '왼쪽으로 이동', text: '←' },
  { action: 'right', label: '오른쪽으로 이동', text: '→' },
  { action: 'roll', label: '구르기', text: 'ROLL' },
  { action: 'charge', label: '스핀 대시 모았다 놓기', text: 'DASH' },
  { action: 'jump', label: '점프', text: 'JUMP' },
];

export default function Sonic() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<SonicHandle | null>(null);
  const soundRef = useRef(false);
  const [state, setState] = useState(initial);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [sound, setSound] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [best, setBest] = useState<number | null>(readBest);
  const bestRef = useRef(best);

  useEffect(() => {
    let cancelled = false;
    void import('../lib/sonic/renderer')
      .then(({ createSonicGame }) => {
        if (cancelled || !host.current) return;
        game.current = createSonicGame(
          host.current,
          (next) => {
            setState(next);
            if (
              next.phase === 'won' &&
              !next.automated &&
              (bestRef.current === null || next.time < bestRef.current)
            ) {
              bestRef.current = next.time;
              setBest(next.time);
              try {
                localStorage.setItem(recordKey, String(next.time));
              } catch {
                /* Records are optional. */
              }
            }
          },
          setError,
        );
        game.current.setSound(soundRef.current);
        setLoaded(true);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
      game.current?.dispose();
      game.current = null;
    };
  }, []);
  useEffect(() => {
    soundRef.current = sound;
    game.current?.setSound(sound);
  }, [sound]);
  const overlay = state.phase !== 'playing' || !!error;
  const stageLabel =
    state.progress < 0.28
      ? 'PALM COAST'
      : state.progress < 0.54
        ? 'LOOP RIDGE'
        : state.progress < 0.79
          ? 'SPRING VALLEY'
          : 'HOME STRETCH';
  return (
    <main className="sonic-shell" data-phase={state.phase}>
      <div
        className="sonic-view"
        ref={host}
        aria-label="소닉 Seaside Sprint 3D 게임 화면"
      />
      <header className="sonic-hud">
        <div className="sonic-stage-label">
          <strong>SEASIDE SPRINT</strong>
          <span>
            ACT 01 <i /> {stageLabel}
          </span>
        </div>
        <dl className="sonic-stats">
          <div className="sonic-ring-stat">
            <dt>
              <span className="ring-symbol" aria-hidden="true" /> RINGS
            </dt>
            <dd>{String(state.rings).padStart(3, '0')}</dd>
          </div>
          <div>
            <dt>TIME</dt>
            <dd>{timeLabel(state.time)}</dd>
          </div>
          <div className="sonic-score-stat">
            <dt>SCORE</dt>
            <dd>{String(state.score).padStart(6, '0')}</dd>
          </div>
          <div className="sonic-life-stat">
            <dt>LIVES</dt>
            <dd>
              <span>×</span> {state.lives}
            </dd>
          </div>
        </dl>
        <div className="sonic-hud-actions">
          <button
            type="button"
            aria-label={sound ? '소리 끄기' : '소리 켜기'}
            aria-pressed={sound}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => setSound((value) => !value)}
            disabled={!loaded}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              {sound ? (
                <>
                  <path d="M15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14" />
                </>
              ) : (
                <path d="m16 9 5 6m0-6-5 6" />
              )}
            </svg>
          </button>
          <button
            type="button"
            aria-label="성능 수치 보기"
            aria-pressed={showPerformance}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => setShowPerformance((value) => !value)}
          >
            FPS
          </button>
          <button
            type="button"
            className="sonic-pause"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => game.current?.togglePause()}
            disabled={!loaded || !['playing', 'paused'].includes(state.phase)}
            aria-label={
              state.phase === 'paused' ? '소닉 계속하기' : '소닉 일시정지'
            }
          >
            {state.phase === 'paused' ? '▶' : 'Ⅱ'}
          </button>
        </div>
      </header>
      <div
        className="sonic-course"
        aria-label={`코스 진행률 ${Math.round(state.progress * 100)}%`}
      >
        <span style={{ width: `${state.progress * 100}%` }} />
        <i style={{ left: '26%' }} />
        <i style={{ left: '53%' }} />
        <i style={{ left: '79%' }} />
      </div>
      {showPerformance && (
        <aside className="sonic-performance" aria-label="실시간 성능">
          <strong>
            {state.phase === 'playing' && state.fps ? state.fps : '—'} FPS
          </strong>
          <span>{state.drawCalls} DRAW CALLS</span>
          <span>120 Hz PHYSICS</span>
          {state.automated && <b>자동 주행 · 기록 저장 안 함</b>}
          <button
            type="button"
            onClick={() =>
              state.automated
                ? game.current?.start()
                : game.current?.startBenchmark()
            }
            disabled={!loaded || !!error}
          >
            {state.automated ? '직접 플레이로 새로 시작' : '자동 벤치마크 시작'}
          </button>
        </aside>
      )}

      {overlay && (
        <section
          className={`sonic-overlay ${state.phase === 'ready' ? 'sonic-intro' : ''}`}
          aria-live="polite"
        >
          <div className="sonic-title-panel">
            <p className="sonic-kicker">
              <span />{' '}
              {error
                ? 'GRAPHICS'
                : state.phase === 'won'
                  ? 'YOU MADE IT'
                  : state.phase === 'paused'
                    ? 'TAKE A BREATHER'
                    : state.phase === 'over'
                      ? 'ONE MORE RUN'
                      : 'BENCHMARK GAMES / 02'}
            </p>
            <h1>
              {error ? (
                <>
                  화면을 열지
                  <br />
                  못했어요
                </>
              ) : state.phase === 'won' ? (
                <>
                  ACT
                  <br />
                  <em>CLEAR!</em>
                </>
              ) : state.phase === 'paused' ? (
                <>
                  PAUSE<span className="title-dot">.</span>
                </>
              ) : state.phase === 'over' ? (
                <>
                  TRY
                  <br />
                  <em>AGAIN.</em>
                </>
              ) : (
                <>
                  SONIC<span className="sonic-subtitle">SEASIDE SPRINT</span>
                </>
              )}
            </h1>
            <p className="sonic-intro-copy">
              {error ||
                (state.phase === 'won'
                  ? '해안을 끝까지 달렸어요. 다음엔 더 빠르게.'
                  : state.phase === 'paused'
                    ? '준비되면, 다시 전속력으로.'
                    : state.phase === 'over'
                      ? '링을 하나라도 지니고 있으면 한 번 더 버틸 수 있어요.'
                      : '링을 모으고, 언덕을 타고, 루프를 돌파하세요.')}
            </p>
            {state.phase === 'won' && (
              <dl className="sonic-results">
                <div>
                  <dt>TIME</dt>
                  <dd>{timeLabel(state.time)}</dd>
                </div>
                <div>
                  <dt>RINGS</dt>
                  <dd>{state.rings}</dd>
                </div>
                <div>
                  <dt>LOOPS</dt>
                  <dd>{state.loopCount}</dd>
                </div>
              </dl>
            )}
            <button
              type="button"
              className="sonic-start"
              disabled={!loaded || !!error}
              onClick={() =>
                state.phase === 'paused'
                  ? game.current?.togglePause()
                  : game.current?.start()
              }
            >
              {!loaded && !error
                ? '스테이지 준비 중'
                : state.phase === 'ready'
                  ? '달리기 시작'
                  : state.phase === 'paused'
                    ? state.automated
                      ? '벤치마크 계속하기'
                      : '계속 달리기'
                    : '다시 달리기'}
              <span aria-hidden="true">↗</span>
            </button>
            {!error && (
              <p className="sonic-start-hint">
                {state.phase === 'ready'
                  ? '→를 길게 눌러 가속 · Shift를 모았다 놓으면 스핀 대시'
                  : state.phase === 'paused'
                    ? 'ESC 키로도 계속할 수 있어요.'
                    : `최고 속도 ${Math.round(state.peakSpeed)} · ${state.score.toLocaleString()}점`}
              </p>
            )}
            {best !== null && (
              <p className="sonic-personal-best">
                PERSONAL BEST <strong>{timeLabel(best)}</strong>
              </p>
            )}
          </div>
          {state.phase === 'ready' && (
            <div className="sonic-act-stamp" aria-hidden="true">
              <span>SEASIDE</span>
              <strong>01</strong>
              <span>RUN / ROLL / REPEAT</span>
            </div>
          )}
        </section>
      )}

      {!overlay && (
        <div className="sonic-speed">
          <span>SPEED</span>
          <strong>{Math.round(Math.abs(state.speed))}</strong>
          <div>
            <i
              style={{
                width: `${Math.min(100, (Math.abs(state.speed) / 80) * 100)}%`,
              }}
            />
          </div>
          {state.charging > 0 && (
            <p>
              SPIN DASH <b>{Math.round(state.charging * 100)}%</b>
              <span style={{ width: `${state.charging * 100}%` }} />
            </p>
          )}
        </div>
      )}

      <footer className="sonic-footer">
        <p>
          <kbd>← →</kbd> 이동 <kbd>SPACE</kbd> 점프 <kbd>↓</kbd> 구르기{' '}
          <kbd>SHIFT</kbd> 모았다 놓기
        </p>
        <small>FAN-MADE · SEGA 비공식 팬 게임</small>
      </footer>
      <nav className="sonic-touch" aria-label="소닉 터치 조작">
        {touchActions.map(({ action, label, text }) => (
          <button
            type="button"
            key={action}
            aria-label={label}
            disabled={state.phase !== 'playing'}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              game.current?.input(action, true);
            }}
            onPointerUp={() => game.current?.input(action, false)}
            onPointerCancel={() => game.current?.input(action, false)}
            onLostPointerCapture={() => game.current?.input(action, false)}
          >
            {text}
          </button>
        ))}
      </nav>
    </main>
  );
}
