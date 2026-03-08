import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTournamentFileToFacts } from '../lib/ignition/tournamentParser.js';
import { evaluateParsedTournamentFile } from '../lib/ignition/tournamentEvaluator.js';

const SAMPLE_TOURNEY = `Ignition Hand #1001: HOLDEM Tournament #1 2026-03-01 10:00:00
Seat 1: Hero [ME] (1500 in chips)
Seat 2: Villain (1500 in chips)
*** HOLE CARDS ***
Hero [ME]: Small Blind 10
Hero [ME]: Hand Result 0

Ignition Hand #1002: HOLDEM Tournament #1 2026-03-01 10:05:00
Seat 1: Hero [ME] (1490 in chips)
Seat 2: Villain (1510 in chips)
*** HOLE CARDS ***
Hero [ME]: Big Blind 10
Hero [ME]: Hand Result 30
Hero [ME]: Prize Cash [$10.00]
`;

test('tournament parser returns facts without net/ev', () => {
  const parsed = parseTournamentFileToFacts(SAMPLE_TOURNEY);
  assert.equal(parsed.hands.length, 2);
  assert.equal(parsed.hands[0].net, undefined);
  assert.equal(parsed.hands[0].evNet, undefined);
  assert.equal(parsed.hands[0].chipNet, -10);
  assert.equal(parsed.hands[1].chipNet, 20);
  assert.equal(parsed.hands[1].prizeCash, 10);
});

test('tournament evaluator computes profit-only values from facts', () => {
  const parsed = parseTournamentFileToFacts(SAMPLE_TOURNEY);
  const evaluated = evaluateParsedTournamentFile(parsed, 'sample-$5+$0.50.txt');

  assert.equal(evaluated.hands.length, 2);
  assert.equal(evaluated.hands[0].evNet, null);
  assert.equal(evaluated.hands[1].evNet, null);
  assert.equal(evaluated.hands[1].net, 4.5);
});
