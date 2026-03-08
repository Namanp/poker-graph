import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseHandHistory, listParsers, detectGameType } from '../lib/parsers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

test('registry lists ignition parser', () => {
  assert.ok(listParsers().includes('ignition'));
});

test('auto-detect parser uses ignition format', () => {
  const content = loadFixture('hero-shoves-turn-wins.txt');
  const parsed = parseHandHistory(content, { filename: 'test.txt' });

  assert.equal(parsed.site, 'ignition');
  assert.equal(parsed.hands.length, 1);
  assert.equal(parsed.hands[0].net, 9.9);
});

test('invalid hand history format throws', () => {
  assert.throws(
    () => parseHandHistory('not a poker hand history', { filename: 'bad.txt' }),
    /Could not detect hand history format/
  );
});

test('detectGameType can be resolved by site', () => {
  const gameType = detectGameType('Ignition-$0.10-$0.25-test.txt', { site: 'ignition' });
  assert.equal(gameType, '25NL');
});
