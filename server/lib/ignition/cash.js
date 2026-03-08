import { parseCashFileToFacts, parseCashHandToFacts } from './cashParser.js';
import { evaluateParsedCashHand } from './cashEvaluator.js';

export function parseCashFile(content) {
  const parsed = parseCashFileToFacts(content);
  return {
    ...parsed,
    hands: parsed.hands.map(evaluateParsedCashHand),
  };
}

export { parseCashFileToFacts, parseCashHandToFacts, evaluateParsedCashHand };
