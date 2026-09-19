# Action, RTS, FPS and Flash expansion

The six new cartridges are original-asset playable slices inspired by Mega Man X4/X5/X6, StarCraft, Overwatch, and Fireboy and Watergirl. This is a mechanics and browser performance project, not a claim to reproduce the complete commercial games or to match their production quality.

## Scope and reference choices

- **X4/X5/X6:** shared responsive action engine, three separately selectable stages. Dash momentum, variable jump, wall slide/kick, hold/release charged shots, saber and bullet parry, checkpoints/lives, original multi-phase bosses. X5/X6 add air dash and distinct moving-platform/hazard rules. Original procedural pixel armor, scenery and effects. [Capcom collection reference](https://megaman.capcom.com/mmxlc.html).
- **Colony Command:** one isometric sci-fi mission. Workers haul finite crystals, buildings cost resources and take construction time, production is queued, units path around obstacles, vision reveals fog, right-click commands and drag selection use the same input contract as the benchmark. [Blizzard unit control reference](https://classic.battle.net/scc/gs/control.shtml), [Blizzard commands reference](https://classic.battle.net/scc/GS/com.shtml).
- **Watchpoint: Sunward Patrol:** one hero kit and one coastal arena with friendly/opposing bots. True mouse-look, rifle spread/recoil, headshots, aim down sights, cover/line of sight, ammo/reload, dash, healing beacon, ultimate and contested point capture. Original geometry and first-person weapon/arms. [Blizzard hero kit reference](https://overwatch.blizzard.com/en-us/heroes/soldier-76/).
- **Ember & Tide:** three chambers with opposite elemental hazards, color-matched crystals/exits, pressure gates, far-side latches, optional elevated crystals and timed steam. Simultaneous shared-keyboard input or character switching for solo play. [Publisher-hosted game instructions](https://www.coolmathgames.com/0-fireboy-and-water-girl-in-the-forest-temple).

All new game art and optional short sound effects are made in code. No third-party sprite packs, map downloads, remote game assets or accounts are required at runtime. The FPS is one original rifle hero, not a recreation of the full roster. The RTS has one faction and a small mission, not competitive multiplayer. The Flash puzzle's chambers and characters are original, and its scope is much smaller than the reference game's campaign.

## Runtime and input

The existing fixed 120Hz simulation now accepts normalized canvas coordinates, mouse deltas, held mouse buttons and one-step button edges. Drags and releases are preserved until a simulation tick and consumed once, even if a browser frame runs multiple ticks. Pointer lock is opt-in through a click in a playing FPS; Esc, blur, hidden tabs, terminal state and disposal release it. Unavailable pointer lock has drag-look fallback. Keyboard aliases can be overridden by a cartridge for simultaneous two-player input.

Audio contexts are created only after pressing the sound button. Muting/pausing stops voices, disposal closes the context, and browser audio rejection falls back to mute. Cues use monotonically increasing simulation event counters, so turning sound on does not replay earlier events.

Automated controllers emit the same movement/action/pointer inputs as manual play. They can read simulation state to choose actions, but do not teleport units, adjust resources/health, force hits or bypass win conditions. This is deterministic input playback, not a claim about human completion times or AI agents learning to play from screenshots.

## Verification

On 2026-09-20 (Asia/Seoul), **206/206 tests** passed, together with TypeScript, lint, production build and `npm audit` (zero reported vulnerabilities). The bundle remains split by cartridge. Three.js is the existing shared 549 KB minified chunk; new game chunks are approximately 14–38 KB minified, with no new package dependency.

The added regression coverage exercises charge release/wall kicks/dashes/checkpoints/boss completion; construction costs/placement/production/pathfinding/fog/combat; aimed ray hits and misses/cover/reload/heal/ultimate/objective contest/respawn; cooperative gates/hazards/crystals/exits; and ordinary-input completion at 30/60/120 render schedules against fixed 120 Hz simulation.

Shared runtime checks now include chorded mouse buttons (right-aim with left-fire), click capture while locked, one-step mouse deltas/edges, quick keyboard/touch taps between ticks, blur/pause/cancel cleanup, audio opt-in/mute/disposal, and existing-game lifecycle regression checks.

Direct desktop browser checks exercised a real jump key, RTS worker selection and placement of a barracks through its construction cycle, marine production and drag selection, FPS click-to-fire (magazine 24→23), drag-look, pause/resume, and game navigation. Automation did not acquire native pointer lock in this Chrome session; the drag-look fallback was directly exercised, while lock/capture/chord behavior was verified by runtime tests. Do not interpret that as a real-device pointer-lock certification.

At a 390×844 emulated viewport, Temple's character-switch touch button changed the selected hero, and the seven FPS action buttons fit into two rows without horizontal overflow. These are browser viewport checks, not physical touchscreen tests. RTS/FPS remain designed for a keyboard and mouse.

The final production six-game suite and captured frame measurements are listed below. Sound was muted. Canvas sizes differ because mouse/co-op instructions reserve an extra row. CPU time is JavaScript/update/render submission time; it excludes actual GPU completion. Measurements are local Chrome results, not a promise for other devices.

| Cartridge                  | Result | Simulation | Average FPS | p95 frame | CPU/frame | Canvas   |
| -------------------------- | ------ | ---------: | ----------: | --------: | --------: | -------- |
| NEON RECLAIMER             | CLEAR  |     38.9 s |        60.0 |   17.4 ms |   1.63 ms | 1404×482 |
| ORBITAL AFTERBURN          | CLEAR  |     44.2 s |        60.0 |   17.4 ms |   1.22 ms | 1404×482 |
| ECLIPSE FOUNDRY            | CLEAR  |     40.7 s |        56.2 |   17.6 ms |   2.11 ms | 1404×482 |
| COLONY COMMAND             | CLEAR  |     30.0 s |        53.9 |   18.4 ms |   6.38 ms | 1404×460 |
| Watchpoint: Sunward Patrol | CLEAR  |     32.0 s |        59.9 |   18.3 ms |   4.61 ms | 1404×460 |
| EMBER & TIDE               | CLEAR  |     26.8 s |        60.0 |   18.3 ms |   1.14 ms | 1404×460 |

[Raw browser export, latest six records](expansion-benchmark-chrome.json). Captures were taken during this run, so these measurements include screenshot overhead; X6 and Colony had lower average FPS than their approximately 60 FPS first pass. No samples were removed from the exported records. This is a functional browser check, not a controlled performance study.

Each gallery preview is a captured frame from the actual production game: [X4](../public/previews/x4.png), [X5](../public/previews/x5.png), [X6](../public/previews/x6.png), [Colony](../public/previews/colony.png), [Watchpoint](../public/previews/watchpoint.png), [Temple](../public/previews/temple.png).
