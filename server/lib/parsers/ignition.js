import {
  parseHandHistory as parseIgnitionHandHistory,
  detectGameType as detectIgnitionGameType,
} from '../ignitionParser.js';

function looksLikeIgnition(content = '') {
  return typeof content === 'string' && content.includes('Ignition Hand #');
}

export const ignitionParser = {
  site: 'ignition',
  canParse: looksLikeIgnition,
  parse: parseIgnitionHandHistory,
  detectGameType: detectIgnitionGameType,
};
