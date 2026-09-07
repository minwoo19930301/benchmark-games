# Benchmark Games — Mario 2.5D, Sonic & More

[![PLAY DEMO](https://img.shields.io/badge/PLAY%20DEMO-GitHub%20Pages-4caf50?style=for-the-badge&logo=githubpages)](https://minwoo19930301.github.io/benchmark-games/)
[![SOURCE CODE](https://img.shields.io/badge/SOURCE%20CODE-minwoo19930301-e7322d?style=for-the-badge)](https://github.com/minwoo19930301/benchmark-games)
[![RUN LOCALLY](https://img.shields.io/badge/RUN%20LOCALLY-168343?style=for-the-badge)](#run)

웹 브라우저에서 직접 구동되는 고성능 2D/2.5D/3D 게임 벤치마크 모음집입니다.  
현재 **Game 01: Mario 2.5D (Green Hills)**가 탑재되어 있으며, 추후 **Sonic 2D/3D** 등 유명 게임 프로토타입이 순차적으로 추가됩니다.

* **Game 01 (Playable)**: **Mario 2.5D — Green Hills** (Three.js + React 19 + 120Hz Fixed Physics)
* **Game 02 (Planned)**: **Sonic Retro Runner** (High-speed Loop & Momentum Physics)
* **Game 03 (Planned)**: Additional retro/fan benchmarks

> [!NOTE]
> 비공식 팬/벤치마크 프로토타입입니다. Mario 및 Nintendo 상표/캐릭터는 닌텐도의 자산이며, 모든 3D 모델 및 씬 배치는 Three.js 기반으로 자체 제작되었습니다.

[![실제 로컬 실행 화면 — Mario 2.5D Green Hills](docs/preview.jpg)](#run)

## Run

Node 22.13+ and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by the dev server. Arrow keys / A,D move; Space / W / Up jump; hold Shift to run; Escape pauses. Touch controls support movement and jumping. Release jump for a short hop. Jump on enemies, collect coins and reach the flag; three lives and a 180-second timer. Blur or a hidden tab pauses and clears held controls.

The default local address is `http://127.0.0.1:4180/`. `npm run build` only writes a static `dist/` directory; `npm run preview` serves that build locally. Neither command publishes or deploys anything. Font fallbacks, models and scenery work without external asset services.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm audit
```

The actual shared simulation runs at fixed 120 Hz. The 44 tests cover simulation, optional WebMCP contracts and the RAF clock. Complete-level controllers use normal movement/jump inputs at 30, 60 and 120 Hz, both with run held and with walking only, without teleporting or disabling enemies. The walk-only controller uses the movement/jump actions available on touch controls; it includes two natural deaths and finishes with one life, so this is not a no-death or real touch-event test. Other checks cover camera containment, pipe collision, variable jumps, lives, pause and restart. Contract tests use plain-object mocks, not a browser or WebGL context. Lint covers the complete retained source. The original game UI and Button primitive are preserved; unused starter dependencies and server/hosting integrations are removed.

CI performs clean installation, tests, type checking, lint and static build with read-only repository permission. It has no deployment job. Local source verification on 2026-09-07 passed all 44 tests, type checking, lint and build, with zero reported npm audit vulnerabilities. Actual desktop-browser checks verified the rendered scene, start/pause/resume controls and native WebMCP read/restart/pause calls. A frame-clock error found during this check was fixed and covered by six regression tests. Four repeated restart/resume cycles then produced no new browser warnings or errors. This is not full-level human-play or physical-device certification.

[검증 범위와 남은 한계](docs/verification.md)

## Architecture

- `index.html`, `src/main.tsx`, `vite.config.ts`: standalone Vite/React entry point and static build.
- `app/page.tsx`, `app/globals.css`: retained game HUD, keyboard/touch UI and layout; the `app` directory name does not imply a Next.js server.
- `lib/game/world.ts`: level geometry and player physics.
- `lib/game/simulation.ts`: deterministic coins, enemies, timer, lives and finish state.
- `lib/game/renderer.ts`: Three.js scenery, input, camera and resource lifecycle.
- `lib/game/frame-clock.ts`: RAF-only timing with lifecycle reset and bounded frame durations.
- `lib/game/webmcp.ts`: optional `document.modelContext` feature detection; read state, start/restart, and pause/resume tools. All accept an empty JSON object and unregister on lifecycle abort.

WebMCP is an optional browser API integration independent of Sites and remains inert when `document.modelContext` is unavailable. Native read/start/pause calls were verified in the desktop test browser; support in other browsers is not assumed. This repository publishes source code, not a live deployment, and has no official Nintendo affiliation.

<!-- PROJECT-LINKS:START -->
## 3D Playground

게임·공간·아바타를 한곳에서. 카드를 누르면 저장소로, 아래 버튼을 누르면 공개 데모 또는 실행 안내로 이동합니다.

<table>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/minwoo19930301/seoul-flight-game"><img src="docs/project-cards/seoul-flight-game.svg" width="360" alt="SEOUL AIR TOUR — 한강과 도심, 다섯 랜드마크"></a><br>
<a href="https://minwoo19930301.github.io/seoul-flight-game/"><img src="https://img.shields.io/badge/OPEN%20TOUR-73d9ff?style=for-the-badge" alt="OPEN TOUR"></a>
<a href="https://github.com/minwoo19930301/seoul-flight-game/pulls"><img src="https://img.shields.io/badge/LATEST%20PRS-344355?style=for-the-badge" alt="최신 PR 목록"></a><br>
<sub>서울 25구 확장은 main에 병합 · 공개 데모 반영은 별도 확인 필요</sub><br>
<sub><a href="https://github.com/minwoo19930301/seoul-flight-game">저장소</a> · <a href="https://github.com/minwoo19930301/seoul-flight-game/pull/1">병합된 개선 PR #1</a></sub>
</td>
<td width="50%" valign="top">
<a href="https://github.com/minwoo19930301/parking-master-webasm"><img src="docs/project-cards/parking-master-webasm.svg" width="360" alt="DRIVING PRACTICE — 도봉 주행과 A · B · C · D 코스"></a><br>
<a href="https://parking-master-webasm.vercel.app/"><img src="https://img.shields.io/badge/PUBLIC%20DEMO-c6f36a?style=for-the-badge" alt="PUBLIC DEMO"></a>
<a href="https://github.com/minwoo19930301/parking-master-webasm/pulls"><img src="https://img.shields.io/badge/LATEST%20PRS-344355?style=for-the-badge" alt="최신 PR 목록"></a><br>
<sub>공개 데모는 이전 버전 · 최신 소스는 저장소</sub><br>
<sub><a href="https://github.com/minwoo19930301/parking-master-webasm">저장소</a> · <a href="https://github.com/minwoo19930301/parking-master-webasm/pull/2">병합된 개선 PR #2</a></sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/minwoo19930301/interior3d"><img src="docs/project-cards/interior3d.svg" width="360" alt="INTERIOR 3D — 평면을 만들고 가구를 배치하는 공간"></a><br>
<a href="https://minwoo19930301.github.io/interior3d/"><img src="https://img.shields.io/badge/PUBLIC%20DEMO-ffbc76?style=for-the-badge" alt="PUBLIC DEMO"></a>
<a href="https://github.com/minwoo19930301/interior3d/pulls"><img src="https://img.shields.io/badge/LATEST%20PRS-344355?style=for-the-badge" alt="최신 PR 목록"></a><br>
<sub>공개 데모는 이전 버전 · 19종 모델은 최신 소스</sub><br>
<sub><a href="https://github.com/minwoo19930301/interior3d">저장소</a> · <a href="https://github.com/minwoo19930301/interior3d/pull/1">병합된 개선 PR #1</a></sub>
</td>
<td width="50%" valign="top">
<a href="https://github.com/minwoo19930301/animal-metaverse"><img src="docs/project-cards/animal-metaverse.svg" width="360" alt="ANIMALVERSE — 동물 친구들, 여섯 가지 세계"></a><br>
<a href="https://minwoo19930301.github.io/animal-metaverse/"><img src="https://img.shields.io/badge/CHOOSE%20WORLD-6ee7ba?style=for-the-badge" alt="CHOOSE WORLD"></a>
<a href="https://github.com/minwoo19930301/animal-metaverse/pulls"><img src="https://img.shields.io/badge/LATEST%20PRS-344355?style=for-the-badge" alt="최신 PR 목록"></a><br>
<sub>3D 3종 + 2D 3종 · 아래에서 바로 선택</sub><br>
<sub><a href="https://github.com/minwoo19930301/animal-metaverse">저장소</a> · <a href="https://github.com/minwoo19930301/animal-metaverse/pull/1">병합된 개선 PR #1</a></sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/minwoo19930301/flamingo-chess"><img src="docs/project-cards/flamingo-chess.svg" width="360" alt="FLAMINGO CHESS — 플라밍고와 흑조의 체스 대국"></a><br>
<a href="https://minwoo19930301.github.io/flamingo-chess/"><img src="https://img.shields.io/badge/PLAY%20CHESS-ff8bc5?style=for-the-badge" alt="PLAY CHESS"></a>
<a href="https://github.com/minwoo19930301/flamingo-chess/pulls"><img src="https://img.shields.io/badge/LATEST%20PRS-344355?style=for-the-badge" alt="최신 PR 목록"></a><br>
<sub>플라밍고 vs 흑조 · AI 대국</sub><br>
<sub><a href="https://github.com/minwoo19930301/flamingo-chess">저장소</a> · <a href="https://github.com/minwoo19930301/flamingo-chess/pull/1">병합된 개선 PR #1</a></sub>
</td>
<td width="50%" valign="top">
<a href="https://github.com/minwoo19930301/animal-hood-girl-vtuber"><img src="docs/project-cards/animal-hood-girl-vtuber.svg" width="360" alt="ANIMAL HOOD — 화면 위의 작은 동물 아바타"></a><br>
<a href="https://github.com/minwoo19930301/animal-hood-girl-vtuber#실행"><img src="https://img.shields.io/badge/RUN%20LOCALLY-b8a2ff?style=for-the-badge" alt="RUN LOCALLY"></a>
<a href="https://github.com/minwoo19930301/animal-hood-girl-vtuber/pulls"><img src="https://img.shields.io/badge/LATEST%20PRS-344355?style=for-the-badge" alt="최신 PR 목록"></a><br>
<sub>macOS 로컬 앱 · 웹 플레이 링크 없음</sub><br>
<sub><a href="https://github.com/minwoo19930301/animal-hood-girl-vtuber">저장소</a> · <a href="https://github.com/minwoo19930301/animal-hood-girl-vtuber/pull/1">병합된 개선 PR #1</a></sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="https://github.com/minwoo19930301/flamingo-arcade-2"><img src="docs/project-cards/flamingo-arcade-2.svg" width="360" alt="FLAMINGO ARCADE 02 — 아홉 개의 플라밍고 패러디 게임"></a><br>
<a href="https://github.com/minwoo19930301/flamingo-arcade-2#로컬에서-실행"><img src="https://img.shields.io/badge/LOCAL%20PLAY-db456e?style=for-the-badge" alt="로컬 실행 안내"></a>
<a href="https://github.com/minwoo19930301/flamingo-arcade-2"><img src="https://img.shields.io/badge/SOURCE%20CODE-393038?style=for-the-badge" alt="게임 소스 코드"></a><br>
<sub>2D 패러디 8종 + 로우폴리 3D 대전 · 코드만 공개, 미배포</sub>
</td>
<td width="50%" valign="top">
<h3>두 번째 플라밍고 게임 서랍</h3>
<p>라면 · 부적 · 전대 · 철거 · 가상 바탕화면 · 폐차 · 흑백 격투 · 로켓슛 · 장외 대전</p>
<a href="https://github.com/minwoo19930301/flamingo-arcade-2#카트리지-서랍"><img src="https://img.shields.io/badge/9%20CARTRIDGES-e3aa46?style=for-the-badge" alt="9개 게임 화면과 조작"></a>
<a href="https://github.com/minwoo19930301/flamingo-arcade-2/blob/main/docs/visual-references.md"><img src="https://img.shields.io/badge/PARODY%20ART-716b74?style=for-the-badge" alt="패러디 화풍 설명"></a>
</td>
</tr>
</table>

### ANIMALVERSE · 여섯 세계 바로가기

<p>
<a href="https://minwoo19930301.github.io/animal-metaverse/versions/3d/"><img src="https://img.shields.io/badge/3D%20%C2%B7%20%EB%A1%9C%EC%9A%B0%ED%8F%B4%EB%A6%AC-73d9ff?style=for-the-badge" alt="3D · 로우폴리"></a>
<a href="https://minwoo19930301.github.io/animal-metaverse/versions/3d-r3f/"><img src="https://img.shields.io/badge/3D%20%C2%B7%20%EB%85%B8%EC%9D%84%20%EA%B5%B0%EB%8F%84-ffbc76?style=for-the-badge" alt="3D · 노을 군도"></a>
<a href="https://minwoo19930301.github.io/animal-metaverse/versions/3d-babylon/"><img src="https://img.shields.io/badge/3D%20%C2%B7%20%ED%86%A0%EC%9D%B4%20%EC%95%84%EC%9D%BC%EB%9E%9C%EB%93%9C-ff8bc5?style=for-the-badge" alt="3D · 토이 아일랜드"></a>
<a href="https://minwoo19930301.github.io/animal-metaverse/versions/2d-pixel/"><img src="https://img.shields.io/badge/2D%20%C2%B7%20%EB%8F%84%ED%8A%B8%20%EB%B9%8C%EB%A6%AC%EC%A7%80-c6f36a?style=for-the-badge" alt="2D · 도트 빌리지"></a>
<a href="https://minwoo19930301.github.io/animal-metaverse/versions/2d-pastel/"><img src="https://img.shields.io/badge/2D%20%C2%B7%20%ED%8C%8C%EC%8A%A4%ED%85%94%20%ED%8C%8C%ED%81%AC-b8a2ff?style=for-the-badge" alt="2D · 파스텔 파크"></a>
<a href="https://minwoo19930301.github.io/animal-metaverse/versions/2d-iso/"><img src="https://img.shields.io/badge/2D%20%C2%B7%20%EC%95%84%EC%9D%B4%EC%86%8C%20%EB%94%94%EC%98%A4%EB%9D%BC%EB%A7%88-6ee7ba?style=for-the-badge" alt="2D · 아이소 디오라마"></a>
</p>

<sub>2026-09-07 확인: 공개 데모 5곳과 ANIMALVERSE 세부 경로 6곳은 HTTP 응답 확인. 화면·조작 검증을 뜻하지 않습니다. 위 개선 PR 6개는 병합됐습니다. Interior3D 공개 데모는 이전 배포이며, Driving Practice 공개 데모의 최신 확장 반영도 확인되지 않았습니다. “최신 PR”에는 병합 전 변경이 포함될 수 있습니다.</sub>

<!-- PROJECT-LINKS:END -->
