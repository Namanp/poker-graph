import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateParsedCashHand } from '../lib/ignition/cashEvaluator.js';

function baseBoard() {
  return {
    flopCards: ['2c', '5d', '8h'],
    turnCard: ['Tc'],
    riverCard: ['3s'],
    boardCards: ['2c', '5d', '8h', 'Tc', '3s'],
  };
}

function huBaseFacts() {
  return {
    handId: 'TEST-HU',
    timestamp: '2026-01-01 00:00:00',
    mePlayerName: 'Big Blind [ME]',
    players: {
      'Dealer': { stack: 10 },
      'Big Blind [ME]': { stack: 10 },
    },
    totalPot: 20,
    board: baseBoard(),
    myCards: ['Ah', 'Kd'],
    oppCards: ['9h', '9s'],
    allOppCardsArray: [['9h', '9s']],
    holeCardsByName: {
      'Dealer': ['9h', '9s'],
      'Big Blind [ME]': ['Ah', 'Kd'],
    },
    events: [
      { kind: 'small_blind', actor: 'Dealer', street: 'preflop', amount: 0.1, inShowdown: false },
      { kind: 'big_blind', actor: 'Big Blind [ME]', street: 'preflop', amount: 0.25, inShowdown: false },
      { kind: 'raise_to', actor: 'Dealer', street: 'preflop', raiseTo: 1, isAllInText: false, inShowdown: false },
      { kind: 'call', actor: 'Big Blind [ME]', street: 'preflop', amount: 0.75, isAllInText: false, inShowdown: false },
      { kind: 'bet', actor: 'Dealer', street: 'flop', amount: 2, isAllInText: false, inShowdown: false },
      { kind: 'call', actor: 'Big Blind [ME]', street: 'flop', amount: 2, isAllInText: false, inShowdown: false },
    ],
  };
}

test('1. Hero shoves turn, villain calls, hero loses', () => {
  const facts = huBaseFacts();
  facts.events.push(
    { kind: 'allin_shove', actor: 'Big Blind [ME]', street: 'turn', amount: 7, inShowdown: false },
    { kind: 'call', actor: 'Dealer', street: 'turn', amount: 7, isAllInText: false, inShowdown: false },
  );

  const h = evaluateParsedCashHand(facts);
  assert.equal(h.net, -10);
  assert.equal(h.allInStreet, 'turn');
  assert.equal(h.evNet, -7.27);
});

test('2. Hero shoves turn, villain calls, hero wins', () => {
  const facts = huBaseFacts();
  facts.myCards = ['9h', '9s'];
  facts.oppCards = ['Ah', 'Kd'];
  facts.allOppCardsArray = [['Ah', 'Kd']];
  facts.holeCardsByName = {
    'Dealer': ['Ah', 'Kd'],
    'Big Blind [ME]': ['9h', '9s'],
  };
  facts.events.push(
    { kind: 'allin_shove', actor: 'Big Blind [ME]', street: 'turn', amount: 7, inShowdown: false },
    { kind: 'call', actor: 'Dealer', street: 'turn', amount: 7, isAllInText: false, inShowdown: false },
    { kind: 'result', actor: 'Big Blind [ME]', street: 'river', amount: 19.9, inShowdown: true },
  );

  const h = evaluateParsedCashHand(facts);
  assert.equal(h.net, 9.9);
  assert.equal(h.allInStreet, 'turn');
  assert.equal(h.evNet, 7.27);
});

test('3. Villain shoves turn, hero calls, villain wins', () => {
  const facts = huBaseFacts();
  facts.events.push(
    { kind: 'allin_shove', actor: 'Dealer', street: 'turn', amount: 7, inShowdown: false },
    { kind: 'call', actor: 'Big Blind [ME]', street: 'turn', amount: 7, isAllInText: false, inShowdown: false },
  );

  const h = evaluateParsedCashHand(facts);
  assert.equal(h.net, -10);
  assert.equal(h.allInStreet, 'turn');
  assert.equal(h.evNet, -7.27);
});

test('4. Villain shoves turn, hero calls, hero wins', () => {
  const facts = huBaseFacts();
  facts.myCards = ['9h', '9s'];
  facts.oppCards = ['Ah', 'Kd'];
  facts.allOppCardsArray = [['Ah', 'Kd']];
  facts.holeCardsByName = {
    'Dealer': ['Ah', 'Kd'],
    'Big Blind [ME]': ['9h', '9s'],
  };
  facts.events.push(
    { kind: 'allin_shove', actor: 'Dealer', street: 'turn', amount: 7, inShowdown: false },
    { kind: 'call', actor: 'Big Blind [ME]', street: 'turn', amount: 7, isAllInText: false, inShowdown: false },
    { kind: 'result', actor: 'Big Blind [ME]', street: 'river', amount: 19.9, inShowdown: true },
  );

  const h = evaluateParsedCashHand(facts);
  assert.equal(h.net, 9.9);
  assert.equal(h.allInStreet, 'turn');
  assert.equal(h.evNet, 7.27);
});

