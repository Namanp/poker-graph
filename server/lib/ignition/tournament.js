import { parseTournamentFileToFacts } from './tournamentParser.js';
import { evaluateParsedTournamentFile } from './tournamentEvaluator.js';

export const TOURNEY_DETECT_RE = /Ignition Hand #\S+: HOLDEM Tournament/;

export function parseTournamentFile(content, filename) {
  const facts = parseTournamentFileToFacts(content);
  return evaluateParsedTournamentFile(facts, filename);
}

export function isTournamentContent(content) {
  return TOURNEY_DETECT_RE.test(content);
}

export { parseTournamentFileToFacts, evaluateParsedTournamentFile };
