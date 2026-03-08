export const HAND_SPLIT_RE = /(?=Ignition Hand #)/g;
export const TIMESTAMP_RE = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/;
export const BUYIN_FILENAME_RE = /\$([0-9]+(?:\.[0-9]+)?)[+\-]\$([0-9]+(?:\.[0-9]+)?)/;

export function parseAmount(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/,/g, ''));
}

export function parseCards(cardStr) {
  if (!cardStr) return [];
  return cardStr.trim().split(/\s+/).filter(c => c.length >= 2 && c.length <= 3);
}

export function getBoardAtStreet(street, flopCards, turnCard, riverCard) {
  switch (street) {
    case 'preflop': return [];
    case 'flop': return [...flopCards];
    case 'turn': return [...flopCards, ...turnCard];
    case 'river': return [...flopCards, ...turnCard, ...riverCard];
    default: return [];
  }
}

export function parseBuyIn(filename) {
  const m = filename.match(BUYIN_FILENAME_RE);
  if (m) return parseFloat(m[1]) + parseFloat(m[2]);
  return 0;
}

// For HUSNG: prize pool = prize_per_player × 2 (rake is separate)
export function parsePrizePool(filename) {
  const m = filename.match(BUYIN_FILENAME_RE);
  if (m) return parseFloat(m[1]) * 2;
  return 0;
}
