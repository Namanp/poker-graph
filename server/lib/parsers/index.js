import { ignitionParser } from './ignition.js';

const parsers = [ignitionParser];

function resolveParser(content, site) {
  if (site) {
    const bySite = parsers.find(parser => parser.site === site);
    if (!bySite) {
      throw new Error(`Unsupported parser site: ${site}`);
    }
    return bySite;
  }

  const auto = parsers.find(parser => parser.canParse(content));
  if (!auto) {
    throw new Error('Could not detect hand history format');
  }
  return auto;
}

export function parseHandHistory(content, options = {}) {
  const parser = resolveParser(content, options.site);
  const parsed = parser.parse(content, options.filename || '');

  return {
    ...parsed,
    site: parser.site,
  };
}

export function detectGameType(filename = '', options = {}) {
  const parser = resolveParser(options.content || '', options.site || 'ignition');
  return parser.detectGameType(filename);
}

export function listParsers() {
  return parsers.map(parser => parser.site);
}
