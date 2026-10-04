import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PocketSimulation,
  benchmarkInput,
  species,
} from '../lib/retro/pocket/simulation.ts';
import { idleInput } from '../lib/retro/types.ts';
const tap = (g, key) => {
  g.step(1 / 120, { ...idleInput(), [key]: true });
  g.step(1 / 120, idleInput());
};
function wild() {
  const g = new PocketSimulation();
  for (let i = 0; i < 600 && g.mode === 'world'; i++)
    g.step(1 / 120, { ...idleInput(), up: true });
  for (let i = 0; i < 90; i++) g.step(1 / 120, idleInput());
  return g;
}
test('menu movement cannot switch Pokemon or attack without confirmation', () => {
  const g = wild();
  g.party.push({ id: 'squirtle', hp: 34 });
  const before = g.battle.hp;
  tap(g, 'right');
  assert.equal(g.battle.cursor, 1);
  assert.equal(g.active, 0);
  assert.equal(g.battle.hp, before);
  tap(g, 'jump');
  assert.equal(g.battle.menu, 'party');
  tap(g, 'down');
  tap(g, 'jump');
  assert.equal(g.pal.id, 'squirtle');
  assert.equal(g.battle.menu, 'main');
});
test('fight and item submenus execute the selected action through ordinary controls', () => {
  const g = wild();
  tap(g, 'jump');
  assert.equal(g.battle.menu, 'moves');
  tap(g, 'down');
  const before = g.battle.hp;
  tap(g, 'jump');
  assert.ok(g.battle.hp < before);
  assert.equal(g.battle.menu, 'main');
  for (let i = 0; i < 130; i++) g.step(1 / 120, idleInput());
  g.battle.hp = 1;
  tap(g, 'down');
  assert.equal(g.battle.cursor, 2);
  tap(g, 'jump');
  assert.equal(g.battle.menu, 'items');
  tap(g, 'jump');
  assert.equal(g.battle.outcome, 'caught');
  assert.equal(g.caught[0], 'pidgey');
});
test('one held direction moves menu once and F backs out without spending an item', () => {
  const g = wild();
  for (let i = 0; i < 40; i++) g.step(1 / 120, { ...idleInput(), down: true });
  assert.equal(g.battle.cursor, 2);
  tap(g, 'jump');
  const balls = g.balls;
  tap(g, 'switch');
  assert.equal(g.battle.menu, 'main');
  assert.equal(g.balls, balls);
});
test('running is a real wild-battle action and never wins the quest', () => {
  const g = wild();
  tap(g, 'right');
  tap(g, 'down');
  tap(g, 'jump');
  assert.equal(g.battle.outcome, 'fled');
  assert.equal(g.phase, 'playing');
  assert.equal(g.caught.length, 0);
});
test('full Pokemon route produces identical outcomes under fixed 120Hz simulation at three render schedules', () => {
  const results = [];
  for (const hz of [30, 60, 120]) {
    const g = new PocketSimulation();
    for (let f = 0; f < hz * 120 && g.phase === 'playing'; f++)
      for (let i = 0; i < 120 / hz; i++) g.step(1 / 120, benchmarkInput(g));
    assert.equal(g.phase, 'won');
    results.push({
      time: g.time,
      score: g.score,
      party: g.party,
      caught: g.caught,
    });
  }
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
  assert.equal(species.charmander.name, 'CHARMANDER');
  assert.deepEqual(results[0].caught, ['pidgey', 'rattata']);
});

test('a valid confirmed party switch spends exactly one turn and the enemy hits the incoming Pokemon', () => {
  const game = wild();
  game.party.push({ id: 'squirtle', hp: species.squirtle.maxHp });
  const outgoingHp = game.pal.hp,
    turn = game.battle.turn;
  tap(game, 'right');
  tap(game, 'jump');
  tap(game, 'down');
  tap(game, 'jump');
  assert.equal(game.active, 1);
  assert.equal(
    game.party[0].hp,
    outgoingHp,
    'the outgoing Pokemon must not take the reply',
  );
  assert.equal(game.party[1].hp, species.squirtle.maxHp - 3);
  assert.equal(game.battle.turn, turn + 1);
  for (let frame = 0; frame < 150; frame++) game.step(1 / 120, idleInput());
  assert.equal(
    game.battle.turn,
    turn + 1,
    'finishing the switch animation cannot trigger a second reply',
  );
  assert.equal(game.party[1].hp, species.squirtle.maxHp - 3);
});

test('same, fainted and invalid party selections do not spend a turn or trigger an enemy reply', () => {
  for (const cursor of [0, 1, 99]) {
    const game = wild();
    game.party.push({ id: 'squirtle', hp: 0 });
    const hp = game.party.map((pokemon) => pokemon.hp),
      turn = game.battle.turn;
    game.battle.menu = 'party';
    game.battle.cursor = cursor;
    tap(game, 'jump');
    assert.equal(game.active, 0);
    assert.deepEqual(
      game.party.map((pokemon) => pokemon.hp),
      hp,
    );
    assert.equal(game.battle.turn, turn);
    assert.equal(game.battle.cooldown, 0);
  }
});

test('a switch reply can faint its recipient and uses the same replacement handling as other turns', () => {
  const game = wild();
  game.party.push({ id: 'squirtle', hp: 1 });
  const outgoingHp = game.pal.hp;
  tap(game, 'right');
  tap(game, 'jump');
  tap(game, 'down');
  tap(game, 'jump');
  assert.equal(game.party[1].hp, 0);
  assert.equal(game.active, 0);
  assert.equal(game.party[0].hp, outgoingHp);
  assert.equal(game.battle.turn, 1);
  assert.equal(game.phase, 'playing');
});