test('5. Three-way all-in on flop — side-pot-aware evNet is calculated', () => {
  const facts = {
    handId: 'TEST-3WAY',
    timestamp: '2026-01-01 00:00:00',
    mePlayerName: 'Big Blind [ME]',
    players: {
      'UTG': { stack: 10 },
      'Small Blind': { stack: 10 },
      'Big Blind [ME]': { stack: 10 },
    },
    totalPot: 30,
    board: {
      flopCards: ['2c', '7d', '9h'],
      turnCard: ['3s'],
      riverCard: ['5h'],
      boardCards: ['2c', '7d', '9h', '3s', '5h'],
    },
    myCards: ['Ah', 'As'],
    oppCards: ['Jh', 'Jd'],
    allOppCardsArray: [['Jh', 'Jd'], ['Ks', 'Kc']],
    holeCardsByName: {
      'UTG': ['Jh', 'Jd'],
      'Small Blind': ['Ks', 'Kc'],
      'Big Blind [ME]': ['Ah', 'As'],
    },
    events: [
      { kind: 'small_blind', actor: 'Small Blind', street: 'preflop', amount: 0.1, inShowdown: false },
      { kind: 'big_blind', actor: 'Big Blind [ME]', street: 'preflop', amount: 0.25, inShowdown: false },
      { kind: 'call', actor: 'UTG', street: 'preflop', amount: 0.25, isAllInText: false, inShowdown: false },
      { kind: 'call', actor: 'Small Blind', street: 'preflop', amount: 0.15, isAllInText: false, inShowdown: false },
      { kind: 'allin_shove', actor: 'UTG', street: 'flop', amount: 9.75, inShowdown: false },
      { kind: 'call', actor: 'Small Blind', street: 'flop', amount: 9.75, isAllInText: true, inShowdown: false },
      { kind: 'call', actor: 'Big Blind [ME]', street: 'flop', amount: 9.75, isAllInText: false, inShowdown: false },
      { kind: 'result', actor: 'Big Blind [ME]', street: 'river', amount: 29.25, inShowdown: true },
    ],
  };

  const h = evaluateParsedCashHand(facts);
  assert.equal(h.net, 19.25);
  assert.equal(h.allInStreet, 'flop');
  assert.equal(h.evNet, 14.35);
});

test('6. Multiway: opponents all-in, ME not all-in — evNet calculated', () => {
  const facts = {
    handId: 'TEST-SIDEPOT',
    timestamp: '2026-03-05 01:38:08',
    mePlayerName: 'UTG+1 [ME]',
    players: {
      'Small Blind': { stack: 37.99 },
      'Big Blind': { stack: 25 },
      'UTG': { stack: 19.25 },
      'UTG+1 [ME]': { stack: 41.62 },
      'UTG+2': { stack: 31.89 },
      'Dealer': { stack: 31.3 },
    },
    totalPot: 69.35,
    board: {
      flopCards: ['Tc', 'Ts', '8s'],
      turnCard: ['Kh'],
      riverCard: ['7h'],
      boardCards: ['Tc', 'Ts', '8s', 'Kh', '7h'],
    },
    myCards: ['9d', 'Td'],
    oppCards: ['Ad', 'As'],
    allOppCardsArray: [['Ad', 'As'], ['6h', '5s']],
    holeCardsByName: {
      'Small Blind': ['Qs', '7s'],
      'Big Blind': ['Ad', 'As'],
      'UTG': ['6h', '5s'],
      'UTG+1 [ME]': ['9d', 'Td'],
      'UTG+2': ['4d', '7c'],
      'Dealer': ['4h', '3h'],
    },
    events: [
      { kind: 'small_blind', actor: 'Small Blind', street: 'preflop', amount: 0.1, inShowdown: false },
      { kind: 'big_blind', actor: 'Big Blind', street: 'preflop', amount: 0.25, inShowdown: false },
      { kind: 'call', actor: 'UTG', street: 'preflop', amount: 0.25, isAllInText: false, inShowdown: false },
      { kind: 'raise_to', actor: 'UTG+1 [ME]', street: 'preflop', raiseTo: 1, isAllInText: false, inShowdown: false },
      { kind: 'fold', actor: 'UTG+2', street: 'preflop', inShowdown: false },
      { kind: 'fold', actor: 'Dealer', street: 'preflop', inShowdown: false },
      { kind: 'fold', actor: 'Small Blind', street: 'preflop', inShowdown: false },
      { kind: 'raise_to', actor: 'Big Blind', street: 'preflop', raiseTo: 3.85, isAllInText: false, inShowdown: false },
      { kind: 'call', actor: 'UTG', street: 'preflop', amount: 3.6, isAllInText: false, inShowdown: false },
      { kind: 'call', actor: 'UTG+1 [ME]', street: 'preflop', amount: 2.85, isAllInText: false, inShowdown: false },
      { kind: 'allin_shove', actor: 'UTG', street: 'flop', amount: 15.4, inShowdown: false },
      { kind: 'call', actor: 'UTG+1 [ME]', street: 'flop', amount: 15.4, isAllInText: false, inShowdown: false },
      { kind: 'allin_raise', actor: 'Big Blind', street: 'flop', raiseTo: 21.15, inShowdown: false },
      { kind: 'call', actor: 'UTG+1 [ME]', street: 'flop', amount: 5.75, isAllInText: false, inShowdown: false },
      { kind: 'result', actor: 'UTG+1 [ME]', street: 'river', amount: 11.17, inShowdown: true },
      { kind: 'result', actor: 'UTG+1 [ME]', street: 'river', amount: 56.18, inShowdown: true },
    ],
  };

  const h = evaluateParsedCashHand(facts);
  assert.equal(h.net, 42.35);
  assert.equal(h.allInStreet, null);
  assert.equal(h.evNet, 35);
});

