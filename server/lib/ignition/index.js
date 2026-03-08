/**
 * Ignition Poker Hand History Parser
 * Supports both cash game and tournament (SNG) formats.
 */

import { parseCashFile } from './cash.js';
import { isTournamentContent, parseTournamentFile } from './tournament.js';

export function parseHandHistory(content, filename = '') {
  if (isTournamentContent(content)) {
    return parseTournamentFile(content, filename);
  }
  return parseCashFile(content);
}

export function detectGameType(filename) {
  const lower = filename.toLowerCase();

  if (lower.includes('sit-n-go') || lower.includes('sit_n_go') ||
      lower.includes('sng') || lower.includes('sitngo') ||
      lower.includes('husng') || lower.includes('stt') ||
      lower.includes('tourney') || lower.includes('tournament')) {
    return 'husng';
  }

  if (lower.includes('$0.05-$0.10') || lower.includes('0.05-0.10') ||
      lower.match(/\b10nl\b/)) {
    return '10NL';
  }

  if (lower.includes('$0.10-$0.25') || lower.includes('0.10-0.25') ||
      lower.match(/\b25nl\b/)) {
    return '25NL';
  }

  if (lower.includes('$0.25-$0.50') || lower.includes('0.25-0.50') ||
      lower.match(/\b50nl\b/)) {
    return '50NL';
  }

  if (lower.includes('$0.50-$1') || lower.includes('0.50-1.00') ||
      lower.match(/\b100nl\b/)) {
    return '100NL';
  }

  return null;
}
