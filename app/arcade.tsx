import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { catalog, findGame } from '../lib/retro/catalog';
import {
  BENCHMARK_VERSION,
  readRecords,
  saveRecord,
  type BenchmarkRecord,
} from '../lib/retro/metrics';
import './arcade.css';
import marioPreview from '../docs/preview.jpg';
import sonicPreview from '../docs/sonic-preview.png';

const libraryGames = [
  {
    id: 'mario',
    number: '01',
    title: 'MARIO 2.5D — GREEN HILLS',
    korean: '마리오 2.5D',
    reference: 'Super Mario Bros.',
    year: '1985',
    genre: '달리기·점프 · 2.5D',
    description:
      '코인을 모으고 적을 밟으며 깃발까지. 걷기와 달리기, 짧고 긴 점프.',
    accent: '#d94334',
    preview: marioPreview,
  },
  {
    id: 'sonic',
    number: '02',
    title: 'SONIC — SEASIDE SPRINT',
    korean: '소닉: 시사이드 스프린트',
    reference: 'Sonic the Hedgehog',
    year: '1991',
    genre: '관성·스핀 대시 · 2.5D',
    description:
      '해안을 질주하며 링을 모으고 360도 루프를 통과한다. 직접 플레이와 자동 벤치마크.',
    accent: '#245ce7',
    preview: sonicPreview,
  },
  ...catalog.map((game) => ({
    ...game,
    preview: `${import.meta.env.BASE_URL}previews/${game.id}.png?v=${BENCHMARK_VERSION}`,
  })),
];
const Mario = lazy(() => import('./page')),
  Sonic = lazy(() => import('./sonic')),
  Retro = lazy(() => import('./retro'));
