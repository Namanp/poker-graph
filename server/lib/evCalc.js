/**
 * EV Calculator
 * Computes EV-adjusted net for all-in situations
 */

import { calculateEquity, calculateMultiwayEquity } from './equityCalc.js';

/**
 * Calculate EV-adjusted net for a heads-up all-in hand
 * @param {Object} handData
 * @param {string[]} handData.myCards
 * @param {string[]} handData.oppCards
 * @param {string[]} handData.boardAtAllIn
 * @param {number} handData.totalPot
 * @param {number} handData.meInvested
 * @param {string|null} handData.allInStreet
 * @param {number} handData.numPlayers
 * @param {boolean} handData.oppMucked
 * @param {boolean} [handData.returnEquityOnly=false]
 * @returns {number|null}
 */
export function calculateEV(handData) {
  const {
    myCards,
    oppCards,
    boardAtAllIn,
    totalPot,
    meInvested,
    allInStreet,
    numPlayers,
    oppMucked,
    returnEquityOnly = false,
  } = handData;

  if (numPlayers > 2) return null;
  if (oppMucked) return null;
  if (!myCards || myCards.length < 2) return null;
  if (!allInStreet) return null;
  if (!oppCards || oppCards.length < 2) return null;

  const equity = calculateEquity(myCards, oppCards, boardAtAllIn || []);
  if (equity === null) return null;

  if (returnEquityOnly) {
    return equity;
  }

  const evResult = equity * totalPot;
  const evNet = evResult - meInvested;

  return Math.round(evNet * 100) / 100;
}

/**
 * Calculate EV when opponents are all-in / showdown-bound.
 * Can return either equity only or EV net.
 *
 * @param {Object} params
 * @param {string[]} params.myCards
 * @param {string[][]} params.allOppCards
 * @param {string[]} params.boardCards
 * @param {number} [params.totalPot=0]
 * @param {number} [params.meInvested=0]
 * @param {boolean} [params.returnEquityOnly=false]
 * @returns {number|null}
 */
export function calculateMultiwayEV({
  myCards,
  allOppCards,
  boardCards,
  totalPot = 0,
  meInvested = 0,
  returnEquityOnly = false,
}) {
  if (!myCards || myCards.length < 2) return null;
  if (!allOppCards || allOppCards.length === 0) return null;

  const equity = calculateMultiwayEquity(myCards, allOppCards, boardCards || []);
  if (equity === null) return null;

  if (returnEquityOnly) {
    return equity;
  }

  const evNet = equity * totalPot - meInvested;
  return Math.round(evNet * 100) / 100;
}
