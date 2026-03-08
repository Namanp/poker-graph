/**
 * Equity Calculator
 * Computes ME's equity against a range of opponent hands
 * Handles River (exact), Turn (exact), Flop (exact), Preflop (Monte Carlo)
 */

import { evaluateHand, createDeck, parseCard } from './handEvaluator.js';

/**
 * Calculate equity for ME vs opponent(s)
 * @param {string[]} myCards - ME's hole cards e.g. ["Ah", "Kd"]
 * @param {string[]} oppCards - Opponent hole cards (may be empty if unknown)
 * @param {string[]} boardCards - Community cards (0-5 cards)
 * @returns {number} equity as fraction 0-1, or null if can't calculate
 */
export function calculateEquity(myCards, oppCards, boardCards) {
  const myHole = myCards.map(parseCard).filter(Boolean);
  const board = boardCards.map(parseCard).filter(Boolean);
  const oppHole = oppCards.map(parseCard).filter(Boolean);

  if (myHole.length < 2) return null;

  // If opponent cards unknown, return null (can't calculate)
  if (oppHole.length < 2) return null;

  const knownCards = [...myHole, ...oppHole, ...board];
  const cardsLeft = 5 - board.length;

  if (cardsLeft === 0) {
    // River: direct comparison
    return riverEquity(myHole, oppHole, board);
  } else if (cardsLeft === 1) {
    // Turn: enumerate all remaining river cards
    return turnEquity(myHole, oppHole, board, knownCards);
  } else if (cardsLeft === 2) {
    // Flop: enumerate all C(remaining, 2) combos
    return flopEquity(myHole, oppHole, board, knownCards);
  } else {
    // Preflop (or less than 3 board cards with no board): Monte Carlo
    return preflopEquity(myHole, oppHole, board, knownCards);
  }
}

function riverEquity(myHole, oppHole, board) {
  const myScore = evaluateHand([...myHole, ...board]);
  const oppScore = evaluateHand([...oppHole, ...board]);
  if (myScore > oppScore) return 1.0;
  if (myScore < oppScore) return 0.0;
  return 0.5; // tie
}

function turnEquity(myHole, oppHole, board, knownCards) {
  const deck = createDeck(knownCards);
  let wins = 0, ties = 0, total = 0;

  for (const river of deck) {
    const fullBoard = [...board, river];
    const myScore = evaluateHand([...myHole, ...fullBoard]);
    const oppScore = evaluateHand([...oppHole, ...fullBoard]);
    if (myScore > oppScore) wins++;
    else if (myScore === oppScore) ties++;
    total++;
  }

  return (wins + ties * 0.5) / total;
}

function flopEquity(myHole, oppHole, board, knownCards) {
  const deck = createDeck(knownCards);
  let wins = 0, ties = 0, total = 0;

  for (let i = 0; i < deck.length - 1; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const fullBoard = [...board, deck[i], deck[j]];
      const myScore = evaluateHand([...myHole, ...fullBoard]);
      const oppScore = evaluateHand([...oppHole, ...fullBoard]);
      if (myScore > oppScore) wins++;
      else if (myScore === oppScore) ties++;
      total++;
    }
  }

  return (wins + ties * 0.5) / total;
}

function preflopEquity(myHole, oppHole, board, knownCards, simulations = 20000) {
  const deck = createDeck(knownCards);
  let wins = 0, ties = 0;

  for (let i = 0; i < simulations; i++) {
    // Fisher-Yates shuffle of remaining needed cards
    const needed = 5 - board.length;
    const shuffled = shuffleDeck(deck);
    const runout = shuffled.slice(0, needed);
    const fullBoard = [...board, ...runout];

    const myScore = evaluateHand([...myHole, ...fullBoard]);
    const oppScore = evaluateHand([...oppHole, ...fullBoard]);
    if (myScore > oppScore) wins++;
    else if (myScore === oppScore) ties++;
  }

  return (wins + ties * 0.5) / simulations;
}

function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Calculate ME's equity in a multi-way pot (ME vs N opponents simultaneously).
 * For each runout, ME wins if ME beats all opponents. Ties are split proportionally.
 * @param {string[]} myCards - ME's hole cards
 * @param {string[][]} allOppCards - array of opponent hole card pairs
 * @param {string[]} boardCards - community cards known so far (0-5)
 * @returns {number|null} ME's equity as fraction 0-1
 */
export function calculateMultiwayEquity(myCards, allOppCards, boardCards) {
  const myHole = myCards.map(parseCard).filter(Boolean);
  const board = boardCards.map(parseCard).filter(Boolean);
  const oppHoles = allOppCards
    .map(cards => cards.map(parseCard).filter(Boolean))
    .filter(h => h.length >= 2);

  if (myHole.length < 2 || oppHoles.length === 0) return null;

  const knownCards = [...myHole, ...oppHoles.flat(), ...board];
  const cardsLeft = 5 - board.length;
  const deck = createDeck(knownCards);

  let equitySum = 0;
  let total = 0;

  function processRunout(runout) {
    const fullBoard = [...board, ...runout];
    const myScore = evaluateHand([...myHole, ...fullBoard]);
    const oppScores = oppHoles.map(h => evaluateHand([...h, ...fullBoard]));
    const maxOpp = Math.max(...oppScores);

    if (myScore > maxOpp) {
      equitySum += 1;
    } else if (myScore === maxOpp) {
      // ME ties with one or more opponents — split equally
      const numTied = 1 + oppScores.filter(s => s === myScore).length;
      equitySum += 1 / numTied;
    }
    total++;
  }

  if (cardsLeft === 0) {
    processRunout([]);
  } else if (cardsLeft === 1) {
    for (const card of deck) processRunout([card]);
  } else if (cardsLeft === 2) {
    for (let i = 0; i < deck.length - 1; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        processRunout([deck[i], deck[j]]);
      }
    }
  } else {
    for (let sim = 0; sim < 20000; sim++) {
      const shuffled = shuffleDeck(deck);
      processRunout(shuffled.slice(0, cardsLeft));
    }
  }

  return total > 0 ? equitySum / total : null;
}
