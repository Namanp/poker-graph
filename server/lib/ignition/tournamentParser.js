import { HAND_SPLIT_RE, TIMESTAMP_RE } from './shared.js';

const TOURNEY_HAND_ID_RE = /Ignition Hand #(\d+):/;
const PRIZE_CASH_RE = /\[ME\][^:]*: Prize Cash \[\$([0-9,.]+)\]/;
const SEAT_CHIPS_RE = /^Seat \d+: .+?\((\d+) in chips\)/gm;

const TC_SB_RE = /\[ME\][^:]*: Small [Bb]lind (?:chip )?(\d+)/;
const TC_BB_RE = /\[ME\][^:]*: Big [Bb]lind (?:chip )?(\d+)/;
const TC_ANTE_RE = /\[ME\][^:]*: Ante (?:chip )?(\d+)/;
const TC_POSTS_RE = /\[ME\][^:]*: Posts (?:chip )?(\d+)/;
const TC_CALL_RE = /\[ME\][^:]*: Calls? (\d+)/;
const TC_BET_RE = /\[ME\][^:]*: Bets? (\d+)/;
const TC_RAISE_TO_RE = /\[ME\][^:]*: Raises? \d+ to (\d+)/;
const TC_ALLIN_RAISE_RE = /\[ME\][^:]*: All-in\(raise\) \d+ to (\d+)/;
const TC_ALLIN_SHOVE_RE = /\[ME\][^:]*: All-in (\d+)(?!\s*to)/;
const TC_UNCALLED_RE = /\[ME\][^:]*: Return uncalled portion of bet (\d+)/i;
const TC_RESULT_RE = /\[ME\][^:]*: Hand Result (\d+)/;

function parseTournamentHandChips(raw) {
  const lines = raw.split('\n');
  let chipInvested = 0;
  let chipResult = 0;
  let chipUncalled = 0;
  let streetCommitted = 0;
  let inShowdown = false;

  for (const line of lines) {
    if (line.includes('*** FLOP ***') || line.includes('*** TURN ***') || line.includes('*** RIVER ***')) {
      streetCommitted = 0;
    }
    if (line.includes('*** SHOWDOWN ***') || line.includes('*** SUMMARY ***')) {
      inShowdown = true;
    }

    if (!line.includes('[ME]') && !line.includes('Return uncalled')) continue;

    if (!inShowdown) {
      let m;
      if ((m = line.match(TC_SB_RE))) { const a = parseInt(m[1]); chipInvested += a; streetCommitted += a; }
      else if ((m = line.match(TC_BB_RE))) { const a = parseInt(m[1]); chipInvested += a; streetCommitted += a; }
      else if ((m = line.match(TC_ANTE_RE))) { chipInvested += parseInt(m[1]); }
      else if ((m = line.match(TC_POSTS_RE))) { const a = parseInt(m[1]); chipInvested += a; streetCommitted += a; }
      else if ((m = line.match(TC_CALL_RE))) { const a = parseInt(m[1]); chipInvested += a; streetCommitted += a; }
      else if ((m = line.match(TC_BET_RE))) { const a = parseInt(m[1]); chipInvested += a; streetCommitted += a; }
      else if ((m = line.match(TC_ALLIN_RAISE_RE))) {
        const raiseTo = parseInt(m[1]);
        chipInvested += Math.max(0, raiseTo - streetCommitted);
        streetCommitted = raiseTo;
      } else if ((m = line.match(TC_ALLIN_SHOVE_RE))) { const a = parseInt(m[1]); chipInvested += a; streetCommitted += a; }
      else if ((m = line.match(TC_RAISE_TO_RE))) {
        const raiseTo = parseInt(m[1]);
        chipInvested += Math.max(0, raiseTo - streetCommitted);
        streetCommitted = raiseTo;
      }
    }

    let m;
    if ((m = line.match(TC_UNCALLED_RE))) chipUncalled += parseInt(m[1]);
    if ((m = line.match(TC_RESULT_RE))) chipResult += parseInt(m[1]);
  }

  return chipResult - chipInvested + chipUncalled;
}

export function parseTournamentFileToFacts(content) {
  const rawHands = content.split(HAND_SPLIT_RE).filter(h => h.trim().length > 0);

  const firstHand = rawHands[0] || '';
  const seatMatches = [...firstHand.matchAll(SEAT_CHIPS_RE)];
  const playerCount = seatMatches.length;
  const totalChips = seatMatches.reduce((sum, m) => sum + parseInt(m[1]), 0);

  const parsedHands = [];
  let sessionDate = null;

  for (const raw of rawHands) {
    if (!raw.includes('[ME]')) continue;

    const idMatch = raw.match(TOURNEY_HAND_ID_RE);
    if (!idMatch) continue;

    const tsMatch = raw.match(TIMESTAMP_RE);
    const timestamp = tsMatch
      ? tsMatch[1]
      : new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (!sessionDate && tsMatch) sessionDate = tsMatch[1].split(' ')[0];

    const prizeMatch = raw.match(PRIZE_CASH_RE);
    const prizeCash = prizeMatch ? parseFloat(prizeMatch[1].replace(/,/g, '')) : null;

    parsedHands.push({
      handId: idMatch[1],
      timestamp,
      chipNet: parseTournamentHandChips(raw),
      prizeCash,
      mePresent: true,
    });
  }

  return {
    hands: parsedHands,
    sessionDate,
    playerCount,
    totalChips,
  };
}
