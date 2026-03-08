import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseHandHistory } from '../lib/parsers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

test('parser entrypoint works end-to-end for ignition cash', () => {
  const { hands, site } = parseHandHistory(loadFixture('hero-shoves-turn-wins.txt'), {
    filename: 'test.txt',
    site: 'ignition',
  });

  assert.equal(site, 'ignition');
  assert.equal(hands.length, 1);
  assert.equal(hands[0].net, 9.9);
  assert.equal(hands[0].evNet, 7.27);
});
