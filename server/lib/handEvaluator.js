/**
 * Hand Evaluator - 7-card best hand ranking
 * Returns a numeric score where higher = better hand
 */

const RANK_MAP = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const SUIT_MAP = { 'c': 0, 'd': 1, 'h': 2, 's': 3 };

/**
 * Parse a card string like "Ah", "Tc", "2d" into { rank, suit }
 */
export function parseCard(cardStr) {
  if (!cardStr || cardStr.length < 2) return null;
  const rank = RANK_MAP[cardStr[0].toUpperCase()] || RANK_MAP[cardStr[0]];
  const suit = SUIT_MAP[cardStr[1].toLowerCase()];
  if (rank === undefined || suit === undefined) return null;
  return { rank, suit };
}

/**
 * Evaluate best 5-card hand from up to 7 cards
 * Returns a score: higher is better
 * Hand categories (multiplied by large factors):
 *   9 = Straight Flush
 *   8 = Four of a Kind
 *   7 = Full House
 *   6 = Flush
 *   5 = Straight
 *   4 = Three of a Kind
 *   3 = Two Pair
 *   2 = One Pair
 *   1 = High Card
 */
export function evaluateHand(cards) {
  // cards is array of { rank, suit }
  const validCards = cards.filter(Boolean);
  if (validCards.length < 2) return 0;

  // Get all 5-card combinations
  const combos = getCombinations(validCards, 5);
  let best = 0;
  for (const combo of combos) {
    const score = evaluate5(combo);
    if (score > best) best = score;
  }
  return best;
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(ranks);

  if (isFlush && isStraight) {
    // Straight flush
    const highCard = isStraight === 'wheel' ? 5 : ranks[0];
    return 9 * 1e10 + highCard;
  }

  // Count rank occurrences
  const rankCounts = {};
  for (const r of ranks) rankCounts[r] = (rankCounts[r] || 0) + 1;
  const counts = Object.entries(rankCounts)
    .map(([r, c]) => ({ rank: parseInt(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (counts[0].count === 4) {
    // Four of a kind
    return 8 * 1e10 + counts[0].rank * 1e6 + counts[1].rank;
  }

  if (counts[0].count === 3 && counts[1].count === 2) {
    // Full house
    return 7 * 1e10 + counts[0].rank * 1e6 + counts[1].rank;
  }

  if (isFlush) {
    // Flush
    return 6 * 1e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 1e2 + ranks[4];
  }

  if (isStraight) {
    const highCard = isStraight === 'wheel' ? 5 : ranks[0];
    return 5 * 1e10 + highCard;
  }

  if (counts[0].count === 3) {
    // Three of a kind
    const kickers = counts.slice(1).map(c => c.rank);
    return 4 * 1e10 + counts[0].rank * 1e6 + kickers[0] * 1e3 + kickers[1];
  }

  if (counts[0].count === 2 && counts[1].count === 2) {
    // Two pair
    const pair1 = Math.max(counts[0].rank, counts[1].rank);
    const pair2 = Math.min(counts[0].rank, counts[1].rank);
    const kicker = counts[2].rank;
    return 3 * 1e10 + pair1 * 1e6 + pair2 * 1e3 + kicker;
  }

  if (counts[0].count === 2) {
    // One pair
    const kickers = counts.slice(1).map(c => c.rank);
    return 2 * 1e10 + counts[0].rank * 1e6 + kickers[0] * 1e4 + kickers[1] * 1e2 + kickers[2];
  }

  // High card
  return 1 * 1e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 1e2 + ranks[4];
}

function checkStraight(sortedRanks) {
  // Normal straight check
  let isConsecutive = true;
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    if (sortedRanks[i] - sortedRanks[i + 1] !== 1) {
      isConsecutive = false;
      break;
    }
  }
  if (isConsecutive) return true;

  // Wheel check: A-2-3-4-5
  if (sortedRanks[0] === 14 && sortedRanks[1] === 5 &&
      sortedRanks[2] === 4 && sortedRanks[3] === 3 && sortedRanks[4] === 2) {
    return 'wheel';
  }

  return false;
}

/**
 * Create a full deck excluding known cards
 */
export function createDeck(excludeCards = []) {
  const deck = [];
  for (const rank of Object.values(RANK_MAP)) {
    for (const suit of Object.values(SUIT_MAP)) {
      deck.push({ rank, suit });
    }
  }
  return deck.filter(card =>
    !excludeCards.some(ex => ex && ex.rank === card.rank && ex.suit === card.suit)
  );
}

/**
 * Compare two hands: returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
export function compareHands(cards1, cards2) {
  const score1 = evaluateHand(cards1);
  const score2 = evaluateHand(cards2);
  if (score1 > score2) return 1;
  if (score1 < score2) return -1;
  return 0;
}
