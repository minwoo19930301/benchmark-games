import { lazy, Suspense, useEffect, useState } from 'react';
import './arcade.css';

const Mario = lazy(() => import('./page'));
const Sonic = lazy(() => import('./sonic'));
const selectedGame = () =>
  window.location.hash === '#mario' ? 'mario' : 'sonic';

export default function Arcade() {
  const [selected, setSelected] = useState(selectedGame);
  useEffect(() => {
    const changed = () => setSelected(selectedGame());
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    document.title =
      selected === 'sonic'
        ? 'Sonic — Seaside Sprint | Benchmark Games'
        : 'Mario 2.5D | Benchmark Games';
  }, [selected]);
  return (
    <>
      <nav className="arcade-bar" aria-label="게임 선택">
        <a
          href="#sonic"
          className="arcade-wordmark"
          aria-label="Benchmark Games"
        >
          B<span>/</span>G
        </a>
        <div className="arcade-games">
          <a
            href="#mario"
            aria-current={selected === 'mario' ? 'page' : undefined}
          >
            <small>01</small> MARIO <span>2.5D</span>
          </a>
          <a
            href="#sonic"
            aria-current={selected === 'sonic' ? 'page' : undefined}
          >
            <small>02</small> SONIC <span>SEASIDE SPRINT</span>
          </a>
        </div>
        <a
          className="arcade-source"
          href="https://github.com/minwoo19930301/benchmark-games"
          target="_blank"
          rel="noreferrer"
        >
          SOURCE <span aria-hidden="true">↗</span>
        </a>
      </nav>
      <div className="arcade-stage">
        <Suspense
          fallback={
            <output className="arcade-loading">스테이지를 불러오는 중…</output>
          }
        >
          {selected === 'sonic' ? <Sonic /> : <Mario />}
        </Suspense>
      </div>
    </>
  );
}
