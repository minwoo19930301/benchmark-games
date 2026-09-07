# Local verification — 2026-09-07

This records checks on the standalone Vite client, not a deployment or an official Nintendo release.

| Check | Result | Scope |
| --- | --- | --- |
| Clean `npm ci` | Passed | Recreated the committed dependency graph without legacy-peer-deps or force |
| `npm test` | 44 passed | 16 simulation/game, 22 optional WebMCP lifecycle/contract and 6 frame-clock tests |
| Node 22.13 minimum | 44 passed | Explicit `--experimental-strip-types` keeps the documented minimum working |
| `npm run typecheck` | Passed | App, renderer, UI primitive and Vite entry/configuration |
| `npm run lint` | Passed | Retained authored source |
| `npm run build` | Passed | Static client output only; no server bundle |
| `npm audit` | 0 vulnerabilities reported | Installed dependency versions at the time of this check |

The six complete-level controllers use normal running/jumping or walking/jumping input at 30, 60 and 120 Hz. They do not teleport, disable enemies or replace the level. The walk-only controller loses two lives naturally before completing; this is not a real touch-device test.

The optional `document.modelContext` bridge has no Sites dependency and remains inert in unsupported browsers. Its tests evaluate mocked registration/lifecycle contracts, not native browser tool invocation.

Build warnings remain visible: the local Node runtime reported an upstream `module.register()` deprecation; the asynchronously imported renderer bundle is about 508 KB minified (132 KB gzip), above Vite's 500 KB warning threshold. Neither warning was hidden by raising limits. The Three.js renderer is loaded separately from the initial UI.

This source check does not certify browser rendering, physical touch devices, GPU performance, visual comparison with an original game or native WebMCP support. Browser observations, if subsequently added, must be recorded separately from these CPU/build results.

## Actual browser observations

On 2026-09-07 the standalone client was opened at its local address in the desktop in-app browser (1280 × 720). These observations are separate from the CPU/build checks above:

- Three.js scenery, character, coins, enemy, HUD and title overlay rendered; `preview.jpg` is an actual screenshot, not a concept image.
- The visible Play, Pause and Resume buttons changed the phase and timer correctly.
- The page's native `read_mario_game`, `start_mario_game` and `toggle_mario_pause` tools were invoked successfully. Restart reset the state to three lives, zero coins and 180 seconds.
- Initial testing exposed a `Simulation.advance` RangeError from mixing `performance.now()` with the timestamp of an already queued RAF. The renderer now uses one RAF clock, resets on lifecycle changes and clamps elapsed time safely without weakening the simulation's input validation.
- After reloading the fix, four repeated pause/resume/restart cycles produced zero new browser errors or warnings. The old pre-fix log was excluded by timestamp, not deleted or concealed.

Keyboard taps were sent, but this automated browser pass did not establish sustained movement or jump behavior. Full-level completion is CPU-controller evidence only. Physical touch, prolonged human play, GPU/FPS measurements and fidelity comparison against Nintendo originals remain unverified.
