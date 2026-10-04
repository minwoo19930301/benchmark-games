import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput, idlePointer } from '../lib/retro/types.ts';
import {
  WatchpointSimulation,
  watchpointBenchmark,
  LOOK_SENSITIVITY,
  MAGAZINE,
} from '../lib/retro/watchpoint/simulation.ts';
import {
  covers,
  visible,
  rayBox,
  canStand,
  OBJECTIVE,
  angleDifference,
} from '../lib/retro/watchpoint/world.ts';

const buttons = (values = {}, pointer = {}) => ({
  ...idleInput(),
  ...values,
  pointer: { ...idlePointer(), ...pointer },
});
function advance(game, seconds, input = buttons()) {
  for (let frame = 0; frame < Math.round(seconds * 120); frame++)
    game.step(1 / 120, input);
}
function isolated() {
  const game = new WatchpointSimulation();
  game.allies = [];
  game.bots = [game.bots[0]];
  Object.assign(game.bots[0], {
    x: 0,
    z: 2,
    hp: 110,
    maxHp: 110,
    cooldown: 100,
  });
  Object.assign(game.player, { x: 0, z: 12, yaw: 0, pitch: 0 });
  return game;
}
function aimed(game, target, y = 1.7, values = {}) {
  const p = game.player;
  const yaw = Math.atan2(target.x - p.x, -(target.z - p.z));
  const pitch = Math.atan2(
    y - p.y - 1.62,
    Math.hypot(target.x - p.x, target.z - p.z),
  );
  return buttons(values, {
    dx: angleDifference(yaw, p.yaw) / LOOK_SENSITIVITY,
    dy: (p.pitch - pitch) / LOOK_SENSITIVITY,
    secondary: false,
  });
}

test('mouse deltas rotate actual aim and WASD movement follows camera orientation', () => {
  const game = new WatchpointSimulation();
  game.step(
    1 / 120,
    buttons({}, { dx: Math.PI / 2 / LOOK_SENSITIVITY, dy: -100 }),
  );
  assert.ok(Math.abs(game.player.yaw - Math.PI / 2) < 1e-8);
  assert.ok(game.player.pitch > 0);
  const before = { x: game.player.x, z: game.player.z };
  advance(game, 0.5, buttons({ up: true }));
  assert.ok(game.player.x > before.x + 2.9);
  assert.ok(Math.abs(game.player.z - before.z) < 0.01);
  const yaw = game.player.yaw;
  game.step(1 / 120, buttons({}, { dx: NaN, dy: Infinity }));
  assert.equal(game.player.yaw, yaw);
  for (let i = 0; i < 5; i++) game.step(1 / 120, buttons({}, { dy: -900 }));
  assert.equal(game.player.pitch, 1.25);
});

test('hitscan uses actual ray direction, a finite magazine, recoil and distinct headshot hitboxes', () => {
  const game = isolated();
  const target = game.bots[0];
  game.step(
    1 / 120,
    buttons({ attack: true }, { dx: Math.PI / 2 / LOOK_SENSITIVITY }),
  );
  assert.equal(target.hp, 110, 'firing away from a bot cannot auto-hit it');
  assert.equal(game.player.ammo, MAGAZINE - 1);
  advance(game, 0.2);
  game.step(1 / 120, aimed(game, target, 1.05, { attack: true }));
  assert.equal(target.hp, 90);
  assert.equal(game.headshots, 0);
  assert.ok(game.player.recoil > 0);
  advance(game, 0.2);
  game.step(1 / 120, aimed(game, target, 1.7, { attack: true }));
  assert.equal(target.hp, 50);
  assert.equal(game.headshots, 1);
  assert.equal(game.audioCues.shot, 3);
  assert.equal(game.audioCues.hit, 2);
});

