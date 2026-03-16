import {
  HAND_SPLIT_RE,
  TIMESTAMP_RE,
  parseAmount,
  parseCards,
} from './shared.js';

const CASH_HAND_ID_RE = /Ignition Hand #(\S+)\s+(?:TBL|Zone Poker)/;
const SEAT_LINE_RE = /^Seat \d+: (.+?) \(\$([0-9,.]+) in chips\)/;
const TOTAL_POT_RE = /Total [Pp]ot[:(]?\s*\$?([0-9,.]+)/;
const FLOP_RE = /\*\*\* FLOP \*\*\* \[([^\]]+)\]/;
const TURN_RE = /\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/;
const RIVER_RE = /\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/;

const ACTION_LINE_RE = /^(.+?)\s*:\s*(.+)$/;
const SMALL_BLIND_RE = /^Small [Bb]lind \$([0-9,.]+)/;
const BIG_BLIND_RE = /^Big [Bb]lind \$([0-9,.]+)/;
const POSTS_RE = /^Posts(?: chip)? \$([0-9,.]+)/;
const CALL_RE = /^Calls? \$([0-9,.]+)/;
const BET_RE = /^Bets? \$([0-9,.]+)/;
const RAISE_TO_RE = /^Raises? \$[0-9,.]+ to \$([0-9,.]+)/;
const FOLD_RE = /^Folds$/i;
const ALLIN_RAISE_RE = /^All-in\(raise\) \$[0-9,.]+ to \$([0-9,.]+)/;
const ALLIN_SHOVE_RE = /^All-in \$([0-9,.]+)(?!\s*to)/;
const UNCALLED_RE = /^Return uncalled portion of bet \$([0-9,.]+)/i;
const RESULT_RE = /^Hand result[^$]*\$([0-9,.]+)/i;
const WIN_RE = /^Wins \$([0-9,.]+)/i;

function parseSeatInfo(lines) {
  const players = {};
  let mePlayerName = null;

  for (const line of lines) {
    const m = line.match(SEAT_LINE_RE);
    if (!m) continue;

    const name = m[1].trim();
    players[name] = { stack: parseAmount(m[2]) };

    if (name.includes('[ME]')) {
      mePlayerName = name;
    }
  }

  return { players, mePlayerName };
}

function parseHoleCards(lines) {
  const holeCardsByName = {};

  for (const line of lines) {
    const m = line.match(ACTION_LINE_RE);
    if (!m) continue;

    const actor = m[1].trim();
    const action = m[2].trim();
    const cardsMatch = action.match(/\[([2-9TJQKA][cdhs]) ([2-9TJQKA][cdhs])\]/);
    if (!cardsMatch) continue;

    const cards = [cardsMatch[1], cardsMatch[2]];

    // Prefer direct deal/muck/show lines with two-card reveal.
    if (/Card dealt to a spot|Mucks|Does not show|Showdown/i.test(action)) {
      holeCardsByName[actor] = cards;
    }
  }

  return holeCardsByName;
}

