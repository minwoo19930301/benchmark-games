import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ReploidSimulation,
  benchmarkReploid,
} from '../lib/retro/reploid/simulation.ts';
import { stages, platformAt, hazardPhase } from '../lib/retro/reploid/world.ts';
import { idleInput } from '../lib/retro/types.ts';
const dt = 1 / 120;
const input = (held = {}) => ({ ...idleInput(), ...held });
const advance = (s, seconds, held = {}) => {
  for (let i = 0; i < Math.round(seconds * 120); i++) s.step(dt, input(held));
};

test('responsive running, jump height and landing use actual solid terrain', () => {
  const s = new ReploidSimulation('x4');
  advance(s, 0.4, { right: true });
  assert.equal(s.player.vx, 145);
  assert.ok(s.player.x > 110);
  const floor = s.player.y;
  advance(s, 0.25, { jump: true });
  assert.ok(s.player.y < floor - 50);
  assert.equal(s.player.grounded, false);
  advance(s, 1);
  assert.equal(s.player.grounded, true);
  assert.equal(s.player.y, floor);
});
test('dash jump preserves horizontal momentum and holding jump cannot repeat', () => {
  const ordinary = new ReploidSimulation(),
    dashed = new ReploidSimulation();
  ordinary.step(dt, input({ jump: true, right: true }));
  dashed.step(dt, input({ jump: true, right: true, guard: true }));
  advance(ordinary, 0.4, { jump: true, right: true });
  advance(dashed, 0.4, { jump: true, right: true });
  assert.ok(dashed.player.x > ordinary.player.x + 55);
  assert.equal(dashed.dashCount, 1);
  assert.equal(dashed.audioCues.jump, 1);
  advance(ordinary, 1, { jump: true });
  assert.equal(ordinary.audioCues.jump, 1);
});
test('solid wall stops horizontal movement, slows sliding and allows an outward wall kick', () => {
  const s = new ReploidSimulation();
  Object.assign(s.player, {
    x: 1089,
    y: 264,
    grounded: false,
    vy: 220,
    vx: 145,
  });
  s.step(dt, input({ right: true }));
  assert.equal(s.player.x, 1090);
  assert.equal(s.player.wall, 1);
  assert.ok(s.player.vy <= 72);
  const before = s.player.y;
  s.step(dt, input({ right: true, jump: true }));
  assert.equal(s.wallKicks, 1);
  assert.ok(s.player.vx < 0);
  assert.ok(s.player.y < before);
  assert.ok(s.player.vy < -350);
  assert.equal(s.player.airDash, true);
});
test('later armor gets one air dash; original stage does not', () => {
  for (const id of ['x4', 'x5', 'x6']) {
    const s = new ReploidSimulation(id);
    Object.assign(s.player, {
      x: 230,
      y: 150,
      grounded: false,
      vy: 40,
      coyote: 0,
    });
    s.step(dt, input({ guard: true, right: true }));
    assert.equal(s.dashCount, id === 'x4' ? 0 : 1);
    if (id !== 'x4') {
      assert.equal(s.player.airDash, false);
      s.step(dt, input());
      s.player.dashCooldown = 0;
      s.step(dt, input({ guard: true }));
      assert.equal(s.dashCount, 1);
    }
  }
});
test('buster fires on press then charges without auto-fire and releases a larger shot', () => {
  const s = new ReploidSimulation();
  s.step(dt, input({ attack: true }));
  assert.equal(s.shots.length, 1);
  assert.equal(s.shots[0].damage, 1);
  advance(s, 1.05, { attack: true });
  assert.equal(s.audioCues.shot, 1);
  s.step(dt, input());
  assert.equal(s.chargedShots, 1);
  assert.equal(s.audioCues.shot, 2);
  assert.ok(s.shots.some((shot) => shot.damage === 7 && shot.r === 12));
  assert.equal(s.player.charge, 0);
});
test('short buster tap does not create a free charge shot', () => {
  const s = new ReploidSimulation();
  advance(s, 0.15, { attack: true });
  s.step(dt, input());
  assert.equal(s.chargedShots, 0);
  assert.equal(s.audioCues.shot, 1);
});
test('clearing transient input discards stale charge without changing physical motion', () => {
  const s = new ReploidSimulation();
  advance(s, 1.1, { attack: true });
  const velocity = s.player.vx,
    shots = s.audioCues.shot;
  s.clearInput();
  assert.equal(s.player.vx, velocity);
  s.step(dt, input());
  assert.equal(s.player.charge, 0);
  assert.equal(s.audioCues.shot, shots);
  s.step(dt, input({ jump: true }));
  assert.ok(s.player.vy < 0);
});
test('buster collides with the same solid walls used by player movement', () => {
  const s = new ReploidSimulation();
  Object.assign(s.player, { x: 1065, y: 320, facing: 1 });
  s.step(dt, input({ attack: true }));
  advance(s, 0.1);
  assert.equal(s.shots.filter((shot) => !shot.enemy).length, 0);
});
test('Zero saber damages a nearby enemy once and cuts incoming shots', () => {
  const s = new ReploidSimulation();
  s.step(dt, input({ switch: true }));
  Object.assign(s.enemies[0], {
    x: 105,
    home: 105,
    y: 320,
    kind: 'turret',
    hp: 5,
    timer: 9,
  });
  s.shots.push({
    x: 95,
    y: 296,
    vx: -150,
    vy: 0,
    r: 4,
    damage: 3,
    life: 2,
    enemy: true,
    kind: 'orb',
    pierced: [],
  });
  s.step(dt, input({ special: true }));
  assert.equal(s.enemies[0].hp, 0);
  assert.equal(s.kills, 1);
  assert.equal(s.player.hp, 24);
  assert.equal(s.shots.length, 0);
  advance(s, 0.2, { special: true });
  assert.equal(s.audioCues.ability, 2);
});
test('damage grace prevents stacked hits and three deaths are terminal', () => {
  const s = new ReploidSimulation();
  s.damage(4);
  s.damage(9);
  assert.equal(s.player.hp, 20);
  s.player.invulnerable = 0;
  s.damage(30);
  assert.equal(s.lives, 2);
  assert.equal(s.player.hp, 24);
  s.player.invulnerable = 0;
  s.damage(30);
  s.player.invulnerable = 0;
  s.damage(30);
  assert.equal(s.lives, 0);
  assert.equal(s.phase, 'lost');
  const frozen = structuredClone(s);
  advance(s, 1, { attack: true, right: true });
  assert.deepEqual(structuredClone(s), frozen);
});
test('checkpoint activation heals and restores a later spawn after a real fall', () => {
  const s = new ReploidSimulation();
  Object.assign(s.player, { x: 1271, hp: 9 });
  s.step(dt, input());
  assert.equal(s.checkpoint, 1270);
  assert.equal(s.player.hp, 16);
  Object.assign(s.player, { y: 510, grounded: false });
  s.step(dt, input());
  assert.equal(s.player.x, 1270);
  assert.equal(s.lives, 2);
  assert.equal(s.player.hp, 24);
  assert.ok(s.audioCues.pickup > 0);
});
test('rescue capsules require interaction, proximity, and can only be collected once', () => {
  const s = new ReploidSimulation();
  const index = s.stage.capsules.findIndex((c) => c.kind === 'rescue'),
    capsule = s.stage.capsules[index];
  Object.assign(s.player, { x: capsule.x, y: capsule.y + 22, grounded: false });
  s.step(dt, input());
  assert.equal(s.collected[index], false);
  s.step(dt, input({ interact: true }));
  assert.equal(s.collected[index], true);
  assert.equal(s.rescues, 1);
  const score = s.score;
  s.step(dt, input({ interact: true }));
  assert.equal(s.score, score);
});
test('timed hazards expose an off window and warning before dealing damage', () => {
  const hazard = stages.x6.hazards[0];
  assert.equal(hazardPhase(hazard, 0), 'off');
  assert.equal(hazardPhase(hazard, 1.2), 'warning');
  assert.equal(hazardPhase(hazard, 2), 'active');
  const s = new ReploidSimulation('x6');
  Object.assign(s.player, { x: hazard.x + 10, y: 320 });
  s.step(dt, input());
  assert.equal(s.player.hp, 24);
  s.time = 2;
  s.step(dt, input());
  assert.equal(s.player.hp, 21);
});
test('orbital lift physically carries feet and furnace conveyor moves grounded armor', () => {
  const s = new ReploidSimulation('x5'),
    base = s.stage.platforms.find((p) => p.kind === 'lift'),
    lift = platformAt(base, 0);
  Object.assign(s.player, { x: lift.x + 50, y: lift.y, grounded: true });
  const before = s.player.x;
  advance(s, 0.15);
  assert.ok(s.player.x > before + 8);
  assert.equal(s.player.y, lift.y);
  const furnace = new ReploidSimulation('x6'),
    belt = furnace.stage.platforms.find((p) => p.kind === 'belt');
  Object.assign(furnace.player, { x: belt.x + 25, y: belt.y });
  advance(furnace, 0.2);
  assert.ok(furnace.player.x > belt.x + 32);
});
test('boss activates at its arena, telegraphs before attacking, and changes phase below half health', () => {
  const s = new ReploidSimulation();
  s.player.x = s.stage.arena + 40;
  s.step(dt, input());
  assert.equal(s.boss.mode, 'intro');
  advance(s, 1.15);
  assert.equal(s.boss.mode, 'tell');
  assert.equal(s.boss.pattern, 0);
  s.hitBoss(55);
  s.step(dt, input());
  assert.equal(s.boss.phase, 2);
  advance(s, 0.9);
  assert.ok(['attack', 'recover'].includes(s.boss.mode));
});
test('three boss ranged patterns are mechanically distinct', () => {
  const patterns = [];
  for (const id of ['x4', 'x5', 'x6']) {
    const s = new ReploidSimulation(id);
    s.player.x = s.stage.arena + 80;
    Object.assign(s.boss, {
      active: true,
      mode: 'attack',
      timer: 0.4,
      pattern: 1,
      fired: false,
    });
    s.updateBoss(dt);
    patterns.push(
      s.shots.map((shot) => [
        shot.kind,
        Math.round(shot.vx),
        Math.round(shot.vy),
      ]),
    );
  }
  assert.notDeepEqual(patterns[0], patterns[1]);
  assert.notDeepEqual(patterns[1], patterns[2]);
  assert.equal(patterns[2][0][0], 'flame');
});
test('invalid time is a strict no-op and a giant step is bounded', () => {
  const s = new ReploidSimulation();
  const before = structuredClone(s);
  for (const dt of [0, -1, NaN, Infinity]) s.step(dt, input({ attack: true }));
  assert.deepEqual(structuredClone(s), before);
  const other = new ReploidSimulation();
  s.step(10, input({ right: true }));
  other.step(0.05, input({ right: true }));
  assert.deepEqual(structuredClone(s), structuredClone(other));
});

