# Local verification — 2026-09-07

This records checks on the standalone Vite client, not a deployment or an official Nintendo release.

| Check | Result | Scope |
| --- | --- | --- |
| Clean `npm ci` | Baseline passed | Earlier check recreated the committed dependency graph without legacy-peer-deps or force; input upgrade uses the same dependencies |
| `npm test` | 59 passed | 16 simulation/game, 15 input, 22 optional WebMCP lifecycle/contract and 6 frame-clock tests |
| Node 22.13 minimum | Baseline 44 passed | Earlier baseline verified the minimum; the input upgrade keeps explicit `--experimental-strip-types` |
| `npm run typecheck` | Passed | App, renderer, UI primitive and Vite entry/configuration |
| `npm run lint` | Passed | Retained authored source |
| `npm run build` | Passed | Static client output only; no server bundle |
| `npm audit` | Baseline 0 vulnerabilities reported | Earlier dependency audit; package versions and lockfile are unchanged by the input upgrade |

The six complete-level controllers use the shared `GameControls` input manager, with the touch RUN preference enabled or disabled, at 30, 60 and 120 Hz. They do not teleport, disable enemies or replace the level. The walk-only controller loses two lives naturally before completing; these are CPU simulations, not physical touch-device tests.

## Input upgrade regressions

The old renderer sampled only currently held keys/pointers: a jump pressed and released between RAF callbacks was lost. The input manager now retains that press until one physics step consumes it. The released state is still passed through, preserving a short hop instead of extending the jump. The 15 new input tests verify:

- Short keyboard taps at 30, 60, 120 and 240 Hz survive the zero-dt frame after start/resume and produce one short jump.
- A touch tap also survives a frame shorter than the 120 Hz physics step; just-before-landing taps use the existing jump buffer, while older airborne taps expire.
- Held/repeated jump inputs never auto-bounce after landing; a new release/repress between frames can jump again.
- Each keyboard key and pointer releases independently. Repeated release/capture-loss signals do not cancel another finger's input.
- Pause/restart drops pending jump taps and physical presses; OS repeat cannot restore cleared keys. Inputs aimed at a focused control do not move the player.
- Touch RUN has the same simulation speed as Shift, does not interfere with a held Shift key, and remains selected after physical inputs clear. RUN alone never moves the player.

The RUN toggle is a retained preference for the current page session. It is not saved to browser storage. Touch control buttons are disabled outside active play, and the four-button row is sized to fit a 320 px viewport. Browser layout and event observations for this upgrade must be recorded separately below.

The optional `document.modelContext` bridge has no Sites dependency and remains inert in unsupported browsers. Its tests evaluate mocked registration/lifecycle contracts, not native browser tool invocation.

Build warnings remain visible: the local Node runtime reported an upstream `module.register()` deprecation; the asynchronously imported renderer bundle is about 509 KB minified (132 KB gzip), above Vite's 500 KB warning threshold. Neither warning was hidden by raising limits. The Three.js renderer is loaded separately from the initial UI.

This source check does not certify browser rendering, physical touch devices, GPU performance, visual comparison with an original game or native WebMCP support. Browser observations, if subsequently added, must be recorded separately from these CPU/build results.

## Actual browser observations

On 2026-09-07 the standalone client was opened at its local address in the desktop in-app browser (1280 × 720). These observations are separate from the CPU/build checks above:

- Three.js scenery, character, coins, enemy, HUD and title overlay rendered; `preview.jpg` is an actual screenshot, not a concept image.
- The visible Play, Pause and Resume buttons changed the phase and timer correctly.
- The page's native `read_mario_game`, `start_mario_game` and `toggle_mario_pause` tools were invoked successfully. Restart reset the state to three lives, zero coins and 180 seconds.
- Initial testing exposed a `Simulation.advance` RangeError from mixing `performance.now()` with the timestamp of an already queued RAF. The renderer now uses one RAF clock, resets on lifecycle changes and clamps elapsed time safely without weakening the simulation's input validation.
- After reloading the fix, four repeated pause/resume/restart cycles produced zero new browser errors or warnings. The old pre-fix log was excluded by timestamp, not deleted or concealed.

Keyboard taps were sent, but this automated browser pass did not establish sustained movement or jump behavior. Full-level completion is CPU-controller evidence only. Physical touch, prolonged human play, GPU/FPS measurements and fidelity comparison against Nintendo originals remain unverified.

## Input upgrade: separate Chrome verification

`tests/browser-input.mjs` passed against the local development server in an isolated headless Chrome session:

- At 390 px, real Chromium touch events moved the player; RUN increased measured progress per game second by more than 30% compared with walking. Its selected state survived pause/resume, and controls were disabled while paused.
- Holding a keyboard direction while tapping and releasing the same touch direction kept the keyboard movement active. After release and pause/resume, the player stopped without a stuck input.
- At 1280 px, keyboard movement and a jump key tap were accepted and Escape paused the game. No page errors occurred in any scenario.
- Mobile and desktop screenshots were inspected; the mobile control row and footer fit within the viewport.

The test installs a read-only adapter for the existing game-state tool to observe phase/time/progress; game actions use browser input events. This does not test native WebMCP availability. Jump timing and heights remain covered by the CPU regression tests, and these browser checks are not full-level or physical-device playthroughs.

With Chrome and Playwright installed, run `node tests/browser-input.mjs` while the development server is running. `PLAYWRIGHT_MODULE`, `TEST_URL`, and `EVIDENCE_DIR` select an existing Playwright module, local URL, and optional screenshot directory.
