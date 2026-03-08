import { calculateEV, calculateMultiwayEV } from '../evCalc.js';
import { getBoardAtStreet } from './shared.js';

function getBoardForStreet(street, board) {
  return getBoardAtStreet(street, board.flopCards, board.turnCard, board.riverCard);
}

function deriveStreetFromBoard(boardCards) {
  if (!boardCards || boardCards.length === 0) return 'preflop';
  if (boardCards.length === 3) return 'flop';
  if (boardCards.length === 4) return 'turn';
  return 'river';
}

function buildPots(playerInvested, contenders) {
  const investedEntries = Object.entries(playerInvested)
    .filter(([, amt]) => amt > 0)
    .sort((a, b) => a[1] - b[1]);

  if (investedEntries.length === 0) return [];

  const distinctLevels = [...new Set(investedEntries.map(([, amt]) => amt))].sort((a, b) => a - b);

  const pots = [];
  let prev = 0;

  for (const level of distinctLevels) {
    const layer = level - prev;
    if (layer <= 0) continue;

    const contributors = investedEntries
      .filter(([, amt]) => amt >= level)
      .map(([name]) => name);

    const eligiblePlayers = contributors.filter(name => contenders.has(name));
    const size = layer * contributors.length;

    if (size > 0 && eligiblePlayers.length > 0) {
      pots.push({
        size: Math.round(size * 100) / 100,
        players: eligiblePlayers,
      });
    }

    prev = level;
  }

  return pots;
}

function computeEquityForPot(myCards, oppCardsList, boardAtAllIn) {
  if (oppCardsList.length === 1) {
    const equity = calculateEV({
      myCards,
      oppCards: oppCardsList[0],
      boardAtAllIn,
      totalPot: 1,
      meInvested: 0,
      allInStreet: deriveStreetFromBoard(boardAtAllIn),
      numPlayers: 2,
      oppMucked: false,
      returnEquityOnly: true,
    });
    return typeof equity === 'number' ? equity : null;
  }

  const equity = calculateMultiwayEV({
    myCards,
    allOppCards: oppCardsList,
    boardCards: boardAtAllIn,
    totalPot: 1,
    meInvested: 0,
    returnEquityOnly: true,
  });

  return typeof equity === 'number' ? equity : null;
}

