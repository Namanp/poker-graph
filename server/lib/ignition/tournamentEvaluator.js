import { parseBuyIn } from './shared.js';

export function evaluateParsedTournamentFile(parsed, filename) {
  const buyIn = parseBuyIn(filename);

  const hands = parsed.hands.map(h => ({
    handId: h.handId,
    timestamp: h.timestamp,
    net: 0,
    // HUSNG now uses profit-only graphing (same style as home games).
    // Keep evNet null so UI/API fall back to net.
    evNet: null,
    mePresent: true,
  }));

  let prizeNet = -buyIn;
  let prizeHandIndex = -1;

  for (let i = 0; i < parsed.hands.length; i++) {
    const hand = parsed.hands[i];
    if (hand.prizeCash !== null) {
      prizeNet = hand.prizeCash - buyIn;
      prizeHandIndex = i;
    }
  }

  const targetIndex = prizeHandIndex >= 0 ? prizeHandIndex : hands.length - 1;
  if (hands.length > 0) {
    hands[targetIndex].net = Math.round(prizeNet * 100) / 100;
  }

  return {
    hands,
    sessionDate: parsed.sessionDate,
    playerCount: parsed.playerCount,
  };
}
