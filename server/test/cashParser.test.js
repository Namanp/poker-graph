import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCashHandToFacts } from '../lib/ignition/cashParser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

test('cash parser returns normalized facts without EV fields', () => {
  const facts = parseCashHandToFacts(loadFixture('hero-shoves-turn-wins.txt'));

  assert.ok(facts);
  assert.equal(typeof facts.handId, 'string');
  assert.equal(facts.net, undefined);
  assert.equal(facts.evNet, undefined);
  assert.equal(Array.isArray(facts.events), true);
  assert.equal(Array.isArray(facts.board.flopCards), true);
  assert.equal(Array.isArray(facts.board.boardCards), true);
});

test('cash parser captures street-tagged events', () => {
  const facts = parseCashHandToFacts(loadFixture('villain-shoves-turn-hero-calls-loses.txt'));

  const turnEvents = facts.events.filter(e => e.street === 'turn');
  assert.ok(turnEvents.length > 0);
  assert.ok(turnEvents.some(e => e.kind === 'call' || e.kind === 'allin_shove' || e.kind === 'allin_raise'));
});

const FIXTURE_EXPECTATIONS = [
  {
    name: 'hero-shoves-turn-loses.txt',
    checks: facts => {
      assert.equal(facts.mePresent, true);
      assert.equal(facts.myCards.length, 2);
      assert.ok(facts.events.some(e => e.kind === 'allin_shove' && e.street === 'turn'));
    },
  },
  {
    name: 'hero-shoves-turn-wins.txt',
    checks: facts => {
      assert.equal(facts.mePresent, true);
      assert.equal(facts.myCards.length, 2);
      assert.ok(facts.events.some(e => e.kind === 'allin_shove' && e.street === 'turn'));
      assert.ok(facts.events.some(e => e.kind === 'result' || e.kind === 'win'));
    },
  },
  {
    name: 'villain-shoves-turn-hero-calls-loses.txt',
    checks: facts => {
      assert.equal(facts.mePresent, true);
      assert.equal(facts.myCards.length, 2);
      assert.ok(facts.events.some(e => e.kind === 'call' && e.street === 'turn'));
      assert.ok(facts.events.some(e => e.actor !== facts.mePlayerName && (e.kind === 'allin_shove' || e.kind === 'allin_raise')));
    },
  },
  {
    name: 'villain-shoves-turn-hero-calls-wins.txt',
    checks: facts => {
      assert.equal(facts.mePresent, true);
      assert.equal(facts.myCards.length, 2);
      assert.ok(facts.events.some(e => e.kind === 'call' && e.street === 'turn'));
      assert.ok(facts.events.some(e => e.kind === 'result' || e.kind === 'win'));
    },
  },
  {
    name: 'three-way-flop-allin.txt',
    checks: facts => {
      assert.equal(facts.mePresent, true);
      assert.equal(facts.myCards.length, 2);
      assert.ok(facts.events.some(e => e.street === 'flop'));
      const oppAllins = facts.events.filter(
        e => e.actor !== facts.mePlayerName && (e.kind === 'allin_shove' || e.kind === 'allin_raise' || e.isAllInText)
      );
      assert.ok(oppAllins.length >= 2);
    },
  },
  {
    name: 'multiway-side-pot-not-allin.txt',
    checks: facts => {
      assert.equal(facts.mePresent, true);
      assert.equal(facts.myCards.length, 2);
      assert.ok(facts.events.some(e => e.kind === 'call'));
      assert.ok(facts.events.some(e => e.actor !== facts.mePlayerName && (e.kind === 'allin_shove' || e.kind === 'allin_raise')));
    },
  },
  {
    name: 'hero-folds-not-in-allin.txt',
    checks: facts => {
      assert.equal(facts.mePresent, true);
      assert.equal(facts.myCards.length, 2);
      assert.ok(facts.events.some(e => e.kind === 'fold'));
      assert.ok(facts.events.some(e => e.actor !== facts.mePlayerName && (e.kind === 'allin_shove' || e.kind === 'allin_raise')));
    },
  },
];

for (const { name, checks } of FIXTURE_EXPECTATIONS) {
  test(`cash parser handles fixture: ${name}`, () => {
    const facts = parseCashHandToFacts(loadFixture(name));

    assert.ok(facts, 'parsed facts should exist');
    assert.equal(typeof facts.handId, 'string');
    assert.equal(typeof facts.timestamp, 'string');
    assert.equal(Array.isArray(facts.events), true);
    assert.ok(facts.events.length > 0, 'should capture action/result events');
    assert.equal(Array.isArray(facts.board.boardCards), true);
    assert.ok(facts.board.boardCards.length <= 5, 'board should have at most 5 cards');
    assert.equal(facts.net, undefined, 'parser layer should not compute net');
    assert.equal(facts.evNet, undefined, 'parser layer should not compute evNet');

    checks(facts);
  });
}