function parseEvents(lines) {
  const events = [];
  let currentStreet = 'preflop';
  let inShowdown = false;

  for (const line of lines) {
    if (line.includes('*** HOLE CARDS ***') || line.includes('*** PRE-FLOP ***')) {
      currentStreet = 'preflop';
      continue;
    }
    if (line.includes('*** FLOP ***')) {
      currentStreet = 'flop';
      continue;
    }
    if (line.includes('*** TURN ***')) {
      currentStreet = 'turn';
      continue;
    }
    if (line.includes('*** RIVER ***')) {
      currentStreet = 'river';
      continue;
    }
    if (line.includes('*** SHOWDOWN ***') || line.includes('*** SUMMARY ***')) {
      inShowdown = true;
    }

    const m = line.match(ACTION_LINE_RE);
    if (!m) continue;

    const actor = m[1].trim();
    const action = m[2].trim();

    let mm;
    if ((mm = action.match(SMALL_BLIND_RE))) {
      events.push({ kind: 'small_blind', actor, street: currentStreet, amount: parseAmount(mm[1]), inShowdown });
      continue;
    }
    if ((mm = action.match(BIG_BLIND_RE))) {
      events.push({ kind: 'big_blind', actor, street: currentStreet, amount: parseAmount(mm[1]), inShowdown });
      continue;
    }
    if ((mm = action.match(POSTS_RE))) {
      events.push({ kind: 'posts', actor, street: currentStreet, amount: parseAmount(mm[1]), inShowdown });
      continue;
    }
    if (FOLD_RE.test(action)) {
      events.push({ kind: 'fold', actor, street: currentStreet, inShowdown });
      continue;
    }
    if ((mm = action.match(CALL_RE))) {
      events.push({
        kind: 'call',
        actor,
        street: currentStreet,
        amount: parseAmount(mm[1]),
        isAllInText: /all-in/i.test(action),
        inShowdown,
      });
      continue;
    }
    if ((mm = action.match(BET_RE))) {
      events.push({
        kind: 'bet',
        actor,
        street: currentStreet,
        amount: parseAmount(mm[1]),
        isAllInText: /all-in/i.test(action),
        inShowdown,
      });
      continue;
    }
    if ((mm = action.match(RAISE_TO_RE))) {
      events.push({
        kind: 'raise_to',
        actor,
        street: currentStreet,
        raiseTo: parseAmount(mm[1]),
        isAllInText: /all-in/i.test(action),
        inShowdown,
      });
      continue;
    }
    if ((mm = action.match(ALLIN_RAISE_RE))) {
      events.push({ kind: 'allin_raise', actor, street: currentStreet, raiseTo: parseAmount(mm[1]), inShowdown });
      continue;
    }
    if ((mm = action.match(ALLIN_SHOVE_RE))) {
      events.push({ kind: 'allin_shove', actor, street: currentStreet, amount: parseAmount(mm[1]), inShowdown });
      continue;
    }
    if ((mm = action.match(UNCALLED_RE))) {
      events.push({ kind: 'uncalled', actor, street: currentStreet, amount: parseAmount(mm[1]), inShowdown });
      continue;
    }
    if ((mm = action.match(RESULT_RE))) {
      events.push({ kind: 'result', actor, street: currentStreet, amount: parseAmount(mm[1]), inShowdown });
      continue;
    }
    if ((mm = action.match(WIN_RE))) {
      events.push({ kind: 'win', actor, street: currentStreet, amount: parseAmount(mm[1]), inShowdown });
    }
  }

  return events;
}

export function parseCashHandToFacts(raw) {
  const lines = raw.split('\n');
  const idMatch = raw.match(CASH_HAND_ID_RE);
  if (!idMatch) return null;
  if (!raw.includes('[ME]')) return null;

  const handId = idMatch[1];
  const tsMatch = raw.match(TIMESTAMP_RE);
  const timestamp = tsMatch
    ? tsMatch[1]
    : new Date().toISOString().replace('T', ' ').slice(0, 19);

  const { players, mePlayerName } = parseSeatInfo(lines);
  if (!mePlayerName) return null;

  const flopMatch = raw.match(FLOP_RE);
  const flopCards = flopMatch ? parseCards(flopMatch[1]) : [];
  const turnMatch = raw.match(TURN_RE);
  const turnCard = turnMatch ? parseCards(turnMatch[1]) : [];
  const riverMatch = raw.match(RIVER_RE);
  const riverCard = riverMatch ? parseCards(riverMatch[1]) : [];
  const boardCards = [...flopCards, ...turnCard, ...riverCard];

  const potMatch = raw.match(TOTAL_POT_RE);
  const totalPot = potMatch ? parseAmount(potMatch[1]) : 0;

  const holeCardsByName = parseHoleCards(lines);
  const myCards = holeCardsByName[mePlayerName] || [];
  const allOppCardsArray = Object.entries(holeCardsByName)
    .filter(([name]) => name !== mePlayerName)
    .map(([, cards]) => cards);
  const oppCards = allOppCardsArray[0] || [];

  return {
    handId,
    timestamp,
    mePresent: true,
    mePlayerName,
    players,
    totalPot,
    board: {
      flopCards,
      turnCard,
      riverCard,
      boardCards,
    },
    myCards,
    oppCards,
    allOppCardsArray,
    holeCardsByName,
    events: parseEvents(lines),
  };
}

export function parseCashFileToFacts(content) {
  const rawHands = content.split(HAND_SPLIT_RE).filter(h => h.trim().length > 0);
  const hands = [];
  let sessionDate = null;

  for (const raw of rawHands) {
    try {
      const hand = parseCashHandToFacts(raw.trim());
      if (!hand || !hand.mePresent) continue;
      if (!sessionDate && hand.timestamp) sessionDate = hand.timestamp.split(' ')[0];
      hands.push(hand);
    } catch (e) {
      console.error('Error parsing hand:', e.message);
    }
  }

  return { hands, sessionDate, playerCount: null };
}
