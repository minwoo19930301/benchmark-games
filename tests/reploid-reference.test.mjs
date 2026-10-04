import assert from 'node:assert/strict';
import test from 'node:test';
import { idleInput } from '../lib/retro/types.ts';
import {
  ReploidSimulation,
  benchmarkReploid,
} from '../lib/retro/reploid/simulation.ts';
const DT = 1 / 120;
const input = (buttons = {}) => ({ ...idleInput(), ...buttons });
function step(simulation, buttons = {}) {
  simulation.step(DT, input(buttons));
}
function advance(simulation, seconds, buttons = {}) {
  for (let tick = 0; tick < Math.round(seconds / DT); tick++)
    step(simulation, buttons);
}
function arena(id, pattern) {
  const simulation = new ReploidSimulation(id);
  simulation.player.x = simulation.stage.arena + 100;
  Object.assign(simulation.boss, {
    active: true,
    mode: 'attack',
    timer: 0.4,
    pattern,
    fired: false,
    targetX: simulation.player.x,
  });
  return simulation;
}

test('F is an edge-triggered X/Zero selection that preserves health and discards a pending charge', () => {
  const simulation = new ReploidSimulation('x4');
  simulation.player.hp = 17;
  advance(simulation, 1.1, { attack: true });
  step(simulation, { switch: true });
  assert.equal(simulation.character, 'zero');
  assert.equal(simulation.player.hp, 17);
  assert.equal(simulation.player.charge, 0);
  assert.equal(simulation.chargedShots, 0);
  advance(simulation, 0.2, { switch: true });
  assert.equal(simulation.character, 'zero');
  step(simulation);
  step(simulation, { switch: true });
  assert.equal(simulation.character, 'x');
  assert.equal(simulation.player.hp, 17);
});

test('X4 and X5 X use the buster while Zero owns the saber; X6 X can use the inherited saber', () => {
  for (const id of ['x4', 'x5']) {
    const simulation = new ReploidSimulation(id);
    step(simulation, { special: true });
    assert.equal(simulation.player.saber, 0);
    step(simulation, { switch: true });
    step(simulation, { attack: true });
    assert.ok(simulation.player.saber > 0);
    assert.equal(
      simulation.audioCues.shot,
      0,
      'Zero does not fire an invented charge buster',
    );
    advance(simulation, 1.1, { attack: true });
    step(simulation);
    assert.equal(simulation.chargedShots, 0);
    assert.equal(simulation.player.charge, 0);
  }
  const x6 = new ReploidSimulation('x6');
  step(x6, { special: true });
  assert.equal(x6.character, 'x');
  assert.ok(x6.player.saber > 0);
});

test('Eregion breath, Necrobat bat spread and Heatnix flame wave have different flight geometry', () => {
  const eregion = arena('x4', 1),
    necrobat = arena('x5', 1),
    heatnix = arena('x6', 1);
  for (const simulation of [eregion, necrobat, heatnix])
    simulation.updateBoss(DT);
  assert.ok(eregion.shots.every((shot) => shot.kind === 'flame'));
  assert.equal(new Set(eregion.shots.map((shot) => shot.vy)).size, 2);
  assert.equal(necrobat.shots.length, 3);
  assert.ok(necrobat.shots.every((shot) => shot.kind === 'bat'));
  assert.ok(new Set(necrobat.shots.map((shot) => shot.vy)).size === 3);
  assert.equal(heatnix.shots[0].y, heatnix.stage.floor - 12);
  assert.equal(heatnix.shots[0].vy, 0);
});

test('Dark Hold is a visible projectile that freezes on contact then restores movement', () => {
  const simulation = arena('x5', 2);
  simulation.updateBoss(DT);
  assert.equal(simulation.darkHoldCasts, 1);
  const ring = simulation.shots[0];
  assert.equal(ring.damage, 0);
  assert.equal(ring.r, 15);
  ring.x = simulation.player.x;
  ring.y = simulation.player.y - 22;
  ring.vx = 0;
  simulation.updateShots(DT);
  assert.equal(simulation.darkHold, 0.65);
  assert.equal(
    simulation.player.hp,
    24,
    'the freeze ring itself does not deal hidden damage',
  );
  const before = simulation.player.x;
  advance(simulation, 0.3, { right: true });
  assert.equal(simulation.player.x, before);
  assert.ok(simulation.darkHold > 0);
  advance(simulation, 0.6, { right: true });
  assert.equal(simulation.darkHold, 0);
  assert.ok(simulation.player.x > before + 10);
});