test('7. Multiway: ME folds, not all-in — evNet is null', () => {
  const facts = {
    handId: 'TEST-FOLD',
    timestamp: '2026-03-05 00:08:48',
    mePlayerName: 'UTG+1 [ME]',
    players: {
      'Big Blind': { stack: 25 },
      'UTG+1 [ME]': { stack: 44.57 },
      'UTG+2': { stack: 20.18 },
    },
    totalPot: 40.46,
    board: {
      flopCards: ['6h', '4c', 'Ks'],
      turnCard: ['4h'],
      riverCard: ['As'],
      boardCards: ['6h', '4c', 'Ks', '4h', 'As'],
    },
    myCards: ['9c', '3h'],
    oppCards: ['Ac', 'Kc'],
    allOppCardsArray: [['Ac', 'Kc'], ['4s', '4d']],
    holeCardsByName: {
      'Big Blind': ['Ac', 'Kc'],
      'UTG+1 [ME]': ['9c', '3h'],
      'UTG+2': ['4s', '4d'],
    },
    events: [
      { kind: 'fold', actor: 'UTG+1 [ME]', street: 'preflop', inShowdown: false },
      { kind: 'allin_raise', actor: 'Big Blind', street: 'river', raiseTo: 23.01, inShowdown: false },
      { kind: 'allin_shove', actor: 'UTG+2', street: 'river', amount: 14.31, inShowdown: false },
      { kind: 'uncalled', actor: 'Big Blind', street: 'river', amount: 4.82, inShowdown: false },
    ],
  };

  const h = evaluateParsedCashHand(facts);
  assert.equal(h.net, 0);
  assert.equal(h.allInStreet, null);
  assert.equal(h.evNet, null);
});

test('8. Missing opponent hole cards in all-in spot throws', () => {
  const facts = {
    handId: 'MISS001',
    timestamp: '2026-01-01 00:00:00',
    mePlayerName: 'Big Blind [ME]',
    players: {
      'Dealer': { stack: 10 },
      'Big Blind [ME]': { stack: 10 },
    },
    totalPot: 20,
    board: baseBoard(),
    myCards: ['Ah', 'Kd'],
    oppCards: [],
    allOppCardsArray: [],
    holeCardsByName: {
      'Big Blind [ME]': ['Ah', 'Kd'],
    },
    events: [
      { kind: 'small_blind', actor: 'Dealer', street: 'preflop', amount: 0.1, inShowdown: false },
      { kind: 'big_blind', actor: 'Big Blind [ME]', street: 'preflop', amount: 0.25, inShowdown: false },
      { kind: 'raise_to', actor: 'Dealer', street: 'preflop', raiseTo: 1, isAllInText: false, inShowdown: false },
      { kind: 'call', actor: 'Big Blind [ME]', street: 'preflop', amount: 0.75, isAllInText: false, inShowdown: false },
      { kind: 'allin_shove', actor: 'Dealer', street: 'flop', amount: 9, inShowdown: false },
      { kind: 'call', actor: 'Big Blind [ME]', street: 'flop', amount: 9, isAllInText: false, inShowdown: false },
    ],
  };

  assert.throws(
    () => evaluateParsedCashHand(facts),
    /Missing hole cards for opponent: Dealer/
  );
});
