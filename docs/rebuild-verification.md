# Reference rebuild — 2026-09-21

This replaces the courier, office, invented fighter and other unrelated themes in all eleven retro cartridges. The two existing Mario/Sonic cartridges retain their implementation. Source code, assets, simulation tests, browser observations and publication are separate evidence states.

## Implemented scope

| Cartridge | Reference behavior now present | Deliberate limits |
| --- | --- | --- |
| Smash | Mario/Kirby, Dream Land, percentage knockback, three stocks, directional ground/air attacks, charged smash, specials, shield/roll, grab/pummel/throw, hitstop, DI, ledge recovery | Two fighters, one CPU match. No full roster, items, four-player mode or Kirby copy library. Frame data and move selection are project-specific. |
| Iron | Jin/Hwoarang, four limb buttons, high/mid/low attack rules, back guard, crouch, sidesteps, dash/backdash, counters, 112 string, launcher/juggle, knockdown/get-up | Selected moves only, automatic get-up; no complete Tekken movelist, throws, Flamingo stance or online match. Procedural models are simplified and are not the original PS1 assets. |
| Ocarina | Link/Navi, Kokiri forest/Deku Tree chamber, camera-relative movement, Z targeting, sword combo/charged spin, frontal shield, roll, six-note song entry, Skulltulas/Gohma | Forest plus one chamber, three prelearned melodies and a condensed quest. No full world, inventory, campaign or original textures. |
| Commando | Marco, Morden rifle soldiers, optional POW rescue, infinite pistol, 200-round heavy gun, automatic close knife, finite grenades, one-hit infantry lives, three-hit SV-001 armor/ejection, boss gate | One short route. Original sprite/background art is locally bundled with provenance; collision terrain is simplified; SV-001 and Tetsuyuki use sourced sprite sheets. Enemy patterns, boss tuning and layout are adaptations. |
| Pocket | Red/Charmander, five species, original generation-I battle sprites, FIGHT/PKMN/ITEM/RUN menus, type advantages, party switching with an enemy response, items, wild escape and rival battle | Two learned moves per species, compact overworld, deterministic weakened-target capture threshold. No full generation-I catch formula, 151-species roster, status system or campaign. |
| X4/X5/X6 | X/Zero silhouettes and weapon ownership, charge buster, dash/wall kick, stage-specific Sky Lagoon/planetarium/lava scenery, Eregion/Necrobat/Heatnix silhouettes and attacks | Reconstructed compact platform routes. X4 character art is reused across all three; enemies, bosses and scenery remain procedural. Basic X4 X has no air dash; X5 uses low gravity without gravity reversal. Mid-stage character switch and Dark Hold projectile are adaptations. No original full stages or exact boss AI. |
| Colony | SCV/Marine/Command Center/Barracks/Depot/Bunker, 50-mineral SCV/Marine, 150 Barracks, 100 Depot/Bunker, 10 command-center supply/+8 depot, prerequisite buildings, four-place garrison, unloading, hold/stop, fog, build/production commands | One mineral-only Terran ground scenario, 400 initial minerals, accelerated construction/training. No gas, tech/air units or campaign. |
| Watchpoint | Soldier: 76 rifle, 25 rounds, Helix Rockets with projectile travel and cover-aware splash, held sprint with fire lock, spatial Biotic Field, six-second Tactical Visor constrained by FOV and line of sight | Compact Gibraltar-like harbor with nine enemies and two allies. No full map, roster, 6v6, matchmaking or reproduction of every balance revision. |
| Temple | Fireboy/Watergirl silhouettes, forest masonry, red/blue diamonds and exits, hazards, pressure gates, levers and cooperative movement | Three short puzzle rooms. Room geometry differs from the original Flash campaign. |

## Controls and regression coverage

Automated controllers provide ordinary input to each simulation. Completion tests use the same 120 Hz fixed simulation step as the runtime while scheduling frames at 30, 60 and 120 Hz. They do not write positions, HP, inventory or win flags during the completion run. Unit tests do set up isolated situations to test rules.

New regressions cover directional Smash attacks/recovery, Tekken limb input and high/mid/low blocking, Ocarina targeting/shield/songs, valid Pokémon switches costing one opponent turn, Metal Slug knife/ammo/lives/armor, supply destruction and garrison rules, Soldier's real ability kit, and boss projectile origins. Tests for old umbrella, courier and stamina mechanics were replaced with tests of the implemented reference mechanics.

The result schema is now 2, tagged `reference-rebuild-2026-09-21`. Records use `benchmark-games:retro-results:v2`; the old v1 store is left untouched. Different implementations should not be pooled as comparable performance samples.