test('jumping above Dark Hold avoids freezing and Zero can cut the ring', () => {
  const jumping = arena('x5', 2);
  jumping.updateBoss(DT);
  const ring = jumping.shots[0];
  ring.x = jumping.player.x;
  ring.vx = 0;
  jumping.player.y -= 80;
  jumping.updateShots(DT);
  assert.equal(jumping.darkHold, 0);

  const cutting = arena('x5', 2);
  cutting.updateBoss(DT);
  cutting.shots[0].x = cutting.player.x + 30;
  cutting.shots[0].vx = 0;
  step(cutting, { switch: true, special: true });
  assert.ok(cutting.player.saber > 0);
  assert.equal(cutting.shots.length, 0);
  assert.equal(cutting.darkHold, 0);
});

test('Heatnix falling fire targets the telegraphed position rather than following the player', () => {
  const simulation = arena('x6', 2);
  const targetX = simulation.boss.targetX;
  simulation.player.x += 160;
  simulation.updateBoss(DT);
  assert.equal(simulation.shots.length, 3);
  assert.equal(simulation.shots[1].x, targetX);
  assert.ok(simulation.shots.every((shot) => shot.vx === 0 && shot.vy > 0));
  assert.ok(
    simulation.shots.every((shot) => shot.y < simulation.player.y - 150),
  );
  const before = simulation.shots.map((shot) => shot.x);
  simulation.player.x += 100;
  simulation.updateShots(DT);
  assert.deepEqual(
    simulation.shots.map((shot) => shot.x),
    before,
  );
});

test('each boss reaches its third telegraphed pattern through its actual state machine', () => {
  for (const id of ['x4', 'x5', 'x6']) {
    const simulation = arena(id, 0);
    Object.assign(simulation.boss, { mode: 'recover', timer: 0, cycle: 2 });
    simulation.updateBoss(DT);
    assert.equal(simulation.boss.mode, 'tell');
    assert.equal(simulation.boss.pattern, 2);
    assert.equal(
      simulation.shots.length,
      0,
      'the attack is warned before projectiles appear',
    );
    simulation.updateBoss(simulation.boss.timer + DT);
    assert.equal(simulation.boss.mode, 'attack');
    simulation.updateBoss(DT);
    assert.ok(simulation.shots.length > 0);
  }
});

test('the normal-input controller can return from a selected Zero to its buster route without state writes', () => {
  const simulation = new ReploidSimulation('x5');
  step(simulation, { switch: true });
  step(simulation);
  const before = structuredClone(simulation);
  const buttons = benchmarkReploid(simulation);
  assert.deepEqual(structuredClone(simulation), before);
  assert.equal(buttons.switch, true);
  simulation.step(DT, buttons);
  assert.equal(simulation.character, 'x');
});

test('Eregion fire starts at the visible mouth in either facing direction, with distinct low and high breath', () => {
  for (const facing of [-1, 1]) {
    const volleys = [];
    for (const pattern of [1, 2]) {
      const simulation = arena('x4', pattern);
      simulation.boss.x = simulation.stage.arena + 300;
      simulation.player.x = simulation.boss.x + facing * 180;
      simulation.updateBoss(DT);
      assert.equal(simulation.boss.facing, facing);
      assert.ok(simulation.shots.length > 0);
      for (const shot of simulation.shots) {
        assert.equal(
          shot.x,
          simulation.boss.x + facing * 76,
          'fire must emerge on the same side as the glowing jaw',
        );
        assert.equal(
          shot.y,
          simulation.boss.y - 73,
          'fire must emerge at jaw height instead of chest height',
        );
        assert.equal(Math.sign(shot.vx), facing);
      }
      volleys.push(simulation.shots.map((shot) => shot.vy));
    }
    assert.ok(
      volleys[0][0] > volleys[1][0],
      'low breath aims below the high volley after moving both origins to the mouth',
    );
  }
});