test('cover occludes bullets and line of sight, while an exposed route is hittable', () => {
  assert.equal(
    visible({ x: -11, y: 1.6, z: 8 }, { x: -11, y: 1.6, z: -8 }),
    false,
  );
  assert.equal(visible({ x: 0, y: 1.6, z: 8 }, { x: 0, y: 1.6, z: 0 }), true);
  assert.equal(
    rayBox(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      { x: -1, y: -1, z: -5 },
      { x: 1, y: 1, z: -4 },
    ),
    4,
  );
  const game = isolated(),
    target = game.bots[0];
  Object.assign(game.player, { x: -11, z: 8 });
  Object.assign(target, { x: -11, z: -8 });
  game.step(1 / 120, aimed(game, target, 1.7, { attack: true }));
  assert.equal(target.hp, 110);
  assert.equal(game.traces[0].hit, false);
  assert.ok(
    game.traces[0].to.z > -1,
    'shot stops at the kiosk rather than passing through it',
  );
});

test('wall collision blocks sustained sprint, while jump remains edge-triggered', () => {
  const game = isolated();
  game.bots = [];
  game.player.x = -6;
  game.player.z = 13;
  advance(game, 1, buttons({ up: true, special: true }));
  assert.ok(
    game.player.z > 10.85,
    'sprint cannot pass through the cargo barrier',
  );
  assert.ok(canStand(game.player.x, game.player.z));
  assert.equal(game.audioCues.dash, 1);
  assert.equal(game.player.sprinting, true);
  assert.equal('dashCooldown' in game.player, false, 'Sprint has no cooldown');
  const ammo = game.player.ammo;
  advance(game, 0.4, buttons({ up: true, special: true, attack: true }));
  assert.equal(game.player.ammo, ammo, 'cannot fire while sprinting');
  advance(game, 0.25, buttons({ attack: true }));
  assert.ok(
    game.player.ammo < ammo,
    'releasing Sprint permits the rifle after recovery',
  );
  game.player.x = 0;
  advance(game, 1.5, buttons({ jump: true }));
  assert.equal(game.player.y, 0);
  assert.equal(
    game.audioCues.jump,
    1,
    'holding jump does not bunny-hop after landing',
  );
  advance(game, 0.1);
  game.step(1 / 120, buttons({ jump: true }));
  assert.ok(game.player.y > 0);
  assert.ok(
    covers.every((cover) => !canStand(cover.x, cover.z)),
    'collision uses every visible cover footprint',
  );
});

test('reload takes time, prevents shots, conserves reserve and handles an empty reserve', () => {
  const game = isolated();
  game.player.ammo = 3;
  game.player.reserve = 8;
  game.step(1 / 120, buttons({ reload: true, attack: true }));
  assert.ok(game.player.reload > 1.6);
  const shots = game.shots;
  advance(game, 1, buttons({ attack: true }));
  assert.equal(game.shots, shots);
  assert.equal(game.player.ammo, 3);
  advance(game, 0.7);
  assert.equal(game.player.ammo, 11);
  assert.equal(game.player.reserve, 0);
  game.player.ammo = 0;
  advance(game, 1, buttons({ attack: true, reload: true }));
  assert.equal(game.shots, shots);
  assert.equal(game.player.ammo, 0);
  assert.equal(game.player.reload, 0);
});

test('deployed healing is spatial, limited by cooldown and also restores nearby allies', () => {
  const game = new WatchpointSimulation();
  game.bots = [];
  game.player.hp = 80;
  Object.assign(game.allies[0], {
    x: game.player.x + 1,
    z: game.player.z,
    hp: 100,
  });
  game.step(1 / 120, buttons({ interact: true }));
  assert.ok(game.beacon);
  const allyHp = game.allies[0].hp;
  advance(game, 0.5, buttons({ interact: true }));
  assert.ok(game.player.hp > 91);
  assert.ok(game.allies[0].hp > allyHp);
  assert.equal(
    game.audioCues.ability,
    1,
    'holding E cannot redeploy every tick',
  );
  game.player.x = 10;
  const hp = game.player.hp;
  advance(game, 0.5);
  assert.equal(
    game.player.hp,
    hp,
    'outside the beacon radius there is no healing',
  );
  assert.ok(game.player.healCooldown > 13);
});