const selectedGame = () => window.location.hash.slice(1) || 'arcade';
function exportRecords(records: BenchmarkRecord[]) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            schema: 2,
            benchmarkVersion: BENCHMARK_VERSION,
            note: 'Foreground browser measurements; compare same browser, viewport and hardware.',
            records,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    ),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'benchmark-games-results.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Arcade() {
  const [selected, setSelected] = useState(selectedGame),
    [records, setRecords] = useState(readRecords),
    [suite, setSuite] = useState<string[]>([]),
    [suiteSize, setSuiteSize] = useState(0);
  useEffect(() => {
    const changed = () => {
      const id = selectedGame();
      setSelected(id);
      setSuite((current) =>
        current.length && id !== current[0] ? [] : current,
      );
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  const entry = findGame(selected),
    inGame = !!entry || selected === 'mario' || selected === 'sonic';
  useEffect(() => {
    document.title = `${entry?.korean || (selected === 'mario' ? 'Mario 2.5D' : selected === 'sonic' ? 'Sonic — Seaside Sprint' : '방과후 오락실')} | Benchmark Games`;
  }, [entry, selected]);
  const complete = useCallback((record: BenchmarkRecord) => {
    setRecords(saveRecord(record));
    setSuite((current) =>
      current[0] === record.game ? current.slice(1) : current,
    );
  }, []);
  useEffect(() => {
    if (suite.length && selected !== suite[0]) {
      window.location.hash = suite[0];
    }
  }, [suite, selected]);
  const runSuite = (fightersOnly = false) => {
    const games = fightersOnly
      ? catalog.filter((game) => game.id === 'smash' || game.id === 'iron')
      : catalog;
    setSuiteSize(games.length);
    setSuite(games.map((game) => game.id));
    window.location.hash = games[0].id;
  };
  const stopSuite = () => {
    setSuite([]);
    window.location.hash = 'arcade';
  };
  return (
    <>
      <nav className="arcade-bar" aria-label="게임 선택">
        <a
          href="#arcade"
          className="arcade-wordmark"
          aria-label="Benchmark Games 게임 목록"
        >
          B<span>/</span>G
        </a>
        <div className="arcade-games">
          <a href="#arcade" aria-current={!inGame ? 'page' : undefined}>
            ALL GAMES{' '}
            <small>{String(catalog.length + 2).padStart(2, '0')}</small>
          </a>
          <>
            <a
              href="#mario"
              aria-current={selected === 'mario' ? 'page' : undefined}
            >
              MARIO
            </a>
            <a
              href="#sonic"
              aria-current={selected === 'sonic' ? 'page' : undefined}
            >
              SONIC
            </a>
            {inGame &&
              catalog.map((game) => (
                <a
                  key={game.id}
                  href={`#${game.id}`}
                  aria-current={selected === game.id ? 'page' : undefined}
                >
                  {game.id === 'ocarina'
                    ? 'OCARINA'
                    : game.id === 'commando'
                      ? 'METAL SLUG'
                      : game.id === 'iron'
                        ? 'TEKKEN'
                        : game.id === 'pocket'
                          ? 'POKÉMON'
                          : game.id === 'colony'
                            ? 'STARCRAFT'
                            : game.id === 'watchpoint'
                              ? 'OVERWATCH'
                              : game.id === 'temple'
                                ? 'FIRE & WATER'
                                : game.id.toUpperCase()}
                </a>
              ))}
          </>
        </div>
        <a
          className="arcade-source"
          href="https://github.com/minwoo19930301/benchmark-games"
          target="_blank"
          rel="noreferrer"
        >
          SOURCE ↗
        </a>
      </nav>
      {inGame ? (
        <div className="arcade-stage">
          <Suspense
            fallback={
              <output className="arcade-loading">
                게임 카트리지를 불러오는 중…
              </output>
            }
          >
            {entry ? (
              <Retro
                key={entry.id}
                entry={entry}
                autoStart={suite[0] === entry.id}
                suiteLabel={
                  suite.length
                    ? `${suiteSize}종 연속 벤치마크 · ${suiteSize + 1 - suite.length}/${suiteSize}`
                    : undefined
                }
                onComplete={complete}
                onStopSuite={stopSuite}
              />
            ) : selected === 'sonic' ? (
              <Sonic />
            ) : (
              <Mario />
            )}
          </Suspense>
        </div>
      ) : (
        <main className="arcade-library">
          <div className="library-masthead">
            <span>BENCHMARK GAMES · VOL. 04</span>
            <span>INSERT COIN? NO. JUST PLAY.</span>
          </div>
          <header className="library-heading">
            <div>
              <p>학교 끝나고, 여기서 만나.</p>
              <h1>
                AFTER
                <br />
                <span>SCHOOL</span>
                <i>ARCADE</i>
              </h1>
            </div>
            <aside>
              <span className="library-edition">
                90s+
                <br />
                <b>REPLAY</b>
              </span>
              <p>
                오락실의 한 판.
                <br />
                거실 TV 앞의 모험.
                <br />
                주머니 속 첫 번째 친구.
              </p>
              <small>
                오락실부터 PC방까지, 다시 꺼내 든
                <br />
                {catalog.length}개의 재구현 + Mario & Sonic
              </small>
            </aside>
          </header>
          <section className="library-benchmark">
            <div>
              <b>PLAY IT. MEASURE IT.</b>
              <p>
                직접 플레이하거나, 같은 입력으로 자동 주행하며 성능을
                기록하세요.
              </p>
            </div>
            <div className="suite-buttons">
              <button onClick={() => runSuite(true)}>
                스매시 · 철권 벤치마크 <span>↗</span>
              </button>
              <button onClick={() => runSuite()}>
                전체 {catalog.length}종 벤치마크 <span>↗</span>
              </button>
            </div>
          </section>
          <section
            className="new-cartridges"
            aria-label="다시 만든 게임 바로가기"
          >
            <span>REBUILT / 원작 기준으로 다시 만든 게임</span>
            {catalog
              .filter((game) => Number(game.number) <= 7)
              .map((game) => (
                <a key={game.id} href={`#${game.id}`}>
                  {game.korean} ↗
                </a>
              ))}
          </section>
          <section className="cartridge-list" aria-label="게임 목록">
            {libraryGames.map((game) => (
              <article
                className={`cartridge-row cartridge-${game.id}`}
                key={game.id}
                style={{ '--game-accent': game.accent } as React.CSSProperties}
              >
                <a
                  className="cartridge-screen"
                  href={`#${game.id}`}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <img src={game.preview} alt="" loading="lazy" />
                  <span>{game.genre}</span>
                </a>
                <div className="cartridge-copy">
                  <p>
                    <span>NO. {game.number}</span>{' '}
                    <span>{game.year} REVISITED</span>
                  </p>
                  <h2>
                    <a href={`#${game.id}`}>{game.korean}</a>
                  </h2>
                  <h3>{game.title}</h3>
                  <p className="cartridge-description">{game.description}</p>
                  <small>REFERENCE / {game.reference}</small>
                </div>
                <a
                  className="cartridge-play"
                  href={`#${game.id}`}
                  aria-label={`${game.korean} 열기`}
                >
                  PLAY <span>↗</span>
                </a>
              </article>
            ))}
          </section>
          <section className="benchmark-ledger">
            <header>
              <div>
                <p>ON THIS BROWSER</p>
                <h2>벤치마크 기록</h2>
              </div>
              <button
                disabled={!records.length}
                onClick={() => exportRecords(records)}
              >
                JSON 내려받기 ↓
              </button>
            </header>
            <p className="ledger-note">
              평균 FPS · 프레임 간격 p95 · 프레임당 CPU 작업 시간. 같은 구현
              버전·기기·브라우저·화면 크기에서 비교하세요. 숨겨진 탭은
              일시정지됩니다.
            </p>
            {records.length ? (
              <div className="ledger-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>GAME</th>
                      <th>RESULT</th>
                      <th>AVG FPS</th>
                      <th>P95 FRAME</th>
                      <th>CPU / FRAME</th>
                      <th>VIEWPORT</th>
                      <th>TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 15).map((record, index) => (
                      <tr key={`${record.recordedAt}-${index}`}>
                        <td>{record.title}</td>
                        <td>{record.outcome === 'won' ? 'CLEAR' : 'RETRY'}</td>
                        <td>{record.averageFps.toFixed(1)}</td>
                        <td>{record.p95FrameMs.toFixed(1)} ms</td>
                        <td>{record.meanWorkMs.toFixed(2)} ms</td>
                        <td>{record.viewport}</td>
                        <td>{record.simulationSeconds.toFixed(1)} s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ledger-empty">
                <span>NO RUNS YET / 00</span>
                <p>
                  각 게임의 ‘자동 벤치마크’를 끝내면 이곳에 결과가 쌓입니다.
                </p>
              </div>
            )}
          </section>
          <footer className="library-footer">
            <b>B/G — BUILT TO PLAY</b>
            <p>
              원작의 캐릭터와 조작을 참고한 짧은 비공식 브라우저 재구현입니다.
              <br />
              참고 작품의 상표와 캐릭터 권리는 각 권리자에게 있습니다.
            </p>
            <a href="https://github.com/minwoo19930301/benchmark-games">
              SOURCE & NOTES ↗
            </a>
          </footer>
        </main>
      )}
    </>
  );
}