export function evaluateParsedCashHand(facts) {
  const {
    handId,
    timestamp,
    mePlayerName,
    players,
    totalPot,
    board,
    myCards,
    holeCardsByName,
    events,
  } = facts;

  const playerInvested = {};
  const playerStreetCommitted = {};
  const playerStacks = {};
  const foldedPlayers = new Set();
  const contenders = new Set();
  const allInPlayers = new Set();

  for (const [name, info] of Object.entries(players || {})) {
    playerInvested[name] = 0;
    playerStreetCommitted[name] = 0;
    playerStacks[name] = info.stack;
    contenders.add(name);
  }

  function ensurePlayer(name) {
    if (!name) return;
    if (!(name in playerInvested)) playerInvested[name] = 0;
    if (!(name in playerStreetCommitted)) playerStreetCommitted[name] = 0;
    if (!(name in playerStacks)) playerStacks[name] = null;
    contenders.add(name);
  }

  function resetStreetCommitted() {
    for (const key of Object.keys(playerStreetCommitted)) {
      playerStreetCommitted[key] = 0;
    }
  }

  let grossResult = 0;
  let meFolded = false;
  let anyAllIn = false;
  let meAllIn = false;
  let boardAtFirstAllIn = null;
  let boardAtLastMEInvest = [];
  let lastStreet = 'preflop';

  function markAllIn(player, street) {
    ensurePlayer(player);
    allInPlayers.add(player);
    anyAllIn = true;
    if (!boardAtFirstAllIn) {
      boardAtFirstAllIn = getBoardForStreet(street, board);
    }
    if (player === mePlayerName) {
      meAllIn = true;
    }
  }

  function checkStackAllIn(player, street) {
    const stack = playerStacks[player];
    if (typeof stack === 'number' && playerInvested[player] >= stack - 0.01) {
      markAllIn(player, street);
    }
  }

  function addAmount(player, amount, street) {
    ensurePlayer(player);
    playerInvested[player] += amount;
    playerStreetCommitted[player] += amount;
    checkStackAllIn(player, street);

    if (player === mePlayerName && amount > 0) {
      boardAtLastMEInvest = getBoardForStreet(street, board);
    }
  }

  function addRaiseTo(player, raiseTo, street) {
    ensurePlayer(player);
    const alreadyCommitted = playerStreetCommitted[player] || 0;
    const increment = Math.max(0, raiseTo - alreadyCommitted);
    playerInvested[player] += increment;
    playerStreetCommitted[player] = raiseTo;
    checkStackAllIn(player, street);

    if (player === mePlayerName && increment > 0) {
      boardAtLastMEInvest = getBoardForStreet(street, board);
    }
  }

  for (const event of events) {
    if (event.street !== lastStreet) {
      if (event.street === 'flop' || event.street === 'turn' || event.street === 'river') {
        resetStreetCommitted();
      }
      lastStreet = event.street;
    }

    const actor = event.actor;

    if (event.kind === 'small_blind' || event.kind === 'big_blind' || event.kind === 'posts') {
      if (event.inShowdown) continue;
      addAmount(actor, event.amount, event.street);
      continue;
    }

    if (event.kind === 'fold') {
      ensurePlayer(actor);
      foldedPlayers.add(actor);
      contenders.delete(actor);
      if (actor === mePlayerName) meFolded = true;
      continue;
    }

    if (event.kind === 'call' || event.kind === 'bet') {
      if (event.inShowdown) continue;
      addAmount(actor, event.amount, event.street);
      if (event.isAllInText) {
        markAllIn(actor, event.street);
      }
      continue;
    }

    if (event.kind === 'raise_to') {
      if (event.inShowdown) continue;
      addRaiseTo(actor, event.raiseTo, event.street);
      if (event.isAllInText) {
        markAllIn(actor, event.street);
      }
      continue;
    }

    if (event.kind === 'allin_raise') {
      if (event.inShowdown) continue;
      addRaiseTo(actor, event.raiseTo, event.street);
      markAllIn(actor, event.street);
      continue;
    }

    if (event.kind === 'allin_shove') {
      if (event.inShowdown) continue;
      addAmount(actor, event.amount, event.street);
      markAllIn(actor, event.street);
      continue;
    }

    if (event.kind === 'uncalled') {
      ensurePlayer(actor);
      playerInvested[actor] = Math.max(0, playerInvested[actor] - event.amount);
      playerStreetCommitted[actor] = Math.max(0, playerStreetCommitted[actor] - event.amount);
      continue;
    }

    if (event.kind === 'result' && actor === mePlayerName) {
      grossResult += event.amount;
      continue;
    }

    if (event.kind === 'win' && event.inShowdown && actor === mePlayerName) {
      grossResult += event.amount;
    }
  }

  const meInvested = playerInvested[mePlayerName] || 0;
  const net = grossResult - meInvested;
  let evNet = null;

  if (!meFolded && anyAllIn && myCards.length === 2) {
    const pots = buildPots(playerInvested, contenders);
    const equityBoard = boardAtFirstAllIn || boardAtLastMEInvest || [];

    let evGross = 0;

    for (const pot of pots) {
      if (!pot.players.includes(mePlayerName)) continue;

      const oppPlayers = pot.players.filter(name => name !== mePlayerName);
      if (oppPlayers.length === 0) continue;

      const oppCardsList = oppPlayers.map(name => holeCardsByName[name]);
      const missingName = oppPlayers.find((name, idx) => {
        const cards = oppCardsList[idx];
        return !Array.isArray(cards) || cards.length !== 2;
      });

      if (missingName) {
        throw new Error(`Missing hole cards for opponent: ${missingName}`);
      }

      const equity = computeEquityForPot(myCards, oppCardsList, equityBoard);
      if (equity === null) continue;
      evGross += equity * pot.size;
    }

    evNet = Math.round((evGross - meInvested) * 100) / 100;
  }

  return {
    handId,
    timestamp,
    net: Math.round(net * 100) / 100,
    evNet,
    mePresent: true,
    myCards,
    oppCards: facts.oppCards,
    boardCards: board.boardCards,
    allInStreet: meAllIn ? deriveStreetFromBoard(boardAtFirstAllIn || []) : null,
    totalInvested: Math.round(meInvested * 100) / 100,
    grossResult: Math.round(grossResult * 100) / 100,
  };
}