test('Tactical Visor requires earned charge and assists only targets inside view and line of sight', () => {
  const game = isolated();
  game.step(1 / 120, buttons({ ultimate: true }));
  assert.equal(game.player.visor, 0);
  advance(game, 0.1);
  const target = game.bots[0];
  for (let i = 0; i < 8; i++) {
    target.hp = 1000;
    game.step(1 / 120, aimed(game, target, 1.7, { attack: true }));
    advance(game, 0.16);
  }
  assert.ok(game.player.ultimate > 50, 'actual damage earns charge');
  game.player.ultimate = 100;
  game.step(1 / 120, buttons({ ultimate: true }));
  assert.equal(game.player.ultimate, 0);
  assert.equal(game.player.visor, 6);
  assert.equal(game.player.ammo, MAGAZINE);
  target.hp = 110;
  game.player.yaw = 0.22;
  game.player.pitch = 0;
  game.step(1 / 120, buttons({ attack: true }));
  assert.equal(
    target.hp,
    90,
    'visor connects a normal 20-damage body shot off the crosshair',
  );
  assert.equal(game.visorHits, 1);
  advance(game, 0.2);
  game.player.yaw = Math.PI / 2;
  game.step(1 / 120, buttons({ attack: true }));
  assert.equal(target.hp, 90, 'an enemy outside the view cone is not acquired');
  advance(game, 0.2);
  Object.assign(game.player, { x: -11, z: 8, yaw: 0, pitch: 0 });
  Object.assign(target, { x: -11, z: -8 });
  game.step(1 / 120, buttons({ attack: true }));
  assert.equal(target.hp, 90, 'visor does not lock or shoot through cover');
  assert.equal(game.player.visorTarget, -1);
  advance(game, 6);
  assert.equal(game.player.visor, 0);
});

test('Helix Rockets use secondary fire, travel through space, splash nearby bots and respect cover', () => {
  const game = isolated(),
    target = game.bots[0];
  const nearby = { ...target, id: 20, x: 1.2, z: 2, hp: 110 };
  game.bots.push(nearby);
  const ammo = game.player.ammo;
  game.step(1 / 120, buttons({}, { secondaryPressed: true }));
  assert.equal(game.rockets.length, 1);
  assert.equal(game.helixShots, 1);
  assert.equal(target.hp, 110, 'rockets must travel before impact');
  assert.equal(game.player.ammo, ammo, 'Helix does not spend rifle rounds');
  assert.equal('ads' in game.player, false, 'secondary fire never enters ADS');
  advance(game, 0.45);
  assert.equal(target.hp, 0);
  assert.ok(nearby.hp < 110, 'nearby bot takes splash');
  assert.ok(game.player.helixCooldown > 7);
  game.step(1 / 120, buttons({ guard: true }));
  assert.equal(game.helixShots, 1);
  const covered = isolated();
  Object.assign(covered.player, { x: -11, z: 8, yaw: 0 });
  Object.assign(covered.bots[0], { x: -11, z: -8 });
  covered.step(1 / 120, buttons({ guard: true }));
  advance(covered, 0.5);
  assert.equal(covered.bots[0].hp, 110);
  assert.equal(covered.rockets.length, 0);
});

test('forward Sprint remains active without a cooldown and stops when released or moving backward', () => {
  const game = isolated();
  game.bots = [];
  game.player.z = 20;
  advance(game, 1, buttons({ up: true, special: true }));
  assert.ok(game.player.z < 11);
  assert.equal(game.player.sprinting, true);
  assert.equal(game.audioCues.dash, 1);
  advance(game, 0.1);
  assert.equal(game.player.sprinting, false);
  advance(game, 0.1, buttons({ up: true, special: true }));
  assert.equal(game.player.sprinting, true);
  advance(game, 0.1, buttons({ down: true, special: true }));
  assert.equal(game.player.sprinting, false);
});

test('enemy fire has a visible windup then an avoidable projectile that respects cover', () => {
  const game = isolated(),
    bot = game.bots[0];
  game.player.invulnerable = 0;
  bot.cooldown = 0;
  game.step(1 / 120, buttons());
  assert.ok(bot.windup > 0.6);
  assert.equal(game.bolts.length, 0);
  advance(game, 0.8);
  assert.ok(game.bolts.length > 0);
  advance(game, 1);
  assert.ok(game.player.hp < 200);
  const dodged = isolated();
  dodged.player.invulnerable = 0;
  dodged.bots[0].cooldown = 0;
  dodged.step(1 / 120, buttons());
  advance(dodged, 1.6, buttons({ right: true }));
  assert.equal(
    dodged.player.hp,
    200,
    'moving off the telegraphed aim avoids the locked projectile',
  );
});