for (const id of ['x4', 'x5', 'x6']) {
  const results = [];
  for (const fps of [30, 60, 120])
    test(`${id} normal-input controller completes real platforms and boss at ${fps} Hz`, () => {
      const s = new ReploidSimulation(id);
      let accumulator = 0;
      for (let frame = 0; frame < fps * 100 && s.phase === 'playing'; frame++) {
        accumulator += 1 / fps;
        while (accumulator + 1e-10 >= dt && s.phase === 'playing') {
          const before = structuredClone(s);
          const buttons = benchmarkReploid(s);
          if (frame === 0)
            assert.deepEqual(
              structuredClone(s),
              before,
              'benchmark must not mutate simulation',
            );
          s.step(dt, buttons);
          accumulator -= dt;
        }
      }
      assert.equal(s.phase, 'won', JSON.stringify(s.snapshot()));
      assert.equal(s.boss.hp, 0);
      assert.ok(s.time > 25 && s.time < 90);
      assert.ok(s.wallKicks >= 2);
      assert.ok(s.dashCount >= 3);
      assert.ok(s.chargedShots >= 10);
      assert.ok(s.bossHits > 10);
      assert.equal(s.checkpointIndex, 1);
      assert.equal(s.lives, 3);
      assert.ok(
        s.kills >= 2,
        'the charge-buster route defeats ordinary enemies as well as the boss',
      );
      assert.ok(s.collected.some(Boolean));
      results.push(s.snapshot());
      if (results.length > 1)
        assert.deepEqual(
          results.at(-1),
          results[0],
          '120 Hz controller must be independent of render frequency',
        );
      const terminal = structuredClone(s);
      s.step(dt, input({ attack: true }));
      assert.deepEqual(structuredClone(s), terminal);
    });
}