## Local checks

**271 tests pass**, along with TypeScript, lint and production build. `npm audit` reported zero vulnerabilities. The build retains the existing shared Three.js chunk-size advisory. The foreground Chrome suite completed all eleven cartridges, then Metal Slug and X4/X5/X6 were rerun after the final sprite changes. Browser CPU measurements include update and render-command work, not GPU time. Canvas operation counts and WebGL draw calls are not directly comparable.

## Browser inspection

Canvas viewport: **1404 × 617 CSS pixels**, foreground Chrome on the local Mac. All eleven games were observed in real browser play; previews in `public/previews/` are actual play captures, not concept images. The full queue advanced through all eleven without a console warning or error in the inspected browser log. JSON is exported through the visible results button and retained as `rebuild-browser-results.json`.

Manual checks included Smash jump/attack, Tekken round flow, Link sword/jump/target/shield controls, Pokémon walking into grass and entering the move menu, X/Zero switching and attacks, and SCV selection → depot placement → supply rising 10 to 18. Enemy destruction of that depot reduced supply back to 10; Escape paused the simulation. Automated completion is broader than this manual spot-check, but neither is a claim of exhaustive human playtesting or physical touch-device validation.

The final Metal Slug run completed with three lives and two armor points. X4/X5/X6 also completed after the sprite replacement. Audio is opt-in synthesized effects; no original soundtrack is bundled. Original-equivalent 3D models, complete move lists and full campaigns remain outside the implemented scope stated above.

| Game | Result | Simulation seconds | Average FPS | p95 frame ms | CPU ms/frame |
| --- | --- | ---: | ---: | ---: | ---: |
| smash | CLEAR | 78.150 | 59.8 | 17.60 | 3.24 |
| iron | CLEAR | 24.825 | 60.0 | 17.40 | 5.15 |
| ocarina | CLEAR | 18.542 | 59.9 | 17.50 | 5.48 |
| commando | CLEAR | 31.317 | 60.0 | 17.40 | 0.80 |
| pocket | CLEAR | 20.150 | 60.0 | 17.40 | 0.52 |
| x4 | CLEAR | 41.325 | 59.7 | 17.50 | 1.40 |
| x5 | CLEAR | 41.025 | 60.0 | 18.30 | 1.29 |
| x6 | CLEAR | 40.842 | 60.0 | 18.30 | 1.05 |
| colony | CLEAR | 83.883 | 59.8 | 18.20 | 2.61 |
| watchpoint | CLEAR | 31.350 | 59.7 | 18.30 | 5.01 |
| temple | CLEAR | 26.825 | 60.0 | 18.30 | 1.11 |

Exact export: [rebuild-browser-results.json](rebuild-browser-results.json). For repeated games this table selects the most recent completed run.

## Reference sources

- Nintendo: [Smash controls](https://www.smashbros.com/wiiu-3ds/sp/us/howto/entry3.html), [Nintendo 64 game page](https://www.nintendo.com/en-gb/Games/Nintendo-64/Super-Smash-Bros-269756.html).
- Bandai Namco: [Tekken 3 Hwoarang command list](https://www.bandainamcoent.co.jp/cs/list/tekken3/moves/hwoarang-moves01.html).
- Nintendo: [Ocarina quick-start controls](https://www.nintendo.com/eu/media/downloads/games_8/quick_start_guide/QuickStartGuide_3DS_TheLegendOfZeldaOcarinaOfTime3D_EN.pdf).
- SNK: [Metal Slug game](https://www.snk-corp.co.jp/us/games/acaneogeo/metalslug/), [series history](https://www.snk-corp.co.jp/us/anniversary/metalslug30th/history/).
- Capcom: [Mega Man X Legacy Collection](https://megaman.capcom.com/mmxlc.html). Boss/stage names also cross-checked against Capcom's soundtrack listings; these sources are not evidence of pixel-exact visuals or frame data.
- Blizzard: [Terran supply](https://classic.battle.net/scc/terran/basic.shtml), [Marine](https://classic.battle.net/scc/terran/um.shtml), [SCV](https://classic.battle.net/scc/Terran/uscv.shtml), [Soldier: 76 abilities](https://overwatch.blizzard.com/en-us/heroes/soldier-76/).
- Oslo Albet: [Fireboy and Watergirl Forest Temple](https://play.google.com/store/apps/details?id=com.osloalbet.forest).
- Image provenance and ownership distinctions: [asset credits](ASSET-CREDITS.md).

These are unofficial compact browser reconstructions. Passing tests establishes the stated rules and completion paths, not original-equivalent graphics, gameplay depth or campaign completeness.