test('only the hero on an uncontested objective captures, and enemy ownership progresses while absent', () => {
  const game = isolated();
  Object.assign(game.bots[0], { x: 3, z: -7 });
  advance(game, 1);
  assert.ok(game.enemyCapture > 1);
  assert.equal(game.capture, 0);
  game.player.x = 0;
  game.player.z = -3;
  advance(game, 1);
  assert.equal(game.contested, true);
  assert.equal(game.capture, 0);
  game.bots[0].hp = 0;
  advance(game, 1);
  assert.equal(game.contested, false);
  assert.ok(game.capture > 3);
  game.player.x = OBJECTIVE.x + OBJECTIVE.radius + 1;
  const capture = game.capture;
  advance(game, 1);
  assert.equal(game.capture, capture);
});

test('death respawns at the south gate, and a third defeat is terminal', () => {
  const game = isolated();
  game.bots = [];
  function lethalBolt() {
    game.player.invulnerable = 0;
    game.player.hp = 1;
    game.bolts.push({
      x: game.player.x,
      y: 1,
      z: game.player.z,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 1,
    });
    game.step(1 / 120, buttons());
  }
  lethalBolt();
  assert.equal(game.player.deaths, 1);
  assert.ok(game.player.respawn > 2.9);
  advance(game, 3.1);
  assert.equal(game.player.hp, 200);
  assert.equal(game.player.z, 20);
  assert.ok(game.player.invulnerable > 0);
  lethalBolt();
  advance(game, 3.1);
  lethalBolt();
  assert.equal(game.phase, 'lost');
  const frozen = structuredClone(game);
  advance(game, 5, buttons({ up: true, attack: true, ultimate: true }));
  assert.deepEqual(structuredClone(game), frozen);
});

for (const hz of [30, 60, 120]) {
  test(`ordinary mouse and keyboard benchmark captures the full arena at ${hz} render Hz`, () => {
    const game = new WatchpointSimulation();
    const initial = structuredClone(game);
    const input = watchpointBenchmark(game);
    assert.deepEqual(
      structuredClone(game),
      initial,
      'controller only emits inputs',
    );
    assert.ok(input.pointer && Number.isFinite(input.pointer.dx));
    for (let frame = 0; frame < hz * 120 && game.phase === 'playing'; frame++) {
      for (let tick = 0; tick < 120 / hz && game.phase === 'playing'; tick++)
        game.step(1 / 120, watchpointBenchmark(game));
    }
    assert.equal(game.phase, 'won');
    assert.equal(game.capture, 100);
    assert.equal(game.player.kills, 9);
    assert.equal(game.wave, 4);
    assert.ok(game.bots.every((bot) => bot.hp === 0));
    assert.ok(game.player.hp > 0);
    assert.ok(game.time < 120);
    assert.ok(game.shots >= 18 && game.shots < 100);
    assert.ok(game.headshots > 0);
    assert.ok(game.helixShots > 0 && game.visorHits > 0);
    assert.ok(
      game.audioCues.ability > 0,
      'Helix and charged Visor were used through ordinary buttons',
    );
    const frozen = structuredClone(game);
    advance(game, 1, buttons({ attack: true, up: true }));
    assert.deepEqual(structuredClone(game), frozen);
  });
}

test('invalid elapsed time is inert and long frames are bounded', () => {
  const game = isolated(),
    before = structuredClone(game);
  for (const dt of [NaN, Infinity, -1, 0]) game.step(dt, buttons({ up: true }));
  assert.deepEqual(structuredClone(game), before);
  game.step(999, buttons({ up: true }));
  assert.ok(game.time <= 1 / 30);
  assert.ok(12 - game.player.z < 0.3);
});

test('a quick mouse tap ending between ticks still fires once', () => {
  const game = isolated();
  game.step(
    1 / 120,
    buttons(
      {},
      { primaryPressed: true, primaryReleased: true, primary: false },
    ),
  );
  assert.equal(game.player.ammo, MAGAZINE - 1);
  advance(game, 0.5);
  assert.equal(game.player.ammo, MAGAZINE - 1);
});
