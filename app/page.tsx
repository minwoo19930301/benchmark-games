'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GameHandle, GameSnapshot } from '@/lib/game/renderer';
import { registerGameTools } from '@/lib/game/webmcp';
const initial: GameSnapshot = {
  phase: 'ready',
  coins: 0,
  lives: 3,
  time: 180,
  world: '1–1',
  progress: 0,
};
export default function Home() {
  const host = useRef<HTMLDivElement>(null),
    game = useRef<GameHandle | null>(null);
  const [state, setState] = useState(initial),
    [error, setError] = useState(''),
    [touchRun, setTouchRun] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    let unregister = () => {};
    let cancelled = false;
    void import('@/lib/game/renderer')
      .then(({ createGame }) => {
        if (cancelled || !host.current) return;
        game.current = createGame(host.current, setState);
        unregister = registerGameTools(game.current);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      unregister();
      game.current?.dispose();
      game.current = null;
    };
  }, []);
  return (
    <main className="game-shell">
      <div
        ref={host}
        className="game-view"
        aria-label="마리오 2.5D 게임 화면"
      />
      <header className="game-hud">
        <div className="game-wordmark">
          MARIO <span>2.5D</span>
        </div>
        <div className="hud-stat">
          <small>WORLD</small>
          <strong>{state.world}</strong>
        </div>
        <div className="hud-stat coins">
          <small>COINS</small>
          <strong>{String(state.coins).padStart(2, '0')}</strong>
        </div>
        <div className="hud-stat">
          <small>LIVES</small>
          <strong>× {state.lives}</strong>
        </div>
        <div className="hud-stat">
          <small>TIME</small>
          <strong>{Math.ceil(state.time)}</strong>
        </div>
        <Button
          variant="outline"
          className="pause-button"
          onClick={() => game.current?.togglePause()}
          disabled={['ready', 'won', 'over'].includes(state.phase)}
        >
          {state.phase === 'paused' ? '계속' : '일시정지'}
        </Button>
      </header>
      {(state.phase !== 'playing' || error) && (
        <section className="game-overlay" aria-live="polite">
          <div className="start-card">
            <p className="world-label">WORLD {state.world} · GREEN HILLS</p>
            <h1>
              {error ? (
                '화면을 열지 못했어요'
              ) : state.phase === 'won' ? (
                'COURSE CLEAR!'
              ) : state.phase === 'over' ? (
                'GAME OVER'
              ) : state.phase === 'paused' ? (
                '잠깐 쉬어가기'
              ) : (
                <>
                  LET’S-A
                  <br />
                  GO!
                </>
              )}
            </h1>
            <p>
              {error ||
                (state.phase === 'won'
                  ? `코인 ${state.coins}개를 모았어요.`
                  : state.phase === 'over'
                    ? '다시 도전할 수 있어요.'
                    : '달리고, 점프하고, 깃발까지.')}
            </p>
            <Button
              className="start-button"
              onClick={() =>
                state.phase === 'paused'
                  ? game.current?.togglePause()
                  : game.current?.start()
              }
              disabled={!!error}
            >
              {state.phase === 'paused'
                ? '계속하기'
                : state.phase === 'ready'
                  ? '플레이'
                  : '다시 플레이'}{' '}
              <span aria-hidden>→</span>
            </Button>
          </div>
        </section>
      )}
      <footer className="game-footer">
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> 이동 <kbd>SPACE</kbd> 점프 <kbd>SHIFT</kbd> 달리기
        </span>
        <small>팬 제작 · Nintendo 공식 게임 아님</small>
      </footer>
      <nav
        className="touch-controls"
        aria-label="터치 조작"
        aria-describedby="touch-help"
      >
        <small id="touch-help" className="touch-help">
          RUN 달리기 전환 · JUMP 길게 누르면 높이 점프
        </small>
        {(['left', 'right', 'run', 'jump'] as const).map((action) =>
          action === 'run' ? (
            <Button
              key={action}
              className="touch-run"
              aria-label="터치 달리기"
              aria-pressed={touchRun}
              disabled={state.phase !== 'playing' || !!error}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                const enabled = !touchRun;
                game.current?.setTouchRun(enabled);
                setTouchRun(enabled);
              }}
            >
              {touchRun ? 'RUN ✓' : 'RUN'}
            </Button>
          ) : (
            <Button
              key={action}
              className={`touch-${action}`}
              disabled={state.phase !== 'playing' || !!error}
              aria-label={
                action === 'jump'
                  ? '점프'
                  : action === 'left'
                    ? '왼쪽'
                    : '오른쪽'
              }
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                game.current?.input(action, true, `pointer:${e.pointerId}`);
              }}
              onPointerUp={(e) =>
                game.current?.input(action, false, `pointer:${e.pointerId}`)
              }
              onPointerCancel={(e) =>
                game.current?.input(action, false, `pointer:${e.pointerId}`)
              }
              onLostPointerCapture={(e) =>
                game.current?.input(action, false, `pointer:${e.pointerId}`)
              }
            >
              {action === 'jump' ? 'JUMP' : action === 'left' ? '←' : '→'}
            </Button>
          ),
        )}
      </nav>
    </main>
  );
}
